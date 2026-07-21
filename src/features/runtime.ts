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
      return await (new Function('m', 'return import(m)'))(name) as Record<string, unknown>;
    } catch {
      throw featureError;
    }
  }
}
