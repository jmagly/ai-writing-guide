/**
 * Claude Code Provider
 *
 * The default/primary provider for AIWG. Claude Code is the most feature-rich
 * provider with full support for agents, commands, skills, and rules.
 *
 * Deployment paths:
 *   - Agents: .claude/agents/
 *   - Commands: .claude/commands/
 *   - Skills: .claude/skills/
 *   - Rules: .claude/rules/
 */

import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  listSkillDirs,
  writeFile,
  deployFiles,
  deploySkillDir,
  parseFrontmatter,
  initializeFrameworkWorkspace,
  filterAgentFiles,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  getRulesIndexPath,
  cleanupOldRuleFiles
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'claude';
export const aliases = [];

export const paths = {
  agents: '.claude/agents/',
  commands: '.claude/commands/',
  skills: '.claude/skills/',
  rules: '.claude/rules/'
};

export const support = {
  agents: 'native',
  commands: 'native',
  skills: 'native',
  rules: 'native'
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: false,
  yamlFormat: false,
  mdcFormat: false,
  homeDirectoryDeploy: false,
  projectLocalMirror: false
};

// ============================================================================
// Model Handling
// ============================================================================

/**
 * Replace model in frontmatter based on role classification
 * opus -> reasoning, sonnet -> coding, haiku -> efficiency
 */
export function replaceModelFrontmatter(content, models) {
  const fmStart = content.indexOf('---');
  if (fmStart !== 0) return content;
  const fmEnd = content.indexOf('\n---', 3);
  if (fmEnd === -1) return content;

  const header = content.slice(0, fmEnd + 4);
  const body = content.slice(fmEnd + 4);

  const modelMatch = header.match(/^model:\s*([^\n]+)$/m);
  let newModel = null;

  if (modelMatch) {
    const orig = modelMatch[1].trim();
    const clean = orig.replace(/['"]/g, '');
    let role = 'coding';
    if (/^opus$/i.test(clean)) role = 'reasoning';
    else if (/^haiku$/i.test(clean)) role = 'efficiency';

    if (role === 'reasoning') newModel = models.reasoning;
    else if (role === 'efficiency') newModel = models.efficiency;
    else newModel = models.coding;
  }

  if (!newModel) return content;
  const updatedHeader = header.replace(/^model:\s*[^\n]+$/m, `model: ${newModel}`);
  return updatedHeader + body;
}

/**
 * Map model shorthand to Claude format
 * For Claude, we keep opus/sonnet/haiku unless overridden
 */
export function mapModel(shorthand, modelCfg, modelsConfig) {
  // If overrides specified, use them
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (shorthand || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || 'opus';
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || 'haiku';
    return modelCfg.codingModel || 'sonnet';
  }

  // No transformation needed for Claude - keep shorthand
  return shorthand || 'sonnet';
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform agent content for Claude
 * Claude is the native format - minimal transformation needed
 */
export function transformAgent(srcPath, content, opts) {
  const { reasoningModel, codingModel, efficiencyModel } = opts;

  // Only transform if model overrides specified
  if (reasoningModel || codingModel || efficiencyModel) {
    const models = {
      reasoning: reasoningModel || 'opus',
      coding: codingModel || 'sonnet',
      efficiency: efficiencyModel || 'haiku'
    };
    return replaceModelFrontmatter(content, models);
  }

  return content;
}

/**
 * Transform command content for Claude
 * Commands use same format as agents - minimal transformation
 */
export function transformCommand(srcPath, content, opts) {
  return transformAgent(srcPath, content, opts);
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .claude/agents/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands to .claude/commands/
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

/**
 * Deploy skills to .claude/skills/
 * Skills are directories containing SKILL.md and supporting files
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const destDir = path.join(targetDir, paths.skills);
  ensureDir(destDir, opts.dryRun);

  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, destDir, opts);
  }
}

/**
 * Deploy rules to .claude/rules/
 * Deploys consolidated RULES-INDEX.md instead of individual rule files.
 * Cleans up old individual rule files from previous deployments.
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformCommand);
}

// ============================================================================
// AGENTS.md (Not typically used for Claude, but supported)
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  // Claude Code doesn't typically use AGENTS.md since it has native agent support
  // But we can create one for documentation purposes if needed
  console.log('Claude Code uses native .claude/agents/ - AGENTS.md not required');
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  // Initialize framework workspace structure
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);

  // Claude-specific post-deployment (settings.json, etc.)
  const claudeDir = path.join(targetDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');

  // If settings.json doesn't exist, create a minimal one
  if (!fs.existsSync(settingsPath) && !opts.dryRun) {
    ensureDir(claudeDir);
    const settings = {
      version: '1.0',
      created: new Date().toISOString(),
      aiwg: {
        enabled: true,
        mode: opts.mode || 'all'
      }
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    console.log('Created .claude/settings.json');
  }
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.md';
}

// ============================================================================
// Main Deploy Function
// ============================================================================

/**
 * Main deployment function for Claude provider
 * Orchestrates deployment of agents, commands, skills, and rules
 */
export async function deploy(opts) {
  const {
    srcRoot,
    target,
    mode,
    deployCommands: shouldDeployCommands,
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
    dryRun
  } = opts;

  console.log(`\n=== Claude Code Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect source files based on mode
  const agentFiles = [];
  const commandFiles = [];
  const skillDirs = [];
  const ruleFiles = [];

  // Check for addon-style directory structure (direct agents/, commands/, skills/ subdirs)
  // This handles deployment when --source points to an addon directory
  const isAddonSource = fs.existsSync(path.join(srcRoot, 'agents')) ||
                        fs.existsSync(path.join(srcRoot, 'commands')) ||
                        fs.existsSync(path.join(srcRoot, 'skills'));

  if (isAddonSource) {
    // Deploy from addon-style directory structure
    const addonAgentsDir = path.join(srcRoot, 'agents');
    if (fs.existsSync(addonAgentsDir)) {
      agentFiles.push(...listMdFiles(addonAgentsDir));
    }

    if (shouldDeployCommands || commandsOnly) {
      const addonCommandsDir = path.join(srcRoot, 'commands');
      if (fs.existsSync(addonCommandsDir)) {
        commandFiles.push(...listMdFiles(addonCommandsDir));
      }
    }

    if (shouldDeploySkills || skillsOnly) {
      const addonSkillsDir = path.join(srcRoot, 'skills');
      if (fs.existsSync(addonSkillsDir)) {
        skillDirs.push(...listSkillDirs(addonSkillsDir));
      }
    }

    if (shouldDeployRules || rulesOnly) {
      const addonRulesDir = path.join(srcRoot, 'rules');
      if (fs.existsSync(addonRulesDir)) {
        ruleFiles.push(...listMdFiles(addonRulesDir));
      }
    }
  }

  // All addons (dynamically discovered)
  if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));

    if (shouldDeployCommands || commandsOnly) {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    if (shouldDeploySkills || skillsOnly) {
      skillDirs.push(...getAddonSkillDirs(srcRoot));
    }

    if (shouldDeployRules || rulesOnly) {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }
  }

  // SDLC framework
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    agentFiles.push(...listMdFiles(sdlcAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      commandFiles.push(...listMdFilesRecursive(sdlcCommandsDir));
    }

    if (shouldDeploySkills || skillsOnly) {
      const sdlcSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'skills');
      skillDirs.push(...listSkillDirs(sdlcSkillsDir));
    }

    if (shouldDeployRules || rulesOnly) {
      // Use consolidated RULES-INDEX.md instead of individual files
      const indexPath = getRulesIndexPath(srcRoot);
      if (indexPath) {
        ruleFiles.push(indexPath);
      } else {
        // Fallback: deploy individual files if index not found
        const sdlcRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules');
        if (fs.existsSync(sdlcRulesDir)) {
          ruleFiles.push(...listMdFiles(sdlcRulesDir));
        }
      }
    }
  }

  // Marketing framework
  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    agentFiles.push(...listMdFiles(marketingAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const marketingCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
      commandFiles.push(...listMdFilesRecursive(marketingCommandsDir));
    }

    if (shouldDeploySkills || skillsOnly) {
      const marketingSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'skills');
      skillDirs.push(...listSkillDirs(marketingSkillsDir));
    }

    if (shouldDeployRules || rulesOnly) {
      const marketingRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'rules');
      if (fs.existsSync(marketingRulesDir)) {
        ruleFiles.push(...listMdFiles(marketingRulesDir));
      }
    }
  }

  // Deploy based on flags
  if (!commandsOnly && !skillsOnly) {
    // Apply filters if specified
    const filteredAgents = filterAgentFiles(agentFiles, opts);
    if (opts.filter || opts.filterRole) {
      console.log(`\nFiltered from ${agentFiles.length} to ${filteredAgents.length} agents`);
    }
    console.log(`\nDeploying ${filteredAgents.length} agents...`);
    deployAgents(filteredAgents, target, opts);
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${commandFiles.length} commands...`);
    deployCommands(commandFiles, target, opts);
  }

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying ${skillDirs.length} skills...`);
    deploySkills(skillDirs, target, opts);
  }

  if (shouldDeployRules || rulesOnly) {
    console.log(`\nDeploying ${ruleFiles.length} rules...`);
    deployRules(ruleFiles, target, opts);
  }

  // Post-deployment
  await postDeploy(target, opts);

  console.log('\n=== Claude deployment complete ===\n');
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  name,
  aliases,
  paths,
  support,
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
