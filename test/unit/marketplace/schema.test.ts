import fs from 'node:fs';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

const schemaDir = path.resolve(process.cwd(), 'schemas', 'marketplace');
const names = [
  'aiwg-marketplace-envelope.v1.schema.json',
  'aiwg-marketplace-lock.v1.schema.json',
  'aiwg-marketplace-receipt.v1.schema.json',
  'aiwg-marketplace-catalog.v1.schema.json',
  'aiwg-marketplace-trust.v1.schema.json',
  'aiwg-marketplace-portable-bundle.v1.schema.json',
];

describe('marketplace protocol schemas', () => {
  it('compile together under JSON Schema 2020-12 with strict closed contracts', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
    for (const name of names) ajv.addSchema(JSON.parse(fs.readFileSync(path.join(schemaDir, name), 'utf8')));
    for (const name of names) {
      const schema = JSON.parse(fs.readFileSync(path.join(schemaDir, name), 'utf8'));
      expect(ajv.getSchema(schema.$id), `${name} did not compile`).toBeTypeOf('function');
    }
  });

  it('rejects envelope and portable-bundle extension fields by default', () => {
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
    const schemas = names.map((name) => JSON.parse(fs.readFileSync(path.join(schemaDir, name), 'utf8')));
    schemas.forEach((schema) => ajv.addSchema(schema));
    const validateEnvelope = ajv.getSchema('https://aiwg.io/schemas/marketplace/aiwg-marketplace-envelope.v1.schema.json')!;
    const validateBundle = ajv.getSchema('https://aiwg.io/schemas/marketplace/aiwg-marketplace-portable-bundle.v1.schema.json')!;
    expect(validateEnvelope({ schemaVersion: 'aiwg.marketplace.provenance-envelope.v1', futureRequiredField: true })).toBe(false);
    expect(validateBundle({ schemaVersion: 'aiwg.marketplace.portable-bundle.v1', futureRequiredField: true })).toBe(false);
  });
});
