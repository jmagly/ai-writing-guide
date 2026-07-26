import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '../..');
const TEST_ROOT = mkdtempSync(join(tmpdir(), 'aiwg-kernel-conformance-'));

const PROVIDERS = [
  { id: 'claude', root: (project: string) => join(project, '.claude/skills') },
  { id: 'codex', root: (project: string) => join(project, '.agents/skills') },
  { id: 'copilot', root: (project: string) => join(project, '.github/skills') },
  { id: 'cursor', root: (project: string) => join(project, '.cursor/skills') },
  { id: 'factory', root: (project: string) => join(project, '.factory/skills') },
  { id: 'opencode', root: (project: string) => join(project, '.opencode/skill') },
  { id: 'warp', root: (project: string) => join(project, '.warp/skills') },
  { id: 'windsurf', root: (project: string) => join(project, '.windsurf/skills') },
  { id: 'hermes', root: (_project: string, home: string) => join(home, '.hermes/skills') },
  { id: 'openclaw', root: (_project: string, home: string) => join(home, '.openclaw/skills/aiwg') },
  { id: 'openhuman', root: (_project: string, home: string) => join(home, '.openhuman/skills') },
] as const;

function skillDirs(parent: string): string[] {
  try {
    return readdirSync(parent)
      .map(name => join(parent, name))
      .filter(candidate => statSync(candidate).isDirectory())
      .filter(candidate => {
        try {
          return statSync(join(candidate, 'SKILL.md')).isFile();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function canonicalKernelNames(): string[] {
  const codeRoot = join(REPO_ROOT, 'agentic/code');
  const containers = ['frameworks', 'addons'];
  const names = new Set<string>();

  for (const container of containers) {
    const root = join(codeRoot, container);
    for (const bundle of readdirSync(root)) {
      for (const skillDir of skillDirs(join(root, bundle, 'skills'))) {
        const source = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
        if (/^kernel:\s*true\s*$/m.test(source)) {
          names.add(skillDir.split('/').at(-1)!);
        }
      }
    }
  }
  return [...names].sort();
}

const EXPECTED_KERNEL = canonicalKernelNames();

function deploy(provider: string): { project: string; home: string } {
  const project = join(TEST_ROOT, `${provider}-project`);
  const home = join(TEST_ROOT, `${provider}-home`);
  execFileSync(process.execPath, [
    join(REPO_ROOT, 'tools/agents/deploy-agents.mjs'),
    '--provider', provider,
    '--mode', 'all',
    '--target', project,
    '--deploy-skills',
    '--skills-only',
    '--skip-commands-migration',
    '--quiet',
  ], {
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    stdio: 'pipe',
  });
  return { project, home };
}

afterAll(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

describe('kernel deployment conformance', () => {
  it('has a non-empty, unique canonical kernel inventory', () => {
    expect(EXPECTED_KERNEL.length).toBeGreaterThan(20);
    expect(new Set(EXPECTED_KERNEL).size).toBe(EXPECTED_KERNEL.length);
  });

  for (const provider of PROVIDERS) {
    it(`${provider.id} deploys every canonical kernel skill and no standard skills`, () => {
      const { project, home } = deploy(provider.id);
      const deployedRoot = provider.root(project, home);
      const deployed = skillDirs(deployedRoot)
        .map(dir => dir.split('/').at(-1)!)
        .sort();

      expect(deployed).toEqual(EXPECTED_KERNEL);
      for (const name of deployed) {
        const content = readFileSync(join(deployedRoot, name, 'SKILL.md'), 'utf8');
        // Provider translators may intentionally remove AIWG-only routing
        // metadata such as `kernel` and `platforms`. The portable contract is
        // a valid named skill with a substantive body at the kernel location.
        expect(content, `${provider.id}/${name}`).toMatch(/^---\n[\s\S]*\n---\n/m);
        expect(content, `${provider.id}/${name}`).toMatch(
          new RegExp(`^name:\\s*["']?${name}["']?\\s*$`, 'm'),
        );
        expect(content.length, `${provider.id}/${name}`).toBeGreaterThan(100);
      }
    });
  }
});
