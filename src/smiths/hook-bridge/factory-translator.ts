/**
 * Factory hook translator — emits per-droid hook scripts that use
 * $FACTORY_PROJECT_DIR instead of $CLAUDE_PROJECT_DIR.
 *
 * Per ADR-3 §2: the canonical $AIWG_PROJECT_DIR is substituted with
 * $FACTORY_PROJECT_DIR at deploy time. The translator emits a wrapper
 * shell script under .factory/hooks/<id>.sh that calls the AIWG hook
 * command with the right env-var binding.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { HookSource, TranslateOptions, TranslateResult } from './types.js';
import { generateShimBash } from './shim.js';

export async function translateForFactory(
  source: HookSource,
  options: TranslateOptions,
): Promise<TranslateResult> {
  const result: TranslateResult = {
    provider: 'factory',
    emittedPaths: [],
    warnings: [],
    skipped: false,
  };

  if (source.degradeOn?.includes('factory')) {
    result.skipped = true;
    result.skipReason = 'degrade-on declared factory';
    return result;
  }

  const hooksDir = path.join(options.projectPath, '.factory', 'hooks');
  const scriptPath = path.join(hooksDir, `${source.id}.sh`);
  const shim = generateShimBash('factory', source.command, source.args || []);

  if (options.dryRun) {
    result.emittedPaths.push(scriptPath + ' (dry-run)');
    return result;
  }

  await fs.mkdir(hooksDir, { recursive: true });
  await fs.writeFile(scriptPath, shim, 'utf8');
  try {
    await fs.chmod(scriptPath, 0o755);
  } catch {
    // Non-POSIX
  }
  result.emittedPaths.push(scriptPath);
  return result;
}
