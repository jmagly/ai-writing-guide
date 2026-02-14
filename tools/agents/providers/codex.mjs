/**
 * OpenAI Codex Provider
 *
 * Deploys agents and commands for OpenAI Codex CLI. Commands are transformed
 * to prompts format via external script.
 *
 * Deployment paths:
 *   - Agents: <project>/.codex/agents/ (project-local)
 *   - Commands: ~/.codex/prompts/ (home directory, NOT project)
 *   - Skills: ~/.codex/skills/ (home directory, NOT project)
 *   - Rules: <project>/.codex/rules/ (project-local, conventional)
 *
 * Special features:
 *   - Model replacement (opus/sonnet/haiku -> gpt-5.3-codex/codex-mini-latest/gpt-5-codex-mini)
 *   - --as-agents-md aggregation option
 *   - Delegates commands to deploy-prompts-codex.mjs (deploys to ~/.codex/prompts/)
 *   - Delegates skills to deploy-skills-codex.mjs (deploys to ~/.codex/skills/)
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  writeFile,
  deployFiles,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  listSkillDirs,
  deploySkillDir,
  getRulesIndexPath,
  cleanupOldRuleFiles
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'codex';
export const aliases = ['openai'];

export const paths = {
  agents: '.codex/agents/',
  commands: '.codex/commands/',  // Project-local mirror for conventional deployment
  skills: '.codex/skills/',      // Project-local mirror for conventional deployment
  rules: '.codex/rules/'
};

export const support = {
  agents: 'native',
  commands: 'native',
  skills: 'native',
  rules: 'conventional'
};

export const capabilities = {
  skills: true,  // But deployed to home dir
  rules: true,
  aggregatedOutput: true,  // --as-agents-md
  yamlFormat: false
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * Map model shorthand to OpenAI/GPT format
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  const gptModels = {
    'opus': 'gpt-5.3-codex',
    'sonnet': 'codex-mini-latest',
    'haiku': 'gpt-5-codex-mini'
  };

  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || gptModels.opus;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || gptModels.haiku;
    return modelCfg.codingModel || gptModels.sonnet;
  }

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  for (const [key, value] of Object.entries(gptModels)) {
    if (clean.includes(key)) return value;
  }

  return gptModels.sonnet; // default
}

/**
 * Replace model in frontmatter
 */
function replaceModelFrontmatter(content, models) {
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

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform agent content for Codex
 */
export function transformAgent(srcPath, content, opts) {
  const { reasoningModel, codingModel, efficiencyModel } = opts;

  const models = {
    reasoning: reasoningModel || 'gpt-5.3-codex',
    coding: codingModel || 'codex-mini-latest',
    efficiency: efficiencyModel || 'gpt-5-codex-mini'
  };

  return replaceModelFrontmatter(content, models);
}

/**
 * Transform command content for Codex
 */
export function transformCommand(srcPath, content, opts) {
  return transformAgent(srcPath, content, opts);
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .codex/agents/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands via external script
 *
 * NOTE: Codex prompts/commands go to ~/.codex/prompts/ (home directory)
 * not to the project directory. We do NOT pass --target to let the
 * script use its default home directory location.
 */
export async function deployCommands(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'commands', 'deploy-prompts-codex.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Codex prompts deployment script not found at ${scriptPath}`);
    return;
  }

  console.log('Delegating command deployment to deploy-prompts-codex.mjs (~/.codex/prompts/)...');

  return new Promise((resolve, reject) => {
    // NOTE: Do NOT pass --target - Codex prompts belong in ~/.codex/prompts/ (home)
    const args = ['--source', srcRoot];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.mode) args.push('--mode', opts.mode);

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: srcRoot
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`deploy-prompts-codex.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

/**
 * Deploy skills via external script
 */
export async function deploySkills(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'skills', 'deploy-skills-codex.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Codex skills deployment script not found at ${scriptPath}`);
    return;
  }

  console.log('Delegating skill deployment to deploy-skills-codex.mjs...');

  return new Promise((resolve, reject) => {
    const args = ['--source', srcRoot];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: srcRoot
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`deploy-skills-codex.mjs exited with code ${code}`));
    });

    child.on('error', reject);
  });
}

/**
 * Deploy rules to .codex/rules/
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
}

/**
 * Aggregate agents to single AGENTS.md file
 */
export function aggregateToAgentsMd(agentFiles, destPath, opts) {
  const blocks = [];
  for (const f of agentFiles) {
    let content = fs.readFileSync(f, 'utf8');
    content = transformAgent(f, content, opts);
    if (!content.endsWith('\n')) content += '\n';
    blocks.push(content);
  }
  const out = blocks.join('\n');
  if (opts.dryRun) console.log(`[dry-run] write ${destPath}`);
  else fs.writeFileSync(destPath, out, 'utf8');
  console.log(`wrote ${path.relative(process.cwd(), destPath)} with ${agentFiles.length} agents`);
}

// ============================================================================
// AGENTS.md
// ============================================================================

/**
 * Create/update AGENTS.md from Codex template
 */
export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'codex/AGENTS.md.aiwg-template', dryRun);
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
  return '.md';
}

// ============================================================================
// Main Deploy Function
// ============================================================================

/**
 * Main deployment function for Codex provider
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
    asAgentsMd,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== OpenAI Codex Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect source files based on mode
  const agentFiles = [];
  const ruleFiles = [];

  // Frameworks
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    agentFiles.push(...listMdFiles(sdlcAgentsDir));

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

  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    agentFiles.push(...listMdFiles(marketingAgentsDir));

    const marketingRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'rules');
    if (fs.existsSync(marketingRulesDir)) {
      ruleFiles.push(...listMdFiles(marketingRulesDir));
    }
  }

  // Media Curator framework
  if (mode === 'media-curator' || mode === 'all') {
    const curatorAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'agents');
    if (fs.existsSync(curatorAgentsDir)) {
      agentFiles.push(...listMdFiles(curatorAgentsDir));
    }

    const curatorRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'rules');
    if (fs.existsSync(curatorRulesDir)) {
      ruleFiles.push(...listMdFiles(curatorRulesDir));
    }
  }

  // Research framework
  if (mode === 'research' || mode === 'all') {
    const researchAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'agents');
    if (fs.existsSync(researchAgentsDir)) {
      agentFiles.push(...listMdFiles(researchAgentsDir));
    }

    const researchRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'rules');
    if (fs.existsSync(researchRulesDir)) {
      ruleFiles.push(...listMdFiles(researchRulesDir));
    }
  }

  // All addons (dynamically discovered)
  if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));
    ruleFiles.push(...getAddonRuleFiles(srcRoot));
  }

  // Deploy based on flags
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    if (asAgentsMd) {
      // Aggregate to single AGENTS.md
      const destPath = path.join(target, 'AGENTS.md');
      console.log(`\nAggregating ${agentFiles.length} agents to AGENTS.md...`);
      aggregateToAgentsMd(agentFiles, destPath, opts);
    } else {
      console.log(`\nDeploying ${agentFiles.length} agents...`);
      deployAgents(agentFiles, target, opts);
    }
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying commands...`);
    await deployCommands(target, srcRoot, opts);
  }

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying skills to ~/.codex/skills/...`);
    await deploySkills(target, srcRoot, opts);
  }

  if (shouldDeployRules || rulesOnly) {
    console.log(`\nDeploying ${ruleFiles.length} rules...`);
    deployRules(ruleFiles, target, opts);
  }

  // Post-deployment
  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

  console.log('\n=== Codex deployment complete ===\n');
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
  aggregateToAgentsMd,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
