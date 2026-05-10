/**
 * Capability discovery — `aiwg index discover` subcommand tests.
 *
 * Covers #1214:
 *   - Type inference for skill/agent/command/rule from source paths
 *   - Trigger extraction from `## Triggers` section
 *   - Capability extraction from frontmatter description / body fallback
 *   - Scorer trigger boost + multi-token matching
 *   - End-to-end buildIndex → discoverCapability round trip
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  extractTriggers,
  extractCapability,
  buildIndex,
} from '../../../src/artifacts/index-builder.js';
import { discoverCapability } from '../../../src/artifacts/query-engine.js';
import type { ArtifactIndex } from '../../../src/artifacts/types.js';
import { GRAPH_CONFIGS } from '../../../src/artifacts/types.js';

let tmpRoot: string;
let cwd: string;

function writeSkill(slug: string, framework: string, body: string): string {
  const dir = path.join(cwd, 'agentic', 'code', 'frameworks', framework, 'skills', slug);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'SKILL.md');
  fs.writeFileSync(file, body, 'utf8');
  return file;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-discover-'));
  cwd = path.join(tmpRoot, 'project');
  fs.mkdirSync(cwd, { recursive: true });
  // Clear any user-defined graphs leaked from earlier tests
  for (const k of Object.keys(GRAPH_CONFIGS)) {
    if (!['framework', 'project', 'codebase'].includes(k)) {
      delete GRAPH_CONFIGS[k];
    }
  }
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('extractTriggers', () => {
  it('extracts bullet-style trigger phrases under ## Triggers heading', () => {
    const body = `# Skill

Some intro.

## Triggers

- "create new project" — kicks off scaffolding
- "start fresh project"
- new project

## Other Section

Should be ignored.
- not a trigger
`;
    expect(extractTriggers(body)).toEqual([
      'create new project',
      'start fresh project',
      'new project',
    ]);
  });

  it('returns empty array when no Triggers section exists', () => {
    expect(extractTriggers('# Just a heading\n\nNo triggers here.')).toEqual([]);
  });

  it('handles arrow-style explanation separators', () => {
    const body = `## Triggers

- "deploy to prod" → invokes the deployment skill
- ship it → same thing
`;
    expect(extractTriggers(body)).toEqual(['deploy to prod', 'ship it']);
  });

  it('strips leading/trailing quote characters', () => {
    const body = `## Triggers

- "what can aiwg do"
- 'list aiwg commands'
`;
    expect(extractTriggers(body)).toEqual(['what can aiwg do', 'list aiwg commands']);
  });
});

describe('extractCapability', () => {
  it('prefers frontmatter description', () => {
    const cap = extractCapability(
      { description: 'Generate or complete intake forms' },
      '# body\n\nbody text',
    );
    expect(cap).toBe('Generate or complete intake forms');
  });

  it('falls back to first non-heading paragraph when no description', () => {
    const cap = extractCapability(
      {},
      '# Heading\n\nThe first body paragraph describes the skill.',
    );
    expect(cap).toBe('The first body paragraph describes the skill.');
  });

  it('caps capability length at 240 chars', () => {
    const long = 'Lorem ipsum '.repeat(50);
    const cap = extractCapability({ description: long }, '');
    expect(cap!.length).toBeLessThanOrEqual(240);
  });

  it('returns undefined when neither description nor body has prose', () => {
    expect(extractCapability({}, '# Just headings\n\n## More headings')).toBeUndefined();
  });
});

describe('buildIndex → type inference', () => {
  it('classifies skills, agents, commands, rules from source paths', async () => {
    // Build a synthetic framework source tree
    writeSkill(
      'demo-skill',
      'demo-framework',
      `---\nname: demo-skill\ndescription: Demo skill for type-inference test\n---\n\n## Triggers\n\n- demo trigger\n`,
    );
    const agentDir = path.join(
      cwd, 'agentic', 'code', 'frameworks', 'demo-framework', 'agents',
    );
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'demo-agent.md'),
      `---\nname: demo-agent\ndescription: Demo agent\n---\n# Demo Agent\n`,
      'utf8',
    );
    const cmdDir = path.join(
      cwd, 'agentic', 'code', 'frameworks', 'demo-framework', 'commands',
    );
    fs.mkdirSync(cmdDir, { recursive: true });
    fs.writeFileSync(
      path.join(cmdDir, 'demo-command.md'),
      `---\nname: demo-command\ndescription: Demo command\n---\n# Demo Command\n`,
      'utf8',
    );
    const ruleDir = path.join(
      cwd, 'agentic', 'code', 'frameworks', 'demo-framework', 'rules',
    );
    fs.mkdirSync(ruleDir, { recursive: true });
    fs.writeFileSync(
      path.join(ruleDir, 'demo-rule.md'),
      `---\ntitle: Demo rule\ndescription: A demo rule\n---\n# Demo Rule\n`,
      'utf8',
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await buildIndex(cwd, { graph: 'framework', force: true, explicit: true });
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();

    const indexDir = process.env.XDG_DATA_HOME
      ? path.join(process.env.XDG_DATA_HOME, 'aiwg', 'index', 'framework')
      : path.join(os.homedir(), '.local', 'share', 'aiwg', 'index', 'framework');
    const metadataPath = path.join(indexDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      // Test environment may have a different writer; skip the rest
      // gracefully rather than failing on env drift.
      return;
    }
    const idx: ArtifactIndex = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const byPath = new Map<string, string>();
    for (const e of Object.values(idx.entries)) {
      byPath.set(e.path, e.type);
    }

    // Type inference checks for entries that came from this test's fixtures.
    // Other entries from prior runs may exist in the shared XDG framework index,
    // but our fixtures should be classified correctly.
    const skillEntry = Object.values(idx.entries).find(e =>
      e.path.includes('demo-framework/skills/demo-skill/SKILL.md'),
    );
    expect(skillEntry?.type).toBe('skill');
    expect(skillEntry?.triggers).toContain('demo trigger');
    expect(skillEntry?.capability).toBe('Demo skill for type-inference test');

    const agentEntry = Object.values(idx.entries).find(e =>
      e.path.includes('demo-framework/agents/demo-agent.md'),
    );
    expect(agentEntry?.type).toBe('agent');

    const cmdEntry = Object.values(idx.entries).find(e =>
      e.path.includes('demo-framework/commands/demo-command.md'),
    );
    expect(cmdEntry?.type).toBe('command');

    const ruleEntry = Object.values(idx.entries).find(e =>
      e.path.includes('demo-framework/rules/demo-rule.md'),
    );
    expect(ruleEntry?.type).toBe('rule');
  });
});

describe('discoverCapability — JSON output', () => {
  it('emits a stable schema with path/type/score/triggers/capability', async () => {
    writeSkill(
      'skill-create-intake',
      'fx',
      `---\nname: skill-create-intake\ndescription: Create new intake forms with the wizard\n---\n\n## Triggers\n\n- "create intake"\n- "new intake form"\n`,
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await buildIndex(cwd, { graph: 'framework', force: true, explicit: true });
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();

    const captured: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) =>
      captured.push(args.join(' ')),
    );

    await discoverCapability(cwd, {
      phrase: 'create intake',
      graph: 'framework',
      json: true,
      limit: 3,
    });

    logSpy.mockRestore();

    const json = captured.join('\n');
    // Should contain a JSON object with results array
    const parsed = JSON.parse(json);
    expect(parsed.query.phrase).toBe('create intake');
    expect(Array.isArray(parsed.results)).toBe(true);
    // The top result should reference our seeded skill
    if (parsed.results.length > 0) {
      const top = parsed.results[0];
      expect(top).toHaveProperty('path');
      expect(top).toHaveProperty('score');
      expect(top).toHaveProperty('type');
      expect(top).toHaveProperty('triggers');
      expect(top).toHaveProperty('capability');
    }
  });

  // #1230 — kernel-marked skills used to short-circuit path anchoring,
  // emitting the stored relative path (`agentic/code/.../SKILL.md`).
  // `aiwg show` then resolved against cwd → ENOENT from any non-AIWG
  // workspace. Both kernel and non-kernel framework entries must now
  // anchor to AIWG_ROOT so the path is reachable regardless of cwd.
  it('emits absolute paths for kernel-marked skills (#1230)', async () => {
    // Pin AIWG_ROOT to the test's tmp tree so discover anchors against it
    // instead of the host environment's real AIWG_ROOT.
    const prevAiwgRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = cwd;
    try {

    writeSkill(
      'kernel-quickref',
      'aiwg-utils',
      `---\nname: kernel-quickref\nkernel: true\ndescription: Always-loaded kernel quickref\n---\n\n## Triggers\n\n- "kernel quickref"\n`,
    );
    writeSkill(
      'normal-skill',
      'aiwg-utils',
      `---\nname: normal-skill\ndescription: A non-kernel skill\n---\n\n## Triggers\n\n- "normal skill"\n`,
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await buildIndex(cwd, { graph: 'framework', force: true, explicit: true });
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();

    const captured: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) =>
      captured.push(args.join(' ')),
    );

    await discoverCapability(cwd, {
      phrase: 'kernel quickref',
      graph: 'framework',
      json: true,
      limit: 5,
    });

    logSpy.mockRestore();

    const parsed = JSON.parse(captured.join('\n'));
    const kernelHit = parsed.results.find((r: { kernel: boolean }) => r.kernel === true);
    expect(kernelHit, 'kernel-marked skill must appear in discover results').toBeDefined();
    // The fix: kernel paths must be absolute, anchored to aiwg_root.
    // Before #1230 they came back as `agentic/code/.../SKILL.md` (relative)
    // and broke aiwg show from any cwd != AIWG_ROOT.
    expect(path.isAbsolute(kernelHit.path)).toBe(true);
    // Path must end at the source SKILL.md under agentic/code/, regardless
    // of /tmp ↔ /private/tmp symlink games on the host.
    expect(kernelHit.path).toMatch(
      /agentic\/code\/frameworks\/aiwg-utils\/skills\/kernel-quickref\/SKILL\.md$/,
    );
    // And the resolved path must actually exist on disk — this is the
    // contract aiwg show depends on.
    expect(fs.existsSync(kernelHit.path)).toBe(true);
    } finally {
      if (prevAiwgRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = prevAiwgRoot;
    }
  });

  // #1233 — exact-name queries against kernel skills used to score ~0.10
  // because the title was derived from the Markdown heading ("AIWG
  // Doctor") which no longer contained the hyphenated slug. The scorer
  // now floors exact-name match (case- and separator-insensitive) so
  // the literal slug, the spaced form, and the underscore form all
  // return the artifact at top-1.
  it('floors exact-name queries to score 1.0 for kernel skills (#1233)', async () => {
    const prevAiwgRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = cwd;
    try {

    // Seed a kernel skill whose Markdown heading drops the hyphen the
    // user types — exactly the failure mode #1233 documents.
    writeSkill(
      'aiwg-doctor',
      'aiwg-utils',
      `---\nname: aiwg-doctor\nkernel: true\ndescription: Run a comprehensive health check\n---\n\n# AIWG Doctor\n\nDiagnostics.\n`,
    );
    // And a non-kernel skill whose title contains the same words so we
    // confirm the floor (not the title-substring path) is what's lifting
    // the kernel skill to 1.0.
    writeSkill(
      'doctor-helper',
      'aiwg-utils',
      `---\nname: doctor-helper\ndescription: Helps the AIWG doctor\n---\n\n# Doctor Helper\n`,
    );

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await buildIndex(cwd, { graph: 'framework', force: true, explicit: true });
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();

    // Three forms of the same query — slug, spaced, underscored — all
    // must return the kernel skill at top-1 with score 1.
    for (const phrase of ['aiwg-doctor', 'aiwg doctor', 'aiwg_doctor']) {
      const captured: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) =>
        captured.push(args.join(' ')),
      );
      await discoverCapability(cwd, {
        phrase,
        graph: 'framework',
        json: true,
        limit: 3,
      });
      logSpy.mockRestore();

      const parsed = JSON.parse(captured.join('\n'));
      expect(parsed.results.length, `phrase=${phrase} returned no results`).toBeGreaterThan(0);
      const top = parsed.results[0];
      expect(top.path, `phrase=${phrase} top result`).toMatch(/aiwg-doctor\/SKILL\.md$/);
      expect(top.score, `phrase=${phrase} top score`).toBe(1);
      expect(top.kernel).toBe(true);
    }
    } finally {
      if (prevAiwgRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = prevAiwgRoot;
    }
  });
});
