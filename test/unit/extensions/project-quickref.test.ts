import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  deployProjectQuickref,
  generateProjectQuickref,
  projectQuickrefSkillName,
  renderProjectQuickref,
  type ProjectQuickref,
} from '../../../src/extensions/project-quickref.js';

const roots: string[] = [];

async function fixture(): Promise<{ projectDir: string; homeDir: string; definition: ProjectQuickref }> {
  const root = await mkdtemp(join(tmpdir(), 'aiwg-project-quickref-'));
  roots.push(root);
  const projectDir = join(root, 'project');
  const homeDir = join(root, 'home');
  await mkdir(join(projectDir, '.aiwg'), { recursive: true });
  await mkdir(homeDir, { recursive: true });
  const definition: ProjectQuickref = {
    version: '1',
    project: {
      id: 'acme-console',
      name: 'Acme Console',
      description: 'Repository-specific orientation for Acme Console.',
    },
    precedence: 'Use listed project processes before generic AIWG workflows when they apply.',
    entries: [{
      title: 'Issue handling',
      summary: 'Use the repository issue workflow before generic issue tooling.',
      discover: ['project issue handling'],
      show: [{ type: 'skill', name: 'project-issue-workflow' }],
    }],
  };
  await writeFile(join(projectDir, '.aiwg', 'quickref.json'), JSON.stringify(definition, null, 2) + '\n');
  return { projectDir, homeDir, definition };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('project quickref generation and deployment (#1788)', () => {
  it('renders deterministic preview output without writing in dry-run mode', async () => {
    const { projectDir, definition } = await fixture();
    const first = await generateProjectQuickref(projectDir, { dryRun: true });
    const second = await generateProjectQuickref(projectDir, { dryRun: true });

    expect(first.content).toBe(second.content);
    expect(first.content).toBe(renderProjectQuickref(definition));
    expect(first.content).toContain('aiwg discover "project issue handling"');
    expect(first.content).toContain('aiwg show skill project-issue-workflow');
    expect(existsSync(first.outputPath)).toBe(false);
  });

  it('deploys to a file-based project provider and is idempotent', async () => {
    const { projectDir } = await fixture();
    const first = await deployProjectQuickref(projectDir, 'claude');
    const second = await deployProjectQuickref(projectDir, 'claude');

    expect(first.targetPath).toBe(join(projectDir, '.claude', 'skills', first.skillName, 'SKILL.md'));
    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(await readFile(first.targetPath, 'utf8')).toContain('kernel: true');
  });

  it('prunes obsolete output beneath the generated quickref root', async () => {
    const { projectDir } = await fixture();
    const obsolete = join(projectDir, '.aiwg', 'generated', 'project-quickref', 'old-project-quickref');
    await mkdir(obsolete, { recursive: true });
    await writeFile(join(obsolete, 'SKILL.md'), '# stale generated output\n');

    await generateProjectQuickref(projectDir);
    expect(existsSync(obsolete)).toBe(false);
  });

  it('namespaces a user-global provider target by canonical project id', async () => {
    const { projectDir, homeDir } = await fixture();
    const result = await deployProjectQuickref(projectDir, 'openhuman', { homeDir });

    expect(result.skillName).toBe(projectQuickrefSkillName('acme-console'));
    expect(result.targetPath).toBe(join(homeDir, '.openhuman', 'skills', result.skillName, 'SKILL.md'));
    expect(existsSync(result.targetPath)).toBe(true);
  });

  it('uses the supported kernel target for an aggregated provider', async () => {
    const { projectDir } = await fixture();
    const result = await deployProjectQuickref(projectDir, 'warp');

    expect(result.targetPath).toBe(join(projectDir, '.warp', 'skills', result.skillName, 'SKILL.md'));
    expect(existsSync(result.targetPath)).toBe(true);
  });

  it('uses the generic skill surface as explicit emulation when no kernel target exists', async () => {
    const { projectDir } = await fixture();
    const result = await deployProjectQuickref(projectDir, 'generic');

    expect(result.emulated).toBe(true);
    expect(result.targetPath).toBe(join(projectDir, 'skills', result.skillName, 'SKILL.md'));
  });

  it('prunes only stale quickrefs carrying this project ownership marker', async () => {
    const { projectDir } = await fixture();
    const current = await deployProjectQuickref(projectDir, 'claude');
    const root = join(projectDir, '.claude', 'skills');
    const stale = join(root, 'aiwg-project-old-id-quickref');
    const operator = join(root, 'operator-skill');
    await mkdir(stale, { recursive: true });
    await mkdir(operator, { recursive: true });
    await writeFile(join(stale, '.aiwg-project-quickref.json'), JSON.stringify({
      version: 1,
      projectId: 'old-id',
      sourceProject: projectDir,
      sourcePath: join(projectDir, '.aiwg', 'quickref.json'),
      contentHash: 'old',
    }));
    await writeFile(join(operator, 'SKILL.md'), '# operator owned\n');

    const result = await deployProjectQuickref(projectDir, 'claude');
    expect(result.pruned).toEqual([stale]);
    expect(existsSync(stale)).toBe(false);
    expect(existsSync(operator)).toBe(true);
    expect(existsSync(current.targetPath)).toBe(true);
  });
});
