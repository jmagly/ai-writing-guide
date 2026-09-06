import { createHash } from 'node:crypto';
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
  migrated: string[];
  archivedConflicts: string[];
  removed: string[];
}

async function optionalBytes(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function writeAndVerify(destination: string, bytes: Buffer): Promise<void> {
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes, { flag: 'wx' });
  if (!(await readFile(destination)).equals(bytes)) {
    throw new Error(`Byte verification failed after copying artifact payload: ${destination}`);
  }
}

export async function repairProjectArtifacts(
  options: RepairProjectArtifactsOptions,
): Promise<RepairProjectArtifactsResult> {
  const projectDir = path.resolve(options.projectDir);
  const before = auditProjectArtifactHealth(projectDir);
  const copied: string[] = [];
  const migrated: string[] = [];
  const archivedConflicts: string[] = [];
  const removed: string[] = [];

  if (!before.external_configured) {
    throw new Error('No external AIWG artifact corpus is configured for this project.');
  }
  if (!before.external_reachable) {
    throw new Error(`External AIWG artifact corpus is unavailable: ${before.artifact_root}`);
  }
  if (before.divergent_control_files.length) {
    throw new Error(
      `Automatic repair refused because local and external control-plane content diverges: ${before.divergent_control_files.join(', ')}`,
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
    const localPath = path.join(before.local_control_root, relativePath);
    const externalPath = path.join(before.artifact_root, relativePath);
    const localBytes = await readFile(localPath);
    const externalBytes = await optionalBytes(externalPath);
    if (externalBytes === null) {
      migrated.push(relativePath);
      if (options.apply) await writeAndVerify(externalPath, localBytes);
    } else if (!externalBytes.equals(localBytes)) {
      const digest = createHash('sha256').update(localBytes).digest('hex').slice(0, 12);
      const archiveRelative = path.join('archive', 'local-corpus-migration', 'conflicts', 'local', `${relativePath}.${digest}`);
      archivedConflicts.push(archiveRelative.split(path.sep).join('/'));
      if (options.apply) {
        const archivePath = path.join(before.artifact_root, archiveRelative);
        const archived = await optionalBytes(archivePath);
        if (archived === null) await writeAndVerify(archivePath, localBytes);
        else if (!archived.equals(localBytes)) throw new Error(`Conflict archive path already contains different bytes: ${archivePath}`);
      }
    }
    removed.push(relativePath);
    if (options.apply) {
      const preservedPath = externalBytes === null
        ? externalPath
        : externalBytes.equals(localBytes)
          ? externalPath
          : path.join(before.artifact_root, archivedConflicts.at(-1)!);
      if (!(await readFile(preservedPath)).equals(localBytes)) {
        throw new Error(`Refusing to remove local payload before byte verification: ${relativePath}`);
      }
      await rm(localPath, { force: false });
    }
  }

  return {
    applied: options.apply === true,
    before,
    after: options.apply ? auditProjectArtifactHealth(projectDir) : before,
    copied,
    migrated,
    archivedConflicts,
    removed,
  };
}
