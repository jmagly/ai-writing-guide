/**
 * opencode rules → opencode.json instructions[] wiring (#1548).
 *
 * OpenCode loads rule content via the `instructions` array in opencode.json.
 * AIWG deploys rules to .opencode/rule/ but they're inert unless referenced
 * there. mergeOpenCodeInstructions wires a rule-dir glob + AGENTS.md
 * non-destructively. These tests lock: create-when-absent, merge-preserving-
 * operator-config, dedupe/no-op-when-wired, malformed-skip, and dry-run.
 *
 * @issue #1548
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// @ts-expect-error — provider is plain .mjs without types
import { mergeOpenCodeInstructions } from '../../../tools/agents/providers/opencode.mjs';

let dir: string;
const RULE_GLOB = '.opencode/rule/*.md';

function readConfig(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(dir, 'opencode.json'), 'utf8'));
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-oc-instr-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('mergeOpenCodeInstructions (#1548)', () => {
  it('creates opencode.json with the rule glob + AGENTS.md when absent', () => {
    const changed = mergeOpenCodeInstructions(dir, {});
    expect(changed).toBe(true);
    const cfg = readConfig();
    expect(cfg.instructions).toEqual([RULE_GLOB, 'AGENTS.md']);
  });

  it('merges into an existing opencode.json, preserving operator keys + entries', () => {
    fs.writeFileSync(
      path.join(dir, 'opencode.json'),
      JSON.stringify({ theme: 'dark', instructions: ['CONTRIBUTING.md'] }, null, 2),
      'utf8',
    );
    const changed = mergeOpenCodeInstructions(dir, {});
    expect(changed).toBe(true);
    const cfg = readConfig();
    // Operator key survives
    expect(cfg.theme).toBe('dark');
    // Existing entry preserved, AIWG entries appended
    expect(cfg.instructions).toEqual(['CONTRIBUTING.md', RULE_GLOB, 'AGENTS.md']);
  });

  it('is a no-op (no duplication) when already wired', () => {
    fs.writeFileSync(
      path.join(dir, 'opencode.json'),
      JSON.stringify({ instructions: [RULE_GLOB, 'AGENTS.md'] }, null, 2),
      'utf8',
    );
    const changed = mergeOpenCodeInstructions(dir, {});
    expect(changed).toBe(false);
    expect(readConfig().instructions).toEqual([RULE_GLOB, 'AGENTS.md']);
  });

  it('adds only the missing entry when one is already present', () => {
    fs.writeFileSync(
      path.join(dir, 'opencode.json'),
      JSON.stringify({ instructions: ['AGENTS.md'] }, null, 2),
      'utf8',
    );
    mergeOpenCodeInstructions(dir, {});
    expect(readConfig().instructions).toEqual(['AGENTS.md', RULE_GLOB]);
  });

  it('leaves a malformed opencode.json untouched (warn, skip — never clobber)', () => {
    const malformed = '{ this is not json';
    fs.writeFileSync(path.join(dir, 'opencode.json'), malformed, 'utf8');
    const changed = mergeOpenCodeInstructions(dir, {});
    expect(changed).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'opencode.json'), 'utf8')).toBe(malformed);
  });

  it('dry-run does not write the file', () => {
    const changed = mergeOpenCodeInstructions(dir, { dryRun: true });
    expect(changed).toBe(true); // reports it would change
    expect(fs.existsSync(path.join(dir, 'opencode.json'))).toBe(false);
  });
});
