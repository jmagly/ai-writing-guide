#!/usr/bin/env node
/**
 * Deploy Agents and Commands - Orchestrator
 *
 * Deploy agents/commands from this repository to a target project.
 * Delegates to provider-specific modules for platform-specific deployment.
 *
 * Usage:
 *   node tools/agents/deploy-agents.mjs [options]
 *
 * Options:
 *   --source <path>          Source directory (defaults to repo root)
 *   --target <path>          Target directory (defaults to cwd)
 *   --mode <type>            Deployment mode: general, sdlc, marketing (alias: mmk), media-curator, research, both, or all (default)
 *   --deploy-commands        Deploy commands in addition to agents
 *   --deploy-skills          Deploy skills in addition to agents
 *   --deploy-rules           Deploy rules in addition to agents
 *   --commands-only          Deploy only commands (skip agents)
 *   --skills-only            Deploy only skills (skip agents)
 *   --rules-only             Deploy only rules (skip agents)
 *   --dry-run                Show what would be deployed without writing
 *   --force                  Overwrite existing files
 *   --provider <name>        Target provider: claude (default), openai, codex, cursor, opencode, copilot, factory, warp, windsurf, hermes, or openclaw
 *   --model <name>            Override model for all tiers (blanket)
 *   --reasoning-model <name> Override model for reasoning tasks
 *   --coding-model <name>    Override model for coding tasks
 *   --efficiency-model <name> Override model for efficiency tasks
 *   --as-agents-md               Aggregate to single AGENTS.md (OpenAI/Codex)
 *   --create-agents-md           Create/update AGENTS.md template
 *   --skip-commands-migration    Skip deleting the commands directory (warns about duplicate TUI entries) (Factory/Codex/OpenCode/Cursor)
 *
 * Modes:
 *   general       - Deploy only writing-quality addon agents and commands (alias: writing)
 *   writing       - Deploy only writing-quality addon agents (alias for general)
 *   sdlc          - Deploy only SDLC Complete framework agents and commands
 *   marketing     - Deploy only Media/Marketing Kit framework agents and commands (alias: mmk)
 *   media-curator - Deploy only Media Curator framework agents and commands
 *   research      - Deploy only Research Complete framework agents and commands
 *   both          - Deploy writing + SDLC (legacy compatibility)
 *   all           - Deploy all frameworks + addons (default)
 *
 * Providers:
 *   claude    - Claude Code (default) - .claude/agents/, .claude/commands/, .claude/skills/, .claude/rules/
 *   factory   - Factory AI - .factory/droids/, .factory/commands/, .factory/skills/, .factory/rules/
 *   codex     - OpenAI Codex - .codex/agents/, .codex/commands/, .codex/skills/, .codex/rules/
 *   openai    - Alias for codex
 *   opencode  - OpenCode - .opencode/skill/, .opencode/rule/ (agents+commands not file-based)
 *   copilot   - GitHub Copilot - .github/agents/, .github/commands/, .github/skills/, .github/copilot-rules/
 *   cursor    - Cursor IDE - .cursor/agents/, .cursor/commands/, .cursor/skills/, .cursor/rules/
 *   warp      - Warp Terminal - .warp/agents/, .warp/commands/, .warp/skills/, .warp/rules/ + WARP.md
 *   windsurf  - Windsurf - .windsurf/agents/, .windsurf/workflows/, .windsurf/skills/, .windsurf/rules/
 *   openclaw  - OpenClaw - ~/.openclaw/agents/, ~/.openclaw/commands/, ~/.openclaw/skills/, ~/.openclaw/rules/, ~/.openclaw/behaviors/
 *
 * Defaults:
 *   --source resolves relative to this script's repo root (../..)
 *   --target is process.cwd()
 *   --mode is 'all'
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { loadModelConfig, migrateCommandsDirectory } from './providers/base.mjs';

/**
 * Read version from package.json at the source root.
 * Falls back to 'unknown' if unavailable.
 */
function getDeployVersion(srcRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(srcRoot, 'package.json'), 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

// ============================================================================
// Provider Registry
// ============================================================================

const PROVIDER_ALIASES = {
  'openai': 'codex'
};

const AVAILABLE_PROVIDERS = ['claude', 'factory', 'codex', 'opencode', 'copilot', 'cursor', 'warp', 'windsurf', 'hermes', 'openclaw'];

// ============================================================================
// Argument Parsing
// ============================================================================

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: process.cwd(),
    mode: 'all',  // 'general', 'sdlc', 'marketing', 'media-curator', 'research', 'both' (legacy), or 'all'
    dryRun: false,
    force: false,
    provider: 'claude',
    model: null,             // Blanket override for all tiers
    reasoningModel: null,
    codingModel: null,
    efficiencyModel: null,
    asAgentsMd: false,
    createAgentsMd: false,
    deployCommands: false,
    deploySkills: false,
    deployRules: false,
    deployBehaviors: false,      // Deploy behaviors (native on openclaw, emulated on others)
    commandsOnly: false,
    skillsOnly: false,
    rulesOnly: false,
    filter: null,           // Glob pattern for agent names
    filterRole: null,       // Filter by role: reasoning|coding|efficiency
    save: false,            // Save model config to project models.json
    saveUser: false,        // Save model config to ~/.config/aiwg/models.json
    verbose: false,         // Show per-file deployment details
    quiet: false,           // Suppress all non-error output (for embedding in use.ts)
    asPlugin: false,        // Generate .factory-plugin/ bundle (Factory provider only)
    deployBehaviors: false, // Deploy behaviors in addition to agents
    skipCommandsMigration: false  // Skip commands → skills migration (warns about duplicates)
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if ((a === '--provider' || a === '--platform') && args[i + 1]) cfg.provider = String(args[++i]).toLowerCase();
    else if (a === '--model' && args[i + 1]) cfg.model = args[++i];
    else if ((a === '--reasoning-model' || a === '--reasoning') && args[i + 1]) cfg.reasoningModel = args[++i];
    else if ((a === '--coding-model' || a === '--coding') && args[i + 1]) cfg.codingModel = args[++i];
    else if ((a === '--efficiency-model' || a === '--efficiency') && args[i + 1]) cfg.efficiencyModel = args[++i];
    else if (a === '--as-agents-md') cfg.asAgentsMd = true;
    else if (a === '--create-agents-md') cfg.createAgentsMd = true;
    else if (a === '--deploy-commands') cfg.deployCommands = true;
    else if (a === '--deploy-skills') cfg.deploySkills = true;
    else if (a === '--deploy-rules') cfg.deployRules = true;
    else if (a === '--deploy-behaviors') cfg.deployBehaviors = true;
    else if (a === '--commands-only') cfg.commandsOnly = true;
    else if (a === '--skills-only') cfg.skillsOnly = true;
    else if (a === '--rules-only') cfg.rulesOnly = true;
    else if (a === '--deploy-behaviors') cfg.deployBehaviors = true;
    else if (a === '--filter' && args[i + 1]) cfg.filter = args[++i];
    else if (a === '--filter-role' && args[i + 1]) cfg.filterRole = args[++i];
    else if (a === '--save') cfg.save = true;
    else if (a === '--save-user') cfg.saveUser = true;
    else if (a === '--verbose' || a === '-v') cfg.verbose = true;
    else if (a === '--quiet' || a === '-q') cfg.quiet = true;
    else if (a === '--as-plugin') cfg.asPlugin = true;
    else if (a === '--skip-commands-migration') cfg.skipCommandsMigration = true;
    else if (a === '--copy-all' || a === '--copy-standard-skills') cfg.copyStandardSkills = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return cfg;
}

function printHelp() {
  console.log(`
Deploy Agents and Commands

Usage:
  node tools/agents/deploy-agents.mjs [options]
  aiwg -deploy-agents [options]

Options:
  --source <path>          Source directory (defaults to repo root)
  --target <path>          Target directory (defaults to cwd)
  --mode <type>            Deployment mode: general, sdlc, marketing (alias: mmk), media-curator, research, both, or all (default)
  --deploy-commands        Deploy commands in addition to agents
  --deploy-skills          Deploy skills in addition to agents
  --deploy-rules           Deploy rules in addition to agents
  --commands-only          Deploy only commands (skip agents)
  --skills-only            Deploy only skills (skip agents)
  --rules-only             Deploy only rules (skip agents)
  --dry-run                Show what would be deployed without writing
  --force                  Overwrite existing files
  --provider <name>        Target provider (see below)
  --model <name>           Override model for all tiers (blanket)
  --reasoning-model <name> Override model for reasoning tasks (alias: --reasoning)
  --coding-model <name>    Override model for coding tasks (alias: --coding)
  --efficiency-model <name> Override model for efficiency tasks (alias: --efficiency)
  --filter <pattern>       Only deploy agents matching pattern (glob)
  --filter-role <role>     Only deploy agents of role: reasoning|coding|efficiency
  --save                   Save model config to project models.json
  --save-user              Save model config to ~/.config/aiwg/models.json
  --as-agents-md               Aggregate to single AGENTS.md (Codex)
  --create-agents-md           Create/update AGENTS.md template
  --skip-commands-migration    Skip deleting the commands directory before skills deployment
  --copy-all                   Copy ALL skills per-project (legacy mirror at <provider>/.aiwg/skills/).
                               Default is kernel-only + index-driven discovery for the rest (#1217).
                               Use this for sandboxed runtimes / air-gapped corpora where
                               $AIWG_ROOT isn't readable from the agent's working dir.
                               Alias: --copy-standard-skills — rc.29 era).
                               (warns about duplicate entries in the provider command palette)

Model Override Examples:
  # Use sonnet for everything
  aiwg use sdlc --model sonnet

  # Override individual tiers
  aiwg use sdlc --reasoning opus --coding sonnet --efficiency haiku

  # Use a specific model ID for coding tier
  aiwg use sdlc --provider factory --coding-model gpt-5.3-codex

  # Blanket with per-tier override (reasoning uses opus, others use sonnet)
  aiwg use sdlc --model sonnet --reasoning opus

  # Save overrides to project models.json for future deployments
  aiwg use sdlc --model sonnet --save

Model Precedence:
  CLI flags > project models.json > user ~/.config/aiwg/models.json > AIWG defaults

Shorthand Values:
  opus, sonnet, haiku, inherit — resolved per provider to full model IDs

Providers (all deploy agents, commands, skills, and rules):
  claude    - Claude Code (default)
              Paths: .claude/agents/, .claude/commands/, .claude/skills/, .claude/rules/
  factory   - Factory AI
              Paths: .factory/droids/, .factory/commands/, .factory/skills/, .factory/rules/
  codex     - OpenAI Codex (alias: openai)
              Paths: .codex/agents/, .codex/commands/, .codex/skills/, .codex/rules/
  opencode  - OpenCode
              Paths: .opencode/skill/, .opencode/rule/ (agents/commands not file-based in OpenCode)
  copilot   - GitHub Copilot
              Paths: .github/agents/, .github/commands/, .github/skills/, .github/copilot-rules/
  cursor    - Cursor IDE
              Paths: .cursor/agents/, .cursor/commands/, .cursor/skills/, .cursor/rules/
  warp      - Warp Terminal
              Paths: .warp/agents/, .warp/commands/, .warp/skills/, .warp/rules/ + WARP.md
  windsurf  - Windsurf
              Paths: .windsurf/agents/, .windsurf/workflows/, .windsurf/skills/, .windsurf/rules/
  hermes    - Hermes Agent (MCP-based integration)
              Skills: ~/.hermes/skills/ (user-global) | Agents: AGENTS.md (lean routing guide)
              Commands/Rules: served via MCP, not file-deployed

Modes:
  general       - Writing-quality addon agents and commands (alias: writing)
  sdlc          - SDLC Complete framework agents and commands
  marketing     - Media/Marketing Kit framework agents and commands (alias: mmk)
  media-curator - Media Curator framework agents and commands
  research      - Research Complete framework agents and commands
  both          - writing + SDLC (legacy compatibility)
  all           - All frameworks + addons (default)

Examples:
  # Deploy SDLC framework to Claude Code
  aiwg -deploy-agents --mode sdlc

  # Deploy to Factory with commands and AGENTS.md
  aiwg -deploy-agents --provider factory --mode sdlc --deploy-commands --create-agents-md

  # Deploy to GitHub Copilot
  aiwg -deploy-agents --provider copilot --mode sdlc

  # Override model for all tiers
  aiwg -deploy-agents --mode sdlc --model sonnet

  # Override individual tiers
  aiwg -deploy-agents --mode sdlc --reasoning opus --coding sonnet --efficiency haiku

  # Dry run to preview deployment
  aiwg -deploy-agents --provider cursor --mode sdlc --dry-run
`);
}

// ============================================================================
// Provider Loading
// ============================================================================

/**
 * Resolve provider name (handle aliases)
 */
function resolveProvider(name) {
  const resolved = PROVIDER_ALIASES[name] || name;
  if (!AVAILABLE_PROVIDERS.includes(resolved)) {
    console.error(`Unknown provider: ${name}`);
    console.error(`Available providers: ${AVAILABLE_PROVIDERS.join(', ')}`);
    console.error(`Aliases: ${Object.entries(PROVIDER_ALIASES).map(([a, p]) => `${a} -> ${p}`).join(', ')}`);
    process.exit(1);
  }
  return resolved;
}

/**
 * Dynamically load provider module
 */
async function loadProvider(providerName) {
  const resolved = resolveProvider(providerName);
  const providerPath = `./providers/${resolved}.mjs`;

  try {
    const provider = await import(providerPath);
    return provider.default || provider;
  } catch (err) {
    console.error(`Failed to load provider '${resolved}':`, err.message);
    process.exit(1);
  }
}

// ============================================================================
// Model Shorthand Resolution
// ============================================================================

/**
 * Resolve a shorthand model value to a full model ID
 *
 * If the value is a known shorthand (opus, sonnet, haiku, inherit), resolve it
 * through the provider's shorthand map. Otherwise treat it as a literal model ID.
 *
 * @param {string|null} value - CLI flag value (e.g., "opus" or "claude-opus-4-6")
 * @param {object} shorthandMap - Provider shorthand map (e.g., { opus: "claude-opus-4-6" })
 * @param {object} modelsConfig - Full models config from loadModelConfig()
 * @param {string} provider - Provider name
 * @param {string} tier - Tier name: "reasoning", "coding", or "efficiency"
 * @returns {string|null} Resolved model ID or null if input was null
 */
function resolveShorthand(value, shorthandMap, modelsConfig, provider, tier) {
  if (!value) return null;

  const clean = value.toLowerCase().replace(/['"]/g, '');

  // Check shorthand map first
  if (shorthandMap[clean]) return shorthandMap[clean];

  // Check provider-specific tier config (e.g., modelsConfig.factory.reasoning.model)
  const providerConfig = modelsConfig?.[provider];
  if (providerConfig?.[tier]?.model && clean === tier) {
    return providerConfig[tier].model;
  }

  // Not a shorthand — return as literal model ID
  return value;
}

// ============================================================================
// Model Configuration Persistence
// ============================================================================

/**
 * Save model configuration to project or user config file
 * @param {object} cfg - Configuration with model overrides
 * @param {string} providerName - Provider name for provider-specific config
 */
async function saveModelConfig(cfg, providerName) {
  // Build config object with only the provided overrides
  const modelConfig = {};

  // Provider-specific tier configuration
  if (cfg.reasoningModel || cfg.codingModel || cfg.efficiencyModel) {
    modelConfig[providerName] = {};
    if (cfg.reasoningModel) {
      modelConfig[providerName].reasoning = { model: cfg.reasoningModel };
    }
    if (cfg.codingModel) {
      modelConfig[providerName].coding = { model: cfg.codingModel };
    }
    if (cfg.efficiencyModel) {
      modelConfig[providerName].efficiency = { model: cfg.efficiencyModel };
    }
  }

  // Shorthand mappings
  if (cfg.reasoningModel || cfg.codingModel || cfg.efficiencyModel) {
    modelConfig.shorthand = {};
    if (cfg.reasoningModel) modelConfig.shorthand.opus = cfg.reasoningModel;
    if (cfg.codingModel) modelConfig.shorthand.sonnet = cfg.codingModel;
    if (cfg.efficiencyModel) modelConfig.shorthand.haiku = cfg.efficiencyModel;
  }

  // Determine target path
  let targetPath;
  if (cfg.saveUser) {
    const configDir = path.join(os.homedir(), '.config', 'aiwg');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    targetPath = path.join(configDir, 'models.json');
  } else {
    targetPath = path.join(cfg.target, 'models.json');
  }

  // Merge with existing config if it exists
  let existingConfig = {};
  if (fs.existsSync(targetPath)) {
    try {
      existingConfig = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    } catch {
      // Ignore parse errors, start fresh
    }
  }

  // Deep merge: existing config + new overrides
  const mergedConfig = deepMerge(existingConfig, modelConfig);

  // Write the config
  fs.writeFileSync(targetPath, JSON.stringify(mergedConfig, null, 2) + '\n', 'utf8');
  console.log(`\nModel configuration saved to: ${targetPath}`);
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ============================================================================
// Commands → Skills Migration
// ============================================================================

/**
 * Ask the user whether to delete the provider's commands directory before
 * deploying skills. Skipped automatically when not running in a TTY (CI/pipe)
 * or when --quiet is set.
 *
 * @param {object} cfg - Parsed CLI config
 * @param {object} provider - Loaded provider module
 * @param {string} targetDir - Resolved target directory
 * @returns {Promise<boolean>} true = proceed with migration, false = skip
 */
async function promptCommandsMigration(cfg, provider, targetDir) {
  // Home-directory providers share commands across projects — do not delete.
  if (provider.capabilities?.homeDirectoryDeploy) return false;

  const commandsRelPath = provider.paths?.commands;
  if (!commandsRelPath) return false;

  const commandsDir = path.join(targetDir, commandsRelPath);
  if (!fs.existsSync(commandsDir)) return false;

  const entries = fs.readdirSync(commandsDir).filter(e => e.endsWith('.md'));
  if (entries.length === 0) return false;

  // Non-interactive context: migrate silently.
  if (cfg.quiet || !process.stdout.isTTY) return true;

  const rel = path.relative(process.cwd(), commandsDir);
  console.log(`\n⚠  Commands → Skills Migration`);
  console.log(`   ${rel} contains ${entries.length} legacy command file(s).`);
  console.log(`   AIWG now serves these as skills (.claude/skills/).`);
  console.log(`   Keeping both causes duplicate entries in the Claude Code command palette.`);
  console.log('');

  const answer = await new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('   Remove commands directory and migrate? [Y/n] ', ans => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });

  if (answer === 'n' || answer === 'no') {
    console.log('');
    console.log('   Skipping migration. Run `aiwg use` again without --skip-commands-migration');
    console.log(`   to clean up, or delete ${rel} manually.`);
    console.log('');
    return false;
  }

  return true;
}

// ============================================================================
// Main Entry Point
// ============================================================================

(async () => {
  const cfg = parseArgs();

  // Resolve source directory (default to repo root relative to this script)
  const __filename = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(__filename);
  const srcRoot = cfg.source || path.resolve(scriptDir, '..', '..');

  // Validate source directory
  if (!fs.existsSync(srcRoot)) {
    console.error(`Source directory not found: ${srcRoot}`);
    process.exit(1);
  }

  // Validate target directory
  if (!fs.existsSync(cfg.target)) {
    console.log(`Creating target directory: ${cfg.target}`);
    fs.mkdirSync(cfg.target, { recursive: true });
  }

  // Normalize mode aliases
  if (cfg.mode === 'writing') cfg.mode = 'general';
  if (cfg.mode === 'mmk') cfg.mode = 'marketing';

  // Apply --model blanket override: sets all three tiers unless individually overridden
  if (cfg.model) {
    if (!cfg.reasoningModel) cfg.reasoningModel = cfg.model;
    if (!cfg.codingModel) cfg.codingModel = cfg.model;
    if (!cfg.efficiencyModel) cfg.efficiencyModel = cfg.model;
  }

  // Load model configuration (project > user > AIWG defaults)
  const modelsConfig = loadModelConfig(srcRoot);

  // Resolve shorthand values in CLI flags using provider-specific config
  if (cfg.reasoningModel || cfg.codingModel || cfg.efficiencyModel) {
    const resolvedProvider = resolveProvider(cfg.provider);
    const providerShorthand = modelsConfig?.[`${resolvedProvider}_shorthand`] || modelsConfig?.shorthand || {};

    cfg.reasoningModel = resolveShorthand(cfg.reasoningModel, providerShorthand, modelsConfig, resolvedProvider, 'reasoning');
    cfg.codingModel = resolveShorthand(cfg.codingModel, providerShorthand, modelsConfig, resolvedProvider, 'coding');
    cfg.efficiencyModel = resolveShorthand(cfg.efficiencyModel, providerShorthand, modelsConfig, resolvedProvider, 'efficiency');
  }

  if (!cfg.quiet) {
    console.log(`\n=== AIWG Agent Deployment ===`);
    console.log(`Provider: ${cfg.provider}`);
    console.log(`Source: ${srcRoot}`);
    console.log(`Target: ${cfg.target}`);
    console.log(`Mode: ${cfg.mode}`);
    if (cfg.dryRun) console.log(`Dry run: enabled`);
    if (cfg.filter) console.log(`Filter: ${cfg.filter}`);
    if (cfg.filterRole) console.log(`Filter role: ${cfg.filterRole}`);
    if (cfg.model) console.log(`Model (all tiers): ${cfg.model}`);
    if (cfg.reasoningModel) console.log(`Reasoning model: ${cfg.reasoningModel}`);
    if (cfg.codingModel) console.log(`Coding model: ${cfg.codingModel}`);
    if (cfg.efficiencyModel) console.log(`Efficiency model: ${cfg.efficiencyModel}`);
    if (cfg.save) console.log(`Save to project: enabled`);
    if (cfg.saveUser) console.log(`Save to user config: enabled`);
  }

  // Load provider module
  const provider = await loadProvider(cfg.provider);
  if (!cfg.quiet) console.log(`\nLoaded provider: ${provider.name}`);

  // Build options for provider
  const opts = {
    srcRoot,
    target: cfg.target,
    mode: cfg.mode,
    provider: cfg.provider,
    dryRun: cfg.dryRun,
    force: cfg.force,
    reasoningModel: cfg.reasoningModel,
    codingModel: cfg.codingModel,
    efficiencyModel: cfg.efficiencyModel,
    modelsConfig,
    asAgentsMd: cfg.asAgentsMd,
    createAgentsMd: cfg.createAgentsMd,
    deployCommands: cfg.deployCommands,
    deploySkills: cfg.deploySkills,
    deployRules: cfg.deployRules,
    deployBehaviors: cfg.deployBehaviors,
    commandsOnly: cfg.commandsOnly,
    skillsOnly: cfg.skillsOnly,
    rulesOnly: cfg.rulesOnly,
    filter: cfg.filter,
    filterRole: cfg.filterRole,
    save: cfg.save,
    saveUser: cfg.saveUser,
    verbose: cfg.verbose,
    asPlugin: cfg.asPlugin,
    deployBehaviors: cfg.deployBehaviors,
    skipCommandsMigration: cfg.skipCommandsMigration,
    // #1217 / #1219: --copy-all flag forces legacy per-project mirror
    // for the standard tier. Default is no-copy + index-driven discovery.
    // Replaces the legacy AIWG_COPY_STANDARD_SKILLS env var (removed rc.30).
    // Default (#1217) is no-copy + index-driven discovery.
    copyStandardSkills: cfg.copyStandardSkills === true,
    deployVersion: getDeployVersion(srcRoot),
    deploySource: 'bundled',
  };

  // Commands → Skills migration: prompt then delete the commands directory
  // so stale command files don't create duplicates in the provider TUI.
  if (!cfg.dryRun && !cfg.skipCommandsMigration) {
    const doMigrate = await promptCommandsMigration(cfg, provider, cfg.target);
    if (doMigrate) {
      const commandsRelPath = provider.paths?.commands;
      if (commandsRelPath) {
        migrateCommandsDirectory(path.join(cfg.target, commandsRelPath), opts);
      }
    } else {
      // User said no — flip the flag so the provider knows to emit the duplicate warning
      opts.skipCommandsMigration = true;
    }
  } else if (cfg.skipCommandsMigration) {
    // Flag was passed explicitly — emit the duplicate warning now via a dry migration call
    const commandsRelPath = provider.paths?.commands;
    if (commandsRelPath && !provider.capabilities?.homeDirectoryDeploy) {
      migrateCommandsDirectory(path.join(cfg.target, commandsRelPath), opts);
    }
  }

  // Delegate to provider
  try {
    await provider.deploy(opts);

    // Save model configuration if requested
    if ((cfg.save || cfg.saveUser) && !cfg.dryRun) {
      await saveModelConfig(cfg, provider.name);
    }

    if (!cfg.quiet) console.log(`\n=== Deployment complete ===\n`);
  } catch (err) {
    console.error(`\nDeployment failed:`, err.message);
    if (cfg.dryRun) {
      console.error('(dry-run mode - no files were modified)');
    }
    process.exit(1);
  }
})();
