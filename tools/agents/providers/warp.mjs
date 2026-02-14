/**
 * Warp Terminal Provider
 *
 * Supports both aggregated (WARP.md) and discrete file deployment.
 * Aggregates agents and commands into WARP.md via external script,
 * while also deploying discrete files for all 4 artifact types.
 *
 * Deployment paths:
 *   - Agents: .warp/agents/ (discrete) + WARP.md (aggregated)
 *   - Commands: .warp/commands/ (discrete) + WARP.md (aggregated)
 *   - Skills: .warp/skills/ (discrete)
 *   - Rules: .warp/rules/ (discrete)
 *
 * Special features:
 *   - Dual deployment: discrete files + aggregated WARP.md
 *   - Section preservation (user vs AIWG managed sections in WARP.md)
 *   - Backup creation with timestamp
 *   - CLAUDE.md symlink support
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
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

export const name = 'warp';
export const aliases = [];

export const paths = {
  agents: '.warp/agents/',
  commands: '.warp/commands/',
  skills: '.warp/skills/',
  rules: '.warp/rules/'
};

export const support = {
  agents: 'aggregated',      // Primarily WARP.md, also discrete files
  commands: 'aggregated',    // Primarily WARP.md, also discrete files
  skills: 'conventional',    // Discrete files only
  rules: 'conventional'      // Discrete files only
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: true,  // All content in single WARP.md file
  yamlFormat: false
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
 * Map model shorthand to Warp format
 */
export function mapModel(shorthand, modelCfg, modelsConfig) {
  // If overrides specified, use them
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (shorthand || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || 'opus';
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || 'haiku';
    return modelCfg.codingModel || 'sonnet';
  }

  return shorthand || 'sonnet';
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform agent content for Warp
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
 * Transform command content for Warp
 */
export function transformCommand(srcPath, content, opts) {
  return transformAgent(srcPath, content, opts);
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .warp/agents/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands to .warp/commands/
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

/**
 * Deploy skills to .warp/skills/
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const destDir = path.join(targetDir, paths.skills);
  ensureDir(destDir, opts.dryRun);

  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, destDir, opts);
  }
}

/**
 * Deploy rules to .warp/rules/
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
}

/**
 * Deploy via external setup-warp.mjs script
 * This generates the aggregated WARP.md file
 */
export async function deployWarp(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'warp', 'setup-warp.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Warp setup script not found at ${scriptPath}`);
    return;
  }

  console.log('\nGenerating aggregated WARP.md...');

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
      if (code === 0) resolve();
      else reject(new Error(`setup-warp.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

// ============================================================================
// AGENTS.md (not used for Warp - content goes in WARP.md)
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  console.log('Warp uses WARP.md instead of AGENTS.md');
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);
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
 * Main deployment function for Warp provider
 * Deploys discrete files for all artifact types, then generates aggregated WARP.md
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

  console.log(`\n=== Warp Terminal Provider ===`);
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

  // Deploy discrete files for all artifact types
  console.log('\n--- Deploying discrete files ---');

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
    deployRules(ruleFiles, target, opts);
  }

  // Generate aggregated WARP.md (existing behavior)
  console.log('\n--- Generating aggregated output ---');
  await deployWarp(target, srcRoot, opts);

  // Post-deployment
  await postDeploy(target, opts);

  console.log('\n=== Warp deployment complete ===\n');
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
  deployWarp,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
