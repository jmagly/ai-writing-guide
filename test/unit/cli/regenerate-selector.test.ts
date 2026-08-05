import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { selectRegenerateBranch } from '../../../src/cli/regenerate-selector.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'aiwg-regenerate-selector-'));
});

afterEach(async () => rm(root, { recursive: true, force: true }));

async function fixture(relativePath: string, content = 'fixture\n'): Promise<void> {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

const canonicalWorkspace = `# WORKSPACE.md
<!-- aiwg-managed -->
<!-- AIWG:workspace-context:start -->
managed
<!-- AIWG:workspace-context:end -->
<!-- AIWG:workspace-operator:start -->
operator
<!-- AIWG:workspace-operator:end -->
`;

describe('canonical regenerate selector', () => {
  it('defaults a truly signal-free directory to workspace', async () => {
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'workspace', state: 'fresh', explicit: false });
  });

  it.each([
    ['package.json', 'package.json'], ['README.md', 'README.md'], ['deno.json', 'deno.json'],
    ['Gemfile', 'Gemfile'], ['build.gradle', 'build.gradle'], ['requirements.txt', 'requirements.txt'],
    ['Makefile', 'Makefile'], ['src/index.ts', 'src'], ['tests/example.test.ts', 'tests'],
    ['.gitea/workflows/ci.yml', '.gitea/workflows/ci.yml'],
  ])('detects established project source %s through the canonical extractor', async (source, evidence) => {
    const content = source === 'package.json' ? '{"name":"fixture"}\n'
      : source === 'README.md' ? '# Fixture\n\nExisting project purpose.\n'
        : 'fixture\n';
    await fixture(source, content);
    const selected = await selectRegenerateBranch(root, []);
    expect(selected.branch).toBe('existing-project');
    expect(selected.state).toBe('established-unextracted');
    expect(selected.evidence).toContain(evidence);
  });

  it('routes an adopted workspace to canonical refresh', async () => {
    await fixture('package.json', '{"name":"fixture"}\n');
    await fixture('WORKSPACE.md', canonicalWorkspace.replace(
      '<!-- AIWG:workspace-operator:start -->',
      '<!-- AIWG:workspace-operator:start -->\n<!-- AIWG:project-extraction:start -->\nproject\n<!-- AIWG:project-extraction:end -->',
    ));
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'workspace', state: 'adopted' });
  });

  it('previews adoption when a canonical workspace lacks extraction and project sources appear', async () => {
    await fixture('WORKSPACE.md', canonicalWorkspace);
    await fixture('Gemfile');
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'existing-project', state: 'canonical-unextracted' });
  });

  it('routes an operator-owned workspace through transactional adoption', async () => {
    await fixture('WORKSPACE.md', '# Team Context\n\nAlways run tests.\n');
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'existing-project', state: 'operator-owned-workspace' });
  });

  it('routes legacy provider context through transactional adoption', async () => {
    await fixture('CLAUDE.md', '# Team Claude Context\n\nAlways run tests.\n');
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'existing-project', state: 'legacy-context' });
  });

  it.each([
    '<!-- AIWG:workspace-context:start -->',
    '<!-- AIWG:workspace-context:end -->',
    `${canonicalWorkspace}<!-- AIWG:project-extraction:start -->\n`,
    `<!-- AIWG:project-extraction:start -->\nx\n<!-- AIWG:project-extraction:end -->\n`,
  ])('refuses partial or malformed managed state', async (content) => {
    await fixture('WORKSPACE.md', content);
    await expect(selectRegenerateBranch(root, [])).rejects.toMatchObject({ code: 'ERR_USAGE_REGENERATE_STATE_MALFORMED' });
  });

  it('treats AIWG config without project signals as a canonical fresh setup', async () => {
    await fixture('.aiwg/aiwg.config', '{"version":"1","providers":["codex"]}\n');
    expect(await selectRegenerateBranch(root, [])).toMatchObject({ branch: 'workspace', state: 'fresh' });
  });

  it.each([
    [['--workspace'], 'workspace'],
    [['--existing-project'], 'existing-project'],
    [['--full-inject'], 'legacy'],
  ] as const)('honors explicit branch %s', async (args, branch) => {
    await fixture('package.json', '{"name":"fixture"}\n');
    expect(await selectRegenerateBranch(root, [...args])).toMatchObject({ branch, explicit: true });
  });
});
