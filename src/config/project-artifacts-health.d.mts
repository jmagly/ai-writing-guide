export type ProjectArtifactHealthClassification =
  | 'local'
  | 'healthy-split-root'
  | 'degraded-offline'
  | 'legacy-missing-control-plane'
  | 'duplicated-identical'
  | 'duplicated-divergent';

export interface ProjectControlFileHealth {
  file: string;
  local: boolean;
  external: boolean;
  identical: boolean | null;
}

export interface ProjectArtifactHealth {
  classification: ProjectArtifactHealthClassification;
  severity: 'ok' | 'warning' | 'error';
  external_configured: boolean;
  source: { kind: string; key?: string; path?: string };
  local_control_root: string;
  artifact_root: string;
  external_reachable: boolean;
  control_files: ProjectControlFileHealth[];
  missing_local_control_files: string[];
  divergent_control_files: string[];
  duplicated_local_corpus_files: string[];
  divergent_local_corpus_files: string[];
  repairable: boolean;
  action: string | null;
}

export const PROJECT_CONTROL_PLANE_FILES: readonly string[];
export function auditProjectArtifactHealth(
  projectDir: string,
  env?: Record<string, string | undefined>,
): ProjectArtifactHealth;
