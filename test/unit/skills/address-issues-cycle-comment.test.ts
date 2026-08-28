import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  REQUIRED_SECTIONS,
  renderCycleComment,
  validateCycleComment,
} from '../../../agentic/code/frameworks/sdlc-complete/skills/address-issues/scripts/cycle-comment.mjs';

const cycle = {
  cycle: 2,
  status: 'Progress',
  actions: ['- Updated `src/example.ts:10`.', '- 12 targeted tests pass.'],
  checklist: ['- [x] Preserve the native goal context.', '- [ ] Verify main CI.'],
  blockers: 'None.',
  openQuestions: 'None.',
  nextSteps: 'Commit, push, and verify main CI.',
};

describe('address-issues AL CYCLE comment contract (#2206)', () => {
  it('renders the complete tracker payload for native-goal and resumed cycles', () => {
    const trackerPayload = renderCycleComment(cycle);
    expect(trackerPayload).toContain('**AL CYCLE #2 – Progress**');
    for (const section of REQUIRED_SECTIONS) expect(trackerPayload).toContain(`### ${section}`);
    expect(trackerPayload).toContain('`src/example.ts:10`');
    expect(validateCycleComment(trackerPayload)).toEqual({ valid: true, errors: [] });
  });

  it('rejects the terse resumed-cycle payload from the production regression', () => {
    const terse = '**AL CYCLE #2 – Progress**\n\nAuthorization is resolved. Work can proceed.';
    const result = validateCycleComment(terse);
    expect(result.valid).toBe(false);
    for (const section of REQUIRED_SECTIONS) {
      expect(result.errors).toContain(`required section is missing: ${section}`);
    }
  });

  it('rejects empty and placeholder-only required sections before tracker write', () => {
    const incomplete = renderCycleComment(cycle)
      .replace('None.\n\n### Open Questions', '\n\n### Open Questions')
      .replace('None.\n\n### Next Steps', '[None, or every question]\n\n### Next Steps');
    const result = validateCycleComment(incomplete);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('required section is empty: Blockers');
    expect(result.errors).toContain('required section contains placeholder text: Open Questions');
  });

  it('keeps deliberate suppression outside the renderer contract', () => {
    expect(validateCycleComment('')).toEqual({ valid: false, errors: ['comment is empty'] });
    // delivery.issue_comment_on_cycle=false skips rendering and tracker mutation entirely.
  });

  it('ships the identical validator in both packaged SDLC plugins', () => {
    const canonical = readFileSync(resolve('agentic/code/frameworks/sdlc-complete/skills/address-issues/scripts/cycle-comment.mjs'), 'utf8');
    const template = readFileSync(resolve('agentic/code/frameworks/sdlc-complete/templates/issue-comments/al-cycle.md'), 'utf8');
    for (const plugin of ['sdlc', 'codex-sdlc']) {
      expect(readFileSync(resolve(`agentic/code/plugins/${plugin}/skills/address-issues/scripts/cycle-comment.mjs`), 'utf8')).toBe(canonical);
      expect(readFileSync(resolve(`agentic/code/plugins/${plugin}/templates/issue-comments/al-cycle.md`), 'utf8')).toBe(template);
    }
  });
});
