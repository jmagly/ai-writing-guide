import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');

describe('@aiwg/cli release workflow wiring', () => {
  it('publishes the assembled package to npmjs with provenance and verifies it', () => {
    const workflow = readFileSync(path.join(ROOT, '.github/workflows/npm-publish.yml'), 'utf8');

    expect(workflow).toContain('npm run package:cli');
    expect(workflow).toContain('npm publish ./dist/packages/cli --provenance --access public');
    expect(workflow).toContain('npm view "@aiwg/cli@${VERSION}" --json');
    expect(workflow).toContain('npm view "@aiwg/cli@${NPM_TAG}" version');
    expect(workflow).toContain('remove_cli_bootstrap_tag:');
    expect(workflow).toContain('npm dist-tag rm @aiwg/cli bootstrap');
    expect(workflow).toContain('Remove deprecated @aiwg/cli bootstrap tag');
    expect(workflow).not.toContain('npm dist-tag add @aiwg/cli bootstrap');
  });

  it('publishes and promotes the assembled package in the Gitea registry', () => {
    const workflow = readFileSync(path.join(ROOT, '.gitea/workflows/npm-publish.yml'), 'utf8');

    expect(workflow.match(/npm run package:cli/g)).toHaveLength(2);
    expect(workflow).toContain('npm publish ./dist/packages/cli --registry=');
    expect(workflow).toContain('npm dist-tag add "@aiwg/cli@${VERSION}" "${TAG}"');
    expect(workflow).toContain('npm dist-tag add "@aiwg/cli@${VERSION}" latest');
    expect(workflow).toContain('npm view "aiwg@${VERSION}" dist.tarball --registry=');
    expect(workflow).toContain('npm view "@aiwg/cli@${VERSION}" dist.tarball --registry=');
    expect(workflow).toContain('npm view "@aiwg/cockpit@${VERSION}" dist.tarball --registry=');
    expect(workflow).toContain('VERSION="${GITHUB_REF#refs/tags/v}"');
    expect(workflow).toContain('npm install --prefix "$ROOT_INSTALL" --no-audit --no-fund "$ROOT_TARBALL"');
    expect(workflow).toContain('"$CLI_INSTALL/node_modules/.bin/aiwg" help');
    expect(workflow).toContain('"$COCKPIT_INSTALL/node_modules/.bin/aiwg-cockpit"');
    expect(workflow).not.toContain(
      'npm install -g aiwg@${VERSION} --registry=${{ env.GITEA_NPM_REGISTRY }}',
    );
  });

  it('documents a dependency-safe Gitea mirror install in generated releases', () => {
    const workflow = readFileSync(path.join(ROOT, '.gitea/workflows/gitea-release.yml'), 'utf8');

    expect(workflow).toContain(
      'api/packages/roctinam/npm/aiwg/-/%s/aiwg-%s.tgz',
    );
    expect(workflow).toContain(
      'Gitea bundled npm is a package store, not an npmjs proxy.',
    );
    expect(workflow).not.toContain(
      'npm install -g aiwg@%s --registry=https://git.integrolabs.net/api/packages/roctinam/npm/',
    );
  });
});
