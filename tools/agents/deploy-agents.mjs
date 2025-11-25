#!/usr/bin/env node
/**
 * Deploy Agents and Commands
 *
 * Deploy agents/commands from this repository to a target project.
 * Supports three deployment modes:
 * 1. General-purpose (writing agents, general commands)
 * 2. SDLC framework (complete software development lifecycle)
 * 3. Both (default)
 *
 * Usage:
 *   node tools/agents/deploy-agents.mjs [options]
 *
 * Options:
 *   --source <path>          Source directory (defaults to repo root)
 *   --target <path>          Target directory (defaults to cwd)
 *   --mode <type>            Deployment mode: general, sdlc, or both (default)
 *   --deploy-commands        Deploy commands in addition to agents
 *   --commands-only          Deploy only commands (skip agents)
 *   --dry-run                Show what would be deployed without writing
 *   --force                  Overwrite existing files
 *   --provider <name>        Target provider: claude (default), openai, or factory
 *   --reasoning-model <name> Override model for reasoning tasks
 *   --coding-model <name>    Override model for coding tasks
 *   --efficiency-model <name> Override model for efficiency tasks
 *   --as-agents-md           Aggregate to single AGENTS.md (OpenAI)
 *   --create-agents-md       Create/update AGENTS.md template (Factory)
 *
 * Modes:
 *   general  - Deploy only general-purpose writing agents and commands
 *   sdlc     - Deploy only SDLC Complete framework agents and commands
 *   both     - Deploy everything (default)
 *
 * Defaults:
 *   --source resolves relative to this script's repo root (../..)
 *   --target is process.cwd()
 *   --mode is 'both'
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: process.cwd(),
    mode: 'both',  // 'general', 'sdlc', or 'both'
    dryRun: false,
    force: false,
    provider: 'claude',
    reasoningModel: null,
    codingModel: null,
    efficiencyModel: null,
    asAgentsMd: false,
    createAgentsMd: false,
    deployCommands: false,
    commandsOnly: false
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
    else if (a === '--commands-only') cfg.commandsOnly = true;
  }
  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function listMdFiles(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'DEVELOPMENT_GUIDE.md'];
  const excluded = [...defaultExcluded, ...excludePatterns];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !excluded.includes(e.name))
    .map((e) => path.join(dir, e.name));
}

function listMdFilesRecursive(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'DEVELOPMENT_GUIDE.md'];
  const excluded = [...defaultExcluded, ...excludePatterns];
  const results = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && entry.name !== 'templates') {
        // Skip templates directory but recurse others
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && !excluded.includes(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  return results;
}

function replaceModelFrontmatter(content, provider, models) {
  // Replace 'model:' within the first YAML frontmatter block only.
  const fmStart = content.indexOf('---');
  if (fmStart !== 0) return content;
  const fmEnd = content.indexOf('\n---', 3);
  if (fmEnd === -1) return content;
  const header = content.slice(0, fmEnd + 4); // include trailing --- and newline
  const body = content.slice(fmEnd + 4);

  // Detect original model to classify (opus -> reasoning, sonnet -> coding, haiku -> efficiency)
  const modelMatch = header.match(/^model:\s*([^\n]+)$/m);
  let newModel = null;
  if (modelMatch) {
    const orig = modelMatch[1].trim();
    const clean = orig.replace(/['"]/g, '');
    let role = 'coding';
    if (/^opus$/i.test(clean)) role = 'reasoning';
    else if (/^haiku$/i.test(clean)) role = 'efficiency';
    // select new model
    if (role === 'reasoning') newModel = models.reasoning;
    else if (role === 'efficiency') newModel = models.efficiency;
    else newModel = models.coding;
  }
  if (!newModel) return content;
  const updatedHeader = header.replace(/^model:\s*[^\n]+$/m, `model: ${newModel}`);
  return updatedHeader + body;
}

function transformToFactoryDroid(content, modelCfg, modelsConfig) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();

  // Map model to Factory format
  const factoryModel = mapModelToFactory(modelMatch, modelCfg, modelsConfig);

  // Map tools to Factory equivalents
  const factoryTools = mapToolsToFactory(toolsMatch, name);

  // Generate Factory droid frontmatter
  const factoryFrontmatter = `---
name: ${name}
description: ${description || 'AIWG SDLC agent'}
model: ${factoryModel}
tools: ${JSON.stringify(factoryTools)}
---`;

  return `${factoryFrontmatter}\n\n${body.trim()}`;
}

function mapToolsToFactory(toolsString, agentName) {
  // Default comprehensive tool set if no tools specified
  if (!toolsString) {
    return ["Read", "LS", "Grep", "Glob", "Edit", "Create", "Execute", "Task", "TodoWrite", "WebSearch", "FetchUrl"];
  }
  
  // Parse tools (comma-separated or array format)
  let originalTools = [];
  if (toolsString.startsWith('[')) {
    try {
      originalTools = JSON.parse(toolsString);
    } catch (e) {
      // Fall back to split
      originalTools = toolsString.replace(/[\[\]"']/g, '').split(/[,\s]+/).filter(Boolean);
    }
  } else {
    originalTools = toolsString.split(/[,\s]+/).filter(Boolean);
  }
  
  // Tool mapping: Claude Code → Factory
  const toolMap = {
    'Bash': 'Execute',
    'Write': 'Create',  // Will add Edit too
    'WebFetch': 'FetchUrl',
    'MultiEdit': 'MultiEdit',
    'Read': 'Read',
    'Grep': 'Grep',
    'Glob': 'Glob',
    'LS': 'LS'
  };
  
  const factoryTools = new Set();
  
  // Map original tools
  for (const tool of originalTools) {
    const mapped = toolMap[tool] || tool;
    factoryTools.add(mapped);
    
    // If Write is present, add both Create and Edit
    if (tool === 'Write') {
      factoryTools.add('Create');
      factoryTools.add('Edit');
    }
    
    // If MultiEdit is present, also add ApplyPatch (related patch-based editing)
    if (tool === 'MultiEdit') {
      factoryTools.add('ApplyPatch');
    }
  }
  
  // Orchestration agents need Task tool for invoking subagents
  const orchestrationAgents = [
    'executive-orchestrator',
    'intake-coordinator',
    'documentation-synthesizer',
    'project-manager',
    'deployment-manager',
    'test-architect',
    'architecture-designer',
    'requirements-analyst',
    'security-architect',
    'technical-writer'
  ];
  
  const normalizedName = (agentName || '').toLowerCase().replace(/\s+/g, '-');
  if (orchestrationAgents.some(oa => normalizedName.includes(oa))) {
    factoryTools.add('Task');
    factoryTools.add('TodoWrite');
  }
  
  // Add web tools if WebFetch was present
  if (originalTools.includes('WebFetch')) {
    factoryTools.add('FetchUrl');
    factoryTools.add('WebSearch');
  }
  
  // Convert to sorted array for consistency
  return Array.from(factoryTools).sort();
}

/**
 * Load model configuration from models.json
 * Priority: Project models.json > User ~/.config/aiwg/models.json > AIWG defaults
 */
function loadModelConfig(srcRoot) {
  const locations = [
    { path: path.join(process.cwd(), 'models.json'), label: 'project' },
    { path: path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'aiwg', 'models.json'), label: 'user' },
    { path: path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'config', 'models.json'), label: 'AIWG defaults' }
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc.path)) {
      try {
        const config = JSON.parse(fs.readFileSync(loc.path, 'utf8'));
        config._source = `${loc.label} (${loc.path})`;
        return config;
      } catch (err) {
        console.warn(`Warning: Could not parse models.json at ${loc.path}: ${err.message}`);
      }
    }
  }

  // Fallback to hardcoded defaults if no config found
  return {
    factory: {
      reasoning: { model: 'claude-opus-4-1-20250805' },
      coding: { model: 'claude-sonnet-4-5-20250929' },
      efficiency: { model: 'claude-haiku-3-5' }
    },
    shorthand: {
      'opus': 'claude-opus-4-1-20250805',
      'sonnet': 'claude-sonnet-4-5-20250929',
      'haiku': 'claude-haiku-3-5',
      'inherit': 'inherit'
    }
  };
}

function mapModelToFactory(originalModel, modelCfg, modelsConfig) {
  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || modelsConfig.factory.reasoning.model;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || modelsConfig.factory.efficiency.model;
    return modelCfg.codingModel || modelsConfig.factory.coding.model;
  }

  // Use shorthand mappings from config
  const factoryModels = modelsConfig.shorthand || {
    'opus': modelsConfig.factory.reasoning.model,
    'sonnet': modelsConfig.factory.coding.model,
    'haiku': modelsConfig.factory.efficiency.model,
    'inherit': 'inherit'
  };

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  // Match to Factory model
  for (const [key, value] of Object.entries(factoryModels)) {
    if (clean.includes(key)) return value;
  }

  return modelsConfig.factory.coding.model; // default
}

function transformIfNeeded(srcPath, content, provider, modelCfg, modelsConfig) {
  // Factory uses different format entirely
  if (provider === 'factory') {
    return transformToFactoryDroid(content, modelCfg, modelsConfig);
  }
  
  let destContent = content;
  // Determine target models by provider and overrides
  const defaults = provider === 'openai'
    ? { reasoning: 'gpt-5', coding: 'gpt-5-codex', efficiency: 'gpt-4o-mini' }
    : { reasoning: 'opus', coding: 'sonnet', efficiency: 'haiku' };
  const models = {
    reasoning: modelCfg.reasoningModel || defaults.reasoning,
    coding: modelCfg.codingModel || defaults.coding,
    efficiency: modelCfg.efficiencyModel || defaults.efficiency
  };
  // Replace model field if provider requested or overrides present
  const needReplace = provider === 'openai' || modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel;
  if (needReplace) destContent = replaceModelFrontmatter(content, provider, models);
  return destContent;
}

function writeFile(dest, data, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] write ${dest}`);
  } else {
    fs.writeFileSync(dest, data, 'utf8');
  }
}

function deployFiles(files, destDir, opts) {
  const { force = false, dryRun = false, provider = 'claude' } = opts;
  const seen = new Set();
  const actions = [];
  for (const f of files) {
    const base = path.basename(f);
    let dest = path.join(destDir, base);

    // Check for duplicate destination in this batch
    if (seen.has(dest)) {
      actions.push({ type: 'skip', src: f, dest, reason: 'duplicate' });
      continue;
    }

    // Read and transform source content
    const srcContent = fs.readFileSync(f, 'utf8');
    const transformedContent = transformIfNeeded(f, srcContent, provider, opts, opts.modelsConfig);

    // Check if destination exists and compare contents
    if (fs.existsSync(dest)) {
      const destContent = fs.readFileSync(dest, 'utf8');
      if (destContent === transformedContent && !force) {
        // Contents are identical, skip
        actions.push({ type: 'skip', src: f, dest, reason: 'unchanged' });
        seen.add(dest);
        continue;
      }
      // Contents differ or force flag set, deploy (overwrite)
      actions.push({ type: 'deploy', src: f, dest, content: transformedContent, reason: force ? 'forced' : 'changed' });
    } else {
      // File doesn't exist, deploy
      actions.push({ type: 'deploy', src: f, dest, content: transformedContent, reason: 'new' });
    }
    seen.add(dest);
  }

  for (const a of actions) {
    if (a.type === 'deploy') {
      if (dryRun) console.log(`[dry-run] deploy ${a.src} -> ${a.dest} (${a.reason})`);
      else writeFile(a.dest, a.content, false);
      console.log(`deployed ${path.basename(a.src)} -> ${path.relative(process.cwd(), a.dest)} (${a.reason})`);
    } else if (a.type === 'skip') {
      console.log(`skip (${a.reason}): ${path.basename(a.dest)}`);
    }
  }
}

function aggregateToAgentsMd(files, destPath, opts) {
  const { provider } = opts;
  const blocks = [];
  for (const f of files) {
    let content = fs.readFileSync(f, 'utf8');
    content = transformIfNeeded(f, content, provider, opts, opts.modelsConfig);
    // ensure block separation
    if (!content.endsWith('\n')) content += '\n';
    blocks.push(content);
  }
  const out = blocks.join('\n');
  if (opts.dryRun) console.log(`[dry-run] write ${destPath}`);
  else fs.writeFileSync(destPath, out, 'utf8');
  console.log(`wrote ${path.relative(process.cwd(), destPath)} with ${files.length} agents`);
}

function createFactoryAgentsMd(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'factory', 'AGENTS.md.aiwg-template');
  const destPath = path.join(target, 'AGENTS.md');
  
  if (!fs.existsSync(templatePath)) {
    console.warn(`Factory AGENTS.md template not found at ${templatePath}`);
    return;
  }
  
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Check if AGENTS.md already exists
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');
    
    // Check if it already has AIWG section
    if (existing.includes('AIWG SDLC Framework')) {
      console.log('AGENTS.md already contains AIWG section, skipping');
      return;
    }
    
    // Append AIWG section to existing AGENTS.md
    const separator = '\n\n---\n\n<!-- AIWG SDLC Framework Integration -->\n\n';
    const aiwgSection = template.split('<!-- AIWG SDLC Framework Integration -->')[1] || template;
    const combined = existing.trimEnd() + separator + aiwgSection.trim() + '\n';
    
    if (dryRun) {
      console.log(`[dry-run] Would update existing AGENTS.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated AGENTS.md with AIWG SDLC framework section');
    }
  } else {
    // Create new AGENTS.md from template
    if (dryRun) {
      console.log(`[dry-run] Would create AGENTS.md from Factory template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created AGENTS.md from Factory template');
    }
  }
}

function enableFactoryCustomDroids(dryRun) {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    console.warn('Could not determine home directory, skipping Factory settings configuration');
    return;
  }
  
  const settingsDir = path.join(homeDir, '.factory');
  const settingsPath = path.join(settingsDir, 'settings.json');
  
  let settings = {};
  
  // Read existing settings if present
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(content);
    } catch (err) {
      console.warn(`Warning: Could not parse existing Factory settings.json: ${err.message}`);
      console.warn('Creating new settings file...');
      settings = {};
    }
  }
  
  // Check if Custom Droids already enabled
  if (settings.enableCustomDroids === true) {
    console.log('Factory Custom Droids already enabled in settings');
    return;
  }
  
  // Enable Custom Droids
  settings.enableCustomDroids = true;
  
  if (dryRun) {
    console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
    console.log(`[dry-run] New setting: enableCustomDroids: true`);
  } else {
    // Ensure settings directory exists
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    
    // Write updated settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
    console.log('Note: You may need to restart droid for this setting to take effect');
  }
}

(function main() {
  const cfg = parseArgs();
  const { source, target, mode, dryRun, force, provider, reasoningModel, codingModel, efficiencyModel, deployCommands, commandsOnly, asAgentsMd, createAgentsMd } = cfg;

  // Resolve default source = repo root of this script
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source ? source : repoRoot;

  // Load model configuration
  const modelsConfig = loadModelConfig(srcRoot);
  console.log(`Model config loaded from: ${modelsConfig._source || 'defaults'}`);

  const deployOpts = {
    force,
    modelsConfig,
    dryRun,
    provider,
    reasoningModel,
    codingModel,
    efficiencyModel
  };

  // Deploy Agents (unless --commands-only)
  if (!commandsOnly) {
    // Deploy general agents if mode is 'general' or 'both'
    if (mode === 'general' || mode === 'both') {
      const generalAgentsRoot = path.join(srcRoot, 'agents');
      if (fs.existsSync(generalAgentsRoot)) {
        const files = listMdFiles(generalAgentsRoot);
        if (files.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'droids')
            : provider === 'openai'
            ? path.join(target, '.codex', 'agents')
            : path.join(target, '.claude', 'agents');
          if (!dryRun) ensureDir(destDir);
          console.log(`Deploying ${files.length} general-purpose agents to ${destDir} (provider=${provider})`);
          deployFiles(files, destDir, deployOpts);
        }
      }
    }

    // Deploy SDLC agents if mode is 'sdlc' or 'both'
    if (mode === 'sdlc' || mode === 'both') {
      const sdlcAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
      if (fs.existsSync(sdlcAgentsRoot)) {
        const files = listMdFiles(sdlcAgentsRoot);
        if (files.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'droids')
            : provider === 'openai'
            ? path.join(target, '.codex', 'agents')
            : path.join(target, '.claude', 'agents');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${files.length} SDLC framework agents to ${destDir} (provider=${provider})`);
          deployFiles(files, destDir, deployOpts);
        }
      } else {
        console.warn(`SDLC agents not found at ${sdlcAgentsRoot}`);
      }
    }
  }

  // Deploy Commands (if --deploy-commands or --commands-only)
  if (deployCommands || commandsOnly) {
    // Deploy general commands if mode is 'general' or 'both'
    if (mode === 'general' || mode === 'both') {
      const generalCommandsRoot = path.join(srcRoot, 'commands');
      if (fs.existsSync(generalCommandsRoot)) {
        const commandFiles = listMdFilesRecursive(generalCommandsRoot);
        if (commandFiles.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'commands')
            : provider === 'openai'
            ? path.join(target, '.codex', 'commands')
            : path.join(target, '.claude', 'commands');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${commandFiles.length} general-purpose commands to ${destDir} (provider=${provider})`);
          deployFiles(commandFiles, destDir, deployOpts);
        }
      }
    }

    // Deploy SDLC commands if mode is 'sdlc' or 'both'
    if (mode === 'sdlc' || mode === 'both') {
      const sdlcCommandsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      if (fs.existsSync(sdlcCommandsRoot)) {
        const commandFiles = listMdFilesRecursive(sdlcCommandsRoot);
        if (commandFiles.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'commands')
            : provider === 'openai'
            ? path.join(target, '.codex', 'commands')
            : path.join(target, '.claude', 'commands');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${commandFiles.length} SDLC framework commands to ${destDir} (provider=${provider})`);
          deployFiles(commandFiles, destDir, deployOpts);
        }
      } else {
        console.warn(`SDLC commands not found at ${sdlcCommandsRoot}`);
      }
    }
  }

  // Create/update AGENTS.md for Factory provider
  if (provider === 'factory' && createAgentsMd) {
    console.log('\nCreating/updating AGENTS.md template for Factory...');
    createFactoryAgentsMd(target, srcRoot, dryRun);
  }

  // Enable Custom Droids in Factory settings (if deploying to Factory)
  if (provider === 'factory' && !commandsOnly) {
    console.log('\nConfiguring Factory settings...');
    enableFactoryCustomDroids(dryRun);
  }
})();
