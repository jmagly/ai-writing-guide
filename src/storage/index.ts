/**
 * Storage Adapter Registry
 *
 * `resolveStorage(subsystem)` is the consumer-facing entry point. Loads
 * `.aiwg/storage.config` lazily, picks the configured backend per
 * subsystem, and memoizes the adapter instance for the lifetime of the
 * process.
 *
 * @design @.aiwg/architecture/storage-design.md
 * @issue #934
 * @issue #953
 */

import { loadStorageConfig, resolveSubsystemRoot } from './config.js';
import { FilesystemAdapter } from './backends/fs.js';
import { ObsidianAdapter } from './backends/obsidian.js';
import { LogseqAdapter } from './backends/logseq.js';
import { FortemiAdapter } from './backends/fortemi.js';
import type {
  BackendConfig,
  StorageAdapter,
  StorageConfig,
  SubsystemKey,
} from './types.js';

export {
  type StorageAdapter,
  type StorageEntry,
  type WriteMeta,
  type SubsystemKey,
  type BackendType,
  type BackendConfig,
  type StorageConfig,
  SUBSYSTEM_KEYS,
  BACKEND_TYPES,
} from './types.js';
export {
  loadStorageConfig,
  storageConfigPath,
  validateStorageConfig,
  resolveSubsystemRoot,
  walkRejectingCredentials,
  FORBIDDEN_CREDENTIAL_KEYS,
  DEFAULT_SUBSYSTEM_ROOTS,
} from './config.js';
export { FilesystemAdapter } from './backends/fs.js';
export { ObsidianAdapter } from './backends/obsidian.js';
export { LogseqAdapter } from './backends/logseq.js';
export { FortemiAdapter } from './backends/fortemi.js';
export type { McpClientLike, McpClientFactory, FortemiAdapterOptions } from './backends/fortemi.js';

interface RegistryState {
  projectRoot: string;
  config: StorageConfig | null;
  adapters: Map<SubsystemKey, StorageAdapter>;
  loaded: boolean;
}

let state: RegistryState | null = null;

/**
 * Initialize or reset the registry for a given project root. Most
 * callers use the implicit lazy initialization triggered by
 * `resolveStorage()`; explicit init is useful for tests and for the
 * `aiwg storage` CLI.
 */
export async function initStorage(projectRoot: string = process.cwd()): Promise<void> {
  const config = await loadStorageConfig(projectRoot);
  state = {
    projectRoot,
    config,
    adapters: new Map(),
    loaded: true,
  };
}

/** Reset memoized state. Test-only escape hatch. */
export function resetStorage(): void {
  state = null;
}

/**
 * Return the adapter for a subsystem. Loads `.aiwg/storage.config`
 * lazily on first call.
 */
export async function resolveStorage(subsystem: SubsystemKey): Promise<StorageAdapter> {
  if (!state || !state.loaded) {
    await initStorage(process.cwd());
  }
  const s = state!;
  const cached = s.adapters.get(subsystem);
  if (cached) return cached;

  const adapter = createAdapter(subsystem, s);
  s.adapters.set(subsystem, adapter);
  return adapter;
}

/**
 * Return the loaded config (or null if `.aiwg/storage.config` does not
 * exist). Triggers a load if not yet initialized. Used by the CLI.
 */
export async function getLoadedConfig(
  projectRoot: string = process.cwd()
): Promise<StorageConfig | null> {
  if (!state || state.projectRoot !== projectRoot) {
    await initStorage(projectRoot);
  }
  return state!.config;
}

/**
 * Build the adapter for a subsystem given the current registry state.
 * Pure factory — no I/O beyond the path resolution the backend itself
 * performs in its constructor.
 */
function createAdapter(subsystem: SubsystemKey, s: RegistryState): StorageAdapter {
  const backend: BackendConfig =
    s.config?.backends?.[subsystem] ?? { type: 'fs' };

  switch (backend.type) {
    case 'fs': {
      const root = resolveSubsystemRoot(subsystem, s.projectRoot, s.config);
      return new FilesystemAdapter(root);
    }
    case 'obsidian':
      return new ObsidianAdapter(backend);
    case 'logseq':
      return new LogseqAdapter(backend);
    case 'fortemi':
      return new FortemiAdapter({ subsystem, config: backend });
    case 'notion':
    case 'anythingllm':
    case 's3':
    case 'webdav': {
      const stubIssues: Record<'notion' | 'anythingllm' | 's3' | 'webdav', string> = {
        notion: '#959',
        anythingllm: '#960',
        s3: '#962',
        webdav: '#963',
      };
      throw new Error(
        `storage: backend "${backend.type}" is declared in storage.config but not yet implemented. ` +
          `Tracked at ${stubIssues[backend.type]} — see https://git.integrolabs.net/roctinam/aiwg/issues/${stubIssues[backend.type].slice(1)} for status.`
      );
    }
    default: {
      // Exhaustiveness check
      const _exhaustive: never = backend;
      throw new Error(`storage: unhandled backend type ${(_exhaustive as { type: string }).type}`);
    }
  }
}
