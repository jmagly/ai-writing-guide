/**
 * Cross-framework collision guard tests (#1169).
 *
 * Verifies that `deployFiles()` detects and refuses silent overwrites
 * when two AIWG frameworks ship a file with the same filename but
 * different content.
 *
 * Two collision modes are tested:
 *   - within-batch: both files included in a single deployFiles() call
 *     (e.g., `aiwg use all` deploying multiple frameworks at once)
 *   - cross-batch:  second deployFiles() call sees an existing managed
 *     dest from a prior call (e.g., `aiwg use sdlc` then later
 *     `aiwg use forensics`)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  deployFiles,
  readSidecarManifest,
  extractFrameworkSlug,
} from '../../../tools/agents/providers/base.mjs';

let tmpRoot;
let destDir;
let frameworksRoot;

function makeFrameworkAgent(frameworkSlug, agentName, body) {
  const dir = path.join(frameworksRoot, frameworkSlug, 'agents');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, agentName);
  fs.writeFileSync(
    file,
    `---\nname: ${agentName.replace(/\.md$/, '')}\nplatforms: [all]\n---\n${body}\n`,
    'utf8',
  );
  return file;
}

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-collision-'));
  destDir = path.join(tmpRoot, '.claude', 'agents');
  fs.mkdirSync(destDir, { recursive: true });
  // Mirror the real source layout: tmpRoot/agentic/code/frameworks/<slug>/agents/...
  frameworksRoot = path.join(tmpRoot, 'agentic', 'code', 'frameworks');
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('extractFrameworkSlug', () => {
  it('parses a frameworks/<slug>/ path', () => {
    expect(
      extractFrameworkSlug(
        '/repo/agentic/code/frameworks/forensics-complete/agents/x.md',
      ),
    ).toBe('forensics-complete');
  });

  it('parses an addons/<slug>/ path', () => {
    expect(
      extractFrameworkSlug(
        '/repo/agentic/code/addons/aiwg-utils/skills/x/SKILL.md',
      ),
    ).toBe('aiwg-utils');
  });

  it('returns null for paths outside the framework/addon namespace', () => {
    expect(extractFrameworkSlug('/repo/.aiwg/extensions/my-bundle/agents/x.md'))
      .toBe(null);
    expect(extractFrameworkSlug('/some/other/path.md')).toBe(null);
    expect(extractFrameworkSlug('')).toBe(null);
    expect(extractFrameworkSlug(null)).toBe(null);
  });

  it('handles Windows-style backslash paths', () => {
    expect(
      extractFrameworkSlug(
        'C:\\repo\\agentic\\code\\frameworks\\sdlc-complete\\agents\\x.md',
      ),
    ).toBe('sdlc-complete');
  });
});

describe('deployFiles cross-framework collision guard (#1169)', () => {
  it('detects within-batch collision: two frameworks ship same filename, different content', () => {
    const fileA = makeFrameworkAgent(
      'forensics-complete',
      'acquisition-agent.md',
      'Forensic chain-of-custody agent.',
    );
    const fileB = makeFrameworkAgent(
      'research-complete',
      'acquisition-agent.md',
      'Research paper acquisition agent.',
    );

    const warnings = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args.join(' '));
    });

    const actions = deployFiles([fileA, fileB], destDir, {
      provider: 'claude',
      deployVersion: 'test',
    });

    warnSpy.mockRestore();

    // First file deploys; second is skipped with collision
    const deployed = actions.filter((a) => a.type === 'deploy');
    const skipped = actions.filter((a) => a.type === 'skip');
    expect(deployed).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('collision');
    expect(skipped[0].collidingFramework).toBe('forensics-complete');

    // First-on-disk wins (the forensics file)
    const onDisk = fs.readFileSync(path.join(destDir, 'acquisition-agent.md'), 'utf8');
    expect(onDisk).toContain('Forensic chain-of-custody agent.');
    expect(onDisk).not.toContain('Research paper acquisition agent.');

    // Operator-visible warning emitted
    const all = warnings.join('\n');
    expect(all).toMatch(/Cross-framework deploy collision/);
    expect(all).toMatch(/forensics-complete/);
    expect(all).toMatch(/research-complete/);
    expect(all).toMatch(/acquisition-agent\.md/);
    expect(all).toMatch(/within-batch/);
  });

  it('within-batch identical content (transform idempotent) skips silently as duplicate-identical', () => {
    const fileA = makeFrameworkAgent('a-pkg', 'shared-agent.md', 'Same body.');
    // Identical body content — common when an addon and framework re-export
    // the same agent from the same authoritative source.
    const fileB = makeFrameworkAgent('b-pkg', 'shared-agent.md', 'Same body.');

    const warnings = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) =>
      warnings.push(args.join(' ')),
    );

    const actions = deployFiles([fileA, fileB], destDir, {
      provider: 'claude',
      deployVersion: 'test',
    });

    warnSpy.mockRestore();

    const skipped = actions.filter((a) => a.type === 'skip');
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('duplicate-identical');
    // No collision warning when content matches
    expect(warnings.join('\n')).not.toMatch(/Cross-framework deploy collision/);
  });

  it('detects cross-batch collision: second deploy sees prior framework in sidecar', () => {
    const fileA = makeFrameworkAgent(
      'sdlc-complete',
      'deployment-manager.md',
      'SDLC deployment manager.',
    );
    const fileB = makeFrameworkAgent(
      'ops-complete',
      'deployment-manager.md',
      'Ops deployment manager.',
    );

    // First deploy: SDLC owns the slot
    deployFiles([fileA], destDir, { provider: 'claude', deployVersion: 'test' });

    // Sidecar should now record sdlc-complete as the owner
    const sidecar1 = readSidecarManifest(destDir);
    expect(sidecar1.managed['deployment-manager.md'].frameworkSlug).toBe(
      'sdlc-complete',
    );

    const warnings = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) =>
      warnings.push(args.join(' ')),
    );

    // Second deploy: ops-complete tries to claim the same slot
    const actions = deployFiles([fileB], destDir, {
      provider: 'claude',
      deployVersion: 'test',
    });

    warnSpy.mockRestore();

    const skipped = actions.filter((a) => a.type === 'skip');
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('collision');

    // SDLC content preserved on disk
    const onDisk = fs.readFileSync(
      path.join(destDir, 'deployment-manager.md'),
      'utf8',
    );
    expect(onDisk).toContain('SDLC deployment manager.');

    // Sidecar still records sdlc-complete as owner
    const sidecar2 = readSidecarManifest(destDir);
    expect(sidecar2.managed['deployment-manager.md'].frameworkSlug).toBe(
      'sdlc-complete',
    );

    // Warning surfaces both frameworks
    const all = warnings.join('\n');
    expect(all).toMatch(/Cross-framework deploy collision/);
    expect(all).toMatch(/sdlc-complete/);
    expect(all).toMatch(/ops-complete/);
    expect(all).toMatch(/cross-batch/);
  });

  it('--force overrides cross-batch collision and updates sidecar to new framework', () => {
    const fileA = makeFrameworkAgent('sdlc-complete', 'x.md', 'A body');
    const fileB = makeFrameworkAgent('ops-complete', 'x.md', 'B body');

    deployFiles([fileA], destDir, { provider: 'claude', deployVersion: 'test' });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const actions = deployFiles([fileB], destDir, {
      provider: 'claude',
      deployVersion: 'test',
      force: true,
    });
    warnSpy.mockRestore();

    const deployed = actions.filter((a) => a.type === 'deploy');
    expect(deployed).toHaveLength(1);
    expect(deployed[0].reason).toBe('forced');

    const onDisk = fs.readFileSync(path.join(destDir, 'x.md'), 'utf8');
    expect(onDisk).toContain('B body');
    expect(onDisk).not.toContain('A body');

    const sidecar = readSidecarManifest(destDir);
    expect(sidecar.managed['x.md'].frameworkSlug).toBe('ops-complete');
  });

  it('does not flag collision when both files come from the same framework', () => {
    // Two distinct agents from one framework — not a collision.
    const a1 = makeFrameworkAgent('sdlc-complete', 'one.md', 'One.');
    const a2 = makeFrameworkAgent('sdlc-complete', 'two.md', 'Two.');

    const warnings = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) =>
      warnings.push(args.join(' ')),
    );

    const actions = deployFiles([a1, a2], destDir, {
      provider: 'claude',
      deployVersion: 'test',
    });
    warnSpy.mockRestore();

    expect(actions.filter((a) => a.type === 'deploy')).toHaveLength(2);
    expect(warnings.join('\n')).not.toMatch(/collision/);
  });

  it('sidecar omits frameworkSlug when source is outside framework/addon namespace', () => {
    // Synthesize a file in a non-framework path (operator-authored bundle).
    const operatorDir = path.join(tmpRoot, '.aiwg', 'extensions', 'my-bundle', 'agents');
    fs.mkdirSync(operatorDir, { recursive: true });
    const operatorFile = path.join(operatorDir, 'custom.md');
    fs.writeFileSync(
      operatorFile,
      `---\nname: custom\nplatforms: [all]\n---\nOperator agent.\n`,
      'utf8',
    );

    deployFiles([operatorFile], destDir, {
      provider: 'claude',
      deployVersion: 'test',
    });

    const sidecar = readSidecarManifest(destDir);
    expect(sidecar.managed['custom.md'].hash).toMatch(/^sha256:/);
    // No frameworkSlug recorded for non-framework sources
    expect(sidecar.managed['custom.md'].frameworkSlug).toBeUndefined();
  });
});
