#!/usr/bin/env node
/**
 * Deploy Agents
 *
 * Copy shared agents from this repo (docs/agents and docs/agents/sdlc) into a target
 * project's `.claude/agents` directory, flattening subdirectories. Designed for simple
 * bootstrapping; will get more sophisticated over time.
 *
 * Usage:
 *   node tools/agents/deploy-agents.mjs [--source <path>] [--target <path>] [--dry-run] [--force]
 *
 * Defaults:
 *   --source resolves relative to this script's repo root (../..)
 *   --target is process.cwd()
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: process.cwd(),
    dryRun: false,
    force: false,
    provider: 'claude',
    reasoningModel: null,
    codingModel: null,
    efficiencyModel: null,
    asAgentsMd: false
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if ((a === '--provider' || a === '--platform') && args[i + 1]) cfg.provider = String(args[++i]).toLowerCase();
    else if (a === '--reasoning-model' && args[i + 1]) cfg.reasoningModel = args[++i];
    else if (a === '--coding-model' && args[i + 1]) cfg.codingModel = args[++i];
    else if (a === '--efficiency-model' && args[i + 1]) cfg.efficiencyModel = args[++i];
    else if (a === '--as-agents-md') cfg.asAgentsMd = true;
  }
  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md'))
    .map((e) => path.join(dir, e.name));
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
    ? { reasoning: 'gpt-5', coding: 'gpt-5-codex', efficiency: 'gpt-5-codex' }
    : { reasoning: 'opus', coding: 'sonnet', efficiency: 'sonnet' };
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
  const { preferSuffixForSDLC = true, force = false, dryRun = false, provider = 'claude' } = opts;
  const seen = new Set();
  const actions = [];
  for (const f of files) {
    const base = path.basename(f);
    let dest = path.join(destDir, base);
    let fromSDLC = f.includes(`${path.sep}sdlc${path.sep}`);
    if (seen.has(dest) || (fs.existsSync(dest) && !force)) {
      if (preferSuffixForSDLC && fromSDLC) {
        const ext = path.extname(base);
        const name = path.basename(base, ext);
        let candidate = path.join(destDir, `${name}-sdlc${ext}`);
        let idx = 1;
        while (fs.existsSync(candidate)) {
          candidate = path.join(destDir, `${name}-sdlc-${idx++}${ext}`);
        }
        dest = candidate;
      } else if (!force) {
        // Skip duplicates when not forcing
        actions.push({ type: 'skip', src: f, dest });
        continue;
      }
    }
    actions.push({ type: 'deploy', src: f, dest, fromSDLC });
    seen.add(dest);
  }

  for (const a of actions) {
    if (a.type === 'deploy') {
      const content = fs.readFileSync(a.src, 'utf8');
      const transformed = transformIfNeeded(a.src, content, provider, opts);
      if (dryRun) console.log(`[dry-run] deploy ${a.src} -> ${a.dest}`);
      else writeFile(a.dest, transformed, false);
      console.log(`deployed ${path.basename(a.src)} -> ${path.relative(process.cwd(), a.dest)}`);
    } else if (a.type === 'skip') {
      console.log(`skip (exists): ${path.basename(a.dest)}`);
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
  const { source, target, dryRun, force, provider, reasoningModel, codingModel, efficiencyModel } = parseArgs();
  // Resolve default source = repo root of this script
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source ? source : repoRoot;
  const agentsRoot = path.join(srcRoot, 'docs', 'agents');
  const sdlcRoot = path.join(agentsRoot, 'sdlc');
  if (!fs.existsSync(agentsRoot)) {
    console.error('Cannot find agents root at', agentsRoot);
    process.exit(1);
  }

  const topAgents = listMdFiles(agentsRoot);
  const sdlcAgents = fs.existsSync(sdlcRoot) ? listMdFiles(sdlcRoot) : [];
  const files = [...topAgents, ...sdlcAgents];

  if (provider === 'openai' && cfg.asAgentsMd) {
    const destDir = path.join(target, '.codex');
    if (!dryRun) ensureDir(destDir);
    const destPath = path.join(destDir, 'AGENTS.md');
    console.log(`Aggregating ${files.length} agents to ${destPath} (provider=${provider})`);
    aggregateToAgentsMd(files, destPath, {
      dryRun,
      provider,
      reasoningModel,
      codingModel,
      efficiencyModel
    });
  } else {
    const destDir = provider === 'openai'
      ? path.join(target, '.codex', 'agents')
      : path.join(target, '.claude', 'agents');
    if (!dryRun) ensureDir(destDir);
    console.log(`Deploying ${files.length} agents to ${destDir} (provider=${provider})`);
    deployFiles(files, destDir, {
      preferSuffixForSDLC: true,
      force,
      dryRun,
      provider,
      reasoningModel,
      codingModel,
      efficiencyModel
    });
  }
})();
