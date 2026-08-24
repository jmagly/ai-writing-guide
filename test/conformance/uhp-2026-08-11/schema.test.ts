import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const fixtures = join(root, 'test/fixtures/uhp/2026-08-11');
const schemaPath = join(root, 'schemas/uhp/uhp-2026-08-11.schema.json');

async function json(name: string): Promise<any> {
  return JSON.parse(await readFile(join(fixtures, name), 'utf8'));
}

const schema = JSON.parse(await readFile(schemaPath, 'utf8'));

describe('pinned UHP 2026-08-11 fixtures', () => {
  const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
  ajv.addSchema(schema);
  const validate = (definition: string, value: unknown) => {
    const validator = ajv.getSchema(`${schema.$id}#/$defs/${definition}`)!;
    const valid = validator(value);
    expect(validator.errors, JSON.stringify(validator.errors, null, 2)).toBeNull();
    expect(valid).toBe(true);
  };

  it('validates discovery, harness, models, response, and error objects', async () => {
    validate('Discovery', await json('discovery.json'));
    const harnesses = await json('harnesses.json');
    for (const harness of harnesses.harnesses) validate('Harness', harness);
    validate('HarnessModels', await json('models.json'));
    validate('Response', await json('response.json'));
    validate('ErrorEnvelope', await json('error.json'));
  });

  it('validates every deterministic stream event including unknown additive types', async () => {
    const text = await readFile(join(fixtures, 'stream.sse'), 'utf8');
    for (const line of text.split(/\r?\n/).filter(line => line.startsWith('data: '))) {
      validate('Event', JSON.parse(line.slice(6)));
    }
  });
});
