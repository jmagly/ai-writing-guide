import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROVIDER_IDS } from '../../../src/providers/provider-definitions.js';
import {
  AGENT_SKILLS_BASELINE,
  AIWG_SKILL_CONTROL_FIELDS,
  STANDARD_SKILL_FIELDS,
} from '../../../src/skills/agent-skills.js';
import { main as skillsMain } from '../../../src/skills/cli.js';
import { validateAgentSkillFile } from '../../../src/skills/validator.js';

const FIXTURE_ROOT = path.resolve(
  'test/fixtures/agent-skills/lifecycle/portable-complete',
);

interface ProviderOracle {
  upstreamBaseline: {
    repository: string;
    revision: string;
    referenceValidatorVersion: string;
  };
  skill: {
    name: string;
  };
  providers: Array<{
    id: string;
    location: 'project' | 'home';
    root: string;
    status: string;
    resources: string;
  }>;
}

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

const oracle = JSON.parse(read(
  'test/fixtures/agent-skills/lifecycle/provider-oracle.json',
)) as ProviderOracle;

describe('Agent Skills user documentation contract', () => {
  it('documents the pinned baseline without inventing a registry protocol', () => {
    const guide = read('docs/skills/agent-skills.md');
    expect(oracle.upstreamBaseline).toEqual({
      repository: AGENT_SKILLS_BASELINE.repository,
      revision: AGENT_SKILLS_BASELINE.revision,
      referenceValidatorVersion: AGENT_SKILLS_BASELINE.referenceValidatorVersion,
    });
    expect(guide).toContain(
      `agentskills/agentskills@${AGENT_SKILLS_BASELINE.revision}`,
    );
    expect(guide).toContain(
      'does not provide an official registry API or registry protocol',
    );
    expect(guide).not.toMatch(/official agentskills\.io registry (?:API|protocol)/i);
  });

  it('maps all portable and retained AIWG fields', () => {
    const guide = read('docs/skills/agent-skills.md');
    for (const field of STANDARD_SKILL_FIELDS) {
      expect(guide).toContain(`\`${field}\``);
    }
    for (const field of AIWG_SKILL_CONTROL_FIELDS) {
      expect(guide).toContain(`\`${field}\``);
    }
    expect(guide).toMatch(
      /`namespace` and\s+`platforms` are not Agent Skills requirements/,
    );
  });

  it('keeps every documented provider row aligned with the tested oracle', () => {
    const guide = read('docs/skills/agent-skills.md');
    expect(oracle.providers.map((provider) => provider.id))
      .toEqual([...PROVIDER_IDS]);
    for (const provider of oracle.providers) {
      const base = provider.location === 'home' ? '~' : '<project>';
      const expectedPath = `${base}/${provider.root}/<name>`.replace('//', '/');
      expect(guide).toContain(
        `| \`${provider.id}\` | \`${expectedPath}\` | \`${provider.status}\` |`,
      );
      if (provider.resources === 'exact') {
        expect(guide).toContain(
          `| \`${provider.id}\` | \`${expectedPath}\` | \`${provider.status}\` | exact |`,
        );
      } else {
        expect(guide).toContain(
          `| \`${provider.id}\` | \`${expectedPath}\` | \`${provider.status}\` | no write |`,
        );
      }
    }
  });

  it('keeps CLI, ADR, quality, and provider references internally consistent', () => {
    const guide = read('docs/skills/agent-skills.md');
    const cli = read('docs/cli/reference.md');
    const adr = read('docs/architecture/adr-agent-skills-portability-contract.md');
    const quality = read('docs/skills/quality-rubric.md');
    const extensionOverview = read('docs/extensions/overview.md');
    const extensionTypes = read('docs/extensions/extension-types.md');
    const marketplace = read('docs/providers/marketplace.md');
    const readme = read('README.md');
    const executiveBrief = read('docs/overview/executive-brief.md');
    const manifest = JSON.parse(read('docs/_manifest.json')) as {
      order: string[];
      sections: Array<{ id: string; file?: string }>;
    };

    for (const command of [
      'aiwg validate-metadata --profile compatible ./portable-complete/SKILL.md',
      'aiwg skills import ./portable-complete',
      'aiwg skills info portable-complete --provider agentskills',
      'aiwg skills deploy portable-complete --target generic',
      'aiwg skills uninstall portable-complete --target generic',
      'aiwg skills export aiwg-status --out ./agent-skill-exports --json',
    ]) {
      expect(guide).toContain(command);
    }
    expect(cli).toContain('skills/agent-skills.md');
    expect(cli).toContain('import --git <url> --rev <revision> --subpath <path>');
    expect(cli).toContain('aiwg skills export aiwg-status --out ./agent-skill-exports --json');
    expect(quality).toContain('(agent-skills.md)');
    expect(extensionOverview).toContain('../skills/agent-skills.md');
    expect(extensionTypes).toContain('../skills/agent-skills.md');
    expect(extensionTypes).toMatch(
      /Portable Agent\s+Skills require only `name` and `description`/,
    );
    expect(extensionTypes).toMatch(
      /`namespace` and `platforms` are accepted by the compatible profile/,
    );
    expect(adr).toContain('.aiwg/skills/imported/<name>/source/');
    expect(adr).toContain('.aiwg-agent-skill.json');
    expect(adr).toContain('under `portable`');
    expect(marketplace).toContain('project `.agents/skills/`');
    expect(readme).toContain('`.agents/skills/`');
    expect(executiveBrief).toContain('`.agents/skills/`');
    expect(guide).toContain('`hermes` | `~/.hermes/skills/<name>` | `native` | exact |');
    expect(read('docs/providers/hermes-skill-fields.md')).toContain(
      'aiwg skills deploy <name> --target hermes',
    );
    expect(read('docs/integrations/hermes-quickstart.md')).not.toContain(
      'there is no `hermes.mjs` provider',
    );
    for (const id of [
      'skills/agent-skills',
      'skills/quality-rubric',
      'architecture/adr-agent-skills-portability-contract',
      'reports/agentskills-standard-audit-2026-07-25',
    ]) {
      expect(manifest.order).toContain(id);
      expect(manifest.sections.some((section) => section.id === id)).toBe(true);
    }
  });

  it('traces the parent acceptance surface to implementation and evidence', () => {
    const guide = read('docs/skills/agent-skills.md');
    for (const issue of [
      '#1569',
      '#1875',
      '#1876',
      '#1877',
      '#1878',
      '#1879',
      '#1880',
      '#1881',
      '#1894',
      '#1895',
      '#1896',
    ]) {
      expect(guide).toContain(issue);
    }
    for (const implementation of [
      'src/skills/agent-skills.ts',
      'src/skills/importer.ts',
      'src/skills/validator.ts',
      'src/skills/deployer.ts',
    ]) {
      expect(guide).toContain(implementation);
    }
  });
});

describe('documented Agent Skills round-trip smoke', () => {
  let root: string;
  let projectDir: string;
  let sourceDir: string;
  let sentinel: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-agent-skills-docs-'));
    projectDir = path.join(root, 'project');
    sourceDir = path.join(root, 'portable-complete');
    sentinel = path.join(root, 'script-executed');
    fs.mkdirSync(projectDir);
    fs.cpSync(FIXTURE_ROOT, sourceDir, { recursive: true });
    process.env.AIWG_FIXTURE_SENTINEL = sentinel;
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.AIWG_FIXTURE_SENTINEL;
    process.exitCode = undefined;
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('executes preview, import, inspect, deploy, update, and uninstall examples', async () => {
    await skillsMain([
      'import',
      sourceDir,
      '--profile',
      'compatible',
      '--dry-run',
      '--json',
    ]);
    expect(fs.existsSync(path.join(projectDir, '.aiwg'))).toBe(false);

    await skillsMain([
      'import',
      sourceDir,
      '--profile',
      'compatible',
      '--trust',
      '--activate',
    ]);
    const managedRoot = path.join(
      projectDir,
      '.aiwg',
      'skills',
      'imported',
      oracle.skill.name,
    );
    expect(fs.existsSync(path.join(managedRoot, 'manifest.json'))).toBe(true);
    expect(fs.existsSync(sentinel)).toBe(false);

    const log = vi.mocked(console.log);
    log.mockClear();
    await skillsMain([
      'info',
      oracle.skill.name,
      '--provider',
      'agentskills',
    ]);
    const info = log.mock.calls.flat().join('\n');
    expect(info).toContain('Trust:        trusted');
    expect(info).toContain('Activation:   active');
    expect(info).toContain('Source kind:  directory');

    await skillsMain([
      'deploy',
      oracle.skill.name,
      '--target',
      'generic',
      '--dry-run',
      '--json',
    ]);
    const deployedRoot = path.join(projectDir, 'skills', oracle.skill.name);
    expect(fs.existsSync(deployedRoot)).toBe(false);

    await skillsMain([
      'deploy',
      oracle.skill.name,
      '--target',
      'generic',
    ]);
    expect(validateAgentSkillFile(path.join(deployedRoot, 'SKILL.md'), {
      profile: 'strict',
      directoryName: oracle.skill.name,
      skillRoot: deployedRoot,
      checkResources: true,
    }).valid).toBe(true);

    fs.appendFileSync(
      path.join(sourceDir, 'references', 'guide.md'),
      '\nReviewed documentation update.\n',
    );
    await skillsMain([
      'import',
      sourceDir,
      '--profile',
      'compatible',
      '--update',
      '--trust',
      '--activate',
    ]);
    await skillsMain([
      'deploy',
      oracle.skill.name,
      '--target',
      'generic',
    ]);
    expect(fs.readFileSync(
      path.join(deployedRoot, 'references', 'guide.md'),
      'utf8',
    )).toContain('Reviewed documentation update.');

    await skillsMain([
      'uninstall',
      oracle.skill.name,
      '--target',
      'generic',
      '--dry-run',
    ]);
    expect(fs.existsSync(deployedRoot)).toBe(true);
    await skillsMain([
      'uninstall',
      oracle.skill.name,
      '--target',
      'generic',
    ]);
    expect(fs.existsSync(deployedRoot)).toBe(false);
    expect(fs.existsSync(managedRoot)).toBe(true);
    expect(fs.existsSync(sentinel)).toBe(false);

    await skillsMain([
      'export',
      'aiwg-status',
      '--out',
      path.join(projectDir, 'agent-skill-exports'),
      '--json',
    ]);
    expect(validateAgentSkillFile(
      path.join(projectDir, 'agent-skill-exports', 'aiwg-status', 'SKILL.md'),
      {
        profile: 'strict',
        directoryName: 'aiwg-status',
      },
    ).valid).toBe(true);
  });
});
