/**
 * Unit tests for `extractSkillScript` (#1227) — the helper that pulls a
 * SkillScriptSpec from a SKILL.md frontmatter block.
 */

import { describe, it, expect } from 'vitest';
import { extractSkillScript } from '../../../src/artifacts/index-builder.js';

describe('extractSkillScript', () => {
  it('returns undefined when no script block is present', () => {
    expect(extractSkillScript({})).toBeUndefined();
    expect(extractSkillScript({ name: 'foo' })).toBeUndefined();
  });

  it('returns undefined when entrypoint or runtime is missing', () => {
    expect(extractSkillScript({ script: { entrypoint: 'x.py' } })).toBeUndefined();
    expect(extractSkillScript({ script: { runtime: 'python3' } })).toBeUndefined();
    expect(extractSkillScript({ script: {} })).toBeUndefined();
  });

  it('returns undefined when script is malformed (array, scalar)', () => {
    expect(extractSkillScript({ script: 'string-not-object' })).toBeUndefined();
    expect(extractSkillScript({ script: ['not', 'object'] })).toBeUndefined();
    expect(extractSkillScript({ script: 42 })).toBeUndefined();
  });

  it('parses a minimal valid block', () => {
    const out = extractSkillScript({
      script: { entrypoint: 'scripts/run.py', runtime: 'python3' },
    });
    expect(out).toEqual({
      entrypoint: 'scripts/run.py',
      runtime: 'python3',
      cwd: 'project-root',
    });
  });

  it('honors a valid cwd override', () => {
    expect(
      extractSkillScript({
        script: {
          entrypoint: 'scripts/run.py',
          runtime: 'python3',
          cwd: 'skill-dir',
        },
      })?.cwd,
    ).toBe('skill-dir');
    expect(
      extractSkillScript({
        script: {
          entrypoint: 'x.sh',
          runtime: 'bash',
          cwd: 'aiwg-root',
        },
      })?.cwd,
    ).toBe('aiwg-root');
  });

  it('falls back to project-root for unknown cwd values', () => {
    const out = extractSkillScript({
      script: {
        entrypoint: 'x.py',
        runtime: 'python3',
        cwd: 'somewhere-weird',
      },
    });
    expect(out?.cwd).toBe('project-root');
  });

  it('preserves argsHint when provided', () => {
    const out = extractSkillScript({
      script: {
        entrypoint: 'x.py',
        runtime: 'python3',
        argsHint: '--input <path>',
      },
    });
    expect(out?.argsHint).toBe('--input <path>');
  });

  it('omits argsHint when not provided', () => {
    const out = extractSkillScript({
      script: { entrypoint: 'x.py', runtime: 'python3' },
    });
    expect(out).not.toHaveProperty('argsHint');
  });

  it('trims whitespace on entrypoint, runtime, and argsHint', () => {
    const out = extractSkillScript({
      script: {
        entrypoint: '  scripts/x.py  ',
        runtime: '  python3 ',
        argsHint: '  --foo bar  ',
      },
    });
    expect(out?.entrypoint).toBe('scripts/x.py');
    expect(out?.runtime).toBe('python3');
    expect(out?.argsHint).toBe('--foo bar');
  });
});
