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
 *   --provider <name>        Target provider: claude (default) or openai
 *   --reasoning-model <name> Override model for reasoning tasks
 *   --coding-model <name>    Override model for coding tasks
 *   --efficiency-model <name> Override model for efficiency tasks
 *   --as-agents-md           Aggregate to single AGENTS.md (OpenAI)
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

function transformIfNeeded(srcPath, content, provider, modelCfg) {
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
    const transformedContent = transformIfNeeded(f, srcContent, provider, opts);

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
    content = transformIfNeeded(f, content, provider, opts);
    // ensure block separation
    if (!content.endsWith('\n')) content += '\n';
    blocks.push(content);
  }
  const out = blocks.join('\n');
  if (opts.dryRun) console.log(`[dry-run] write ${destPath}`);
  else fs.writeFileSync(destPath, out, 'utf8');
  console.log(`wrote ${path.relative(process.cwd(), destPath)} with ${files.length} agents`);
}

(function main() {
  const cfg = parseArgs();
  const { source, target, mode, dryRun, force, provider, reasoningModel, codingModel, efficiencyModel, deployCommands, commandsOnly, asAgentsMd } = cfg;

  // Resolve default source = repo root of this script
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source ? source : repoRoot;

  const deployOpts = {
    force,
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
          const destDir = provider === 'openai'
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
          const destDir = provider === 'openai'
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
          const destDir = provider === 'openai'
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
          const destDir = provider === 'openai'
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
})();
