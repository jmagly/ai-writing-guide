import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditProjectArtifactHealth } from '../../../src/config/project-artifacts.js';

const roots: string[] = [];

function fixture(): { project: string; external: string } {
  const project = mkdtempSync(join(tmpdir(), 'aiwg-artifact-health-'));
  const external = join(project, 'external', '.aiwg');
  roots.push(project);
  writeFileSync(join(project, '.aiwg-location'), 'external/.aiwg\n');
  return { project, external };
}

function controls(root: string, suffix = ''): void {
  mkdirSync(join(root, 'frameworks'), { recursive: true });
  writeFileSync(join(root, 'AIWG.md'), `# AIWG${suffix}\n`);
  writeFileSync(join(root, 'aiwg.config'), `{"version":"1${suffix}"}\n`);
  writeFileSync(join(root, 'frameworks', 'registry.json'), `{"version":"1${suffix}"}\n`);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('auditProjectArtifactHealth', () => {
  it('classifies a healthy split root', () => {
    const { project, external } = fixture();
    controls(join(project, '.aiwg'));
    controls(external);
    mkdirSync(join(external, 'requirements'), { recursive: true });
    writeFileSync(join(external, 'requirements', 'UC-1.md'), '# Requirement\n');

    expect(auditProjectArtifactHealth(project, {})).toMatchObject({
      classification: 'healthy-split-root', severity: 'ok', external_reachable: true,
    });
  });

  it('classifies offline and missing-control-plane states', () => {
    const offline = fixture();
    controls(join(offline.project, '.aiwg'));
    expect(auditProjectArtifactHealth(offline.project, {}).classification).toBe('degraded-offline');

    const missing = fixture();
    controls(missing.external);
    expect(auditProjectArtifactHealth(missing.project, {})).toMatchObject({
      classification: 'legacy-missing-control-plane', repairable: true,
    });
  });

  it('distinguishes identical duplication from divergence', () => {
    const identical = fixture();
    controls(join(identical.project, '.aiwg'));
    controls(identical.external);
    mkdirSync(join(identical.project, '.aiwg', 'requirements'), { recursive: true });
    mkdirSync(join(identical.external, 'requirements'), { recursive: true });
    writeFileSync(join(identical.project, '.aiwg', 'requirements', 'UC-1.md'), '# Same\n');
    writeFileSync(join(identical.external, 'requirements', 'UC-1.md'), '# Same\n');
    expect(auditProjectArtifactHealth(identical.project, {}).classification).toBe('duplicated-identical');

    writeFileSync(join(identical.project, '.aiwg', 'requirements', 'UC-1.md'), '# Different\n');
    expect(auditProjectArtifactHealth(identical.project, {})).toMatchObject({
      classification: 'duplicated-divergent', repairable: false,
    });
  });
});
