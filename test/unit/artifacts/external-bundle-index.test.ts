import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildIndex } from '../../../src/artifacts/index-builder.js';
import { collectGraphIndexFiles } from '../../../src/artifacts/index-files.js';
import { showStats } from '../../../src/artifacts/stats.js';

describe('external project bundle indexing (#2308)', () => {
  let root: string;
  let member: string;
  let sources: string;
  let agent: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-external-index-'));
    member = path.join(root, 'member');
    sources = path.join(root, 'sources');
    vi.stubEnv('HOME', path.join(root, 'home'));
    vi.stubEnv('XDG_DATA_HOME', path.join(root, 'data'));
    for (const key of ['AIWG_ARTIFACTS_PATH', 'AIWG_PROJECT_ARTIFACTS_PATH', 'AIWG_PROJECT_AIWG_DIR', 'AIWG_PROJECT_LOCAL_PATHS']) {
      vi.stubEnv(key, '');
    }
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fs.mkdirSync(path.join(member, '.aiwg'), { recursive: true });
    const bundle = path.join(sources, 'extensions', 'team');
    fs.mkdirSync(path.join(bundle, 'agents'), { recursive: true });
    fs.writeFileSync(path.join(bundle, 'manifest.json'), JSON.stringify({
      id: 'team', type: 'extension', name: 'Team', version: '1.0.0',
      description: 'Shared team agents', manifestVersion: '1',
      platforms: { codex: 'full' }, keywords: ['team'],
      deployment: { pathTemplate: '.{platform}/rules/{id}.md' },
    }));
    agent = path.join(bundle, 'agents', 'team-agent.md');
    fs.writeFileSync(agent, '---\nname: team-agent\ndescription: Shared agent\n---\n# Team\n');
    fs.writeFileSync(path.join(sources, 'private.md'), '# Private\n');
    fs.symlinkSync(path.join(sources, 'private.md'), path.join(bundle, 'agents', 'escaped.md'));
    fs.mkdirSync(path.join(sources, 'extensions', 'invalid', 'agents'), { recursive: true });
    fs.writeFileSync(path.join(sources, 'extensions', 'invalid', 'manifest.json'), '{}');
    fs.writeFileSync(path.join(sources, 'extensions', 'invalid', 'agents', 'invalid.md'), '# Invalid\n');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('shares the authorized file set across build and coverage, then prunes revoked roots', async () => {
    expect(await collectGraphIndexFiles(member, 'project')).toEqual([]);
    vi.stubEnv('AIWG_PROJECT_LOCAL_PATHS', sources);
    const expected = [agent, path.join(sources, 'extensions', 'team', 'manifest.json')];
    expect(await collectGraphIndexFiles(member, 'project')).toEqual(expected);
    expect(await collectGraphIndexFiles(member)).toEqual(expected);
    await buildIndex(member, { graph: 'project' });
    const metadata = path.join(member, '.aiwg', '.index', 'project', 'metadata.json');
    expect(Object.keys(JSON.parse(fs.readFileSync(metadata, 'utf8')).entries)).toEqual(expected);
    await showStats(member, { graph: 'project', json: true });
    const stats = JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0] as string);
    expect(stats.coverage).toEqual({ indexed: 2, totalFiles: 2, percentage: 100 });
    vi.stubEnv('AIWG_PROJECT_LOCAL_PATHS', '');
    await buildIndex(member, { graph: 'project' });
    expect(JSON.parse(fs.readFileSync(metadata, 'utf8')).entries).toEqual({});
  });
});
