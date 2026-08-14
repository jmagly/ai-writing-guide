import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getFeaturesRoot } from './paths.js';

/** Load an optional package from the user feature root, then the base install. */
export async function loadFeaturePackage(name: string): Promise<Record<string, unknown>> {
  const featureRequire = createRequire(path.join(getFeaturesRoot(), 'package.json'));
  try {
    const resolved = featureRequire.resolve(name);
    return await import(pathToFileURL(resolved).href) as Record<string, unknown>;
  } catch (featureError) {
    try {
      const resolved = createRequire(import.meta.url).resolve(name);
      return await import(pathToFileURL(resolved).href) as Record<string, unknown>;
    } catch {
      throw featureError;
    }
  }
}

/** Synchronous counterpart for optional CommonJS packages used by constructors. */
export function requireFeaturePackage(name: string): unknown {
  const featureRequire = createRequire(path.join(getFeaturesRoot(), 'package.json'));
  try {
    return featureRequire(name);
  } catch (featureError) {
    try {
      return createRequire(import.meta.url)(name);
    } catch {
      throw featureError;
    }
  }
}
