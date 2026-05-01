/**
 * DaemonBehaviorLoader — discovers, loads, and activates daemon behaviors.
 *
 * Behaviors are BEHAVIOR.md (or .behavior.md) files with YAML frontmatter.
 * The canonical shape (per #1025) nests behavior fields under `metadata:`:
 *
 *   ---
 *   name: my-behavior
 *   module: tools/daemon/my-behavior/orchestrator.mjs
 *   metadata:
 *     scope: daemon
 *     triggers: [session-start, pre-response, on-error, chat-message]
 *   ---
 *
 * - `name` and `module` stay at top level.
 * - `scope` and `triggers` (plural) live inside `metadata:` so they share
 *   shape with the validator (see src/plugin/metadata-validator.ts:604).
 *
 * The module must export a class with a standard interface:
 *   - constructor(options)     — receives { supervisor, memoryManager, provider, config }
 *   - onSessionStart(ctx)      — called on session-start trigger (optional)
 *   - handleMessage(msg, ctx)  — called on chat-message trigger (optional)
 *   - translateResponse(raw)   — called on pre-response trigger (optional)
 *   - onError(error, ctx)      — called on on-error trigger (optional)
 *   - getStatus()              — returns status object for IPC (optional)
 *
 * Discovery tiers (later overrides earlier):
 *   1. agentic/code/addons/\*\/behaviors/  — addon-shipped
 *   2. .aiwg/behaviors/                   — project-local
 *
 * @issue #642
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';

export class DaemonBehaviorLoader {
  /**
   * @param {Object} options
   * @param {string} options.projectRoot   Project root directory
   * @param {Object} options.supervisor    AgentSupervisor instance
   * @param {Object} [options.memoryManager]  MemoryManager instance
   * @param {string} [options.provider]    Current provider key
   * @param {Object} [options.config]      Daemon config accessor
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.supervisor = options.supervisor;
    this.memoryManager = options.memoryManager || null;
    this.provider = options.provider || null;
    this.config = options.config || null;

    /** @type {Map<string, LoadedBehavior>} */
    this._active = new Map();
  }

  /**
   * Discover all .behavior.md files across addon and project tiers.
   * @returns {Promise<DiscoveredBehavior[]>}
   */
  async discover() {
    const discovered = [];

    // Tier 1: addon behaviors
    const addonsDir = join(this.projectRoot, 'agentic', 'code', 'addons');
    try {
      const addons = await readdir(addonsDir);
      for (const addon of addons) {
        const behaviorsDir = join(addonsDir, addon, 'behaviors');
        try {
          const files = await readdir(behaviorsDir);
          for (const file of files.filter(f => f.endsWith('.behavior.md'))) {
            discovered.push({ tier: 'addon', addon, path: join(behaviorsDir, file), file });
          }
        } catch { /* no behaviors dir — skip */ }
      }
    } catch { /* no addons dir — skip */ }

    // Tier 2: project-local behaviors (override addon)
    const projectBehaviors = join(this.projectRoot, '.aiwg', 'behaviors');
    try {
      const files = await readdir(projectBehaviors);
      for (const file of files.filter(f => f.endsWith('.behavior.md'))) {
        discovered.push({ tier: 'project', addon: null, path: join(projectBehaviors, file), file });
      }
    } catch { /* no project behaviors — skip */ }

    return discovered;
  }

  /**
   * Parse YAML frontmatter from a BEHAVIOR.md file.
   *
   * Uses js-yaml for full YAML support, including nested mappings —
   * required for the canonical metadata.* shape (#1025).
   *
   * @param {string} filePath
   * @returns {Promise<Object|null>}
   */
  async parseFrontmatter(filePath) {
    const content = await readFile(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    let parsed;
    try {
      parsed = yaml.load(match[1]);
    } catch {
      return null;
    }
    return (parsed && typeof parsed === 'object') ? parsed : null;
  }

  /**
   * Load and activate all discovered daemon-scoped behaviors.
   * @returns {Promise<Map<string, LoadedBehavior>>}
   */
  async loadAll() {
    const discovered = await this.discover();

    // Group by name — later tiers override earlier
    const byName = new Map();
    for (const entry of discovered) {
      try {
        const meta = await this.parseFrontmatter(entry.path);
        if (!meta || meta.metadata?.scope !== 'daemon') continue;
        if (!meta.name) continue;
        if (!meta.module) {
          // No module = prompt-only behavior (no orchestrator to load)
          continue;
        }
        byName.set(meta.name, { ...entry, meta });
      } catch (err) {
        // Skip unparseable behaviors
      }
    }

    // Activate each behavior
    for (const [name, entry] of byName) {
      try {
        const orchestrator = await this._activate(entry);
        if (orchestrator) {
          this._active.set(name, {
            name,
            meta: entry.meta,
            orchestrator,
            path: entry.path,
            tier: entry.tier,
          });
        }
      } catch (err) {
        // Non-fatal — log but continue
        console.warn(`Behavior '${name}' activation failed: ${err.message}`);
      }
    }

    return this._active;
  }

  /**
   * Dynamically import and instantiate a behavior's orchestrator module.
   * @param {Object} entry  Discovered behavior entry with meta
   * @returns {Promise<Object|null>}
   */
  async _activate(entry) {
    const modulePath = entry.meta.module;

    // Resolve module path relative to project root
    const resolved = resolve(this.projectRoot, modulePath);
    const mod = await import(resolved);

    // Find the exported class — look for default export or first class export
    const OrchestratorClass = mod.default || Object.values(mod).find(v => typeof v === 'function');
    if (!OrchestratorClass) {
      throw new Error(`No class exported from ${modulePath}`);
    }

    return new OrchestratorClass({
      supervisor: this.supervisor,
      memoryManager: this.memoryManager,
      provider: this.provider,
      config: this.config,
      behaviorMeta: entry.meta,
    });
  }

  /**
   * Hot-apply a behavior by name — discovers it on disk and activates it.
   * If a behavior with the same name is already active, it is replaced.
   *
   * @param {string} name  Behavior name to apply
   * @returns {Promise<{applied: boolean, name: string}>}
   * @throws {Error} If the behavior is not found in any discovery tier
   */
  async apply(name) {
    // Discover all available behaviors
    const discovered = await this.discover();

    // Find matching entry by name
    let matchedEntry = null;
    for (const entry of discovered) {
      try {
        const meta = await this.parseFrontmatter(entry.path);
        if (!meta || meta.metadata?.scope !== 'daemon') continue;
        if (!meta.name || meta.name !== name) continue;
        if (!meta.module) continue;
        matchedEntry = { ...entry, meta };
        break;
      } catch { /* skip */ }
    }

    if (!matchedEntry) {
      throw new Error(`Behavior '${name}' not found or is not a daemon-scoped behavior with a module`);
    }

    // Deactivate existing instance if present
    this._active.delete(name);

    // Activate the new instance
    const orchestrator = await this._activate(matchedEntry);
    if (!orchestrator) {
      throw new Error(`Behavior '${name}' activation returned null`);
    }

    this._active.set(name, {
      name,
      meta: matchedEntry.meta,
      orchestrator,
      path: matchedEntry.path,
      tier: matchedEntry.tier,
    });

    return { applied: true, name };
  }

  /**
   * Remove an active behavior by name.
   * If the orchestrator exposes a `deactivate()` method, it is called first.
   *
   * @param {string} name  Behavior name to remove
   * @returns {{ removed: boolean, name: string }}
   */
  remove(name) {
    const loaded = this._active.get(name);
    if (!loaded) {
      return { removed: false, name };
    }

    // Call optional cleanup hook
    try {
      if (typeof loaded.orchestrator.deactivate === 'function') {
        loaded.orchestrator.deactivate();
      }
    } catch { /* non-fatal */ }

    this._active.delete(name);
    return { removed: true, name };
  }

  /**
   * Get the active behavior orchestrator for a given trigger type.
   * Returns all behaviors that declare this trigger.
   * @param {string} trigger  e.g. 'chat-message', 'session-start', 'pre-response', 'on-error'
   * @returns {Object[]}  Array of orchestrator instances
   */
  getForTrigger(trigger) {
    const result = [];
    for (const [, loaded] of this._active) {
      const triggers = loaded.meta.metadata?.triggers || [];
      if (triggers.includes(trigger)) {
        result.push(loaded.orchestrator);
      }
    }
    return result;
  }

  /**
   * Get a specific active behavior by name.
   * @param {string} name
   * @returns {Object|null}
   */
  get(name) {
    return this._active.get(name)?.orchestrator || null;
  }

  /**
   * Check if a behavior is active.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._active.has(name);
  }

  /** Get status summary for IPC/CLI. */
  getStatus() {
    return {
      active: Object.fromEntries(
        [...this._active].map(([name, loaded]) => [
          name,
          {
            triggers: loaded.meta.metadata?.triggers || [],
            module: loaded.meta.module,
            tier: loaded.tier,
            path: loaded.path,
            hasStatus: typeof loaded.orchestrator.getStatus === 'function',
          },
        ])
      ),
      count: this._active.size,
    };
  }
}

export default DaemonBehaviorLoader;
