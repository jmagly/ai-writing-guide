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
 */
export function ensureDir(d) {
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
export function initializeFrameworkWorkspace(target, mode, dryRun) {
  const aiwgBase = path.join(target, '.aiwg');
  const frameworksDir = path.join(aiwgBase, 'frameworks');
  const sharedDir = path.join(aiwgBase, 'shared');

  const frameworkDirs = [];

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
// Provider Interface
// ============================================================================

/**
 * Base provider interface - all providers should implement these methods
 */
export const ProviderInterface = {
  name: 'base',
  aliases: [],

  paths: {
    agents: null,
    commands: null,
    skills: null,
    rules: null
  },

  capabilities: {
    skills: false,
    rules: false,
    aggregatedOutput: false,
    yamlFormat: false
  },

  // Transform agent content for this provider
  transformAgent(srcPath, content, opts) {
    return content;
  },

  // Transform command content for this provider
  transformCommand(srcPath, content, opts) {
    return content;
  },

  // Map model shorthand to provider-specific format
  mapModel(shorthand, modelCfg, modelsConfig) {
    return shorthand;
  },

  // Create/update AGENTS.md for this provider
  createAgentsMd(target, srcRoot, dryRun) {
    // Override in provider
  },

  // Post-deployment hook (e.g., Factory settings.json)
  async postDeploy(targetDir, opts) {
    // Override in provider if needed
  },

  // Get file extension for this provider
  getFileExtension(type) {
    return '.md';
  }
};
