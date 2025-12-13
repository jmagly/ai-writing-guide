#!/usr/bin/env node
/**
 * Deploy Agents and Commands
 *
 * Deploy agents/commands from this repository to a target project.
 * Supports multiple deployment modes:
 * 1. General-purpose (writing agents, general commands)
 * 2. SDLC framework (complete software development lifecycle)
 * 3. Marketing (Media/Marketing Kit framework)
 * 4. All (all frameworks - default)
 *
 * Usage:
 *   node tools/agents/deploy-agents.mjs [options]
 *
 * Options:
 *   --source <path>          Source directory (defaults to repo root)
 *   --target <path>          Target directory (defaults to cwd)
 *   --mode <type>            Deployment mode: general, sdlc, marketing, both, or all (default)
 *   --deploy-commands        Deploy commands in addition to agents
 *   --deploy-skills          Deploy skills in addition to agents
 *   --commands-only          Deploy only commands (skip agents)
 *   --skills-only            Deploy only skills (skip agents)
 *   --dry-run                Show what would be deployed without writing
 *   --force                  Overwrite existing files
 *   --provider <name>        Target provider: claude (default), openai, codex, cursor, opencode, copilot, factory, or windsurf
 *   --reasoning-model <name> Override model for reasoning tasks
 *   --coding-model <name>    Override model for coding tasks
 *   --efficiency-model <name> Override model for efficiency tasks
 *   --as-agents-md           Aggregate to single AGENTS.md (OpenAI)
 *   --create-agents-md       Create/update AGENTS.md template (Factory/Codex)
 *
 * Modes:
 *   general   - Deploy only writing-quality addon agents and commands (alias: writing)
 *   writing   - Deploy only writing-quality addon agents (alias for general)
 *   sdlc      - Deploy only SDLC Complete framework agents and commands
 *   marketing - Deploy only Media/Marketing Kit framework agents and commands
 *   both      - Deploy writing + SDLC (legacy compatibility)
 *   all       - Deploy all frameworks + addons (default)
 *
 * Defaults:
 *   --source resolves relative to this script's repo root (../..)
 *   --target is process.cwd()
 *   --mode is 'all'
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: process.cwd(),
    mode: 'all',  // 'general', 'sdlc', 'marketing', 'both' (legacy), or 'all'
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
    commandsOnly: false,
    skillsOnly: false
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
    else if (a === '--commands-only') cfg.commandsOnly = true;
    else if (a === '--skills-only') cfg.skillsOnly = true;
  }
  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function listMdFiles(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'factory-compat.md', 'windsurf-compat.md', 'DEVELOPMENT_GUIDE.md'];
  const excluded = [...defaultExcluded, ...excludePatterns];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !excluded.includes(e.name))
    .map((e) => path.join(dir, e.name));
}

function listSkillDirs(dir) {
  // Skills are directories containing SKILL.md
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'SKILL.md')))
    .map((e) => path.join(dir, e.name));
}

function listMdFilesRecursive(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'factory-compat.md', 'windsurf-compat.md', 'DEVELOPMENT_GUIDE.md'];
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
  const rawName = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();

  // Convert name to kebab-case for Factory compatibility
  // "Technical Researcher" -> "technical-researcher"
  const name = toKebabCase(rawName);

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

/**
 * Convert a string to kebab-case
 * "Technical Researcher" -> "technical-researcher"
 * "Software Implementer" -> "software-implementer"
 */
function toKebabCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
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
  // Note: MultiEdit doesn't exist in Factory - maps to Create, Edit, ApplyPatch
  const toolMap = {
    'Bash': 'Execute',
    'Write': 'Create',  // Will add Edit too
    'WebFetch': 'FetchUrl',
    'Read': 'Read',
    'Grep': 'Grep',
    'Glob': 'Glob',
    'LS': 'LS'
  };

  const factoryTools = new Set();

  // Map original tools
  for (const tool of originalTools) {
    // Special handling for MultiEdit - Factory doesn't have it
    // Map to Edit (the closest equivalent for multi-file editing)
    if (tool === 'MultiEdit') {
      factoryTools.add('Edit');
      continue;
    }

    const mapped = toolMap[tool] || tool;
    factoryTools.add(mapped);

    // If Write is present, add both Create and Edit
    if (tool === 'Write') {
      factoryTools.add('Create');
      factoryTools.add('Edit');
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

  // Windsurf uses aggregated AGENTS.md format - transformation handled separately
  if (provider === 'windsurf') {
    return transformToWindsurfAgent(content);
  }

  // OpenCode uses different format with mode, temperature, tools, permissions
  if (provider === 'opencode') {
    // Detect if this is a command (from commands directory) vs agent
    const isCommand = srcPath.includes('/commands/') || srcPath.includes('/command/');
    if (isCommand) {
      return transformToOpencodeCommand(content, modelCfg, modelsConfig);
    }
    return transformToOpencodeAgent(content, modelCfg, modelsConfig);
  }

  // GitHub Copilot uses YAML format with name, description, model, instructions, tools
  if (provider === 'copilot') {
    // Detect if this is a command (from commands directory) vs agent
    const isCommand = srcPath.includes('/commands/') || srcPath.includes('/command/');
    if (isCommand) {
      return transformToCopilotCommand(content, modelCfg, modelsConfig);
    }
    return transformToCopilotAgent(content, modelCfg, modelsConfig);
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

// ============================================================================
// WINDSURF PROVIDER SUPPORT (EXPERIMENTAL)
// ============================================================================

function displayWindsurfWarning() {
  console.log('\n' + '='.repeat(70));
  console.log('[EXPERIMENTAL] Windsurf provider support is experimental and untested.');
  console.log('Please report issues: https://github.com/jmagly/ai-writing-guide/issues');
  console.log('='.repeat(70) + '\n');
}

/**
 * Transform agent content to Windsurf format (plain markdown, no YAML frontmatter)
 */
function transformToWindsurfAgent(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();

  // Build Windsurf-compatible format (plain markdown, no YAML)
  const lines = [];
  lines.push(`### ${name}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }

  // Parse and include tools as capabilities
  if (toolsMatch) {
    const tools = toolsMatch.startsWith('[')
      ? JSON.parse(toolsMatch)
      : toolsMatch.split(/[,\s]+/).filter(Boolean);

    if (tools.length > 0) {
      lines.push('<capabilities>');
      tools.forEach(t => lines.push(`- ${t.trim()}`));
      lines.push('</capabilities>');
      lines.push('');
    }
  }

  if (modelMatch) {
    lines.push(`**Model**: ${modelMatch}`);
    lines.push('');
  }

  lines.push(body.trim());
  return lines.join('\n');
}

/**
 * Transform command content to Windsurf workflow format
 */
function transformToWindsurfWorkflow(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract name and description from frontmatter
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  const descMatch = frontmatter.match(/description:\s*(.+)/);

  const name = nameMatch ? nameMatch[1].trim() : 'Workflow';
  const description = descMatch ? descMatch[1].trim() : '';

  // Build workflow format
  const lines = [];
  lines.push(`# ${name}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }
  lines.push('## Instructions');
  lines.push('');
  lines.push(body.trim());

  return lines.join('\n');
}

/**
 * Generate AGENTS.md for Windsurf with all agents aggregated
 */
function generateWindsurfAgentsMd(files, destPath, opts) {
  const { dryRun } = opts;

  const lines = [];
  lines.push('# AGENTS.md');
  lines.push('');
  lines.push('> AIWG Agent Directory for Windsurf');
  lines.push('');
  lines.push('<!--');
  lines.push('  [EXPERIMENTAL] Generated by AIWG for Windsurf');
  lines.push('  Windsurf reads this file for directory-scoped AI instructions.');
  lines.push('  See: https://docs.windsurf.com/windsurf/cascade/agents-md');
  lines.push('-->');
  lines.push('');
  lines.push('## Table of Contents');
  lines.push('');

  // Build TOC and collect agents
  const agents = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : path.basename(f, '.md');
    agents.push({ name, file: f, content });
    const anchor = name.replace(/\s+/g, '-').toLowerCase();
    lines.push(`- [${name}](#${anchor})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Add each agent
  for (const agent of agents) {
    const transformed = transformToWindsurfAgent(agent.content);
    lines.push(transformed);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const output = lines.join('\n');

  if (dryRun) {
    console.log(`[dry-run] Would write AGENTS.md with ${agents.length} agents`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    console.log(`Created AGENTS.md with ${agents.length} agents at ${path.relative(process.cwd(), destPath)}`);
  }

  return agents.length;
}

/**
 * Generate .windsurfrules with orchestration context and key agents
 */
function generateWindsurfRules(srcRoot, target, opts) {
  const { dryRun } = opts;

  const lines = [];
  lines.push('# AIWG Rules for Windsurf');
  lines.push('');
  lines.push('<!--');
  lines.push('  [EXPERIMENTAL] Generated by AIWG for Windsurf');
  lines.push('  This file provides orchestration context for AIWG SDLC workflows.');
  lines.push('-->');
  lines.push('');

  // Orchestration section
  lines.push('<orchestration>');
  lines.push('## AIWG SDLC Framework');
  lines.push('');
  lines.push('**58 SDLC agents** | **100+ commands** | **49 skills** | **157 templates**');
  lines.push('');
  lines.push('### Natural Language Commands');
  lines.push('');
  lines.push('**Phase Transitions:**');
  lines.push('- "transition to elaboration" | "move to elaboration" | "start elaboration"');
  lines.push('- "ready to deploy" | "begin construction" | "start transition"');
  lines.push('');
  lines.push('**Workflow Requests:**');
  lines.push('- "run iteration {N}" | "start iteration {N}"');
  lines.push('- "deploy to production" | "start deployment"');
  lines.push('');
  lines.push('**Review Cycles:**');
  lines.push('- "security review" | "run security" | "validate security"');
  lines.push('- "run tests" | "execute tests" | "test suite"');
  lines.push('');
  lines.push('**Status Checks:**');
  lines.push('- "where are we" | "what\'s next" | "project status"');
  lines.push('</orchestration>');
  lines.push('');

  // Key agents section
  lines.push('<agents>');
  lines.push('## Key Agents');
  lines.push('');
  lines.push('For the full catalog of 58+ agents, see @AGENTS.md');
  lines.push('');
  lines.push('### Executive Orchestrator');
  lines.push('**Role**: Coordinate multi-agent workflows and phase transitions.');
  lines.push('**Use**: Phase transitions, complex multi-deliverable workflows.');
  lines.push('');
  lines.push('### Requirements Analyst');
  lines.push('**Role**: Analyze requirements, create use cases and user stories.');
  lines.push('**Use**: "analyze requirements", "create use case for {feature}"');
  lines.push('');
  lines.push('### Architecture Designer');
  lines.push('**Role**: Design system architecture, create ADRs, select technology stacks.');
  lines.push('**Use**: "design architecture", "create SAD", "write ADR for {decision}"');
  lines.push('');
  lines.push('### Security Architect');
  lines.push('**Role**: Lead threat modeling, security requirements, and gates.');
  lines.push('**Use**: "security review", "threat model", "security gate"');
  lines.push('');
  lines.push('### Test Architect');
  lines.push('**Role**: Define test strategy, coverage requirements, automation approach.');
  lines.push('**Use**: "test strategy", "define test plan", "coverage analysis"');
  lines.push('');
  lines.push('### Technical Writer');
  lines.push('**Role**: Create and maintain documentation with voice consistency.');
  lines.push('**Use**: "document {feature}", "update README", "API docs"');
  lines.push('</agents>');
  lines.push('');

  // Artifacts section
  lines.push('<artifacts>');
  lines.push('## Project Artifacts');
  lines.push('');
  lines.push('All SDLC artifacts stored in `.aiwg/`:');
  lines.push('- `intake/` - Project intake forms');
  lines.push('- `requirements/` - User stories, use cases');
  lines.push('- `architecture/` - SAD, ADRs');
  lines.push('- `testing/` - Test strategy, plans');
  lines.push('- `security/` - Threat models');
  lines.push('- `deployment/` - Deployment plans');
  lines.push('</artifacts>');
  lines.push('');

  // References section
  lines.push('<references>');
  lines.push('## Full Documentation');
  lines.push('');
  lines.push('- **All Agents**: @AGENTS.md');
  lines.push('- **Templates**: @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/');
  lines.push('- **Commands**: @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/commands/');
  lines.push('- **Repository**: https://github.com/jmagly/ai-writing-guide');
  lines.push('</references>');

  const output = lines.join('\n');
  const destPath = path.join(target, '.windsurfrules');

  if (dryRun) {
    console.log(`[dry-run] Would write .windsurfrules`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    console.log(`Created .windsurfrules at ${path.relative(process.cwd(), destPath)}`);
  }
}

// ============================================================================
// END WINDSURF PROVIDER SUPPORT
// ============================================================================

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
    let base = path.basename(f);
    // Copilot uses .yaml extension for agent files
    if (provider === 'copilot' && base.endsWith('.md')) {
      base = base.replace(/\.md$/, '.yaml');
    }
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

function deploySkillDir(skillDir, destDir, opts) {
  const { force = false, dryRun = false } = opts;
  const skillName = path.basename(skillDir);
  const destSkillDir = path.join(destDir, skillName);

  // Create skill directory
  if (!dryRun) ensureDir(destSkillDir);

  // Copy all files recursively
  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        if (!dryRun) ensureDir(destPath);
        copyRecursive(srcPath, destPath);
      } else {
        const srcContent = fs.readFileSync(srcPath, 'utf8');

        if (fs.existsSync(destPath)) {
          const destContent = fs.readFileSync(destPath, 'utf8');
          if (destContent === srcContent && !force) {
            console.log(`skip (unchanged): ${path.relative(destDir, destPath)}`);
            continue;
          }
        }

        if (dryRun) {
          console.log(`[dry-run] deploy ${srcPath} -> ${destPath}`);
        } else {
          fs.writeFileSync(destPath, srcContent, 'utf8');
          console.log(`deployed ${entry.name} -> ${path.relative(process.cwd(), destPath)}`);
        }
      }
    }
  }

  copyRecursive(skillDir, destSkillDir);
  console.log(`deployed skill: ${skillName}`);
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

function createCodexAgentsMd(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'codex', 'AGENTS.md.aiwg-template');
  const destPath = path.join(target, 'AGENTS.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`Codex AGENTS.md template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Check if AGENTS.md already exists
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    // Check if it already has AIWG section (look for the marker comment or header)
    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('AGENTS.md already contains AIWG section, skipping');
      return;
    }

    // Append AIWG section to existing AGENTS.md
    // Extract just the AIWG section from the template (after the marker comment)
    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1
      ? template.slice(markerIndex)
      : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing AGENTS.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated AGENTS.md with AIWG SDLC framework section');
    }
  } else {
    // Create new AGENTS.md from template
    if (dryRun) {
      console.log(`[dry-run] Would create AGENTS.md from Codex template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created AGENTS.md from Codex template');
    }
  }
}

function createCursorAgentsMd(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'cursor', 'AGENTS.md.aiwg-template');
  const destPath = path.join(target, 'AGENTS.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`Cursor AGENTS.md template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Check if AGENTS.md already exists
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    // Check if it already has AIWG section (look for the marker comment or header)
    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('AGENTS.md already contains AIWG section, skipping');
      return;
    }

    // Append AIWG section to existing AGENTS.md
    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1
      ? template.slice(markerIndex)
      : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing AGENTS.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated AGENTS.md with AIWG SDLC framework section');
    }
  } else {
    // Create new AGENTS.md from template
    if (dryRun) {
      console.log(`[dry-run] Would create AGENTS.md from Cursor template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created AGENTS.md from Cursor template');
    }
  }
}

function createOpencodeAgentsMd(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'opencode', 'AGENTS.md.aiwg-template');
  const destPath = path.join(target, 'AGENTS.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`OpenCode AGENTS.md template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Check if AGENTS.md already exists
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    // Check if it already has AIWG section (look for the marker comment or header)
    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('AGENTS.md already contains AIWG section, skipping');
      return;
    }

    // Append AIWG section to existing AGENTS.md
    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1
      ? template.slice(markerIndex)
      : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing AGENTS.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated AGENTS.md with AIWG SDLC framework section');
    }
  } else {
    // Create new AGENTS.md from template
    if (dryRun) {
      console.log(`[dry-run] Would create AGENTS.md from OpenCode template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created AGENTS.md from OpenCode template');
    }
  }
}

/**
 * Transform AIWG agent to OpenCode agent format
 * OpenCode uses: mode, model (full path), temperature, tools, permission, maxSteps
 */
function transformToOpencodeAgent(content, modelCfg, modelsConfig) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();
  const categoryMatch = frontmatter.match(/category:\s*(.+)/)?.[1]?.trim();
  const orchestrationMatch = frontmatter.match(/orchestration:\s*(.+)/)?.[1]?.trim();

  // Map model to OpenCode format (full provider/model path)
  const opencodeModel = mapModelToOpencode(modelMatch, modelCfg, modelsConfig);

  // Determine agent category for tool/permission configuration
  const category = categoryMatch || inferAgentCategory(name, body);

  // Configure tools and permissions based on agent category
  const { tools, permission, temperature, maxSteps } = getOpencodeAgentConfig(category, name);

  // All SDLC agents are subagents (invokable via @mention)
  const mode = orchestrationMatch === 'true' ? 'primary' : 'subagent';

  // Generate OpenCode agent frontmatter
  let opencodeFrontmatter = `---
description: ${description || 'AIWG SDLC agent'}
mode: ${mode}
model: ${opencodeModel}
temperature: ${temperature}
maxSteps: ${maxSteps}`;

  // Add tools configuration
  if (Object.keys(tools).length > 0) {
    opencodeFrontmatter += `\ntools:`;
    for (const [tool, enabled] of Object.entries(tools)) {
      opencodeFrontmatter += `\n  ${tool}: ${enabled}`;
    }
  }

  // Add permission configuration if needed
  if (Object.keys(permission).length > 0) {
    opencodeFrontmatter += `\npermission:`;
    for (const [perm, value] of Object.entries(permission)) {
      if (typeof value === 'object') {
        opencodeFrontmatter += `\n  ${perm}:`;
        for (const [cmd, action] of Object.entries(value)) {
          opencodeFrontmatter += `\n    "${cmd}": ${action}`;
        }
      } else {
        opencodeFrontmatter += `\n  ${perm}: ${value}`;
      }
    }
  }

  opencodeFrontmatter += `\n---`;

  return `${opencodeFrontmatter}\n\n${body.trim()}`;
}

function mapModelToOpencode(originalModel, modelCfg, modelsConfig) {
  // OpenCode uses full provider/model paths
  const opencodeModels = {
    'opus': 'anthropic/claude-opus-4-20250514',
    'sonnet': 'anthropic/claude-sonnet-4-20250514',
    'haiku': 'anthropic/claude-haiku-4-20250514'
  };

  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || opencodeModels.opus;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || opencodeModels.haiku;
    return modelCfg.codingModel || opencodeModels.sonnet;
  }

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  // Match to OpenCode model
  for (const [key, value] of Object.entries(opencodeModels)) {
    if (clean.includes(key)) return value;
  }

  return opencodeModels.sonnet; // default
}

function inferAgentCategory(name, body) {
  const normalizedName = (name || '').toLowerCase();
  const normalizedBody = (body || '').toLowerCase();

  // Analysis agents (read-only)
  if (normalizedName.includes('security') || normalizedName.includes('review') ||
      normalizedName.includes('analyst') || normalizedName.includes('auditor')) {
    return 'analysis';
  }

  // Documentation agents
  if (normalizedName.includes('writer') || normalizedName.includes('document') ||
      normalizedName.includes('archivist')) {
    return 'documentation';
  }

  // Planning agents
  if (normalizedName.includes('architect') || normalizedName.includes('planner') ||
      normalizedName.includes('requirements') || normalizedName.includes('designer')) {
    return 'planning';
  }

  // Implementation agents (full access)
  if (normalizedName.includes('implement') || normalizedName.includes('engineer') ||
      normalizedName.includes('developer') || normalizedName.includes('test')) {
    return 'implementation';
  }

  // Default to implementation for most flexibility
  return 'implementation';
}

/**
 * Transform AIWG command to OpenCode command format
 * OpenCode commands use: description, agent (optional), model (optional), subtask (boolean)
 */
function transformToOpencodeCommand(content, modelCfg, modelsConfig) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter, add minimal OpenCode frontmatter
    const firstLine = content.split('\n')[0];
    const description = firstLine.replace(/^#\s*/, '').trim() || 'AIWG command';
    return `---\ndescription: ${description}\nsubtask: true\n---\n\n${content}`;
  }

  const [, frontmatter, body] = fmMatch;

  // Extract metadata from existing frontmatter
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const agentMatch = frontmatter.match(/agent:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();

  // Build OpenCode command frontmatter
  let opencodeFrontmatter = `---\ndescription: ${description || 'AIWG command'}`;

  // Add agent reference if specified
  if (agentMatch) {
    opencodeFrontmatter += `\nagent: ${agentMatch}`;
  }

  // Add model if specified
  if (modelMatch) {
    const opencodeModel = mapModelToOpencode(modelMatch, modelCfg, modelsConfig);
    opencodeFrontmatter += `\nmodel: ${opencodeModel}`;
  }

  // Commands are subtasks by default (invoked via /command)
  opencodeFrontmatter += `\nsubtask: true\n---`;

  return `${opencodeFrontmatter}\n\n${body.trim()}`;
}

function getOpencodeAgentConfig(category, name) {
  const configs = {
    analysis: {
      tools: { write: false, edit: false, patch: false, bash: true, webfetch: true },
      permission: {
        bash: {
          'git *': 'allow',
          'npm audit': 'allow',
          'npm test': 'allow',
          '*': 'ask'
        }
      },
      temperature: 0.2,
      maxSteps: 30
    },
    documentation: {
      tools: { bash: false, patch: false },
      permission: {},
      temperature: 0.4,
      maxSteps: 50
    },
    planning: {
      tools: { write: false, edit: false, bash: false, patch: false, webfetch: true },
      permission: {},
      temperature: 0.3,
      maxSteps: 40
    },
    implementation: {
      tools: {},  // All tools enabled by default
      permission: {
        bash: {
          'aiwg *': 'allow',
          'git status': 'allow',
          'git diff': 'allow',
          'git log*': 'allow',
          'npm test': 'allow',
          'npm run *': 'allow',
          'git push': 'ask',
          'rm -rf': 'deny',
          '*': 'ask'
        }
      },
      temperature: 0.3,
      maxSteps: 100
    }
  };

  return configs[category] || configs.implementation;
}

/**
 * Transform AIWG agent to GitHub Copilot Custom Agent format (.yaml)
 * GitHub Copilot uses: name, description, model, instructions, tools (optional)
 */
function transformToCopilotAgent(content, modelCfg, modelsConfig) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();
  const categoryMatch = frontmatter.match(/category:\s*(.+)/)?.[1]?.trim();

  // Map model to Copilot format
  const copilotModel = mapModelToCopilot(modelMatch, modelCfg, modelsConfig);

  // Determine agent category for tool configuration
  const category = categoryMatch || inferAgentCategory(name, body);

  // Get Copilot-specific tools based on category
  const copilotTools = getCopilotTools(category, toolsMatch);

  // Generate Copilot agent YAML
  let copilotYaml = `name: ${name || 'aiwg-agent'}
description: ${description || 'AIWG SDLC agent'}
model:
  name: ${copilotModel}
  temperature: ${category === 'analysis' ? 0.2 : category === 'documentation' ? 0.4 : 0.3}
  max_tokens: ${category === 'implementation' ? 8000 : 4000}`;

  // Add tools if applicable
  if (copilotTools.length > 0) {
    copilotYaml += `\ntools: ${JSON.stringify(copilotTools)}`;
  }

  // Add instructions from body
  const cleanBody = body.trim();
  if (cleanBody) {
    // Escape special YAML characters in multiline string
    const escapedBody = cleanBody.replace(/\\/g, '\\\\');
    copilotYaml += `\ninstructions: |\n${escapedBody.split('\n').map(line => '  ' + line).join('\n')}`;
  }

  return copilotYaml;
}

function mapModelToCopilot(originalModel, modelCfg, modelsConfig) {
  // GitHub Copilot typically uses GPT-4 or Claude models
  const copilotModels = {
    'opus': 'gpt-4',
    'sonnet': 'gpt-4',
    'haiku': 'gpt-4o-mini'
  };

  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || copilotModels.opus;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || copilotModels.haiku;
    return modelCfg.codingModel || copilotModels.sonnet;
  }

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  // Match to Copilot model
  for (const [key, value] of Object.entries(copilotModels)) {
    if (clean.includes(key)) return value;
  }

  return copilotModels.sonnet; // default
}

function getCopilotTools(category, toolsString) {
  // Map AIWG tools to GitHub Copilot tools
  const toolMap = {
    'Read': 'search',
    'Write': 'createFile',
    'MultiEdit': 'editFiles',
    'Bash': 'runInTerminal',
    'WebFetch': 'fetch',
    'Glob': 'search',
    'Grep': 'search',
    'Task': 'runSubagent'
  };

  // Default tools by category
  const categoryDefaults = {
    analysis: ['search', 'fetch', 'githubRepo', 'problems'],
    documentation: ['search', 'createFile', 'editFiles', 'fetch'],
    planning: ['search', 'fetch', 'githubRepo', 'todos'],
    implementation: ['createFile', 'createDirectory', 'editFiles', 'deleteFile', 'search', 'runInTerminal', 'fetch', 'runSubagent', 'todos', 'problems', 'changes']
  };

  // If tools specified, map them
  if (toolsString) {
    let originalTools = [];
    if (toolsString.startsWith('[')) {
      try {
        originalTools = JSON.parse(toolsString);
      } catch (e) {
        originalTools = toolsString.replace(/[\[\]"']/g, '').split(/[,\s]+/).filter(Boolean);
      }
    } else {
      originalTools = toolsString.split(/[,\s]+/).filter(Boolean);
    }

    const mappedTools = new Set();
    for (const tool of originalTools) {
      const mapped = toolMap[tool];
      if (mapped) mappedTools.add(mapped);
    }

    // If we got any mapped tools, return them
    if (mappedTools.size > 0) {
      return Array.from(mappedTools);
    }
  }

  // Fall back to category defaults
  return categoryDefaults[category] || categoryDefaults.implementation;
}

/**
 * Transform AIWG command to GitHub Copilot format
 * Commands become part of copilot-instructions.md or separate agent files
 */
function transformToCopilotCommand(content, modelCfg, modelsConfig) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter, create simple agent format
    const firstLine = content.split('\n')[0];
    const description = firstLine.replace(/^#\s*/, '').trim() || 'AIWG command';
    const name = description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    return `name: ${name}
description: ${description}
model:
  name: gpt-4
  temperature: 0.3
  max_tokens: 4000
instructions: |
${content.split('\n').map(line => '  ' + line).join('\n')}`;
  }

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const name = (description || 'aiwg-command').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Build Copilot command as simple agent
  return `name: ${name}
description: ${description || 'AIWG command'}
model:
  name: gpt-4
  temperature: 0.3
  max_tokens: 4000
instructions: |
${body.trim().split('\n').map(line => '  ' + line).join('\n')}`;
}

function createCopilotAgentsMd(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'copilot', 'copilot-instructions.md.aiwg-template');
  const destPath = path.join(target, '.github', 'copilot-instructions.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`Copilot instructions template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Ensure .github directory exists
  const githubDir = path.join(target, '.github');
  if (!dryRun && !fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  // Check if copilot-instructions.md already exists
  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    // Check if it already has AIWG section
    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('copilot-instructions.md already contains AIWG section, skipping');
      return;
    }

    // Append AIWG section to existing file
    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1
      ? template.slice(markerIndex)
      : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing copilot-instructions.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated copilot-instructions.md with AIWG SDLC framework section');
    }
  } else {
    // Create new file from template
    if (dryRun) {
      console.log(`[dry-run] Would create copilot-instructions.md from template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created copilot-instructions.md from template');
    }
  }
}

/**
 * Initialize framework-scoped workspace structure
 * Creates .aiwg/frameworks/{framework-id}/ directories as specified in issue #53
 */
function initializeFrameworkWorkspace(target, mode, dryRun) {
  const aiwgBase = path.join(target, '.aiwg');
  const frameworksDir = path.join(aiwgBase, 'frameworks');
  const sharedDir = path.join(aiwgBase, 'shared');

  // Framework-specific directories based on mode
  const frameworkDirs = [];

  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    frameworkDirs.push({
      id: 'sdlc-complete',
      subdirs: ['repo', 'projects', 'working', 'archive']
    });
  }

  if (mode === 'marketing' || mode === 'all') {
    frameworkDirs.push({
      id: 'media-marketing-kit',
      subdirs: ['repo', 'campaigns', 'working', 'archive']
    });
  }

  // Skip if no framework directories to create
  if (frameworkDirs.length === 0) {
    return;
  }

  if (dryRun) {
    console.log('\n[dry-run] Would create framework-scoped workspace structure:');
    console.log(`[dry-run]   ${aiwgBase}/`);
    console.log(`[dry-run]   ${frameworksDir}/`);
    console.log(`[dry-run]   ${sharedDir}/`);
    for (const fw of frameworkDirs) {
      for (const subdir of fw.subdirs) {
        console.log(`[dry-run]   ${path.join(frameworksDir, fw.id, subdir)}/`);
      }
    }
    return;
  }

  // Create base directories
  ensureDir(aiwgBase);
  ensureDir(frameworksDir);
  ensureDir(sharedDir);

  // Create framework directories
  for (const fw of frameworkDirs) {
    const fwBase = path.join(frameworksDir, fw.id);
    ensureDir(fwBase);

    for (const subdir of fw.subdirs) {
      ensureDir(path.join(fwBase, subdir));
    }
  }

  // Initialize registry.json if it doesn't exist
  const registryPath = path.join(frameworksDir, 'registry.json');
  if (!fs.existsSync(registryPath)) {
    const registry = {
      version: '1.0.0',
      created: new Date().toISOString(),
      frameworks: {}
    };

    for (const fw of frameworkDirs) {
      registry.frameworks[fw.id] = {
        id: fw.id,
        type: 'framework',
        version: '1.0.0',
        'install-date': new Date().toISOString(),
        'repo-path': `frameworks/${fw.id}/repo`,
        health: 'healthy'
      };
    }

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n', 'utf8');
    console.log(`\nInitialized framework registry: ${registryPath}`);
  }

  console.log(`\nInitialized framework-scoped workspace at ${aiwgBase}/`);
}

/**
 * Strip comments from JSONC (JSON with comments) content
 * Factory settings.json uses JSONC format with // comments
 */
function stripJsonComments(content) {
  // Remove single-line comments (// ...) but not URLs (http://, https://)
  // Also preserve strings containing //
  let result = '';
  let inString = false;
  let stringChar = '';
  let i = 0;

  while (i < content.length) {
    const char = content[i];
    const nextChar = content[i + 1];

    // Handle string boundaries
    if ((char === '"' || char === "'") && (i === 0 || content[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
      i++;
      continue;
    }

    // If in string, copy as-is
    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Check for // comment outside strings
    if (char === '/' && nextChar === '/') {
      // Skip to end of line
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Check for /* */ block comments
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
        i++;
      }
      i += 2; // Skip */
      continue;
    }

    result += char;
    i++;
  }

  return result;
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
  let originalContent = '';
  let hasExistingFile = false;

  // Read existing settings if present
  if (fs.existsSync(settingsPath)) {
    hasExistingFile = true;
    try {
      originalContent = fs.readFileSync(settingsPath, 'utf8');
      // Strip JSONC comments before parsing
      const jsonContent = stripJsonComments(originalContent);
      settings = JSON.parse(jsonContent);
    } catch (err) {
      console.warn(`Warning: Could not parse existing Factory settings.json: ${err.message}`);
      console.warn('Will add enableCustomDroids setting using text manipulation to preserve file...');

      // Try to add the setting via text manipulation instead of JSON parse/stringify
      if (originalContent.includes('"enableCustomDroids"')) {
        // Setting exists, check if it's true
        if (originalContent.includes('"enableCustomDroids": true') ||
            originalContent.includes('"enableCustomDroids":true')) {
          console.log('Factory Custom Droids already enabled in settings');
          return;
        }
        // Replace false with true
        if (!dryRun) {
          const updatedContent = originalContent.replace(
            /"enableCustomDroids"\s*:\s*false/,
            '"enableCustomDroids": true'
          );
          fs.writeFileSync(settingsPath, updatedContent, 'utf8');
          console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
        } else {
          console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
        }
        return;
      }

      // Setting doesn't exist, add it after the first {
      if (!dryRun) {
        const insertPoint = originalContent.indexOf('{') + 1;
        const updatedContent =
          originalContent.slice(0, insertPoint) +
          '\n  "enableCustomDroids": true,' +
          originalContent.slice(insertPoint);
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
        console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
      } else {
        console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
      }
      return;
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

    if (hasExistingFile && originalContent.includes('//')) {
      // File has comments - use text manipulation to preserve them
      if (originalContent.includes('"enableCustomDroids"')) {
        // Replace existing value
        const updatedContent = originalContent.replace(
          /"enableCustomDroids"\s*:\s*false/,
          '"enableCustomDroids": true'
        );
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
      } else {
        // Add new setting after first {
        const insertPoint = originalContent.indexOf('{') + 1;
        const updatedContent =
          originalContent.slice(0, insertPoint) +
          '\n  "enableCustomDroids": true,' +
          originalContent.slice(insertPoint);
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
      }
    } else {
      // No comments or new file - safe to use JSON.stringify
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    }
    console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
    console.log('Note: You may need to restart droid for this setting to take effect');
  }
}

(async function main() {
  const cfg = parseArgs();
  const { source, target, mode, dryRun, force, provider, reasoningModel, codingModel, efficiencyModel, deployCommands, deploySkills, commandsOnly, skillsOnly, asAgentsMd, createAgentsMd } = cfg;

  // Resolve default source = repo root of this script
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source ? source : repoRoot;

  // Load model configuration
  const modelsConfig = loadModelConfig(srcRoot);
  console.log(`Model config loaded from: ${modelsConfig._source || 'defaults'}`);

  // Delegate to provider-specific deployment scripts
  if (provider === 'windsurf') {
    // Windsurf has its own dedicated deployment script
    const { spawn } = await import('child_process');
    const windsurfScript = path.join(scriptDir, 'deploy-windsurf.mjs');

    // Build args for the windsurf script
    const windsurfArgs = ['--target', target, '--mode', mode];
    if (source) windsurfArgs.push('--source', source);
    if (dryRun) windsurfArgs.push('--dry-run');
    if (force) windsurfArgs.push('--force');
    if (deployCommands) windsurfArgs.push('--deploy-commands');
    if (deploySkills) windsurfArgs.push('--deploy-skills');
    if (reasoningModel) windsurfArgs.push('--reasoning-model', reasoningModel);
    if (codingModel) windsurfArgs.push('--coding-model', codingModel);
    if (efficiencyModel) windsurfArgs.push('--efficiency-model', efficiencyModel);

    const child = spawn('node', [windsurfScript, ...windsurfArgs], { stdio: 'inherit' });
    child.on('close', (code) => process.exit(code));
    return;
  }

  const deployOpts = {
    force,
    modelsConfig,
    dryRun,
    provider,
    reasoningModel,
    codingModel,
    efficiencyModel
  };

  // Initialize framework-scoped workspace structure
  initializeFrameworkWorkspace(target, mode, dryRun);

  // Deploy Agents (unless --commands-only or --skills-only)
  if (!commandsOnly && !skillsOnly) {
    // Deploy writing addon agents if mode is 'general', 'writing', 'both', or 'all'
    if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
      // New location: agentic/code/addons/writing-quality/agents/
      const writingAddonAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'agents');
      // Fallback to legacy location for backward compatibility
      const legacyAgentsRoot = path.join(srcRoot, 'agents');
      const agentsRoot = fs.existsSync(writingAddonAgentsRoot) ? writingAddonAgentsRoot : legacyAgentsRoot;

      if (fs.existsSync(agentsRoot)) {
        const files = listMdFiles(agentsRoot);
        if (files.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'droids')
            : (provider === 'openai' || provider === 'codex')
            ? path.join(target, '.codex', 'agents')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'agent')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')
            : path.join(target, '.claude', 'agents');
          if (!dryRun) ensureDir(destDir);
          const locationLabel = agentsRoot === writingAddonAgentsRoot ? 'writing-quality addon' : 'general-purpose';
          console.log(`Deploying ${files.length} ${locationLabel} agents to ${destDir} (provider=${provider})`);
          deployFiles(files, destDir, deployOpts);
        }
      }
    }

    // Deploy SDLC agents if mode is 'sdlc', 'both', or 'all'
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
      if (fs.existsSync(sdlcAgentsRoot)) {
        const files = listMdFiles(sdlcAgentsRoot);
        if (files.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'droids')
            : (provider === 'openai' || provider === 'codex')
            ? path.join(target, '.codex', 'agents')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'agent')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')
            : path.join(target, '.claude', 'agents');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${files.length} SDLC framework agents to ${destDir} (provider=${provider})`);
          deployFiles(files, destDir, deployOpts);
        }
      } else {
        console.warn(`SDLC agents not found at ${sdlcAgentsRoot}`);
      }
    }

    // Deploy Marketing agents if mode is 'marketing' or 'all'
    if (mode === 'marketing' || mode === 'all') {
      const marketingAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
      if (fs.existsSync(marketingAgentsRoot)) {
        const files = listMdFiles(marketingAgentsRoot);
        if (files.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'droids')
            : (provider === 'openai' || provider === 'codex')
            ? path.join(target, '.codex', 'agents')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'agent')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')
            : path.join(target, '.claude', 'agents');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${files.length} Marketing framework agents to ${destDir} (provider=${provider})`);
          deployFiles(files, destDir, deployOpts);
        }
      } else {
        console.warn(`Marketing agents not found at ${marketingAgentsRoot}`);
      }
    }
  }

  // Deploy Commands (if --deploy-commands or --commands-only)
  // For Codex, use dedicated prompts deployment script
  if ((deployCommands || commandsOnly) && provider === 'codex') {
    console.log('\nDeploying commands as Codex prompts...');
    const { execSync } = await import('child_process');
    const promptsScript = path.join(scriptDir, '..', 'commands', 'deploy-prompts-codex.mjs');

    // Determine mode for prompts deployment
    let promptsMode = 'all';
    if (mode === 'sdlc' || mode === 'both') promptsMode = 'sdlc';
    else if (mode === 'marketing') promptsMode = 'marketing';
    else if (mode === 'general' || mode === 'writing') promptsMode = 'general';

    const promptsArgs = [
      '--source', srcRoot,
      '--mode', promptsMode
    ];
    if (dryRun) promptsArgs.push('--dry-run');
    if (force) promptsArgs.push('--force');

    try {
      execSync(`node "${promptsScript}" ${promptsArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: srcRoot
      });
    } catch (err) {
      console.error('Failed to deploy prompts to Codex:', err.message);
    }
  } else if (deployCommands || commandsOnly) {
    // Deploy general commands if mode is 'general', 'both', or 'all'
    if (mode === 'general' || mode === 'both' || mode === 'all') {
      const generalCommandsRoot = path.join(srcRoot, 'commands');
      if (fs.existsSync(generalCommandsRoot)) {
        const commandFiles = listMdFilesRecursive(generalCommandsRoot);
        if (commandFiles.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'commands')
            : provider === 'openai'
            ? path.join(target, '.codex', 'commands')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'command')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')  // Copilot commands become agents
            : path.join(target, '.claude', 'commands');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${commandFiles.length} general-purpose commands to ${destDir} (provider=${provider})`);
          deployFiles(commandFiles, destDir, deployOpts);
        }
      }
    }

    // Deploy SDLC commands if mode is 'sdlc', 'both', or 'all'
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcCommandsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      if (fs.existsSync(sdlcCommandsRoot)) {
        const commandFiles = listMdFilesRecursive(sdlcCommandsRoot);
        if (commandFiles.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'commands')
            : provider === 'openai'
            ? path.join(target, '.codex', 'commands')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'command')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')  // Copilot commands become agents
            : path.join(target, '.claude', 'commands');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${commandFiles.length} SDLC framework commands to ${destDir} (provider=${provider})`);
          deployFiles(commandFiles, destDir, deployOpts);
        }
      } else {
        console.warn(`SDLC commands not found at ${sdlcCommandsRoot}`);
      }
    }

    // Deploy Marketing commands if mode is 'marketing' or 'all'
    if (mode === 'marketing' || mode === 'all') {
      const marketingCommandsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
      if (fs.existsSync(marketingCommandsRoot)) {
        const commandFiles = listMdFilesRecursive(marketingCommandsRoot);
        if (commandFiles.length > 0) {
          const destDir = provider === 'factory'
            ? path.join(target, '.factory', 'commands')
            : provider === 'openai'
            ? path.join(target, '.codex', 'commands')
            : provider === 'opencode'
            ? path.join(target, '.opencode', 'command')
            : provider === 'copilot'
            ? path.join(target, '.github', 'agents')  // Copilot commands become agents
            : path.join(target, '.claude', 'commands');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${commandFiles.length} Marketing framework commands to ${destDir} (provider=${provider})`);
          deployFiles(commandFiles, destDir, deployOpts);
        }
      } else {
        console.warn(`Marketing commands not found at ${marketingCommandsRoot}`);
      }
    }
  }

  // Deploy Skills (if --deploy-skills or --skills-only)
  // Note: Skills are only supported for Claude Code currently
  if ((deploySkills || skillsOnly) && provider === 'claude') {
    // Deploy writing addon skills if mode is 'general', 'writing', 'both', or 'all'
    if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
      const writingSkillsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'skills');
      if (fs.existsSync(writingSkillsRoot)) {
        const skillDirs = listSkillDirs(writingSkillsRoot);
        if (skillDirs.length > 0) {
          const destDir = path.join(target, '.claude', 'skills');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${skillDirs.length} writing-quality skills to ${destDir}`);
          for (const skillDir of skillDirs) {
            deploySkillDir(skillDir, destDir, deployOpts);
          }
        }
      }
    }

    // Deploy aiwg-utils skills (always deployed with any framework)
    const utilsSkillsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'aiwg-utils', 'skills');
    if (fs.existsSync(utilsSkillsRoot)) {
      const skillDirs = listSkillDirs(utilsSkillsRoot);
      if (skillDirs.length > 0) {
        const destDir = path.join(target, '.claude', 'skills');
        if (!dryRun) ensureDir(destDir);
        console.log(`\nDeploying ${skillDirs.length} aiwg-utils skills to ${destDir}`);
        for (const skillDir of skillDirs) {
          deploySkillDir(skillDir, destDir, deployOpts);
        }
      }
    }

    // Deploy voice-framework skills if mode is 'general', 'writing', 'both', or 'all'
    if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
      const voiceSkillsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'voice-framework', 'skills');
      if (fs.existsSync(voiceSkillsRoot)) {
        const skillDirs = listSkillDirs(voiceSkillsRoot);
        if (skillDirs.length > 0) {
          const destDir = path.join(target, '.claude', 'skills');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${skillDirs.length} voice-framework skills to ${destDir}`);
          for (const skillDir of skillDirs) {
            deploySkillDir(skillDir, destDir, deployOpts);
          }
        }
      }
    }

    // Deploy SDLC framework skills if mode is 'sdlc', 'both', or 'all'
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcSkillsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'skills');
      if (fs.existsSync(sdlcSkillsRoot)) {
        const skillDirs = listSkillDirs(sdlcSkillsRoot);
        if (skillDirs.length > 0) {
          const destDir = path.join(target, '.claude', 'skills');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${skillDirs.length} SDLC framework skills to ${destDir}`);
          for (const skillDir of skillDirs) {
            deploySkillDir(skillDir, destDir, deployOpts);
          }
        }
      }
    }

    // Deploy Marketing framework skills if mode is 'marketing', 'both', or 'all'
    if (mode === 'marketing' || mode === 'both' || mode === 'all') {
      const mmkSkillsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'skills');
      if (fs.existsSync(mmkSkillsRoot)) {
        const skillDirs = listSkillDirs(mmkSkillsRoot);
        if (skillDirs.length > 0) {
          const destDir = path.join(target, '.claude', 'skills');
          if (!dryRun) ensureDir(destDir);
          console.log(`\nDeploying ${skillDirs.length} MMK framework skills to ${destDir}`);
          for (const skillDir of skillDirs) {
            deploySkillDir(skillDir, destDir, deployOpts);
          }
        }
      }
    }
  } else if ((deploySkills || skillsOnly) && provider === 'factory') {
    // Deploy skills to Factory using the dedicated deploy-skills.mjs
    console.log('\nDeploying skills to Factory...');
    const { execSync } = await import('child_process');
    const skillsScript = path.join(scriptDir, 'deploy-skills.mjs');

    // Determine mode for skills deployment
    let skillsMode = 'all';
    if (mode === 'sdlc' || mode === 'both') skillsMode = 'sdlc';
    else if (mode === 'marketing') skillsMode = 'mmk';
    else if (mode === 'general' || mode === 'writing') skillsMode = 'addons';

    const skillsArgs = [
      '--target', target,
      '--provider', 'factory',
      '--mode', skillsMode
    ];
    if (dryRun) skillsArgs.push('--dry-run');
    if (force) skillsArgs.push('--force');

    try {
      execSync(`node "${skillsScript}" ${skillsArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: srcRoot
      });
    } catch (err) {
      console.error('Failed to deploy skills to Factory:', err.message);
    }
  } else if ((deploySkills || skillsOnly) && (provider === 'openai' || provider === 'codex')) {
    // Deploy skills to Codex using the dedicated deploy-skills-codex.mjs
    console.log('\nDeploying skills to Codex (~/.codex/skills/)...');
    const { execSync } = await import('child_process');
    const skillsScript = path.join(scriptDir, '..', 'skills', 'deploy-skills-codex.mjs');

    // Determine mode for skills deployment
    let skillsMode = 'all';
    if (mode === 'sdlc' || mode === 'both') skillsMode = 'sdlc';
    else if (mode === 'marketing') skillsMode = 'mmk';
    else if (mode === 'general' || mode === 'writing') skillsMode = 'addons';

    const skillsArgs = [
      '--source', srcRoot,
      '--mode', skillsMode
    ];
    if (dryRun) skillsArgs.push('--dry-run');
    if (force) skillsArgs.push('--force');

    try {
      execSync(`node "${skillsScript}" ${skillsArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: srcRoot
      });
    } catch (err) {
      console.error('Failed to deploy skills to Codex:', err.message);
    }
  }

  // Create/update AGENTS.md for Factory provider
  if (provider === 'factory' && createAgentsMd) {
    console.log('\nCreating/updating AGENTS.md template for Factory...');
    createFactoryAgentsMd(target, srcRoot, dryRun);
  }

  // Create/update AGENTS.md for Codex provider
  if ((provider === 'codex' || provider === 'openai') && createAgentsMd) {
    console.log('\nCreating/updating AGENTS.md template for Codex...');
    createCodexAgentsMd(target, srcRoot, dryRun);
  }

  // Create/update AGENTS.md for Cursor provider
  if (provider === 'cursor' && createAgentsMd) {
    console.log('\nCreating/updating AGENTS.md template for Cursor...');
    createCursorAgentsMd(target, srcRoot, dryRun);
  }

  // Create/update AGENTS.md for OpenCode provider
  if (provider === 'opencode' && createAgentsMd) {
    console.log('\nCreating/updating AGENTS.md template for OpenCode...');
    createOpencodeAgentsMd(target, srcRoot, dryRun);
  }

  // Create/update copilot-instructions.md for Copilot provider
  if (provider === 'copilot' && createAgentsMd) {
    console.log('\nCreating/updating copilot-instructions.md for GitHub Copilot...');
    createCopilotAgentsMd(target, srcRoot, dryRun);
  }

  // Deploy rules for Cursor provider (instead of agents)
  if (provider === 'cursor' && (deployCommands || commandsOnly)) {
    console.log('\nDeploying commands as Cursor rules...');
    const { execSync } = await import('child_process');
    const rulesScript = path.join(scriptDir, '..', 'rules', 'deploy-rules-cursor.mjs');

    // Determine mode for rules deployment
    let rulesMode = 'all';
    if (mode === 'sdlc' || mode === 'both') rulesMode = 'sdlc';
    else if (mode === 'marketing') rulesMode = 'marketing';
    else if (mode === 'general' || mode === 'writing') rulesMode = 'general';

    const rulesArgs = [
      '--source', srcRoot,
      '--target', path.join(target, '.cursor', 'rules'),
      '--mode', rulesMode
    ];
    if (dryRun) rulesArgs.push('--dry-run');
    if (force) rulesArgs.push('--force');

    try {
      execSync(`node "${rulesScript}" ${rulesArgs.join(' ')}`, {
        stdio: 'inherit',
        cwd: srcRoot
      });
    } catch (err) {
      console.error('Failed to deploy rules to Cursor:', err.message);
    }
  }

  // Enable Custom Droids in Factory settings (if deploying to Factory)
  if (provider === 'factory' && !commandsOnly) {
    console.log('\nConfiguring Factory settings...');
    enableFactoryCustomDroids(dryRun);
  }

  // ============================================================================
  // WINDSURF PROVIDER DEPLOYMENT
  // ============================================================================
  if (provider === 'windsurf') {
    displayWindsurfWarning();

    // Collect all agent files based on mode
    const allAgentFiles = [];

    // Writing agents
    if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
      const writingAddonAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'agents');
      const legacyAgentsRoot = path.join(srcRoot, 'agents');
      const agentsRoot = fs.existsSync(writingAddonAgentsRoot) ? writingAddonAgentsRoot : legacyAgentsRoot;
      if (fs.existsSync(agentsRoot)) {
        allAgentFiles.push(...listMdFiles(agentsRoot));
      }
    }

    // SDLC agents
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
      if (fs.existsSync(sdlcAgentsRoot)) {
        allAgentFiles.push(...listMdFiles(sdlcAgentsRoot));
      }
    }

    // Marketing agents
    if (mode === 'marketing' || mode === 'all') {
      const marketingAgentsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
      if (fs.existsSync(marketingAgentsRoot)) {
        allAgentFiles.push(...listMdFiles(marketingAgentsRoot));
      }
    }

    // Generate aggregated AGENTS.md (Windsurf reads this natively)
    if (allAgentFiles.length > 0 && !commandsOnly && !skillsOnly) {
      const agentsMdPath = path.join(target, 'AGENTS.md');
      console.log(`\nGenerating AGENTS.md with ${allAgentFiles.length} agents for Windsurf...`);
      generateWindsurfAgentsMd(allAgentFiles, agentsMdPath, deployOpts);
    }

    // Generate .windsurfrules with orchestration context
    if (!commandsOnly && !skillsOnly) {
      console.log('\nGenerating .windsurfrules orchestration file...');
      generateWindsurfRules(srcRoot, target, deployOpts);
    }

    // Deploy commands as Windsurf workflows
    if (deployCommands || commandsOnly) {
      const workflowsDir = path.join(target, '.windsurf', 'workflows');
      if (!dryRun) ensureDir(workflowsDir);

      // Collect command files based on mode
      const commandFiles = [];

      if (mode === 'general' || mode === 'both' || mode === 'all') {
        const generalCommandsRoot = path.join(srcRoot, 'commands');
        if (fs.existsSync(generalCommandsRoot)) {
          commandFiles.push(...listMdFilesRecursive(generalCommandsRoot));
        }
      }

      if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
        const sdlcCommandsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
        if (fs.existsSync(sdlcCommandsRoot)) {
          commandFiles.push(...listMdFilesRecursive(sdlcCommandsRoot));
        }
      }

      if (mode === 'marketing' || mode === 'all') {
        const marketingCommandsRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
        if (fs.existsSync(marketingCommandsRoot)) {
          commandFiles.push(...listMdFilesRecursive(marketingCommandsRoot));
        }
      }

      if (commandFiles.length > 0) {
        console.log(`\nDeploying ${commandFiles.length} commands as Windsurf workflows to ${workflowsDir}...`);

        for (const cmdFile of commandFiles) {
          const content = fs.readFileSync(cmdFile, 'utf8');
          const workflowContent = transformToWindsurfWorkflow(content);

          // Check character limit (12000) - warn if exceeded
          if (workflowContent.length > 12000) {
            console.warn(`Warning: Workflow ${path.basename(cmdFile)} exceeds 12000 char limit (${workflowContent.length} chars)`);
          }

          const destFile = path.join(workflowsDir, path.basename(cmdFile));

          if (dryRun) {
            console.log(`[dry-run] deploy workflow: ${path.basename(cmdFile)}`);
          } else {
            fs.writeFileSync(destFile, workflowContent, 'utf8');
            console.log(`deployed workflow: ${path.basename(cmdFile)}`);
          }
        }
      }
    }

    // Note about skills
    if (deploySkills || skillsOnly) {
      console.log('\nNote: Skills are not directly supported for Windsurf. Reference skill files in prompts using @-mentions.');
    }

    console.log('\n' + '='.repeat(70));
    console.log('Windsurf deployment complete. Generated files:');
    console.log('  - AGENTS.md (agent catalog)');
    console.log('  - .windsurfrules (orchestration context)');
    if (deployCommands || commandsOnly) {
      console.log('  - .windsurf/workflows/ (commands as workflows)');
    }
    console.log('='.repeat(70) + '\n');
  }
})();
