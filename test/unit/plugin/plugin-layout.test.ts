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
});
