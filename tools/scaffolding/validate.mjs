#!/usr/bin/env node

/**
 * CLI tool to validate AIWG packages (addons, extensions, frameworks)
 * Usage: aiwg validate <path> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  readJson,
  writeJson,
  detectAiwgPath,
  getAddonsPath,
  getFrameworksPath,
  printSuccess,
  printError,
  printInfo,
  printHeader,
  printWarning,
} from './utils.mjs';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, basename, dirname, resolve } from 'path';

const { positional, flags } = parseArgs(process.argv);

const targetPath = positional[0];
const fix = flags.fix || flags.f;
const verbose = flags.verbose || flags.v;
const help = flags.help || flags.h;

function printHelp() {
  console.log(`
Usage: aiwg validate <path> [options]

Validate an AIWG package (addon, extension, or framework).

Arguments:
  path                  Path to package or package name

Options:
  --fix, -f             Auto-fix discoverable issues
  --verbose, -v         Show detailed output
  --help, -h            Show this help

Examples:
  aiwg validate aiwg-utils
  aiwg validate sdlc-complete --verbose
  aiwg validate my-addon --fix
  aiwg validate sdlc-complete/extensions/hipaa

Checks:
  - Manifest schema compliance
  - Required fields present
  - Component files exist
  - Directory structure matches type
  - Extension parent framework exists
`);
}

// Validation results collector
class ValidationResult {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixed = [];
    this.passed = [];
  }

  error(msg, fixable = false) {
    this.errors.push({ msg, fixable });
  }

  warning(msg) {
    this.warnings.push(msg);
  }

  pass(msg) {
    this.passed.push(msg);
  }

  addFixed(msg) {
    this.fixed.push(msg);
  }

  get hasErrors() {
    return this.errors.length > 0;
  }

  get fixableErrors() {
    return this.errors.filter(e => e.fixable);
  }

  get unfixableErrors() {
    return this.errors.filter(e => !e.fixable);
  }
}

function resolvePath(target) {
  const aiwgPath = detectAiwgPath();
  if (!aiwgPath) return null;

  // Direct path
  if (existsSync(target)) {
    return resolve(target);
  }

  // Check addons
  const addonPath = join(getAddonsPath(), target);
  if (existsSync(addonPath)) {
    return addonPath;
  }

  // Check frameworks
  const frameworkPath = join(getFrameworksPath(), target);
  if (existsSync(frameworkPath)) {
    return frameworkPath;
  }

  // Check extension path (framework/extensions/name)
  if (target.includes('/extensions/')) {
    const parts = target.split('/extensions/');
    const extPath = join(getFrameworksPath(), parts[0], 'extensions', parts[1]);
    if (existsSync(extPath)) {
      return extPath;
    }
  }

  return null;
}

function validateManifest(packagePath, result, shouldFix) {
  const manifestPath = join(packagePath, 'manifest.json');

  // Check manifest exists
  if (!existsSync(manifestPath)) {
    result.error('manifest.json not found', true);
    if (shouldFix) {
      // Generate basic manifest
      const name = basename(packagePath);
      const manifest = {
        id: name,
        type: 'addon',
        name: formatName(name).title,
        version: '1.0.0',
        description: `${formatName(name).title} package`,
        entry: { agents: 'agents', commands: 'commands', skills: 'skills' },
        agents: [],
        commands: [],
        skills: [],
      };
      writeJson(manifestPath, manifest);
      result.addFixed('Created manifest.json');
    }
    return null;
  }

  result.pass('manifest.json exists');

  // Parse manifest
  let manifest;
  try {
    manifest = readJson(manifestPath);
    result.pass('manifest.json is valid JSON');
  } catch (e) {
    result.error(`manifest.json is not valid JSON: ${e.message}`, false);
    return null;
  }

  // Required fields
  const requiredFields = ['id', 'type', 'name', 'version', 'description'];
  for (const field of requiredFields) {
    if (!manifest[field]) {
      result.error(`Missing required field: ${field}`, false);
    } else {
      result.pass(`Required field present: ${field}`);
    }
  }

  // Type validation
  const validTypes = ['addon', 'framework', 'extension'];
  if (manifest.type && !validTypes.includes(manifest.type)) {
    result.error(`Invalid type: ${manifest.type} (must be addon, framework, or extension)`, false);
  } else if (manifest.type) {
    result.pass(`Valid type: ${manifest.type}`);
  }

  return manifest;
}

function validateDirectories(packagePath, manifest, result, shouldFix) {
  const entry = manifest.entry || {};

  // Expected directories based on type
  const expectedDirs = [];

  if (entry.agents) expectedDirs.push(entry.agents);
  if (entry.commands) expectedDirs.push(entry.commands);
  if (entry.skills) expectedDirs.push(entry.skills);
  if (entry.templates) expectedDirs.push(entry.templates);

  // Framework-specific directories
  if (manifest.type === 'framework') {
    expectedDirs.push('flows', 'metrics', 'config', 'extensions', 'docs');
  }

  // Extension-specific directories
  if (manifest.type === 'extension') {
    if (entry.checklists) expectedDirs.push(entry.checklists);
  }

  for (const dir of expectedDirs) {
    const dirPath = join(packagePath, dir);
    if (!existsSync(dirPath)) {
      result.error(`Missing directory: ${dir}/`, true);
      if (shouldFix) {
        ensureDir(dirPath);
        result.addFixed(`Created directory: ${dir}/`);
      }
    } else {
      result.pass(`Directory exists: ${dir}/`);
    }
  }
}

function validateComponents(packagePath, manifest, result, shouldFix) {
  const entry = manifest.entry || {};
  let manifestUpdated = false;

  // Helper to validate component type
  function validateComponentType(componentType, dirName, extension = '.md') {
    const components = manifest[componentType] || [];
    const dirPath = join(packagePath, dirName);

    if (!existsSync(dirPath)) return;

    // Check manifest entries exist as files
    for (const name of components) {
      const filePath = join(dirPath, `${name}${extension}`);
      if (!existsSync(filePath)) {
        result.error(`${componentType} "${name}" listed in manifest but file not found: ${filePath}`, true);
        if (shouldFix) {
          // Remove from manifest
          manifest[componentType] = manifest[componentType].filter(n => n !== name);
          manifestUpdated = true;
          result.addFixed(`Removed orphaned ${componentType} entry: ${name}`);
        }
      } else {
        result.pass(`${componentType} file exists: ${name}${extension}`);
      }
    }

    // Check for files not in manifest
    try {
      const files = readdirSync(dirPath).filter(f => f.endsWith(extension));
      for (const file of files) {
        const name = basename(file, extension);
        if (!components.includes(name)) {
          result.warning(`${componentType} file "${name}" not listed in manifest`);
          if (shouldFix) {
            if (!manifest[componentType]) manifest[componentType] = [];
            manifest[componentType].push(name);
            manifest[componentType].sort();
            manifestUpdated = true;
            result.addFixed(`Added ${componentType} to manifest: ${name}`);
          }
        }
      }
    } catch (e) {
      // Directory might not exist or be empty
    }
  }

  // Validate each component type
  if (entry.agents) validateComponentType('agents', entry.agents);
  if (entry.commands) validateComponentType('commands', entry.commands);

  // Skills are special - they're directories, not files
  if (entry.skills) {
    const skillsDir = join(packagePath, entry.skills);
    if (existsSync(skillsDir)) {
      const skillDirs = readdirSync(skillsDir).filter(f => {
        const stat = statSync(join(skillsDir, f));
        return stat.isDirectory();
      });

      const manifestSkills = manifest.skills || [];

      for (const name of manifestSkills) {
        const skillPath = join(skillsDir, name, 'SKILL.md');
        if (!existsSync(skillPath)) {
          result.error(`Skill "${name}" listed in manifest but SKILL.md not found`, true);
          if (shouldFix) {
            manifest.skills = manifest.skills.filter(n => n !== name);
            manifestUpdated = true;
            result.addFixed(`Removed orphaned skill entry: ${name}`);
          }
        } else {
          result.pass(`Skill exists: ${name}`);
        }
      }

      for (const dir of skillDirs) {
        const skillPath = join(skillsDir, dir, 'SKILL.md');
        if (existsSync(skillPath) && !manifestSkills.includes(dir)) {
          result.warning(`Skill "${dir}" not listed in manifest`);
          if (shouldFix) {
            if (!manifest.skills) manifest.skills = [];
            manifest.skills.push(dir);
            manifest.skills.sort();
            manifestUpdated = true;
            result.addFixed(`Added skill to manifest: ${dir}`);
          }
        }
      }
    }
  }

  // Save updated manifest
  if (manifestUpdated && shouldFix) {
    writeJson(join(packagePath, 'manifest.json'), manifest);
    result.addFixed('Updated manifest.json');
  }
}

function validateExtension(packagePath, manifest, result) {
  // Extension must have requires field
  if (!manifest.requires || !Array.isArray(manifest.requires) || manifest.requires.length === 0) {
    result.error('Extension must have "requires" field with parent framework(s)', false);
    return;
  }

  result.pass(`Extension requires: ${manifest.requires.join(', ')}`);

  // Check parent framework exists
  for (const parent of manifest.requires) {
    const parentPath = join(getFrameworksPath(), parent);
    if (!existsSync(parentPath)) {
      result.error(`Parent framework not found: ${parent}`, false);
    } else {
      result.pass(`Parent framework exists: ${parent}`);
    }
  }

  // Check extension is in correct location
  const expectedParent = manifest.requires[0];
  const actualPath = packagePath;
  const expectedPath = join(getFrameworksPath(), expectedParent, 'extensions');

  if (!actualPath.includes(expectedPath)) {
    result.warning(`Extension should be in ${expectedPath}/, found in ${dirname(actualPath)}/`);
  } else {
    result.pass('Extension in correct location');
  }
}

function validateFramework(packagePath, manifest, result, shouldFix) {
  // Framework should have phases
  if (!manifest.phases || !Array.isArray(manifest.phases) || manifest.phases.length === 0) {
    result.error('Framework should have "phases" array', false);
  } else {
    result.pass(`Framework phases: ${manifest.phases.join(' → ')}`);

    // Check flow files exist for each phase
    const flowsDir = join(packagePath, 'flows');
    if (existsSync(flowsDir)) {
      for (const phase of manifest.phases) {
        const flowPath = join(flowsDir, `${phase}.md`);
        if (!existsSync(flowPath)) {
          result.warning(`Missing flow document for phase: ${phase}`);
        } else {
          result.pass(`Flow document exists: ${phase}.md`);
        }
      }
    }
  }

  // Check framework-specific files
  const requiredFiles = [
    'actors-and-templates.md',
    'config/models.json',
    'metrics/tracking-catalog.md',
  ];

  for (const file of requiredFiles) {
    const filePath = join(packagePath, file);
    if (!existsSync(filePath)) {
      result.warning(`Missing recommended file: ${file}`);
    } else {
      result.pass(`File exists: ${file}`);
    }
  }
}

function validateReadme(packagePath, result, shouldFix) {
  const readmePath = join(packagePath, 'README.md');

  if (!existsSync(readmePath)) {
    result.error('README.md not found', true);
    if (shouldFix) {
      const name = basename(packagePath);
      const readme = `# ${formatName(name).title}\n\nDescription pending.\n`;
      writeFileSync(readmePath, readme);
      result.addFixed('Created README.md');
    }
  } else {
    const content = readFileSync(readmePath, 'utf-8');
    if (content.trim().length < 10) {
      result.warning('README.md is nearly empty');
    } else {
      result.pass('README.md exists and has content');
    }
  }
}

function printResults(result, packagePath, verbose) {
  const packageName = basename(packagePath);

  printHeader(`Validation: ${packageName}`);

  if (verbose) {
    // Detailed output
    if (result.passed.length > 0) {
      console.log('\n[Passed]');
      for (const msg of result.passed) {
        console.log(`  ✓ ${msg}`);
      }
    }

    if (result.warnings.length > 0) {
      console.log('\n[Warnings]');
      for (const msg of result.warnings) {
        console.log(`  ⚠ ${msg}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('\n[Errors]');
      for (const { msg, fixable } of result.errors) {
        const suffix = fixable ? ' (fixable)' : '';
        console.log(`  ✗ ${msg}${suffix}`);
      }
    }

    if (result.fixed.length > 0) {
      console.log('\n[Fixed]');
      for (const msg of result.fixed) {
        console.log(`  ✓ ${msg}`);
      }
    }
  }

  // Summary
  console.log('\n[Summary]');
  console.log(`  Passed:   ${result.passed.length}`);
  console.log(`  Warnings: ${result.warnings.length}`);
  console.log(`  Errors:   ${result.errors.length}`);
  if (result.fixed.length > 0) {
    console.log(`  Fixed:    ${result.fixed.length}`);
  }

  console.log('');
  if (result.hasErrors) {
    if (result.unfixableErrors.length > 0) {
      printError(`FAILED: ${result.unfixableErrors.length} unfixable error(s)`);
    } else if (result.fixableErrors.length > 0) {
      printWarning(`FAILED: ${result.fixableErrors.length} fixable error(s) - run with --fix`);
    }
  } else {
    printSuccess('PASSED: Package is valid');
  }
}

async function main() {
  if (help || !targetPath) {
    printHelp();
    process.exit(help ? 0 : 1);
  }

  const aiwgPath = detectAiwgPath();
  if (!aiwgPath) {
    printError('AIWG installation not found. Set AIWG_ROOT environment variable.');
    process.exit(1);
  }

  const packagePath = resolvePath(targetPath);
  if (!packagePath) {
    printError(`Package not found: ${targetPath}`);
    process.exit(1);
  }

  const result = new ValidationResult();

  // Run validations
  const manifest = validateManifest(packagePath, result, fix);

  if (manifest) {
    validateDirectories(packagePath, manifest, result, fix);
    validateComponents(packagePath, manifest, result, fix);
    validateReadme(packagePath, result, fix);

    // Type-specific validations
    if (manifest.type === 'extension') {
      validateExtension(packagePath, manifest, result);
    } else if (manifest.type === 'framework') {
      validateFramework(packagePath, manifest, result, fix);
    }
  }

  // Print results
  printResults(result, packagePath, verbose);

  // Exit code
  if (result.unfixableErrors.length > 0) {
    process.exit(2);
  } else if (result.fixableErrors.length > 0 && !fix) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
