import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyModelWrapperDeployment } from '../../../src/models/wrapper-deployment.js';

const roots: string[] = [];
const models = {
  reasoning: 'reasoning-current',
  coding: 'coding-current',
  efficiency: 'efficiency-current',
};

afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), 'aiwg-wrapper-deploy-'));
  roots.push(value);
  return value;
}

function codex(wrapper: string, model: string, effort: string): string {
  return [
    `name = "${wrapper}"`,
    'developer_instructions = "Load the selected capability and execute a bounded assignment."',
    `model = "${model}"`,
    `model_reasoning_effort = "${effort}"`,
    '',
  ].join('\n');
}

describe('model wrapper deployment verification', () => {
  it('validates all three current Codex wrapper artifacts', async () => {
    const target = await root();
    await mkdir(join(target, 'nested'), { recursive: true });
    await Promise.all([
      writeFile(join(target, 'aiwg-model-reasoning-worker.toml'), codex('aiwg-model-reasoning-worker', models.reasoning, 'high')),
      writeFile(join(target, 'aiwg-model-coding-worker.toml'), codex('aiwg-model-coding-worker', models.coding, 'medium')),
      writeFile(join(target, 'nested', 'aiwg-model-efficiency-worker.toml'), codex('aiwg-model-efficiency-worker', models.efficiency, 'low')),
    ]);
    const result = await verifyModelWrapperDeployment(target, { provider: 'codex', models });
    expect(result.valid).toBe(true);
    expect(result.found).toHaveLength(3);
    expect(result.missing).toEqual([]);
    expect(result.mismatches).toEqual([]);
  });

  it('rejects empty and stale Codex wrappers by field', async () => {
    const target = await root();
    await Promise.all([
      writeFile(join(target, 'aiwg-model-reasoning-worker.toml'), codex('aiwg-model-reasoning-worker', 'reasoning-stale', 'high')),
      writeFile(join(target, 'aiwg-model-coding-worker.toml'), ''),
      writeFile(join(target, 'aiwg-model-efficiency-worker.toml'), codex('aiwg-model-efficiency-worker', models.efficiency, 'low')),
    ]);
    const result = await verifyModelWrapperDeployment(target, { provider: 'codex', models });
    expect(result.valid).toBe(false);
    expect(result.mismatches).toEqual(expect.arrayContaining([
      expect.objectContaining({ wrapper: 'aiwg-model-reasoning-worker', field: 'model', expected: models.reasoning, actual: 'reasoning-stale' }),
      expect.objectContaining({ wrapper: 'aiwg-model-coding-worker', field: 'content' }),
    ]));
  });

  it('validates Claude semantic aliases and canonical role metadata', async () => {
    const target = await root();
    const cases = [
      ['reasoning', 'premium', 'opus'],
      ['coding', 'standard', 'sonnet'],
      ['efficiency', 'economy', 'haiku'],
    ];
    await Promise.all(cases.map(([role, tier, model]) => {
      const wrapper = `aiwg-model-${role}-worker`;
      return writeFile(join(target, `${wrapper}.md`), [
        '---', `name: ${wrapper}`, `model: ${model}`, `model-role: ${role}`, `model-tier: ${tier}`, '---', '# Wrapper', '',
      ].join('\n'));
    }));
    const result = await verifyModelWrapperDeployment(target, { provider: 'claude', models });
    expect(result.valid).toBe(true);
  });

  it('reports an agent-less provider as unsupported without false pinning', async () => {
    const result = await verifyModelWrapperDeployment(null);
    expect(result.supported).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.missing).toHaveLength(3);
  });
});
