import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import { loadCapabilityMatrix } from '../../../src/providers/capability-matrix.js';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');

/**
 * Regression coverage for #1668 — Codex interactive-question guidance.
 *
 * Codex's agent-initiated `request_user_input` is gated by the
 * `default_mode_request_user_input` feature flag (off by default), so AIWG
 * guidance and the capability matrix must reflect the mode-gating accurately
 * rather than claiming an unverified `ask` tool.
 */
describe('native-ux interaction guidance (#1668)', () => {
  describe('capability matrix interaction block', () => {
    const matrix = loadCapabilityMatrix();

    it('marks Claude Code structured questions as native', () => {
      const claude = matrix.providers['claude-code'];
      expect(claude.interaction?.structured_questions).toBe('native');
      expect(claude.interaction?.tool).toBe('AskUserQuestion');
    });

    it('marks Codex structured questions as mode-gated and off by default', () => {
      const codex = matrix.providers['codex'];
      expect(codex.interaction?.structured_questions).toBe('mode_gated');
      expect(codex.interaction?.tool).toBe('request_user_input');
      expect(codex.interaction?.feature_flag).toBe('default_mode_request_user_input');
      expect(codex.interaction?.default_available).toBe(false);
      expect(codex.interaction?.mcp_elicitation).toBe('stable');
      expect(codex.interaction?.fallback).toBe('markdown');
    });
  });

  describe('native-ux-tools rule', () => {
    const rule = readFileSync(
      resolve(
        repoRoot,
        'agentic/code/addons/aiwg-utils/rules/native-ux-tools.md',
      ),
      'utf-8',
    );

    it('no longer claims an unverified Codex "ask" tool', () => {
      expect(rule).not.toMatch(/`ask`\s*\(research needed\)/);
    });

    it('documents the Codex mechanisms and mode-gating', () => {
      expect(rule).toContain('request_user_input');
      expect(rule).toContain('default_mode_request_user_input');
      expect(rule).toContain('tool_call_mcp_elicitation');
      // The root cause must be stated for Default-mode sessions.
      expect(rule).toMatch(/Default mode/i);
    });

    it('keeps markdown as the documented Codex fallback', () => {
      expect(rule).toMatch(/markdown/i);
    });
  });
});
