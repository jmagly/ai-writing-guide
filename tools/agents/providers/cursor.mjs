/**
 * Cursor IDE Provider
 *
 * Deploys agents, commands, skills, and rules for Cursor IDE.
 * Rules use native .cursor/rules/ support with MDC format.
 * Other artifacts use conventional .cursor/ subdirectories.
 *
 * Deployment paths:
 *   - Agents: .cursor/agents/
 *   - Commands: .cursor/commands/
 *   - Skills: .cursor/skills/
 *   - Rules: .cursor/rules/
 *
 * Special features:
 *   - MDC format (.mdc extension) for rules
 *   - Glob pattern attachment for rules
 *   - $ARGUMENTS -> [arguments] conversion for rules
 *   - Delegates rules deployment to deploy-rules-cursor.mjs
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  listSkillDirs,
  deployFiles,
  deploySkillDir,
  filterAgentFiles,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'cursor';
export const aliases = [];

export const paths = {
  agents: '.cursor/agents/',
  commands: '.cursor/commands/',
  skills: '.cursor/skills/',
  rules: '.cursor/rules/'
};

export const support = {
  agents: 'conventional',
  commands: 'conventional',
  skills: 'conventional',
  rules: 'native'
};

export const capabilities = {
  agents: true,
  commands: true,
  skills: true,
  rules: true,  // Rules-focused provider with native support
  aggregatedOutput: false,
  yamlFormat: false
};

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform agent content for Cursor
 * Cursor uses conventional deployment - minimal transformation needed
 */
export function transformAgent(srcPath, content, opts) {
  return content;
}

/**
 * Transform command content for Cursor
 * Cursor uses conventional deployment - minimal transformation needed
 */
export function transformCommand(srcPath, content, opts) {
  return content;
}

// ============================================================================
// Model Mapping (not applicable for Cursor)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .cursor/agents/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands to .cursor/commands/
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

/**
 * Deploy skills to .cursor/skills/
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
 * Deploy rules via external script (native MDC support)
 * Falls back to inline deployment if script not found
 */
export async function deployRulesViaScript(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'rules', 'deploy-rules-cursor.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Cursor rules deployment script not found at ${scriptPath}`);
    return false;
  }

  console.log('Delegating rules deployment to deploy-rules-cursor.mjs...');

  return new Promise((resolve, reject) => {
    const args = ['--target', targetDir, '--source', srcRoot];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.mode) args.push('--mode', opts.mode);

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: srcRoot
    });

    child.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`deploy-rules-cursor.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

/**
 * Deploy rules to .cursor/rules/ (inline deployment)
 * Used as fallback when external script is not available
 */
export function deployRulesInline(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(ruleFiles, destDir, opts, transformCommand);
}

/**
 * Deploy rules - tries external script first, falls back to inline
 */
export async function deployRules(ruleFilesOrTarget, targetDirOrSrcRoot, optsOrUndefined) {
  // Handle both call signatures:
  // 1. deployRules(targetDir, srcRoot, opts) - from old code
  // 2. deployRules(ruleFiles, targetDir, opts) - from new code

  // Check if first arg is array (new signature) or string (old signature)
  if (Array.isArray(ruleFilesOrTarget)) {
    // New signature: deployRules(ruleFiles, targetDir, opts)
    return deployRulesInline(ruleFilesOrTarget, targetDirOrSrcRoot, optsOrUndefined);
  } else {
    // Old signature: deployRules(targetDir, srcRoot, opts)
    // Try external script first
    try {
      const success = await deployRulesViaScript(ruleFilesOrTarget, targetDirOrSrcRoot, optsOrUndefined);
      if (success) return;
    } catch (err) {
      console.warn('External rules script failed, using inline deployment');
    }

    // Fallback to inline - need to collect rule files
    console.log('Using inline rules deployment...');
    const ruleFiles = [];
    const srcRoot = targetDirOrSrcRoot;
    const opts = optsOrUndefined;

    // Collect rule files based on mode (simplified - full logic in deploy())
    const sdlcRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules');
    if (fs.existsSync(sdlcRulesDir)) {
      ruleFiles.push(...listMdFiles(sdlcRulesDir));
    }

    deployRulesInline(ruleFiles, ruleFilesOrTarget, opts);
  }
}

// ============================================================================
// AGENTS.md
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'cursor/AGENTS.md.aiwg-template', dryRun);
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);

  if (opts.createAgentsMd) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  // Rules use .mdc for native Cursor support, everything else uses .md
  if (type === 'rule' || type === 'rules') {
    return '.mdc';
  }
  return '.md';
}

// ============================================================================
// Main Deploy Function
// ============================================================================

/**
 * Main deployment function for Cursor provider
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
    dryRun,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== Cursor IDE Provider ===`);
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
      const sdlcRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules');
      if (fs.existsSync(sdlcRulesDir)) {
        ruleFiles.push(...listMdFiles(sdlcRulesDir));
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
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
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
    // Try external script first for rules (native MDC support)
    try {
      await deployRulesViaScript(target, srcRoot, opts);
    } catch (err) {
      console.warn('External rules script failed, using inline deployment');
      deployRulesInline(ruleFiles, target, opts);
    }
  }

  // Post-deployment
  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

  console.log('\n=== Cursor deployment complete ===\n');
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
