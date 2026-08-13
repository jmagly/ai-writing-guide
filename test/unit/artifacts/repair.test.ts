import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { repairProjectArtifacts } from '../../../src/artifacts/repair.js';

const roots: string[] = [];
function fixture() {
  const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifact-repair-'));
  roots.push(projectDir);
  const artifactRoot = join(projectDir, 'external', '.aiwg');
  mkdirSync(join(artifactRoot, 'frameworks'), { recursive: true });
  writeFileSync(join(projectDir, '.aiwg-location'), 'external/.aiwg\n');
  writeFileSync(join(artifactRoot, 'AIWG.md'), '# AIWG\n');
  writeFileSync(join(artifactRoot, 'aiwg.config'), '{}\n');
  writeFileSync(join(artifactRoot, 'frameworks', 'registry.json'), '{}\n');
  return { projectDir, artifactRoot };
}

afterEach(() => roots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('repairProjectArtifacts', () => {
  it('previews and then materializes a missing local control plane', async () => {
    const { projectDir } = fixture();
    const preview = await repairProjectArtifacts({ projectDir });
    expect(preview.applied).toBe(false);
    expect(preview.copied).toEqual(['AIWG.md', 'aiwg.config', 'frameworks/registry.json']);
    expect(existsSync(join(projectDir, '.aiwg', 'AIWG.md'))).toBe(false);

    const applied = await repairProjectArtifacts({ projectDir, apply: true });
    expect(applied.after.classification).toBe('healthy-split-root');
    expect(existsSync(join(projectDir, '.aiwg', 'AIWG.md'))).toBe(true);
  });

  it('removes only identical local corpus duplicates and refuses divergence', async () => {
    const { projectDir, artifactRoot } = fixture();
    await repairProjectArtifacts({ projectDir, apply: true });
    mkdirSync(join(projectDir, '.aiwg', 'requirements'), { recursive: true });
    mkdirSync(join(artifactRoot, 'requirements'), { recursive: true });
    writeFileSync(join(projectDir, '.aiwg', 'requirements', 'UC-1.md'), '# Same\n');
    writeFileSync(join(artifactRoot, 'requirements', 'UC-1.md'), '# Same\n');
    const repaired = await repairProjectArtifacts({ projectDir, apply: true });
    expect(repaired.removed).toEqual(['requirements/UC-1.md']);
    expect(existsSync(join(projectDir, '.aiwg', 'requirements', 'UC-1.md'))).toBe(false);

    writeFileSync(join(projectDir, '.aiwg', 'AIWG.md'), '# Diverged\n');
    await expect(repairProjectArtifacts({ projectDir, apply: true })).rejects.toThrow(/diverges/);
  });
});
