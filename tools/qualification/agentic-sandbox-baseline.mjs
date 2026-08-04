#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SANDBOX_BASELINE = Object.freeze({
  tag: 'v2026.8.3',
  commit: '201221e5a26f7f0cc719ab584520ce3164065825',
});

export function validateSandboxIdentity({ tag, commit }) {
  if (tag !== SANDBOX_BASELINE.tag || commit !== SANDBOX_BASELINE.commit) {
    throw new Error(`Agentic Sandbox baseline drift: expected ${SANDBOX_BASELINE.tag}@${SANDBOX_BASELINE.commit}, received ${tag}@${commit}`);
  }
  return SANDBOX_BASELINE;
}

function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

export function main() {
  const sandboxRoot = resolve(argument('--sandbox-root', '../agentic-sandbox'));
  const commit = git(sandboxRoot, 'rev-parse', 'HEAD');
  const tag = git(sandboxRoot, 'describe', '--tags', '--exact-match');
  validateSandboxIdentity({ tag, commit });

  const managementRoot = resolve(sandboxRoot, 'management');
  const binary = resolve(managementRoot, 'target/debug/agentic-mgmt');
  if (!process.argv.includes('--skip-build')) {
    const build = spawnSync('cargo', ['build', '--bin', 'agentic-mgmt'], { cwd: managementRoot, stdio: 'inherit' });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }
  if (!existsSync(binary)) throw new Error(`exact-baseline management binary is missing: ${binary}`);
  if (process.argv.includes('--check-only')) {
    console.log(`Agentic Sandbox baseline verified: ${tag}@${commit}`);
    return;
  }

  const aiwgCommit = git(process.cwd(), 'rev-parse', 'HEAD');
  const result = spawnSync('npm', ['run', 'uat:fleet-sandbox-live'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      AGENTIC_SANDBOX_MGMT_BIN: binary,
      AIWG_FLEET_SANDBOX_LIVE_REQUIRED: '1',
      AGENTIC_SANDBOX_QUALIFICATION_TAG: tag,
      AGENTIC_SANDBOX_QUALIFICATION_COMMIT: commit,
      AIWG_QUALIFICATION_COMMIT: aiwgCommit,
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
