/**
 * Shared helper: walk up from a starting directory to find AIWG's package root
 * (the directory containing the package.json with name === 'aiwg').
 *
 * Required because the compiled layout (dist/src/<area>/<file>.js) and the
 * source layout (src/<area>/<file>.ts) are different depths from the package
 * root, so fixed `../../` walks break in one of the two modes. Walking up to
 * the `aiwg` package.json works in both.
 *
 * @issue #1261
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Walk up from `startDir` looking for a `package.json` with `name === 'aiwg'`.
 * Returns the directory containing that package.json, or `null` if not found
 * within `maxDepth` levels.
 */
export function findPackageRoot(startDir: string, maxDepth = 10): string | null {
  let dir = startDir;
  for (let i = 0; i < maxDepth; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === 'aiwg') return dir;
      } catch {
        /* malformed package.json — keep walking */
      }
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
