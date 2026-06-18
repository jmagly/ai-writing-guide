import { useCallback, useRef, useState } from 'react';
import type { Role } from './types';

// The pty session connection, lifted to App so the Sessions tab renders it and the
// Actions tab can inject into it. Data plane is browser→executor (the attach_url the
// Bridge issues); control plane stays on the Bridge.
type WsMsg = { op: string; seq?: number; payload?: { role?: Role; data?: string; code?: string; frames?: { seq: number; payload: { data: string } }[] } };

export interface SessionState { attached: boolean; role: Role; output: string; url: string | null }

const decode = (b64: string): string => { try { return atob(b64); } catch { return b64; } };

export function useSession() {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeq = useRef(0);
  const [state, setState] = useState<SessionState>({ attached: false, role: null, url: null, output: '' });
  const append = (text: string) => setState((s) => ({ ...s, output: (s.output ?? '') + text }));

  const attach = useCallback((url: string, replay = false, requestedRole: Exclude<Role, null> = 'observer') => {
    wsRef.current?.close();
    if (!replay) lastSeq.current = 0;
    setState({ attached: false, role: null, url, output: '' } as SessionState);
    const ws = new WebSocket(replay ? `${url}?replay_from=${lastSeq.current}` : url);
    wsRef.current = ws;
    ws.addEventListener('open', () => setState((s) => ({ ...s, attached: true, url })));
    ws.addEventListener('close', () => setState((s) => ({ ...s, attached: false, role: null })));
    ws.addEventListener('error', () => append('\n[connection error]\n'));
    ws.addEventListener('message', (ev) => {
      let m: WsMsg;
      try { m = JSON.parse(ev.data as string); } catch { return; }
      switch (m.op) {
        case 'binding_hello': ws.send(JSON.stringify({ op: 'pty.join_session', payload: { role: requestedRole } })); break;
        case 'role_assigned': setState((s) => ({ ...s, role: m.payload?.role ?? null })); break;
        case 'output':
          if (m.seq) lastSeq.current = Math.max(lastSeq.current, m.seq);
          append(decode(m.payload?.data ?? '')); break;
        case 'keyframe':
          for (const f of m.payload?.frames ?? []) { if (f.seq) lastSeq.current = Math.max(lastSeq.current, f.seq); append(decode(f.payload.data)); }
          break;
        case 'error': append(`\n[${m.payload?.code ?? 'error'}]\n`); break;
      }
    });
  }, []);

  const detach = useCallback(() => { wsRef.current?.close(); wsRef.current = null; }, []);
  const replay = useCallback((url: string) => { detach(); setTimeout(() => attach(url, true, 'observer'), 50); }, [attach, detach]);
  const requestKeyframe = useCallback(() => wsRef.current?.send(JSON.stringify({ op: 'pty.request_keyframe' })), []);
  const sendInput = useCallback((text: string): boolean => {
    const ws = wsRef.current;
    if (!ws || state.role !== 'controller' || !text) return false;
    ws.send(JSON.stringify({ op: 'pty.session_input', payload: { data: btoa(text + '\r\n') } }));
    return true;
  }, [state.role]);

  return { state, attach, detach, replay, requestKeyframe, sendInput, isController: state.role === 'controller' };
}

export type SessionApi = ReturnType<typeof useSession>;
