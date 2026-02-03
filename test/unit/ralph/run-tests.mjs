#!/usr/bin/env node
/**
 * Test runner for Ralph multi-loop tests
 * Uses Node's built-in test runner
 */

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  path.join(__dirname, 'registry.test.mjs'),
  path.join(__dirname, 'state-manager.test.mjs'),
];

run({ files: tests })
  .compose(spec)
  .pipe(process.stdout);
