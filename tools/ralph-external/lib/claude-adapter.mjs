/**
 * Claude CLI Provider Adapter for External Ralph Loop
 *
 * Extracts existing Claude-specific spawn logic into the ProviderAdapter
 * interface. This adapter is the default and reproduces the exact behavior
 * of the pre-adapter codebase.
 *
 * @implements Plan: Multi-Provider Support for External Ralph Loop
 */

import { join } from 'path';
import { homedir } from 'os';
import { ProviderAdapter, registerProvider } from './provider-adapter.mjs';

export class ClaudeAdapter extends ProviderAdapter {
  /** @returns {string} */
  getBinary() {
    return 'claude';
  }

  /** @returns {string} */
  getName() {
    return 'claude';
  }

  /**
   * Claude supports all capabilities.
   * @returns {import('./provider-adapter.mjs').ProviderCapabilities}
   */
  getCapabilities() {
    return {
      streamJson: true,
      sessionResume: true,
      budgetControl: true,
      systemPrompt: true,
      agentMode: true,
      mcpConfig: true,
      maxTurns: true,
    };
  }

  /**
   * Build args for the main headless session (async spawn).
   *
   * Reproduces the exact argument construction from SessionLauncher.buildArgs().
   *
   * @param {import('./provider-adapter.mjs').SessionArgs} options
   * @returns {string[]}
   */
  buildSessionArgs(options) {
    const args = [
      // SECURITY: This flag bypasses ALL permission prompts
      // Required for headless operation but enables:
      // - Unrestricted file read/write
      // - Arbitrary command execution
      // - Network access without confirmation
      // See docs/ralph-external-security.md
      '--dangerously-skip-permissions',
      '--print',
      '--output-format', 'stream-json',
    ];

    // Session tracking
    if (options.sessionId) {
      args.push('--session-id', options.sessionId);
    }

    // Verbose mode
    if (options.verbose) {
      args.push('--verbose');
    }

    // Model selection (Claude passes through directly)
    if (options.model) {
      args.push('--model', this.mapModel(options.model));
    }

    // Budget control
    if (options.budget) {
      args.push('--max-budget-usd', String(options.budget));
    }

    // Max turns control
    if (options.maxTurns) {
      args.push('--max-turns', String(options.maxTurns));
    }

    // MCP configuration
    if (options.mcpConfig) {
      const configJson = typeof options.mcpConfig === 'string'
        ? options.mcpConfig
        : JSON.stringify(options.mcpConfig);
      args.push('--mcp-config', configJson);
    }

    // System prompt injection
    if (options.systemPrompt) {
      args.push('--append-system-prompt', options.systemPrompt);
    }

    // The prompt itself (must be last)
    args.push(options.prompt);

    return args;
  }

  /**
   * Build args for short analysis calls (spawnSync).
   *
   * Used by OutputAnalyzer, StateAssessor, and ClaudePromptGenerator.
   *
   * @param {import('./provider-adapter.mjs').AnalysisArgs} options
   * @returns {string[]}
   */
  buildAnalysisArgs(options) {
    const args = [
      '--dangerously-skip-permissions',
      '--print',
      '--output-format', 'json',
    ];

    // Model selection
    if (options.model) {
      args.push('--model', this.mapModel(options.model));
    }

    // Agent flag (for specialized analysis agents)
    if (options.agent) {
      args.push('--agent', options.agent);
    }

    // The analysis prompt (must be last)
    args.push(options.prompt);

    return args;
  }

  /**
   * Claude model names pass through directly.
   * opus/sonnet/haiku are native Claude model aliases.
   *
   * @param {string} genericModel
   * @returns {string}
   */
  mapModel(genericModel) {
    // Claude accepts opus, sonnet, haiku natively
    return genericModel;
  }

  /**
   * Environment overrides for headless Claude sessions.
   * @returns {Object<string, string>}
   */
  getEnvOverrides() {
    return {
      CI: 'true',
    };
  }

  /**
   * Get Claude session transcript path.
   *
   * Claude stores transcripts at:
   *   ~/.claude/projects/{encoded-path}/{session-id}.jsonl
   *
   * Path encoding: Replace `/` with `-`, prepend `-`
   * Example: /foo/bar → -foo-bar
   *
   * @param {string} sessionId
   * @param {string} workingDir
   * @returns {string}
   */
  getTranscriptPath(sessionId, workingDir) {
    const encodedPath = workingDir.replace(/\//g, '-');
    return join(
      homedir(),
      '.claude',
      'projects',
      encodedPath,
      `${sessionId}.jsonl`
    );
  }
}

// Self-register on import
registerProvider('claude', () => new ClaudeAdapter());

export default ClaudeAdapter;
