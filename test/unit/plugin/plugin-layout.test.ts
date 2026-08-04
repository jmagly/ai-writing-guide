import { readFile } from 'fs/promises';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = process.cwd();
const PLUGIN_SOURCE_ROOT = 'agentic/code/plugins';

describe('plugin repository layout', () => {
  it('keeps package output under agentic/code/plugins', async () => {
    const packager = await readFile(join(REPO_ROOT, 'tools/plugin/package-plugins.mjs'), 'utf8');
    const workflow = await readFile(join(REPO_ROOT, '.gitea/workflows/build-plugins.yml'), 'utf8');
    const pkg = JSON.parse(await readFile(join(REPO_ROOT, 'package.json'), 'utf8'));

    expect(packager).toContain(`path.join(ROOT_DIR, '${PLUGIN_SOURCE_ROOT}')`);
    expect(packager).toContain(`./${PLUGIN_SOURCE_ROOT}/`);
    expect(workflow).toContain(`${PLUGIN_SOURCE_ROOT}/*/`);
    expect(workflow).not.toContain('for plugin in plugins/*/');
    expect(pkg.files).not.toContain('plugins/');
  });

  it('documents the project-local plugin compatibility boundary', async () => {
    const doc = await readFile(join(REPO_ROOT, 'docs/repo-layout-plugin-sources.md'), 'utf8');

    expect(doc).toContain('agentic/code/plugins/<name>/');
    expect(doc).toContain('.aiwg/{extensions,addons,frameworks,plugins}/<name>/');
    expect(doc).toContain('Project-local plugin bundles under `.aiwg/plugins/<name>/` remain supported');
  });

  it('publishes the current user-facing framework and addon catalog for Claude', async () => {
    const marketplace = JSON.parse(await readFile(
      join(REPO_ROOT, '.claude-plugin/marketplace.json'),
      'utf8',
    ));
    const plugins = new Map(marketplace.plugins.map((plugin: {
      name: string;
      source: string | object;
    }) => [plugin.name, plugin]));

    for (const name of [
      'validation-complete',
      'agent-loop',
      'agent-persistence',
      'agentic-installer',
      'aiwg-evals',
      'auto-memory',
      'doc-intelligence',
      'line-memory',
      'llm-wiki',
      'nlp-prod',
      'rlm',
      'semantic-memory',
      'skill-factory',
      'testing-quality',
      'twelve-factor',
      'uat-mcp',
    ]) {
      const plugin = plugins.get(name) as { source: string } | undefined;
      expect(plugin?.source).toBe(`./agentic/code/plugins/${name}`);
      const manifest = JSON.parse(await readFile(join(
        REPO_ROOT,
        `agentic/code/plugins/${name}/.claude-plugin/plugin.json`,
      ), 'utf8'));
      expect(manifest.name).toBe(name);
    }
  });

  it('keeps provider-specific manifests when cleaning Claude bundles', async () => {
    const packager = await readFile(join(REPO_ROOT, 'tools/plugin/package-plugins.mjs'), 'utf8');
    expect(packager).toContain("entry.name.endsWith('-plugin')");
    expect(await readFile(
      join(REPO_ROOT, 'agentic/code/plugins/sdlc/.codex-plugin/plugin.json'),
      'utf8',
    )).toContain('"name": "aiwg-sdlc"');
  });
});
