import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export type ProviderNativeOutputMode = 'disabled' | 'explicit-only' | 'project-default';
export type ArtifactDestinationUse = 'disabled' | 'user-requested' | 'project-default';

export interface ArtifactOutputDestinationConfig {
  enabled?: boolean;
  use_when?: ArtifactDestinationUse;
}

export interface ArtifactOutputsConfig {
  canonical?: 'aiwg';
  provider_native?: ProviderNativeOutputMode;
  destinations?: Record<string, ArtifactOutputDestinationConfig>;
}

export interface ArtifactOutputSelection {
  canonical: 'aiwg';
  presentations: string[];
  authority: Record<string, ArtifactOutputAuthority>;
  diagnostics: string[];
}

export type ArtifactOutputAuthority = 'explicit-task' | 'user-preference' | 'project-default' | 'provider-default';

export interface ResolveArtifactOutputOptions {
  project?: ArtifactOutputsConfig;
  userPreference?: ArtifactOutputsConfig;
  explicitDestinations?: string[];
  providerDefaults?: string[];
  supportedDestinations?: string[];
}

export function defaultArtifactOutputs(): Required<Pick<ArtifactOutputsConfig, 'canonical' | 'provider_native'>> & Pick<ArtifactOutputsConfig, 'destinations'> {
  return { canonical: 'aiwg', provider_native: 'explicit-only', destinations: {} };
}

export function validateArtifactOutputs(value: ArtifactOutputsConfig | undefined): string[] {
  if (value === undefined) return [];
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['artifact_outputs must be an object'];
  if (value.canonical !== undefined && value.canonical !== 'aiwg') errors.push("artifact_outputs.canonical must be 'aiwg'");
  if (value.provider_native !== undefined && !['disabled', 'explicit-only', 'project-default'].includes(value.provider_native)) errors.push('artifact_outputs.provider_native must be disabled, explicit-only, or project-default');
  for (const [id, destination] of Object.entries(value.destinations ?? {})) {
    if (!/^[a-z0-9][a-z0-9.-]*$/.test(id)) errors.push(`artifact_outputs destination '${id}' has an invalid stable ID`);
    if (!destination || typeof destination !== 'object' || Array.isArray(destination)) { errors.push(`artifact_outputs.destinations.${id} must be an object`); continue; }
    if (destination.enabled !== undefined && typeof destination.enabled !== 'boolean') errors.push(`artifact_outputs.destinations.${id}.enabled must be boolean`);
    if (destination.use_when !== undefined && !['disabled', 'user-requested', 'project-default'].includes(destination.use_when)) errors.push(`artifact_outputs.destinations.${id}.use_when is invalid`);
  }
  return errors;
}

export function resolveArtifactOutputs(options: ResolveArtifactOutputOptions): ArtifactOutputSelection {
  const project = { ...defaultArtifactOutputs(), ...(options.project ?? {}) };
  const supported = new Set(options.supportedDestinations ?? []);
  const presentations: string[] = [];
  const authority: ArtifactOutputSelection['authority'] = {};
  const diagnostics: string[] = [];
  const explicit = new Set(options.explicitDestinations ?? []);
  const candidateAuthority = new Map<string, ArtifactOutputAuthority>();
  for (const id of options.providerDefaults ?? []) candidateAuthority.set(id, 'provider-default');
  if (project.provider_native === 'project-default') {
    for (const [id, destination] of Object.entries(project.destinations ?? {})) {
      if (destination.use_when === 'project-default') candidateAuthority.set(id, 'project-default');
    }
  }
  if (options.userPreference?.provider_native === 'project-default') {
    for (const [id, destination] of Object.entries(options.userPreference.destinations ?? {})) {
      if (destination.enabled !== false && destination.use_when === 'project-default') candidateAuthority.set(id, 'user-preference');
    }
  }
  for (const id of explicit) candidateAuthority.set(id, 'explicit-task');
  const candidates = candidateAuthority.keys();
  for (const id of candidates) {
    if (!supported.has(id)) {
      diagnostics.push(`Destination '${id}' is unknown or unsupported and was not selected.`);
      continue;
    }
    const policy = project.destinations?.[id];
    if (project.provider_native === 'disabled' || policy?.enabled === false || policy?.use_when === 'disabled') {
      diagnostics.push(`Destination '${id}' is disabled by project policy.`);
      continue;
    }
    const selectedBy = candidateAuthority.get(id)!;
    if (selectedBy === 'explicit-task') {
      presentations.push(id);
      authority[id] = 'explicit-task';
      continue;
    }
    if (project.provider_native === 'project-default' && policy?.use_when === 'project-default') {
      presentations.push(id);
      authority[id] = selectedBy;
      continue;
    }
    diagnostics.push(`Destination '${id}' requires an explicit per-task request; provider and user defaults cannot select it.`);
  }
  return { canonical: 'aiwg', presentations: [...new Set(presentations)].sort(), authority, diagnostics };
}

export interface ArtifactOutputProvenanceRecord {
  schemaVersion: 'aiwg.artifact-output-provenance.v1';
  canonicalPath: string;
  presentationDestination: string;
  presentationReference: string;
  authority: ArtifactOutputAuthority;
  createdAt: string;
}

export async function recordArtifactOutputProvenance(artifactRoot: string, record: Omit<ArtifactOutputProvenanceRecord, 'schemaVersion' | 'createdAt'>): Promise<string> {
  const path = join(artifactRoot, 'provenance', 'artifact-outputs.jsonl');
  await mkdir(dirname(path), { recursive: true });
  const value: ArtifactOutputProvenanceRecord = { schemaVersion: 'aiwg.artifact-output-provenance.v1', createdAt: new Date().toISOString(), ...record };
  await appendFile(path, `${JSON.stringify(value)}\n`, 'utf8');
  return path;
}
