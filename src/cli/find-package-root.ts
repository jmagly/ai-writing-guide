/**
 * Shared helper: walk up from a starting directory to find AIWG's package root
 * (the directory containing the full or lightweight AIWG package.json).
 *
 * Required because the compiled layout (dist/src/<area>/<file>.js) and the
 * source layout (src/<area>/<file>.ts) are different depths from the package
 * root, so fixed `../../` walks break in one of the two modes. Walking up to
 * the package manifest works in source, full-package, and `@aiwg/cli` modes.
 *
 * @issue #1261
 */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Walk up from `startDir` looking for an AIWG package manifest.
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
        if (pkg.name === 'aiwg' || pkg.name === '@aiwg/cli') return dir;
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
