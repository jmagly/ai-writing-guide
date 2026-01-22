/**
 * Router Loader for TypeScript Router
 *
 * Uses tsx to load the TypeScript router directly without compilation.
 * This allows the experimental router to work during development.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #48
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the TypeScript router via tsx
 *
 * @param {string[]} args - Command line arguments
 * @param {object} [options] - Execution options
 */
export async function run(args, options = {}) {
  const routerPath = path.join(__dirname, 'router-entry.ts');

  return new Promise((resolve, reject) => {
    // Use npx tsx - the shell:true is fine for user-controlled args in dev tooling
    const child = spawn('npx', ['tsx', routerPath, ...args], {
      cwd: options.cwd || process.cwd(),
      stdio: 'inherit',
      shell: process.platform === 'win32', // Only use shell on Windows
    });

    child.on('close', (code) => {
      if (code !== 0) {
        process.exit(code);
      }
      resolve();
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
