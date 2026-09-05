import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';

import { formatEvidenceCitation, type EvidenceCitation } from './citations.js';
import { hashEvidenceFile, safeProcessSpec, type ProcessSpec } from './governance.js';
import type { PacketEvidenceBundle } from './analyzer.js';
import type { ProbeStatus } from './probe.js';

export const TERMSHARK_HANDOFF_SCHEMA = 'aiwg.network-analysis.termshark-handoff.v1' as const;

export interface TermsharkCapability {
  status: ProbeStatus;
  path: string | null;
  version: string | null;
  diagnostics: string[];
}

export interface TermsharkFocus {
  frame?: number;
  stream?: { protocol: 'tcp' | 'udp'; id: number };
}

export interface TermsharkHandoffOptions {
  evidence: PacketEvidenceBundle;
  capturePath: string;
  contextDigest: string;
  displayFilter: string;
  termshark: TermsharkCapability;
  tsharkPath: string;
  configRoot: string;
  profile: { name: string; path?: string };
  focus?: TermsharkFocus;
  now?: () => Date;
}

export interface TermsharkHandoff {
  schema: typeof TERMSHARK_HANDOFF_SCHEMA;
  handoffId: string;
  status: 'ready' | 'unavailable' | 'incompatible';
  diagnostics: string[];
  evidenceBundleId: string;
  capturePath: string;
  captureDigest: string;
  analysisContextDigest: string;
  displayFilterDigest: string;
  effectiveFilterDigest: string;
  focus: TermsharkFocus;
  tool: { path: string | null; version: string | null };
  profile: { name: string; path?: string; digest?: string };
  configRoot: string;
  tsharkPath: string;
  tsharkVersion: string;
  command: ProcessSpec | null;
  commandPreview: string | null;
  createdAt: string;
  completionClaim: 'operator-returned-notes-only';
}

export interface TermsharkLaunchHost {
  run(spec: ProcessSpec, options: { configRoot: string; tsharkPath: string; signal?: AbortSignal }): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>;
}

export interface TermsharkReviewNote {
  analyst: string;
  recordedAt: string;
  note: string;
  citations: EvidenceCitation[];
  source: 'operator-returned-note';
}

export function createDefaultTermsharkLaunchHost(): TermsharkLaunchHost {
  return {
    async run(spec, options) {
      const cacheRoot = path.join(options.configRoot, 'cache');
      const dataRoot = path.join(options.configRoot, 'data');
      await mkdir(cacheRoot, { recursive: true, mode: 0o700 });
      await mkdir(dataRoot, { recursive: true, mode: 0o700 });
      return new Promise((resolve, reject) => {
        const child = spawn(spec.file, [...spec.args], {
          shell: false,
          stdio: 'inherit',
          signal: options.signal,
          env: {
            PATH: path.dirname(options.tsharkPath),
            XDG_CONFIG_HOME: options.configRoot,
            XDG_CACHE_HOME: cacheRoot,
            XDG_DATA_HOME: dataRoot,
            HOME: options.configRoot,
            TERM: process.env.TERM || 'xterm-256color',
            LC_ALL: 'C',
            LANG: 'C',
          },
        });
        child.once('error', reject);
        child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
      });
    },
  };
}

export async function createTermsharkHandoff(options: TermsharkHandoffOptions): Promise<TermsharkHandoff> {
  validateHandoffOptions(options);
  const context = findAnalysisContext(options.evidence, options.contextDigest);
  if (context.tool?.name !== 'tshark' || context.tool?.executable_path !== options.tsharkPath) {
    throw new Error('Termshark handoff TShark path does not match the evidence analysis context');
  }
  const sourceHash = String((options.evidence.capture.hashes as any)?.source?.value ?? '');
  const actual = await hashEvidenceFile(options.capturePath, 'source-capture');
  if (sourceHash !== actual.value || options.evidence.capture.capture_digest !== `sha256:${actual.value}`) {
    throw new Error('Termshark handoff capture does not match the evidence bundle identity');
  }
  const displayFilterDigest = `sha256:${sha256(options.displayFilter)}`;
  if (context.display_filter_digest !== displayFilterDigest) {
    throw new Error('Termshark handoff display filter does not match the evidence analysis context');
  }
  const canonicalConfigRoot = await validateDirectory(options.configRoot, 'Termshark config root');
  const profile = await validateProfile(options.profile, canonicalConfigRoot);
  const focus = normalizeFocus(options.focus);
  validateFocusEvidence(options.evidence, options.contextDigest, focus);
  const effectiveFilter = focusedDisplayFilter(options.displayFilter, focus);
  const base = baseHandoff(options, profile, canonicalConfigRoot, focus, displayFilterDigest, effectiveFilter);

  if (options.termshark.status === 'missing' || !options.termshark.path || !options.termshark.version) {
    return {
      ...base,
      status: 'unavailable',
      diagnostics: [...options.termshark.diagnostics, 'Termshark is optional; TShark evidence remains valid and available.'],
      command: null,
      commandPreview: null,
    };
  }
  if (options.termshark.status !== 'supported' || !semver.valid(options.termshark.version)
    || !semver.satisfies(options.termshark.version, '>=2.4.0 <3.0.0')) {
    return {
      ...base,
      status: 'incompatible',
      diagnostics: [...options.termshark.diagnostics, `Termshark ${options.termshark.version} is outside the supported >=2.4.0 <3.0.0 range; TShark evidence remains valid.`],
      command: null,
      commandPreview: null,
    };
  }

  const command = safeProcessSpec(options.termshark.path, [
    '-r', options.capturePath,
    '-Y', effectiveFilter,
    '-C', profile.name,
  ]);
  return {
    ...base,
    status: 'ready',
    diagnostics: [...options.termshark.diagnostics],
    command,
    commandPreview: formatCommandPreview(command),
  };
}

export async function launchTermsharkHandoff(
  handoff: TermsharkHandoff,
  action: { explicitOperatorAction: true; signal?: AbortSignal },
  host: TermsharkLaunchHost = createDefaultTermsharkLaunchHost(),
): Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }> {
  if (action.explicitOperatorAction !== true) throw new Error('Termshark launch requires an explicit operator action');
  if (handoff.status !== 'ready' || !handoff.command) throw new Error('Termshark handoff is not ready to launch');
  await validateLaunchIdentity(handoff);
  const actual = await hashEvidenceFile(handoff.capturePath, 'source-capture');
  if (`sha256:${actual.value}` !== handoff.captureDigest) {
    throw new Error('Termshark launch capture no longer matches the reviewed handoff');
  }
  return host.run(handoff.command, { configRoot: handoff.configRoot, tsharkPath: handoff.tsharkPath, signal: action.signal });
}

export function recordTermsharkReview(
  handoff: TermsharkHandoff,
  evidence: PacketEvidenceBundle,
  input: { analyst: string; note: string; citations: EvidenceCitation[]; recordedAt?: string },
): TermsharkReviewNote {
  if (evidence.bundle_id !== handoff.evidenceBundleId || evidence.capture.capture_digest !== handoff.captureDigest) {
    throw new Error('Operator note evidence does not match the reviewed Termshark handoff');
  }
  if (!input.analyst.trim() || !input.note.trim() || input.citations.length === 0) throw new Error('Analyst, note, and at least one packet locator are required');
  const evidenceCitations = new Set(evidence.evidence_items.flatMap(item => (item.citations as EvidenceCitation[]).map(formatEvidenceCitation)));
  for (const citation of input.citations) {
    if (citation.capture_digest !== handoff.captureDigest || !evidenceCitations.has(formatEvidenceCitation(citation))) {
      throw new Error('Operator note citation is not present in the evidence bundle');
    }
  }
  return {
    analyst: input.analyst,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    note: input.note,
    citations: structuredClone(input.citations),
    source: 'operator-returned-note',
  };
}

function baseHandoff(
  options: TermsharkHandoffOptions,
  profile: TermsharkHandoff['profile'],
  configRoot: string,
  focus: TermsharkFocus,
  displayFilterDigest: string,
  effectiveFilter: string,
): Omit<TermsharkHandoff, 'status' | 'diagnostics' | 'command' | 'commandPreview'> {
  const fingerprint = sha256(JSON.stringify({
    bundle: options.evidence.bundle_id,
    capture: options.evidence.capture.capture_digest,
    context: options.contextDigest,
    filter: effectiveFilter,
    profile,
    tool: options.termshark,
  }));
  return {
    schema: TERMSHARK_HANDOFF_SCHEMA,
    handoffId: `termshark-handoff:${fingerprint.slice(0, 24)}`,
    evidenceBundleId: options.evidence.bundle_id,
    capturePath: options.capturePath,
    captureDigest: String(options.evidence.capture.capture_digest),
    analysisContextDigest: options.contextDigest,
    displayFilterDigest,
    effectiveFilterDigest: `sha256:${sha256(effectiveFilter)}`,
    focus,
    tool: { path: options.termshark.path, version: options.termshark.version },
    profile,
    configRoot,
    tsharkPath: options.tsharkPath,
    tsharkVersion: String(findAnalysisContext(options.evidence, options.contextDigest).tool.version),
    createdAt: (options.now ?? (() => new Date()))().toISOString(),
    completionClaim: 'operator-returned-notes-only',
  };
}

function findAnalysisContext(evidence: PacketEvidenceBundle, digest: string): any {
  if (!/^sha256:[a-f0-9]{64}$/.test(digest)) throw new Error('Termshark handoff requires a canonical analysis context digest');
  const contexts = evidence.capture.analysis_contexts as any[];
  const context = contexts.find(candidate => candidate.context_digest === digest);
  if (!context) throw new Error('Termshark handoff analysis context is absent from the evidence bundle');
  return context;
}

async function validateDirectory(directory: string, label: string): Promise<string> {
  if (!path.isAbsolute(directory)) throw new Error(`${label} must be an explicit absolute path`);
  const stat = await lstat(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${label} must be a real non-symlink directory`);
  return realpath(directory);
}

async function validateProfile(profile: TermsharkHandoffOptions['profile'], configRoot: string): Promise<TermsharkHandoff['profile']> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(profile.name)) throw new Error('Termshark profile name is invalid');
  if (!profile.path) return { name: profile.name };
  if (!path.isAbsolute(profile.path)) throw new Error('Termshark profile path must be explicit and absolute');
  const canonical = await realpath(profile.path);
  const relative = path.relative(configRoot, canonical);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Termshark profile path must remain below the config root');
  }
  const identity = await hashEvidenceFile(canonical, 'derived-artifact');
  return { name: profile.name, path: canonical, digest: `sha256:${identity.value}` };
}

function normalizeFocus(focus: TermsharkFocus | undefined): TermsharkFocus {
  if (!focus) return {};
  if (focus.frame !== undefined && (!Number.isSafeInteger(focus.frame) || focus.frame < 1)) throw new Error('Termshark frame focus is invalid');
  if (focus.stream && (!['tcp', 'udp'].includes(focus.stream.protocol) || !Number.isSafeInteger(focus.stream.id) || focus.stream.id < 0)) {
    throw new Error('Termshark stream focus is invalid');
  }
  return structuredClone(focus);
}

function validateFocusEvidence(evidence: PacketEvidenceBundle, contextDigest: string, focus: TermsharkFocus): void {
  if (focus.frame === undefined && focus.stream === undefined) return;
  const citations = evidence.evidence_items.flatMap(item => (item.citations ?? []) as EvidenceCitation[]);
  if (focus.frame !== undefined && !citations.some(citation => citation.locator.type === 'frame'
    && citation.locator.frame_number === focus.frame)) {
    throw new Error('Termshark frame focus is absent from the evidence bundle');
  }
  if (focus.stream && !citations.some(citation => citation.locator.type === 'stream'
    && citation.locator.protocol === focus.stream?.protocol
    && citation.locator.stream_id === focus.stream.id
    && citation.locator.context_digest === contextDigest)) {
    throw new Error('Termshark stream focus is absent from the selected analysis context');
  }
}

async function validateLaunchIdentity(handoff: TermsharkHandoff): Promise<void> {
  if (!handoff.command || handoff.command.shell !== false || handoff.command.file !== handoff.tool.path) {
    throw new Error('Termshark launch command no longer matches the reviewed tool');
  }
  const args = handoff.command.args;
  if (args.length !== 6 || args[0] !== '-r' || args[1] !== handoff.capturePath
    || args[2] !== '-Y' || args[4] !== '-C' || args[5] !== handoff.profile.name
    || `sha256:${sha256(args[3])}` !== handoff.effectiveFilterDigest) {
    throw new Error('Termshark launch arguments no longer match the reviewed handoff');
  }
  const configRoot = await validateDirectory(handoff.configRoot, 'Termshark config root');
  if (configRoot !== handoff.configRoot) throw new Error('Termshark config root identity changed after review');
  if (handoff.profile.path) {
    const profile = await validateProfile({ name: handoff.profile.name, path: handoff.profile.path }, configRoot);
    if (profile.path !== handoff.profile.path || profile.digest !== handoff.profile.digest) {
      throw new Error('Termshark profile identity changed after review');
    }
  }
}

function focusedDisplayFilter(displayFilter: string, focus: TermsharkFocus): string {
  if (!displayFilter.trim() || displayFilter.length > 8192 || displayFilter.includes('\0')) throw new Error('Termshark display filter is invalid');
  const additions: string[] = [];
  if (focus.frame !== undefined) additions.push(`frame.number == ${focus.frame}`);
  if (focus.stream) additions.push(`${focus.stream.protocol}.stream == ${focus.stream.id}`);
  return [displayFilter, ...additions].map(expression => `(${expression})`).join(' && ');
}

function validateHandoffOptions(options: TermsharkHandoffOptions): void {
  if (!path.isAbsolute(options.capturePath)) throw new Error('Termshark capture path must be explicit and absolute');
  if (!path.isAbsolute(options.tsharkPath)) throw new Error('TShark path must be explicit and absolute');
  if (options.termshark.path !== null && !path.isAbsolute(options.termshark.path)) throw new Error('Termshark path must be explicit and absolute');
}

function formatCommandPreview(spec: ProcessSpec): string {
  return [spec.file, ...spec.args].map(argument => `'${argument.replace(/'/g, `'"'"'`)}'`).join(' ');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
