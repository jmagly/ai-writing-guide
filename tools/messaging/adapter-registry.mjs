/**
 * Lazy-loading adapter registry for messaging platforms.
 *
 * Discovers and instantiates platform adapters based on environment
 * configuration. Adapters are only loaded when their platform is enabled.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

/**
 * @typedef {Object} AdapterEntry
 * @property {string} name
 * @property {string} modulePath
 * @property {string} envCheck - Environment variable that enables this adapter
 * @property {import('./adapters/base.mjs').BaseAdapter|null} instance
 * @property {'pending'|'loading'|'ready'|'error'|'shutdown'} status
 * @property {string|null} error
 */

/** @type {Map<string, AdapterEntry>} */
const ADAPTER_REGISTRY = new Map();

// Register known adapters
const KNOWN_ADAPTERS = [
  {
    name: 'slack',
    modulePath: './adapters/slack.mjs',
    envCheck: 'AIWG_SLACK_WEBHOOK_URL',
  },
  {
    name: 'discord',
    modulePath: './adapters/discord.mjs',
    envCheck: 'AIWG_DISCORD_TOKEN',
  },
  {
    name: 'telegram',
    modulePath: './adapters/telegram.mjs',
    envCheck: 'AIWG_TELEGRAM_TOKEN',
  },
];

/**
 * Initialize the adapter registry with known adapters.
 * Does NOT load adapters — only registers them.
 */
export function initializeRegistry() {
  ADAPTER_REGISTRY.clear();
  for (const adapter of KNOWN_ADAPTERS) {
    ADAPTER_REGISTRY.set(adapter.name, {
      ...adapter,
      instance: null,
      status: 'pending',
      error: null,
    });
  }
}

/**
 * Discover which adapters are enabled based on environment variables.
 *
 * @returns {string[]} Names of enabled adapters
 */
export function discoverEnabledAdapters() {
  const enabled = [];
  for (const [name, entry] of ADAPTER_REGISTRY) {
    if (process.env[entry.envCheck]) {
      enabled.push(name);
    }
  }
  return enabled;
}

/**
 * Load and initialize a specific adapter.
 *
 * @param {string} name - Adapter name
 * @param {Object} config - Platform-specific configuration
 * @returns {Promise<import('./adapters/base.mjs').BaseAdapter>}
 */
export async function loadAdapter(name, config = {}) {
  const entry = ADAPTER_REGISTRY.get(name);
  if (!entry) {
    throw new Error(
      `Unknown adapter: "${name}". Available: ${[...ADAPTER_REGISTRY.keys()].join(', ')}`
    );
  }

  if (entry.instance && entry.status === 'ready') {
    return entry.instance;
  }

  entry.status = 'loading';

  try {
    const mod = await import(entry.modulePath);
    const AdapterClass = mod.default || mod[`${capitalize(name)}Adapter`];

    if (!AdapterClass) {
      throw new Error(`Adapter module "${entry.modulePath}" does not export a default or named adapter class`);
    }

    const instance = new AdapterClass(config);
    await instance.initialize();

    entry.instance = instance;
    entry.status = 'ready';
    entry.error = null;

    return instance;
  } catch (error) {
    entry.status = 'error';
    entry.error = error.message;
    throw error;
  }
}

/**
 * Load all enabled adapters.
 *
 * @param {Object} configs - Map of adapter name to config
 * @returns {Promise<Map<string, import('./adapters/base.mjs').BaseAdapter>>}
 */
export async function loadEnabledAdapters(configs = {}) {
  const enabled = discoverEnabledAdapters();
  const loaded = new Map();

  for (const name of enabled) {
    try {
      const adapter = await loadAdapter(name, configs[name] || {});
      loaded.set(name, adapter);
      console.log(`[AdapterRegistry] Loaded adapter: ${name}`);
    } catch (error) {
      console.error(`[AdapterRegistry] Failed to load adapter "${name}": ${error.message}`);
    }
  }

  if (loaded.size === 0 && enabled.length > 0) {
    console.warn('[AdapterRegistry] All enabled adapters failed to load');
  }

  return loaded;
}

/**
 * Get a loaded adapter instance.
 *
 * @param {string} name
 * @returns {import('./adapters/base.mjs').BaseAdapter|null}
 */
export function getAdapter(name) {
  const entry = ADAPTER_REGISTRY.get(name);
  return entry?.instance || null;
}

/**
 * Get status of all registered adapters.
 *
 * @returns {Array<{name: string, status: string, error: string|null, enabled: boolean}>}
 */
export function getRegistryStatus() {
  const statuses = [];
  for (const [name, entry] of ADAPTER_REGISTRY) {
    statuses.push({
      name,
      status: entry.status,
      error: entry.error,
      enabled: !!process.env[entry.envCheck],
    });
  }
  return statuses;
}

/**
 * Shutdown all loaded adapters.
 *
 * @returns {Promise<void>}
 */
export async function shutdownAll() {
  const shutdownPromises = [];

  for (const [name, entry] of ADAPTER_REGISTRY) {
    if (entry.instance && entry.status === 'ready') {
      shutdownPromises.push(
        entry.instance.shutdown()
          .then(() => {
            entry.status = 'shutdown';
            entry.instance = null;
            console.log(`[AdapterRegistry] Shutdown adapter: ${name}`);
          })
          .catch((error) => {
            entry.status = 'error';
            entry.error = error.message;
            console.error(`[AdapterRegistry] Error shutting down "${name}": ${error.message}`);
          })
      );
    }
  }

  await Promise.allSettled(shutdownPromises);
}

/**
 * Register a custom adapter (for plugins/extensions).
 *
 * @param {string} name
 * @param {string} modulePath
 * @param {string} envCheck
 */
export function registerAdapter(name, modulePath, envCheck) {
  if (ADAPTER_REGISTRY.has(name)) {
    throw new Error(`Adapter "${name}" is already registered`);
  }
  ADAPTER_REGISTRY.set(name, {
    name,
    modulePath,
    envCheck,
    instance: null,
    status: 'pending',
    error: null,
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Auto-initialize on import
initializeRegistry();
