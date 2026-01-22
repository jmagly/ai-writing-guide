#!/usr/bin/env npx tsx
/**
 * Router Entry Point
 *
 * Entry point for running the TypeScript router via tsx.
 * This file is executed by router-loader.mjs.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #48
 */

import { run } from './router.js';

const args = process.argv.slice(2);

run(args, { cwd: process.cwd() }).catch((error) => {
  console.error('Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
