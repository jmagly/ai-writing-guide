import { describe, expect, it } from 'vitest';
import { homedir } from 'os';
import { join, resolve } from 'path';
import {
  DEFAULT_PROJECT_AIWG_DIR,
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
});
