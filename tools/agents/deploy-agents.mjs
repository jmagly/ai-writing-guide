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
 *   --mode <type>            Deployment mode: general, sdlc, marketing, media-curator, research, both, or all (default)
 *   --deploy-commands        Deploy commands in addition to agents
 *   --deploy-skills          Deploy skills in addition to agents
 *   --deploy-rules           Deploy rules in addition to agents
 *   --commands-only          Deploy only commands (skip agents)
 *   --skills-only            Deploy only skills (skip agents)
 *   --rules-only             Deploy only rules (skip agents)
 *   --dry-run                Show what would be deployed without writing
 *   --force                  Overwrite existing files
 *   --provider <name>        Target provider: claude (default), openai, codex, cursor, opencode, copilot, factory, warp, or windsurf
 *   --reasoning-model <name> Override model for reasoning tasks
 *   --coding-model <name>    Override model for coding tasks
 *   --efficiency-model <name> Override model for efficiency tasks
 *   --as-agents-md           Aggregate to single AGENTS.md (OpenAI/Codex)
 *   --create-agents-md       Create/update AGENTS.md template (Factory/Codex/OpenCode/Cursor)
 *
 * Modes:
 *   general       - Deploy only writing-quality addon agents and commands (alias: writing)
 *   writing       - Deploy only writing-quality addon agents (alias for general)
 *   sdlc          - Deploy only SDLC Complete framework agents and commands
 *   marketing     - Deploy only Media/Marketing Kit framework agents and commands
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
 *   opencode  - OpenCode - .opencode/agent/, .opencode/command/, .opencode/skill/, .opencode/rule/
 *   copilot   - GitHub Copilot - .github/agents/, .github/commands/, .github/skills/, .github/copilot-rules/
 *   cursor    - Cursor IDE - .cursor/agents/, .cursor/commands/, .cursor/skills/, .cursor/rules/
 *   warp      - Warp Terminal - .warp/agents/, .warp/commands/, .warp/skills/, .warp/rules/ + WARP.md
 *   windsurf  - Windsurf - .windsurf/agents/, .windsurf/workflows/, .windsurf/skills/, .windsurf/rules/
 *
 * Defaults:
 *   --source resolves relative to this script's repo root (../..)
 *   --target is process.cwd()
 *   --mode is 'all'
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// ============================================================================
// Provider Registry
// ============================================================================

const PROVIDER_ALIASES = {
  'openai': 'codex'
};

const AVAILABLE_PROVIDERS = ['claude', 'factory', 'codex', 'opencode', 'copilot', 'cursor', 'warp', 'windsurf'];

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
    reasoningModel: null,
    codingModel: null,
    efficiencyModel: null,
    asAgentsMd: false,
    createAgentsMd: false,
    deployCommands: false,
    deploySkills: false,
    deployRules: false,
    commandsOnly: false,
    skillsOnly: false,
    rulesOnly: false,
    filter: null,           // Glob pattern for agent names
    filterRole: null,       // Filter by role: reasoning|coding|efficiency
    save: false,            // Save model config to project models.json
    saveUser: false         // Save model config to ~/.config/aiwg/models.json
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if ((a === '--provider' || a === '--platform') && args[i + 1]) cfg.provider = String(args[++i]).toLowerCase();
    else if (a === '--reasoning-model' && args[i + 1]) cfg.reasoningModel = args[++i];
    else if (a === '--coding-model' && args[i + 1]) cfg.codingModel = args[++i];
    else if (a === '--efficiency-model' && args[i + 1]) cfg.efficiencyModel = args[++i];
    else if (a === '--as-agents-md') cfg.asAgentsMd = true;
    else if (a === '--create-agents-md') cfg.createAgentsMd = true;
    else if (a === '--deploy-commands') cfg.deployCommands = true;
    else if (a === '--deploy-skills') cfg.deploySkills = true;
    else if (a === '--deploy-rules') cfg.deployRules = true;
    else if (a === '--commands-only') cfg.commandsOnly = true;
    else if (a === '--skills-only') cfg.skillsOnly = true;
    else if (a === '--rules-only') cfg.rulesOnly = true;
    else if (a === '--filter' && args[i + 1]) cfg.filter = args[++i];
    else if (a === '--filter-role' && args[i + 1]) cfg.filterRole = args[++i];
    else if (a === '--save') cfg.save = true;
    else if (a === '--save-user') cfg.saveUser = true;
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
  --mode <type>            Deployment mode: general, sdlc, marketing, media-curator, research, both, or all (default)
  --deploy-commands        Deploy commands in addition to agents
  --deploy-skills          Deploy skills in addition to agents
  --deploy-rules           Deploy rules in addition to agents
  --commands-only          Deploy only commands (skip agents)
  --skills-only            Deploy only skills (skip agents)
  --rules-only             Deploy only rules (skip agents)
  --dry-run                Show what would be deployed without writing
  --force                  Overwrite existing files
  --provider <name>        Target provider (see below)
  --reasoning-model <name> Override model for reasoning tasks
  --coding-model <name>    Override model for coding tasks
  --efficiency-model <name> Override model for efficiency tasks
  --filter <pattern>       Only deploy agents matching pattern (glob)
  --filter-role <role>     Only deploy agents of role: reasoning|coding|efficiency
  --save                   Save model config to project models.json
  --save-user              Save model config to ~/.config/aiwg/models.json
  --as-agents-md           Aggregate to single AGENTS.md (Codex)
  --create-agents-md       Create/update AGENTS.md template

Providers (all deploy agents, commands, skills, and rules):
  claude    - Claude Code (default)
              Paths: .claude/agents/, .claude/commands/, .claude/skills/, .claude/rules/
  factory   - Factory AI
              Paths: .factory/droids/, .factory/commands/, .factory/skills/, .factory/rules/
  codex     - OpenAI Codex (alias: openai)
              Paths: .codex/agents/, .codex/commands/, .codex/skills/, .codex/rules/
  opencode  - OpenCode
              Paths: .opencode/agent/, .opencode/command/, .opencode/skill/, .opencode/rule/
  copilot   - GitHub Copilot
              Paths: .github/agents/, .github/commands/, .github/skills/, .github/copilot-rules/
  cursor    - Cursor IDE
              Paths: .cursor/agents/, .cursor/commands/, .cursor/skills/, .cursor/rules/
  warp      - Warp Terminal
              Paths: .warp/agents/, .warp/commands/, .warp/skills/, .warp/rules/ + WARP.md
  windsurf  - Windsurf
              Paths: .windsurf/agents/, .windsurf/workflows/, .windsurf/skills/, .windsurf/rules/

Modes:
  general       - Writing-quality addon agents and commands (alias: writing)
  sdlc          - SDLC Complete framework agents and commands
  marketing     - Media/Marketing Kit framework agents and commands
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

  console.log(`\n=== AIWG Agent Deployment ===`);
  console.log(`Provider: ${cfg.provider}`);
  console.log(`Source: ${srcRoot}`);
  console.log(`Target: ${cfg.target}`);
  console.log(`Mode: ${cfg.mode}`);
  if (cfg.dryRun) console.log(`Dry run: enabled`);
  if (cfg.filter) console.log(`Filter: ${cfg.filter}`);
  if (cfg.filterRole) console.log(`Filter role: ${cfg.filterRole}`);
  if (cfg.reasoningModel) console.log(`Reasoning model: ${cfg.reasoningModel}`);
  if (cfg.codingModel) console.log(`Coding model: ${cfg.codingModel}`);
  if (cfg.efficiencyModel) console.log(`Efficiency model: ${cfg.efficiencyModel}`);
  if (cfg.save) console.log(`Save to project: enabled`);
  if (cfg.saveUser) console.log(`Save to user config: enabled`);

  // Load provider module
  const provider = await loadProvider(cfg.provider);
  console.log(`\nLoaded provider: ${provider.name}`);

  // Build options for provider
  const opts = {
    srcRoot,
    target: cfg.target,
    mode: cfg.mode,
    dryRun: cfg.dryRun,
    force: cfg.force,
    reasoningModel: cfg.reasoningModel,
    codingModel: cfg.codingModel,
    efficiencyModel: cfg.efficiencyModel,
    asAgentsMd: cfg.asAgentsMd,
    createAgentsMd: cfg.createAgentsMd,
    deployCommands: cfg.deployCommands,
    deploySkills: cfg.deploySkills,
    deployRules: cfg.deployRules,
    commandsOnly: cfg.commandsOnly,
    skillsOnly: cfg.skillsOnly,
    rulesOnly: cfg.rulesOnly,
    filter: cfg.filter,
    filterRole: cfg.filterRole,
    save: cfg.save,
    saveUser: cfg.saveUser
  };

  // Delegate to provider
  try {
    await provider.deploy(opts);

    // Save model configuration if requested
    if ((cfg.save || cfg.saveUser) && !cfg.dryRun) {
      await saveModelConfig(cfg, provider.name);
    }

    console.log(`\n=== Deployment complete ===\n`);
  } catch (err) {
    console.error(`\nDeployment failed:`, err.message);
    if (cfg.dryRun) {
      console.error('(dry-run mode - no files were modified)');
    }
    process.exit(1);
  }
})();
