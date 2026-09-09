/**
 * AIWG Extension Test Suite
 *
 * Basic smoke tests for activation, commands, and MCP auto-config.
 * Run via: npm test (inside vscode-extension/)
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { configureMcp } from '../../src/mcp/auto-config';
import { AiwgCliRunner } from '../../src/cli/runner';

suite('AIWG Extension', () => {
  test('Extension activates without error', async () => {
    const ext = vscode.extensions.getExtension('jmagly.aiwg');
    assert.ok(ext, 'Expected jmagly.aiwg to be installed in the extension test host');
    await ext.activate();
    assert.strictEqual(ext.isActive, true, 'Expected jmagly.aiwg activation to complete');
  });

  test('Commands are registered', async () => {
    const ext = vscode.extensions.getExtension('jmagly.aiwg');
    assert.ok(ext, 'Expected jmagly.aiwg to be installed in the extension test host');
    await ext.activate();
    const commands = new Set(await vscode.commands.getCommands(true));
    const required = ['aiwg.init', 'aiwg.status', 'aiwg.deploy', 'aiwg.sync',
      'aiwg.runScript', 'aiwg.configureMcp', 'aiwg.installCli', 'aiwg.refreshSidebar'];
    const declared = ext.packageJSON.contributes.commands.map((command: { command: string }) => command.command);
    assert.deepStrictEqual([...declared].sort(), [...required].sort(), 'Review expected commands when the manifest changes');
    for (const command of required) assert.ok(commands.has(command), `Required command is not registered: ${command}`);
  });
});

suite('AiwgCliRunner', () => {
  test('Returns error result when CLI not found', async () => {
    const runner = new AiwgCliRunner('', '/tmp');
    const result = await runner.run(['version']);
    assert.strictEqual(result.exitCode, 1);
    assert.ok(result.stderr.includes('not found'));
  });
});

suite('MCP Auto-Config', () => {
  let tmpDir: string;

  setup(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-test-'));
  });

  teardown(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('Creates .vscode/mcp.json when absent', async () => {
    await configureMcp(tmpDir, '/usr/local/bin/aiwg');
    const mcpPath = path.join(tmpDir, '.vscode', 'mcp.json');
    const content = JSON.parse(await fs.readFile(mcpPath, 'utf-8'));
    assert.deepStrictEqual(content, {
      servers: { aiwg: { type: 'stdio', command: '/usr/local/bin/aiwg', args: ['mcp', 'serve'] } },
    });
  });

  test('Is idempotent — does not overwrite existing aiwg entry', async () => {
    const vscodDir = path.join(tmpDir, '.vscode');
    await fs.mkdir(vscodDir, { recursive: true });
    const mcpPath = path.join(vscodDir, 'mcp.json');
    const initial = {
      inputs: [{ id: 'kept', type: 'promptString', description: 'Keep this setting' }],
      servers: { aiwg: { type: 'stdio', command: '/old/path', args: ['mcp', 'serve', '--keep'] } },
    };
    await fs.writeFile(mcpPath, JSON.stringify(initial));

    await configureMcp(tmpDir, '/new/path/aiwg');

    const content = JSON.parse(await fs.readFile(mcpPath, 'utf-8'));
    assert.deepStrictEqual(content, initial, 'Should not change any existing configuration');
  });

  test('Preserves existing MCP servers', async () => {
    const vscodDir = path.join(tmpDir, '.vscode');
    await fs.mkdir(vscodDir, { recursive: true });
    const mcpPath = path.join(vscodDir, 'mcp.json');
    const existing = {
      inputs: [{ id: 'kept', type: 'promptString', description: 'Keep this setting' }],
      servers: { other: { type: 'stdio', command: '/other/tool', args: ['--preserve-this'] } },
    };
    await fs.writeFile(mcpPath, JSON.stringify(existing));

    await configureMcp(tmpDir, '/usr/local/bin/aiwg');

    const content = JSON.parse(await fs.readFile(mcpPath, 'utf-8'));
    assert.deepStrictEqual(content, {
      ...existing,
      servers: {
        ...existing.servers,
        aiwg: { type: 'stdio', command: '/usr/local/bin/aiwg', args: ['mcp', 'serve'] },
      },
    }, 'Should preserve all existing values and add the exact AIWG entry');
  });
});
