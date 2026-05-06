/**
 * Provider policy for AIWG.md and AGENTS.md emission.
 *
 * Per ADR-1 §3: AIWG.md + AGENTS.md emit by default for the seven providers
 * whose loaders consume an AGENTS.md (or close variant: Hermes `.hermes.md`,
 * Warp `WARP.md` twin). Claude Code is excluded because CLAUDE.md is its
 * native context file and continues unchanged. OpenClaw deploys to home
 * directory only and is similarly excluded from project-root context-file
 * emission.
 */

import type { Platform } from '../../agents/types.js';

/**
 * Providers that receive AIWG.md + AGENTS.md emission at project root.
 *
 * Sources kept in sync:
 * - ADR-1 §3 default-on rollout (`.aiwg/architecture/adr-agents-md-aggregation.md`)
 * - ADR-1 §4 per-provider variants table (file-name + twin-file emission)
 */
export const AGENTS_MD_PROVIDERS: ReadonlySet<Platform> = new Set([
  'codex',
  'cursor',
  'windsurf',
  'hermes',
  'warp',
  'factory',
  'opencode',
]);

export type AgentsMdProvider = Platform & ('codex' | 'cursor' | 'windsurf' | 'hermes' | 'warp' | 'factory' | 'opencode');

/**
 * Whether the context-pipeline should emit AIWG.md + AGENTS.md for a given
 * provider. Returns false for Claude Code (uses CLAUDE.md natively),
 * OpenClaw (home-dir-only deployment), and 'generic' (no specific provider).
 */
export function shouldEmitContextFiles(provider: Platform): boolean {
  return AGENTS_MD_PROVIDERS.has(provider);
}
