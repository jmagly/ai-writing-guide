import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const githubWorkflow = readFileSync(resolve('.github/workflows/npm-publish.yml'), 'utf8');
const giteaWorkflow = readFileSync(resolve('.gitea/workflows/npm-publish.yml'), 'utf8');
const smoke = readFileSync(resolve('tools/ci/session-feature-install-smoke.mjs'), 'utf8');

describe('session SQLite feature release gate', () => {
  it('runs the packed-install smoke before every npm publication lane', () => {
    expect(githubWorkflow.match(/npm run test:sessions:feature-install/g)).toHaveLength(1);
    expect(giteaWorkflow.match(/npm run test:sessions:feature-install/g)).toHaveLength(2);

    expect(githubWorkflow.indexOf('npm run test:sessions:feature-install'))
      .toBeLessThan(githubWorkflow.indexOf('- name: Publish to npmjs.org'));

    const giteaSmokes = [...giteaWorkflow.matchAll(/npm run test:sessions:feature-install/g)]
      .map(match => match.index);
    expect(giteaSmokes[0]).toBeLessThan(giteaWorkflow.indexOf('- name: Publish pre-release'));
    expect(giteaSmokes[1]).toBeLessThan(giteaWorkflow.indexOf('- name: Publish to Gitea npm registry'));
  });

  it('exercises the documented feature installer and an empty session catalog', () => {
    expect(smoke).toContain("'features', 'install', 'sqlite'");
    expect(smoke).toContain("'sessions', 'list'");
    expect(smoke).toContain("'CATALOG_UNAVAILABLE'");
    expect(smoke).toContain("featureRequire('better-sqlite3')");
    expect(smoke).toContain("'--omit=optional'");
  });
});
