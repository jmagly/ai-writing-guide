/**
 * OpenAI Codex Provider
 *
 * Deploys agents and commands for OpenAI Codex CLI. Commands are transformed
 * to prompts format via external script.
 *
 * Deployment paths:
 *   - Agents: .codex/agents/
 *   - Commands: .codex/commands/ (via deploy-prompts-codex.mjs)
 *   - Skills: ~/.codex/skills/ (home directory)
 *
 * Special features:
 *   - Model replacement (opus/sonnet/haiku -> gpt variants)
 *   - --as-agents-md aggregation option
 *   - Delegates commands to deploy-prompts-codex.mjs
 *   - Delegates skills to deploy-skills-codex.mjs
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
  initializeFrameworkWorkspace
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'codex';
export const aliases = ['openai'];

export const paths = {
  agents: '.codex/agents/',
  commands: '.codex/commands/',
  skills: null,  // Skills go to ~/.codex/skills/
  rules: null
};

export const capabilities = {
  skills: true,  // But deployed to home dir
  rules: false,
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
    'opus': 'gpt-5',
    'sonnet': 'gpt-5-codex',
    'haiku': 'gpt-4o-mini'
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
    reasoning: reasoningModel || 'gpt-5',
    coding: codingModel || 'gpt-5-codex',
    efficiency: efficiencyModel || 'gpt-4o-mini'
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
  ensureDir(destDir);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands via external script
 */
export async function deployCommands(targetDir, srcRoot, opts) {
  const scriptPath = path.join(srcRoot, 'tools', 'commands', 'deploy-prompts-codex.mjs');

  if (!fs.existsSync(scriptPath)) {
    console.warn(`Codex prompts deployment script not found at ${scriptPath}`);
    return;
  }

  console.log('Delegating command deployment to deploy-prompts-codex.mjs...');

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
    commandsOnly,
    skillsOnly,
    dryRun,
    asAgentsMd,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== OpenAI Codex Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect source files based on mode
  const agentFiles = [];

  // Writing/general agents
  if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
    const writingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'agents');
    agentFiles.push(...listMdFiles(writingAgentsDir));
  }

  // SDLC framework
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    agentFiles.push(...listMdFiles(sdlcAgentsDir));
  }

  // Marketing framework
  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    agentFiles.push(...listMdFiles(marketingAgentsDir));
  }

  // Utils addon
  if (mode === 'sdlc' || mode === 'all') {
    const utilsAgentsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'aiwg-utils', 'agents');
    agentFiles.push(...listMdFiles(utilsAgentsDir));
  }

  // Deploy based on flags
  if (!commandsOnly && !skillsOnly) {
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
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  deployAgents,
  deployCommands,
  deploySkills,
  aggregateToAgentsMd,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
