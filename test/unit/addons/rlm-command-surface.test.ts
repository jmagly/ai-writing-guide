import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

const RLM_MODE_PATH = join('agentic/code/addons/rlm/skills/rlm-mode', 'SKILL.md');
const README_PATH = 'README.md';
const RELEASE_NOTES_PATH = join('docs/releases', 'v2026.2.3-announcement.md');

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
    expect(rlmMode).not.toMatch(/\/rlm-query[^\n]*--path\b/);
    expect(rlmMode).not.toMatch(/\/rlm-query[^\n]*--pattern\b/);
  });

  it('uses max-parallel for rlm-batch examples across canonical docs', () => {
    expect(rlmMode).toContain('/rlm-batch "{glob-pattern}" "{operation}" --max-parallel {N}');
    expect(rlmMode).toContain('--aggregate summarize --max-parallel {N}');

    for (const content of [rlmMode, readme, releaseNotes]) {
      expect(content).not.toMatch(/\/rlm-batch[^\n]*--parallel\b/);
      expect(content).not.toMatch(/\/rlm-batch[^\n]*--path\b/);
      expect(content).not.toMatch(/\/rlm-batch[^\n]*--pattern\b/);
    }

    expect(readme).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
    expect(releaseNotes).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
  });
});