import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const verifier = resolve(root, 'tools/benchmarks/verify-storage-claims.mjs');
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const temporary of temporaryRoots.splice(0)) rmSync(temporary, { recursive: true, force: true });
});

describe('storage benchmark claim gate (#2191)', () => {
  it('accepts the checked-in current evidence and rendered claim', () => {
    const result = JSON.parse(execFileSync(process.execPath, [verifier, root], { encoding: 'utf8' }));
    expect(result).toEqual({
      schemaVersion: 'aiwg.storage-benchmark-claims/v1',
      valid: true,
      claims: [
        'postgres-direct-reference-v1',
        'postgres-postgrest-reference-v1',
        'sqlite-local-reference-v1',
      ],
    });
  });

  it('rejects stale source evidence and documentation drift', () => {
    const stale = fixtureRoot();
    writeFileSync(join(stale, 'src/artifacts/backends/sqlite-backend.ts'), 'changed\n');
    expect(() => execFileSync(process.execPath, [verifier, stale], { encoding: 'utf8', stdio: 'pipe' }))
      .toThrow(/evidence is stale/);

    const drifted = fixtureRoot();
    const document = join(drifted, 'docs/extensions/graph-backends.md');
    writeFileSync(document, readFileSync(document, 'utf8').replace('ops/s', 'records/s'));
    expect(() => execFileSync(process.execPath, [verifier, drifted], { encoding: 'utf8', stdio: 'pipe' }))
      .toThrow(/documented measurements do not match/);
  });

  it('rejects incomplete server metrics and qualification scope drift', () => {
    const incomplete = fixtureRoot();
    const directPath = join(incomplete, 'docs/storage/evidence/postgres-direct-reference-v1.json');
    const direct = JSON.parse(readFileSync(directPath, 'utf8'));
    direct.qualification.resources.walBytes = null;
    writeFileSync(directPath, `${JSON.stringify(direct, null, 2)}\n`);
    expect(() => execFileSync(process.execPath, [verifier, incomplete], { encoding: 'utf8', stdio: 'pipe' }))
      .toThrow(/required metric walBytes is unavailable/);

    const drifted = fixtureRoot();
    const postgrestPath = join(drifted, 'docs/storage/evidence/postgres-postgrest-reference-v1.json');
    const postgrest = JSON.parse(readFileSync(postgrestPath, 'utf8'));
    postgrest.qualification.scope.observedOperations -= 1;
    writeFileSync(postgrestPath, `${JSON.stringify(postgrest, null, 2)}\n`);
    expect(() => execFileSync(process.execPath, [verifier, drifted], { encoding: 'utf8', stdio: 'pipe' }))
      .toThrow(/operation scope mismatch/);
  });

  it('runs before storage claims can ship from CI and tag workflows', () => {
    const workflows = [
      '.gitea/workflows/ci.yml',
      '.gitea/workflows/gitea-release.yml',
      '.gitea/workflows/github-mirror.yml',
      '.gitea/workflows/npm-publish.yml',
      '.gitea/workflows/docsite-deploy.yml',
      '.github/workflows/npm-publish.yml',
    ];
    for (const workflow of workflows) {
      const content = readFileSync(resolve(root, workflow), 'utf8');
      expect(content, workflow).toContain('npm run verify:storage-claims');
    }
  });
});

function fixtureRoot(): string {
  const temporary = mkdtempSync(join(tmpdir(), 'aiwg-storage-claim-'));
  temporaryRoots.push(temporary);
  const registryPath = 'docs/storage/evidence/claims.v1.json';
  const registry = JSON.parse(readFileSync(resolve(root, registryPath), 'utf8')) as {
    claims: Array<{ evidence: string; document: string; sourceFiles: string[] }>;
  };
  const paths = new Set([registryPath]);
  for (const claim of registry.claims) {
    paths.add(claim.evidence);
    paths.add(claim.document);
    for (const source of claim.sourceFiles) paths.add(source);
  }
  for (const path of paths) {
    cpSync(resolve(root, path), resolve(temporary, path), { recursive: true });
  }
  return temporary;
}
