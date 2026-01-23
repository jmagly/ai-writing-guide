/**
 * Script Runner
 *
 * Utility for running framework scripts from handlers.
 * Script execution utility for CLI handlers.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @issue #33
 */

import { spawn } from 'child_process';
import path from 'path';
import { HandlerResult, ScriptRunner, ScriptRunnerOptions } from './types.js';

/**
 * Default script runner implementation
 *
 * Delegates command execution to existing Node.js scripts.
 */
export class DefaultScriptRunner implements ScriptRunner {
  constructor(private frameworkRoot: string) {}

  /**
   * Run a Node.js script from the framework
   *
   * @param scriptPath - Relative path to script from framework root
   * @param args - Arguments to pass to script
   * @param options - Execution options
   */
  async run(
    scriptPath: string,
    args: string[] = [],
    options: ScriptRunnerOptions = {}
  ): Promise<HandlerResult> {
    const fullPath = path.join(this.frameworkRoot, scriptPath);

    return new Promise((resolve) => {
      const child = spawn('node', [fullPath, ...args], {
        stdio: 'inherit',
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
      });

      const timeout = options.timeout;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      if (timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          resolve({
            exitCode: 124,
            message: `Script timed out after ${timeout}ms`,
            error: new Error(`Timeout after ${timeout}ms`),
          });
        }, timeout);
      }

      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve({
          exitCode: code ?? 0,
        });
      });

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve({
          exitCode: 1,
          message: `Script error: ${err.message}`,
          error: err,
        });
      });
    });
  }
}

/**
 * Create a script runner for the given framework root
 */
export function createScriptRunner(frameworkRoot: string): ScriptRunner {
  return new DefaultScriptRunner(frameworkRoot);
}
