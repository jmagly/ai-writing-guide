import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  loadCliCommandsContribution,
  registerCliCommands,
  tryExecuteCliExtension,
} from '../../../src/cli/cli-extension-loader.js';

let root: string;
let projectDir: string;
let addonDir: string;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-cli-extension-'));
  projectDir = path.join(root, 'project');
  addonDir = path.join(root, 'addon');
  await mkdir(path.join(addonDir, 'commands'), { recursive: true });
  await mkdir(projectDir, { recursive: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe('CLI extension registration', () => {
  it('loads, registers, and executes a manifest-declared command', async () => {
    await writeFile(
      path.join(addonDir, 'manifest.json'),
      JSON.stringify({
        cli_commands: {
          namespace: 'demo',
          description: 'Demo commands',
          entry: 'commands/',
          subcommands: {
            ping: { file: 'ping.mjs', description: 'Ping' },
          },
        },
      }),
    );
    await writeFile(
      path.join(addonDir, 'commands', 'ping.mjs'),
      'export default async (args, context) => ({ exitCode: 0, message: `${context.namespace}:${args.join(",")}` });\n',
    );

    const contribution = await loadCliCommandsContribution(addonDir);
    expect(contribution).not.toBeNull();
    await registerCliCommands(
      projectDir,
      contribution!.manifest.namespace,
      contribution!.manifest.description,
      contribution!.commandsSource,
      contribution!.manifest.subcommands,
    );

    const registry = JSON.parse(
      await readFile(path.join(projectDir, '.aiwg', 'cli-extensions.json'), 'utf8'),
    );
    expect(registry.demo.subcommands.ping.file).toBe('ping.mjs');

    const executed = await tryExecuteCliExtension('demo', ['ping', 'ok'], projectDir, root);
    expect(executed).toEqual({ exitCode: 0, message: 'demo:ok' });
  });

  it('rejects traversal in a contributed commands entry', async () => {
    await writeFile(
      path.join(addonDir, 'manifest.json'),
      JSON.stringify({
        cli_commands: {
          namespace: 'demo',
          description: 'Demo commands',
          entry: '../outside/',
          subcommands: {
            ping: { file: 'ping.mjs', description: 'Ping' },
          },
        },
      }),
    );

    await expect(loadCliCommandsContribution(addonDir)).rejects.toThrow('Unsafe');
  });

  it('rejects traversal in subcommand module paths', async () => {
    await expect(
      registerCliCommands(projectDir, 'demo', 'Demo', path.join(addonDir, 'commands'), {
        ping: { file: '../ping.mjs', description: 'Ping' },
      }),
    ).rejects.toThrow('local .mjs file');
  });
});
