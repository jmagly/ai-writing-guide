#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const cockpitRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const webRoot = join(cockpitRoot, 'web');
const distRoot = join(webRoot, 'dist');
const lockKey = createHash('sha256').update(cockpitRoot).digest('hex').slice(0, 16);
const lockRoot = join(tmpdir(), `aiwg-cockpit-web-release-${lockKey}.lock`);
const lockTimeoutMs = 15 * 60 * 1000;
const staleLockMs = 30 * 60 * 1000;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function acquireLock() {
  const startedAt = Date.now();

  while (true) {
    try {
      await mkdir(lockRoot);
      await writeFile(
        join(lockRoot, 'owner.json'),
        `${JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })}\n`,
      );
      return;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;

      try {
        const lockStat = await stat(lockRoot);
        if (Date.now() - lockStat.mtimeMs > staleLockMs) {
          await rm(lockRoot, { recursive: true, force: true });
          continue;
        }
      } catch (statError) {
        if (statError?.code === 'ENOENT') continue;
        throw statError;
      }

      if (Date.now() - startedAt > lockTimeoutMs) {
        let owner = 'unknown';
        try {
          owner = (await readFile(join(lockRoot, 'owner.json'), 'utf8')).trim();
        } catch {
          // The owner file is diagnostic only.
        }
        throw new Error(`Timed out waiting for Cockpit web release build lock: ${owner}`);
      }

      await delay(250);
    }
  }
}

function runNpm(args, cwd, cacheRoot) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const env = {
    ...process.env,
    NODE_ENV: 'development',
  };

  // npm exposes its active configuration to lifecycle scripts. In particular,
  // `npm pack --dry-run` injects npm_config_dry_run=true; allowing that value
  // into this nested `npm ci` makes it exit successfully without installing
  // Vite or the React plugin. Release builds need their own explicit config.
  for (const key of Object.keys(env)) {
    if (/^npm_config_(cache|dry_run|production|omit|include|only)$/i.test(key)) {
      delete env[key];
    }
  }
  env.npm_config_cache = cacheRoot;

  const result = spawnSync(npmCommand, args, {
    cwd,
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

async function buildWebRelease() {
  await acquireLock();

  const stageRoot = await mkdtemp(join(tmpdir(), 'aiwg-cockpit-web-release-'));
  const stagedWebRoot = join(stageRoot, 'web');
  const cacheRoot = join(stageRoot, '.npm-cache');
  const nextDistRoot = join(webRoot, `.dist-release-${process.pid}-${Date.now()}`);
  const previousDistRoot = join(webRoot, `.dist-previous-${process.pid}-${Date.now()}`);
  let previousDistMoved = false;

  try {
    await cp(webRoot, stagedWebRoot, {
      recursive: true,
      filter(source) {
        const pathFromWebRoot = relative(webRoot, source);
        const firstSegment = pathFromWebRoot.split(/[\\/]/, 1)[0];
        return firstSegment !== 'node_modules'
          && firstSegment !== 'dist'
          && !firstSegment.startsWith('.dist-release-')
          && !firstSegment.startsWith('.dist-previous-');
      },
    });

    runNpm(['ci', '--include=dev', '--no-audit', '--no-fund'], stagedWebRoot, cacheRoot);
    runNpm(['run', 'build'], stagedWebRoot, cacheRoot);

    await cp(join(stagedWebRoot, 'dist'), nextDistRoot, { recursive: true });

    try {
      await rename(distRoot, previousDistRoot);
      previousDistMoved = true;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }

    try {
      await rename(nextDistRoot, distRoot);
    } catch (error) {
      if (previousDistMoved) await rename(previousDistRoot, distRoot);
      throw error;
    }

    if (previousDistMoved) {
      await rm(previousDistRoot, { recursive: true, force: true });
      previousDistMoved = false;
    }

    process.stdout.write(
      `Cockpit production UI built from ${basename(stagedWebRoot)} and staged at web/dist.\n`,
    );
  } finally {
    if (previousDistMoved) {
      try {
        await rename(previousDistRoot, distRoot);
      } catch {
        // Preserve the original build error; the staged paths remain diagnostic.
      }
    }
    await rm(nextDistRoot, { recursive: true, force: true });
    await rm(stageRoot, { recursive: true, force: true });
    await rm(lockRoot, { recursive: true, force: true });
  }
}

await buildWebRelease();
