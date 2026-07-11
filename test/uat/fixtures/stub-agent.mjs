#!/usr/bin/env node
/**
 * Stub agent for UAT testing.
 *
 * Simulates a successful agent run by printing the completion marker that
 * output-analyzer.mjs recognizes, then exiting 0.
 *
 * Also logs each invocation to a file (UAT_LOG_FILE env var) so tests can
 * assert the agent was actually called.
 */

import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const logFile = process.env.UAT_LOG_FILE;
if (logFile) {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, JSON.stringify({
    ts: new Date().toISOString(),
    pid: process.pid,
    args: process.argv.slice(2),
  }) + '\n');
}

const output = process.env.UAT_STUB_OUTPUT || 'Ralph Loop: SUCCESS\nTask complete.\n';
process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
process.exit(0);
