/**
 * View definition validation tests.
 *
 * @implements #1207
 */

import { describe, expect, it } from 'vitest';
import {
  parseViewYaml,
  ViewValidationError,
  dumpViewYaml,
  validate,
} from '../../../src/artifacts/views/definition.js';

const validYaml = `
name: missing-acceptance-criteria
description: Use cases without acceptance criteria
producer: rlm-batch
inputs:
  glob: ".aiwg/requirements/UC-*.md"
prompt: |
  Determine if this use case has an explicit acceptance-criteria section.
  Return JSON: {"missing": true|false, "reasoning": "..."}
aggregate: filter-true
refresh:
  on_artifact_change: true
  schedule: weekly
  manual_only: false
output_format: json
`;

describe('view definition', () => {
  it('parses a valid YAML definition', () => {
    const def = parseViewYaml(validYaml);
    expect(def.name).toBe('missing-acceptance-criteria');
    expect(def.producer).toBe('rlm-batch');
    expect(def.inputs.glob).toBe('.aiwg/requirements/UC-*.md');
    expect(def.aggregate).toBe('filter-true');
    expect(def.refresh.schedule).toBe('weekly');
    expect(def.outputFormat).toBe('json');
  });

  it('round-trips parse → dump → parse', () => {
    const def1 = parseViewYaml(validYaml);
    const yaml = dumpViewYaml(def1);
    const def2 = parseViewYaml(yaml);
    expect(def2).toEqual(def1);
  });

  it('rejects invalid name (uppercase, special chars)', () => {
    expect(() => validate({ ...parseSchema(), name: 'Bad-Name' })).toThrow(ViewValidationError);
    expect(() => validate({ ...parseSchema(), name: 'has space' })).toThrow(ViewValidationError);
  });

  it('rejects invalid producer', () => {
    expect(() => validate({ ...parseSchema(), producer: 'random' })).toThrow(ViewValidationError);
  });

  it('rejects invalid aggregate', () => {
    expect(() => validate({ ...parseSchema(), aggregate: 'unknown' })).toThrow(ViewValidationError);
  });

  it('requires exactly one input mode', () => {
    expect(() => validate({ ...parseSchema(), inputs: {} })).toThrow(ViewValidationError);
    expect(() =>
      validate({
        ...parseSchema(),
        inputs: { glob: 'a', query: 'b' },
      })
    ).toThrow(ViewValidationError);
  });

  it('accepts query input mode', () => {
    const def = validate({ ...parseSchema(), inputs: { query: 'type:use-case' } });
    expect(def.inputs.query).toBe('type:use-case');
    expect(def.inputs.glob).toBeUndefined();
  });

  it('accepts neighbors-of input mode', () => {
    const def = validate({
      ...parseSchema(),
      inputs: { 'neighbors-of': { id: 'UC-007', depth: 2, direction: 'both' } },
    });
    expect(def.inputs.neighborsOf?.id).toBe('UC-007');
    expect(def.inputs.neighborsOf?.depth).toBe(2);
    expect(def.inputs.neighborsOf?.direction).toBe('both');
  });

  it('rejects neighbors-of without id', () => {
    expect(() =>
      validate({
        ...parseSchema(),
        inputs: { 'neighbors-of': { depth: 1, direction: 'in' } },
      })
    ).toThrow(ViewValidationError);
  });

  it('rejects invalid schedule', () => {
    expect(() =>
      validate({
        ...parseSchema(),
        refresh: { schedule: 'biweekly' },
      })
    ).toThrow(ViewValidationError);
  });

  it('defaults refresh and output_format when omitted', () => {
    const def = validate(parseSchema());
    expect(def.refresh.onArtifactChange).toBe(true);
    expect(def.refresh.schedule).toBe('never');
    expect(def.outputFormat).toBe('json');
  });

  it('reports multiple issues at once', () => {
    try {
      validate({ name: 'Bad Name', producer: 'invalid', aggregate: 'invalid', prompt: '', inputs: {} });
      expect.fail('expected ViewValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(ViewValidationError);
      const e = err as ViewValidationError;
      expect(e.issues.length).toBeGreaterThanOrEqual(4);
    }
  });
});

function parseSchema(): Record<string, unknown> {
  return {
    name:      'a-valid-name',
    producer:  'rlm-batch',
    prompt:    'do the thing',
    aggregate: 'concat',
    inputs:    { glob: 'foo/*.md' },
  };
}
