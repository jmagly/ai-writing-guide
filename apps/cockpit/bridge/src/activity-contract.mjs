import { readFileSync } from 'node:fs';

const EVENT_SCHEMA = JSON.parse(readFileSync(
  new URL('../contracts/activity-event-v1.schema.json', import.meta.url),
  'utf8',
));

const RESTRICTED_KEY = /(?:^|_)(?:content|terminal|prompt|environment|env|credential|secret|password|authorization|bearer|token|private_key|certificate|restricted_(?:url|uri|link))(?:$|_)/i;

function resolveRef(root, ref) {
  if (!ref.startsWith('#/')) throw new Error(`unsupported external schema reference: ${ref}`);
  return ref.slice(2).split('/').reduce((value, segment) => value?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')], root);
}

function typeMatches(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  return typeof value === type;
}

function formatMatches(value, format) {
  if (format === 'uuid') return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  if (format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  if (format === 'date-time') return !Number.isNaN(Date.parse(value));
  return true;
}

function validateNode(value, schema, root, path, errors) {
  if (schema.$ref) return validateNode(value, resolveRef(root, schema.$ref), root, path, errors);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => {
      const candidateErrors = [];
      validateNode(value, candidate, root, path, candidateErrors);
      return candidateErrors.length === 0;
    });
    if (matches.length !== 1) errors.push(`${path} must match exactly one schema`);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(`${path} must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path} is not an allowed value`);
  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${path} must be ${schema.type}`);
    return;
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is too short`);
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path} has invalid format`);
    if (schema.format && !formatMatches(value, schema.format)) errors.push(`${path} has invalid ${schema.format} format`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} is below minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} has too few items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) errors.push(`${path} items must be unique`);
    if (schema.items) value.forEach((item, index) => validateNode(item, schema.items, root, `${path}/${index}`, errors));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) if (!(key in value)) errors.push(`${path}/${key} is required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (schema.properties ?? {}))) errors.push(`${path}/${key} is not allowed`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) validateNode(value[key], childSchema, root, `${path}/${key}`, errors);
    }
  }
}

function containsRestrictedField(value) {
  if (Array.isArray(value)) return value.some(containsRestrictedField);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => RESTRICTED_KEY.test(key) || containsRestrictedField(child));
}

export function validateActivityEvent(event, expectedScope = undefined) {
  const errors = [];
  validateNode(event, EVENT_SCHEMA, EVENT_SCHEMA, '$', errors);
  if (event?.sensitivity !== 'metadata') errors.push('$/sensitivity must be metadata at the Cockpit boundary');
  if (containsRestrictedField(event)) errors.push('$ contains a restricted field');
  if (expectedScope) {
    for (const [key, value] of Object.entries(expectedScope)) {
      if (event?.correlation?.[key] !== value) errors.push(`$/correlation/${key} scope mismatch`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertActivityEvent(event, expectedScope = undefined) {
  const result = validateActivityEvent(event, expectedScope);
  if (!result.valid) {
    const scopeMismatch = result.errors.some((error) => error.includes('scope mismatch'));
    const restricted = result.errors.some((error) => error.includes('restricted') || error.includes('sensitivity'));
    const error = new Error(result.errors.join('; '));
    error.code = scopeMismatch ? 'activity_scope_mismatch' : restricted ? 'activity_restricted_data' : 'activity_malformed_envelope';
    throw error;
  }
  return event;
}

export { EVENT_SCHEMA };
