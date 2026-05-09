/**
 * RLM canonical command surface contract test (Gitea #1192).
 *
 * Derives the authoritative command surface from each shipped SKILL.md's
 * `commandHint.argumentHint` frontmatter field and verifies that every
 * `/rlm-<name>` invocation in addon docs uses only flags declared by the
 * matching skill. References to commands without a corresponding SKILL.md
 * fail — this catches the `rlm-summarize` class of drift.
 */

import { describe, expect, it, beforeAll } from 'vitest';
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import { parse as parseYaml } from 'yaml';

const SKILL_GLOB = 'agentic/code/addons/rlm/skills/*/SKILL.md';
const DOC_GLOBS = [
  'agentic/code/addons/rlm/**/*.md',
  'agentic/code/addons/rlm/manifest.json',
  'README.md',
  'docs/releases/*.md',
];

interface SkillSurface {
  name: string;
  flags: Set<string>;
  hasArgumentHint: boolean;
}

interface Invocation {
  command: string;
  flags: string[];
  file: string;
  line: number;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n/;
const FLAG_RE = /--[a-zA-Z][a-zA-Z0-9-]*/g;
// Match /rlm-<name> at start of a slash-command invocation. Anchored so we
// don't match URLs like https://example.com/rlm-foo.
const INVOCATION_RE = /(?:^|\s|`|\()\/(rlm-[a-zA-Z][a-zA-Z0-9-]*)\b([^\n`]*)/gm;

function extractFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  try {
    return parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractFlags(argumentHint: string | undefined): Set<string> {
  if (!argumentHint) return new Set();
  const flags = argumentHint.match(FLAG_RE) ?? [];
  return new Set(flags);
}

async function loadSkillSurfaces(): Promise<Map<string, SkillSurface>> {
  const files = await glob(SKILL_GLOB, { nodir: true });
  const surfaces = new Map<string, SkillSurface>();

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const fm = extractFrontmatter(content);
    if (!fm) continue;
    const name = fm.name as string | undefined;
    if (!name) continue;

    const commandHint = fm.commandHint as Record<string, unknown> | undefined;
    const argumentHint = commandHint?.argumentHint as string | undefined;

    surfaces.set(name, {
      name,
      flags: extractFlags(argumentHint),
      hasArgumentHint: Boolean(argumentHint),
    });
  }

  return surfaces;
}

function findInvocations(content: string, file: string): Invocation[] {
  const invocations: Invocation[] = [];
  const lines = content.split('\n');

  // Collapse continuation lines: `/rlm-batch "..." \\\n  --flag` should be
  // analyzed as a single invocation.
  let buffer = '';
  let bufferStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (buffer === '' && line.match(/\/rlm-/)) {
      buffer = line;
      bufferStartLine = i + 1;
    } else if (buffer !== '') {
      buffer += ' ' + line;
    }

    // End buffer on blank line, code-fence, or no trailing backslash.
    const continuesNext = line.endsWith('\\');
    if (buffer && !continuesNext) {
      // Process buffered invocation(s).
      INVOCATION_RE.lastIndex = 0;
      let match;
      while ((match = INVOCATION_RE.exec(buffer)) !== null) {
        const command = match[1];
        const tail = match[2];
        const flags = (tail.match(FLAG_RE) ?? []) as string[];
        invocations.push({
          command,
          flags,
          file,
          line: bufferStartLine,
        });
      }
      buffer = '';
    }
  }

  return invocations;
}

describe('rlm canonical command surface contract', () => {
  let surfaces: Map<string, SkillSurface>;
  let docFiles: string[];

  beforeAll(async () => {
    surfaces = await loadSkillSurfaces();
    docFiles = (await Promise.all(DOC_GLOBS.map((g) => glob(g, { nodir: true })))).flat();
    expect(surfaces.size).toBeGreaterThan(0);
    expect(docFiles.length).toBeGreaterThan(0);
  });

  it('parses argumentHint from at least rlm-batch and rlm-query skills', () => {
    const batch = surfaces.get('rlm-batch');
    const query = surfaces.get('rlm-query');
    expect(batch?.hasArgumentHint).toBe(true);
    expect(query?.hasArgumentHint).toBe(true);
    expect(batch?.flags).toContain('--max-parallel');
    expect(batch?.flags).toContain('--aggregate');
    expect(query?.flags).toContain('--depth');
  });

  it('declares the index-integration flags from #1206 (--neighbors-of, --direction, --graph)', () => {
    // Gitea #1206: graph-bounded recursion via the artifact index.
    for (const skill of ['rlm-query', 'rlm-batch'] as const) {
      const surface = surfaces.get(skill);
      expect(surface?.flags, `${skill} must declare --neighbors-of`).toContain('--neighbors-of');
      expect(surface?.flags, `${skill} must declare --direction`).toContain('--direction');
      expect(surface?.flags, `${skill} must declare --graph`).toContain('--graph');
    }
  });

  it('every /rlm-<name> reference points to a real shipped skill', async () => {
    const violations: string[] = [];
    for (const file of docFiles) {
      const content = await readFile(file, 'utf-8');
      const invocations = findInvocations(content, file);
      for (const inv of invocations) {
        if (!surfaces.has(inv.command)) {
          violations.push(`${inv.file}:${inv.line} — unknown command /${inv.command}`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('every flag in /rlm-batch and /rlm-query examples is declared in the skill argumentHint', async () => {
    // Deprecated aliases that are accepted by skills but documented separately
    // (Gitea #1195). Don't flag examples in deprecation-note prose where the
    // alias is mentioned alongside the canonical flag.
    const deprecatedAliasesPerSkill: Record<string, Set<string>> = {
      // rlm-batch: no deprecated aliases on this skill itself
      // rlm-query: no deprecated aliases on this skill itself
    };

    const enforcedCommands = ['rlm-batch', 'rlm-query'] as const;
    const violations: string[] = [];

    for (const file of docFiles) {
      const content = await readFile(file, 'utf-8');
      const invocations = findInvocations(content, file);

      for (const inv of invocations) {
        if (!enforcedCommands.includes(inv.command as 'rlm-batch' | 'rlm-query')) continue;

        const surface = surfaces.get(inv.command);
        if (!surface || !surface.hasArgumentHint) continue;

        const aliases = deprecatedAliasesPerSkill[inv.command] ?? new Set();

        for (const flag of inv.flags) {
          if (!surface.flags.has(flag) && !aliases.has(flag)) {
            violations.push(
              `${inv.file}:${inv.line} — /${inv.command} uses undeclared flag ${flag} ` +
                `(canonical surface: ${[...surface.flags].sort().join(', ') || 'no flags'})`,
            );
          }
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('rlm-mode SKILL.md uses commands that all exist as shipped skills', async () => {
    const rlmMode = await readFile('agentic/code/addons/rlm/skills/rlm-mode/SKILL.md', 'utf-8');
    const invocations = findInvocations(rlmMode, 'rlm-mode/SKILL.md');
    const referenced = new Set(invocations.map((inv) => inv.command));
    for (const command of referenced) {
      expect(
        surfaces.has(command),
        `rlm-mode/SKILL.md references /${command} which has no matching skill`,
      ).toBe(true);
    }
  });
});
