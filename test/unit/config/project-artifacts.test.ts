import { describe, expect, it } from 'vitest';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import {
  DEFAULT_PROJECT_AIWG_DIR,
  PROJECT_AIWG_LOCATION_FILE,
  parseProjectArtifactLocation,
  projectAiwgPath,
  resolveProjectAiwgDir,
} from '../../../src/config/project-artifacts.js';

describe('project-artifacts', () => {
  it('defaults to <project>/.aiwg', () => {
    expect(resolveProjectAiwgDir('/repo/project', {})).toBe(resolve('/repo/project', DEFAULT_PROJECT_AIWG_DIR));
  });

  it('honors an absolute AIWG_ARTIFACTS_PATH', () => {
    expect(resolveProjectAiwgDir('/repo/project', {
      AIWG_ARTIFACTS_PATH: '/private/ops/corpus/.aiwg',
    })).toBe('/private/ops/corpus/.aiwg');
  });

  it('honors a project-relative AIWG_ARTIFACTS_PATH so the directory can be renamed', () => {
    expect(resolveProjectAiwgDir('/repo/project', {
      AIWG_ARTIFACTS_PATH: '../aiwg-web-release-ops/corpus/.aiwg',
    })).toBe(resolve('/repo/project', '../aiwg-web-release-ops/corpus/.aiwg'));
  });

  it('expands ~/ overrides', () => {
    expect(resolveProjectAiwgDir('/repo/project', {
      AIWG_ARTIFACTS_PATH: '~/dev/aiwg-web-release-ops/corpus/.aiwg',
    })).toBe(resolve(homedir(), 'dev/aiwg-web-release-ops/corpus/.aiwg'));
  });

  it('builds paths under the resolved artifact directory', () => {
    expect(projectAiwgPath('/repo/project', 'aiwg.config')).toBe(join(resolve('/repo/project', '.aiwg'), 'aiwg.config'));
  });

  it('parses pointer files with comments and optional shell assignment syntax', () => {
    expect(parseProjectArtifactLocation('# comment\n../private/.aiwg\n')).toBe('../private/.aiwg');
    expect(parseProjectArtifactLocation('export AIWG_ARTIFACTS_PATH="../private/.aiwg"\n')).toBe('../private/.aiwg');
    expect(parseProjectArtifactLocation("AIWG_ARTIFACTS_PATH='../renamed-aiwg'\n")).toBe('../renamed-aiwg');
  });

  it('honors .aiwg-location when no environment override is set', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifact-pointer-'));
    try {
      writeFileSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE), '../private-corpus/.aiwg\n', 'utf-8');
      expect(resolveProjectAiwgDir(projectDir, {})).toBe(resolve(projectDir, '../private-corpus/.aiwg'));
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it('lets AIWG_ARTIFACTS_PATH override .aiwg-location', () => {
    const projectDir = mkdtempSync(join(tmpdir(), 'aiwg-artifact-pointer-env-'));
    try {
      writeFileSync(join(projectDir, PROJECT_AIWG_LOCATION_FILE), '../private-corpus/.aiwg\n', 'utf-8');
      expect(resolveProjectAiwgDir(projectDir, {
        AIWG_ARTIFACTS_PATH: '../env-corpus/.aiwg',
      })).toBe(resolve(projectDir, '../env-corpus/.aiwg'));
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
    }
  });
});
