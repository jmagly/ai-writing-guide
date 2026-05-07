import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const RLM_MODE_PATH = join('agentic/code/addons/rlm/skills/rlm-mode', 'SKILL.md');
const README_PATH = 'README.md';
const RELEASE_NOTES_PATH = join('docs/releases', 'v2026.2.3-announcement.md');

function staleContinuationFlag(command: 'rlm-query' | 'rlm-batch', flag: '--path' | '--pattern' | '--parallel'): RegExp {
  return new RegExp(`\\/${command}(?:[^\\n]*\\\\\\n\\s*)*[^\\n]*${flag}\\b`);
}

describe('rlm addon command surface', () => {
  let rlmMode = '';
  let readme = '';
  let releaseNotes = '';

  beforeAll(async () => {
    [rlmMode, readme, releaseNotes] = await Promise.all([
      readFile(RLM_MODE_PATH, 'utf-8'),
      readFile(README_PATH, 'utf-8'),
      readFile(RELEASE_NOTES_PATH, 'utf-8'),
    ]);
  });

  it('removes the nonexistent rlm-summarize command from the RLM mode skill', () => {
    expect(rlmMode).not.toContain('rlm-summarize');
    expect(rlmMode).toContain('--aggregate summarize');
  });

  it('keeps rlm-query examples aligned with the positional command interface', () => {
    expect(rlmMode).toContain('/rlm-query "{context-source}" "{query}" --depth {N}');
    expect(rlmMode).not.toMatch(staleContinuationFlag('rlm-query', '--path'));
    expect(rlmMode).not.toMatch(staleContinuationFlag('rlm-query', '--pattern'));
  });

  it('uses max-parallel for rlm-batch examples across canonical docs', () => {
    expect(rlmMode).toContain('/rlm-batch "{glob-pattern}" "{operation}" --max-parallel {N}');
    expect(rlmMode).toContain('--aggregate summarize --max-parallel {N}');

    for (const content of [rlmMode, readme, releaseNotes]) {
      expect(content).not.toMatch(staleContinuationFlag('rlm-batch', '--parallel'));
      expect(content).not.toMatch(staleContinuationFlag('rlm-batch', '--path'));
      expect(content).not.toMatch(staleContinuationFlag('rlm-batch', '--pattern'));
    }

    expect(readme).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
    expect(releaseNotes).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
  });
});