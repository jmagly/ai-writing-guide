import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  PROJECT_CONTROL_PLANE_FILES,
  auditProjectArtifactHealth,
} from '../config/project-artifacts.js';

export interface RepairProjectArtifactsOptions {
  projectDir: string;
  apply?: boolean;
}

export interface RepairProjectArtifactsResult {
  applied: boolean;
  before: ReturnType<typeof auditProjectArtifactHealth>;
  after: ReturnType<typeof auditProjectArtifactHealth>;
  copied: string[];
  removed: string[];
}

export async function repairProjectArtifacts(
  options: RepairProjectArtifactsOptions,
): Promise<RepairProjectArtifactsResult> {
  const projectDir = path.resolve(options.projectDir);
  const before = auditProjectArtifactHealth(projectDir);
  const copied: string[] = [];
  const removed: string[] = [];

  if (!before.external_configured) {
    throw new Error('No external AIWG artifact corpus is configured for this project.');
  }
  if (!before.external_reachable) {
    throw new Error(`External AIWG artifact corpus is unavailable: ${before.artifact_root}`);
  }
  if (before.divergent_control_files.length || before.divergent_local_corpus_files.length) {
    throw new Error(
      `Automatic repair refused because local and external content diverges: ${[
        ...before.divergent_control_files,
        ...before.divergent_local_corpus_files,
      ].join(', ')}`,
    );
  }

  for (const relativePath of before.missing_local_control_files) {
    const source = path.join(before.artifact_root, relativePath);
    if (!PROJECT_CONTROL_PLANE_FILES.includes(relativePath) || !before.control_files.find((item) => item.file === relativePath)?.external) {
      throw new Error(`Cannot restore missing local control-plane file from the external corpus: ${relativePath}`);
    }
    copied.push(relativePath);
    if (options.apply) {
      const destination = path.join(before.local_control_root, relativePath);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, await readFile(source));
    }
  }

  for (const relativePath of before.duplicated_local_corpus_files) {
    removed.push(relativePath);
    if (options.apply) {
      await rm(path.join(before.local_control_root, relativePath), { force: false });
    }
  }

  return {
    applied: options.apply === true,
    before,
    after: options.apply ? auditProjectArtifactHealth(projectDir) : before,
    copied,
    removed,
  };
}
