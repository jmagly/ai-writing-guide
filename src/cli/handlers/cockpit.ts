import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

export const COCKPIT_PACKAGE_NAME = '@aiwg/cockpit';

export function cockpitHome(): string {
  return process.env.AIWG_COCKPIT_HOME || path.join(homedir(), '.aiwg', 'cockpit', 'package');
}

async function readJson(file: string): Promise<any | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function coreVersion(frameworkRoot: string): Promise<string> {
  const pkg = await readJson(path.join(frameworkRoot, 'package.json'));
  return typeof pkg?.version === 'string' && pkg.version.length > 0 ? pkg.version : 'latest';
}

function packageRoot(home = cockpitHome()): string {
  return path.join(home, 'node_modules', '@aiwg', 'cockpit');
}

export async function resolveCockpitInstall(home = cockpitHome()): Promise<{
  installed: boolean;
  version?: string;
  packageRoot: string;
  entrypoint?: string;
}> {
  const root = packageRoot(home);
  const pkg = await readJson(path.join(root, 'package.json'));
  if (!pkg) return { installed: false, packageRoot: root };

  const bin = typeof pkg.bin === 'string'
    ? pkg.bin
    : typeof pkg.bin?.['aiwg-cockpit'] === 'string'
      ? pkg.bin['aiwg-cockpit']
      : 'bridge/src/server.mjs';
  const entrypoint = path.join(root, bin);
  return {
    installed: existsSync(entrypoint),
    version: typeof pkg.version === 'string' ? pkg.version : undefined,
    packageRoot: root,
    entrypoint,
  };
}

function runProcess(cmd: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

export async function installCockpit(ctx: HandlerContext, args: string[] = ctx.args): Promise<HandlerResult> {
  const version = await coreVersion(ctx.frameworkRoot);
  const home = cockpitHome();
  const spec = version === 'latest' ? COCKPIT_PACKAGE_NAME : `${COCKPIT_PACKAGE_NAME}@${version}`;
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    return {
      exitCode: 0,
      message: [
        `Would install ${spec}`,
        `Target: ${home}`,
        'Run without --dry-run to acquire the opt-in Cockpit package.',
      ].join('\n'),
    };
  }

  await mkdir(home, { recursive: true });
  const code = await runProcess('npm', ['install', '--prefix', home, '--no-audit', '--fund=false', spec], {
    cwd: ctx.cwd,
  });
  if (code !== 0) {
    return { exitCode: code, message: `Failed to install ${spec}` };
  }

  const install = await resolveCockpitInstall(home);
  if (!install.installed) {
    return { exitCode: 1, message: `${COCKPIT_PACKAGE_NAME} installed, but no aiwg-cockpit entrypoint was found.` };
  }
  if (version !== 'latest' && install.version !== version) {
    return {
      exitCode: 1,
      message: `Installed ${COCKPIT_PACKAGE_NAME}@${install.version ?? 'unknown'}, expected ${version}.`,
    };
  }
  return { exitCode: 0, message: `Installed ${COCKPIT_PACKAGE_NAME}@${install.version} in ${home}` };
}

export const cockpitHandler: CommandHandler = {
  id: 'cockpit',
  name: 'Cockpit',
  description: 'Launch the opt-in AIWG Cockpit control plane',
  category: 'utility',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const install = await resolveCockpitInstall();
    const version = await coreVersion(ctx.frameworkRoot);
    const autoInstall = ctx.args.includes('--install') || ctx.args.includes('--yes') || ctx.args.includes('-y');

    if (ctx.args.includes('--status')) {
      return {
        exitCode: 0,
        message: install.installed
          ? `${COCKPIT_PACKAGE_NAME}@${install.version ?? 'unknown'} installed at ${install.packageRoot}`
          : `${COCKPIT_PACKAGE_NAME} not installed. Run: aiwg use cockpit`,
      };
    }

    if (!install.installed) {
      if (autoInstall) {
        const result = await installCockpit(ctx, ctx.args);
        if (result.exitCode !== 0) return result;
        return this.execute({ ...ctx, args: ctx.args.filter((arg) => arg !== '--install' && arg !== '--yes' && arg !== '-y') });
      }
      return {
        exitCode: 1,
        message: [
          'AIWG Cockpit is not installed.',
          `Install the opt-in package with: aiwg use cockpit`,
          `Expected package: ${COCKPIT_PACKAGE_NAME}@${version}`,
          'No Cockpit dependency is required for the base aiwg CLI.',
        ].join('\n'),
      };
    }

    if (version !== 'latest' && install.version !== version) {
      return {
        exitCode: 1,
        message: [
          `AIWG Cockpit version mismatch: installed ${install.version ?? 'unknown'}, core ${version}.`,
          'Refresh the opt-in package with: aiwg use cockpit',
        ].join('\n'),
      };
    }

    const passthrough = ctx.args.filter((arg) => arg !== '--status');
    const code = await runProcess(process.execPath, [install.entrypoint!, ...passthrough], { cwd: ctx.cwd });
    return { exitCode: code };
  },
};
