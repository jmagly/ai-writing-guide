import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readJson(file: string) {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, file), 'utf8'));
}

describe('package metadata install hygiene (#1274)', () => {
  it('keeps deprecated native prebuild plumbing out of the default install tree', () => {
    const lock = readJson('package-lock.json');
    const packages = lock.packages ?? {};

    expect(packages['node_modules/prebuild-install']).toBeUndefined();
  });

  it('keeps install-heavy native feature packages as optional peers', () => {
    const pkg = readJson('package.json');

    expect(pkg.optionalDependencies ?? {}).not.toHaveProperty('better-sqlite3');
    expect(pkg.optionalDependencies ?? {}).not.toHaveProperty('@xenova/transformers');
    expect(pkg.peerDependencies ?? {}).toHaveProperty('better-sqlite3');
    expect(pkg.peerDependencies ?? {}).toHaveProperty('@xenova/transformers');
    expect(pkg.peerDependenciesMeta?.['better-sqlite3']?.optional).toBe(true);
    expect(pkg.peerDependenciesMeta?.['@xenova/transformers']?.optional).toBe(true);
  });
});
