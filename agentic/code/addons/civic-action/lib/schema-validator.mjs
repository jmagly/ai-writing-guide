import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_FILES = {
  'source-registry': 'source-registry.schema.json',
  'vote-ledger': 'vote-ledger.schema.json',
  'meeting-reconciliation': 'meeting-reconciliation.schema.json',
  'publication-packet': 'publication-packet.schema.json',
  'gate-result': 'compliance-gate-result.schema.json',
};

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const validators = Object.fromEntries(Object.entries(SCHEMA_FILES).map(([kind, file]) => {
  const schemaUrl = new URL(`../schemas/${file}`, import.meta.url);
  const schema = JSON.parse(readFileSync(schemaUrl, 'utf8'));
  return [kind, ajv.compile(schema)];
}));

export class CivicSchemaValidationError extends Error {
  constructor(kind, errors) {
    super(`${kind} does not conform to its civic-action schema`);
    this.name = 'CivicSchemaValidationError';
    this.code = 'CIVIC_SCHEMA_INVALID';
    this.validationErrors = errors;
  }
}

function publicErrors(errors = []) {
  return errors.map((error) => ({
    instance_path: error.instancePath || '/',
    schema_path: error.schemaPath,
    keyword: error.keyword,
    message: error.message ?? 'schema validation failed',
  }));
}

export function assertCivicSchema(kind, value) {
  const validate = validators[kind];
  if (!validate) throw new Error(`Unknown civic schema kind: ${kind}`);
  if (!validate(value)) {
    throw new CivicSchemaValidationError(kind, publicErrors(validate.errors));
  }
}
