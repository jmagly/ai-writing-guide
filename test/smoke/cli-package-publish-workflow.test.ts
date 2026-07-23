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
  });

  it('publishes and promotes the assembled package in the Gitea registry', () => {
    const workflow = readFileSync(path.join(ROOT, '.gitea/workflows/npm-publish.yml'), 'utf8');

    expect(workflow.match(/npm run package:cli/g)).toHaveLength(2);
    expect(workflow).toContain('npm publish ./dist/packages/cli --registry=');
    expect(workflow).toContain('npm dist-tag add "@aiwg/cli@${VERSION}" "${TAG}"');
    expect(workflow).toContain('npm dist-tag add "@aiwg/cli@${VERSION}" latest');
  });
});
