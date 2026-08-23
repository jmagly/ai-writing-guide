import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Resolve AIWG's global, provider-neutral user configuration directory.
 *
 * Contract: explicit override > AIWG_CONFIG > existing ~/.aiwg > existing
 * ~/.config/aiwg > ~/.aiwg. Keeping this in a dependency-free ESM module lets
 * the launcher, channel manager, updater, and TypeScript config API share the
 * exact same resolution rules.
 */
export function resolveUserConfigDir(options = {}) {
  if (options.configDir) return path.resolve(options.configDir);
  const env = options.env ?? process.env;
  if (env.AIWG_CONFIG) return path.resolve(env.AIWG_CONFIG);

  const home = options.homeDir ?? os.homedir();
  const legacy = path.join(home, '.aiwg');
  const xdg = path.join(home, '.config', 'aiwg');
  const pathExists = options.exists ?? existsSync;
  if (pathExists(legacy)) return legacy;
  if (pathExists(xdg)) return xdg;
  return legacy;
}

export function userConfigFile(name, options = {}) {
  return path.join(resolveUserConfigDir(options), name);
}
