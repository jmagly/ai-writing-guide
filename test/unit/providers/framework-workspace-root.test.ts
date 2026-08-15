import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveFrameworkWorkspaceRoot } from '../../../tools/agents/providers/base.mjs';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('resolveFrameworkWorkspaceRoot', () => {
  it('defaults generated framework state to the local .aiwg directory', () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-provider-workspace-'));
    roots.push(project);
    expect(resolveFrameworkWorkspaceRoot(project, {})).toBe(join(project, '.aiwg'));
  });

  it('routes generated framework state to a pointer-configured corpus', () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-provider-workspace-pointer-'));
    roots.push(project);
    writeFileSync(join(project, '.aiwg-location'), '../private-corpus/.aiwg\n');
    expect(resolveFrameworkWorkspaceRoot(project, {})).toBe(
      resolve(project, '../private-corpus/.aiwg'),
    );
  });

  it('lets the canonical environment override win over the pointer', () => {
    const project = mkdtempSync(join(tmpdir(), 'aiwg-provider-workspace-env-'));
    roots.push(project);
    writeFileSync(join(project, '.aiwg-location'), '../pointer-corpus/.aiwg\n');
    expect(resolveFrameworkWorkspaceRoot(project, {
      AIWG_ARTIFACTS_PATH: '../environment-corpus/.aiwg',
    })).toBe(resolve(project, '../environment-corpus/.aiwg'));
  });
});
