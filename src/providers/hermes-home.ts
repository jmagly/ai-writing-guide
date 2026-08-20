import { homedir } from 'node:os';
import * as path from 'node:path';

/** Match Hermes Agent's process-level HERMES_HOME resolution contract. */
export function resolveHermesHome(userHome = homedir()): string {
  const configured = (process.env.HERMES_HOME || '').trim();
  if (configured) return configured;

  if (process.platform === 'win32') {
    const localAppData = (process.env.LOCALAPPDATA || '').trim();
    return localAppData
      ? path.join(localAppData, 'hermes')
      : path.join(userHome, 'AppData', 'Local', 'hermes');
  }

  return path.join(userHome, '.hermes');
}

/** Resolve a path exactly as a Hermes process would consume HERMES_HOME. */
export function resolveHermesHomePath(...segments: string[]): string {
  return path.resolve(resolveHermesHome(), ...segments);
}
