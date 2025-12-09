/**
 * Update Checker
 *
 * Checks for available updates and prompts the user to update.
 * - Stable channel: Checks npm registry for newer version
 * - Edge channel: Checks git remote for new commits
 *
 * @module src/update/checker
 * @version 2024.12.0
 */

import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { createInterface } from 'readline';
import { loadConfig, saveConfig, getChannel, getPackageRoot } from '../channel/manager.mjs';

const NPM_REGISTRY = 'https://registry.npmjs.org/aiwg';

/**
 * Fetch latest version from npm registry
 * @returns {Promise<string|null>} Latest version or null on error
 */
async function fetchLatestNpmVersion() {
  return new Promise((resolve) => {
    const request = https.get(NPM_REGISTRY, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }

      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const pkg = JSON.parse(data);
          resolve(pkg['dist-tags']?.latest || null);
        } catch {
          resolve(null);
        }
      });
    });

    request.on('error', () => resolve(null));
    request.on('timeout', () => {
      request.destroy();
      resolve(null);
    });
  });
}

/**
 * Check if there are new commits in the git remote (edge channel)
 * @param {string} edgePath - Path to edge installation
 * @returns {Promise<boolean>} True if updates available
 */
async function checkGitUpdates(edgePath) {
  try {
    // Fetch latest without merging
    execSync('git fetch --quiet', { cwd: edgePath, timeout: 10000 });

    // Check if local is behind remote
    const localHash = execSync('git rev-parse HEAD', {
      cwd: edgePath,
      encoding: 'utf8',
    }).trim();

    const remoteHash = execSync('git rev-parse origin/main', {
      cwd: edgePath,
      encoding: 'utf8',
    }).trim();

    return localHash !== remoteHash;
  } catch {
    return false;
  }
}

/**
 * Compare CalVer versions
 * @param {string} current - Current version (e.g., "2024.12.0")
 * @param {string} latest - Latest version
 * @returns {boolean} True if latest is newer
 */
function isNewerVersion(current, latest) {
  if (!current || !latest) return false;

  const parseVersion = (v) => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return [0, 0, 0];
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
  };

  const [cy, cm, cp] = parseVersion(current);
  const [ly, lm, lp] = parseVersion(latest);

  if (ly > cy) return true;
  if (ly === cy && lm > cm) return true;
  if (ly === cy && lm === cm && lp > cp) return true;

  return false;
}

/**
 * Prompt user for update confirmation
 * @param {string} message - Prompt message
 * @returns {Promise<boolean>} True if user confirms
 */
async function promptUpdate(message) {
  // Skip prompt if not interactive terminal
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} [y/N]: `, (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

/**
 * Check for updates (background, non-blocking)
 * This is called on every CLI invocation but only checks periodically
 */
export async function checkForUpdates() {
  const config = await loadConfig();

  // Check if enough time has passed since last check
  const now = Date.now();
  const lastCheck = config.lastUpdateCheck || 0;
  const interval = config.updateCheckInterval || 86400000; // 24 hours

  if (now - lastCheck < interval) {
    // Too soon to check again
    return;
  }

  // Update last check time
  config.lastUpdateCheck = now;
  await saveConfig(config);

  if (config.channel === 'stable') {
    await checkStableUpdates(config);
  } else {
    await checkEdgeUpdates(config);
  }
}

/**
 * Check for stable (npm) channel updates
 */
async function checkStableUpdates(config) {
  const packageRoot = getPackageRoot();
  const packageJsonPath = path.join(packageRoot, 'package.json');

  try {
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    const latestVersion = await fetchLatestNpmVersion();

    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      console.log('');
      console.log(`A new version of aiwg is available: ${currentVersion} → ${latestVersion}`);

      const shouldUpdate = await promptUpdate('Would you like to update now?');

      if (shouldUpdate) {
        console.log('');
        console.log('Updating aiwg...');
        try {
          execSync('npm update -g aiwg', { stdio: 'inherit' });
          console.log('Update complete! Please restart your terminal.');
        } catch (error) {
          console.error('Update failed. Run manually: npm update -g aiwg');
        }
      } else {
        console.log('Update skipped. Run `npm update -g aiwg` when ready.');
      }
      console.log('');
    }
  } catch {
    // Silently ignore errors during update check
  }
}

/**
 * Check for edge (git) channel updates
 */
async function checkEdgeUpdates(config) {
  const hasUpdates = await checkGitUpdates(config.edgePath);

  if (hasUpdates) {
    console.log('');
    console.log('New commits available in the main branch.');

    const shouldUpdate = await promptUpdate('Would you like to update now?');

    if (shouldUpdate) {
      console.log('');
      console.log('Updating edge installation...');
      try {
        execSync('git pull --ff-only', { cwd: config.edgePath, stdio: 'inherit' });
        console.log('Update complete!');
      } catch (error) {
        console.error('Update failed. Run manually:');
        console.error(`  cd ${config.edgePath} && git pull`);
      }
    } else {
      console.log('Update skipped. Run `aiwg -update` when ready.');
    }
    console.log('');
  }
}

/**
 * Force an update check (called by aiwg -update)
 */
export async function forceUpdateCheck() {
  const config = await loadConfig();

  if (config.channel === 'stable') {
    console.log('Checking for updates...');
    const packageRoot = getPackageRoot();
    const packageJsonPath = path.join(packageRoot, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;
    const latestVersion = await fetchLatestNpmVersion();

    if (!latestVersion) {
      console.log('Could not check npm registry. Try: npm update -g aiwg');
      return;
    }

    if (isNewerVersion(currentVersion, latestVersion)) {
      console.log(`Update available: ${currentVersion} → ${latestVersion}`);
      console.log('');
      console.log('Run: npm update -g aiwg');
    } else {
      console.log(`You are on the latest version: ${currentVersion}`);
    }
  } else {
    // Edge channel - update from git
    const { updateEdge } = await import('../channel/manager.mjs');
    await updateEdge();
  }
}
