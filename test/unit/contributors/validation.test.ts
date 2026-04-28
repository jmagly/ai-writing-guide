/**
 * Validation Module Tests
 *
 * Targeted coverage for the zod schemas and the kind-resolver.
 *
 * @source @src/contributors/validation.ts
 * @issue #938
 */

import { describe, it, expect } from 'vitest';
import {
  validateContributor,
  getSchemaForKind,
  getRegisteredKinds,
} from '../../../src/contributors/validation.js';

describe('validateContributor', () => {
  it('accepts a minimal valid status contributor', () => {
    const result = validateContributor({
      kind: 'status',
      domain: 'SDLC',
      description: 'SDLC phase and risks',
      detect: { glob: ['.aiwg/requirements/*.md'] },
    });
    expect(result.ok).toBe(true);
  });

  it('accepts a valid research contributor with focus areas', () => {
    const result = validateContributor({
      kind: 'research',
      domain: 'SDLC artifacts',
      description: 'Validates SAD/ADRs',
      detect: { glob: ['.aiwg/architecture/*.md'] },
      focus_areas: ['security', 'performance'],
      sources: { preferred: ['ietf', 'owasp'] },
      recency_default_months: 18,
    });
    expect(result.ok).toBe(true);
  });

  it('rejects status contributor missing domain', () => {
    const result = validateContributor({
      kind: 'status',
      description: 'no domain',
      detect: { glob: ['*'] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.includes('domain'))).toBe(true);
    }
  });

  it('rejects research contributor with empty focus_areas', () => {
    const result = validateContributor({
      kind: 'research',
      domain: 'X',
      description: 'X',
      detect: { glob: ['*'] },
      focus_areas: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown kind with a clear error', () => {
    const result = validateContributor({
      kind: 'invented',
      domain: 'X',
      description: 'X',
      detect: { glob: ['*'] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/Unknown contributor kind/);
    }
  });

  it('rejects detect.glob = []', () => {
    const result = validateContributor({
      kind: 'status',
      domain: 'X',
      description: 'X',
      detect: { glob: [] },
    });
    expect(result.ok).toBe(false);
  });
});

describe('schema registry', () => {
  it('registers status and research kinds', () => {
    expect(getRegisteredKinds()).toEqual(expect.arrayContaining(['status', 'research']));
  });

  it('throws on unknown kind lookup', () => {
    expect(() => getSchemaForKind('unknown-kind')).toThrow(/Unknown contributor kind/);
  });
});
