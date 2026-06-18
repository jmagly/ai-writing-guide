// pty-ws/v1 + pty-extensions/v1 binding for the mock executor (increment 5).
// Minimal RFC 6455 server (stdlib only) carrying the JSON {op,payload} protocol
// the conformance harness exercises at /agents/:id/sessions/:sid/attach.
//   server -> binding_hello on connect
//   message/send, tasks/get      -> op:"task"
//   pty.join_session             -> op:"role_assigned" (observer by default; controller only when requested)
//   pty.session_input (base64)   -> op:"output" (top-level seq; PTY echoes input)
//   pty.request_keyframe         -> op:"keyframe" (payload.frames includes outputs)
//   ?replay_from=N               -> replays buffered frames seq>N + keyframe
import { createHash, randomUUID } from 'node:crypto';
import { getInstance, DEFAULT_INSTANCE } from './store.mjs';
import { createTaskFor, getTaskFor } from './a2a.mjs';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const acceptKey = (k) => createHash('sha1').update(k + WS_GUID).digest('base64');

function encodeText(str) {
  const payload = Buffer.from(str, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) header = Buffer.from([0x81, len]);
  else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([header, payload]);
}

// Stateful RFC 6455 frame reader for masked client text frames.
function makeParser(onText, onClose) {
  let buf = Buffer.alloc(0);
  return (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f, off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      let mask;
      if (masked) { if (buf.length < off + 4) return; mask = buf.subarray(off, off + 4); off += 4; }
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) { const o = Buffer.alloc(len); for (let i = 0; i < len; i++) o[i] = payload[i] ^ mask[i & 3]; payload = o; }
      buf = buf.subarray(off + len);
      if (opcode === 0x8) return onClose();
      if (opcode === 0x1) onText(payload.toString('utf8'));
      // ping/pong/continuation ignored for the mock
    }
  };
}

const sessions = new Map(); // sessionId -> { id, instanceId, seq, frames:[], members:[], hasController, mode, backend }
function sessionOf(id, instanceId) {
  if (!sessions.has(id)) sessions.set(id, { id, instanceId: instanceId ?? null, seq: 0, frames: [], members: [], hasController: false });
  const s = sessions.get(id);
  if (instanceId && !s.instanceId) s.instanceId = instanceId;
  return s;
}
function buildKeyframe(s) {
  return { op: 'keyframe', seq: s.seq, payload: { frames: s.frames.slice(-200), snapshot: '', snapshot_format: 'vt100-screen-state-v1', anchor_sequence: s.seq } };
}

const b64 = (str) => Buffer.from(str, 'utf8').toString('base64');

/** List sessions (optionally scoped to one instance) for the Cockpit session picker. */
export function listSessions(instanceId) {
  return [...sessions.values()]
    .filter((s) => !instanceId || s.instanceId === instanceId)
    .map((s) => ({
      id: s.id,
      instance_id: s.instanceId,
      seq: s.seq,
      members: s.members.length,
      has_controller: s.hasController,
      controllers: s.members.filter((m) => m.role === 'controller').length,
      observers: s.members.filter((m) => m.role === 'observer').length,
      mode: s.mode ?? 'direct',
      backend: s.backend ?? 'native',
      role_policy: 'observe-default',
      replay: true,
      keyframe: true,
    }));
}

/** Create a fresh session on an instance (the "Start a session" primary verb). */
export function createSession(instanceId, { mode = 'direct', backend = 'native' } = {}) {
  const id = `sess-${randomUUID().slice(0, 8)}`;
  const session = sessionOf(id, instanceId);
  session.mode = mode;
  session.backend = backend;
  const seq = ++session.seq;
  session.frames.push({ op: 'output', seq, payload: { stream: 'stdout', data: b64(`$ cockpit session ${id} ready on ${mode}/${backend}\r\n`) } });
  return { id, instance_id: instanceId };
}

/** Seed one demo pty session with a short transcript so observe/replay show content immediately. */
export function seedDemoSessions() {
  const s = sessionOf('demo-shell', DEFAULT_INSTANCE);
  if (s.frames.length) return; // idempotent
  s.mode = 'direct';
  s.backend = 'native';
  for (const line of [
    '$ aiwg discover "deploy production"\r\n',
    'flow-deploy-to-production   score=0.51\r\n',
    '$ # observe, or take the wheel — both work here\r\n',
  ]) { const seq = ++s.seq; s.frames.push({ op: 'output', seq, payload: { stream: 'stdout', data: b64(line) } }); }
}

function handleOp(text, ctx) {
  let msg; try { msg = JSON.parse(text); } catch { return ctx.send({ op: 'error', payload: { code: 'request.invalid_params' } }); }
  const { op, payload = {} } = msg;
  const { instanceId, inst, session, conn, send } = ctx;
  switch (op) {
    case 'message/send': {
      const m = payload.message ?? {};
      const task = createTaskFor(instanceId, inst, { messageId: m.messageId, parts: m.parts ?? [] });
      return send({ op: 'task', payload: task });
    }
    case 'tasks/get': {
      const t = getTaskFor(instanceId, payload.task_id);
      return t ? send({ op: 'task', payload: t }) : send({ op: 'error', payload: { code: 'task.not_found' } });
    }
    case 'pty.join_session': {
      const wantsControl = payload.role === 'controller';
      if (wantsControl && session.hasController) {
        return send({ op: 'error', payload: { code: 'PERMISSION_DENIED', detail: 'session already has a controller' } });
      }
      const role = wantsControl ? 'controller' : 'observer';
      if (role === 'controller') session.hasController = true;
      conn.role = role;
      session.members.push(conn);
      return send({ op: 'role_assigned', payload: { role, client_id: conn.clientId } });
    }
    case 'pty.session_input': {
      if (conn.role === 'observer') return send({ op: 'error', payload: { code: 'PERMISSION_DENIED' } });
      const seq = ++session.seq;
      const frame = { op: 'output', seq, payload: { stream: 'stdout', data: payload.data } }; // PTY echoes input
      session.frames.push(frame);
      for (const mm of session.members) mm.send(frame);
      return;
    }
    case 'pty.session_resize':
      return; // accepted, no-op in the mock
    case 'pty.request_keyframe':
      return send(buildKeyframe(session));
    default:
      return send({ op: 'error', payload: { code: 'unsupported_operation', detail: op } });
  }
}

export function attachPtyWs(server) {
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const m = url.pathname.match(/^\/agents\/([^/]+)\/sessions\/([^/]+)\/attach$/);
    if (!m) { socket.destroy(); return; }
    const instanceId = decodeURIComponent(m[1]);
    const sessionId = decodeURIComponent(m[2]);
    const inst = getInstance(instanceId);
    const key = req.headers['sec-websocket-key'];
    if (!inst) { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); socket.destroy(); return; }
    if (!key) { socket.write('HTTP/1.1 400 Bad Request\r\n\r\n'); socket.destroy(); return; }

    const proto = String(req.headers['sec-websocket-protocol'] ?? '');
    const lines = ['HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade', `Sec-WebSocket-Accept: ${acceptKey(key)}`];
    if (proto.toLowerCase().includes('pty-ws.v1')) lines.push('Sec-WebSocket-Protocol: pty-ws.v1');
    socket.write(lines.join('\r\n') + '\r\n\r\n');

    const send = (obj) => { try { socket.write(encodeText(JSON.stringify(obj))); } catch { /* closed */ } };
    const session = sessionOf(sessionId, instanceId);
    const conn = { role: null, clientId: randomUUID(), send };

    // The harness's DialWS discards any bytes that arrive in the same segment as
    // the 101 handshake, then reads frames fresh — so the first frame MUST land
    // in a separate segment. A short delay guarantees that.
    setTimeout(() => {
      send({ op: 'binding_hello', payload: { session_id: sessionId, activated_extensions: ['https://agentic-sandbox.aiwg.io/extensions/pty-extensions/v1'], protocol: 'pty-ws/v1' } });
      // On replay the harness expects: binding_hello -> keyframe -> delta output(s).
      const rf = url.searchParams.get('replay_from');
      if (rf != null) { const n = Number(rf); send(buildKeyframe(session)); for (const f of session.frames) if (f.seq > n) send(f); }
    }, 30);

    socket.on('data', makeParser((t) => handleOp(t, { instanceId, inst, session, conn, send }), () => socket.destroy()));
    socket.on('error', () => {});
    socket.on('close', () => { const i = session.members.indexOf(conn); if (i >= 0) session.members.splice(i, 1); });
  });
  return server;
}
