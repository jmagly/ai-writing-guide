import { describe, expect, it } from 'vitest';

import {
  resolveEnforcement,
  withEnforcement,
  TRIAGE,
} from '../../../tools/migrations/add-rule-enforcement-frontmatter.mjs';

describe('add-rule-enforcement-frontmatter migration', () => {
  it('resolves from a canonical enforcement frontmatter field', () => {
    const r = resolveEnforcement('---\nenforcement: critical\n---\n\n# X\n');
    expect(r).toEqual({ level: 'critical', source: 'enforcement-fm' });
  });

  it('resolves from a legacy level frontmatter field', () => {
    const r = resolveEnforcement('---\nname: x\nlevel: HIGH\n---\n\n# X\n');
    expect(r).toEqual({ level: 'high', source: 'level-fm' });
  });

  it('resolves from the body marker', () => {
    const r = resolveEnforcement('# Title\n\n**Enforcement Level**: MEDIUM\n');
    expect(r).toEqual({ level: 'medium', source: 'body' });
  });

  it('falls back to the audited triage map for unlabelled rules', () => {
    const r = resolveEnforcement('# Voice\n\nno level here', 'addons/voice-framework/rules/voice-framework.md');
    expect(r).toEqual({ level: 'medium', source: 'triage' });
  });

  it('returns null when a rule is unlabelled and not in the triage map', () => {
    expect(resolveEnforcement('# Mystery\n\nnothing', 'addons/x/rules/unknown.md').level).toBeNull();
  });

  it('prepends frontmatter to a body-only rule', () => {
    const out = withEnforcement('# Title\n\n**Enforcement Level**: HIGH\n', 'a/rules/t.md');
    expect(out.changed).toBe(true);
    expect(out.content.startsWith('---\nenforcement: high\n---\n')).toBe(true);
  });

  it('inserts the field into existing frontmatter without clobbering it', () => {
    const out = withEnforcement('---\nname: t\nlevel: HIGH\n---\n\n# T\n', 'a/rules/t.md');
    expect(out.content).toContain('enforcement: high');
    expect(out.content).toContain('name: t');
    expect(out.content).toContain('level: HIGH');
  });

  it('is idempotent — a file that already has enforcement is unchanged', () => {
    const src = '---\nenforcement: high\n---\n\n# T\n';
    expect(withEnforcement(src, 'a/rules/t.md').changed).toBe(false);
  });

  it('writes a self-describing body marker when correcting a triaged rule', () => {
    const out = withEnforcement('# Mention Wiring\n\nbody', 'frameworks/sdlc-complete/rules/mention-wiring.md');
    expect(out.source).toBe('triage');
    expect(out.content).toContain('**Enforcement Level**: MEDIUM'); // audited, written in-place
    expect(out.content).toContain('enforcement: medium'); // canonical frontmatter
  });

  it('triage map covers exactly the audited unlabelled set (4 high, 14 medium)', () => {
    const vals = Object.values(TRIAGE);
    expect(vals.filter((v) => v === 'high')).toHaveLength(4);
    expect(vals.filter((v) => v === 'medium')).toHaveLength(14);
    expect(vals.every((v) => v === 'high' || v === 'medium')).toBe(true);
  });
});
