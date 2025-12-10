/**
 * Shared utilities for AIWG scaffolding tools
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join, dirname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect AIWG installation path with multiple fallbacks
 */
export function detectAiwgPath() {
  // 1. Environment variable
  if (process.env.AIWG_ROOT && existsSync(process.env.AIWG_ROOT)) {
    return process.env.AIWG_ROOT;
  }

  // 2. Standard install location
  const standardPath = join(process.env.HOME || '', '.local/share/ai-writing-guide');
  if (existsSync(standardPath)) {
    return standardPath;
  }

  // 3. Source repo (development mode) - relative to this file
  const repoRoot = resolve(__dirname, '../..');
  if (existsSync(join(repoRoot, 'agentic/code'))) {
    return repoRoot;
  }

  // 4. Current working directory
  if (existsSync(join(process.cwd(), 'agentic/code'))) {
    return process.cwd();
  }

  return null;
}

/**
 * Get path to devkit templates
 */
export function getTemplatesPath() {
  const aiwgPath = detectAiwgPath();
  if (!aiwgPath) {
    throw new Error('AIWG installation not found. Set AIWG_ROOT or install AIWG.');
  }
  return join(aiwgPath, 'agentic/code/addons/aiwg-utils/templates/devkit');
}

/**
 * Get path to frameworks directory
 */
export function getFrameworksPath() {
  const aiwgPath = detectAiwgPath();
  if (!aiwgPath) {
    throw new Error('AIWG installation not found.');
  }
  return join(aiwgPath, 'agentic/code/frameworks');
}

/**
 * Get path to addons directory
 */
export function getAddonsPath() {
  const aiwgPath = detectAiwgPath();
  if (!aiwgPath) {
    throw new Error('AIWG installation not found.');
  }
  return join(aiwgPath, 'agentic/code/addons');
}

/**
 * Ensure directory exists, creating recursively if needed
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * Write file if it doesn't exist (non-destructive)
 */
export function writeFileIfNotExists(filePath, content, options = {}) {
  const { force = false } = options;
  if (existsSync(filePath) && !force) {
    return { written: false, reason: 'exists' };
  }
  ensureDir(dirname(filePath));
  writeFileSync(filePath, content, 'utf8');
  return { written: true };
}

/**
 * Read and parse JSON file
 */
export function readJson(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

/**
 * Write JSON file with consistent formatting
 */
export function writeJson(filePath, data) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Update manifest.json to add a component
 */
export function updateManifest(manifestPath, componentType, componentName) {
  const manifest = readJson(manifestPath);
  if (!manifest) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  // Ensure array exists
  if (!Array.isArray(manifest[componentType])) {
    manifest[componentType] = [];
  }

  // Add if not present
  if (!manifest[componentType].includes(componentName)) {
    manifest[componentType].push(componentName);
    manifest[componentType].sort(); // Alphabetical order
  }

  writeJson(manifestPath, manifest);
  return manifest;
}

/**
 * Convert name to various formats
 */
export function formatName(name) {
  // Normalize to kebab-case
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Title case
  const title = kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // PascalCase
  const pascal = kebab
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  // camelCase
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);

  return { kebab, title, pascal, camel };
}

/**
 * Simple template substitution
 */
export function substituteTemplate(template, vars) {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Load template file from devkit templates
 */
export function loadTemplate(templateName) {
  const templatesPath = getTemplatesPath();
  const templatePath = join(templatesPath, templateName);

  if (!existsSync(templatePath)) {
    return null;
  }

  return readFileSync(templatePath, 'utf8');
}

/**
 * List available frameworks
 */
export function listFrameworks() {
  const frameworksPath = getFrameworksPath();
  if (!existsSync(frameworksPath)) {
    return [];
  }

  return readdirSync(frameworksPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => existsSync(join(frameworksPath, name, 'manifest.json')));
}

/**
 * List available addons
 */
export function listAddons() {
  const addonsPath = getAddonsPath();
  if (!existsSync(addonsPath)) {
    return [];
  }

  return readdirSync(addonsPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => existsSync(join(addonsPath, name, 'manifest.json')));
}

/**
 * Resolve target path (addon, framework, or extension)
 */
export function resolveTargetPath(target) {
  // Check if it's a path to extension (framework/extensions/name)
  if (target.includes('/extensions/')) {
    const frameworksPath = getFrameworksPath();
    const fullPath = join(frameworksPath, target);
    if (existsSync(fullPath)) {
      return { type: 'extension', path: fullPath, target };
    }
    // Check if parent framework exists (for creating new extensions)
    const parts = target.split('/extensions/');
    const frameworkPath = join(frameworksPath, parts[0]);
    if (existsSync(frameworkPath)) {
      return { type: 'extension', path: fullPath, target, frameworkPath };
    }
  }

  // Check frameworks
  const frameworksPath = getFrameworksPath();
  const frameworkPath = join(frameworksPath, target);
  if (existsSync(join(frameworkPath, 'manifest.json'))) {
    return { type: 'framework', path: frameworkPath, target };
  }

  // Check addons
  const addonsPath = getAddonsPath();
  const addonPath = join(addonsPath, target);
  if (existsSync(join(addonPath, 'manifest.json'))) {
    return { type: 'addon', path: addonPath, target };
  }

  return null;
}

/**
 * Parse CLI arguments
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    positional: [],
    flags: {},
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // Check if next arg is a value or another flag
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.flags[key] = args[i + 1];
        i += 2;
      } else {
        result.flags[key] = true;
        i += 1;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.flags[key] = args[i + 1];
        i += 2;
      } else {
        result.flags[key] = true;
        i += 1;
      }
    } else {
      result.positional.push(arg);
      i += 1;
    }
  }

  return result;
}

/**
 * Print success message
 */
export function printSuccess(message) {
  console.log(`✓ ${message}`);
}

/**
 * Print error message
 */
export function printError(message) {
  console.error(`✗ ${message}`);
}

/**
 * Print info message
 */
export function printInfo(message) {
  console.log(`  ${message}`);
}

/**
 * Print warning message
 */
export function printWarning(message) {
  console.log(`⚠ ${message}`);
}

/**
 * Print section header
 */
export function printHeader(title) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
}

/**
 * Generate timestamp for filenames
 */
export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/**
 * Validate manifest has required fields
 */
export function validateManifest(manifest, type = 'addon') {
  const errors = [];

  const requiredFields = ['id', 'type', 'name', 'version', 'description'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.type !== type) {
    errors.push(`Expected type '${type}', got '${manifest.type}'`);
  }

  if (type === 'extension' && !manifest.requires) {
    errors.push("Extension must have 'requires' field specifying parent framework");
  }

  return errors;
}
