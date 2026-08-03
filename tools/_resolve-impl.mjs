import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function findPackageRoot(callerUrl) {
  let dir = dirname(fileURLToPath(callerUrl));
  for (let i = 0; i < 12; i += 1) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'aiwg' || pkg.name === '@aiwg/cli') return dir;
      } catch {
        // Keep walking.
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(`Could not locate AIWG package root from ${callerUrl}`);
}

function candidatesFor(root, relativeFromSrc, base) {
  const primary = resolve(root, base, relativeFromSrc);
  const candidates = [primary];

  if (base === 'src' && extname(primary) === '.js') {
    candidates.push(primary.slice(0, -3) + '.ts');
  }

  return candidates;
}

function resolveCandidate(root, relativeFromSrc, base) {
  for (const candidate of candidatesFor(root, relativeFromSrc, base)) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve a module that may live under compiled dist/src/ or source src/.
 *
 * Prefers dist/src/ when present. Set AIWG_RESOLVE_IMPL_FROM=dist or src to
 * force a side during CI/package-layout checks.
 */
export function resolveImpl(callerUrl, relativeFromSrc) {
  const root = findPackageRoot(callerUrl);
  const forced = process.env.AIWG_RESOLVE_IMPL_FROM;

  const order = forced === 'src'
    ? ['src']
    : forced === 'dist'
      ? ['dist/src']
      : ['dist/src', 'src'];

  for (const base of order) {
    const candidate = resolveCandidate(root, relativeFromSrc, base);
    if (candidate) return candidate;
  }

  const attempted = order
    .flatMap((base) => candidatesFor(root, relativeFromSrc, base))
    .join(', ');
  throw new Error(`Could not resolve ${relativeFromSrc}; attempted: ${attempted}`);
}

export async function importImpl(callerUrl, relativeFromSrc) {
  const modulePath = resolveImpl(callerUrl, relativeFromSrc);
  return import(pathToFileURL(modulePath).href);
}
