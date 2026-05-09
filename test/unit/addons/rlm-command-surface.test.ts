import { beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';

const RLM_MODE_PATH = join('agentic/code/addons/rlm/skills/rlm-mode', 'SKILL.md');
const README_PATH = 'README.md';
const RELEASE_NOTES_PATH = join('docs/releases', 'v2026.2.3-announcement.md');

// Files where stale RLM command patterns must never appear.
// Glob the whole RLM addon plus repo-wide README and release notes.
const STALE_PATTERN_GLOBS = [
  'agentic/code/addons/rlm/**/*.md',
  'agentic/code/addons/rlm/manifest.json',
  'docs/releases/*.md',
  'README.md',
];

// rlm-batch and rlm-query specifically must not use these legacy flags.
// fanout and rlm-search are explicitly excluded — they ship --parallel as a
// real flag (Gitea #1195 tracks that separate inconsistency).
const LEGACY_FLAG_COMMANDS = ['rlm-query', 'rlm-batch'] as const;
const LEGACY_FLAGS = ['--path', '--pattern', '--parallel'] as const;

function staleFlagPattern(
  command: 'rlm-query' | 'rlm-batch',
  flag: '--path' | '--pattern' | '--parallel',
): RegExp {
  // Match a slash-command invocation that uses the legacy flag, allowing
  // backslash line-continuations between command and flag.
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

  it('removes the nonexistent rlm-summarize slash-command from canonical RLM docs', () => {
    // Tightened trip-wire (Gitea #1193): match only slash-command invocations,
    // not narrative mentions of the historical name.
    expect(rlmMode).not.toMatch(/\/rlm-summarize\b/);
    expect(rlmMode).toContain('--aggregate summarize');
  });

  it('keeps rlm-query examples aligned with the positional command interface', () => {
    expect(rlmMode).toContain('/rlm-query "{context-source}" "{query}" --depth {N}');
    for (const flag of LEGACY_FLAGS) {
      expect(rlmMode).not.toMatch(staleFlagPattern('rlm-query', flag));
    }
  });

  it('uses max-parallel for rlm-batch examples across canonical docs', () => {
    expect(rlmMode).toContain('/rlm-batch "{glob-pattern}" "{operation}" --max-parallel {N}');
    expect(rlmMode).toContain('--aggregate summarize --max-parallel {N}');

    for (const content of [rlmMode, readme, releaseNotes]) {
      for (const flag of LEGACY_FLAGS) {
        expect(content).not.toMatch(staleFlagPattern('rlm-batch', flag));
      }
    }

    expect(readme).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
    expect(releaseNotes).toContain('/rlm-batch "src/components/*.tsx" "Add TypeScript types" --max-parallel 4');
  });

  it('finds no slash-command invocation of /rlm-summarize anywhere in scoped docs', async () => {
    // Gitea #1191: extend the regression test to all RLM addon docs and the
    // repo-wide README + release notes.
    const files = (
      await Promise.all(STALE_PATTERN_GLOBS.map((pattern) => glob(pattern, { nodir: true })))
    ).flat();
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      expect(
        content,
        `${file} should not invoke the nonexistent /rlm-summarize command`,
      ).not.toMatch(/\/rlm-summarize\b/);
    }
  });

  it('finds no rlm-query/rlm-batch invocations using the legacy --path/--pattern/--parallel flags', async () => {
    const files = (
      await Promise.all(STALE_PATTERN_GLOBS.map((pattern) => glob(pattern, { nodir: true })))
    ).flat();
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      for (const command of LEGACY_FLAG_COMMANDS) {
        for (const flag of LEGACY_FLAGS) {
          const pattern = staleFlagPattern(command, flag);
          expect(
            content,
            `${file} should not invoke /${command} with legacy flag ${flag}`,
          ).not.toMatch(pattern);
        }
      }
    }
  });
});
