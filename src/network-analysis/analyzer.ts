import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, lstat, mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import {
  hashEvidenceFile,
  resolveCaptureDestination,
  safeProcessSpec,
  tsharkFilterArgs,
  verifyEvidenceFile,
  type EvidenceFileIdentity,
} from './governance.js';

const execFile = promisify(execFileCallback);

export const PACKET_EVIDENCE_SCHEMA_VERSION = 'network-analysis.packet-evidence/v1' as const;
export type PacketEvidenceStatus = 'completed' | 'empty' | 'partial' | 'error';
export type PacketEvidenceOutputFormat = 'json' | 'jsonl' | 'markdown';

const HARD_INPUT_LIMIT = 2 * 1024 * 1024 * 1024;
const HARD_PACKET_LIMIT = 1_000_000;
const HARD_OUTPUT_LIMIT = 128 * 1024 * 1024;
const HARD_TIMEOUT_MS = 60 * 60 * 1000;
const COMPRESSED_EXTENSIONS = /\.(?:gz|bz2|xz|zip|zst|7z|rar)$/i;
const SAFE_FIELD = /^[A-Za-z0-9_.-]{1,128}$/;
const BLOCKED_FIELD = /(?:payload|raw|cookie|authorization|credential|passwd|password|secret|token|keylog|file_data|data\.data|reassembled\.data)/i;

export const DEFAULT_METADATA_FIELDS = Object.freeze([
  'frame.number',
  'frame.time_epoch',
  'frame.len',
  '_ws.col.Protocol',
  'eth.src',
  'eth.dst',
  'ip.src',
  'ip.dst',
  'ipv6.src',
  'ipv6.dst',
  'tcp.srcport',
  'tcp.dstport',
  'tcp.stream',
  'tcp.analysis.retransmission',
  'tcp.flags.reset',
  'udp.srcport',
  'udp.dstport',
  'udp.stream',
  'dns.qry.name',
  'dns.flags.response',
  'tls.handshake.type',
  'tls.handshake.extensions_server_name',
  'http.request.method',
  'http.host',
  'http.response.code',
]);

export interface OfflineAnalysisLimits {
  inputBytes: number;
  packets: number;
  outputBytes: number;
  timeoutMs: number;
}

export interface OfflineAnalysisRecipe {
  id: string;
  version: string;
  displayFilter?: string;
  fields?: string[];
}

export interface OfflineAnalysisOptions {
  capturePath: string;
  tshark: { path: string; version: string };
  recipe: OfflineAnalysisRecipe;
  authorizationRefs: string[];
  limits?: Partial<OfflineAnalysisLimits>;
  actor?: string;
  signal?: AbortSignal;
  now?: () => Date;
}

export interface AnalyzerProcessLimits {
  timeoutMs: number;
  maxBufferBytes: number;
  signal?: AbortSignal;
  isolatedConfigRoot: string;
}

export interface AnalyzerProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut?: boolean;
  outputLimited?: boolean;
  cancelled?: boolean;
}

export interface OfflineAnalyzerHost {
  run(file: string, args: readonly string[], limits: AnalyzerProcessLimits): Promise<AnalyzerProcessResult>;
}

export interface PacketEvidenceError {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'fatal';
}

export interface PacketEvidenceBundle {
  schema_version: typeof PACKET_EVIDENCE_SCHEMA_VERSION;
  kind: 'PacketEvidenceBundle';
  bundle_id: string;
  status: PacketEvidenceStatus;
  created_at: string;
  capture: Record<string, unknown>;
  artifacts: Record<string, unknown>[];
  evidence_items: Record<string, unknown>[];
  handoffs: Record<string, unknown>[];
  provenance: Record<string, unknown>;
  errors: PacketEvidenceError[];
  compatibility: Record<string, unknown>;
}

export interface WrittenEvidence {
  path: string;
  format: PacketEvidenceOutputFormat;
  identity: EvidenceFileIdentity;
}

interface NormalizedPacket {
  frame: number;
  timeEpoch: number | null;
  fields: Record<string, string | number | boolean | null>;
}

interface CaptureSnapshot {
  path: string;
  format: 'pcap' | 'pcapng' | 'unknown';
  identity: EvidenceFileIdentity;
}

export function createDefaultAnalyzerHost(): OfflineAnalyzerHost {
  return {
    async run(file, args, limits) {
      try {
        const result = await execFile(file, [...args], {
          timeout: limits.timeoutMs,
          maxBuffer: limits.maxBufferBytes,
          killSignal: 'SIGKILL',
          signal: limits.signal,
          shell: false,
          env: isolatedAnalyzerEnv(limits.isolatedConfigRoot),
        });
        return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
      } catch (error: any) {
        const cancelled = error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
        const outputLimited = error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
        return {
          exitCode: typeof error?.code === 'number' ? error.code : null,
          stdout: typeof error?.stdout === 'string' ? error.stdout : '',
          stderr: sanitizeDiagnostic(typeof error?.stderr === 'string' ? error.stderr : String(error?.message ?? '')),
          timedOut: !cancelled && !outputLimited && error?.killed === true,
          outputLimited,
          cancelled,
        };
      }
    },
  };
}

export async function analyzeOfflineCapture(
  options: OfflineAnalysisOptions,
  host: OfflineAnalyzerHost = createDefaultAnalyzerHost(),
): Promise<PacketEvidenceBundle> {
  const limits = normalizeLimits(options.limits);
  const fields = normalizeFields(options.recipe.fields);
  const filterArgs = tsharkFilterArgs(options.recipe.displayFilter === undefined ? {} : {
    displayFilter: {
      type: 'display_filter',
      language: 'wireshark-display',
      expression: options.recipe.displayFilter,
    },
  });
  validateOptions(options);
  const started = (options.now ?? (() => new Date()))().toISOString();
  const workspace = await mkdtemp(path.join(tmpdir(), 'aiwg-network-analysis-'));
  let sourceIdentity: EvidenceFileIdentity | undefined;
  let snapshot: CaptureSnapshot | undefined;

  try {
    sourceIdentity = await validateAndHashInput(options.capturePath, limits.inputBytes);
    snapshot = await createVerifiedSnapshot(options.capturePath, workspace, sourceIdentity);
    const canonicalArgs = buildTsharkArgs(`pcap:sha256:${sourceIdentity.value}`, limits.packets, filterArgs, fields);
    const executionArgs = buildTsharkArgs(snapshot.path, limits.packets, filterArgs, fields);
    const processSpec = safeProcessSpec(options.tshark.path, executionArgs);
    const context = analysisContext(options, canonicalArgs, fields);
    const result = await host.run(processSpec.file, processSpec.args, {
      timeoutMs: limits.timeoutMs,
      maxBufferBytes: limits.outputBytes,
      signal: options.signal,
      isolatedConfigRoot: workspace,
    });
    const parsed = parseTsharkJson(
      result.stdout,
      fields,
      limits.packets,
      result.cancelled === true || result.timedOut === true || result.outputLimited === true || result.exitCode !== 0,
    );
    await verifyEvidenceFile(options.capturePath, sourceIdentity);
    const errors = classifyProcessResult(result, parsed.length);
    const status = result.cancelled || result.timedOut || result.outputLimited
      ? 'partial'
      : result.exitCode !== 0
        ? (parsed.length > 0 ? 'partial' : 'error')
        : parsed.length === 0 ? 'empty' : 'completed';
    return buildBundle({
      options,
      sourceIdentity,
      snapshot,
      context,
      fields,
      packets: parsed,
      errors,
      status,
      started,
      ended: (options.now ?? (() => new Date()))().toISOString(),
    });
  } catch (error: any) {
    if (!sourceIdentity) throw error;
    const fallbackFormat = snapshot?.format ?? detectFormat(await readPrefix(options.capturePath));
    const canonicalArgs = buildTsharkArgs(`pcap:sha256:${sourceIdentity.value}`, limits.packets, filterArgs, fields);
    return buildBundle({
      options,
      sourceIdentity,
      snapshot: { path: '', format: fallbackFormat ?? 'unknown', identity: sourceIdentity },
      context: analysisContext(options, canonicalArgs, fields),
      fields,
      packets: [],
      errors: [{ code: errorCode(error), message: sanitizeDiagnostic(String(error?.message ?? error)), severity: 'error' }],
      status: 'error',
      started,
      ended: (options.now ?? (() => new Date()))().toISOString(),
    });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function writePacketEvidence(
  bundle: PacketEvidenceBundle,
  output: { root: string; path: string; format: PacketEvidenceOutputFormat },
): Promise<WrittenEvidence> {
  const destination = await resolveCaptureDestination(output.root, output.path);
  const bytes = serializePacketEvidence(bundle, output.format);
  const handle = await open(destination, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  try {
    await handle.writeFile(bytes, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  return { path: destination, format: output.format, identity: await hashEvidenceFile(destination, 'derived-artifact') };
}

export function serializePacketEvidence(bundle: PacketEvidenceBundle, format: PacketEvidenceOutputFormat): string {
  if (format === 'json') return `${canonicalJson(bundle, 2)}\n`;
  if (format === 'jsonl') return `${canonicalJson(bundle)}\n`;
  const digest = String((bundle.capture.hashes as any).source.value);
  const lines = [
    '# Packet evidence',
    '',
    `- Bundle: ${bundle.bundle_id}`,
    `- Status: ${bundle.status}`,
    `- Capture: sha256:${digest}`,
    `- Recipe: ${String(bundle.provenance.recipe_id)}`,
    `- Evidence items: ${bundle.evidence_items.length}`,
    '',
    '## Observations',
    '',
  ];
  for (const item of bundle.evidence_items) {
    const citation = (item.citations as any[])[0];
    lines.push(`- ${String(item.statement)} (frame ${String(citation.locator.frame_number)})`);
  }
  if (bundle.errors.length > 0) {
    lines.push('', '## Errors', '');
    for (const error of bundle.errors) lines.push(`- ${error.code}: ${error.message}`);
  }
  return `${lines.join('\n')}\n`;
}

async function validateAndHashInput(file: string, maxBytes: number): Promise<EvidenceFileIdentity> {
  if (!path.isAbsolute(file)) throw coded('CAPTURE_PATH_INVALID', 'Capture path must be absolute.');
  if (COMPRESSED_EXTENSIONS.test(file)) throw coded('CAPTURE_COMPRESSED', 'Compressed capture input is not accepted; decompress it into the authorized workspace first.');
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) throw coded('CAPTURE_PATH_INVALID', 'Capture input must be a regular non-symlink file.');
  if (stat.size > maxBytes) throw coded('CAPTURE_OVERSIZED', `Capture exceeds the configured ${maxBytes}-byte input limit.`);
  return hashEvidenceFile(file, 'source-capture');
}

async function createVerifiedSnapshot(source: string, workspace: string, expected: EvidenceFileIdentity): Promise<CaptureSnapshot> {
  const prefix = await readPrefix(source);
  const format = detectFormat(prefix);
  if (!format) {
    if (prefix.length === 0) throw coded('CAPTURE_EMPTY', 'Capture is empty.');
    throw coded('CAPTURE_UNSUPPORTED', 'Capture magic is not a supported PCAP or PCAPNG format.');
  }
  const minimum = format === 'pcap' ? 24 : 28;
  if (expected.byteLength < minimum) throw coded('CAPTURE_TRUNCATED', `${format.toUpperCase()} input is shorter than its minimum header.`);

  const sourceHandle = await open(source, constants.O_RDONLY | (typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0));
  const snapshotPath = path.join(workspace, `capture.${format}`);
  const snapshotHandle = await open(snapshotPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, 0o600);
  const digest = createHash('sha256');
  let bytes = 0;
  try {
    const before = await sourceHandle.stat({ bigint: true });
    const buffer = Buffer.allocUnsafe(64 * 1024);
    while (bytes < expected.byteLength) {
      const { bytesRead } = await sourceHandle.read(buffer, 0, Math.min(buffer.length, expected.byteLength - bytes), bytes);
      if (bytesRead === 0) break;
      const chunk = buffer.subarray(0, bytesRead);
      digest.update(chunk);
      await snapshotHandle.write(chunk);
      bytes += bytesRead;
    }
    await snapshotHandle.sync();
    const after = await sourceHandle.stat({ bigint: true });
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs
      || bytes !== expected.byteLength || digest.digest('hex') !== expected.value) {
      throw coded('CAPTURE_MUTATED', 'Capture changed while the isolated analysis snapshot was created.');
    }
  } finally {
    await Promise.all([sourceHandle.close(), snapshotHandle.close()]);
  }
  await verifyEvidenceFile(source, expected);
  const snapshotIdentity = await hashEvidenceFile(snapshotPath, 'derived-artifact');
  if (snapshotIdentity.value !== expected.value || snapshotIdentity.byteLength !== expected.byteLength) {
    throw coded('CAPTURE_SNAPSHOT_MISMATCH', 'The isolated analysis snapshot does not match the source identity.');
  }
  return { path: snapshotPath, format, identity: snapshotIdentity };
}

async function readPrefix(file: string): Promise<Buffer> {
  const handle = await open(file, constants.O_RDONLY | (typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0));
  try {
    const prefix = Buffer.alloc(32);
    const { bytesRead } = await handle.read(prefix, 0, prefix.length, 0);
    return prefix.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function detectFormat(prefix: Buffer): 'pcap' | 'pcapng' | null {
  if (prefix.length >= 4 && prefix.subarray(0, 4).equals(Buffer.from([0x0a, 0x0d, 0x0d, 0x0a]))) return 'pcapng';
  const magic = prefix.subarray(0, 4).toString('hex');
  return ['d4c3b2a1', 'a1b2c3d4', '4d3cb2a1', 'a1b23c4d'].includes(magic) ? 'pcap' : null;
}

function buildTsharkArgs(capture: string, packetLimit: number, filterArgs: string[], fields: string[]): string[] {
  const args = ['-n', '-r', capture, '-c', String(packetLimit), ...filterArgs, '-T', 'json', '--no-duplicate-keys'];
  for (const field of fields) args.push('-e', field);
  return args;
}

function normalizeFields(requested: string[] | undefined): string[] {
  const values = requested ?? [...DEFAULT_METADATA_FIELDS];
  if (values.length === 0 || values.length > 128) throw coded('FIELD_SELECTION_INVALID', 'Select between 1 and 128 metadata fields.');
  const unique = [...new Set(values)];
  if (unique.length !== values.length) throw coded('FIELD_SELECTION_INVALID', 'Field selection contains duplicates.');
  for (const field of unique) {
    if (!SAFE_FIELD.test(field) || BLOCKED_FIELD.test(field)) {
      throw coded('FIELD_SELECTION_FORBIDDEN', `Field is not permitted in metadata-only output: ${field}`);
    }
  }
  if (!unique.includes('frame.number')) unique.unshift('frame.number');
  return unique;
}

function parseTsharkJson(stdout: string, fields: string[], packetLimit: number, allowTruncated = false): NormalizedPacket[] {
  if (stdout.trim() === '') return [];
  let decoded: unknown;
  try {
    decoded = JSON.parse(stdout);
  } catch {
    if (!allowTruncated) throw coded('TSHARK_OUTPUT_INVALID', 'TShark did not return valid bounded JSON output.');
    decoded = recoverCompleteArrayObjects(stdout);
  }
  if (!Array.isArray(decoded)) throw coded('TSHARK_OUTPUT_INVALID', 'TShark JSON output must be an array.');
  if (decoded.length > packetLimit) throw coded('TSHARK_PACKET_LIMIT_BREACH', 'TShark returned more packets than the configured bound.');
  return decoded.map((packet, index) => normalizePacket(packet, fields, index));
}

function recoverCompleteArrayObjects(value: string): unknown[] {
  const start = value.indexOf('[');
  if (start < 0) return [];
  const recovered: unknown[] = [];
  let objectStart = -1;
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === '{') {
      if (depth === 0) objectStart = index;
      depth += 1;
    } else if (character === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && objectStart >= 0) {
        try {
          recovered.push(JSON.parse(value.slice(objectStart, index + 1)));
        } catch {
          return recovered;
        }
        objectStart = -1;
      }
    }
  }
  return recovered;
}

function normalizePacket(packet: unknown, fields: string[], index: number): NormalizedPacket {
  const layers = isRecord(packet) && isRecord(packet._source) && isRecord(packet._source.layers)
    ? packet._source.layers
    : isRecord(packet) && isRecord(packet.layers) ? packet.layers : null;
  if (!layers) throw coded('TSHARK_OUTPUT_INVALID', `Packet ${index + 1} has no layers object.`);
  const selected: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const value = scalar(layers[field]);
    if (value !== undefined) selected[field] = value;
  }
  const frame = integerField(selected['frame.number']);
  if (frame < 1) throw coded('TSHARK_OUTPUT_INVALID', `Packet ${index + 1} has no valid frame.number.`);
  const time = numberField(selected['frame.time_epoch']);
  return { frame, timeEpoch: time, fields: selected };
}

function buildBundle(input: {
  options: OfflineAnalysisOptions;
  sourceIdentity: EvidenceFileIdentity;
  snapshot: CaptureSnapshot;
  context: ReturnType<typeof analysisContext>;
  fields: string[];
  packets: NormalizedPacket[];
  errors: PacketEvidenceError[];
  status: PacketEvidenceStatus;
  started: string;
  ended: string;
}): PacketEvidenceBundle {
  const sourceDigest = `sha256:${input.sourceIdentity.value}`;
  const records = input.packets.map(packet => ({ frame: packet.frame, fields: packet.fields }));
  const derivedBytes = canonicalJson(records);
  const derivedDigest = sha256(derivedBytes);
  const artifactId = `artifact:packet-fields-${derivedDigest.slice(0, 16)}`;
  const times = input.packets.map(packet => packet.timeEpoch).filter((value): value is number => value !== null);
  const frameEvidence = input.packets.map(packet => ({
    evidence_id: `evidence:frame-${input.sourceIdentity.value.slice(0, 12)}-${packet.frame}`,
    basis: 'observation',
    statement: observationStatement(packet),
    confidence: 'observed',
    citations: packetCitations(packet, sourceDigest, input.context.context_digest),
    observed_fields: Object.entries(packet.fields).map(([name, value]) => ({ name, value })),
  }));
  const evidence = input.packets.length > 0
    ? [captureSummaryEvidence(input.packets, sourceDigest, input.context.context_digest, input.sourceIdentity.value), ...frameEvidence]
    : [];
  const completedArtifact = input.status === 'completed' ? [{
    artifact_id: artifactId,
    class: 'derived',
    media_type: 'application/json',
    uri: `urn:sha256:${derivedDigest}`,
    digest: { algorithm: 'sha256', value: derivedDigest },
    data_handling: derivedDataHandling(),
  }] : [];
  return {
    schema_version: PACKET_EVIDENCE_SCHEMA_VERSION,
    kind: 'PacketEvidenceBundle',
    bundle_id: `packet-evidence:${input.sourceIdentity.value.slice(0, 16)}-${input.context.context_digest.slice(7, 19)}`,
    status: input.status,
    created_at: input.started,
    capture: {
      capture_id: `capture:${input.sourceIdentity.value.slice(0, 24)}`,
      capture_digest: sourceDigest,
      source_uri: `file:${path.basename(input.options.capturePath)}`,
      format: input.snapshot.format,
      observed_time: {
        start: times.length > 0 ? new Date(Math.min(...times) * 1000).toISOString() : null,
        end: times.length > 0 ? new Date(Math.max(...times) * 1000).toISOString() : null,
      },
      hashes: {
        source: { algorithm: 'sha256', value: input.sourceIdentity.value },
        ...(completedArtifact.length > 0 ? { derived: [{
          artifact_id: artifactId,
          digest: { algorithm: 'sha256', value: derivedDigest },
          derivation: 'tshark-json-metadata-normalization',
        }] } : {}),
      },
      tool_versions: [{ name: 'tshark', version: input.options.tshark.version, executable_path: input.options.tshark.path, capabilities: ['saved-capture-read', 'display-filter', 'json-fields'] }],
      analysis_contexts: [input.context],
      config_versions: [{
        name: input.options.recipe.id,
        version: input.options.recipe.version,
        digest: { algorithm: 'sha256', value: sha256(canonicalJson(input.options.recipe)) },
      }],
      data_handling: sourceDataHandling(),
    },
    artifacts: completedArtifact,
    evidence_items: evidence,
    handoffs: [],
    provenance: {
      actor: input.options.actor ?? 'agent:network-analysis-offline',
      activity: 'offline-pcap-inspection',
      started_at: input.started,
      ended_at: input.ended,
      recipe_id: `analysis-recipe:${input.options.recipe.id}-${input.options.recipe.version}`,
      authorization_refs: [...input.options.authorizationRefs],
    },
    errors: input.errors,
    compatibility: {
      contract: PACKET_EVIDENCE_SCHEMA_VERSION,
      compatible_with: ['network-analysis.analysis-recipe/v1'],
      unsupported_major_policy: 'fail-closed',
    },
  };
}

function packetCitations(packet: NormalizedPacket, sourceDigest: string, contextDigest: string): Record<string, unknown>[] {
  const citations: Record<string, unknown>[] = [
    { capture_digest: sourceDigest, locator: { type: 'frame', frame_number: packet.frame } },
  ];
  const tcpStream = integerField(packet.fields['tcp.stream']);
  const udpStream = integerField(packet.fields['udp.stream']);
  if (tcpStream >= 0) citations.push({
    capture_digest: sourceDigest,
    locator: { type: 'stream', protocol: 'tcp', stream_id: tcpStream, context_digest: contextDigest },
  });
  else if (udpStream >= 0) citations.push({
    capture_digest: sourceDigest,
    locator: { type: 'stream', protocol: 'udp', stream_id: udpStream, context_digest: contextDigest },
  });
  return citations;
}

function captureSummaryEvidence(packets: NormalizedPacket[], sourceDigest: string, contextDigest: string, sourceHash: string): Record<string, unknown> {
  const protocols = new Map<string, number>();
  const endpoints = new Set<string>();
  const conversations = new Set<string>();
  let retransmissions = 0;
  let resets = 0;
  let encryptedFrames = 0;
  for (const packet of packets) {
    for (const protocol of packetProtocols(packet)) protocols.set(protocol, (protocols.get(protocol) ?? 0) + 1);
    for (const field of ['eth.src', 'eth.dst', 'ip.src', 'ip.dst', 'ipv6.src', 'ipv6.dst']) {
      const value = packet.fields[field];
      if (typeof value === 'string' && value.length > 0) endpoints.add(`${field.split('.')[0]}:${value}`);
    }
    const conversation = conversationIdentity(packet);
    if (conversation) conversations.add(conversation);
    if (packet.fields['tcp.analysis.retransmission'] !== undefined) retransmissions += 1;
    if (truthyPacketField(packet.fields['tcp.flags.reset'])) resets += 1;
    if (packet.fields['tls.handshake.type'] !== undefined) encryptedFrames += 1;
  }
  const times = packets.map(packet => packet.timeEpoch).filter((value): value is number => value !== null);
  const duration = times.length > 0 ? Math.max(...times) - Math.min(...times) : 0;
  const hierarchy = [...protocols.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([protocol, count]) => `${protocol}:${count}`).join(',');
  const citedPackets = packets.length === 1 ? packets : [packets[0], packets[packets.length - 1]];
  return {
    evidence_id: `evidence:capture-summary-${sourceHash.slice(0, 16)}`,
    basis: 'observation',
    statement: `Observed ${packets.length} selected frame(s), ${endpoints.size} endpoint(s), and ${conversations.size} transport conversation(s).`,
    confidence: 'observed',
    citations: citedPackets.flatMap(packet => packetCitations(packet, sourceDigest, contextDigest).slice(0, 1)),
    observed_fields: [
      { name: 'summary.packet_count', value: packets.length },
      { name: 'summary.protocol_hierarchy', value: hierarchy },
      { name: 'summary.endpoint_count', value: endpoints.size },
      { name: 'summary.conversation_count', value: conversations.size },
      { name: 'summary.duration_seconds', value: duration },
      { name: 'summary.tcp_retransmission_count', value: retransmissions },
      { name: 'summary.tcp_reset_count', value: resets },
      { name: 'summary.encrypted_transport_frame_count', value: encryptedFrames },
    ],
  };
}

function packetProtocols(packet: NormalizedPacket): string[] {
  return [
    packet.fields['eth.src'] !== undefined ? 'Ethernet' : '',
    packet.fields['ip.src'] !== undefined ? 'IPv4' : '',
    packet.fields['ipv6.src'] !== undefined ? 'IPv6' : '',
    packet.fields['tcp.stream'] !== undefined ? 'TCP' : '',
    packet.fields['udp.stream'] !== undefined ? 'UDP' : '',
    packet.fields['dns.qry.name'] !== undefined || packet.fields['dns.flags.response'] !== undefined ? 'DNS' : '',
    packet.fields['tls.handshake.type'] !== undefined ? 'TLS' : '',
    packet.fields['http.request.method'] !== undefined || packet.fields['http.response.code'] !== undefined ? 'HTTP' : '',
  ].filter(Boolean);
}

function conversationIdentity(packet: NormalizedPacket): string | null {
  const protocol = packet.fields['tcp.stream'] !== undefined ? 'tcp' : packet.fields['udp.stream'] !== undefined ? 'udp' : null;
  if (!protocol) return null;
  const leftAddress = String(packet.fields['ip.src'] ?? packet.fields['ipv6.src'] ?? '');
  const rightAddress = String(packet.fields['ip.dst'] ?? packet.fields['ipv6.dst'] ?? '');
  const leftPort = String(packet.fields[`${protocol}.srcport`] ?? '');
  const rightPort = String(packet.fields[`${protocol}.dstport`] ?? '');
  const peers = [`${leftAddress}:${leftPort}`, `${rightAddress}:${rightPort}`].sort();
  return `${protocol}:${peers[0]}<->${peers[1]}`;
}

function truthyPacketField(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'True';
}

function analysisContext(options: OfflineAnalysisOptions, commandArgv: string[], fields: string[]) {
  const emptyCaptureFilter = sha256('');
  const displayFilter = options.recipe.displayFilter ?? '';
  const configDigest = sha256(canonicalJson({ recipe: options.recipe, fields }));
  const descriptor = {
    tool: { name: 'tshark', version: options.tshark.version, executable_path: options.tshark.path },
    profile: 'aiwg-isolated-empty',
    command_argv: [path.basename(options.tshark.path), ...commandArgv],
    config_digests: [`sha256:${configDigest}`],
    capture_filter_digest: `sha256:${emptyCaptureFilter}`,
    display_filter_digest: `sha256:${sha256(displayFilter)}`,
  };
  return { context_digest: `sha256:${sha256(canonicalJson(descriptor))}`, ...descriptor };
}

function classifyProcessResult(result: AnalyzerProcessResult, parsedCount: number): PacketEvidenceError[] {
  if (result.cancelled) return [{ code: 'ANALYSIS_CANCELLED', message: `Analysis was cancelled; ${parsedCount} parsed packet record(s) were preserved.`, severity: 'warning' }];
  if (result.timedOut) return [{ code: 'ANALYSIS_TIMEOUT', message: `Analysis exceeded its runtime limit; ${parsedCount} parsed packet record(s) were preserved.`, severity: 'error' }];
  if (result.outputLimited) return [{ code: 'ANALYSIS_OUTPUT_LIMIT', message: `Analysis exceeded its output limit; ${parsedCount} parsed packet record(s) were preserved.`, severity: 'error' }];
  if (result.exitCode !== 0) return [{ code: 'TSHARK_FAILED', message: sanitizeDiagnostic(result.stderr) || 'TShark exited unsuccessfully.', severity: 'error' }];
  return [];
}

function validateOptions(options: OfflineAnalysisOptions): void {
  if (!path.isAbsolute(options.tshark.path) || !options.tshark.version.trim()) throw coded('TOOL_INVALID', 'TShark requires an absolute trusted path and version.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(options.recipe.id) || !/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(options.recipe.version)) {
    throw coded('RECIPE_INVALID', 'Recipe requires a safe identifier and semantic version.');
  }
  if (options.authorizationRefs.length === 0 || options.authorizationRefs.some(value => !value.trim() || value.includes('\0'))) {
    throw coded('AUTHORIZATION_REQUIRED', 'At least one capture authorization reference is required.');
  }
}

function normalizeLimits(partial: Partial<OfflineAnalysisLimits> | undefined): OfflineAnalysisLimits {
  const limits = {
    inputBytes: partial?.inputBytes ?? 256 * 1024 * 1024,
    packets: partial?.packets ?? 100_000,
    outputBytes: partial?.outputBytes ?? 32 * 1024 * 1024,
    timeoutMs: partial?.timeoutMs ?? 5 * 60 * 1000,
  };
  boundedInteger(limits.inputBytes, HARD_INPUT_LIMIT, 'Input byte limit');
  boundedInteger(limits.packets, HARD_PACKET_LIMIT, 'Packet limit');
  boundedInteger(limits.outputBytes, HARD_OUTPUT_LIMIT, 'Output byte limit');
  boundedInteger(limits.timeoutMs, HARD_TIMEOUT_MS, 'Runtime limit');
  return limits;
}

function boundedInteger(value: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw coded('LIMIT_INVALID', `${label} must be between 1 and ${maximum}.`);
}

function sourceDataHandling() {
  return {
    sensitivity: 'restricted',
    payload_content: 'withheld',
    redaction: { state: 'withheld', method: 'metadata-only-field-allowlist' },
    retention: { class: 'source-controlled-by-owner' },
    disclosure: { state: 'withheld', allowed_audiences: [] },
  };
}

function derivedDataHandling() {
  return {
    sensitivity: 'internal',
    payload_content: 'metadata-only',
    redaction: {
      state: 'redacted',
      method: 'metadata-only-field-allowlist',
      redacted_fields: ['raw-packets', 'payload', 'credentials', 'cookies', 'authorization', 'tls-secrets', 'extracted-files'],
    },
    retention: { class: 'case-work-product' },
    disclosure: { state: 'withheld', allowed_audiences: [] },
  };
}

function observationStatement(packet: NormalizedPacket): string {
  const protocols = [
    packet.fields['dns.qry.name'] !== undefined ? 'DNS' : '',
    packet.fields['tls.handshake.type'] !== undefined ? 'TLS' : '',
    packet.fields['http.request.method'] !== undefined || packet.fields['http.response.code'] !== undefined ? 'HTTP' : '',
    packet.fields['tcp.stream'] !== undefined ? 'TCP' : '',
    packet.fields['udp.stream'] !== undefined ? 'UDP' : '',
    packet.fields['ipv6.src'] !== undefined ? 'IPv6' : packet.fields['ip.src'] !== undefined ? 'IPv4' : '',
  ].filter(Boolean);
  return `Frame ${packet.frame} contains ${protocols.length > 0 ? protocols.join('/') : 'selected packet'} metadata.`;
}

function scalar(value: unknown): string | number | boolean | null | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (candidate === null || typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') return candidate;
  return undefined;
}

function integerField(value: unknown): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isSafeInteger(number) ? number : -1;
}

function numberField(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value: unknown, space?: number): string {
  return JSON.stringify(sortJson(value), null, space);
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]));
}

function isolatedAnalyzerEnv(configRoot: string): NodeJS.ProcessEnv {
  return {
    PATH: '',
    HOME: configRoot,
    WIRESHARK_CONFIG_DIR: configRoot,
    XDG_CONFIG_HOME: configRoot,
    LC_ALL: 'C',
    LANG: 'C',
    TZ: 'UTC',
    NO_COLOR: '1',
  };
}

function sanitizeDiagnostic(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/(authorization|cookie|token|password|secret)\s*[:=]\s*\S+/gi, '$1=[REDACTED]').slice(0, 2048).trim();
}

function coded(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function errorCode(error: any): string {
  return typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]+$/.test(error.code) ? error.code : 'CAPTURE_ANALYSIS_FAILED';
}
