/**
 * Provider Adapter Base Class for External Ralph Loop
 *
 * Defines the interface that all CLI provider adapters must implement.
 * Each adapter wraps a specific agentic coding CLI (claude, codex, etc.)
 * and handles binary resolution, argument construction, model mapping,
 * and output parsing.
 *
 * @implements Plan: Multi-Provider Support for External Ralph Loop
 */

import { spawn, spawnSync } from 'child_process';

/**
 * @typedef {Object} ProviderCapabilities
 * @property {boolean} streamJson - Supports --output-format stream-json
 * @property {boolean} sessionResume - Supports --session-id for resumption
 * @property {boolean} budgetControl - Supports --max-budget-usd
 * @property {boolean} systemPrompt - Supports --append-system-prompt
 * @property {boolean} agentMode - Supports --agent flag
 * @property {boolean} mcpConfig - Supports --mcp-config
 * @property {boolean} maxTurns - Supports --max-turns
 */

/**
 * @typedef {Object} SessionArgs
 * @property {string} prompt - The prompt to send
 * @property {string} [sessionId] - Session UUID for tracking
 * @property {string} [model] - Model name (generic: opus/sonnet/haiku)
 * @property {number} [budget] - Budget per iteration in USD
 * @property {number} [maxTurns] - Maximum turns
 * @property {boolean} [verbose] - Enable verbose output
 * @property {string} [systemPrompt] - System prompt to append
 * @property {Object} [mcpConfig] - MCP server configuration
 */

/**
 * @typedef {Object} AnalysisArgs
 * @property {string} prompt - The analysis prompt
 * @property {string} [model] - Model name (generic: opus/sonnet/haiku)
 * @property {string} [agent] - Agent name to use
 * @property {number} [timeout] - Timeout in ms
 */

/**
 * Base class for provider adapters.
 * Subclasses must override all methods that throw NotImplementedError.
 */
export class ProviderAdapter {
  constructor() {
    if (new.target === ProviderAdapter) {
      throw new Error('ProviderAdapter is abstract and cannot be instantiated directly');
    }
  }

  /**
   * Get the CLI binary name (e.g., 'claude', 'codex')
   * @returns {string}
   */
  getBinary() {
    throw new Error('Not implemented: getBinary()');
  }

  /**
   * Get the provider name for display and config
   * @returns {string}
   */
  getName() {
    throw new Error('Not implemented: getName()');
  }

  /**
   * Get provider capabilities
   * @returns {ProviderCapabilities}
   */
  getCapabilities() {
    throw new Error('Not implemented: getCapabilities()');
  }

  /**
   * Build CLI arguments for a main headless session (async spawn).
   * This is the primary long-running session that performs the task.
   *
   * @param {SessionArgs} options
   * @returns {string[]}
   */
  buildSessionArgs(options) {
    throw new Error('Not implemented: buildSessionArgs()');
  }

  /**
   * Build CLI arguments for a short analysis call (spawnSync).
   * Used by OutputAnalyzer, StateAssessor, and ClaudePromptGenerator
   * for quick Claude-powered analysis between iterations.
   *
   * @param {AnalysisArgs} options
   * @returns {string[]}
   */
  buildAnalysisArgs(options) {
    throw new Error('Not implemented: buildAnalysisArgs()');
  }

  /**
   * Map generic model names (opus/sonnet/haiku) to provider-specific models.
   *
   * @param {string} genericModel - Generic model name
   * @returns {string} Provider-specific model name
   */
  mapModel(genericModel) {
    throw new Error('Not implemented: mapModel()');
  }

  /**
   * Check if the provider CLI is available on the system.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return new Promise((resolve) => {
      const child = spawn(this.getBinary(), ['--version'], {
        stdio: 'pipe',
      });
      child.on('close', (code) => resolve(code === 0));
      child.on('error', () => resolve(false));
    });
  }

  /**
   * Get the provider CLI version string.
   * @returns {Promise<string|null>}
   */
  async getVersion() {
    return new Promise((resolve) => {
      let output = '';
      const child = spawn(this.getBinary(), ['--version'], {
        stdio: 'pipe',
      });
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.on('close', (code) => {
        resolve(code === 0 ? output.trim() : null);
      });
      child.on('error', () => resolve(null));
    });
  }

  /**
   * Parse provider-specific output to extract JSON.
   * Default implementation extracts the first JSON object from stdout.
   *
   * @param {string} stdout - Raw stdout from the CLI
   * @returns {Object|null} Parsed JSON object or null
   */
  parseOutput(stdout) {
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }

  /**
   * Get environment variable overrides for headless mode.
   * @returns {Object<string, string>}
   */
  getEnvOverrides() {
    return {};
  }

  /**
   * Get the path where the provider stores session transcripts.
   *
   * @param {string} sessionId - Session UUID
   * @param {string} workingDir - Working directory path
   * @returns {string|null} Path to transcript file, or null if not supported
   */
  getTranscriptPath(sessionId, workingDir) {
    return null;
  }

  /**
   * Check if a capability is supported, and optionally log a warning.
   *
   * @param {string} capability - Capability name from ProviderCapabilities
   * @param {string} [context] - Context for the warning message
   * @returns {boolean}
   */
  hasCapability(capability) {
    const caps = this.getCapabilities();
    return !!caps[capability];
  }

  /**
   * Log a capability warning when a feature is not supported.
   *
   * @param {string} capability - Capability name
   * @param {string} feature - Human-readable feature description
   */
  warnUnsupported(capability, feature) {
    if (!this.hasCapability(capability)) {
      console.warn(
        `[${this.getName()}] Warning: ${feature} not supported by this provider, skipping`
      );
    }
  }
}

// ============================================================================
// Provider Registry & Factory
// ============================================================================

/** @type {Map<string, () => ProviderAdapter>} */
const providerRegistry = new Map();

/**
 * Register a provider adapter factory.
 *
 * @param {string} name - Provider name (e.g., 'claude', 'codex')
 * @param {() => ProviderAdapter} factory - Factory function
 */
export function registerProvider(name, factory) {
  providerRegistry.set(name.toLowerCase(), factory);
}

/**
 * Create a provider adapter by name.
 *
 * @param {string} name - Provider name (e.g., 'claude', 'codex')
 * @returns {ProviderAdapter}
 * @throws {Error} If provider is not registered
 */
export function createProvider(name) {
  const factory = providerRegistry.get(name.toLowerCase());
  if (!factory) {
    const available = Array.from(providerRegistry.keys()).join(', ');
    throw new Error(
      `Unknown provider: "${name}". Available providers: ${available}`
    );
  }
  return factory();
}

/**
 * List all registered provider names.
 * @returns {string[]}
 */
export function listProviders() {
  return Array.from(providerRegistry.keys());
}

/**
 * Check if a provider is registered.
 * @param {string} name
 * @returns {boolean}
 */
export function hasProvider(name) {
  return providerRegistry.has(name.toLowerCase());
}

// ============================================================================
// Auto-register built-in providers on import
// ============================================================================

// Lazy imports to avoid circular dependencies - adapters register themselves
// when their modules are loaded. We trigger that here.
async function registerBuiltinProviders() {
  try {
    await import('./claude-adapter.mjs');
  } catch { /* ignore if not found */ }
  try {
    await import('./codex-adapter.mjs');
  } catch { /* ignore if not found */ }
}

// Run registration — store promise so callers can await it
const _registrationPromise = registerBuiltinProviders();

/**
 * Ensure all built-in providers are registered before use.
 * Must be awaited before calling createProvider().
 */
export async function ensureProvidersRegistered() {
  await _registrationPromise;
}

export default ProviderAdapter;
