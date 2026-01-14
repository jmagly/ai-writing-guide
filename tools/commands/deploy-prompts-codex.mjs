#!/usr/bin/env node
/**
 * Deploy Commands as Prompts to Codex
 *
 * Transforms AIWG slash commands to Codex prompt format and deploys to ~/.codex/prompts/
 *
 * Codex Prompt Format:
 * - Location: ~/.codex/prompts/<name>.md
 * - YAML frontmatter (optional): description, argument-hint
 * - Placeholders: $1-$9, $ARGUMENTS, $NAMED
 *
 * Usage:
 *   node tools/commands/deploy-prompts-codex.mjs [options]
 *
 * Options:
 *   --source <path>    Source directory (defaults to repo root)
 *   --target <path>    Target directory (defaults to ~/.codex/prompts)
 *   --mode <type>      Deployment mode: general, sdlc, marketing, or all (default)
 *   --dry-run          Show what would be deployed without writing
 *   --force            Overwrite existing files
 *   --prefix <str>     Prefix for prompt names (default: 'aiwg')
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CODEX_PROMPTS_DIR = path.join(os.homedir(), '.codex', 'prompts');

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: CODEX_PROMPTS_DIR,
    mode: 'all',
    dryRun: false,
    force: false,
    prefix: 'aiwg'
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if (a === '--prefix' && args[i + 1]) cfg.prefix = args[++i];
  }

  return cfg;
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/**
 * List .md command files in a directory
 */
function listCommandFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  const excluded = ['README.md', 'manifest.md', 'DEVELOPMENT_GUIDE.md'];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.md') && !excluded.includes(e.name))
    .map(e => path.join(dir, e.name));
}

/**
 * Parse AIWG command frontmatter and body
 */
function parseCommandFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (fmMatch) {
    const [, frontmatter, body] = fmMatch;
    const metadata = {};

    for (const line of frontmatter.split('\n')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        metadata[key] = value;
      }
    }

    return { metadata, body: body.trim(), hasMetadata: true };
  }

  // No frontmatter, entire content is body
  return { metadata: {}, body: content.trim(), hasMetadata: false };
}

/**
 * Transform AIWG command to Codex prompt format
 */
function transformToCodexPrompt(commandPath, prefix) {
  const parsed = parseCommandFile(commandPath);
  const commandName = path.basename(commandPath, '.md');

  // Extract description from metadata or first paragraph
  let description = '';
  if (parsed.metadata.description) {
    description = parsed.metadata.description;
  } else {
    // Try to extract from first line after any heading
    const lines = parsed.body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('```')) {
        description = trimmed.slice(0, 200);
        break;
      }
    }
  }

  // Extract argument hints from command body
  let argumentHint = '';
  const argPatterns = parsed.body.match(/\$ARGUMENTS|\$\d+|\$[A-Z_]+/g);
  if (argPatterns) {
    const unique = [...new Set(argPatterns)];
    argumentHint = unique.join(' ');
  }

  // Convert AIWG placeholders to Codex format
  // AIWG: $ARGUMENTS, $1, etc. -> Same in Codex
  let body = parsed.body;

  // Convert {{variable}} to $VARIABLE format
  body = body.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, name) => `$${name.toUpperCase()}`);

  // Build Codex prompt
  const promptName = prefix ? `${prefix}-${commandName}` : commandName;

  let promptContent = '';

  // Add frontmatter if we have description or argument-hint
  if (description || argumentHint) {
    promptContent = `---\n`;
    if (description) promptContent += `description: ${description}\n`;
    if (argumentHint) promptContent += `argument-hint: ${argumentHint}\n`;
    promptContent += `---\n\n`;
  }

  promptContent += body;

  return {
    name: promptName,
    description,
    argumentHint,
    content: promptContent,
    sourcePath: commandPath
  };
}

/**
 * Deploy prompt to Codex prompts directory
 */
function deployPrompt(prompt, targetDir, opts) {
  const { force = false, dryRun = false } = opts;
  const destPath = path.join(targetDir, `${prompt.name}.md`);

  // Check if prompt already exists
  if (fs.existsSync(destPath)) {
    const existingContent = fs.readFileSync(destPath, 'utf8');
    if (existingContent === prompt.content && !force) {
      console.log(`  skip (unchanged): ${prompt.name}`);
      return { action: 'skip', reason: 'unchanged' };
    }
  }

  if (dryRun) {
    console.log(`  [dry-run] deploy: ${prompt.name}`);
    return { action: 'deploy', reason: 'dry-run' };
  }

  // Write prompt file
  fs.writeFileSync(destPath, prompt.content, 'utf8');
  console.log(`  deployed: ${prompt.name}.md`);

  return { action: 'deploy', reason: 'success' };
}

/**
 * Load addon manifest if it exists
 */
function loadAddonManifest(addonPath) {
  const manifestPath = path.join(addonPath, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn(`  Warning: Could not parse manifest at ${manifestPath}`);
    }
  }
  return {};
}

/**
 * Get command directories based on mode
 * Returns objects with: dir, label, isCore (whether to deploy all commands)
 */
function getCommandDirectories(srcRoot, mode) {
  const dirs = [];

  // General commands (not core - apply priority filter)
  if (mode === 'general' || mode === 'all') {
    const generalCommandsDir = path.join(srcRoot, 'commands');
    if (fs.existsSync(generalCommandsDir)) {
      dirs.push({ dir: generalCommandsDir, label: 'general', isCore: false });
    }
  }

  // Addon commands (dynamically discovered)
  // Check manifest for core/autoInstall flags
  if (mode === 'general' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const addonsRoot = path.join(srcRoot, 'agentic', 'code', 'addons');
    if (fs.existsSync(addonsRoot)) {
      const addonEntries = fs.readdirSync(addonsRoot, { withFileTypes: true })
        .filter(e => e.isDirectory());

      for (const entry of addonEntries) {
        const addonPath = path.join(addonsRoot, entry.name);
        const addonCommandsDir = path.join(addonPath, 'commands');

        if (fs.existsSync(addonCommandsDir)) {
          const manifest = loadAddonManifest(addonPath);
          // Core addons (core: true or autoInstall: true) deploy ALL commands
          const isCore = manifest.core === true || manifest.autoInstall === true;

          dirs.push({
            dir: addonCommandsDir,
            label: entry.name,
            isCore
          });
        }
      }
    }
  }

  // SDLC framework commands (not core - apply priority filter)
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
    if (fs.existsSync(sdlcCommandsDir)) {
      dirs.push({ dir: sdlcCommandsDir, label: 'sdlc-complete', isCore: false });
    }
  }

  // Marketing framework commands (not core - apply priority filter)
  if (mode === 'marketing' || mode === 'all') {
    const mmkCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
    if (fs.existsSync(mmkCommandsDir)) {
      dirs.push({ dir: mmkCommandsDir, label: 'media-marketing-kit', isCore: false });
    }
  }

  return dirs;
}

(async function main() {
  const cfg = parseArgs();
  const { source, target, mode, dryRun, force, prefix } = cfg;

  // Resolve source directory
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, '..', '..');
  const srcRoot = source || repoRoot;

  console.log(`Deploying commands as Codex prompts (~/.codex/prompts/)`);
  console.log(`  Source: ${srcRoot}`);
  console.log(`  Target: ${target}`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Prefix: ${prefix}`);
  if (dryRun) console.log(`  [DRY RUN]`);
  console.log();

  // Create target directory
  if (!dryRun) {
    ensureDir(target);
  }

  // Get command directories based on mode
  const commandDirs = getCommandDirectories(srcRoot, mode);
  let totalDeployed = 0;
  let totalSkipped = 0;

  for (const { dir, label } of commandDirs) {
    const commandFiles = listCommandFiles(dir);
    if (commandFiles.length === 0) continue;

    console.log(`\n${label} (${commandFiles.length} prompts):`);

    for (const commandFile of commandFiles) {
      try {
        const prompt = transformToCodexPrompt(commandFile, prefix);
        const result = deployPrompt(prompt, target, { force, dryRun });
        if (result.action === 'deploy') totalDeployed++;
        else totalSkipped++;
      } catch (err) {
        console.log(`  error: ${path.basename(commandFile)} - ${err.message}`);
        totalSkipped++;
      }
    }
  }

  console.log(`\nSummary: ${totalDeployed} deployed, ${totalSkipped} skipped`);

  if (!dryRun && totalDeployed > 0) {
    console.log(`\nRestart Codex to load new prompts.`);
    console.log(`Use prompts with: /prompts:${prefix}-<command-name>`);
  }
})();
