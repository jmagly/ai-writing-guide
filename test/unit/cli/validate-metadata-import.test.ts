/**
 * Regression test for #1001 — `aiwg validate-metadata` crashed with
 * ERR_MODULE_NOT_FOUND because tools/cli/validate-metadata.mjs imported
 * `../../dist/plugin/metadata-validator.js`, which doesn't exist; the
 * compiled file lives at `../../dist/src/plugin/metadata-validator.js`.
 *
 * This test reads the actual mjs file and asserts the import path
 * resolves to a real file on disk. Catches future drift if the
 * dist/ layout changes again.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const VALIDATE_MJS = resolve(REPO_ROOT, 'tools/cli/validate-metadata.mjs');

describe('validate-metadata.mjs imports (#1001)', () => {
  it('imports MetadataValidator from a path that exists on disk', () => {
    const src = readFileSync(VALIDATE_MJS, 'utf-8');
    // Match: import { MetadataValidator } from '<relative-path>';
    const match = src.match(/import\s*\{\s*MetadataValidator\s*\}\s*from\s*['"]([^'"]+)['"]/);
    expect(match, 'expected MetadataValidator import in validate-metadata.mjs').not.toBeNull();

    const importPath = match![1];
    const resolved = resolve(dirname(VALIDATE_MJS), importPath);
    expect(
      existsSync(resolved),
      `MetadataValidator import resolves to ${resolved} which does not exist (was '${importPath}'). ` +
        `Check tools/cli/validate-metadata.mjs:11 — the dist/ layout uses dist/src/plugin/, not dist/plugin/.`,
    ).toBe(true);
  });
});
