import { createHash, randomUUID } from 'node:crypto';
import { access, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { readAiwgConfig, type InstalledEntry } from '../config/aiwg-config.js';
import { readUserRegistry, type UserScopeProviderDeploy } from '../config/user-registry.js';
import type { ArtifactVerificationResult } from '../security/artifact-verifier.js';
import type { VerifiedWebRelease } from '../resources/web-release.js';
import { USER_SCOPE_PATHS } from '../cli/scope-resolver.js';
import {
  getProviderDefinition,
  getProviderKernelSkillPath,
  normalizeProviderDefinitionId,
  resolveProviderPathValue,
  type ProviderArtifactPathStrings,
} from './provider-definitions.js';
import {
  createProviderTransformationReceipt,
  diagnoseProviderTransformationReceipt,
  providerTransformationReceiptPath,
  writeProviderTransformationReceipt,
  type ProviderTransformationDiagnosis,
  type ProviderTransformationReceipt,
} from './transformation-receipt.js';

const TRANSFORMER_ID = 'aiwg-provider-transformer';
const TRANSFORMER_VERSION = '1';
const MANAGED_SIDECAR = '.aiwg-manifest.json';
const MANAGED_DIRECTORY_MARKER = '.aiwg-managed';
const MANAGED_FILE_MARKER = /^(?:<!-- aiwg:managed |# aiwg:managed )/m;

const FRAMEWORK_BUNDLE_DIRS: Readonly<Record<string, string>> = {
  all: 'sdlc-complete',
  sdlc: 'sdlc-complete',
  marketing: 'media-marketing-kit',
  'media-curator': 'media-curator',
  research: 'research-complete',
  forensics: 'forensics-complete',
  dfir: 'forensics-complete',
  'security-engineering': 'security-engineering',
  ops: 'ops-complete',
  validation: 'validation-complete',
  'knowledge-base': 'knowledge-base',
};

export interface ProviderReceiptIntegrationOptions {
  projectRoot: string;
  /** Root containing provider outputs; projectRoot remains the local control root. */
  outputRoot?: string;
  frameworkRoot: string;
  provider: string;
  scope: 'project' | 'user';
  requestedBundles: string[];
  generatedAt?: string;
  /** Verifier results keyed by installed bundle name. Required for receipt issuance. */
  sourceVerifications?: Readonly<Record<string, ArtifactVerificationResult>>;
  /** Explicit reason a verified source handoff is unavailable. */
  sourceDisposition?: 'local-source' | 'source-unavailable' | 'verification-failed';
}

export interface ProviderReceiptRuntimeEvidence {
  provider: string;
  outputRoot: string;
  outputPaths: string[];
  source: {
    subject: string;
    sha256: string;
    verification: 'verified' | 'policy-exempt' | 'failed';
  };
  transformer: ProviderTransformationReceipt['transformer'];
}

export interface ProviderReceiptFinalization {
  status: 'written' | 'policy-exempt' | 'source-unavailable' | 'skipped';
  receiptPath: string | null;
  evidenceStatePath?: string;
  outputCount: number;
  reason?: string;
}

const PROVIDER_TRANSFORMATION_EVIDENCE_STATE_SCHEMA = 'aiwg.provider-transformation-evidence-state.v1' as const;

interface ProviderTransformationEvidenceState {
  schemaVersion: typeof PROVIDER_TRANSFORMATION_EVIDENCE_STATE_SCHEMA;
  recordedAt: string;
  provider: string;
  scope: 'project' | 'user';
  disposition: 'local-source' | 'source-unavailable' | 'verification-failed';
}

export function providerTransformationEvidenceStatePath(
  projectRoot: string,
  provider: string,
  scope: 'project' | 'user',
): string {
  const receiptPath = providerTransformationReceiptPath(projectRoot, provider, scope);
  return receiptPath.replace(/\.json$/, '.evidence.json');
}

function validateEvidenceState(value: unknown): ProviderTransformationEvidenceState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('evidence state must be an object');
  const state = value as ProviderTransformationEvidenceState;
  if (state.schemaVersion !== PROVIDER_TRANSFORMATION_EVIDENCE_STATE_SCHEMA) throw new Error('unsupported evidence state schema');
  if (!Number.isFinite(Date.parse(state.recordedAt))) throw new Error('recordedAt must be an RFC 3339 date-time');
  if (state.scope !== 'project' && state.scope !== 'user') throw new Error('scope must be project or user');
  if (!['local-source', 'source-unavailable', 'verification-failed'].includes(state.disposition)) {
    throw new Error('unsupported source evidence disposition');
  }
  if (!state.provider || state.provider.includes('/') || state.provider.includes('\\')) throw new Error('provider is invalid');
  return state;
}

async function writeEvidenceState(
  options: ProviderReceiptIntegrationOptions,
  disposition: ProviderTransformationEvidenceState['disposition'],
): Promise<string> {
  const provider = normalizeProviderDefinitionId(options.provider) ?? options.provider;
  const target = providerTransformationEvidenceStatePath(options.projectRoot, provider, options.scope);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  const state: ProviderTransformationEvidenceState = {
    schemaVersion: PROVIDER_TRANSFORMATION_EVIDENCE_STATE_SCHEMA,
    recordedAt: options.generatedAt ?? new Date().toISOString(),
    provider,
    scope: options.scope,
    disposition,
  };
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
  await rm(providerTransformationReceiptPath(options.projectRoot, provider, options.scope), { force: true });
  return target;
}

async function readEvidenceState(options: ProviderReceiptIntegrationOptions): Promise<ProviderTransformationEvidenceState | null> {
  const provider = normalizeProviderDefinitionId(options.provider) ?? options.provider;
  try {
    const state = validateEvidenceState(JSON.parse(await readFile(
      providerTransformationEvidenceStatePath(options.projectRoot, provider, options.scope),
      'utf8',
    )));
    if (state.provider !== provider || state.scope !== options.scope) throw new Error('evidence state identity does not match deployment');
    return state;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function portablePath(root: string, absolute: string): string | null {
  const relative = path.relative(root, absolute);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
  return relative.split(path.sep).join('/');
}

async function regularFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const candidate = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await regularFiles(candidate));
    else if (entry.isFile()) files.push(candidate);
  }
  return files;
}

async function addEntry(files: Set<string>, candidate: string): Promise<void> {
  try {
    const metadata = await lstat(candidate);
    if (metadata.isFile()) files.add(candidate);
    else if (metadata.isDirectory()) {
      for (const file of await regularFiles(candidate)) files.add(file);
    }
  } catch {
    // A registry or sidecar entry can describe a stale partial deployment.
    // Receipt finalization binds only successful on-disk outputs; an existing
    // receipt remains responsible for diagnosing later deletion.
  }
}

async function collectOwnedDirectory(
  directory: string,
  exactEntries: string[],
  files: Set<string>,
): Promise<void> {
  for (const entry of exactEntries) await addEntry(files, path.join(directory, entry));

  const sidecarPath = path.join(directory, MANAGED_SIDECAR);
  try {
    const sidecar = JSON.parse(await readFile(sidecarPath, 'utf8')) as { managed?: Record<string, unknown> };
    const managed = sidecar.managed && typeof sidecar.managed === 'object'
      ? Object.keys(sidecar.managed)
      : [];
    if (managed.length > 0) files.add(sidecarPath);
    for (const name of managed) {
      if (name === path.basename(name) && name !== MANAGED_SIDECAR) {
        await addEntry(files, path.join(directory, name));
      }
    }
  } catch {
    // Missing or invalid sidecars are not ownership evidence.
  }

  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      try {
        const marker = await lstat(path.join(candidate, MANAGED_DIRECTORY_MARKER));
        if (!marker.isFile()) continue;
        await addEntry(files, candidate);
      } catch {
        // Unmarked directories remain operator-owned.
      }
      continue;
    }
    if (!entry.isFile() || entry.name === MANAGED_SIDECAR) continue;
    try {
      const content = await readFile(candidate, 'utf8');
      if (MANAGED_FILE_MARKER.test(content)) files.add(candidate);
    } catch {
      // Unreadable files cannot establish an ownership signal.
    }
  }
}

function artifactPaths(
  provider: string,
  scope: 'project' | 'user',
): ProviderArtifactPathStrings | null {
  const definition = getProviderDefinition(provider);
  if (!definition) return null;
  if (scope === 'user') return USER_SCOPE_PATHS[provider] ?? null;
  return {
    agents: definition.paths.artifacts.agents ?? '',
    commands: definition.paths.artifacts.commands ?? '',
    skills: definition.paths.artifacts.skills ?? '',
    rules: definition.paths.artifacts.rules ?? '',
    behaviors: definition.paths.artifacts.behaviors ?? '',
  };
}

async function installedEntries(options: ProviderReceiptIntegrationOptions): Promise<Record<string, InstalledEntry>> {
  if (options.scope === 'user' && options.provider !== 'openhuman') {
    return (await readUserRegistry()).installed;
  }
  return (await readAiwgConfig(options.projectRoot))?.installed ?? {};
}

function exactUserEntries(
  installed: Record<string, InstalledEntry>,
  bundles: string[],
  provider: string,
  type: keyof ProviderArtifactPathStrings,
): string[] {
  const entries = new Set<string>();
  for (const bundle of bundles) {
    const deployment = installed[bundle]?.deployedTo[provider] as UserScopeProviderDeploy | undefined;
    for (const name of deployment?.entries?.[type] ?? []) {
      if (name === path.basename(name) && name !== '.' && name !== '..') entries.add(name);
    }
  }
  return [...entries].sort();
}

interface CanonicalSourceBundle {
  digest: string;
  root: string;
  files: Array<{ path: string; sha256: string; bytes: number; absolutePath: string }>;
  canonicalBytesAvailable: boolean;
}

async function sourceBundleFiles(root: string): Promise<CanonicalSourceBundle['files']> {
  const files: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const candidate = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`canonical source bundle contains a symbolic link: ${candidate}`);
      if (entry.isDirectory()) await walk(candidate);
      else if (entry.isFile()) files.push(candidate);
      else throw new Error(`canonical source bundle contains a non-regular entry: ${candidate}`);
    }
  };
  await walk(root);
  const inventory = await Promise.all(files.map(async absolutePath => {
    const content = await readFile(absolutePath);
    return {
      path: path.relative(root, absolutePath).split(path.sep).join('/'),
      sha256: sha256(content),
      bytes: content.byteLength,
      absolutePath,
    };
  }));
  return inventory.sort((left, right) => left.path.localeCompare(right.path));
}

async function resolveSourceBundle(
  options: ProviderReceiptIntegrationOptions,
  bundle: string,
  entry: InstalledEntry | undefined,
): Promise<CanonicalSourceBundle | null> {
  const candidates: string[] = [];
  if (entry?.source === 'project-local' && entry.localPath) {
    candidates.push(path.resolve(options.projectRoot, entry.localPath, 'manifest.json'));
  }
  const frameworkDir = FRAMEWORK_BUNDLE_DIRS[bundle] ?? bundle;
  candidates.push(
    path.join(options.frameworkRoot, 'agentic', 'code', 'frameworks', frameworkDir, 'manifest.json'),
    path.join(options.frameworkRoot, 'agentic', 'code', 'addons', bundle, 'manifest.json'),
    path.join(options.frameworkRoot, 'agentic', 'code', 'extensions', bundle, 'manifest.json'),
  );
  for (const candidate of candidates) {
    try {
      await access(candidate);
      const root = path.dirname(candidate);
      const files = await sourceBundleFiles(root);
      if (files.length === 0) continue;
      return {
        digest: sha256(stable(files.map(({ path: file, sha256: digest, bytes }) => ({ path: file, sha256: digest, bytes })))),
        root,
        files,
        canonicalBytesAvailable: true,
      };
    } catch {
      // Continue through the canonical source locations.
    }
  }
  const recorded = entry?.manifestHash?.replace(/^sha256:/, '');
  return recorded && /^[a-f0-9]{64}$/.test(recorded)
    ? { digest: recorded, root: '', files: [], canonicalBytesAvailable: false }
    : null;
}

function receiptBundles(
  installed: Record<string, InstalledEntry>,
  options: ProviderReceiptIntegrationOptions,
): string[] {
  const deployed = Object.keys(installed)
    .filter(bundle => Boolean(installed[bundle]?.deployedTo[options.provider]))
    .sort();
  return deployed.length > 0 ? deployed : [...new Set(options.requestedBundles)].sort();
}

/**
 * Return whether the deployed provider surface includes project-local source
 * material that cannot be authenticated by an AIWG signed web release.
 */
export async function providerReceiptHasLocalSources(
  rawOptions: ProviderReceiptIntegrationOptions,
): Promise<boolean> {
  const provider = normalizeProviderDefinitionId(rawOptions.provider) ?? rawOptions.provider;
  const options = { ...rawOptions, provider };
  const installed = await installedEntries(options);
  return receiptBundles(installed, options)
    .some(bundle => installed[bundle]?.source === 'project-local');
}

/**
 * Convert an already signature-verified web release into the stable verifier
 * result contract for the complete canonical bundle consumed by deployment.
 * Every local file must match its signed descriptor; a registry's self-recorded
 * manifestHash is never an authentication boundary.
 */
export async function sourceVerificationsFromSignedWebRelease(
  options: ProviderReceiptIntegrationOptions,
  release: VerifiedWebRelease,
): Promise<Readonly<Record<string, ArtifactVerificationResult>>> {
  const installed = await installedEntries(options);
  const results: Record<string, ArtifactVerificationResult> = {};
  for (const bundle of receiptBundles(installed, options)) {
    const entry = installed[bundle];
    if (entry?.source === 'project-local') continue;
    const source = await resolveSourceBundle(options, bundle, entry);
    if (!source?.canonicalBytesAvailable) continue;
    let matched = true;
    for (const file of source.files) {
      const relative = path.relative(options.frameworkRoot, file.absolutePath).split(path.sep).join('/');
      if (!relative || relative === '..' || relative.startsWith('../')) {
        matched = false;
        break;
      }
      const descriptor = release.descriptors.get(`raw/${relative}`);
      if (!descriptor || descriptor.sha256 !== file.sha256 || descriptor.size !== file.bytes) {
        matched = false;
        break;
      }
    }
    if (!matched) continue;
    const artifactName = `aiwg:bundle-inventory:${bundle}`;
    results[bundle] = {
      schemaVersion: 'aiwg.verify.result.v1',
      status: 'verified',
      exitCode: 0,
      artifact: { name: artifactName, sha256: source.digest },
      policy: 'aiwg-signed-web-release',
      identities: ['aiwg-release-publisher'],
      ...(release.channelSequence === undefined ? {} : {
        freshness: {
          namespace: 'aiwg',
          channel: release.selector,
          sequence: release.channelSequence,
          version: release.version,
        },
      }),
      diagnostics: [{
        code: 'SIGNED_RELEASE_DESCRIPTOR',
        message: `Exact canonical source bytes match signed release manifest ${release.manifestDigest}`,
      }],
    };
  }
  return results;
}

async function sourceEvidence(
  options: ProviderReceiptIntegrationOptions,
  installed: Record<string, InstalledEntry>,
): Promise<ProviderReceiptRuntimeEvidence['source']> {
  const bundles = [...new Set(options.requestedBundles)].sort();
  const materials: Array<Record<string, string>> = [];
  let authenticated = Boolean(options.sourceVerifications);
  for (const bundle of bundles) {
    const entry = installed[bundle];
    const source = await resolveSourceBundle(options, bundle, entry);
    if (!source) {
      return {
        subject: `aiwg:deployment:${sha256(bundles.join('\0')).slice(0, 24)}`,
        sha256: sha256(stable(materials)),
        verification: 'failed',
      };
    }
    const verification = options.sourceVerifications?.[bundle];
    if (!source.canonicalBytesAvailable
      || verification?.status !== 'verified'
      || verification.artifact.sha256 !== source.digest) {
      authenticated = false;
    }
    materials.push({
      bundle,
      digest: source.digest,
      source: entry?.source ?? 'unknown',
      version: entry?.version ?? 'unknown',
    });
  }
  const digest = sha256(stable(materials));
  return {
    subject: `aiwg:deployment:${digest.slice(0, 24)}`,
    sha256: digest,
    verification: options.sourceVerifications
      ? authenticated ? 'verified' : 'failed'
      : 'policy-exempt',
  };
}

function transformerEvidence(
  provider: string,
  scope: 'project' | 'user',
): ProviderTransformationReceipt['transformer'] {
  const definition = getProviderDefinition(provider);
  const adapterContract = definition
    ? {
      adapters: definition.adapters,
      artifacts: definition.paths.artifacts,
      kernelSkills: definition.paths.kernelSkills,
      scope,
      userArtifacts: scope === 'user' ? USER_SCOPE_PATHS[provider] ?? null : null,
    }
    : { provider, scope };
  return {
    id: TRANSFORMER_ID,
    version: TRANSFORMER_VERSION,
    providerAdapter: provider,
    providerAdapterVersion: sha256(stable(adapterContract)),
  };
}

export async function resolveProviderReceiptRuntimeEvidence(
  rawOptions: ProviderReceiptIntegrationOptions,
): Promise<ProviderReceiptRuntimeEvidence> {
  const provider = normalizeProviderDefinitionId(rawOptions.provider) ?? rawOptions.provider;
  const options = { ...rawOptions, provider };
  const installed = await installedEntries(options);
  const deployedBundles = receiptBundles(installed, options);
  const evidenceOptions = deployedBundles.length > 0
    ? { ...options, requestedBundles: deployedBundles }
    : options;
  const paths = artifactPaths(provider, options.scope);
  const outputRoot = path.resolve(
    options.outputRoot ?? (options.scope === 'user' ? homedir() : options.projectRoot),
  );
  const ownedFiles = new Set<string>();
  if (paths) {
    for (const type of ['agents', 'commands', 'skills', 'rules', 'behaviors'] as const) {
      const configured = paths[type];
      if (!configured) continue;
      const directory = resolveProviderPathValue(configured, outputRoot);
      const entries = options.scope === 'user'
        ? exactUserEntries(installed, evidenceOptions.requestedBundles, provider, type)
        : [];
      await collectOwnedDirectory(directory, entries, ownedFiles);
    }
    if (options.scope === 'project') {
      const kernel = resolveProviderPathValue(getProviderKernelSkillPath(provider), outputRoot);
      if (kernel) await collectOwnedDirectory(kernel, [], ownedFiles);
    }
  }
  const outputPaths = [...ownedFiles]
    .map(file => portablePath(outputRoot, file))
    .filter((file): file is string => Boolean(file))
    .sort();
  return {
    provider,
    outputRoot,
    outputPaths,
    source: await sourceEvidence(evidenceOptions, installed),
    transformer: transformerEvidence(provider, options.scope),
  };
}

export async function finalizeProviderTransformationReceipt(
  options: ProviderReceiptIntegrationOptions,
): Promise<ProviderReceiptFinalization> {
  if (options.sourceDisposition) {
    const evidenceStatePath = await writeEvidenceState(options, options.sourceDisposition);
    if (options.sourceDisposition === 'local-source') {
      return {
        status: 'policy-exempt',
        receiptPath: null,
        evidenceStatePath,
        outputCount: 0,
        reason: 'local-source development deployments are exempt from signed-release receipt issuance',
      };
    }
    return {
      status: options.sourceDisposition === 'source-unavailable' ? 'source-unavailable' : 'skipped',
      receiptPath: null,
      evidenceStatePath,
      outputCount: 0,
      reason: options.sourceDisposition === 'source-unavailable'
        ? 'verified signed-release source evidence is not available from cache or configured resource access'
        : 'canonical source verification failed',
    };
  }
  if (!options.sourceVerifications) {
    return {
      status: 'skipped',
      receiptPath: null,
      outputCount: 0,
      reason: 'authenticated canonical source evidence was not supplied',
    };
  }
  const evidence = await resolveProviderReceiptRuntimeEvidence(options);
  if (evidence.source.verification !== 'verified') {
    return {
      status: 'skipped',
      receiptPath: null,
      outputCount: 0,
      reason: evidence.source.verification === 'failed'
        ? 'canonical source verification failed'
        : 'authenticated canonical source evidence was not supplied',
    };
  }
  if (evidence.outputPaths.length === 0) {
    return { status: 'skipped', receiptPath: null, outputCount: 0, reason: 'no managed provider outputs were found' };
  }
  const verifiedSource: ProviderTransformationReceipt['source'] = {
    subject: evidence.source.subject,
    sha256: evidence.source.sha256,
    verification: evidence.source.verification,
  };
  const receipt = await createProviderTransformationReceipt({
    projectRoot: options.projectRoot,
    outputRoot: evidence.outputRoot,
    provider: evidence.provider,
    scope: options.scope,
    generatedAt: options.generatedAt,
    source: verifiedSource,
    transformer: evidence.transformer,
    outputPaths: evidence.outputPaths,
  });
  const receiptPath = await writeProviderTransformationReceipt(options.projectRoot, receipt);
  await rm(providerTransformationEvidenceStatePath(options.projectRoot, evidence.provider, options.scope), { force: true });
  return {
    status: 'written',
    receiptPath,
    outputCount: receipt.outputs.length,
  };
}

export async function diagnoseIntegratedProviderTransformationReceipt(
  options: ProviderReceiptIntegrationOptions,
): Promise<ProviderTransformationDiagnosis> {
  const provider = normalizeProviderDefinitionId(options.provider) ?? options.provider;
  const receiptPath = providerTransformationReceiptPath(options.projectRoot, provider, options.scope);
  try {
    await access(receiptPath);
  } catch {
    const state = await readEvidenceState(options);
    if (state?.disposition === 'local-source') {
      return {
        status: 'policy-exempt',
        receiptPath,
        checkedOutputs: 0,
        findings: [{
          kind: 'policy-exempt',
          message: 'This local-source development deployment is explicitly exempt from signed-release transformation receipts.',
        }],
      };
    }
    if (state?.disposition === 'source-unavailable') {
      return {
        status: 'source-evidence-unavailable',
        receiptPath,
        checkedOutputs: 0,
        findings: [{
          kind: 'source-evidence-unavailable',
          message: 'The deployment succeeded, but verified signed-release source evidence was unavailable from cache or configured resource access.',
        }],
      };
    }
    if (state?.disposition === 'verification-failed') {
      return {
        status: 'drifted',
        receiptPath,
        checkedOutputs: 0,
        findings: [{
          kind: 'source-verification-failure',
          message: 'Canonical source verification failed during receipt finalization.',
        }],
      };
    }
    return {
      status: 'missing-receipt',
      receiptPath,
      checkedOutputs: 0,
      findings: [{
        kind: 'missing-receipt',
        message: 'No transformation receipt exists for this provider deployment.',
      }],
    };
  }
  const evidence = await resolveProviderReceiptRuntimeEvidence(options);
  return diagnoseProviderTransformationReceipt({
    projectRoot: options.projectRoot,
    outputRoot: evidence.outputRoot,
    provider: evidence.provider,
    scope: options.scope,
    source: evidence.source,
    transformer: evidence.transformer,
  });
}
