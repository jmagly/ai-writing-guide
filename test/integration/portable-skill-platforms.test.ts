import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { deploySkillDir, skillMatchesProvider } from '../../tools/agents/providers/base.mjs';
import { buildIndex } from '../../src/artifacts/index-builder.js';
import { syncFortemiCoreIndex } from '../../src/artifacts/fortemi-core-sync.js';
import { main as indexCliMain } from '../../src/artifacts/cli.js';

const root = path.resolve(import.meta.dirname, '../..');
const providers = ['openhuman', 'pi', 'omp', 'antigravity', 'future-provider'];
const portable = [
  ['aiwg-utils', 'aiwg-guide'],
  ['aiwg-utils', 'doc-consolidate'],
  ...['memory-log-render', 'memory-log-append', 'memory-query-capture', 'memory-lint', 'memory-ingest']
    .map(name => ['semantic-memory', name]),
];

describe('portable skill copies and independent indexed retrieval (#2282)', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-portable-skills-'));
    vi.stubEnv('HOME', path.join(tmp, 'home'));
    vi.stubEnv('XDG_DATA_HOME', path.join(tmp, 'data'));
    vi.stubEnv('AIWG_ROOT', tmp);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it.each(providers)('explicitly copies portable skills for %s', provider => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const [bundle, name] of portable) {
      for (const container of ['addons', 'plugins']) {
        const sourceBundle = container === 'plugins' && bundle === 'aiwg-utils' ? 'utils' : bundle;
        const source = path.join(root, 'agentic/code', container, sourceBundle, 'skills', name);
        const content = fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8');
        expect(skillMatchesProvider(content, provider), `${container}/${name}`).toBe(true);
        const dest = path.join(tmp, container);
        deploySkillDir(source, dest, { provider });
        const copied = fs.readFileSync(path.join(dest, name, 'SKILL.md'), 'utf8');
        expect(copied).toContain(`platforms: [${provider}]`);
        expect(copied.replace(/^---\n[\s\S]*?\n---/, '')).toBe(content.replace(/^---\n[\s\S]*?\n---/, ''));
      }
    }
  });

  it.each(providers)('copies framework and packaged doc-consolidate variants for %s', provider => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    for (const bundle of ['frameworks/sdlc-complete', 'plugins/sdlc', 'plugins/codex-sdlc']) {
      const source = path.join(root, 'agentic/code', bundle, 'skills/doc-consolidate');
      const dest = path.join(tmp, bundle);
      deploySkillDir(source, dest, { provider });
      expect(fs.readFileSync(path.join(dest, 'doc-consolidate/SKILL.md'), 'utf8'))
        .toContain(`platforms: [${provider}]`);
    }
  });

  it('retrieves source skills independently of provider copy restrictions', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const source = path.join(tmp, '.aiwg/extensions/help/skills/aiwg-guide');
    fs.mkdirSync(source, { recursive: true });
    const content = fs.readFileSync(path.join(root, 'agentic/code/addons/aiwg-utils/skills/aiwg-guide/SKILL.md'), 'utf8');
    fs.writeFileSync(path.join(source, 'SKILL.md'), content);
    const restricted = path.join(tmp, '.aiwg/extensions/help/skills/native-only');
    fs.mkdirSync(restricted, { recursive: true });
    fs.writeFileSync(path.join(restricted, 'SKILL.md'), [
      '---', 'name: native-only', 'description: Native inspector fixture',
      'platforms: [claude-code]', '---', '# Native Inspector', '',
      'Requires the native fixture tool.',
    ].join('\n'));
    deploySkillDir(restricted, path.join(tmp, 'copies'), { provider: 'future-provider' });
    expect(fs.existsSync(path.join(tmp, 'copies/native-only'))).toBe(false);
    await buildIndex(tmp, { graph: 'project', quiet: true });
    syncFortemiCoreIndex(tmp, { graph: 'project' });
    vi.spyOn(process, 'cwd').mockReturnValue(tmp);
    for (const name of ['aiwg-guide', 'native-only']) {
      log.mockClear();
      await indexCliMain(['discover', name, '--json']);
      const found = JSON.parse(log.mock.calls.map(call => call[0]).join(''));
      expect(found.results[0].name).toBe(name);
      log.mockClear();
      await indexCliMain(['show', 'skill', found.results[0].id, '--json']);
      const shown = JSON.parse(log.mock.calls.map(call => call[0]).join(''));
      expect(shown.content).toBe(fs.readFileSync(path.join(path.dirname(source), name, 'SKILL.md'), 'utf8'));
    }
  });
});
