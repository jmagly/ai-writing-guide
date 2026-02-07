/**
 * Codex CLI Provider Adapter for External Ralph Loop
 *
 * Provides support for OpenAI's Codex CLI as a provider for
 * autonomous task execution in Ralph loops.
 *
 * Codex CLI differences from Claude:
 * - Binary: `codex` instead of `claude`
 * - Headless flag: `--full-auto` instead of `--dangerously-skip-permissions`
 * - No stream-json output format (text only)
 * - No session resume capability
 * - No --agent flag
 * - No --mcp-config flag
 * - No --append-system-prompt flag (inject into main prompt)
 * - No --max-budget-usd flag
 * - Model names differ (gpt-5.3-codex, codex-mini-latest, gpt-5-codex-mini)
 *
 * @implements Plan: Multi-Provider Support for External Ralph Loop
 */

import { ProviderAdapter, registerProvider } from './provider-adapter.mjs';

/** Model mapping from generic names to Codex-specific models */
const MODEL_MAP = {
  'opus': 'gpt-5.3-codex',
  'sonnet': 'codex-mini-latest',
  'haiku': 'gpt-5-codex-mini',
};

export class CodexAdapter extends ProviderAdapter {
  /** @returns {string} */
  getBinary() {
    return 'codex';
  }

  /** @returns {string} */
  getName() {
    return 'codex';
  }

  /**
   * Codex has limited capabilities compared to Claude.
   * @returns {import('./provider-adapter.mjs').ProviderCapabilities}
   */
  getCapabilities() {
    return {
      streamJson: false,
      sessionResume: false,
      budgetControl: false,
      systemPrompt: false,
      agentMode: false,
      mcpConfig: false,
      maxTurns: false,
    };
  }

  /**
   * Build args for the main headless session.
   *
   * Codex uses `--full-auto` for headless operation and has a different
   * argument structure than Claude.
   *
   * @param {import('./provider-adapter.mjs').SessionArgs} options
   * @returns {string[]}
   */
  buildSessionArgs(options) {
    const args = [
      // SECURITY: --full-auto bypasses ALL permission prompts in Codex
      // Equivalent to Claude's --dangerously-skip-permissions
      '--full-auto',
    ];

    // Model selection (map generic to Codex-specific)
    if (options.model) {
      args.push('--model', this.mapModel(options.model));
    }

    // Budget control not supported - warn if requested
    if (options.budget) {
      this.warnUnsupported('budgetControl', 'Budget control (--max-budget-usd)');
    }

    // Max turns not supported
    if (options.maxTurns) {
      this.warnUnsupported('maxTurns', 'Max turns (--max-turns)');
    }

    // Session ID not supported - each iteration is a fresh session
    if (options.sessionId) {
      this.warnUnsupported('sessionResume', 'Session resume (--session-id)');
    }

    // MCP configuration not supported
    if (options.mcpConfig) {
      this.warnUnsupported('mcpConfig', 'MCP configuration (--mcp-config)');
    }

    // System prompt: Codex doesn't support --append-system-prompt,
    // so we prepend it to the main prompt
    let prompt = options.prompt;
    if (options.systemPrompt) {
      prompt = `[System Context]\n${options.systemPrompt}\n\n[Task]\n${prompt}`;
    }

    // The prompt itself (must be last)
    args.push(prompt);

    return args;
  }

  /**
   * Build args for short analysis calls (spawnSync).
   *
   * Codex analysis calls use the same basic pattern but with
   * Codex-specific flags.
   *
   * @param {import('./provider-adapter.mjs').AnalysisArgs} options
   * @returns {string[]}
   */
  buildAnalysisArgs(options) {
    const args = [
      '--full-auto',
      '--quiet',
    ];

    // Model selection
    if (options.model) {
      args.push('--model', this.mapModel(options.model));
    }

    // Agent flag not supported by Codex - inject agent context into prompt
    if (options.agent) {
      // Silently skip - agent context will be in the prompt itself
    }

    // The analysis prompt (must be last)
    args.push(options.prompt);

    return args;
  }

  /**
   * Map generic model names to Codex-specific models.
   *
   * Uses the same mapping as tools/agents/providers/codex.mjs:
   *   opus → gpt-5.3-codex
   *   sonnet → codex-mini-latest
   *   haiku → gpt-5-codex-mini
   *
   * @param {string} genericModel
   * @returns {string}
   */
  mapModel(genericModel) {
    const mapped = MODEL_MAP[genericModel.toLowerCase()];
    if (mapped) return mapped;
    // Pass through if already a Codex model name or unknown
    return genericModel;
  }

  /**
   * Environment overrides for headless Codex sessions.
   * @returns {Object<string, string>}
   */
  getEnvOverrides() {
    return {
      CI: 'true',
    };
  }

  /**
   * Codex does not store session transcripts in a known location.
   * @returns {null}
   */
  getTranscriptPath() {
    return null;
  }

  /**
   * Parse Codex output - Codex returns plain text, not stream-json.
   * We still try to extract JSON from the output for analysis results.
   *
   * @param {string} stdout
   * @returns {Object|null}
   */
  parseOutput(stdout) {
    // Codex output is plain text. Try to find embedded JSON.
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
}

// Self-register on import
registerProvider('codex', () => new CodexAdapter());

export default CodexAdapter;
