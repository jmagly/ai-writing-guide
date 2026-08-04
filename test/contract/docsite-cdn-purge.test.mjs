import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(join(root, '.gitea', 'workflows', 'docsite-deploy.yml'), 'utf8');
const docs = readFileSync(join(root, '.gitea', 'workflows', 'README.md'), 'utf8');

describe('docsite CDN purge contract', () => {
  it('uses only root-tenant URL invalidation and excludes protected tenants', () => {
    expect(workflow).not.toContain(['purge', 'everything'].join('_'));
    expect(workflow).toContain('BASE="https://docs.aiwg.io"');
    expect(workflow).toContain("base.hostname !== 'docs.aiwg.io'");
    expect(workflow).toContain('protectedPaths.has(parts[0])');
    expect(workflow).toContain('PROTECTED_DOCS_SUBPATHS');
    expect(workflow).toContain("new URL('index.html', base)");
    expect(workflow).toContain("parts.at(-1) === 'index.html'");
    expect(workflow).toContain("`${directory}/`");
    expect(workflow).not.toMatch(/BASE="https:\/\/(?!docs\.aiwg\.io)/);
  });

  it('batches within the per-request limit and validates transport and API success', () => {
    expect(workflow).toContain('split -l 30');
    expect(workflow).toContain("--write-out '%{http_code}'");
    expect(workflow).toContain('^2[0-9][0-9]$');
    expect(workflow).toContain("jq -e '.success == true'");
    expect(workflow).toContain("echo \"performed=true\"");
  });

  it('verifies a deployment marker and public cache validators after purge', () => {
    expect(workflow).toContain("if: steps.purge.outputs.performed == 'true'");
    expect(workflow).toContain('aiwg-deploy-${DEPLOY_SHA}.txt');
    expect(workflow).not.toContain('/.aiwg-deploy-');
    expect(workflow).toContain("grep -qi '^cache-control:'");
    expect(workflow).toContain("grep -qi '^etag:'");
    expect(workflow).toContain('If-None-Match: ${etag}');
    expect(workflow).toContain('conditional_status" != "304');
  });

  it('documents degraded credentials, rollback behavior, and ownership', () => {
    expect(workflow).toContain('degraded CDN status');
    expect(docs).toContain('Rollbacks use this same deployment workflow and scoped purge path.');
    expect(docs).toContain('at most 30');
    expect(docs).toContain('another hostname');
  });
});
