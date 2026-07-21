import os from 'node:os';
import path from 'node:path';

/** User-owned root for optional runtime packages. */
export function getFeaturesRoot(): string {
  if (process.env.AIWG_FEATURES_HOME) return process.env.AIWG_FEATURES_HOME;

  if (process.platform === 'win32') {
    const dataHome = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local');
    return path.join(dataHome, 'aiwg', 'features');
  }

  const dataHome = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, 'aiwg', 'features');
}
