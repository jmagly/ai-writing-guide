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
  const cfg = { source: null, target: process.cwd(), dryRun: false, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
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

function copyFiles(files, destDir, { preferSuffixForSDLC = true, force = false, dryRun = false }) {
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
    actions.push({ type: 'copy', src: f, dest });
    seen.add(dest);
  }

  for (const a of actions) {
    if (a.type === 'copy') {
      if (dryRun) {
        console.log(`[dry-run] copy ${a.src} -> ${a.dest}`);
      } else {
        fs.copyFileSync(a.src, a.dest);
        console.log(`copied ${path.basename(a.src)} -> ${path.relative(process.cwd(), a.dest)}`);
      }
    } else if (a.type === 'skip') {
      console.log(`skip (exists): ${path.basename(a.dest)}`);
    }
  }
}

(function main() {
  const { source, target, dryRun, force } = parseArgs();
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

  const destDir = path.join(target, '.claude', 'agents');
  if (!dryRun) ensureDir(destDir);
  console.log(`Deploying ${files.length} agents to ${destDir}`);
  copyFiles(files, destDir, { preferSuffixForSDLC: true, force, dryRun });
})();

