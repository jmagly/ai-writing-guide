import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RELEASE_SKILLS = [
  'agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md',
  'agentic/code/plugins/codex-sdlc/skills/flow-release/SKILL.md',
  'agentic/code/plugins/sdlc/skills/flow-release/SKILL.md',
];

const DOC_SYNC_SKILLS = [
  'agentic/code/addons/aiwg-utils/skills/doc-sync/SKILL.md',
  'agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md',
  'agentic/code/plugins/codex-sdlc/skills/doc-sync/SKILL.md',
  'agentic/code/plugins/sdlc/skills/doc-sync/SKILL.md',
  'agentic/code/plugins/utils/skills/doc-sync/SKILL.md',
];

function skill(path: string): string {
  return readFileSync(resolve(path), 'utf8');
}

describe('split-root workflow contracts', () => {
  it.each(RELEASE_SKILLS)('%s resolves release state through the artifact root', (path) => {
    const content = skill(path);
    expect(content).toContain('`aiwg artifacts path`');
    expect(content).toContain('$AIWG_ARTIFACT_ROOT/release.config');
    expect(content).toContain('$AIWG_ARTIFACT_ROOT/releases/*.yaml');
    expect(content).toContain('Do not copy redirected payload back into the local control');
  });

  it.each(DOC_SYNC_SKILLS)('%s writes reports and state through the artifact root', (path) => {
    const content = skill(path);
    expect(content).toContain('run `aiwg artifacts path`');
    expect(content).toContain('$AIWG_ARTIFACT_ROOT/working/doc-sync/');
    expect(content).toContain('$AIWG_ARTIFACT_ROOT/reports/');
    expect(content).toContain('Never write these payloads to a literal project-local');
  });
});
