/**
 * Install-aware AIWG update service.
 *
 * This is the single package-update primitive shared by `aiwg update` and
 * `aiwg refresh`. It deliberately keeps provider/framework redeployment in
 * the calling handlers.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getPackageRoot, loadConfig } from '../channel/manager.mjs';
import {
  assertCanonicalInstallation,
  createInstallationIdentity,
  loadInstallationIdentity,
  saveInstallationIdentity,
} from '../installation/manager.mjs';
import { executeManagerCommand } from '../installation/manager-command.mjs';

const VALID_MODES = new Set(['npm', 'web', 'source']);

function readPackageName(packageRoot) {
  try {
    return JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).name;
  } catch {
    return null;
  }
}

export async function detectInstallMode(options = {}) {
  const packageRoot = options.packageRoot ?? getPackageRoot();
  const override = options.env?.AIWG_INSTALL_MODE ?? process.env.AIWG_INSTALL_MODE;
  const config = options.config ?? await loadConfig(options);
  let identity = options.identity ?? config.installation ?? null;
  let identityPersistent = Boolean(config.installation) || options.identityPersistent === true;
  if (!identity && options.config) {
    const method = override ?? (readPackageName(packageRoot) === '@aiwg/cli'
      ? 'web'
      : (config.devMode || config.channel === 'edge' || existsSync(path.join(packageRoot, '.git'))) ? 'source' : 'npm');
    identity = createInstallationIdentity({
      ...options,
      actualRoot: packageRoot,
      method,
      channel: config.channel,
      runMode: config.devMode ? 'development' : undefined,
    });
  } else if (!identity) {
    identity = loadInstallationIdentity({ ...options, actualRoot: packageRoot });
    identityPersistent = Boolean(identity);
  }

  if (override && !VALID_MODES.has(override)) {
    throw new Error(`AIWG_INSTALL_MODE must be one of: ${[...VALID_MODES].join(', ')}`);
  }
  if (override && identity && override !== identity.method) {
    throw new Error(`AIWG_INSTALL_MODE=${override} conflicts with the canonical installation method ${identity.method}. Use \`aiwg installation switch\` instead.`);
  }
  if (identity) {
    const status = assertCanonicalInstallation({ ...options, actualRoot: packageRoot, identity });
    return { mode: identity.method, packageRoot, packageName: readPackageName(packageRoot), identity, identityPersistent, installation: status };
  }

  if (override) {
    if (!VALID_MODES.has(override)) {
      throw new Error(`AIWG_INSTALL_MODE must be one of: ${[...VALID_MODES].join(', ')}`);
    }
    return { mode: override, packageRoot, packageName: readPackageName(packageRoot) };
  }
  const packageName = readPackageName(packageRoot);
  if (packageName === '@aiwg/cli') return { mode: 'web', packageRoot, packageName };
  if (config.devMode || config.channel === 'edge' || existsSync(path.join(packageRoot, '.git'))) {
    return { mode: 'source', packageRoot, packageName };
  }
  return { mode: 'npm', packageRoot, packageName };
}

function npmTag(channel) {
  if (channel === 'next') return 'next';
  if (channel === 'nightly') return 'nightly';
  return 'latest';
}

/**
 * Update the active distribution.
 *
 * `web` means the lightweight CLI's signed resource distribution. Its
 * resources resolve the selected signed channel on demand; it must not replace
 * itself with the full global npm package. `source` is intentionally manual.
 */
export async function updateInstallation(options = {}) {
  const config = options.config ?? await loadConfig();
  const detected = await detectInstallMode({ ...options, config });
  const channel = options.channel ?? detected.identity?.channel ?? config.channel ?? 'stable';
  const dryRun = options.dryRun === true;
  const offline = options.offline === true;

  if (detected.mode === 'web') {
    if (offline) {
      return {
        ...detected,
        channel,
        status: 'unsupported-offline',
        changed: false,
        message: 'Web-backed AIWG cannot refresh signed resources while offline; verified cached resources remain available.',
      };
    }
    if (dryRun) {
      return {
        ...detected,
        channel,
        status: 'dry-run',
        changed: false,
        message: `Would refresh the verified signed '${channel}' web resource release; no global package install would be attempted.`,
      };
    }
    const refreshWebResources = options.refreshWebResources ?? (async (selector) => {
      const { resolveWebRelease } = await import('../resources/web-release.js');
      return resolveWebRelease({ selector });
    });
    const release = await refreshWebResources(channel);
    if (detected.identity && detected.identityPersistent && options.persistIdentity !== false) {
      saveInstallationIdentity({ ...detected.identity, channel }, options);
    }
    return {
      ...detected,
      channel,
      version: release.version,
      status: 'updated',
      changed: true,
      message: `Refreshed the verified signed '${channel}' web resource release${release.version ? ` (${release.version})` : ''}; no global package install was attempted.`,
    };
  }

  if (detected.mode === 'source') {
    return {
      ...detected,
      channel,
      status: 'manual',
      changed: false,
      message: `Source checkout detected at ${detected.packageRoot}. Update it with 'git pull --ff-only', then run 'npm ci && npm run build'; AIWG will not overwrite it with npm.`,
    };
  }

  const tag = npmTag(channel);
  const command = ['install', '--global', `aiwg@${tag}`];
  const managerExecutable = detected.identity?.managerExecutable;
  if (!managerExecutable) {
    throw new Error('Canonical npm installation has no package-manager executable. Run `aiwg installation adopt --manager <absolute-path-to-npm>`.');
  }
  if (!dryRun) {
    executeManagerCommand(managerExecutable, command, options);
    if (detected.identity && detected.identityPersistent && options.persistIdentity !== false) {
      saveInstallationIdentity({ ...detected.identity, channel }, options);
    }
  }
  return {
    ...detected,
    channel,
    status: dryRun ? 'dry-run' : 'updated',
    changed: !dryRun,
    command: `${managerExecutable} ${command.join(' ')}`,
    message: dryRun
      ? `Would update the full AIWG npm distribution on the '${tag}' channel.`
      : `Updated the full AIWG npm distribution on the '${tag}' channel.`,
  };
}
