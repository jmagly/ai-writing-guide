import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAgentsMd, deployCommands, deployExtensionBridge, postDeploy, transformCommand } from '../../../tools/agents/providers/pi.mjs';
import aiwgBridge, { evaluateAiwgPiCommand } from '../../../agentic/code/providers/pi/aiwg-bridge.js';

const roots: string[] = [];
const repoRoot = resolve(__dirname, '../../..');
function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Pi provider prompt projection', () => {
  it('keeps only Pi prompt metadata and bridges hinted commands to $@', () => {
    const result = transformCommand('review.md', [
      '---',
      'description: Review a target',
      'argument-hint: "<target> [focus]"',
      'allowed-tools: Read, Bash',
      'model: claude-sonnet-4-6',
      '---',
      'Review the requested target.',
    ].join('\n'));
    expect(result).toContain('description: Review a target');
    expect(result).toContain('argument-hint: "<target> [focus]"');
    expect(result).toContain('Invocation arguments: $@');
    expect(result).not.toContain('allowed-tools');
    expect(result).not.toContain('model:');
  });

  it('creates a Pi-native AGENTS bootstrap without Codex-specific instructions', () => {
    const project = temporaryRoot('aiwg-pi-context-');
    createAgentsMd(project, repoRoot, false);
    const context = readFileSync(join(project, 'AGENTS.md'), 'utf8');
    expect(context).toContain('Read and follow `WORKSPACE.md` first');
    expect(context).toContain('`.agents/skills/`');
    expect(context).toContain('`.pi/prompts/`');
    expect(context).toContain('`/trust`');
    expect(context).not.toContain('.codex');
  });

  it('emits an actionable project-trust diagnostic when deploying resources', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await postDeploy(temporaryRoot('aiwg-pi-trust-'), {
      srcRoot: repoRoot,
      dryRun: true,
      quiet: false,
      deployCommands: true,
    });
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/trust-gated.*\/trust.*restart required.*pi --approve/i));
    log.mockRestore();
  });

  it.each(['$@', '$ARGUMENTS', '$1 and $2', '${1:-default}', '${@:2:3}'])(
    'preserves Pi-native argument expression %s without adding a duplicate bridge',
    expression => {
      const result = transformCommand('args.md', `---\ndescription: Args\nargument-hint: <args>\n---\nUse ${expression}.\n`);
      expect(result).toContain(expression);
      expect(result).not.toContain('Invocation arguments:');
    },
  );

  it('dry-runs without writes, applies idempotently, and preserves operator settings/resources', () => {
    const project = temporaryRoot('aiwg-pi-project-');
    const source = temporaryRoot('aiwg-pi-source-');
    mkdirSync(join(source, 'commands'), { recursive: true });
    writeFileSync(join(source, 'commands', 'sample.md'), '---\ndescription: Sample\nargument-hint: <value>\n---\nRun for $1.\n');
    mkdirSync(join(project, '.pi', 'prompts'), { recursive: true });
    const settings = '{\n  "operatorSetting": true\n}\n';
    writeFileSync(join(project, '.pi', 'settings.json'), settings);
    writeFileSync(join(project, '.pi', 'prompts', 'operator.md'), 'operator-owned\n');

    const command = join(source, 'commands', 'sample.md');
    const options = { provider: 'pi', deployVersion: 'test', deploySource: 'fixture', quiet: true };
    deployCommands([command], project, { ...options, dryRun: true });
    expect(existsSync(join(project, '.pi', 'prompts', 'sample.md'))).toBe(false);

    deployCommands([command], project, options);
    const first = readFileSync(join(project, '.pi', 'prompts', 'sample.md'), 'utf8');
    deployCommands([command], project, options);
    expect(readFileSync(join(project, '.pi', 'prompts', 'sample.md'), 'utf8')).toBe(first);
    expect(readFileSync(join(project, '.pi', 'settings.json'), 'utf8')).toBe(settings);
    expect(readFileSync(join(project, '.pi', 'prompts', 'operator.md'), 'utf8')).toBe('operator-owned\n');
  });

  it('deploys the reviewed extension bridge without replacing operator extensions', () => {
    const project = temporaryRoot('aiwg-pi-extension-');
    mkdirSync(join(project, '.pi/extensions'), { recursive: true });
    writeFileSync(join(project, '.pi/extensions/operator.ts'), 'operator-owned\n');
    const options = { srcRoot: repoRoot, provider: 'pi', deployVersion: 'test', deploySource: 'fixture', quiet: true };
    expect(deployExtensionBridge(project, options)).toHaveLength(1);
    const bridge = readFileSync(join(project, '.pi/extensions/aiwg-bridge.ts'), 'utf8');
    expect(bridge).toMatch(/!hasUI/);
    expect(bridge).toMatch(/block: true/);
    expect(readFileSync(join(project, '.pi/extensions/operator.ts'), 'utf8')).toBe('operator-owned\n');
  });

  it('blocks denied and headless-dangerous tool calls without prompting headless', async () => {
    expect(await evaluateAiwgPiCommand('rm -rf ./build', false)).toMatchObject({ block: true });
    expect(await evaluateAiwgPiCommand('npm install surprise', false)).toMatchObject({ block: true });
    expect(await evaluateAiwgPiCommand('git status', false)).toBeUndefined();
    let hook: any;
    aiwgBridge({ on: (_name: string, handler: any) => { hook = handler; } } as any);
    const select = vi.fn();
    await expect(hook({ toolName: 'bash', input: { command: 'sudo chmod 777 /tmp/x' } },
      { hasUI: false, ui: { select } })).resolves.toMatchObject({ block: true });
    expect(select).not.toHaveBeenCalled();
  });
});
