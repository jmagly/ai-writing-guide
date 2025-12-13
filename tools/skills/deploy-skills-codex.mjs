#!/usr/bin/env node
/**
 * Deploy Skills to Codex
 *
 * Transforms AIWG skills to Codex format and deploys to ~/.codex/skills/
 *
 * Codex Skill Format:
 * - Location: ~/.codex/skills/<skill-name>/SKILL.md
 * - YAML frontmatter: name (≤100 chars), description (≤500 chars)
 * - Body: Instructions (kept on disk, not injected into context)
 *
 * Usage:
 *   node tools/skills/deploy-skills-codex.mjs [options]
 *
 * Options:
 *   --source <path>    Source directory (defaults to repo root)
 *   --target <path>    Target directory (defaults to ~/.codex/skills)
 *   --mode <type>      Deployment mode: addons, sdlc, mmk, or all (default)
 *   --dry-run          Show what would be deployed without writing
 *   --force            Overwrite existing files
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CODEX_SKILLS_DIR = path.join(os.homedir(), '.codex', 'skills');
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: CODEX_SKILLS_DIR,
    mode: 'all',
    dryRun: false,
    force: false
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
  }

  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/**
 * Find skill directories containing SKILL.md
 */
function findSkillDirs(baseDir) {
  if (!fs.existsSync(baseDir)) return [];

  const skillDirs = [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = path.join(baseDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        skillDirs.push(path.join(baseDir, entry.name));
      }
    }
  }

  return skillDirs;
}

/**
 * Parse AIWG SKILL.md - handles both frontmatter and non-frontmatter formats
 */
function parseSkillContent(content, skillName) {
  // Try YAML frontmatter format first
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const [, frontmatter, body] = fmMatch;
    const metadata = {};

    // Parse YAML-like frontmatter
    for (const line of frontmatter.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        metadata[key] = value;
      }
    }

    return { metadata, body };
  }

  // Fallback: Parse non-frontmatter format (# skill-name header)
  const lines = content.split('\n');
  let name = skillName;
  let description = '';
  let bodyStartIdx = 0;

  // Look for # header as name
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      name = line.slice(2).trim();
      bodyStartIdx = i + 1;
      break;
    }
  }

  // Look for first paragraph as description (skip empty lines)
  for (let i = bodyStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('|')) {
      description = line;
      break;
    }
  }

  // If description is too short, try next paragraph
  if (description.length < 20) {
    for (let i = bodyStartIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('## ') && line.toLowerCase().includes('purpose')) {
        // Look for content after ## Purpose
        for (let j = i + 1; j < lines.length && j < i + 10; j++) {
          const purposeLine = lines[j].trim();
          if (purposeLine && !purposeLine.startsWith('#') && !purposeLine.startsWith('-')) {
            description = purposeLine;
            break;
          }
        }
        break;
      }
    }
  }

  return {
    metadata: { name, description },
    body: content
  };
}

/**
 * Transform AIWG skill to Codex format
 */
function transformToCodexSkill(skillDir) {
  const skillPath = path.join(skillDir, 'SKILL.md');
  const skillName = path.basename(skillDir);
  const content = fs.readFileSync(skillPath, 'utf8');
  const parsed = parseSkillContent(content, skillName);

  if (!parsed) {
    console.warn(`Warning: Could not parse ${skillPath}`);
    return null;
  }

  const { metadata, body } = parsed;

  // Validate and truncate
  const name = (metadata.name || path.basename(skillDir)).slice(0, MAX_NAME_LENGTH);
  let description = metadata.description || '';

  // Truncate description to 500 chars, ending at word boundary
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = description.slice(0, MAX_DESCRIPTION_LENGTH - 3);
    const lastSpace = description.lastIndexOf(' ');
    if (lastSpace > MAX_DESCRIPTION_LENGTH - 50) {
      description = description.slice(0, lastSpace);
    }
    description += '...';
  }

  // Build Codex skill format
  const codexContent = `---
name: ${name}
description: ${description}
---

${body.trim()}
`;

  return {
    name,
    description,
    content: codexContent,
    sourcePath: skillPath
  };
}

/**
 * Deploy skill to Codex skills directory
 */
function deploySkill(skill, targetDir, opts) {
  const { force = false, dryRun = false } = opts;
  const skillDir = path.join(targetDir, skill.name);
  const destPath = path.join(skillDir, 'SKILL.md');

  // Check if skill already exists
  if (fs.existsSync(destPath)) {
    const existingContent = fs.readFileSync(destPath, 'utf8');
    if (existingContent === skill.content && !force) {
      console.log(`  skip (unchanged): ${skill.name}`);
      return { action: 'skip', reason: 'unchanged' };
    }
  }

  if (dryRun) {
    console.log(`  [dry-run] deploy: ${skill.name}`);
    return { action: 'deploy', reason: 'dry-run' };
  }

  // Create skill directory and write SKILL.md
  ensureDir(skillDir);
  fs.writeFileSync(destPath, skill.content, 'utf8');
  console.log(`  deployed: ${skill.name}`);

  return { action: 'deploy', reason: 'success' };
}

/**
 * Get skill directories based on mode
 */
function getSkillDirectories(srcRoot, mode) {
  const dirs = [];

  // Addon skills
  if (mode === 'addons' || mode === 'all') {
    const addonsRoot = path.join(srcRoot, 'agentic', 'code', 'addons');
    if (fs.existsSync(addonsRoot)) {
      const addonDirs = fs.readdirSync(addonsRoot, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => path.join(addonsRoot, e.name, 'skills'));

      for (const addonSkillsDir of addonDirs) {
        if (fs.existsSync(addonSkillsDir)) {
          dirs.push({ dir: addonSkillsDir, label: path.basename(path.dirname(addonSkillsDir)) });
        }
      }
    }
  }

  // SDLC framework skills
  if (mode === 'sdlc' || mode === 'all') {
    const sdlcSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'skills');
    if (fs.existsSync(sdlcSkillsDir)) {
      dirs.push({ dir: sdlcSkillsDir, label: 'sdlc-complete' });
    }
  }

  // Marketing framework skills
  if (mode === 'mmk' || mode === 'marketing' || mode === 'all') {
    const mmkSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'skills');
    if (fs.existsSync(mmkSkillsDir)) {
      dirs.push({ dir: mmkSkillsDir, label: 'media-marketing-kit' });
    }
  }

  return dirs;
}

(async function main() {
  const cfg = parseArgs();
  const { source, target, mode, dryRun, force } = cfg;

  // Resolve source directory
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source || repoRoot;

  console.log(`Deploying skills to Codex (~/.codex/skills/)`);
  console.log(`  Source: ${srcRoot}`);
  console.log(`  Target: ${target}`);
  console.log(`  Mode: ${mode}`);
  if (dryRun) console.log(`  [DRY RUN]`);
  console.log();

  // Create target directory
  if (!dryRun) {
    ensureDir(target);
  }

  // Get skill directories based on mode
  const skillDirs = getSkillDirectories(srcRoot, mode);
  let totalDeployed = 0;
  let totalSkipped = 0;

  for (const { dir, label } of skillDirs) {
    const skills = findSkillDirs(dir);
    if (skills.length === 0) continue;

    console.log(`\n${label} (${skills.length} skills):`);

    for (const skillDir of skills) {
      const skill = transformToCodexSkill(skillDir);
      if (!skill) {
        console.log(`  skip (parse error): ${path.basename(skillDir)}`);
        totalSkipped++;
        continue;
      }

      const result = deploySkill(skill, target, { force, dryRun });
      if (result.action === 'deploy') totalDeployed++;
      else totalSkipped++;
    }
  }

  console.log(`\nSummary: ${totalDeployed} deployed, ${totalSkipped} skipped`);

  if (!dryRun && totalDeployed > 0) {
    console.log(`\nRestart Codex to load new skills.`);
  }
})();
