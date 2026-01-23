/**
 * Version Command Handler
 *
 * Displays version and channel information for the AIWG installation.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/router.ts
 * @issue #33
 */

import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { getVersionInfo } from '../../channel/manager.mjs';

/**
 * Version command handler
 */
export const versionHandler: CommandHandler = {
  id: 'version',
  name: 'Version',
  description: 'Show version and channel info',
  category: 'maintenance',
  aliases: ['-version', '--version'],

  async execute(_ctx: HandlerContext): Promise<HandlerResult> {
    await displayVersion();
    return { exitCode: 0 };
  },
};

/**
 * Display version information including channel and git details
 */
async function displayVersion(): Promise<void> {
  const info = await getVersionInfo();

  console.log(`aiwg version: ${info.version}`);
  console.log(`Channel: ${info.channel}`);

  if (info.channel === 'edge' && info.gitHash) {
    console.log(`Git: ${info.gitHash} (${info.gitBranch})`);
    console.log(`Edge path: ${info.edgePath}`);
  } else {
    console.log(`Package root: ${info.packageRoot}`);
  }
}
