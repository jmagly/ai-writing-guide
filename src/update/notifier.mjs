/**
 * AIWG Update Notifier
 *
 * Non-blocking update check for the AIWG CLI. Follows the
 * `update-notifier` / `simple-update-notifier` pattern:
 *
 *   1. On CLI invocation, `scheduleBackgroundCheck()` is called from
 *      `bin/aiwg.mjs`. It spawns a **detached, unref()'d** child Node
 *      process that runs this file with `--check` and writes the result
 *      to `~/.aiwg/update-notifier.json`. The child exits immediately
 *      after writing; the parent never waits on it.
 *
 *   2. On the *next* invocation, `maybePrintNotice()` reads the cache
 *      and prints a single-line "update available" message to stderr.
 *      The user's current command is never delayed by a network call.
 *
 * The update check honours `NO_UPDATE_NOTIFIER`, `CI`, the isInteractive()
 * helper, and `--no-update-check`. In all of those cases the check is
 * skipped entirely.
 *
 * Phase 3 of the CLI Stabilization Epic (#920). Replaces the synchronous
 * `checkForUpdates()` + hand-rolled prompt in `checker.mjs` that held the
 * event loop open after the command completed.
 *
 * @module src/update/notifier
 */

import https from 'https';
import path from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { resolveUserConfigDir } from '../config/user-config-dir.mjs';
import { loadInstallationIdentity } from '../installation/manager.mjs';

const CACHE_DIR = resolveUserConfigDir();
const CACHE_FILE = path.join(CACHE_DIR, 'update-notifier.json');

/**
 * Minimum time between update checks (24 hours). Checked via the
 * `lastCheckAt` timestamp in the cache file.
 */
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const NOTICE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Hard timeout for the npm registry HTTPS request. Keeps the spawned
 * background child from lingering on slow networks.
 */
const NETWORK_TIMEOUT_MS = 10_000;

/**
 * Read an env var and return true iff it's set to a truthy value.
 */
function envFlag(name, env = process.env) {
  const v = env[name];
  if (!v) return false;
  return v !== '0' && v.toLowerCase() !== 'false';
}

/**
 * True iff update checking is currently disabled by env / CI conventions.
 */
export function notificationDisabled(env = process.env, isTTY = process.stdout.isTTY) {
  if (envFlag('NO_UPDATE_NOTIFIER', env)) return true;
  if (envFlag('AIWG_NO_UPDATE_CHECK', env)) return true;
  if (envFlag('CI', env)) return true;
  if (envFlag('GITHUB_ACTIONS', env)) return true;
  if (envFlag('GITLAB_CI', env)) return true;
  // Non-interactive terminals shouldn't get a notice they can't act on.
  if (!isTTY) return true;
  return false;
}

function isDisabled() {
  return notificationDisabled();
}

/**
 * Read the update-notifier cache. Returns null if absent or malformed.
 */
function readCache() {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch {
    // Best-effort — update-notifier failures are never fatal.
  }
}

/**
 * Compare two CalVer/semver-style versions. Returns true iff `latest` is
 * newer than `current`. Cheap, no full semver parsing.
 */
function isNewer(current, latest) {
  if (!current || !latest || current === latest) return false;
  const parse = (v) => {
    const match = String(v).match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  };
  const [cy, cm, cp] = parse(current);
  const [ly, lm, lp] = parse(latest);
  if (ly > cy) return true;
  if (ly === cy && lm > cm) return true;
  if (ly === cy && lm === cm && lp > cp) return true;
  return false;
}

/**
 * Fetch the latest published version for the `latest` dist-tag from npm.
 * Resolves to `null` on error or timeout.
 */
function fetchLatestVersion() {
  return new Promise((resolve) => {
    const req = https.get(
      'https://registry.npmjs.org/aiwg',
      { timeout: NETWORK_TIMEOUT_MS },
      (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const pkg = JSON.parse(data);
            resolve(pkg['dist-tags']?.latest ?? null);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Read current CLI version from the package.json at `packageRoot`.
 */
function readCurrentVersion(packageRoot) {
  try {
    const pkgPath = path.join(packageRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return null;
  }
}

/**
 * Return true when a cached check belongs to the package currently handling
 * the command. A global launcher can dispatch into a newer development
 * checkout, so cache age alone is not sufficient.
 */
export function cacheMatchesPackage(cache, packageRoot) {
  const currentVersion = readCurrentVersion(packageRoot);
  return !!(currentVersion && cache?.current === currentVersion);
}

export function formatUpdateNotice(current, latest) {
  return (
    `aiwg: update available ${current} → ${latest}\n` +
    'Update: aiwg update\n' +
    'Then rerun your command.\n'
  );
}

export function noticeIsRateLimited(cache, intervalMs, now = Date.now()) {
  if (!cache?.lastNotifiedAt) return false;
  const age = now - new Date(cache.lastNotifiedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < intervalMs;
}

/** Resolve the package that the canonical installation record says is active. */
export function resolveActivePackageRoot(launcherPackageRoot) {
  try {
    const installation = loadInstallationIdentity({
      actualRoot: launcherPackageRoot,
      createIfMissing: false,
    });
    return installation?.root ?? launcherPackageRoot;
  } catch {
    // A broken installation identity is diagnosed by the installation
    // preflight. The best-effort notifier must never mask that recovery path.
    return launcherPackageRoot;
  }
}

/**
 * Run the actual update check and write the cache file. Invoked by the
 * spawned background child via `node src/update/notifier.mjs --check`.
 */
async function runCheck(packageRoot) {
  const currentVersion = readCurrentVersion(packageRoot);
  const latestVersion = await fetchLatestVersion();
  writeCache({
    lastCheckAt: new Date().toISOString(),
    current: currentVersion,
    latest: latestVersion,
    hasUpdate: !!(currentVersion && latestVersion && isNewer(currentVersion, latestVersion)),
  });
}

/**
 * Schedule a background update check if one hasn't run in the last
 * CHECK_INTERVAL_MS. Non-blocking: spawns a detached child process and
 * returns immediately. The parent must not wait on the child.
 *
 * Called exactly once per CLI invocation from `bin/aiwg.mjs`.
 */
export function scheduleBackgroundCheck(packageRoot) {
  if (isDisabled()) return;
  let installation;
  try {
    installation = loadInstallationIdentity({ actualRoot: packageRoot, createIfMissing: false });
  } catch {
    return;
  }
  if (installation?.checkOnStartup === false) return;

  const cache = readCache();
  if (cacheMatchesPackage(cache, packageRoot) && cache?.lastCheckAt) {
    const age = Date.now() - new Date(cache.lastCheckAt).getTime();
    if (age < (installation?.updateCheckInterval ?? CHECK_INTERVAL_MS)) return; // recent enough — skip
  }

  try {
    const entry = fileURLToPath(import.meta.url);
    const child = spawn(
      process.execPath,
      [entry, '--check', '--package-root', packageRoot],
      {
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, AIWG_UPDATE_NOTIFIER_CHILD: '1' },
      },
    );
    // Unref so the parent can exit without waiting for the child. This is
    // the crucial detail that prevents the "command hangs for 5 minutes"
    // symptom we had before #918.
    child.unref();
  } catch {
    // Spawn failures are non-fatal; the next invocation will retry.
  }
}

/**
 * If the cache indicates an update is available AND the current terminal
 * is interactive, print a single-line notice to stderr. Never prompts.
 * Safe to call unconditionally from `bin/aiwg.mjs` — gated by isDisabled().
 */
export function maybePrintNotice(packageRoot) {
  if (isDisabled()) return;
  let installation;
  try {
    installation = loadInstallationIdentity({ actualRoot: packageRoot, createIfMissing: false });
  } catch {
    return;
  }
  if (installation?.checkOnStartup === false) return;
  const cache = readCache();
  if (!cacheMatchesPackage(cache, packageRoot)) return;
  if (!cache?.hasUpdate || !cache.current || !cache.latest) return;
  const noticeInterval = installation?.updateCheckInterval ?? NOTICE_INTERVAL_MS;
  if (noticeIsRateLimited(cache, noticeInterval)) return;
  process.stderr.write(formatUpdateNotice(cache.current, cache.latest));
  writeCache({ ...cache, lastNotifiedAt: new Date().toISOString() });
}

// ── Child-process entry ────────────────────────────────────────────────

// If invoked with `--check`, act as the background-child worker.
if (process.argv.includes('--check')) {
  const rootIdx = process.argv.indexOf('--package-root');
  const packageRoot = rootIdx >= 0 ? process.argv[rootIdx + 1] : process.cwd();
  runCheck(packageRoot).catch(() => {
    // Swallow all errors — the background child must never write to stderr.
    process.exit(0);
  });
}
