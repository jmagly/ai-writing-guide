/**
 * Skills Registry Coordinator
 *
 * Aggregates search results across multiple registry adapters
 * (local, clawhub, openclaw) into a unified interface.
 *
 * @implements #539
 */

import type {
  AgentSkillImportOptions,
  AgentSkillImportResult,
  AgentSkillImportSource,
  RegistryAdapter,
  SkillResult,
  SkillDetails,
  InstallOptions,
} from './types.js';
import { AgentSkillsAdapter } from './adapters/agent-skills.js';
import { LocalAdapter } from './adapters/local.js';
import { ClawHubAdapter } from './adapters/clawhub.js';
import { OpenClawAdapter } from './adapters/openclaw.js';

/**
 * All known registry adapters
 */
const ALL_ADAPTERS: RegistryAdapter[] = [
  new LocalAdapter(),
  new AgentSkillsAdapter(),
  new ClawHubAdapter(),
  new OpenClawAdapter(),
];

/**
 * Import a standard Agent Skills directory or pinned Git source.
 */
export async function importSkillSource(
  source: AgentSkillImportSource,
  options: AgentSkillImportOptions,
  providerId = 'agentskills',
): Promise<AgentSkillImportResult> {
  const adapter = getAdapter(providerId);
  if (!adapter) {
    throw new Error(`Unknown registry: ${providerId}`);
  }
  if (!adapter.importSource) {
    throw new Error(`Registry '${providerId}' does not support source import`);
  }
  const available = await adapter.isAvailable();
  if (!available) {
    throw new Error(`Registry '${providerId}' is not available`);
  }
  return adapter.importSource(source, options);
}

/**
 * Get adapter by ID
 */
export function getAdapter(id: string): RegistryAdapter | undefined {
  return ALL_ADAPTERS.find((a) => a.id === id);
}

/**
 * Get all registered adapters
 */
export function getAllAdapters(): RegistryAdapter[] {
  return ALL_ADAPTERS;
}

/**
 * Search across all adapters (or a specific one)
 */
export async function searchSkills(
  query: string,
  providerId?: string
): Promise<SkillResult[]> {
  const adapters = providerId
    ? ALL_ADAPTERS.filter((a) => a.id === providerId)
    : ALL_ADAPTERS;

  const results: SkillResult[] = [];

  for (const adapter of adapters) {
    const available = await adapter.isAvailable();
    if (!available) continue;

    const adapterResults = await adapter.search(query);
    results.push(...adapterResults);
  }

  return results;
}

/**
 * List all skills across adapters (or a specific one)
 */
export async function listSkills(
  providerId?: string
): Promise<SkillResult[]> {
  const adapters = providerId
    ? ALL_ADAPTERS.filter((a) => a.id === providerId)
    : ALL_ADAPTERS;

  const results: SkillResult[] = [];

  for (const adapter of adapters) {
    const available = await adapter.isAvailable();
    if (!available) continue;

    const adapterResults = await adapter.list();
    results.push(...adapterResults);
  }

  return results;
}

/**
 * Get detailed skill info (checks adapters in order)
 */
export async function getSkillInfo(
  name: string,
  providerId?: string
): Promise<SkillDetails | undefined> {
  const adapters = providerId
    ? ALL_ADAPTERS.filter((a) => a.id === providerId)
    : ALL_ADAPTERS;

  for (const adapter of adapters) {
    const available = await adapter.isAvailable();
    if (!available) continue;

    const info = await adapter.info(name);
    if (info) return info;
  }

  return undefined;
}

/**
 * Install a skill from a specific registry with cross-platform deployment
 */
export async function installSkill(
  name: string,
  options: InstallOptions,
  providerId: string
): Promise<void> {
  const adapter = getAdapter(providerId);
  if (!adapter) {
    throw new Error(`Unknown registry: ${providerId}`);
  }

  if (!adapter.install) {
    throw new Error(`Registry '${providerId}' does not support install`);
  }

  const available = await adapter.isAvailable();
  if (!available) {
    throw new Error(`Registry '${providerId}' is not available`);
  }

  await adapter.install(name, options);
}

/**
 * Publish a skill to a specific registry
 */
export async function publishSkill(
  packageDir: string,
  providerId: string
): Promise<void> {
  const adapter = getAdapter(providerId);
  if (!adapter) {
    throw new Error(`Unknown registry: ${providerId}`);
  }

  if (!adapter.publish) {
    throw new Error(`Registry '${providerId}' does not support publish`);
  }

  const available = await adapter.isAvailable();
  if (!available) {
    throw new Error(`Registry '${providerId}' is not available`);
  }

  await adapter.publish(packageDir);
}
