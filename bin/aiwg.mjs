#!/usr/bin/env node

/**
 * AIWG CLI Entry Point
 *
 * This is the main entry point for the aiwg CLI when installed via npm.
 * It handles:
 * - Channel detection (stable vs edge mode)
 * - Background update checking
 * - Command routing to appropriate handlers
 *
 * @module bin/aiwg
 * @version 2024.12.0
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { run } from '../src/cli/index.mjs';
import { checkForUpdates } from '../src/update/checker.mjs';
import { getChannel, getPackageRoot } from '../src/channel/manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the package root (where package.json lives)
const packageRoot = path.resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);

  // Handle special channel switching commands first
  if (args[0] === '--use-main' || args[0] === '--use-edge') {
    const { switchToEdge } = await import('../src/channel/manager.mjs');
    await switchToEdge();
    return;
  }

  if (args[0] === '--use-stable' || args[0] === '--use-npm') {
    const { switchToStable } = await import('../src/channel/manager.mjs');
    await switchToStable();
    return;
  }

  // Non-blocking update check (runs in background)
  checkForUpdates().catch(() => {
    // Silently ignore update check failures
  });

  // Run the CLI with the package root context
  await run(args, { packageRoot });
}

main().catch((error) => {
  console.error('Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
