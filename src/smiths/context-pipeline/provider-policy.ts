/**
 * Provider policy for AIWG.md, AGENTS.md, and CLAUDE.md hook emission.
 *
 * Per ADR-1 §3: AIWG.md is the cross-provider context entry point. Most
 * providers reach it through AGENTS.md or a provider-native twin file
 * (Hermes `.hermes.md`, Warp `WARP.md`). Claude Code reaches it through
 * `CLAUDE.md` containing a `@AIWG.md` include — same pipeline, different
 * link mechanism.
 *
 * Previous design (pre-#1437) bailed out entirely for the claude provider
 * with the misleading rationale "claude uses CLAUDE.md natively." That
 * conflated two facts: claude DOES read CLAUDE.md without aiwg-side
 * wiring, but regenerate STILL needs to refresh AIWG.md and ensure the
 * `@AIWG.md` link is present in CLAUDE.md. The fix splits the policy
 * into three granular gates so each provider gets exactly what it needs.
 *
 * @issue #1437
 */

import type { Platform } from '../../agents/types.js';

/**
 * Providers that receive AGENTS.md emission at project root.
 *
 * Sources kept in sync:
 * - ADR-1 §3 default-on rollout (`.aiwg/architecture/adr-agents-md-aggregation.md`)
 * - ADR-1 §4 per-provider variants table (file-name + twin-file emission)
 */
export const AGENTS_MD_PROVIDERS: ReadonlySet<Platform> = new Set([
  'codex',
  'copilot',
  'cursor',
  'windsurf',
  'hermes',
  'warp',
  'factory',
  'opencode',
]);

export type AgentsMdProvider = Platform & ('codex' | 'copilot' | 'cursor' | 'windsurf' | 'hermes' | 'warp' | 'factory' | 'opencode');

/**
 * Whether the context-pipeline has ANY work to do for this provider.
 * Returns false only for providers that have no project-local context
 * footprint: OpenClaw/OpenHuman (home-dir-only) and 'generic' (no specific provider).
 *
 * Claude returns TRUE — it needs AIWG.md + a CLAUDE.md hook update.
 */
export function shouldEmitContextFiles(provider: Platform): boolean {
  return shouldEmitAiwgMd(provider) || shouldEmitClaudeMdHook(provider);
}

/**
 * Whether to emit AIWG.md at project root. True for every project-local
 * provider; false only for home-dir-only providers and 'generic'.
 */
export function shouldEmitAiwgMd(provider: Platform): boolean {
  return provider !== 'openclaw' && provider !== 'openhuman' && provider !== 'generic';
}

/**
 * Whether to emit AGENTS.md at project root. True for the AGENTS-MD
 * provider set (codex, copilot, cursor, windsurf, hermes, warp, factory,
 * opencode). False for claude (uses CLAUDE.md hook instead), openclaw,
 * and generic.
 */
export function shouldEmitAgentsMd(provider: Platform): boolean {
  return AGENTS_MD_PROVIDERS.has(provider);
}

/**
 * Whether to ensure the CLAUDE.md `@AIWG.md` hook is present. True only
 * for the claude provider. CLAUDE.md gets a managed marker block with an
 * `@AIWG.md` include; operator content outside the block is preserved.
 */
export function shouldEmitClaudeMdHook(provider: Platform): boolean {
  return provider === 'claude';
}
