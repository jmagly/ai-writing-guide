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
 *   --mode <type>      Deployment mode: addons, sdlc, marketing, media-curator, research, or all (default)
 *   --dry-run          Show what would be deployed without writing
 *   --force            Overwrite existing files
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import os from 'os';
import { getFrameworksForMode, normalizeDeploymentMode, skillMatchesProvider, isKernelSkill } from '../agents/providers/base.mjs';

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
    force: false,
    copyStandardSkills: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if (a === '--copy-all' || a === '--copy-standard-skills') cfg.copyStandardSkills = true;
  }

  cfg.mode = normalizeDeploymentMode(cfg.mode);
  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function yamlDoubleQuoted(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
    .trim();
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
        metadata[key] = stripWrappingQuotes(value);
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
    if (
      line &&
      !line.endsWith(':') &&
      !line.startsWith('#') &&
      !line.startsWith('-') &&
      !line.startsWith('|')
    ) {
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

  // Platform filtering: skip skills with explicit restrictions that exclude codex.
  // Skills using platforms: [all] (the standard token) always pass this check.
  if (!skillMatchesProvider(content, 'codex')) {
    return null;
  }

  const parsed = parseSkillContent(content, skillName);

  if (!parsed) {
    console.warn(`Warning: Could not parse ${skillPath}`);
    return null;
  }

  const { metadata, body } = parsed;

  // Validate and truncate
  const name = (metadata.name || path.basename(skillDir)).slice(0, MAX_NAME_LENGTH);
  let description = metadata.description || '';

  // Codex REQUIRES a non-empty description — it rejects SKILL.md files that
  // lack one. Fail loudly rather than silently writing `description: ""`
  // (the exact regression this guard defends against).
  if (!description || !String(description).trim()) {
    console.error(
      `ERROR: Skill '${name}' has empty/missing description in source ${skillPath}`
    );
    console.error(
      `       Codex rejects SKILL.md files without a description field.`
    );
    console.error(
      `       Fix the source file: add a non-empty 'description:' to the frontmatter.`
    );
    return null;
  }

  // Truncate description to 500 chars, ending at word boundary
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = description.slice(0, MAX_DESCRIPTION_LENGTH - 3);
    const lastSpace = description.lastIndexOf(' ');
    if (lastSpace > MAX_DESCRIPTION_LENGTH - 50) {
      description = description.slice(0, lastSpace);
    }
    description += '...';
  }

  // Final guard: never emit `description: ""` under any circumstance.
  const quotedDescription = yamlDoubleQuoted(description);
  if (!quotedDescription || !quotedDescription.trim()) {
    console.error(
      `ERROR: Skill '${name}' description collapsed to empty after normalization (source: ${skillPath})`
    );
    return null;
  }

  // Build Codex skill format — include platforms: [codex] so deployed skills are self-describing
  const codexContent = `---
name: "${yamlDoubleQuoted(name)}"
description: "${quotedDescription}"
platforms: [codex]
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
  // Drop a marker file so future deploys can identify AIWG-managed
  // skills regardless of frontmatter format (Codex strips `namespace:`
  // during transform, so the SKILL.md alone isn't a reliable signal).
  // Cleanup keys off this presence.
  fs.writeFileSync(path.join(skillDir, '.aiwg-managed'), 'aiwg\n', 'utf8');
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

  // Framework skills discovered from framework manifests/directory structure.
  const frameworks = getFrameworksForMode(srcRoot, mode);
  for (const framework of frameworks) {
    if (framework.components.skills.exists) {
      dirs.push({ dir: framework.components.skills.path, label: framework.id });
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

  // Honor #1217 kernel-pivot default: deploy only kernel skills unless
  // the operator opts in via `--copy-all` (or `--copy-standard-skills`).
  // Codex deploys to ~/.codex/skills/ (home dir) so the kernel/standard
  // split is enforced at filter time rather than via separate
  // destination directories.
  const copyStandardSkills = cfg.copyStandardSkills === true;

  // Track every AIWG-managed source skill name so we can scope post-deploy
  // cleanup to skills AIWG ships — never delete user-authored or
  // third-party skills sitting alongside.
  //
  // Two name spaces matter for cleanup: source basename (`addons/foo/skills/<name>/`)
  // AND deployed name (the `name:` frontmatter field, which Codex uses as
  // the target directory). Sample: source `archive-acquisition` deploys
  // as `Archive Acquisition`. Track both so cleanup catches each form.
  const allManagedNames = new Set();
  const desiredNames = new Set();

  // Pre-pass: walk every framework/addon skill directory in the source
  // tree (not just those matching the requested mode) so cleanup can
  // remove stale skills from previously-deployed-but-no-longer-deployed
  // frameworks. Bounded to AIWG source roots so user-authored skills in
  // ~/.codex/skills/ are never affected.
  for (const { dir } of getSkillDirectories(srcRoot, 'all')) {
    const allSkills = findSkillDirs(dir);
    for (const s of allSkills) {
      allManagedNames.add(path.basename(s));
      // Also record the frontmatter `name:` since Codex uses that as the
      // target dir. Best-effort — ignore parse errors.
      try {
        const content = fs.readFileSync(path.join(s, 'SKILL.md'), 'utf8');
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const nameMatch = fmMatch[1].match(/^\s*name:\s*(.+?)\s*$/m);
          if (nameMatch) {
            allManagedNames.add(stripWrappingQuotes(nameMatch[1]));
          }
        }
      } catch { /* ignore */ }
    }
  }

  for (const { dir, label } of skillDirs) {
    const found = findSkillDirs(dir);
    if (found.length === 0) continue;

    for (const s of found) allManagedNames.add(path.basename(s));

    const skills = copyStandardSkills
      ? found
      : found.filter(s => isKernelSkill(s));
    if (skills.length === 0) continue;

    for (const s of skills) desiredNames.add(path.basename(s));

    console.log(`\n${label} (${skills.length} skills):`);

    for (const skillDir of skills) {
      const skill = transformToCodexSkill(skillDir);
      if (!skill) {
        // transformToCodexSkill already logged the specific reason (parse
        // error, missing description, platform mismatch, etc.).
        console.log(`  skip: ${path.basename(skillDir)} (see error above)`);
        totalSkipped++;
        continue;
      }

      const result = deploySkill(skill, target, { force, dryRun });
      if (result.action === 'deploy') totalDeployed++;
      else totalSkipped++;
    }
  }

  // Post-deploy cleanup: remove any AIWG-managed skill in the target that
  // isn't in the current desired set. AIWG-managed = either (a) source
  // basename matches an AIWG source dir, or (b) the deployed SKILL.md
  // declares `namespace: aiwg` in frontmatter. The latter catches stale
  // skills from renamed sources or title-cased name fields. We never
  // touch directories whose SKILL.md lacks AIWG provenance — those are
  // user-authored or third-party skills sitting alongside.
  let totalPruned = 0;
  if (fs.existsSync(target)) {
    const targetEntries = fs.readdirSync(target, { withFileTypes: true });
    for (const entry of targetEntries) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      if (desiredNames.has(name)) continue;

      let isAiwgManaged = allManagedNames.has(name);
      if (!isAiwgManaged) {
        // Check for the .aiwg-managed marker file (preferred — survives
        // frontmatter transforms) or fall back to namespace check.
        const markerFile = path.join(target, name, '.aiwg-managed');
        if (fs.existsSync(markerFile)) {
          isAiwgManaged = true;
        } else {
          const skillFile = path.join(target, name, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            try {
              const content = fs.readFileSync(skillFile, 'utf8');
              const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (fmMatch) {
                const fm = fmMatch[1];
                if (/^\s*namespace:\s*["']?aiwg["']?\s*$/m.test(fm)) {
                  isAiwgManaged = true;
                }
              }
            } catch { /* ignore unreadable; leave alone */ }
          }
        }
      }
      if (!isAiwgManaged) continue;

      const full = path.join(target, name);
      if (dryRun) {
        console.log(`  [dry-run] would prune stale skill: ${name}`);
      } else {
        fs.rmSync(full, { recursive: true, force: true });
      }
      totalPruned++;
    }
  }

  const prunedNote = totalPruned > 0 ? `, ${totalPruned} pruned` : '';
  console.log(`\nSummary: ${totalDeployed} deployed, ${totalSkipped} skipped${prunedNote}`);

  if (!dryRun && totalDeployed > 0) {
    console.log(`\nRestart Codex to load new skills.`);
  }
})();
