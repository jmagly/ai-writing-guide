/**
 * Skills CLI Commands
 *
 * Provides CLI interface for multi-registry skill operations:
 * - search: Search skills across registries
 * - info: Show detailed skill information
 * - list: List all available skills
 * - install: Install a skill from a registry
 * - publish: Publish a skill to a registry
 *
 * @implements #539
 */

import { spawn } from 'child_process';
import {
  searchSkills,
  listSkills,
  getSkillInfo,
  installSkill,
  publishSkill,
  getAllAdapters,
} from './registry.js';
import type { SkillResult } from './types.js';
import {
  parseAgentSpawnFlags,
  buildAgentArgs,
  getProviderConfig,
  isSpawnableProvider,
} from '../cli/agent-spawn.js';

const SUPPORTED_TARGETS = [
  'claude', 'copilot', 'factory', 'cursor', 'codex', 'opencode',
  'warp', 'windsurf', 'openclaw', 'openhuman', 'hermes', 'generic',
];

/**
 * Parse --provider and --target flags from args
 */
function parseFlags(args: string[]): {
  provider: string | undefined;
  target: string | undefined;
  rest: string[];
} {
  const rest: string[] = [];
  let provider: string | undefined;
  let target: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && i + 1 < args.length) {
      provider = args[i + 1];
      i++;
    } else if (args[i] === '--target' && i + 1 < args.length) {
      target = args[i + 1];
      i++;
    } else {
      rest.push(args[i]);
    }
  }

  return { provider, target, rest };
}

/**
 * Format skill results as a table
 */
function displaySkillsTable(skills: SkillResult[]): void {
  if (skills.length === 0) {
    console.log('  No skills found.');
    return;
  }

  // Group by source
  const bySource = new Map<string, SkillResult[]>();
  for (const skill of skills) {
    const list = bySource.get(skill.source) || [];
    list.push(skill);
    bySource.set(skill.source, list);
  }

  for (const [source, sourceSkills] of bySource) {
    console.log(`\n  ${source} (${sourceSkills.length} skills):`);
    console.log('  ' + '-'.repeat(70));

    for (const skill of sourceSkills) {
      const name = skill.name.padEnd(28);
      const pkg = (skill.package || '').padEnd(18);
      const desc = skill.description.slice(0, 40);
      console.log(`  ${name} ${pkg} ${desc}`);
    }
  }
}

/**
 * Handle 'skills search' command
 */
async function handleSearch(args: string[]): Promise<void> {
  const { provider, rest } = parseFlags(args);
  const query = rest.join(' ');

  if (!query) {
    console.error('Error: Search query required');
    console.log('Usage: aiwg skills search <query> [--provider <registry>]');
    process.exit(1);
  }

  const results = await searchSkills(query, provider);

  console.log('');
  console.log(
    `Search results for "${query}"${provider ? ` (${provider})` : ''}:`
  );
  displaySkillsTable(results);
  console.log('');
  console.log(`  ${results.length} skill(s) found`);
  console.log('');
}

/**
 * Handle 'skills info' command
 */
async function handleInfo(args: string[]): Promise<void> {
  const { provider, rest } = parseFlags(args);
  const name = rest[0];

  if (!name) {
    console.error('Error: Skill name required');
    console.log('Usage: aiwg skills info <name> [--provider <registry>]');
    process.exit(1);
  }

  const details = await getSkillInfo(name, provider);

  if (!details) {
    console.error(`Error: Skill '${name}' not found`);
    console.log("Run 'aiwg skills search <query>' to find skills");
    process.exit(1);
  }

  console.log('');
  console.log(`Skill: ${details.name}`);
  console.log('');
  console.log(`Source:      ${details.source}`);
  if (details.package) console.log(`Package:     ${details.package}`);
  if (details.version) console.log(`Version:     ${details.version}`);
  console.log(`Description: ${details.description}`);

  if (details.platforms && details.platforms.length > 0) {
    console.log(`Platforms:   ${details.platforms.join(', ')}`);
  }

  if (details.triggers && details.triggers.length > 0) {
    console.log('');
    console.log('Triggers:');
    for (const trigger of details.triggers) {
      console.log(`  - ${trigger}`);
    }
  }

  if (details.scripts && details.scripts.length > 0) {
    console.log('');
    console.log('Scripts:');
    for (const script of details.scripts) {
      console.log(`  - ${script}`);
    }
  }

  if (details.path) {
    console.log('');
    console.log(`Path: ${details.path}`);
  }

  console.log('');
}

/**
 * Handle 'skills list' command
 */
async function handleList(args: string[]): Promise<void> {
  const { provider } = parseFlags(args);

  const results = await listSkills(provider);

  console.log('');
  console.log(
    `Available skills${provider ? ` (${provider})` : ''}:`
  );
  displaySkillsTable(results);
  console.log('');
  console.log(`  ${results.length} skill(s) total`);

  // Show registry availability
  const adapters = getAllAdapters();
  console.log('');
  console.log('  Registries:');
  for (const adapter of adapters) {
    const available = await adapter.isAvailable();
    const status = available ? '\u2713' : '\u2013';
    console.log(`    ${status} ${adapter.name} (${adapter.id})`);
  }

  console.log('');
}

/**
 * Handle 'skills install' command
 *
 * Supports cross-platform deployment:
 *   aiwg skills install <name> --provider <registry> --target <platform>
 *
 * --provider: which registry to pull from (local, clawhub, openclaw)
 * --target: which platform to deploy to (claude, copilot, cursor, etc.)
 *           Defaults to claude. Uses platform-aware path translation.
 */
async function handleInstall(args: string[]): Promise<void> {
  const { provider, target, rest } = parseFlags(args);
  const name = rest[0];

  if (!name) {
    console.error('Error: Skill name required');
    console.log(
      'Usage: aiwg skills install <name> [--provider <registry>] [--target <platform>]'
    );
    console.log('');
    console.log('Options:');
    console.log('  --provider  Registry to pull from (local, clawhub, openclaw). Default: local');
    console.log('  --target    Platform to deploy to (claude, copilot, cursor, etc.). Default: claude');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg skills install parallel-dispatch');
    console.log('  aiwg skills install parallel-dispatch --target copilot');
    console.log('  aiwg skills install my-skill --provider clawhub --target cursor');
    console.log('');
    console.log(`Supported targets: ${SUPPORTED_TARGETS.join(', ')}`);
    process.exit(1);
  }

  const registry = provider || 'local';
  const targetPlatform = target || 'claude';

  if (target && !SUPPORTED_TARGETS.includes(target)) {
    console.error(`Error: Unknown target platform '${target}'`);
    console.log(`Supported: ${SUPPORTED_TARGETS.join(', ')}`);
    process.exit(1);
  }

  try {
    await installSkill(
      name,
      { projectDir: process.cwd(), target: targetPlatform },
      registry
    );
    console.log(`Installed skill '${name}' from ${registry} → ${targetPlatform}`);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Handle 'skills publish' command
 */
async function handlePublish(args: string[]): Promise<void> {
  const { provider, rest } = parseFlags(args);
  const packageDir = rest[0] || process.cwd();

  if (!provider) {
    console.error('Error: --provider required');
    console.log('Usage: aiwg skills publish [dir] --provider <registry>');
    console.log('');
    console.log('Example:');
    console.log('  aiwg skills publish --provider clawhub');
    process.exit(1);
  }

  try {
    await publishSkill(packageDir, provider);
    console.log(`Published skill to ${provider}`);
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Handle 'skills run' command
 *
 * Looks up a skill by name, substitutes $ARGUMENTS, and dispatches
 * the full skill prompt to the configured provider for execution.
 *
 * Always routes through a provider — no local execution fallback.
 *
 * @implements roctinam/aiwg#630
 */
async function handleRun(args: string[]): Promise<void> {
  const { opts, remaining } = parseAgentSpawnFlags(args);
  const skillName = remaining[0];
  const skillArgs = remaining.slice(1);

  if (!skillName) {
    console.error('Error: Skill name required');
    console.log('Usage: aiwg skills run <skill-name> [args...] [--provider <provider>]');
    console.log('');
    console.log('Examples:');
    console.log('  aiwg skills run workspace-health');
    console.log('  aiwg skills run ralph "Fix failing tests" --completion "npm test passes"');
    console.log('  aiwg skills run doc-sync --dry-run --provider claude');
    process.exit(1);
  }

  const details = await getSkillInfo(skillName);

  if (!details) {
    console.error(`Error: Skill '${skillName}' not found`);
    console.log("Run 'aiwg skills list' to see available skills");
    process.exit(1);
  }

  if (!details.content) {
    console.error(`Error: Skill '${skillName}' has no executable content`);
    process.exit(1);
  }

  // Substitute $ARGUMENTS with the provided args
  const argString = skillArgs.join(' ');
  const prompt = details.content.replace(/\$ARGUMENTS/g, argString);

  // Resolve provider — default to claude
  const providerName = opts.provider ?? 'claude';

  if (!isSpawnableProvider(providerName)) {
    const config = getProviderConfig(providerName);
    console.error(`Error: Provider '${config.name}' cannot be spawned from the CLI.`);
    if (config.guidanceMessage) {
      console.log('');
      console.log(config.guidanceMessage);
    }
    process.exit(1);
  }

  const config = getProviderConfig(providerName);
  const spawnArgs = buildAgentArgs(prompt, opts);

  console.log(`Running skill '${skillName}' via ${config.name}...`);
  console.log('');

  const child = spawn(config.binary!, spawnArgs, { stdio: 'inherit' });

  child.on('error', (err) => {
    console.error(`Error: Failed to spawn ${config.binary}: ${err.message}`);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code ?? 1);
  });
}

/**
 * Main skills command router
 */
export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subcommandArgs = args.slice(1);

  switch (subcommand) {
    case 'run':
      await handleRun(subcommandArgs);
      break;

    case 'search':
      await handleSearch(subcommandArgs);
      break;

    case 'info':
      await handleInfo(subcommandArgs);
      break;

    case 'list':
      await handleList(subcommandArgs);
      break;

    case 'install':
      await handleInstall(subcommandArgs);
      break;

    case 'publish':
      await handlePublish(subcommandArgs);
      break;

    case undefined:
      console.error('Error: Skills subcommand required');
      console.log('Available: run, search, info, list, install, publish');
      console.log('');
      console.log('Examples:');
      console.log('  aiwg skills run workspace-health');
      console.log('  aiwg skills run ralph "Fix failing tests" --completion "npm test passes"');
      console.log('  aiwg skills list');
      console.log('  aiwg skills search "parallel"');
      console.log('  aiwg skills info parallel-dispatch');
      console.log('  aiwg skills search "testing" --provider clawhub');
      console.log('  aiwg skills install parallel-dispatch');
      console.log('  aiwg skills install parallel-dispatch --target copilot');
      console.log('  aiwg skills install my-skill --provider clawhub --target cursor');
      process.exit(1);
      break;

    default:
      console.error(`Error: Unknown skills subcommand '${subcommand}'`);
      console.log('Available: run, search, info, list, install, publish');
      process.exit(1);
  }
}
