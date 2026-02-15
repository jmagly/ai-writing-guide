/**
 * Shared utilities for provider modules
 *
 * This module contains common functions used across all providers:
 * - File operations (ensureDir, listMdFiles, writeFile, etc.)
 * - Model configuration loading
 * - Frontmatter parsing
 * - Other shared utilities
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// File Operations
// ============================================================================

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param {string} d - Directory path
 * @param {boolean} dryRun - If true, skip actual directory creation
 */
export function ensureDir(d, dryRun = false) {
  if (dryRun) return;
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

/**
 * List markdown files in a directory (non-recursive)
 */
export function listMdFiles(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'factory-compat.md', 'windsurf-compat.md', 'DEVELOPMENT_GUIDE.md'];
  const excluded = [...defaultExcluded, ...excludePatterns];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.md') && !excluded.includes(e.name))
    .map((e) => path.join(dir, e.name));
}

/**
 * List markdown files recursively
 */
export function listMdFilesRecursive(dir, excludePatterns = []) {
  if (!fs.existsSync(dir)) return [];
  const defaultExcluded = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md', 'factory-compat.md', 'windsurf-compat.md', 'DEVELOPMENT_GUIDE.md'];
  const excluded = [...defaultExcluded, ...excludePatterns];
  const results = [];

  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory() && entry.name !== 'templates') {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md') && !excluded.includes(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  scan(dir);
  return results;
}

/**
 * List skill directories (directories containing SKILL.md)
 */
export function listSkillDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'SKILL.md')))
    .map((e) => path.join(dir, e.name));
}

/**
 * Write a file (with dry-run support)
 */
export function writeFile(dest, data, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] write ${dest}`);
  } else {
    fs.writeFileSync(dest, data, 'utf8');
  }
}

// ============================================================================
// Model Configuration
// ============================================================================

/**
 * Load model configuration from models.json
 * Priority: Project models.json > User ~/.config/aiwg/models.json > AIWG defaults
 */
export function loadModelConfig(srcRoot) {
  const locations = [
    { path: path.join(process.cwd(), 'models.json'), label: 'project' },
    { path: path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'aiwg', 'models.json'), label: 'user' },
    { path: path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'config', 'models.json'), label: 'AIWG defaults' }
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc.path)) {
      try {
        const config = JSON.parse(fs.readFileSync(loc.path, 'utf8'));
        config._source = `${loc.label} (${loc.path})`;
        return config;
      } catch (err) {
        console.warn(`Warning: Could not parse models.json at ${loc.path}: ${err.message}`);
      }
    }
  }

  // Fallback to hardcoded defaults if no config found
  return {
    factory: {
      reasoning: { model: 'claude-opus-4-1-20250805' },
      coding: { model: 'claude-sonnet-4-5-20250929' },
      efficiency: { model: 'claude-haiku-3-5' }
    },
    shorthand: {
      'opus': 'claude-opus-4-1-20250805',
      'sonnet': 'claude-sonnet-4-5-20250929',
      'haiku': 'claude-haiku-3-5',
      'inherit': 'inherit'
    }
  };
}

// ============================================================================
// Frontmatter Utilities
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content
 * Returns { frontmatter: string, body: string, metadata: object }
 */
export function parseFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: null, body: content, metadata: {} };
  }

  const [, frontmatter, body] = fmMatch;

  // Parse simple YAML key-value pairs
  const metadata = {};
  for (const line of frontmatter.split('\n')) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      metadata[match[1]] = match[2].trim();
    }
  }

  return { frontmatter, body, metadata };
}

/**
 * Create frontmatter string from metadata object
 */
export function stringifyFrontmatter(metadata, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && value !== null) {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n') + '\n\n' + body.trim();
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert a string to kebab-case
 * "Technical Researcher" -> "technical-researcher"
 */
export function toKebabCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Strip JSON comments (JSONC) for parsing
 * Used by Factory provider for settings.json
 */
export function stripJsonComments(jsonc) {
  // Remove single-line comments
  let result = jsonc.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result;
}

// ============================================================================
// Agent Category Inference
// ============================================================================

/**
 * Infer agent category from name and body content
 * Returns: 'analysis', 'documentation', 'planning', or 'implementation'
 */
export function inferAgentCategory(name, body) {
  const normalizedName = (name || '').toLowerCase();
  const normalizedBody = (body || '').toLowerCase();

  // Analysis agents (read-only)
  if (normalizedName.includes('security') || normalizedName.includes('review') ||
      normalizedName.includes('analyst') || normalizedName.includes('auditor')) {
    return 'analysis';
  }

  // Documentation agents
  if (normalizedName.includes('writer') || normalizedName.includes('document') ||
      normalizedName.includes('archivist')) {
    return 'documentation';
  }

  // Planning agents
  if (normalizedName.includes('architect') || normalizedName.includes('planner') ||
      normalizedName.includes('requirements') || normalizedName.includes('designer')) {
    return 'planning';
  }

  // Implementation agents (full access)
  if (normalizedName.includes('implement') || normalizedName.includes('engineer') ||
      normalizedName.includes('developer') || normalizedName.includes('test')) {
    return 'implementation';
  }

  // Default to implementation for most flexibility
  return 'implementation';
}

// ============================================================================
// Tool Parsing
// ============================================================================

/**
 * Parse tools string into array
 */
export function parseTools(toolsString) {
  if (!toolsString) return [];

  if (toolsString.startsWith('[')) {
    try {
      return JSON.parse(toolsString);
    } catch (e) {
      return toolsString.replace(/[\[\]"']/g, '').split(/[,\s]+/).filter(Boolean);
    }
  }
  return toolsString.split(/[,\s]+/).filter(Boolean);
}

// ============================================================================
// File Deployment
// ============================================================================

/**
 * Deploy files to destination directory
 * Handles transformation via provider's transform function
 */
export function deployFiles(files, destDir, opts, transformFn) {
  const { force = false, dryRun = false, provider = 'claude', fileExtension = '.md' } = opts;
  const seen = new Set();
  const actions = [];

  for (const f of files) {
    let base = path.basename(f);

    // Change extension if needed
    if (fileExtension !== '.md' && base.endsWith('.md')) {
      base = base.replace(/\.md$/, fileExtension);
    }

    let dest = path.join(destDir, base);

    // Check for duplicate destination in this batch
    if (seen.has(dest)) {
      actions.push({ type: 'skip', src: f, dest, reason: 'duplicate' });
      continue;
    }

    // Read and transform source content
    const srcContent = fs.readFileSync(f, 'utf8');
    const transformedContent = transformFn ? transformFn(f, srcContent, opts) : srcContent;

    // Check if destination exists and compare contents
    if (fs.existsSync(dest)) {
      const destContent = fs.readFileSync(dest, 'utf8');
      if (destContent === transformedContent && !force) {
        actions.push({ type: 'skip', src: f, dest, reason: 'unchanged' });
        seen.add(dest);
        continue;
      }
      actions.push({ type: 'deploy', src: f, dest, content: transformedContent, reason: force ? 'forced' : 'changed' });
    } else {
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

  return actions;
}

/**
 * Deploy a skill directory (copy recursively)
 */
export function deploySkillDir(skillDir, destDir, opts) {
  const { force = false, dryRun = false } = opts;
  const skillName = path.basename(skillDir);
  const destSkillDir = path.join(destDir, skillName);

  if (!dryRun) ensureDir(destSkillDir);

  function copyRecursive(src, dest) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        if (!dryRun) ensureDir(destPath);
        copyRecursive(srcPath, destPath);
      } else {
        const srcContent = fs.readFileSync(srcPath, 'utf8');

        if (fs.existsSync(destPath)) {
          const destContent = fs.readFileSync(destPath, 'utf8');
          if (destContent === srcContent && !force) {
            console.log(`skip (unchanged): ${path.relative(destDir, destPath)}`);
            continue;
          }
        }

        if (dryRun) {
          console.log(`[dry-run] deploy ${srcPath} -> ${destPath}`);
        } else {
          fs.writeFileSync(destPath, srcContent, 'utf8');
          console.log(`deployed ${entry.name} -> ${path.relative(process.cwd(), destPath)}`);
        }
      }
    }
  }

  copyRecursive(skillDir, destSkillDir);
  console.log(`deployed skill: ${skillName}`);
}

// ============================================================================
// Workspace Initialization
// ============================================================================

/**
 * Initialize framework-scoped workspace structure
 * Creates .aiwg/frameworks/{framework-id}/ directories
 */
export function initializeFrameworkWorkspace(target, mode, dryRun, srcRoot = null) {
  const aiwgBase = path.join(target, '.aiwg');
  const frameworksDir = path.join(aiwgBase, 'frameworks');
  const sharedDir = path.join(aiwgBase, 'shared');

  const frameworkDirs = srcRoot
    ? getFrameworksForMode(srcRoot, mode).map(fw => ({
      id: fw.id,
      subdirs: fw.workspaceSubdirs
    }))
    : [];

  // Backward-compatible fallback when source root isn't provided.
  if (frameworkDirs.length === 0) {
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      frameworkDirs.push({
        id: 'sdlc-complete',
        subdirs: ['repo', 'projects', 'working', 'archive']
      });
    }

    if (mode === 'marketing' || mode === 'all') {
      frameworkDirs.push({
        id: 'media-marketing-kit',
        subdirs: ['repo', 'campaigns', 'working', 'archive']
      });
    }

    if (mode === 'media-curator' || mode === 'all') {
      frameworkDirs.push({
        id: 'media-curator',
        subdirs: ['repo', 'library', 'working', 'archive']
      });
    }

    if (mode === 'research' || mode === 'all') {
      frameworkDirs.push({
        id: 'research-complete',
        subdirs: ['repo', 'corpus', 'working', 'archive']
      });
    }
  }

  if (frameworkDirs.length === 0) return;

  if (dryRun) {
    console.log('\n[dry-run] Would create framework-scoped workspace structure:');
    console.log(`[dry-run]   ${aiwgBase}/`);
    console.log(`[dry-run]   ${frameworksDir}/`);
    console.log(`[dry-run]   ${sharedDir}/`);
    for (const fw of frameworkDirs) {
      for (const subdir of fw.subdirs) {
        console.log(`[dry-run]   ${path.join(frameworksDir, fw.id, subdir)}/`);
      }
    }
    return;
  }

  ensureDir(aiwgBase);
  ensureDir(frameworksDir);
  ensureDir(sharedDir);

  for (const fw of frameworkDirs) {
    const fwBase = path.join(frameworksDir, fw.id);
    ensureDir(fwBase);
    for (const subdir of fw.subdirs) {
      ensureDir(path.join(fwBase, subdir));
    }
  }

  // Initialize registry.json if it doesn't exist
  const registryPath = path.join(frameworksDir, 'registry.json');
  if (!fs.existsSync(registryPath)) {
    const registry = {
      version: '1.0.0',
      created: new Date().toISOString(),
      frameworks: frameworkDirs.map(fw => ({
        id: fw.id,
        installed: new Date().toISOString(),
        version: '1.0.0'
      }))
    };
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf8');
    console.log('Created framework registry at .aiwg/frameworks/registry.json');
  }
}

// ============================================================================
// AGENTS.md Template Handling
// ============================================================================

/**
 * Create or update AGENTS.md from template
 * Common logic used by multiple providers
 */
export function createAgentsMdFromTemplate(target, srcRoot, templateSubpath, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', templateSubpath);
  const destPath = path.join(target, 'AGENTS.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`AGENTS.md template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('AGENTS.md already contains AIWG section, skipping');
      return;
    }

    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1 ? template.slice(markerIndex) : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing AGENTS.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated AGENTS.md with AIWG SDLC framework section');
    }
  } else {
    if (dryRun) {
      console.log(`[dry-run] Would create AGENTS.md from template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created AGENTS.md from template');
    }
  }
}

// ============================================================================
// Agent Filtering
// ============================================================================

/**
 * Role mapping from model shorthand to role name
 */
const MODEL_TO_ROLE = {
  'opus': 'reasoning',
  'sonnet': 'coding',
  'haiku': 'efficiency'
};

/**
 * Check if an agent should be deployed based on filter options
 * @param {string} agentPath - Path to agent file
 * @param {object} metadata - Parsed frontmatter metadata
 * @param {object} opts - Options including filter and filterRole
 * @returns {boolean} - True if agent should be deployed
 */
export function shouldDeployAgent(agentPath, metadata, opts) {
  const { filter, filterRole } = opts;

  // No filters - deploy everything
  if (!filter && !filterRole) return true;

  // Filter by role (model tier)
  if (filterRole) {
    const model = (metadata.model || 'sonnet').toLowerCase();
    const role = MODEL_TO_ROLE[model] || 'coding';
    if (role !== filterRole.toLowerCase()) {
      return false;
    }
  }

  // Filter by glob pattern
  if (filter) {
    const agentName = path.basename(agentPath, '.md');
    if (!matchesGlob(agentName, filter)) {
      return false;
    }
  }

  return true;
}

/**
 * Simple glob pattern matching
 * Supports * (match any characters) and ? (match single character)
 * @param {string} str - String to match
 * @param {string} pattern - Glob pattern
 * @returns {boolean} - True if matches
 */
export function matchesGlob(str, pattern) {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
    .replace(/\*/g, '.*')                  // * matches any characters
    .replace(/\?/g, '.');                  // ? matches single character

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(str);
}

/**
 * Filter a list of agent files based on filter options
 * @param {string[]} files - List of file paths
 * @param {object} opts - Options including filter and filterRole
 * @returns {string[]} - Filtered list of file paths
 */
export function filterAgentFiles(files, opts) {
  const { filter, filterRole } = opts;

  // No filters - return all
  if (!filter && !filterRole) return files;

  return files.filter(filePath => {
    // Read and parse frontmatter to get metadata
    const content = fs.readFileSync(filePath, 'utf8');
    const { metadata } = parseFrontmatter(content);
    return shouldDeployAgent(filePath, metadata, opts);
  });
}

// ============================================================================
// Framework Discovery
// ============================================================================

const MODE_ALIASES = {
  writing: 'general',
  mmk: 'marketing'
};

const LEGACY_FRAMEWORK_MODE_ALIASES = {
  'sdlc-complete': ['sdlc'],
  'media-marketing-kit': ['marketing', 'mmk'],
  'media-curator': ['media-curator'],
  'research-complete': ['research']
};

const DEFAULT_FRAMEWORK_SUBDIRS = {
  'sdlc-complete': ['repo', 'projects', 'working', 'archive'],
  'media-marketing-kit': ['repo', 'campaigns', 'working', 'archive'],
  'media-curator': ['repo', 'library', 'working', 'archive'],
  'research-complete': ['repo', 'corpus', 'working', 'archive']
};

function normalizePathSegment(segment) {
  return String(segment || '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function ensureStringArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.map(v => String(v)) : [String(value)];
}

function uniqueLower(values) {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function normalizeDeploymentMode(mode = 'all') {
  const normalized = String(mode || 'all').toLowerCase();
  return MODE_ALIASES[normalized] || normalized;
}

function resolveFrameworkComponentDir(frameworkPath, manifest, component) {
  const entry = manifest?.entry?.[component];
  const relPath = normalizePathSegment(entry || component);
  return path.join(frameworkPath, relPath);
}

/**
 * Discover framework roots under agentic/code/frameworks.
 * Framework metadata is loaded from root manifest.json when present.
 */
export function discoverFrameworks(srcRoot) {
  const frameworksRoot = path.join(srcRoot, 'agentic', 'code', 'frameworks');
  if (!fs.existsSync(frameworksRoot)) return [];

  const frameworks = [];
  const entries = fs.readdirSync(frameworksRoot, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const frameworkPath = path.join(frameworksRoot, entry.name);
    const manifestPath = path.join(frameworkPath, 'manifest.json');
    let manifest = {};

    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        console.warn(`Warning: Could not parse framework manifest for ${entry.name}: ${e.message}`);
      }
    }

    const id = String(manifest.id || manifest.framework || entry.name);
    const aliases = uniqueLower([
      id,
      entry.name,
      ...ensureStringArray(manifest.modeAliases),
      ...ensureStringArray(manifest.aliases),
      ...(LEGACY_FRAMEWORK_MODE_ALIASES[id] || [])
    ]);

    const workspaceSubdirs = ensureStringArray(
      manifest.workspace?.subdirs || manifest.workspace?.directories
    );

    const agentsDir = resolveFrameworkComponentDir(frameworkPath, manifest, 'agents');
    const commandsDir = resolveFrameworkComponentDir(frameworkPath, manifest, 'commands');
    const skillsDir = resolveFrameworkComponentDir(frameworkPath, manifest, 'skills');
    const rulesDir = resolveFrameworkComponentDir(frameworkPath, manifest, 'rules');

    frameworks.push({
      id,
      name: manifest.name || entry.name,
      path: frameworkPath,
      manifest,
      aliases,
      workspaceSubdirs: workspaceSubdirs.length > 0
        ? workspaceSubdirs
        : (DEFAULT_FRAMEWORK_SUBDIRS[id] || ['repo', 'working', 'archive']),
      components: {
        agents: { path: agentsDir, exists: fs.existsSync(agentsDir) },
        commands: { path: commandsDir, exists: fs.existsSync(commandsDir) },
        skills: { path: skillsDir, exists: fs.existsSync(skillsDir) },
        rules: { path: rulesDir, exists: fs.existsSync(rulesDir) }
      }
    });
  }

  return frameworks;
}

/**
 * Select frameworks for a deployment mode.
 */
export function getFrameworksForMode(srcRoot, mode) {
  const normalizedMode = normalizeDeploymentMode(mode);
  const frameworks = discoverFrameworks(srcRoot);

  if (normalizedMode === 'all') return frameworks;
  if (normalizedMode === 'general') return [];
  if (normalizedMode === 'both') {
    return frameworks.filter(fw => fw.aliases.includes('sdlc'));
  }

  return frameworks.filter(fw =>
    fw.id.toLowerCase() === normalizedMode || fw.aliases.includes(normalizedMode)
  );
}

/**
 * Collect framework artifacts for a deployment mode.
 * @param {string} srcRoot - Source root directory
 * @param {string} mode - Deployment mode
 * @param {object} options - Collection options
 * @param {boolean} options.includeAgents - Include agents
 * @param {boolean} options.includeCommands - Include commands
 * @param {boolean} options.includeSkills - Include skills
 * @param {boolean} options.includeRules - Include rules
 * @param {boolean} options.recursiveCommands - Use recursive command listing
 * @param {boolean} options.consolidatedSdlcRules - Use RULES-INDEX for SDLC when available
 * @returns {{frameworks: Array, agents: string[], commands: string[], skills: string[], rules: string[]}}
 */
export function collectFrameworkArtifacts(srcRoot, mode, options = {}) {
  const {
    includeAgents = true,
    includeCommands = true,
    includeSkills = true,
    includeRules = true,
    recursiveCommands = true,
    consolidatedSdlcRules = true
  } = options;

  const frameworks = getFrameworksForMode(srcRoot, mode);
  const artifacts = {
    frameworks,
    agents: [],
    commands: [],
    skills: [],
    rules: []
  };

  for (const framework of frameworks) {
    if (includeAgents && framework.components.agents.exists) {
      artifacts.agents.push(...listMdFiles(framework.components.agents.path));
    }

    if (includeCommands && framework.components.commands.exists) {
      const commandFiles = recursiveCommands
        ? listMdFilesRecursive(framework.components.commands.path)
        : listMdFiles(framework.components.commands.path);
      artifacts.commands.push(...commandFiles);
    }

    if (includeSkills && framework.components.skills.exists) {
      artifacts.skills.push(...listSkillDirs(framework.components.skills.path));
    }

    if (includeRules && framework.components.rules.exists) {
      if (consolidatedSdlcRules && framework.id === 'sdlc-complete') {
        const indexPath = getRulesIndexPath(srcRoot);
        if (indexPath) {
          artifacts.rules.push(indexPath);
          continue;
        }
      }
      artifacts.rules.push(...listMdFiles(framework.components.rules.path));
    }
  }

  return artifacts;
}

// ============================================================================
// Addon Discovery
// ============================================================================

/**
 * Discover all addons in the agentic/code/addons directory
 * @param {string} srcRoot - Source root directory
 * @returns {Array<{name: string, path: string, manifest: object}>} - Array of addon info
 */
export function discoverAddons(srcRoot) {
  const addonsDir = path.join(srcRoot, 'agentic', 'code', 'addons');
  if (!fs.existsSync(addonsDir)) return [];

  const addons = [];
  for (const entry of fs.readdirSync(addonsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const addonPath = path.join(addonsDir, entry.name);
    const manifestPath = path.join(addonPath, 'manifest.json');

    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        console.warn(`Warning: Could not parse manifest for addon ${entry.name}: ${e.message}`);
      }
    }

    addons.push({
      name: entry.name,
      path: addonPath,
      manifest
    });
  }

  return addons;
}

/**
 * Get all agent files from all addons
 * @param {string} srcRoot - Source root directory
 * @param {string[]} excludeAddons - Addon names to exclude (default: none)
 * @returns {string[]} - Array of agent file paths
 */
export function getAddonAgentFiles(srcRoot, excludeAddons = []) {
  const addons = discoverAddons(srcRoot);
  const files = [];

  for (const addon of addons) {
    if (excludeAddons.includes(addon.name)) continue;

    const agentsDir = path.join(addon.path, 'agents');
    if (fs.existsSync(agentsDir)) {
      files.push(...listMdFiles(agentsDir));
    }
  }

  return files;
}

/**
 * Get all command files from all addons
 * @param {string} srcRoot - Source root directory
 * @param {string[]} excludeAddons - Addon names to exclude (default: none)
 * @returns {string[]} - Array of command file paths
 */
export function getAddonCommandFiles(srcRoot, excludeAddons = []) {
  const addons = discoverAddons(srcRoot);
  const files = [];

  for (const addon of addons) {
    if (excludeAddons.includes(addon.name)) continue;

    const commandsDir = path.join(addon.path, 'commands');
    if (fs.existsSync(commandsDir)) {
      files.push(...listMdFiles(commandsDir));
    }
  }

  return files;
}

/**
 * Get all skill directories from all addons
 * @param {string} srcRoot - Source root directory
 * @param {string[]} excludeAddons - Addon names to exclude (default: none)
 * @returns {string[]} - Array of skill directory paths
 */
export function getAddonSkillDirs(srcRoot, excludeAddons = []) {
  const addons = discoverAddons(srcRoot);
  const dirs = [];

  for (const addon of addons) {
    if (excludeAddons.includes(addon.name)) continue;

    const skillsDir = path.join(addon.path, 'skills');
    if (fs.existsSync(skillsDir)) {
      dirs.push(...listSkillDirs(skillsDir));
    }
  }

  return dirs;
}

/**
 * Get all rule files from all addons
 * @param {string} srcRoot - Source root directory
 * @param {string[]} excludeAddons - Addon names to exclude (default: none)
 * @returns {string[]} - Array of rule file paths
 */
export function getAddonRuleFiles(srcRoot, excludeAddons = []) {
  const addons = discoverAddons(srcRoot);
  const files = [];

  for (const addon of addons) {
    if (excludeAddons.includes(addon.name)) continue;

    const rulesDir = path.join(addon.path, 'rules');
    if (fs.existsSync(rulesDir)) {
      files.push(...listMdFiles(rulesDir));
    }
  }

  return files;
}

/**
 * Get addon files by category (agents, commands, skills, rules)
 * @param {string} srcRoot - Source root directory
 * @param {object} options - Options
 * @param {string[]} options.excludeAddons - Addon names to exclude
 * @param {boolean} options.includeAgents - Include agent files (default: true)
 * @param {boolean} options.includeCommands - Include command files (default: true)
 * @param {boolean} options.includeSkills - Include skill directories (default: true)
 * @param {boolean} options.includeRules - Include rule files (default: true)
 * @returns {{agents: string[], commands: string[], skills: string[], rules: string[]}}
 */
export function getAddonFiles(srcRoot, options = {}) {
  const {
    excludeAddons = [],
    includeAgents = true,
    includeCommands = true,
    includeSkills = true,
    includeRules = true
  } = options;

  return {
    agents: includeAgents ? getAddonAgentFiles(srcRoot, excludeAddons) : [],
    commands: includeCommands ? getAddonCommandFiles(srcRoot, excludeAddons) : [],
    skills: includeSkills ? getAddonSkillDirs(srcRoot, excludeAddons) : [],
    rules: includeRules ? getAddonRuleFiles(srcRoot, excludeAddons) : []
  };
}

// ============================================================================
// Consolidated Rules Deployment
// ============================================================================

/**
 * Load rules manifest from source directory
 * @param {string} srcRoot - Source root directory
 * @returns {object|null} - Parsed manifest or null if not found
 */
export function loadRulesManifest(srcRoot) {
  const manifestPath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    console.warn(`Warning: Could not parse rules manifest: ${e.message}`);
    return null;
  }
}

/**
 * Group rules by tier
 * @param {Array} rules - Array of rule objects from manifest
 * @returns {{core: Array, sdlc: Array, research: Array}}
 */
export function groupRulesByTier(rules) {
  const groups = { core: [], sdlc: [], research: [] };
  for (const rule of rules) {
    const tier = rule.tier || 'sdlc';
    if (groups[tier]) {
      groups[tier].push(rule);
    }
  }
  return groups;
}

/**
 * Group rules by enforcement level within a tier
 * @param {Array} rules - Array of rule objects
 * @returns {{critical: Array, high: Array, medium: Array}}
 */
export function groupByEnforcement(rules) {
  const groups = { critical: [], high: [], medium: [] };
  for (const rule of rules) {
    const level = (rule.enforcement || 'medium').toLowerCase();
    if (groups[level]) {
      groups[level].push(rule);
    }
  }
  return groups;
}

/**
 * Get the RULES-INDEX.md file path from source
 * @param {string} srcRoot - Source root directory
 * @returns {string|null} - Path to RULES-INDEX.md or null
 */
export function getRulesIndexPath(srcRoot) {
  const indexPath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules', 'RULES-INDEX.md');
  return fs.existsSync(indexPath) ? indexPath : null;
}

/**
 * Generate consolidated rules content from manifest for a specific provider.
 * Used by content-injection providers (copilot, warp, windsurf) that need
 * the rules content inline rather than as a file.
 *
 * @param {string} srcRoot - Source root directory
 * @param {string} provider - Provider name (for @-link formatting)
 * @param {string[]} [addonRuleFiles] - Optional addon rule file paths
 * @returns {string|null} - Generated content or null if manifest/index missing
 */
export function generateConsolidatedRulesContent(srcRoot, provider, addonRuleFiles = []) {
  const indexPath = getRulesIndexPath(srcRoot);
  if (!indexPath) return null;

  let content = fs.readFileSync(indexPath, 'utf8');

  // Append addon rules section if any addon rules exist
  if (addonRuleFiles.length > 0) {
    content += '\n\n---\n\n## Addon Rules\n\n';
    for (const ruleFile of addonRuleFiles) {
      const ruleName = path.basename(ruleFile, '.md');
      content += `- **${ruleName}**: @${path.relative(srcRoot, ruleFile)}\n`;
    }
  }

  return content;
}

/**
 * Clean up old individually-deployed rule files from target directory.
 * Removes any .md files that are NOT RULES-INDEX.md.
 *
 * @param {string} rulesDir - Target rules directory
 * @param {object} opts - Options
 * @param {boolean} opts.dryRun - If true, log but don't delete
 * @returns {string[]} - List of removed (or would-be-removed) file paths
 */
export function cleanupOldRuleFiles(rulesDir, opts = {}) {
  const { dryRun = false } = opts;
  const removed = [];

  if (!fs.existsSync(rulesDir)) return removed;

  const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    if (entry.name === 'RULES-INDEX.md') continue;

    const filePath = path.join(rulesDir, entry.name);
    removed.push(filePath);

    if (dryRun) {
      console.log(`[dry-run] would remove old rule: ${entry.name}`);
    } else {
      fs.unlinkSync(filePath);
      console.log(`removed old rule: ${entry.name}`);
    }
  }

  if (removed.length > 0) {
    console.log(`cleaned up ${removed.length} old rule file(s) from ${rulesDir}`);
  }

  return removed;
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Base provider interface - all providers should implement these methods
 */
export const ProviderInterface = {
  name: 'base',
  aliases: [],

  // ── Path Configuration ──────────────────────────────────────────────
  // ALL four paths are REQUIRED for v2. Every provider deploys every artifact type.
  // Provider dictates which directories to use; null paths are no longer allowed.
  paths: {
    agents: null,
    commands: null,
    skills: null,
    rules: null
  },

  // ── Support Level per Artifact Type ─────────────────────────────────
  // Distinguishes native platform support from AIWG conventional directories.
  //   'native'       - Platform natively discovers and uses these files
  //   'conventional' - AIWG directory convention; available for @-mention context loading
  //   'aggregated'   - Content included in aggregated file AND deployed as discrete files
  support: {
    agents: 'conventional',
    commands: 'conventional',
    skills: 'conventional',
    rules: 'conventional'
  },

  // ── Provider Capabilities ───────────────────────────────────────────
  capabilities: {
    skills: false,
    rules: false,
    aggregatedOutput: false,
    yamlFormat: false,
    mdcFormat: false,
    homeDirectoryDeploy: false,
    projectLocalMirror: false
  },

  // ── Home Directory Paths (Codex-specific) ───────────────────────────
  // Only populated for providers that deploy to home directory.
  homePaths: {
    commands: null,
    skills: null
  },

  // ── Artifact Transformation ─────────────────────────────────────────
  transformAgent(srcPath, content, opts) { return content; },
  transformCommand(srcPath, content, opts) { return content; },
  transformSkill(srcPath, content, opts) { return content; },
  transformRule(srcPath, content, opts) { return content; },

  // ── Model Mapping ──────────────────────────────────────────────────
  mapModel(shorthand, modelCfg, modelsConfig) { return shorthand; },

  // ── Deployment Functions ────────────────────────────────────────────
  // All four deploy functions are available. Providers override as needed.
  deployAgents(agentFiles, targetDir, opts) {},
  deployCommands(commandFiles, targetDir, opts) {},
  deploySkills(skillDirs, targetDir, opts) {},
  deployRules(ruleFiles, targetDir, opts) {},

  // ── Aggregation (for Warp, Windsurf) ────────────────────────────────
  aggregate(artifacts, targetDir, opts) {},

  // ── Create/update AGENTS.md ────────────────────────────────────────
  createAgentsMd(target, srcRoot, dryRun) {
    // Override in provider
  },

  // ── Post-deployment hook ───────────────────────────────────────────
  async postDeploy(targetDir, opts) {
    // Override in provider if needed
  },

  // ── File Extension ────────────────────────────────────────────────
  getFileExtension(type) { return '.md'; }
};
