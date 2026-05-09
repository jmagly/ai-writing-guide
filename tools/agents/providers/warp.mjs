/**
 * Warp Terminal Provider
 *
 * Supports both aggregated (WARP.md) and discrete file deployment.
 * Aggregates agents and commands into WARP.md via external script,
 * while also deploying discrete files for all 4 artifact types.
 *
 * Deployment paths:
 *   - Agents: WARP.md (aggregated only — Warp does not discover .warp/agents/)
 *   - Commands: WARP.md (aggregated only — Warp does not discover .warp/commands/)
 *   - Skills: .warp/skills/ (discrete — natively discovered by Warp)
 *   - Skills: .agents/skills/ (cross-agent compatibility path)
 *   - Rules: WARP.md (aggregated only — Warp does not discover .warp/rules/)
 *
 * Special features:
 *   - Aggregated WARP.md for agents, commands, and rules
 *   - Discrete .warp/skills/ for natively discovered skills
 *   - Section preservation (user vs AIWG managed sections in WARP.md)
 *   - Backup creation with timestamp
 *   - CLAUDE.md symlink support
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import { spawn } from 'child_process';
import {
  ensureDir,
  listMdFiles,
  listSkillDirs,
  deploySkillDir,
  deploySkillsWithKernelRouting,
  isKernelSkill,
  pruneStaleAiwgSkills,
  computeAllKernelNames,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  normalizeDeploymentMode,
  collectFrameworkArtifacts
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'warp';
export const aliases = [];

export const paths = {
  // Skills sequestered under .warp/.aiwg/skills/ — index-driven discovery (#1212).
  skills: '.warp/.aiwg/skills/',
  crossAgentSkills: '.agents/skills/',  // Cross-agent compatibility path (#771)
  // agents, commands, rules: delivered via aggregated WARP.md only
  // Warp does not discover .warp/agents/, .warp/commands/, or .warp/rules/
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
export const kernelSkillsPath = '.warp/skills/';

export const support = {
  agents: 'aggregated',      // WARP.md only — no discrete .warp/agents/
  commands: 'aggregated',    // WARP.md only — no discrete .warp/commands/
  skills: 'native',          // .warp/skills/ — natively discovered by Warp
  rules: 'aggregated'        // WARP.md only — no discrete .warp/rules/
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

// Warp does not discover .warp/agents/, .warp/commands/, or .warp/rules/.
// Agents, commands, and rules are delivered exclusively via aggregated WARP.md.
// Only skills (.warp/skills/) are natively discovered.

/**
 * Deploy skills to .warp/skills/ (primary) and .agents/skills/ (cross-agent compatibility).
 * The .agents/skills/ path is an interop convention for projects using multiple AI coding tools.
 */
export function deploySkills(skillDirs, targetDir, opts) {
  // Primary: kernel-vs-standard routing (#1212/#1216)
  //   - kernel skills → .warp/skills/         (platform-native, always-loaded)
  //   - standard      → .warp/.aiwg/skills/   (index-discoverable)
  const standardDestDir = path.join(targetDir, paths.skills);
  const kernelDestDir = path.join(targetDir, kernelSkillsPath);
  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);

  // Cross-agent compatibility: .agents/skills/
  const crossAgentDir = path.join(targetDir, paths.crossAgentSkills);
  ensureDir(crossAgentDir, opts.dryRun);
  if (!opts.dryRun) {
    console.log(`Deploying cross-agent skills to ${path.relative(process.cwd(), crossAgentDir)}...`);
  } else {
    console.log(`[dry-run] Would deploy cross-agent skills to .agents/skills/`);
  }
  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, crossAgentDir, opts);
  }
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
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);
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
    
    // Holistic post-deploy cleanup of stale AIWG-managed kernel
    // skills (renamed/removed sources). Uses the global kernel set
    // (computeAllKernelNames walks all source frameworks/addons),
    // not just this-call's skillDirs, because aiwg use invokes
    // deploy-agents.mjs multiple times.
    {
      const _kernelDestDir = path.isAbsolute(kernelSkillsPath)
        ? kernelSkillsPath
        : path.join(target, kernelSkillsPath);
      pruneStaleAiwgSkills(_kernelDestDir, computeAllKernelNames(srcRoot), opts);
    }
  }
    }

    if (shouldDeployRules || rulesOnly) {
      const addonRulesDir = path.join(srcRoot, 'rules');
      if (fs.existsSync(addonRulesDir)) {
        ruleFiles.push(...listMdFiles(addonRulesDir));
      }
    }
  }

  const normalizedMode = normalizeDeploymentMode(mode);

  // All addons (dynamically discovered)
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
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

  const frameworkArtifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: shouldDeployCommands || commandsOnly,
    includeSkills: shouldDeploySkills || skillsOnly,
    includeRules: shouldDeployRules || rulesOnly,
    recursiveCommands: true,
    consolidatedSdlcRules: true
  });
  agentFiles.push(...frameworkArtifacts.agents);
  commandFiles.push(...frameworkArtifacts.commands);
  skillDirs.push(...frameworkArtifacts.skills);
  ruleFiles.push(...frameworkArtifacts.rules);

  // Warp only discovers .warp/skills/ natively.
  // Agents, commands, and rules are delivered via aggregated WARP.md only.
  console.log('\n--- Deploying discrete files (skills only) ---');

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying ${skillDirs.length} skills to .warp/skills/...`);
    deploySkills(skillDirs, target, opts);
  }

  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nSkipping discrete agent deployment (Warp uses WARP.md)`);
  }
  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nSkipping discrete command deployment (Warp uses WARP.md)`);
  }
  if (shouldDeployRules || rulesOnly) {
    console.log(`\nSkipping discrete rule deployment (Warp uses WARP.md)`);
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
  kernelSkillsPath,
  support,
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  deploySkills,
  deployWarp,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
