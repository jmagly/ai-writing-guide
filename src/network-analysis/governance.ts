import { createHash } from 'node:crypto';
import { constants, lstat, open, realpath } from 'node:fs/promises';
import path from 'node:path';

export const NETWORK_ANALYSIS_GOVERNANCE_SCHEMA = '1.0.0' as const;
export type GovernedContent = 'metadata' | 'headers' | 'raw-packets' | 'payload';

export interface NetworkAnalysisPolicy {
  acquisition: 'offline-only' | 'live-capture-explicit-authorization';
  output: 'metadata-only' | 'metadata-and-headers';
  payloadAccess: 'deny' | 'explicit-opt-in';
  providerTransfer: 'deny' | 'explicit-decision';
}

export const DEFAULT_NETWORK_ANALYSIS_POLICY: Readonly<NetworkAnalysisPolicy> = Object.freeze({
  acquisition: 'offline-only',
  output: 'metadata-only',
  payloadAccess: 'deny',
  providerTransfer: 'deny',
});

export interface CaptureScope {
  interface: string;
  captureFilter: { type: 'capture_filter'; language: 'bpf'; expression: string };
  limits: { durationSeconds: number; byteLimit: number; fileCount: number };
  destination: { path: string; overwrite: false };
  retention: { class: 'ephemeral' | 'case-evidence' | 'case-work-product'; deleteAt: string; disposition: 'verified-delete' };
}

export interface LiveCaptureAuthorization extends CaptureScope {
  authorizationId: string;
  state: 'authorized' | 'denied' | 'revoked';
  authority: { principal: string; basis: string; approvedBy: string };
  issuedAt: string;
  expiresAt: string;
}

export interface ProviderDisclosureDecision {
  decisionId: string;
  state: 'allow' | 'deny' | 'revoked';
  captureDigest: string;
  provider: string;
  purpose: string;
  allowedContent: GovernedContent[];
  allowedFields: string[];
  payloadExplicitlyAuthorized: boolean;
  decidedBy: string;
  issuedAt: string;
  expiresAt: string;
}

export interface ProviderTransferRequest {
  captureDigest: string;
  provider: string;
  purpose: string;
  content: GovernedContent[];
  fields: string[];
}

export interface ProcessSpec {
  file: string;
  args: readonly string[];
  shell: false;
}

export interface EvidenceFileIdentity {
  role: 'source-capture' | 'derived-artifact';
  algorithm: 'sha256';
  value: string;
  byteLength: number;
}

const SHA256 = /^sha256:[a-f0-9]{64}$/;

export function assertLiveCaptureAuthorized(
  policy: NetworkAnalysisPolicy,
  authorization: LiveCaptureAuthorization,
  request: CaptureScope,
  now = new Date(),
): void {
  if (policy.acquisition !== 'live-capture-explicit-authorization') fail('Live capture is disabled by policy');
  if (authorization.state !== 'authorized') fail('Live capture authorization is not active');
  if (!authorization.authorizationId || !authorization.authority.principal || !authorization.authority.basis || !authorization.authority.approvedBy) {
    fail('Live capture requires a complete authority record');
  }
  assertActiveWindow(authorization.issuedAt, authorization.expiresAt, now, 'Live capture authorization');
  assertCaptureScope(authorization);
  assertCaptureScope(request);
  if (request.interface !== authorization.interface) fail('Capture interface exceeds authorization');
  if (request.captureFilter.expression !== authorization.captureFilter.expression) fail('Capture filter exceeds authorization');
  if (request.destination.path !== authorization.destination.path || request.destination.overwrite !== false) fail('Capture destination exceeds authorization');
  if (request.retention.class !== authorization.retention.class || request.retention.deleteAt !== authorization.retention.deleteAt) {
    fail('Capture retention differs from authorization');
  }
  if (timestamp(authorization.retention.deleteAt, 'Retention deletion time') <= now.getTime()) fail('Capture retention has already expired');
  if (request.limits.durationSeconds > authorization.limits.durationSeconds
    || request.limits.byteLimit > authorization.limits.byteLimit
    || request.limits.fileCount > authorization.limits.fileCount) {
    fail('Capture limits exceed authorization');
  }
}

export function assertLocalOutputAllowed(
  policy: NetworkAnalysisPolicy,
  request: { content: GovernedContent[]; payloadOptIn: boolean },
): void {
  const content = unique(request.content, 'Output content');
  assertKnownContent(content);
  if (!content.includes('metadata')) fail('Output must be metadata-first');
  if (content.includes('headers') && policy.output !== 'metadata-and-headers') fail('Header output requires explicit policy');
  const containsPayload = content.includes('payload') || content.includes('raw-packets');
  if (containsPayload && (policy.payloadAccess !== 'explicit-opt-in' || request.payloadOptIn !== true)) {
    fail('Payload and raw-packet output require explicit policy and request opt-in');
  }
}

export function assertProviderTransferAllowed(
  policy: NetworkAnalysisPolicy,
  decision: ProviderDisclosureDecision,
  request: ProviderTransferRequest,
  now = new Date(),
): void {
  if (policy.providerTransfer !== 'explicit-decision') fail('Provider transfer is disabled by policy');
  if (decision.state !== 'allow') fail('Provider disclosure decision does not allow transfer');
  if (!decision.decisionId || !decision.decidedBy || !decision.provider || !decision.purpose) fail('Provider disclosure decision is incomplete');
  assertActiveWindow(decision.issuedAt, decision.expiresAt, now, 'Provider disclosure decision');
  if (!SHA256.test(request.captureDigest) || request.captureDigest !== decision.captureDigest) fail('Provider decision does not match capture identity');
  if (request.provider !== decision.provider || request.purpose !== decision.purpose) fail('Provider or purpose exceeds disclosure decision');
  const content = unique(request.content, 'Provider content');
  const fields = unique(request.fields, 'Provider fields');
  assertKnownContent(content);
  unique(decision.allowedContent, 'Allowed provider content');
  unique(decision.allowedFields, 'Allowed provider fields');
  if (content.length === 0 || fields.length === 0) fail('Provider content and fields must be declared');
  if (content.some(item => !decision.allowedContent.includes(item))) fail('Provider content exceeds disclosure decision');
  if (fields.some(item => !decision.allowedFields.includes(item))) fail('Provider fields exceed disclosure decision');
  if ((content.includes('payload') || content.includes('raw-packets')) && decision.payloadExplicitlyAuthorized !== true) {
    fail('Provider payload transfer requires explicit payload authorization');
  }
}

/** Produce an execFile/spawn-compatible invocation. Filters remain individual argv entries. */
export function safeProcessSpec(file: string, args: readonly string[]): ProcessSpec {
  if (!path.isAbsolute(file) || file.includes('\0')) fail('Executable path must be absolute and contain no NUL byte');
  const safeArgs = args.map(argument => {
    if (typeof argument !== 'string' || argument.includes('\0')) fail('Process arguments must be strings without NUL bytes');
    return argument;
  });
  return Object.freeze({ file, args: Object.freeze(safeArgs), shell: false as const });
}

export function tsharkFilterArgs(filters: {
  captureFilter?: CaptureScope['captureFilter'];
  displayFilter?: { type: 'display_filter'; language: 'wireshark-display'; expression: string };
}): string[] {
  const args: string[] = [];
  if (filters.captureFilter) {
    assertText(filters.captureFilter.expression, 'Capture filter', 8192);
    args.push('-f', filters.captureFilter.expression);
  }
  if (filters.displayFilter) {
    assertText(filters.displayFilter.expression, 'Display filter', 8192);
    args.push('-Y', filters.displayFilter.expression);
  }
  return args;
}

export async function resolveCaptureDestination(allowedRoot: string, destination: string): Promise<string> {
  if (!path.isAbsolute(allowedRoot) || !path.isAbsolute(destination)) fail('Capture root and destination must be absolute');
  const root = await realpath(allowedRoot);
  const resolved = path.resolve(destination);
  const parent = await realpath(path.dirname(resolved));
  const relative = path.relative(root, parent);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    fail('Capture destination must be a file below the allowed root');
  }
  try {
    await lstat(resolved);
    fail('Capture destination already exists');
  } catch (error: any) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return path.join(parent, path.basename(resolved));
}

/** Hashes one regular, non-symlink file without changing it and rejects concurrent mutation. */
export async function hashEvidenceFile(file: string, role: EvidenceFileIdentity['role']): Promise<EvidenceFileIdentity> {
  const link = await lstat(file);
  if (link.isSymbolicLink() || !link.isFile()) fail('Evidence path must be a regular non-symlink file');
  const noFollow = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;
  const handle = await open(file, constants.O_RDONLY | noFollow);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) fail('Evidence descriptor must reference a regular file');
    if (before.dev !== BigInt(link.dev) || before.ino !== BigInt(link.ino)) fail('Evidence path changed before hashing');
    if (before.size > BigInt(Number.MAX_SAFE_INTEGER)) fail('Evidence file is too large to represent safely');
    const hash = createHash('sha256');
    const buffer = Buffer.allocUnsafe(64 * 1024);
    let position = 0;
    while (position < before.size) {
      const remaining = before.size - BigInt(position);
      const length = Number(remaining < BigInt(buffer.length) ? remaining : BigInt(buffer.length));
      const { bytesRead } = await handle.read(buffer, 0, length, position);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
      position += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    const linkAfter = await lstat(file);
    if (position !== Number(before.size) || before.dev !== after.dev || before.ino !== after.ino
      || before.size !== after.size || before.mtimeNs !== after.mtimeNs || linkAfter.isSymbolicLink()
      || before.dev !== BigInt(linkAfter.dev) || before.ino !== BigInt(linkAfter.ino)) {
      fail('Evidence file changed while it was being hashed');
    }
    return { role, algorithm: 'sha256', value: hash.digest('hex'), byteLength: Number(before.size) };
  } finally {
    await handle.close();
  }
}

export async function verifyEvidenceFile(file: string, expected: EvidenceFileIdentity): Promise<void> {
  const actual = await hashEvidenceFile(file, expected.role);
  if (actual.algorithm !== expected.algorithm || actual.value !== expected.value || actual.byteLength !== expected.byteLength) {
    fail('Evidence file no longer matches its recorded identity');
  }
}

function assertCaptureScope(scope: CaptureScope): void {
  assertText(scope.interface, 'Capture interface', 255);
  if (scope.captureFilter.type !== 'capture_filter' || scope.captureFilter.language !== 'bpf') fail('Live capture requires a typed BPF capture filter');
  assertText(scope.captureFilter.expression, 'Capture filter', 8192);
  positiveInteger(scope.limits.durationSeconds, 86400, 'Capture duration');
  positiveInteger(scope.limits.byteLimit, 10 * 1024 * 1024 * 1024, 'Capture byte limit');
  positiveInteger(scope.limits.fileCount, 100, 'Capture file count');
  if (!path.isAbsolute(scope.destination.path) || scope.destination.overwrite !== false) fail('Capture destination must be absolute and non-overwriting');
  assertText(scope.retention.class, 'Retention class', 64);
  if (scope.retention.disposition !== 'verified-delete') fail('Capture retention requires verified deletion');
  timestamp(scope.retention.deleteAt, 'Retention deletion time');
}

function assertActiveWindow(issuedAt: string, expiresAt: string, now: Date, label: string): void {
  const issued = timestamp(issuedAt, `${label} issued time`);
  const expires = timestamp(expiresAt, `${label} expiry time`);
  if (issued > expires || now.getTime() < issued || now.getTime() >= expires) fail(`${label} is not active`);
}

function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} must be an ISO-8601 timestamp`);
  return parsed;
}

function positiveInteger(value: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) fail(`${label} is outside its hard bound`);
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum || value.includes('\0')) fail(`${label} is invalid`);
}

function unique<T extends string>(values: T[], label: string): T[] {
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates`);
  return values;
}

function assertKnownContent(values: string[]): void {
  const allowed = new Set<GovernedContent>(['metadata', 'headers', 'raw-packets', 'payload']);
  if (values.some(value => !allowed.has(value as GovernedContent))) fail('Unknown governed content class');
}

function fail(message: string): never {
  throw new Error(message);
}
