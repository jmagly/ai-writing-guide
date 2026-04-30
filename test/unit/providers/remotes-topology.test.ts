import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

// @ts-expect-error - .mjs module
import {
  buildRemotesTopologyBlock,
  interpolateContextTokens,
} from '../../../tools/agents/providers/base.mjs';

function makeTmpRepo(): string {
  const dir = join(tmpdir(), `aiwg-topology-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  // Init a real repo so `git remote get-url` works
  execSync('git init --quiet', { cwd: dir });
  return dir;
}

function writeConfig(dir: string, remotes?: Record<string, unknown>) {
  mkdirSync(join(dir, '.aiwg'), { recursive: true });
  const cfg: Record<string, unknown> = {
    version: '1',
    providers: ['claude'],
    installed: {},
    scripts: {},
  };
  if (remotes) cfg.remotes = remotes;
  writeFileSync(join(dir, '.aiwg', 'aiwg.config'), JSON.stringify(cfg, null, 2));
}

describe('buildRemotesTopologyBlock (#998)', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = makeTmpRepo();
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns empty string when no .aiwg/aiwg.config exists', () => {
    expect(buildRemotesTopologyBlock(tmp)).toBe('');
  });

  it('returns empty string when config has no remotes block', () => {
    writeConfig(tmp);
    expect(buildRemotesTopologyBlock(tmp)).toBe('');
  });

  it('emits a topology block with primary URL when remote is reachable', () => {
    execSync('git remote add origin https://example.com/owner/repo.git', { cwd: tmp });
    writeConfig(tmp, { primary: 'origin' });

    const block = buildRemotesTopologyBlock(tmp);
    expect(block).toContain('## Repo Topology');
    expect(block).toContain('Primary');
    expect(block).toContain('origin');
    expect(block).toContain('https://example.com/owner/repo.git');
  });

  it('shows primary without URL when remote name does not exist in git', () => {
    writeConfig(tmp, { primary: 'origin' });
    const block = buildRemotesTopologyBlock(tmp);
    expect(block).toContain('## Repo Topology');
    expect(block).toContain('`origin`');
    // No URL parens since git remote get-url failed
    expect(block).not.toMatch(/origin` \(http/);
  });

  it('lists secondary remotes with purpose and push_on_release flag', () => {
    execSync('git remote add origin https://primary.example/r.git', { cwd: tmp });
    execSync('git remote add github https://github.com/org/repo.git', { cwd: tmp });
    writeConfig(tmp, {
      primary: 'origin',
      secondary: [{ name: 'github', purpose: 'public-mirror', push_on_release: true }],
    });
    const block = buildRemotesTopologyBlock(tmp);
    expect(block).toContain('Secondary');
    expect(block).toContain('public-mirror');
    expect(block).toContain('push tags on release');
    expect(block).toContain('github.com/org/repo.git');
  });

  it('only emits issue_tracker / ci lines when they differ from primary', () => {
    execSync('git remote add origin https://primary.example/r.git', { cwd: tmp });
    writeConfig(tmp, { primary: 'origin', issue_tracker: 'origin', ci: 'origin' });
    const block = buildRemotesTopologyBlock(tmp);
    expect(block).not.toContain('Issue tracker');
    expect(block).not.toContain('**CI**');
  });

  it('survives malformed JSON without throwing', () => {
    mkdirSync(join(tmp, '.aiwg'), { recursive: true });
    writeFileSync(join(tmp, '.aiwg', 'aiwg.config'), '{ not valid json');
    expect(buildRemotesTopologyBlock(tmp)).toBe('');
  });
});

describe('interpolateContextTokens (#998)', () => {
  it('substitutes count tokens', () => {
    const out = interpolateContextTokens('agents={{AGENTS_COUNT}} skills={{SKILLS_COUNT}}', {
      counts: { agents: 42, skills: 100 },
    });
    expect(out).toBe('agents=42 skills=100');
  });

  it('substitutes the topology token', () => {
    const out = interpolateContextTokens('before\n{{REMOTES_TOPOLOGY}}\nafter', {
      topology: '## Repo Topology\n\n- Primary: origin',
    });
    expect(out).toContain('## Repo Topology');
    expect(out).not.toContain('{{REMOTES_TOPOLOGY}}');
  });

  it('replaces topology token with empty string when topology absent', () => {
    const out = interpolateContextTokens('before\n{{REMOTES_TOPOLOGY}}\nafter', { counts: {} });
    expect(out).toContain('before');
    expect(out).toContain('after');
    expect(out).not.toContain('{{REMOTES_TOPOLOGY}}');
  });
});
