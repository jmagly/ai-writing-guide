/**
 * Overflow / auto-split tests for AGENTS.md (PUW-029 / #1130).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  partitionForOverflow,
  injectSpilloverBlock,
  extractNonSpillover,
  SafetyCriticalOverflowError,
  SPILLOVER_START,
  SPILLOVER_END,
  buildAgentsMd,
  generate,
  type OverflowPriorityMap,
  type AgentsMdSection,
  type IndexEntry,
  type ContextPipelineOptions,
} from '../../../src/smiths/context-pipeline/index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-overflow-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeEntry(id: string, sizeFiller = 0, opts: Partial<IndexEntry> = {}): IndexEntry {
  return {
    id,
    description: `Description for ${id}` + 'x'.repeat(sizeFiller),
    path: `.codex/agents/${id}.md`,
    ...opts,
  };
}

describe('partitionForOverflow', () => {
  it('returns identity partition when total is under budget', () => {
    const sections: AgentsMdSection[] = [
      { type: 'agents', entries: [makeEntry('a'), makeEntry('b')] },
    ];
    const r = partitionForOverflow(sections, {}, 10_000);
    expect(r.splitOccurred).toBe(false);
    expect(r.spilloverSections).toEqual([]);
    expect(r.mainSections[0].entries).toHaveLength(2);
  });

  it('moves low-priority entries to spillover when over budget', () => {
    const heavy = (id: string) => makeEntry(id, 200);
    const sections: AgentsMdSection[] = [
      {
        type: 'agents',
        entries: [heavy('low-1'), heavy('high-1'), heavy('low-2')],
      },
    ];
    const map: OverflowPriorityMap = {
      'high-1': 1,
      'low-1': 3,
      'low-2': 3,
    };
    const r = partitionForOverflow(sections, map, 500);
    expect(r.splitOccurred).toBe(true);
    expect(r.mainSections[0].entries.some((e) => e.id === 'high-1')).toBe(true);
    const spilledIds = r.spilloverSections[0].entries.map((e) => e.id).sort();
    expect(spilledIds).toEqual(['low-1', 'low-2']);
  });

  it('pins safety-critical entries to main regardless of map', () => {
    const sections: AgentsMdSection[] = [
      {
        type: 'rules',
        entries: [
          makeEntry('human-authorization', 100, { safetyCritical: true }),
          makeEntry('plain-rule', 100),
        ],
      },
    ];
    // Map says human-authorization is priority 3 (would normally overflow first),
    // but safety-critical pinning overrides.
    const map: OverflowPriorityMap = { 'human-authorization': 3, '*': 3 };
    const r = partitionForOverflow(sections, map, 200);
    const mainIds = r.mainSections.flatMap((s) => s.entries.map((e) => e.id));
    expect(mainIds).toContain('human-authorization');
  });

  it('throws SafetyCriticalOverflowError when priority-1 alone exceeds 32KB', () => {
    // Build many large safety-critical entries to overflow the 32KB cap.
    const entries: IndexEntry[] = [];
    for (let i = 0; i < 500; i++) {
      entries.push(makeEntry(`critical-${i}`, 200, { safetyCritical: true }));
    }
    expect(() =>
      partitionForOverflow([{ type: 'rules', entries }], {}),
    ).toThrow(SafetyCriticalOverflowError);
  });

  it('respects wildcard default in priority map', () => {
    const sections: AgentsMdSection[] = [
      {
        type: 'agents',
        entries: [makeEntry('a', 200), makeEntry('b', 200), makeEntry('c', 200)],
      },
    ];
    const map: OverflowPriorityMap = { 'a': 1, '*': 3 };
    const r = partitionForOverflow(sections, map, 500);
    expect(r.splitOccurred).toBe(true);
    const mainIds = r.mainSections.flatMap((s) => s.entries.map((e) => e.id));
    expect(mainIds).toContain('a');
  });
});

describe('injectSpilloverBlock', () => {
  it('appends a fresh spillover block to operator content', () => {
    const updated = injectSpilloverBlock(
      '# AGENTS.override.md\n\nMy operator content.\n',
      '## Agents\n- entry x\n',
    );
    expect(updated).toContain('My operator content.');
    expect(updated).toContain(SPILLOVER_START);
    expect(updated).toContain(SPILLOVER_END);
    expect(updated).toContain('entry x');
  });

  it('replaces an existing spillover block in place', () => {
    const original =
      `# AGENTS.override.md\n\noperator content\n\n${SPILLOVER_START}\nold spillover\n${SPILLOVER_END}\nfooter\n`;
    const updated = injectSpilloverBlock(original, 'new spillover');
    expect(updated).toContain('operator content');
    expect(updated).toContain('footer');
    expect(updated).toContain('new spillover');
    expect(updated).not.toContain('old spillover');
  });

  it('preserves operator content byte-for-byte across runs', () => {
    const operator = '# AGENTS.override.md\n\nVERY important operator content with `code` and stuff.\n';
    const once = injectSpilloverBlock(operator, 'a');
    const twice = injectSpilloverBlock(once, 'b');
    expect(twice).toContain('VERY important operator content');
    // Run a third time idempotently and confirm we don't accumulate cruft.
    const thrice = injectSpilloverBlock(twice, 'b');
    expect(thrice.match(/VERY important/g)).toHaveLength(1);
  });
});

describe('extractNonSpillover', () => {
  it('returns content unchanged when no spillover block exists', () => {
    const r = extractNonSpillover('plain operator content\n');
    expect(r).toBe('plain operator content\n');
  });

  it('strips the spillover block and returns operator content', () => {
    const content = `header\n\n${SPILLOVER_START}\nspilled\n${SPILLOVER_END}\nfooter\n`;
    const r = extractNonSpillover(content);
    expect(r).not.toContain('spilled');
    expect(r).toContain('header');
    expect(r).toContain('footer');
  });
});

describe('buildAgentsMd thin-pointer body (#1239)', () => {
  it('never splits or emits spillover, even with hundreds of sections entries', () => {
    // Post-#1239 the AGENTS.md body is a thin pointer to AIWG.md and ignores
    // opts.sections entirely. Auto-split is dead in the happy path because
    // the body cannot grow with deploy size.
    const entries: IndexEntry[] = [];
    for (let i = 0; i < 300; i++) {
      entries.push(makeEntry(`entry-${i}`, 100));
    }
    const opts: ContextPipelineOptions = {
      provider: 'codex',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries }],
      overflowPriorityMap: { '*': 3 },
    };
    const built = buildAgentsMd(opts);
    expect(built.splitOccurred).toBe(false);
    expect(built.spilloverContent).toBe('');
    expect(built.warnings).toEqual([]);
    expect(Buffer.byteLength(built.content, 'utf8')).toBeLessThan(4 * 1024);
  });
});

describe('twin-file emission per ADR-1 §4', () => {
  it('writes .hermes.md alongside AGENTS.md, with Hermes-specific MCP suffix (#1242)', async () => {
    const result = await generate({
      provider: 'hermes',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('foo')] }],
    });
    expect(result.twinPaths).toContain(path.join(tmpDir, '.hermes.md'));
    const hermes = await fs.readFile(path.join(tmpDir, '.hermes.md'), 'utf8');
    const agents = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');

    // The twin diverges from AGENTS.md by appending the Hermes-MCP suffix.
    // AGENTS.md must remain the cross-platform thin pointer (no Hermes-isms).
    expect(hermes).not.toBe(agents);
    expect(agents).not.toContain('## For Hermes Sessions');

    // Hermes twin must start with the AGENTS.md body and append the suffix.
    expect(hermes.startsWith(agents)).toBe(true);
    expect(hermes).toContain('## For Hermes Sessions');
    expect(hermes).toContain('artifact-read AIWG.md');
    expect(hermes).toContain('aiwg discover');
    expect(hermes).toContain('delegate_task');

    // Total stays comfortably inside Hermes's <1,000-char turn-budget target.
    expect(Buffer.byteLength(hermes, 'utf8')).toBeLessThan(1024);
  });

  it('writes WARP.md alongside AGENTS.md for warp provider', async () => {
    const result = await generate({
      provider: 'warp',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('foo')] }],
    });
    expect(result.twinPaths).toContain(path.join(tmpDir, 'WARP.md'));
    const warp = await fs.readFile(path.join(tmpDir, 'WARP.md'), 'utf8');
    const agents = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    expect(warp).toBe(agents);
  });

  it('does not write twin files for codex', async () => {
    const result = await generate({
      provider: 'codex',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('foo')] }],
    });
    expect(result.twinPaths).toEqual([]);
  });

  it('respects detectExistingFiles guard for twin files', async () => {
    // Pre-existing operator-claimed .hermes.md (no AIWG signature).
    await fs.writeFile(path.join(tmpDir, '.hermes.md'), '# Operator content\n', 'utf8');
    const result = await generate({
      provider: 'hermes',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('foo')] }],
      detectExistingFiles: true,
    });
    // Twin should not be in twinPaths (refused to overwrite).
    expect(result.twinPaths).toEqual([]);
    // Operator content preserved.
    const hermes = await fs.readFile(path.join(tmpDir, '.hermes.md'), 'utf8');
    expect(hermes).toBe('# Operator content\n');
    expect(result.warnings.some((w) => w.includes('.hermes.md exists'))).toBe(true);
  });
});

describe('generate end-to-end thin-pointer (#1239)', () => {
  it('writes a small AGENTS.md and never creates an AGENTS.override.md spillover block on a clean repo', async () => {
    const entries: IndexEntry[] = [];
    for (let i = 0; i < 300; i++) {
      entries.push(makeEntry(`auto-entry-${String(i).padStart(3, '0')}`, 100));
    }

    const result = await generate({
      provider: 'codex',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries }],
      overflowPriorityMap: { '*': 3 },
    });

    expect(result.agentsMdPath).toContain('AGENTS.md');
    expect(result.warnings).toEqual([]);

    const agentsContent = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    expect(Buffer.byteLength(agentsContent, 'utf8')).toBeLessThan(4 * 1024);
    expect(agentsContent).not.toContain('## Agents');
    expect(agentsContent).not.toContain('auto-entry-');

    // No spillover should be written by the happy path.
    await expect(
      fs.readFile(path.join(tmpDir, 'AGENTS.override.md'), 'utf8'),
    ).rejects.toThrow();
  });

  it('preserves operator-authored AGENTS.override.md content across runs', async () => {
    const operatorContent =
      '# AGENTS.override.md\n\n## Operator notes\n\nimportant stuff that should never be touched\n';
    await fs.writeFile(path.join(tmpDir, 'AGENTS.override.md'), operatorContent, 'utf8');

    const entries: IndexEntry[] = [];
    for (let i = 0; i < 300; i++) {
      entries.push(makeEntry(`xe-${i}`, 100));
    }

    await generate({
      provider: 'codex',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries }],
      overflowPriorityMap: { '*': 3 },
    });

    const after = await fs.readFile(path.join(tmpDir, 'AGENTS.override.md'), 'utf8');
    expect(after).toBe(operatorContent);
    expect(after).not.toContain(SPILLOVER_START);
  });
});
