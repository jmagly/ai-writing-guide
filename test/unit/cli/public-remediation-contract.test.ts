import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildHandlerMap } from '../../../src/cli/handlers/index.js';

const ROOT = process.cwd();
const INTERNAL_ENTRYPOINT = /(?:npm\s+(?:run|install|ci)\b|npx\s+|node\s+tools\/)/;

interface Exemption {
  path: RegExp;
  text: RegExp;
  classification: 'bootstrap' | 'contributor' | 'embedded-dispatch' | 'external-command' | 'analogy';
  rationale: string;
}

// Exact categories where a public AIWG command cannot replace the entrypoint:
// package bootstrap/update, source-checkout development, generated internal
// dispatch, user-supplied external commands, or non-executable analogy text.
const EXEMPTIONS: Exemption[] = [
  { path: /^src\/channel\/manager\.mjs$/, text: /npm (?:run build|install -g aiwg)/, classification: 'bootstrap', rationale: 'channel switching and source checkout builds are the distribution mechanism' },
  { path: /^src\/update\/checker\.mjs$/, text: /npm install -g aiwg/, classification: 'bootstrap', rationale: 'self-update fallback repairs the base package itself' },
  { path: /^src\/update\/service\.mjs$/, text: /npm ci && npm run build/, classification: 'contributor', rationale: 'a source checkout must be built by its owner' },
  { path: /^src\/cli\/handlers\/session\.ts$/, text: /npm install -g aiwg/, classification: 'bootstrap', rationale: 'session recovery can repair a broken base install' },
  { path: /^src\/cli\/handlers\/use\.ts$/, text: /^'  npm install -g aiwg',$/, classification: 'bootstrap', rationale: 'switching from the corpus-free @aiwg/cli distribution to full aiwg requires package installation; self-update retains the current distribution' },
  { path: /^tools\/cli\/doctor\.mjs$/, text: /(?:npm install -g aiwg|npx aiwg)/, classification: 'bootstrap', rationale: 'doctor must recover when the public CLI install is missing or broken' },
  { path: /^tools\/cli\/doctor\.mjs$/, text: /npm run (?:build:cli|release:fortemi-index)/, classification: 'contributor', rationale: 'source and release-package maintenance only' },
  { path: /^src\/cli\/handlers\/ralph-launcher\.ts$/, text: /npm run build.*dev repo/, classification: 'contributor', rationale: 'explicit development-checkout recovery' },
  { path: /^src\/cli\/git-hooks\.ts$/, text: /node tools\/cli\/aiwg\.mjs workflow/, classification: 'embedded-dispatch', rationale: 'generated Git hook uses a repository-local deterministic entrypoint, not operator guidance' },
  { path: /^src\/smiths\/context-pipeline\/workspace-context\.ts$/, text: /npm run/, classification: 'embedded-dispatch', rationale: 'reports scripts owned by the target project; it does not remediate AIWG' },
  { path: /^src\/mcp\/cli\.mjs$/, text: /--command npx --args/, classification: 'external-command', rationale: 'example of an explicitly configured third-party MCP command' },
  { path: /^src\/cli\/handlers\/run\.ts$/, text: /modeled on `npm run`/, classification: 'analogy', rationale: 'describes AIWG script semantics and is not executable guidance' },
  { path: /^docs\/agents\/cli-reference\.md$/, text: /npm install -g aiwg/, classification: 'bootstrap', rationale: 'documents base-package installation and recovery' },
  { path: /^docs\/agents\/cli-reference\.md$/, text: /analogous to `npm run`/, classification: 'analogy', rationale: 'describes project-script semantics' },
  { path: /^docs\/agents\/cli-reference\.md$/, text: /(?:--command npx --args|--completion "npx )/, classification: 'external-command', rationale: 'user-selected external executable or completion criterion' },
];

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function candidates(): Array<{ path: string; line: number; text: string }> {
  const files = [
    ...walk(join(ROOT, 'src')).filter((file) => /\.(?:ts|mjs)$/.test(file) && !/\.(?:test|spec)\./.test(file)),
    join(ROOT, 'tools', 'cli', 'doctor.mjs'),
    join(ROOT, 'docs', 'security', 'context-memory-firewall.md'),
    join(ROOT, 'docs', 'agents', 'cli-reference.md'),
  ];
  return files.flatMap((file) => readFileSync(file, 'utf8').split('\n').flatMap((text, index) => {
    const trimmed = text.trim();
    if (!INTERNAL_ENTRYPOINT.test(text) || /^(?:\/\/|\/\*|\*)/.test(trimmed)) return [];
    return [{ path: relative(ROOT, file).replaceAll('\\', '/'), line: index + 1, text: trimmed }];
  }));
}

describe('public remediation contract', () => {
  it('classifies every internal entrypoint exposed by runtime and operator docs', () => {
    const unclassified = candidates().filter((candidate) => !EXEMPTIONS.some((exemption) =>
      exemption.path.test(candidate.path) && exemption.text.test(candidate.text),
    ));
    expect(
      unclassified.map((candidate) => `${candidate.path}:${candidate.line}: ${candidate.text}`),
      'Replace AIWG-owned remediation with a public `aiwg` command, or add a narrow, reasoned exemption.',
    ).toEqual([]);
  });

  it('keeps every exemption auditable', () => {
    for (const exemption of EXEMPTIONS) {
      expect(exemption.rationale.length).toBeGreaterThan(20);
      expect(['bootstrap', 'contributor', 'embedded-dispatch', 'external-command', 'analogy'])
        .toContain(exemption.classification);
    }
  });

  it('resolves every context-firewall remediation emitted by doctor', () => {
    const doctor = readFileSync(join(ROOT, 'tools', 'cli', 'doctor.mjs'), 'utf8');
    const commands = [...doctor.matchAll(/\\?`(aiwg context-firewall .*?)\\?`/g)]
      .map((match) => match[1]);
    expect(commands).toContain('aiwg context-firewall baseline --plan');
    expect(commands).toContain('aiwg context-firewall scan --provider claude');

    const handlers = buildHandlerMap();
    for (const command of commands) {
      const [, id] = command.split(/\s+/);
      expect(handlers.get(id)?.id, `Doctor remediation must resolve: ${command}`).toBe('context-firewall');
    }
  });
});
