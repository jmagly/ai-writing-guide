/**
 * Version Command Handler
 *
 * Displays version and channel information for the AIWG installation.
 * Supports --verbose / --json for full environment fingerprint (Phase 4.5 #925).
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @issue #33, #925
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { getVersionInfo } from '../../channel/manager.mjs';
import { getLoggerInfo } from '../log.js';
import * as ui from '../ui.js';
import { maybePrintCommunityFooter } from '../../community/footer.js';
import { existsSync, statSync, readdirSync } from 'fs';
import path from 'path';

/**
 * Version command handler
 */
export const versionHandler: CommandHandler = {
  id: 'version',
  name: 'Version',
  description: 'Show version and channel info (--verbose for full env fingerprint, --json for machine-readable)',
  category: 'maintenance',
  aliases: ['-version', '--version'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const verbose = ctx.args.includes('--verbose') || ctx.args.includes('-v') || ctx.args.includes('-vv') || ctx.args.includes('-vvv');
    const json = ctx.args.includes('--json');
    await displayVersion({ verbose, json });
    return { exitCode: 0 };
  },
};

interface VersionFingerprint {
  version: string;
  channel: string;
  packageRoot: string;
  git?: { sha: string; branch: string; path: string };
  node: string;
  platform: { os: string; arch: string; release: string };
  tty: { stdin: boolean; stdout: boolean; stderr: boolean };
  locale?: string;
  timezone?: string;
  logger: {
    level: string;
    disabled: boolean;
    logFile: string | null;
    recordsToday?: number;
    logFileSize?: number;
  };
  invocation_id: string;
}

function collectFingerprint(versionInfo: Awaited<ReturnType<typeof getVersionInfo>>): VersionFingerprint {
  const loggerInfo = getLoggerInfo();
  const fp: VersionFingerprint = {
    version: versionInfo.version,
    channel: versionInfo.devMode ? 'dev' : versionInfo.channel,
    packageRoot: versionInfo.packageRoot,
    node: process.version,
    platform: {
      os: process.platform,
      arch: process.arch,
      release: loggerInfo.provenance.os_release,
    },
    tty: {
      stdin: !!process.stdin.isTTY,
      stdout: !!process.stdout.isTTY,
      stderr: !!process.stderr.isTTY,
    },
    logger: {
      level: loggerInfo.level,
      disabled: loggerInfo.disabled,
      logFile: loggerInfo.logFile,
    },
    invocation_id: loggerInfo.provenance.invocation_id,
  };

  if (versionInfo.gitHash) {
    fp.git = {
      sha: versionInfo.gitHash,
      branch: versionInfo.gitBranch ?? '(unknown)',
      path: versionInfo.edgePath ?? versionInfo.packageRoot,
    };
  }

  // Locale / timezone are useful for timezone-dependent bug reports.
  try {
    fp.locale = Intl.DateTimeFormat().resolvedOptions().locale;
    fp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { /* ignore */ }

  // Log file stats — "you've written N records today, file is X MB".
  if (loggerInfo.logFile && existsSync(loggerInfo.logFile)) {
    try {
      fp.logger.logFileSize = statSync(loggerInfo.logFile).size;
      // Cheap line count via readdirSync of the log directory — not the line
      // count itself (avoids reading the whole file).
      const dir = path.dirname(loggerInfo.logFile);
      const today = new Date().toISOString().slice(0, 10);
      const file = readdirSync(dir).find(f => f === `aiwg-${today}.jsonl`);
      if (file) {
        // Defer actual line count to aiwg diagnose; here we just signal presence.
        fp.logger.recordsToday = undefined;
      }
    } catch { /* ignore */ }
  }

  return fp;
}

async function displayVersion(opts: { verbose: boolean; json: boolean }): Promise<void> {
  const info = await getVersionInfo();
  const fp = collectFingerprint(info);

  if (opts.json) {
    console.log(JSON.stringify(fp, null, 2));
    return;
  }

  ui.blank();
  console.log(`  ${ui.brandMark()} ${ui.bold('aiwg')}  ${ui.bold(fp.version)}  ${ui.channelLabel(fp.channel)}`);

  if (!opts.verbose) {
    if (fp.git) {
      ui.dim(`    git: ${fp.git.sha} (${fp.git.branch})`);
      ui.dim(`    path: ${fp.git.path}`);
    } else {
      ui.dim(`    path: ${fp.packageRoot}`);
    }
    maybePrintCommunityFooter();
    ui.blank();
    return;
  }

  // --verbose: the full environment fingerprint.
  if (fp.git) {
    ui.dim(`    git:       ${fp.git.sha} (${fp.git.branch})`);
    ui.dim(`    path:      ${fp.git.path}`);
  } else {
    ui.dim(`    path:      ${fp.packageRoot}`);
  }
  ui.dim(`    channel:   ${fp.channel}`);
  ui.dim(`    node:      ${fp.node}`);
  ui.dim(`    platform:  ${fp.platform.os} ${fp.platform.arch} (${fp.platform.release})`);
  ui.dim(`    tty:       stdin=${fp.tty.stdin} stdout=${fp.tty.stdout} stderr=${fp.tty.stderr}`);
  if (fp.locale) ui.dim(`    locale:    ${fp.locale} (TZ=${fp.timezone})`);
  const logDesc = fp.logger.disabled
    ? '(disabled via AIWG_LOG_DISABLE)'
    : fp.logger.logFile
      ? `${fp.logger.logFile}${fp.logger.logFileSize !== undefined ? ` (${(fp.logger.logFileSize / 1024).toFixed(1)} KB)` : ''}`
      : '(stderr only)';
  ui.dim(`    log:       ${logDesc}`);
  ui.dim(`    level:     ${fp.logger.level}`);
  ui.dim(`    invocation:${fp.invocation_id}`);
  maybePrintCommunityFooter();
  ui.blank();
}
