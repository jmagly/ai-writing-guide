import { createHash } from 'node:crypto';
import { access, lstat, readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { readAiwgConfig, type InstalledEntry } from '../config/aiwg-config.js';
import { readUserRegistry, type UserScopeProviderDeploy } from '../config/user-registry.js';
import type { ArtifactVerificationResult } from '../security/artifact-verifier.js';
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
  status: 'written' | 'skipped';
  receiptPath: string | null;
  outputCount: number;
  reason?: string;
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

async function resolveSourceManifest(
  options: ProviderReceiptIntegrationOptions,
  bundle: string,
  entry: InstalledEntry | undefined,
): Promise<{ digest: string; canonicalBytesAvailable: boolean } | null> {
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
      return { digest: sha256(await readFile(candidate)), canonicalBytesAvailable: true };
    } catch {
      // Continue through the canonical source locations.
    }
  }
  const recorded = entry?.manifestHash?.replace(/^sha256:/, '');
  return recorded && /^[a-f0-9]{64}$/.test(recorded)
    ? { digest: recorded, canonicalBytesAvailable: false }
    : null;
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
    const source = await resolveSourceManifest(options, bundle, entry);
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
  const receiptBundles = Object.keys(installed)
    .filter(bundle => Boolean(installed[bundle]?.deployedTo[provider]))
    .sort();
  const evidenceOptions = receiptBundles.length > 0
    ? { ...options, requestedBundles: receiptBundles }
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
  return {
    status: 'written',
    receiptPath: await writeProviderTransformationReceipt(options.projectRoot, receipt),
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
