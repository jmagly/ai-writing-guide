/**
 * Project AIWG artifact directory resolution.
 *
 * The public contract has long documented `AIWG_ARTIFACTS_PATH` as the
 * override for the project-local `.aiwg/` artifact root. Keep that contract
 * centralized so callers do not hardcode `<project>/.aiwg`.
 */

export {
  AIWG_ARTIFACTS_PATH_ENV,
  DEFAULT_PROJECT_AIWG_DIR,
  PROJECT_AIWG_LOCATION_FILE,
  expandProjectArtifactPath,
  parseProjectArtifactLocation,
  projectAiwgPath,
  readProjectArtifactLocation,
  resolveProjectAiwgDir,
} from './project-artifacts-runtime.mjs';
export type { ProjectArtifactEnv } from './project-artifacts-runtime.mjs';
