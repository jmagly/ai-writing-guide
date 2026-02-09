/**
 * Use Command Handler
 *
 * Deploys AIWG frameworks (SDLC, Marketing, Writing) to the current project.
 * After deployment, registers deployed extensions in the extension registry.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @implements #56, #57
 * @source @src/cli/router.ts
 * @issue #33
 */

import path from 'path';
import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot } from '../../channel/manager.mjs';
import { getRegistry } from '../../extensions/registry.js';
import { registerDeployedExtensions } from '../../extensions/deployment-registration.js';

/**
 * Valid framework identifiers
 */
const VALID_FRAMEWORKS = ['sdlc', 'marketing', 'writing', 'general', 'all'] as const;
type Framework = typeof VALID_FRAMEWORKS[number];

/**
 * Framework name to deploy mode mapping
 */
const MODE_MAP: Record<Framework, string> = {
  sdlc: 'sdlc',
  marketing: 'marketing',
  writing: 'general',
  general: 'general',
  all: 'all',
};

/**
 * Valid addon identifiers (deployed independently via `aiwg use <addon>`)
 */
const VALID_ADDONS = ['rlm'] as const;
type Addon = typeof VALID_ADDONS[number];

/**
 * Addon name to source directory mapping (relative to framework root)
 */
const ADDON_PATHS: Record<Addon, string> = {
  rlm: 'agentic/code/addons/rlm',
};

/**
 * Provider to deployment paths mapping
 */
const PROVIDER_PATHS: Record<string, { agents: string; skills: string; commands: string; rules: string }> = {
  claude: {
    agents: '.claude/agents',
    skills: '.claude/skills',
    commands: '.claude/commands',
    rules: '.claude/rules',
  },
  factory: {
    agents: '.factory/droids',
    skills: '.factory/skills',
    commands: '.factory/commands',
    rules: '.factory/rules',
  },
  codex: {
    agents: '.codex/agents',
    skills: '.codex/skills',
    commands: '.codex/commands',
    rules: '.codex/rules',
  },
  opencode: {
    agents: '.opencode/agent',
    skills: '.opencode/skill',
    commands: '.opencode/command',
    rules: '.opencode/rule',
  },
  copilot: {
    agents: '.github/agents',
    skills: '.github/skills',
    commands: '.github/commands',
    rules: '.github/copilot-rules',
  },
  cursor: {
    agents: '.cursor/agents',
    skills: '.cursor/skills',
    commands: '.cursor/commands',
    rules: '.cursor/rules',
  },
  warp: {
    agents: '.warp/agents',
    skills: '.warp/skills',
    commands: '.warp/commands',
    rules: '.warp/rules',
  },
  windsurf: {
    agents: '.windsurf/agents',
    skills: '.windsurf/skills',
    commands: '.windsurf/workflows',
    rules: '.windsurf/rules',
  },
};

/**
 * Use command handler
 *
 * Deploys framework agents, commands, and skills to the current project,
 * then registers them in the extension registry for discovery.
 */
export class UseHandler implements CommandHandler {
  id = 'use';
  name = 'Use Framework';
  description = 'Deploy AIWG framework to current project';
  category = 'framework' as const;
  aliases: string[] = [];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const framework = ctx.args[0];
    const remainingArgs = ctx.args.slice(1);

    // Validate target argument (framework or addon)
    if (!framework) {
      return {
        exitCode: 1,
        message: 'Error: Framework or addon name required\nFrameworks: sdlc, marketing, writing, all\nAddons: rlm',
      };
    }

    const isFramework = VALID_FRAMEWORKS.includes(framework as Framework);
    const isAddon = VALID_ADDONS.includes(framework as Addon);

    if (!isFramework && !isAddon) {
      return {
        exitCode: 1,
        message: `Error: Unknown target '${framework}'\nFrameworks: ${VALID_FRAMEWORKS.join(', ')}\nAddons: ${VALID_ADDONS.join(', ')}`,
      };
    }

    // Handle addon-only deployment
    if (isAddon) {
      const providerIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
      const provider = providerIdx >= 0 && remainingArgs[providerIdx + 1] ? remainingArgs[providerIdx + 1] : 'claude';
      const targetIdx = remainingArgs.findIndex(a => a === '--target');
      const target = targetIdx >= 0 && remainingArgs[targetIdx + 1] ? remainingArgs[targetIdx + 1] : process.cwd();

      const runner = createScriptRunner(ctx.frameworkRoot);
      const addonBaseArgs = ['--deploy-commands', '--deploy-skills', '--deploy-rules'];
      if (provider) addonBaseArgs.push('--provider', provider);
      if (target) addonBaseArgs.push('--target', target);

      console.log(`\nDeploying ${framework} addon...`);
      const frameworkRoot = await getFrameworkRoot();
      const addonSource = path.join(frameworkRoot, ADDON_PATHS[framework as Addon]);
      const addonResult = await runner.run('tools/agents/deploy-agents.mjs', [
        '--source', addonSource,
        ...addonBaseArgs,
      ]);

      if (addonResult.exitCode !== 0) {
        return addonResult;
      }

      // Register deployed extensions
      console.log('');
      console.log('Registering deployed extensions...');
      try {
        const registry = getRegistry();
        const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
        await registerDeployedExtensions(registry, {
          agentsPath: paths.agents,
          skillsPath: paths.skills,
          commandsPath: paths.commands,
          rulesPath: paths.rules,
          provider,
          cwd: target,
        });
        console.log('Extension registration complete');
      } catch (error) {
        console.error('Warning: Failed to register extensions:', error instanceof Error ? error.message : String(error));
      }

      return {
        exitCode: 0,
        message: `Successfully deployed ${framework} addon`,
      };
    }

    // Map framework name to deploy mode
    const mode = MODE_MAP[framework as Framework];
    const deployArgs = ['--mode', mode, '--deploy-commands', '--deploy-skills', '--deploy-rules', ...remainingArgs];

    // Check if --no-utils was passed
    const skipUtils = remainingArgs.includes('--no-utils');
    const filteredArgs = deployArgs.filter(a => a !== '--no-utils');

    // Extract provider and target from remainingArgs to pass to addon deployments
    const providerIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
    const provider = providerIdx >= 0 && remainingArgs[providerIdx + 1] ? remainingArgs[providerIdx + 1] : 'claude';
    const targetIdx = remainingArgs.findIndex(a => a === '--target');
    const target = targetIdx >= 0 && remainingArgs[targetIdx + 1] ? remainingArgs[targetIdx + 1] : process.cwd();

    // Deploy main framework
    const runner = createScriptRunner(ctx.frameworkRoot);
    const mainResult = await runner.run('tools/agents/deploy-agents.mjs', filteredArgs);

    if (mainResult.exitCode !== 0) {
      return mainResult;
    }

    // Build common args for addon deployments (inherit provider and target)
    const addonBaseArgs = ['--deploy-commands', '--deploy-skills', '--deploy-rules'];
    if (provider) addonBaseArgs.push('--provider', provider);
    if (target) addonBaseArgs.push('--target', target);

    // Deploy aiwg-utils unless --no-utils
    if (!skipUtils) {
      console.log('');
      console.log('Deploying aiwg-utils addon...');
      const frameworkRoot = await getFrameworkRoot();
      const utilsSource = path.join(frameworkRoot, 'agentic/code/addons/aiwg-utils');
      const utilsResult = await runner.run('tools/agents/deploy-agents.mjs', [
        '--source', utilsSource,
        ...addonBaseArgs,
      ]);

      if (utilsResult.exitCode !== 0) {
        return utilsResult;
      }
    }

    // Deploy ralph addon (iterative execution loops)
    if (!skipUtils) {
      console.log('');
      console.log('Deploying ralph addon...');
      const frameworkRoot = await getFrameworkRoot();
      const ralphSource = path.join(frameworkRoot, 'agentic/code/addons/ralph');
      const ralphResult = await runner.run('tools/agents/deploy-agents.mjs', [
        '--source', ralphSource,
        ...addonBaseArgs,
      ]);

      if (ralphResult.exitCode !== 0) {
        return ralphResult;
      }
    }

    // Register deployed extensions in the registry
    console.log('');
    console.log('Registering deployed extensions...');
    try {
      const registry = getRegistry();
      const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;

      await registerDeployedExtensions(registry, {
        agentsPath: paths.agents,
        skillsPath: paths.skills,
        commandsPath: paths.commands,
        rulesPath: paths.rules,
        provider,
        cwd: target,
      });

      console.log('Extension registration complete');
    } catch (error) {
      console.error('Warning: Failed to register extensions:', error instanceof Error ? error.message : String(error));
      // Don't fail the deployment if registration fails
    }

    return {
      exitCode: 0,
      message: `Successfully deployed ${framework} framework`,
    };
  }
}

/**
 * Create use handler instance
 */
export function createUseHandler(): CommandHandler {
  return new UseHandler();
}

/**
 * Singleton handler instance
 */
export const useHandler = new UseHandler();
