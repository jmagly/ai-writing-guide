import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';
import {
  COCKPIT_PACKAGE_NAME,
  cockpitHandler,
  installCockpit,
  resolveCockpitInstall,
} from '../../../../src/cli/handlers/cockpit.js';

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
}

describe('cockpit handler', () => {
  let tmp: string;
  let oldHome: string | undefined;
  let ctx: HandlerContext;

  beforeEach(async () => {
    tmp = await (await import('node:fs/promises')).mkdtemp(path.join(os.tmpdir(), 'aiwg-cockpit-test-'));
    oldHome = process.env.AIWG_COCKPIT_HOME;
    process.env.AIWG_COCKPIT_HOME = path.join(tmp, 'cockpit-home');
    await writeJson(path.join(tmp, 'package.json'), { name: 'aiwg', version: '2026.6.1' });
    ctx = {
      args: [],
      rawArgs: [],
      cwd: tmp,
      frameworkRoot: tmp,
    };
  });

  afterEach(async () => {
    if (oldHome === undefined) delete process.env.AIWG_COCKPIT_HOME;
    else process.env.AIWG_COCKPIT_HOME = oldHome;
    await rm(tmp, { recursive: true, force: true });
  });

  it('dry-runs opt-in acquisition without installing anything', async () => {
    const result = await installCockpit(ctx, ['--dry-run']);

    expect(result.exitCode).toBe(0);
    expect(result.message).toContain(`${COCKPIT_PACKAGE_NAME}@2026.6.1`);
    expect(result.message).toContain(process.env.AIWG_COCKPIT_HOME);
  });

  it('shows the acquisition command when cockpit is absent', async () => {
    const result = await cockpitHandler.execute(ctx);

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('aiwg use cockpit');
    expect(result.message).toContain(`${COCKPIT_PACKAGE_NAME}@2026.6.1`);
  });

  it('resolves an installed matching package', async () => {
    const root = path.join(process.env.AIWG_COCKPIT_HOME!, 'node_modules', '@aiwg', 'cockpit');
    await writeJson(path.join(root, 'package.json'), {
      name: COCKPIT_PACKAGE_NAME,
      version: '2026.6.1',
      bin: { 'aiwg-cockpit': 'bridge/src/server.mjs' },
    });
    await mkdir(path.join(root, 'bridge', 'src'), { recursive: true });
    await writeFile(path.join(root, 'bridge', 'src', 'server.mjs'), '#!/usr/bin/env node\n');

    const install = await resolveCockpitInstall();
    const status = await cockpitHandler.execute({ ...ctx, args: ['--status'] });

    expect(install.installed).toBe(true);
    expect(install.version).toBe('2026.6.1');
    expect(status.exitCode).toBe(0);
    expect(status.message).toContain(`${COCKPIT_PACKAGE_NAME}@2026.6.1`);
  });

  it('refuses to launch a mismatched opt-in package', async () => {
    const root = path.join(process.env.AIWG_COCKPIT_HOME!, 'node_modules', '@aiwg', 'cockpit');
    await writeJson(path.join(root, 'package.json'), {
      name: COCKPIT_PACKAGE_NAME,
      version: '2026.5.9',
      bin: { 'aiwg-cockpit': 'bridge/src/server.mjs' },
    });
    await mkdir(path.join(root, 'bridge', 'src'), { recursive: true });
    await writeFile(path.join(root, 'bridge', 'src', 'server.mjs'), '#!/usr/bin/env node\n');

    const result = await cockpitHandler.execute(ctx);

    expect(result.exitCode).toBe(1);
    expect(result.message).toContain('version mismatch');
    expect(result.message).toContain('aiwg use cockpit');
  });
});
