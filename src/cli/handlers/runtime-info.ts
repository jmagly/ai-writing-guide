/**
 * Runtime Info Command Handler
 *
 * Runtime environment discovery and tool catalog management.
 * Provides information about available tools, system resources, and runtime environment.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @source @src/cli/index.mjs
 * @issue #33
 */

import path from 'path';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

/**
 * Runtime info command handler
 */
export const runtimeInfoHandler: CommandHandler = {
  id: 'runtime-info',
  name: 'Runtime Info',
  description: 'Runtime environment discovery and tool catalog',
  category: 'toolsmith',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    try {
      await handleRuntimeInfo(ctx.args);
      return { exitCode: 0 };
    } catch (error) {
      const err = error as Error;

      if (err.message.includes('No catalog found')) {
        console.log(`\nNo runtime catalog found.`);
        console.log(`Run 'aiwg runtime-info --discover' to create one.`);
        return { exitCode: 0 };
      }

      return {
        exitCode: 1,
        message: err.message,
        error: err,
      };
    }
  },
};

/**
 * Handle runtime info command logic
 */
async function handleRuntimeInfo(args: string[]): Promise<void> {
  const { RuntimeDiscovery } = await import('../../smiths/toolsmith/runtime-discovery.mjs');
  const discovery = new RuntimeDiscovery();

  const hasDiscover = args.includes('--discover');
  const hasVerify = args.includes('--verify');
  const hasJson = args.includes('--json');
  const checkIndex = args.indexOf('--check');
  const hasCheck = checkIndex >= 0;

  if (hasDiscover) {
    // Full discovery
    const catalog = await discovery.discover();

    if (hasJson) {
      console.log(JSON.stringify(catalog, null, 2));
    } else {
      console.log(`\nDiscovery complete!`);
      console.log(`Discovered ${catalog.tools.length} tools`);
      console.log(`Unavailable: ${catalog.unavailable.length}`);
      console.log(`\nCatalog saved to: ${path.join(discovery.basePath, 'runtime.json')}`);
      console.log(`Human-readable: ${path.join(discovery.basePath, 'runtime-info.md')}`);
    }
  } else if (hasVerify) {
    // Verify existing catalog
    const result = await discovery.verify();

    if (hasJson) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nVerification complete!`);
      console.log(`Valid: ${result.valid}/${result.total}`);

      if (result.failed.length > 0) {
        console.log(`\nFailed tools:`);
        result.failed.forEach((tool: { name: string; id: string }) => {
          console.log(`  - ${tool.name} (${tool.id})`);
        });
      }
    }
  } else if (hasCheck) {
    // Check specific tool
    const toolName = args[checkIndex + 1];

    if (!toolName) {
      throw new Error('Tool name required for --check');
    }

    const check = await discovery.checkTool(toolName);

    if (hasJson) {
      console.log(JSON.stringify(check, null, 2));
    } else {
      console.log(`\nTool: ${toolName}`);

      if (check.available) {
        console.log(`Status: Available`);
        console.log(`Version: ${check.version}`);
        console.log(`Path: ${check.path}`);
        console.log(`Verified: ${check.lastVerified}`);
      } else {
        console.log(`Status: Not Available`);
        console.log(`Install: ${check.installHint}`);
      }
    }
  } else {
    // Show summary (default)
    const summary = await discovery.getSummary();

    if (hasJson) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`\nRuntime Environment Summary`);
      console.log(`===========================`);
      console.log(`\nOS: ${summary.environment.os} (${summary.environment.osVersion}) ${summary.environment.arch}`);
      console.log(`Shell: ${summary.environment.shell}`);
      console.log(`Memory: ${summary.resources.memoryAvailableGb} GB available / ${summary.resources.memoryTotalGb} GB total`);
      console.log(`Disk: ${summary.resources.diskFreeGb} GB free`);
      console.log(`CPU Cores: ${summary.resources.cpuCores}`);

      console.log(`\nTool Categories:`);
      console.log(`  Core:       ${summary.toolCounts.core} tools`);
      console.log(`  Languages:  ${summary.toolCounts.languages} tools`);
      console.log(`  Utilities:  ${summary.toolCounts.utilities} tools`);
      console.log(`  Custom:     ${summary.toolCounts.custom} tools`);

      console.log(`\nTotal: ${summary.totalTools} verified tools`);
      console.log(`\nLast Discovery: ${summary.lastDiscovery}`);
      console.log(`Catalog: ${summary.catalogPath}`);

      console.log(`\nRun 'aiwg runtime-info --discover' to refresh catalog`);
      console.log(`\nRun 'aiwg runtime-info --check <tool>' to check a specific tool`);
    }
  }
}
