/**
 * context-pipeline — AIWG.md and AGENTS.md generator.
 *
 * Implements the cross-platform context delivery pipeline defined in
 * `.aiwg/architecture/adr-agents-md-aggregation.md`. Emits two project-root files:
 *
 * - AIWG.md  — CLAUDE.md-shaped framework context for non-Claude providers
 * - AGENTS.md — link-indexed bridge file pointing at AIWG.md and at deployed artifacts
 *
 * Distinct from `agentsmith/`, which creates subagent personas. The two modules
 * answer different questions: agentsmith asks "what should this agent persona look
 * like?"; context-pipeline asks "what files are deployed and how should the
 * provider's loader find them?".
 *
 * @module smiths/context-pipeline
 */

export * from './types.js';
export {
  generate,
  buildAgentsMd,
  renderEntry,
  renderSection,
  isOverwriteSafe,
} from './generator.js';
export { sanitizeDescription, sanitizeTag, sanitizeTags } from './sanitizer.js';
export { checkPathAllowed } from './allowlist.js';
export {
  discoverDeployedArtifacts,
  discoverSection,
  type DiscoveryPaths,
} from './discovery.js';
export {
  AGENTS_MD_PROVIDERS,
  shouldEmitContextFiles,
  type AgentsMdProvider,
} from './provider-policy.js';
export { generateAiwgMd } from './aiwg-md.js';
export {
  SOFT_WARN_BYTES,
  HARD_ERROR_BYTES,
  SPILLOVER_START,
  SPILLOVER_END,
  partitionForOverflow,
  injectSpilloverBlock,
  extractNonSpillover,
  SafetyCriticalOverflowError,
  type OverflowPriorityMap,
} from './overflow.js';
