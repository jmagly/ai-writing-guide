#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';

const frameworkRoot = process.env.AIWG_ROOT
  ? path.resolve(process.env.AIWG_ROOT)
  : path.resolve(import.meta.dirname, '../../../../../../..');
const tool = path.join(frameworkRoot, 'tools/issues/policy-boundary-composer.mjs');
const args = process.argv.slice(2);
const commandArgs = args[0] && !args[0].startsWith('-') ? args : ['plan', ...args];
const result = spawnSync(process.execPath, [tool, ...commandArgs], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
