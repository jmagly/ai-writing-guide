import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveOmpPaths } from './omp-paths.mjs';
const execute = promisify(execFile);
/** Reports only parsed version and non-secret paths; never reflects runtime output. */
export async function diagnoseOmpRuntime({ cwd = process.cwd(), env = process.env, binary = env.AIWG_OMP_BIN || 'omp', runner = execute } = {}) {
  const paths = resolveOmpPaths({ cwd, env });
  const result = { executable: binary, available: false, version: null, paths, reason: 'OMP executable unavailable; install the supported binary or set AIWG_OMP_BIN.' };
  try {
    const output = await runner(binary, ['--version'], { cwd, env: { PATH: env.PATH || '', PI_CODING_AGENT_DIR: paths.agentDir, NO_COLOR: '1', ...(env.SystemRoot ? { SystemRoot: env.SystemRoot } : {}) }, timeout: 5000, maxBuffer: 16384, encoding: 'utf8' });
    const version = output.stdout.trim().match(/^(?:omp\/)?(\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)$/)?.[1];
    if (!version) { result.reason = 'OMP returned an unrecognized version; verify the selected executable.'; return result; }
    return { ...result, available: true, version, reason: null };
  } catch { return result; }
}
