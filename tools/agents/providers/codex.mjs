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
 *   - Model replacement (opus/sonnet/haiku -> gpt-5.4/gpt-5.3-codex/gpt-5.1-codex-mini)
 *   - --as-agents-md aggregation option
 *   - Delegates commands to deploy-prompts-codex.mjs (deploys to ~/.codex/prompts/)
 *   - Delegates skills to deploy-skills-codex.mjs (deploys to ~/.codex/skills/)
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import os from 'os';
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
  deploySkillsWithKernelRouting,
  getFrameworksForMode,
  normalizeDeploymentMode,
  getRulesIndexPath,
  cleanupOldRuleFiles,
  filterCommandsAgainstSkills,
  collectFrameworkArtifacts,
  deploySoulCompanions
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'codex';
export const aliases = ['openai'];

export const paths = {
  agents: '.codex/agents/',
  commands: '.codex/commands/',  // Project-local mirror for conventional deployment
  // Skills sequestered under .codex/.aiwg/skills/ — index-driven discovery (#1212).
  skills: '.codex/.aiwg/skills/',
  rules: '.codex/rules/'
};

// Kernel skills (always-loaded) deploy to ~/.codex/skills/ — the path Codex
// natively scans. The standard tier (when `--copy-all` is passed) lands
// at the same dir alongside kernel skills; the deploy-skills-codex.mjs
// script filters non-kernel skills out by default (#1217).
export const kernelSkillsPath = path.join(os.homedir(), '.codex', 'skills');

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
    'opus': 'gpt-5.4',
    'sonnet': 'gpt-5.3-codex',
    'haiku': 'gpt-5.1-codex-mini'
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
    reasoning: reasoningModel || 'gpt-5.4',
    coding: codingModel || 'gpt-5.3-codex',
    efficiency: efficiencyModel || 'gpt-5.1-codex-mini'
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
  return deployFiles(agentFiles, destDir, { ...opts, injectPlatform: true }, transformAgent);
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
    if (opts.copyStandardSkills === true) args.push('--copy-all');

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

  // Deploy to ~/.codex/skills/ (home dir — legacy Codex path)
  await new Promise((resolve, reject) => {
    const args = ['--source', srcRoot];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.mode) args.push('--mode', opts.mode);
    if (opts.copyStandardSkills === true) args.push('--copy-all');

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

  // Also deploy to .agents/skills/ (cross-agent universal path — #766)
  const crossAgentSkillsDir = path.join(targetDir, '.agents', 'skills');
  console.log(`Deploying skills to ${crossAgentSkillsDir} (cross-agent path)...`);

  await new Promise((resolve, reject) => {
    const args = ['--source', srcRoot, '--target', crossAgentSkillsDir];
    if (opts.dryRun) args.push('--dry-run');
    if (opts.force) args.push('--force');
    if (opts.mode) args.push('--mode', opts.mode);
    if (opts.copyStandardSkills === true) args.push('--copy-all');

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      cwd: srcRoot
    });

    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`deploy-skills-codex.mjs (cross-agent) exited with code ${code}`));
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
// Plugin Bundle Generator
// ============================================================================

/**
 * Generate a Codex plugin bundle for AIWG SDLC.
 *
 * Creates:
 *   <targetDir>/plugins/sdlc/.codex-plugin/plugin.json  — Codex plugin manifest
 *   <targetDir>/.agents/plugins/marketplace.json        — Repo marketplace entry
 *
 * @param {string} targetDir - Root directory where bundle is written
 * @param {{ dryRun?: boolean, srcRoot?: string, version?: string }} opts
 */
export function generatePluginBundle(targetDir, opts = {}) {
  const { dryRun = false, srcRoot = process.cwd(), version: overrideVersion } = opts;

  // Resolve version: opts.version > package.json > 'unknown'
  let version = overrideVersion;
  if (!version) {
    try {
      const pkgPath = path.join(srcRoot, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      // Strip pre-release suffix so it stays CalVer-compliant
      version = (pkg.version || 'unknown').replace(/-.*$/, '');
    } catch {
      version = 'unknown';
    }
  }

  // ---- plugin.json --------------------------------------------------------
  const pluginManifest = {
    name: 'aiwg-sdlc',
    version,
    description:
      'Complete Software Development Lifecycle framework with 180+ specialized agents for requirements, architecture, security, testing, and deployment.',
    author: 'AIWG',
    homepage: 'https://aiwg.io',
    repository: 'https://github.com/jmagly/aiwg',
    license: 'MIT',
    skills: './skills/',
    keywords: ['sdlc', 'aiwg', 'agents', 'architecture', 'security', 'testing', 'deployment']
  };

  const pluginJsonDir = path.join(targetDir, 'plugins', 'sdlc', '.codex-plugin');
  const pluginJsonPath = path.join(pluginJsonDir, 'plugin.json');

  if (dryRun) {
    console.log(`[dry-run] would write ${pluginJsonPath}`);
  } else {
    fs.mkdirSync(pluginJsonDir, { recursive: true });
    fs.writeFileSync(pluginJsonPath, JSON.stringify(pluginManifest, null, 2) + '\n', 'utf8');
  }

  // ---- marketplace.json ---------------------------------------------------
  const marketplace = {
    name: 'aiwg-local',
    interface: {
      displayName: 'AIWG Plugins'
    },
    plugins: [
      {
        name: 'aiwg-sdlc',
        source: {
          path: './plugins/sdlc',
          source: 'local'
        },
        policy: {
          installation: 'AVAILABLE'
        },
        category: 'Development'
      }
    ]
  };

  const marketplaceDir = path.join(targetDir, '.agents', 'plugins');
  const marketplacePath = path.join(marketplaceDir, 'marketplace.json');

  if (dryRun) {
    console.log(`[dry-run] would write ${marketplacePath}`);
  } else {
    fs.mkdirSync(marketplaceDir, { recursive: true });
    fs.writeFileSync(marketplacePath, JSON.stringify(marketplace, null, 2) + '\n', 'utf8');
  }
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);

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
    asPlugin,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== OpenAI Codex Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect source files based on mode
  const agentFiles = [];
  const ruleFiles = [];
  const normalizedMode = normalizeDeploymentMode(mode);

  // Frameworks discovered from manifests/directory structure
  const frameworks = getFrameworksForMode(srcRoot, normalizedMode);
  for (const framework of frameworks) {
    if (framework.components.agents.exists) {
      agentFiles.push(...listMdFiles(framework.components.agents.path));
    }

    if (framework.id === 'sdlc-complete' && framework.components.rules.exists) {
      // Use consolidated RULES-INDEX.md for SDLC rules when available.
      const indexPath = getRulesIndexPath(srcRoot);
      if (indexPath) {
        ruleFiles.push(indexPath);
        continue;
      }
    }

    if (framework.components.rules.exists) {
      ruleFiles.push(...listMdFiles(framework.components.rules.path));
    }
  }

  // All addons (dynamically discovered)
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));
    ruleFiles.push(...getAddonRuleFiles(srcRoot));
  }

  // Collect soul companion files
  const soulArtifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: false,
    includeCommands: false,
    includeSkills: false,
    includeRules: false
  });
  const soulFiles = [...(soulArtifacts.souls || [])];

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

    // Deploy soul companion files alongside agents
    if (soulFiles.length > 0) {
      const destDir = path.join(target, paths.agents);
      ensureDir(destDir, opts.dryRun);
      console.log(`\nDeploying ${soulFiles.length} soul files...`);
      deploySoulCompanions(soulFiles, destDir, opts);
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

  // Plugin bundle (opt-in via --as-plugin)
  if (asPlugin) {
    console.log('\nGenerating Codex plugin bundle...');
    generatePluginBundle(target, { dryRun, srcRoot });
  }

  console.log('\n=== Codex deployment complete ===\n');
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
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  aggregateToAgentsMd,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  generatePluginBundle,
  deploy
};
