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

describe('buildAgentsMd with overflow', () => {
  it('does not split when content is under threshold', () => {
    const opts: ContextPipelineOptions = {
      provider: 'codex',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('small')] }],
    };
    const built = buildAgentsMd(opts);
    expect(built.splitOccurred).toBe(false);
    expect(built.spilloverContent).toBe('');
  });

  it('splits when total exceeds threshold and emits spillover content', () => {
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
    expect(built.splitOccurred).toBe(true);
    expect(built.spilloverContent).toContain('## Agents');
    expect(built.spilloverContent).toContain('AIWG-managed spillover');
    expect(built.warnings.some((w) => w.includes('auto-split engaged'))).toBe(true);
  });
});

describe('twin-file emission per ADR-1 §4', () => {
  it('writes .hermes.md alongside AGENTS.md for hermes provider', async () => {
    const result = await generate({
      provider: 'hermes',
      projectPath: tmpDir,
      sections: [{ type: 'agents', entries: [makeEntry('foo')] }],
    });
    expect(result.twinPaths).toContain(path.join(tmpDir, '.hermes.md'));
    const hermes = await fs.readFile(path.join(tmpDir, '.hermes.md'), 'utf8');
    const agents = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf8');
    expect(hermes).toBe(agents);
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

describe('generate end-to-end with auto-split', () => {
  it('writes AGENTS.md + AGENTS.override.md spillover when content overflows', async () => {
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

    // AGENTS.override.md should exist with a spillover block.
    const overrideContent = await fs.readFile(
      path.join(tmpDir, 'AGENTS.override.md'),
      'utf8',
    );
    expect(overrideContent).toContain(SPILLOVER_START);
    expect(overrideContent).toContain(SPILLOVER_END);
    expect(overrideContent).toContain('## Agents');
  });

  it('preserves operator-authored AGENTS.override.md content across split runs', async () => {
    // Operator pre-existing content
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
    expect(after).toContain('important stuff that should never be touched');
    expect(after).toContain(SPILLOVER_START);
  });
});
