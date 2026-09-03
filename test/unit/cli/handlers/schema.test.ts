import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { schemaHandler } from '../../../../src/cli/handlers/schema.js';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'aiwg-schema-handler-'));
  mkdirSync(join(root, 'schemas', 'catalog'), { recursive: true });
  writeFileSync(join(root, 'schemas', 'example.schema.json'), JSON.stringify({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://aiwg.io/schemas/example/1.0.0',
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' } },
    additionalProperties: false,
  }));
  writeFileSync(join(root, 'schemas', 'catalog', 'catalog.json'), JSON.stringify({
    schemaVersion: '1',
    policy: { strict: true, remoteReferences: 'deny', compatibility: 'unknown', requireFixtures: false, requireDigest: false },
    domains: ['example.json'],
  }));
  writeFileSync(join(root, 'schemas', 'catalog', 'example.json'), JSON.stringify({
    schemaVersion: '1', domain: 'example', owner: { id: 'test' }, artifacts: [{
      logicalName: 'example', id: 'https://aiwg.io/schemas/example/1.0.0', version: '1.0.0',
      format: 'json-schema', dialect: 'https://json-schema.org/draft/2020-12/schema', lifecycle: 'active',
      owner: { id: 'test' }, authority: { kind: 'canonical', path: 'schemas/example.schema.json' },
    }],
  }));
  return root;
}

function context(cwd: string, args: string[]): HandlerContext {
  return { cwd, frameworkRoot: cwd, args, rawArgs: ['schema', ...args] };
}

describe('schema handler', () => {
  it('lists and resolves entries from the compiled catalog', async () => {
    const root = fixture();
    const listed = await schemaHandler.execute(context(root, ['list']));
    expect(listed.exitCode).toBe(0);
    expect(JSON.parse(listed.message ?? '{}').entries[0]).toMatchObject({ logicalName: 'example', domain: 'example' });

    const shown = await schemaHandler.execute(context(root, ['show', 'example@1.0.0']));
    expect(JSON.parse(shown.message ?? '{}').artifact.id).toBe('https://aiwg.io/schemas/example/1.0.0');
  });

  it('returns stable diagnostics when an instance is invalid', async () => {
    const root = fixture();
    writeFileSync(join(root, 'invalid.json'), JSON.stringify({ name: 7 }));
    const result = await schemaHandler.execute(context(root, ['validate', '--schema', 'example@1.0.0', 'invalid.json']));
    const output = JSON.parse(result.message ?? '{}');
    expect(result.exitCode).toBe(1);
    expect(output.schema).toBe('aiwg.schema.validation.v1');
    expect(output.diagnostics[0]).toMatchObject({ code: 'SCHEMA_INSTANCE_INVALID', artifactId: 'https://aiwg.io/schemas/example/1.0.0' });
  });

  it('documents every control-plane operation', async () => {
    const result = await schemaHandler.help!(context(process.cwd(), []));
    for (const action of ['list', 'show', 'graph', 'policy', 'validate', 'lint', 'check-refs', 'diff', 'compatibility', 'generate', 'verify-projections']) {
      expect(result.message).toContain(action);
    }
  });
});
