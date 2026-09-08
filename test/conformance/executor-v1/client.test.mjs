import { describe, expect, it } from 'vitest';
import { createSchemaValidator, loadFixture, stripAnnotations, validateSchema } from './client.mjs';

describe('executor conformance validator evidence', () => {
  it('rejects unresolvable schema references as setup failures', () => {
    expect(() => validateSchema('executor.aiwg.io/v1#/$defs/no_such_definition', {}))
      .toThrow(/resolve reference/);
  });

  it('rejects malformed schemas instead of accepting all instances', () => {
    expect(() => createSchemaValidator({ type: 'not-a-json-schema-type' }))
      .toThrow(/schema is invalid/);
  });

  it('enforces required fields and UUID formats on actual registration payloads', () => {
    const payload = stripAnnotations(loadFixture('register-happy').request.body);
    const ref = 'executor.aiwg.io/v1#/$defs/register_payload';
    expect(validateSchema(ref, payload)).toEqual({ valid: true, errors: '' });
    const { executor_id, ...missingIdentity } = payload;
    const missing = validateSchema(ref, missingIdentity);
    expect(missing.valid).toBe(false);
    expect(JSON.parse(missing.errors)).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: 'required', params: { missingProperty: 'executor_id' } }),
    ]));
    const badFormat = validateSchema(ref, { ...payload, executor_id: 'not-a-uuid' });
    expect(badFormat.valid).toBe(false);
    expect(JSON.parse(badFormat.errors)).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: 'format', params: { format: 'uuid' } }),
    ]));
  });
});
