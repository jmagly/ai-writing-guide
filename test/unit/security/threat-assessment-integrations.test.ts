import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('shared threat-assessment workflow integrations', () => {
  it('routes issue compatibility wrappers to one canonical engine', () => {
    const canonical = read('agentic/code/frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs');
    const sdlcMirror = read('agentic/code/plugins/sdlc/skills/address-issues-threat-assess/scripts/assess.mjs');
    const codexMirror = read('agentic/code/plugins/codex-sdlc/skills/address-issues-threat-assess/scripts/assess.mjs');
    expect(canonical).toContain('tools/security/threat-assessment.mjs');
    expect(sdlcMirror).toContain("from '../../../tools/security/threat-assessment.mjs'");
    expect(read('agentic/code/plugins/sdlc/tools/security/threat-assessment.mjs')).toContain('export function assessThreat');
    expect(codexMirror).toContain('frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs');
    expect(sdlcMirror).not.toContain('credential-or-env-probing');
    expect(codexMirror).not.toContain('credential-or-env-probing');
  });

  it('gates PR/review and outbound comment workflows', () => {
    const pr = read('agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md');
    const issues = read('agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md');
    const maintainer = read('agentic/code/extensions/repo-maintainer/skills/repo-maintainer.md');
    for (const surface of [
      'pull-request-title',
      'pull-request-body',
      'pull-request-diff-summary',
      'review-comment',
      'outbound-maintainer-comment',
    ]) {
      expect(`${pr}\n${issues}\n${maintainer}`).toContain(surface);
    }
    expect(maintainer).toContain('tools/security/threat-assessment.mjs');
  });

  it('surfaces invalid or default policy through doctor', () => {
    const doctor = read('tools/cli/doctor.mjs');
    expect(doctor).toContain("validateThreatAssessmentConfig(raw.security?.threatAssessment)");
    expect(doctor).toContain("check('Threat Assessment Policy', 'error'");
    expect(doctor).toContain("const profile = policy?.defaultProfile || 'balanced'");
  });

  it('places release-note and handoff gates in declarative source-of-truth flows', () => {
    const release = read('agentic/code/frameworks/sdlc-complete/flows/flow-release.playbook.yaml');
    const handoff = read('agentic/code/frameworks/sdlc-complete/flows/flow-handoff-checklist.playbook.yaml');
    const capability = read('agentic/code/frameworks/sdlc-complete/flows/capabilities/threat-assessment.yaml');
    expect(release).toContain('surface\n          value: release-note');
    expect(handoff).toContain('surface\n          value: handoff');
    expect(release).toContain('capability: threat-assessment');
    expect(handoff).toContain('capability: threat-assessment');
    expect(capability).toContain('control: deterministic-pre-action');
  });

  it('keeps canonical and deployed prose mirrors synchronized on policy routing', () => {
    const groups = [
      [
        'agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md',
        'agentic/code/plugins/sdlc/skills/address-issues/SKILL.md',
        'agentic/code/plugins/codex-sdlc/skills/address-issues/SKILL.md',
      ],
      [
        'agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md',
        'agentic/code/plugins/sdlc/skills/flow-release/SKILL.md',
        'agentic/code/plugins/codex-sdlc/skills/flow-release/SKILL.md',
      ],
      [
        'agentic/code/frameworks/sdlc-complete/skills/flow-handoff-checklist/SKILL.md',
        'agentic/code/plugins/sdlc/skills/flow-handoff-checklist/SKILL.md',
        'agentic/code/plugins/codex-sdlc/skills/flow-handoff-checklist/SKILL.md',
      ],
    ];
    for (const group of groups) {
      const contents = group.map(read);
      expect(contents[1]).toBe(contents[0]);
      expect(contents[2]).toBe(contents[0]);
    }
  });
});
