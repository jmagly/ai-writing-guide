/**
 * Contributor Discovery — Public API
 *
 * @architecture @.aiwg/architecture/decisions/ADR-023-contributor-discovery-convention.md
 * @issue #938
 */

export type {
  ContributorBase,
  ContributorKind,
  ContributorOrigin,
  ContributorRecord,
  DetectionSpec,
  DiscoveryResult,
  SkippedContributor,
  SkipReason,
} from './types.js';

export { discoverContributors } from './discover.js';
export { runDetection, isInUse } from './detect.js';
export { inferProjectType } from './heuristic.js';
export type { HeuristicDimension, HeuristicDimensionKind, HeuristicReport } from './heuristic.js';
export {
  StatusContributorSchema,
  ResearchContributorSchema,
  getSchemaForKind,
  getRegisteredKinds,
  validateContributor,
} from './validation.js';
