import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { moveProjectArtifacts } from '../../../src/artifacts/move.js';
import { PROJECT_AIWG_LOCATION_FILE, resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

describe('moveProjectArtifacts', () => {
  it('moves the artifact root, writes a pointer, updates gitignore, and rebuilds the project index', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifacts-move-'));
    const destination = join(projectDir, '..', `${basename(projectDir)}-private`, 'renamed-aiwg');
    try {
      mkdirSync(join(projectDir, '.aiwg', 'requirements'), { recursive: true });
      writeFileSync(join(projectDir, '.gitignore'), 'node_modules/\n', 'utf-8');
      writeFileSync(
        join(projectDir, '.aiwg', 'requirements', 'UC-001.md'),
        ['---', 'title: Authentication Requirement', 'type: use-case', 'phase: requirements', '---', '', '# Authentication Requirement', ''].join('\n'),
        'utf-8',
      );

      const result = await moveProjectArtifacts({
        projectDir,
        to: destination,
        syncFortemi: false,
      });

      expect(result.moved).toBe(true);
      expect(existsSync(join(projectDir, '.aiwg'))).toBe(false);
      expect(existsSync(join(destination, 'requirements', 'UC-001.md'))).toBe(true);
      expect(readFileSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE), 'utf-8')).toContain('renamed-aiwg');
      expect(readFileSync(join(projectDir, '.gitignore'), 'utf-8')).toContain(PROJECT_AIWG_LOCATION_FILE);
      expect(resolveProjectAiwgDir(projectDir, {})).toBe(destination);

      const metadata = JSON.parse(
        readFileSync(join(destination, '.index', 'project', 'metadata.json'), 'utf-8'),
      ) as { entries: Record<string, { path: string; title: string }> };
      expect(metadata.entries['.aiwg/requirements/UC-001.md']?.title).toBe('Authentication Requirement');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(destination, { recursive: true, force: true });
    }
  });

  it('moves an already pointer-configured renamed store without requiring --from', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifacts-move-pointer-'));
    const source = join(projectDir, 'private-artifacts', 'old-aiwg-store');
    const destination = join(projectDir, 'private-artifacts', 'new-aiwg-store');
    try {
      mkdirSync(join(source, 'architecture'), { recursive: true });
      writeFileSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE), 'private-artifacts/old-aiwg-store\n', 'utf-8');
      writeFileSync(
        join(source, 'architecture', 'ADR-PORTABLE.md'),
        ['---', 'title: Portable Store ADR', 'type: adr', 'phase: architecture', '---', '', '# Portable Store ADR', ''].join('\n'),
        'utf-8',
      );

      const result = await moveProjectArtifacts({
        projectDir,
        to: 'private-artifacts/new-aiwg-store',
        syncFortemi: false,
      });

      expect(result.from).toBe(source);
      expect(result.to).toBe(destination);
      expect(result.pointerValue).toBe('private-artifacts/new-aiwg-store');
      expect(result.moved).toBe(true);
      expect(result.reindexed).toBe(true);
      expect(existsSync(join(source, 'architecture', 'ADR-PORTABLE.md'))).toBe(false);
      expect(existsSync(join(destination, 'architecture', 'ADR-PORTABLE.md'))).toBe(true);
      expect(readFileSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE), 'utf-8')).toContain('private-artifacts/new-aiwg-store');
      expect(resolveProjectAiwgDir(projectDir, {})).toBe(destination);

      const metadata = JSON.parse(
        readFileSync(join(destination, '.index', 'project', 'metadata.json'), 'utf-8'),
      ) as { entries: Record<string, { path: string; title: string }> };
      expect(metadata.entries['.aiwg/architecture/ADR-PORTABLE.md']?.path).toBe('.aiwg/architecture/ADR-PORTABLE.md');
      expect(metadata.entries['.aiwg/architecture/ADR-PORTABLE.md']?.title).toBe('Portable Store ADR');
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('dry-runs without moving or writing the pointer', async () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifacts-move-dry-'));
    const destination = join(projectDir, '..', `${basename(projectDir)}-private`, '.aiwg');
    try {
      mkdirSync(join(projectDir, '.aiwg'), { recursive: true });
      const result = await moveProjectArtifacts({
        projectDir,
        to: destination,
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.moved).toBe(false);
      expect(existsSync(join(projectDir, '.aiwg'))).toBe(true);
      expect(existsSync(destination)).toBe(false);
      expect(existsSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE))).toBe(false);
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(destination, { recursive: true, force: true });
    }
  });
});
