import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import {
  providerNeedsCommands,
  providerUsesSkillsNatively,
} from '../../src/plugin/skill-command-translator.js';

const REPO_ROOT = resolve(__dirname, '../..');
const TEST_ROOT = mkdtempSync(join(tmpdir(), 'aiwg-kernel-conformance-'));

const PROVIDERS = [
  { id: 'claude', root: (project: string) => join(project, '.claude/skills'), standardRoot: (project: string) => join(project, '.claude/.aiwg/skills') },
  { id: 'codex', root: (project: string) => join(project, '.agents/skills'), standardRoot: (project: string) => join(project, '.agents/skills') },
  { id: 'copilot', root: (project: string) => join(project, '.github/skills'), standardRoot: (project: string) => join(project, '.github/.aiwg/skills') },
  { id: 'cursor', root: (project: string) => join(project, '.cursor/skills'), standardRoot: (project: string) => join(project, '.cursor/.aiwg/skills') },
  { id: 'factory', root: (project: string) => join(project, '.factory/skills'), standardRoot: (project: string) => join(project, '.factory/.aiwg/skills') },
  { id: 'opencode', root: (project: string) => join(project, '.opencode/skill'), standardRoot: (project: string) => join(project, '.opencode/.aiwg/skill') },
  { id: 'warp', root: (project: string) => join(project, '.warp/skills'), standardRoot: (project: string) => join(project, '.warp/.aiwg/skills') },
  { id: 'windsurf', root: (project: string) => join(project, '.windsurf/skills'), standardRoot: (project: string) => join(project, '.windsurf/.aiwg/skills') },
  { id: 'hermes', root: (_project: string, home: string) => join(home, '.hermes/skills'), standardRoot: (_project: string, home: string) => join(home, '.hermes/skills/.aiwg') },
  { id: 'openclaw', root: (_project: string, home: string) => join(home, '.openclaw/skills/aiwg'), standardRoot: (_project: string, home: string) => join(home, '.openclaw/.aiwg/skills') },
  { id: 'openhuman', root: (_project: string, home: string) => join(home, '.openhuman/skills'), standardRoot: (_project: string, home: string) => join(home, '.openhuman/.aiwg/skills') },
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
const CODEX_LISTING_CHAR_CAP = 8_000;

function codexListingStats(root: string): { count: number; totalChars: number } {
  let count = 0;
  let totalChars = 0;

  for (const dir of skillDirs(root)) {
    const content = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
    const name = frontmatter.match(/^name:\s*["']?(.+?)["']?\s*$/m)?.[1];
    const description = frontmatter.match(/^description:\s*["']?(.+?)["']?\s*$/m)?.[1];

    expect(name, `${dir} name`).toBeTruthy();
    expect(description, `${dir} description`).toBeTruthy();
    expect(description!.length, `${dir} description`).toBeGreaterThan(10);

    totalChars += name!.length + description!.length + 5;
    count += 1;
  }

  return { count, totalChars };
}

function deploy(
  provider: string,
  options: { copyAll?: boolean; dryRun?: boolean; suffix?: string } = {},
): { project: string; home: string } {
  const suffix = options.suffix ? `-${options.suffix}` : '';
  const project = join(TEST_ROOT, `${provider}${suffix}-project`);
  const home = join(TEST_ROOT, `${provider}${suffix}-home`);
  execFileSync(process.execPath, [
    join(REPO_ROOT, 'tools/agents/deploy-agents.mjs'),
    '--provider', provider,
    '--mode', 'all',
    '--target', project,
    '--deploy-skills',
    '--skills-only',
    '--skip-commands-migration',
    '--quiet',
    ...(options.copyAll ? ['--copy-all'] : []),
    ...(options.dryRun ? ['--dry-run'] : []),
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
    expect(EXPECTED_KERNEL.length).toBe(25);
    expect(new Set(EXPECTED_KERNEL).size).toBe(EXPECTED_KERNEL.length);
  });

  it('keeps the full Codex kernel catalog useful and below its startup listing cap', () => {
    const { project, home } = deploy('codex', { suffix: 'budget' });
    const stats = codexListingStats(PROVIDERS[1].root(project, home));

    expect(stats.count).toBe(EXPECTED_KERNEL.length);
    expect(stats.totalChars).toBeLessThanOrEqual(CODEX_LISTING_CHAR_CAP);
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

    it(`${provider.id} copies the standard tier only with --copy-all`, () => {
      const defaultDeploy = deploy(provider.id, { suffix: 'no-copy' });
      const defaultStandardRoot = provider.standardRoot(defaultDeploy.project, defaultDeploy.home);
      expect(existsSync(join(defaultStandardRoot, 'voice-apply', 'SKILL.md'))).toBe(false);

      const fullDeploy = deploy(provider.id, { copyAll: true, suffix: 'copy-all' });
      const fullRoot = provider.root(fullDeploy.project, fullDeploy.home);
      const fullStandardRoot = provider.standardRoot(fullDeploy.project, fullDeploy.home);
      expect(existsSync(join(fullStandardRoot, 'voice-apply', 'SKILL.md'))).toBe(true);
      for (const kernelName of EXPECTED_KERNEL) {
        expect(
          existsSync(join(fullRoot, kernelName, 'SKILL.md')),
          `${provider.id}/${kernelName}`,
        ).toBe(true);
      }
    });
  }

  it('repeat deploy prunes stale managed skills while preserving operator-owned skills', () => {
    const first = deploy('claude', { suffix: 'lifecycle' });
    const root = PROVIDERS[0].root(first.project, first.home);
    const stale = join(root, 'renamed-kernel-fixture');
    const operator = join(root, 'operator-owned-fixture');
    mkdirSync(stale, { recursive: true });
    mkdirSync(operator, { recursive: true });
    writeFileSync(join(stale, 'SKILL.md'), '---\nname: renamed-kernel-fixture\n---\nmanaged\n');
    writeFileSync(join(stale, '.aiwg-managed'), 'true\n');
    writeFileSync(join(operator, 'SKILL.md'), '---\nname: operator-owned-fixture\n---\noperator\n');

    deploy('claude', { suffix: 'lifecycle' });

    expect(existsSync(stale)).toBe(false);
    expect(existsSync(operator)).toBe(true);
    expect(skillDirs(root).map(dir => dir.split('/').at(-1)!).filter(name =>
      EXPECTED_KERNEL.includes(name)
    ).sort()).toEqual(EXPECTED_KERNEL);
  });

  it('repairs an oversized Codex deployment while preserving operator-owned skills', () => {
    const first = deploy('codex', { copyAll: true, suffix: 'repair' });
    const root = PROVIDERS[1].root(first.project, first.home);
    const operator = join(root, 'operator-owned-fixture');
    mkdirSync(operator, { recursive: true });
    writeFileSync(join(operator, 'SKILL.md'), '---\nname: operator-owned-fixture\ndescription: operator-owned skill\n---\noperator\n');

    const repaired = deploy('codex', { suffix: 'repair' });
    const repairedRoot = PROVIDERS[1].root(repaired.project, repaired.home);
    const stats = codexListingStats(repairedRoot);

    expect(existsSync(join(repairedRoot, 'voice-apply'))).toBe(false);
    expect(existsSync(operator)).toBe(true);
    expect(stats.count).toBe(EXPECTED_KERNEL.length + 1);
    expect(stats.totalChars).toBeLessThanOrEqual(CODEX_LISTING_CHAR_CAP);
  });

  it('moves managed skills cleanly across kernel and standard tiers', async () => {
    const root = join(TEST_ROOT, 'tier-transition');
    const source = join(root, 'source', 'transition-fixture');
    const kernelRoot = join(root, 'kernel');
    const standardRoot = join(root, 'standard');
    mkdirSync(source, { recursive: true });
    const skillFile = join(source, 'SKILL.md');
    const { deploySkillsWithKernelRouting } = await import(
      '../../tools/agents/providers/base.mjs'
    );

    writeFileSync(skillFile, '---\nname: transition-fixture\nnamespace: aiwg\nkernel: true\n---\nkernel body\n');
    deploySkillsWithKernelRouting([source], standardRoot, kernelRoot, {
      copyStandardSkills: true,
    });
    expect(existsSync(join(kernelRoot, 'transition-fixture', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(standardRoot, 'transition-fixture'))).toBe(false);

    writeFileSync(skillFile, '---\nname: transition-fixture\nnamespace: aiwg\n---\nstandard body\n');
    deploySkillsWithKernelRouting([source], standardRoot, kernelRoot, {
      copyStandardSkills: true,
    });
    expect(existsSync(join(kernelRoot, 'transition-fixture'))).toBe(false);
    expect(existsSync(join(standardRoot, 'transition-fixture', 'SKILL.md'))).toBe(true);

    writeFileSync(skillFile, '---\nname: transition-fixture\nnamespace: aiwg\nkernel: true\n---\nkernel again\n');
    deploySkillsWithKernelRouting([source], standardRoot, kernelRoot, {
      copyStandardSkills: true,
    });
    expect(existsSync(join(kernelRoot, 'transition-fixture', 'SKILL.md'))).toBe(true);
    expect(existsSync(join(standardRoot, 'transition-fixture'))).toBe(false);
  });

  it('dry-run leaves an existing provider surface unchanged', () => {
    const first = deploy('openhuman', { suffix: 'dry-run' });
    const root = PROVIDERS.find(provider => provider.id === 'openhuman')!
      .root(first.project, first.home);
    const sentinel = join(root, 'operator-sentinel', 'SKILL.md');
    mkdirSync(resolve(sentinel, '..'), { recursive: true });
    writeFileSync(sentinel, 'operator-owned\n');
    const before = readFileSync(sentinel, 'utf8');

    deploy('openhuman', { copyAll: true, dryRun: true, suffix: 'dry-run' });

    expect(readFileSync(sentinel, 'utf8')).toBe(before);
    expect(existsSync(join(root, 'voice-apply', 'SKILL.md'))).toBe(false);
  });

  it('matches the command mirror policy for every deployable provider', () => {
    const commandProviders = ['factory', 'opencode', 'warp', 'windsurf', 'copilot', 'codex', 'openclaw'];
    const nativeOnlyProviders = ['claude', 'cursor', 'hermes', 'openhuman'];
    expect(PROVIDERS.map(provider => provider.id).sort()).toEqual(
      [...commandProviders, ...nativeOnlyProviders].sort(),
    );
    for (const provider of commandProviders) {
      expect(providerNeedsCommands(provider), provider).toBe(true);
      expect(providerUsesSkillsNatively(provider), provider).toBe(false);
    }
    for (const provider of nativeOnlyProviders) {
      expect(providerNeedsCommands(provider), provider).toBe(false);
      expect(providerUsesSkillsNatively(provider), provider).toBe(true);
    }
  });

  it('keeps primary architecture documentation aligned with canonical inventory', () => {
    for (const doc of [
      'docs/architecture-overview.md',
      'docs/how-it-works.md',
      'docs/cli/capability-routing.md',
    ]) {
      const content = readFileSync(join(REPO_ROOT, doc), 'utf8');
      expect(content, doc).toContain(`${EXPECTED_KERNEL.length} kernel skills`);
    }
  });
});
