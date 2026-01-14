#!/usr/bin/env node
/**
 * Deploy Commands as Rules to Cursor
 *
 * Transforms AIWG slash commands to Cursor MDC rule format and deploys to .cursor/rules/
 *
 * Cursor Rule Format (MDC):
 * - Location: .cursor/rules/<name>.mdc
 * - YAML frontmatter: description (required), globs (optional for auto-attach)
 * - Body: Rule instructions
 *
 * Usage:
 *   node tools/rules/deploy-rules-cursor.mjs [options]
 *
 * Options:
 *   --source <path>    Source directory (defaults to repo root)
 *   --target <path>    Target directory (defaults to .cursor/rules)
 *   --mode <type>      Deployment mode: general, sdlc, marketing, or all (default)
 *   --dry-run          Show what would be deployed without writing
 *   --force            Overwrite existing files
 *   --prefix <str>     Prefix for rule names (default: 'aiwg')
 */

import fs from 'fs';
import path from 'path';

const RULES_SUBDIR = '.cursor/rules';

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    source: null,
    target: null,  // Will be resolved to .cursor/rules/ in the appropriate project
    mode: 'all',
    dryRun: false,
    force: false,
    prefix: 'aiwg'
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--source' && args[i + 1]) cfg.source = path.resolve(args[++i]);
    else if (a === '--target' && args[i + 1]) {
      // --target is the PROJECT root, not the final destination
      // We always deploy to <project>/.cursor/rules/
      const projectRoot = path.resolve(args[++i]);
      cfg.target = path.join(projectRoot, RULES_SUBDIR);
    }
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
    else if (a === '--prefix' && args[i + 1]) cfg.prefix = args[++i];
  }

  // Default to .cursor/rules/ in current working directory
  if (!cfg.target) {
    cfg.target = path.resolve(RULES_SUBDIR);
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
 * Map command name to appropriate glob patterns
 * Cursor supports auto-attaching rules based on file patterns
 */
function getGlobsForCommand(commandName) {
  const globMappings = {
    // Code-related commands
    'generate-tests': ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py'],
    'security-audit': ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go', '**/*.java'],
    'pr-review': ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py', '**/*.go'],

    // Documentation commands
    'troubleshooting-guide': ['**/*.md'],

    // SDLC workflow commands - no globs (manually invoked)
    'flow-gate-check': null,
    'flow-inception-to-elaboration': null,
    'flow-elaboration-to-construction': null,
    'project-status': null,
    'project-health-check': null,
    'intake-wizard': null,

    // Security commands
    'security-gate': ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.py'],

    // Build/deploy commands
    'deploy-gen': ['Dockerfile*', 'docker-compose*.yml', '*.yaml', 'Makefile']
  };

  return globMappings[commandName] || null;
}

/**
 * Transform AIWG command to Cursor MDC rule format
 */
function transformToCursorRule(commandPath, prefix) {
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

  // Get glob patterns for auto-attachment (if applicable)
  const globs = getGlobsForCommand(commandName);

  // Build MDC content
  const ruleName = prefix ? `${prefix}-${commandName}` : commandName;

  let ruleContent = `---\n`;
  ruleContent += `description: ${description || `AIWG ${commandName} rule`}\n`;

  if (globs && globs.length > 0) {
    // Format as YAML array
    ruleContent += `globs:\n`;
    for (const glob of globs) {
      ruleContent += `  - "${glob}"\n`;
    }
  }

  ruleContent += `---\n\n`;

  // Add rule body - convert $ARGUMENTS placeholders to plain text hints
  let body = parsed.body;

  // Remove or simplify AIWG-specific placeholders
  body = body.replace(/\$ARGUMENTS/g, '[arguments]');
  body = body.replace(/\$\d+/g, '[arg]');
  body = body.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, '[$1]');

  ruleContent += body;

  return {
    name: ruleName,
    description,
    globs,
    content: ruleContent,
    sourcePath: commandPath
  };
}

/**
 * Deploy rule to Cursor rules directory
 */
function deployRule(rule, targetDir, opts) {
  const { force = false, dryRun = false } = opts;
  const destPath = path.join(targetDir, `${rule.name}.mdc`);

  // Check if rule already exists
  if (fs.existsSync(destPath)) {
    const existingContent = fs.readFileSync(destPath, 'utf8');
    if (existingContent === rule.content && !force) {
      console.log(`  skip (unchanged): ${rule.name}`);
      return { action: 'skip', reason: 'unchanged' };
    }
  }

  if (dryRun) {
    console.log(`  [dry-run] deploy: ${rule.name}.mdc`);
    return { action: 'deploy', reason: 'dry-run' };
  }

  // Write rule file
  fs.writeFileSync(destPath, rule.content, 'utf8');
  console.log(`  deployed: ${rule.name}.mdc`);

  return { action: 'deploy', reason: 'success' };
}

/**
 * Get command directories based on mode
 */
function getCommandDirectories(srcRoot, mode) {
  const dirs = [];

  // General commands
  if (mode === 'general' || mode === 'all') {
    const generalCommandsDir = path.join(srcRoot, 'commands');
    if (fs.existsSync(generalCommandsDir)) {
      dirs.push({ dir: generalCommandsDir, label: 'general' });
    }
  }

  // Addon commands (dynamically discovered)
  if (mode === 'general' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const addonsRoot = path.join(srcRoot, 'agentic', 'code', 'addons');
    if (fs.existsSync(addonsRoot)) {
      const addonDirs = fs.readdirSync(addonsRoot, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => path.join(addonsRoot, e.name, 'commands'));

      for (const addonCommandsDir of addonDirs) {
        if (fs.existsSync(addonCommandsDir)) {
          dirs.push({ dir: addonCommandsDir, label: path.basename(path.dirname(addonCommandsDir)) });
        }
      }
    }
  }

  // SDLC framework commands
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
    if (fs.existsSync(sdlcCommandsDir)) {
      dirs.push({ dir: sdlcCommandsDir, label: 'sdlc-complete' });
    }
  }

  // Marketing framework commands
  if (mode === 'marketing' || mode === 'all') {
    const mmkCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
    if (fs.existsSync(mmkCommandsDir)) {
      dirs.push({ dir: mmkCommandsDir, label: 'media-marketing-kit' });
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

  console.log(`Deploying commands as Cursor rules (.cursor/rules/)`);
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

    console.log(`\n${label} (${commandFiles.length} rules):`);

    for (const commandFile of commandFiles) {
      try {
        const rule = transformToCursorRule(commandFile, prefix);
        const result = deployRule(rule, target, { force, dryRun });
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
    console.log(`\nRules deployed to ${target}`);
    console.log(`Cursor will auto-load rules based on file patterns.`);
    console.log(`Rules without globs are available for manual reference.`);
  }
})();
