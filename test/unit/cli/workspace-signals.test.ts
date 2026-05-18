import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';
import {
  formatDeployedWorkspaceSignalPlan,
  formatWorkspaceSignalPlan,
  readWorkspaceSignalPlan,
  resolveWorkspaceSignalPlan,
  writeWorkspaceSignalPlan,
} from '../../../src/cli/workspace-signals.js';

describe('workspace signal skill loading plan', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `aiwg-workspace-signals-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(tmpDir)) await rm(tmpDir, { recursive: true, force: true });
  });

  it('always includes sdlc and aiwg-utils core bundles', async () => {
    const plan = await resolveWorkspaceSignalPlan(tmpDir);

    expect(plan.bundles.find((b) => b.id === 'sdlc')?.included).toBe(true);
    expect(plan.bundles.find((b) => b.id === 'aiwg-utils')?.included).toBe(true);
    expect(plan.bundles.find((b) => b.id === 'forensics')?.included).toBe(false);
  });

  it('detects domain directories and application source signals', async () => {
    await mkdir(path.join(tmpDir, '.aiwg', 'research'), { recursive: true });
    await mkdir(path.join(tmpDir, 'src'), { recursive: true });
    await writeFile(path.join(tmpDir, 'package.json'), '{"name":"demo"}\n');

    const plan = await resolveWorkspaceSignalPlan(tmpDir);

    const research = plan.bundles.find((b) => b.id === 'research');
    const sdlc = plan.bundles.find((b) => b.id === 'sdlc');
    expect(research?.included).toBe(true);
    expect(research?.reasons.join('\n')).toContain('matched research workspace signal');
    expect(sdlc?.reasons.join('\n')).toContain('matched application source workspace signal');
    expect(plan.signals).toContain('.aiwg/research/');
    expect(plan.signals).toContain('package.json + src/');
  });

  it('applies explicit profile and dependency reasons', async () => {
    const plan = await resolveWorkspaceSignalPlan(tmpDir, { profile: 'security-engineering' });

    expect(plan.profile).toBe('security-engineering');
    expect(plan.profileSource).toBe('flag');
    expect(plan.bundles.find((b) => b.id === 'security-engineering')?.included).toBe(true);
    expect(plan.bundles.find((b) => b.id === 'sdlc')?.reasons.join('\n')).toContain('dependency of security-engineering');
  });

  it('reads tolerant config hints without requiring deployment config changes', async () => {
    await mkdir(path.join(tmpDir, '.aiwg'), { recursive: true });
    await writeFile(
      path.join(tmpDir, '.aiwg', 'aiwg.config'),
      JSON.stringify({
        version: '1',
        providers: ['claude'],
        installed: {},
        scripts: {},
        skillLoading: {
          profile: 'marketing',
          include: ['ops'],
        },
      }, null, 2),
    );

    const plan = await resolveWorkspaceSignalPlan(tmpDir);

    expect(plan.profile).toBe('marketing');
    expect(plan.profileSource).toBe('config');
    expect(plan.bundles.find((b) => b.id === 'marketing')?.included).toBe(true);
    expect(plan.bundles.find((b) => b.id === 'ops')?.included).toBe(true);
  });

  it('formats a read-only dry-run report', async () => {
    await writeFile(path.join(tmpDir, 'Dockerfile'), 'FROM scratch\n');
    const report = formatWorkspaceSignalPlan(await resolveWorkspaceSignalPlan(tmpDir));

    expect(report).toContain('Workspace skill loading plan (dry run)');
    expect(report).toContain('forensics: matched container workspace signal');
    expect(report).toContain('No files were changed.');
  });

  it('persists and formats deployed include and exclude reasons', async () => {
    await mkdir(path.join(tmpDir, '.aiwg', 'forensics'), { recursive: true });
    const plan = await resolveWorkspaceSignalPlan(tmpDir);

    await writeWorkspaceSignalPlan(tmpDir, plan);
    const saved = await readWorkspaceSignalPlan(tmpDir);
    const report = formatDeployedWorkspaceSignalPlan(saved!);

    expect(saved?.bundles.find((b) => b.id === 'forensics')?.included).toBe(true);
    expect(report).toContain('Workspace skill filter');
    expect(report).toContain('framework/forensics');
    expect(report).toContain('Filtered out:');
    expect(report).toContain('framework/marketing');
  });
});
