#!/usr/bin/env node

/**
 * AIWG Skills Deployment Script
 *
 * Deploys AIWG skills to target platforms (Claude Code, Factory AI)
 *
 * Usage:
 *   node deploy-skills.mjs [options]
 *
 * Options:
 *   --target <path>        Target project directory (default: current directory)
 *   --provider <name>      Target provider: claude (default), factory
 *   --mode <mode>          Deployment mode: all, sdlc, mmk, addons (default: all)
 *   --dry-run              Show what would be deployed without writing
 *   --force                Overwrite existing files
 *   --list                 List available skills and exit
 *
 * Skills Sources:
 *   - agentic/code/addons/<addon>/skills/
 *   - agentic/code/frameworks/<framework>/skills/
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// AIWG root directory
const AIWG_ROOT = process.env.AIWG_ROOT || path.resolve(__dirname, '../..');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: process.cwd(),
    provider: 'claude',
    mode: 'all',
    dryRun: false,
    force: false,
    list: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--target':
        options.target = args[++i];
        break;
      case '--provider':
        options.provider = args[++i]?.toLowerCase();
        break;
      case '--mode':
        options.mode = args[++i]?.toLowerCase();
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--force':
        options.force = true;
        break;
      case '--list':
        options.list = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
AIWG Skills Deployment Script

Usage:
  node deploy-skills.mjs [options]

Options:
  --target <path>        Target project directory (default: current directory)
  --provider <name>      Target provider: claude (default), factory
  --mode <mode>          Deployment mode: all, sdlc, mmk, addons (default: all)
  --dry-run              Show what would be deployed without writing
  --force                Overwrite existing files
  --list                 List available skills and exit
  --help, -h             Show this help message

Examples:
  # Deploy all skills for Claude Code
  node deploy-skills.mjs --provider claude

  # Deploy SDLC skills to Factory
  node deploy-skills.mjs --provider factory --mode sdlc

  # Preview what would be deployed
  node deploy-skills.mjs --provider factory --dry-run

  # List available skills
  node deploy-skills.mjs --list
`);
}

/**
 * Discover all SKILL.md files in AIWG
 */
function discoverSkills() {
  const skills = [];

  // Addon skills
  const addonsDir = path.join(AIWG_ROOT, 'agentic/code/addons');
  if (fs.existsSync(addonsDir)) {
    for (const addon of fs.readdirSync(addonsDir)) {
      const skillsDir = path.join(addonsDir, addon, 'skills');
      if (fs.existsSync(skillsDir)) {
        for (const skillName of fs.readdirSync(skillsDir)) {
          const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            skills.push({
              name: skillName,
              source: `addon:${addon}`,
              category: 'addons',
              path: skillPath,
            });
          }
        }
      }
    }
  }

  // Framework skills
  const frameworksDir = path.join(AIWG_ROOT, 'agentic/code/frameworks');
  if (fs.existsSync(frameworksDir)) {
    for (const framework of fs.readdirSync(frameworksDir)) {
      const skillsDir = path.join(frameworksDir, framework, 'skills');
      if (fs.existsSync(skillsDir)) {
        const category = framework === 'sdlc-complete' ? 'sdlc' :
                         framework === 'media-marketing-kit' ? 'mmk' : 'other';
        for (const skillName of fs.readdirSync(skillsDir)) {
          const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
          if (fs.existsSync(skillPath)) {
            skills.push({
              name: skillName,
              source: `framework:${framework}`,
              category,
              path: skillPath,
            });
          }
        }
      }
    }
  }

  return skills;
}

/**
 * Parse skill file and extract/generate frontmatter
 */
function parseSkillFile(skillPath) {
  const content = fs.readFileSync(skillPath, 'utf8');

  // Check if file has YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (fmMatch) {
    // Has frontmatter - parse it
    const frontmatter = fmMatch[1];
    const body = fmMatch[2];

    const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
    const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
    const version = frontmatter.match(/version:\s*(.+)/)?.[1]?.trim();

    return {
      name,
      description,
      version,
      body,
      hasFrontmatter: true,
    };
  } else {
    // No frontmatter - extract from content
    const lines = content.split('\n');
    let name = '';
    let description = '';

    // First heading is the name
    for (const line of lines) {
      if (line.startsWith('# ')) {
        name = line.replace('# ', '').trim().toLowerCase().replace(/\s+/g, '-');
        break;
      }
    }

    // Find description - usually first paragraph after heading or "Purpose" section
    let inDescription = false;
    for (const line of lines) {
      if (line.startsWith('## Purpose') || line.startsWith('## Description')) {
        inDescription = true;
        continue;
      }
      if (inDescription && line.trim() && !line.startsWith('#')) {
        description = line.trim();
        break;
      }
      // Also check for first paragraph after main heading
      if (!description && line.trim() && !line.startsWith('#') && name) {
        description = line.trim();
        break;
      }
    }

    return {
      name,
      description: description || 'AIWG skill - see documentation for details.',
      version: '1.0.0',
      body: content,
      hasFrontmatter: false,
    };
  }
}

/**
 * Transform skill content for Factory format
 * Factory expects: name, description in frontmatter
 * Body should have Instructions and optionally Success Criteria sections
 */
function transformToFactory(skillInfo, originalContent) {
  const { name, description, body, hasFrontmatter } = skillInfo;

  // Factory-optimized description (add usage hints if not present)
  let factoryDescription = description;
  if (!description.includes('Use when')) {
    factoryDescription = `${description} Use when relevant to the task.`;
  }

  // Build Factory-compatible SKILL.md
  let factoryContent = `---
name: ${name}
description: ${factoryDescription}
---

`;

  // Add body - if no frontmatter originally, keep as is
  // If had frontmatter, we already have the body extracted
  if (hasFrontmatter) {
    factoryContent += body;
  } else {
    factoryContent += originalContent;
  }

  return factoryContent;
}

/**
 * Transform skill content for Claude Code format
 * Claude Code format is similar but may have additional fields
 */
function transformToClaude(skillInfo, originalContent) {
  const { name, description, version, body, hasFrontmatter } = skillInfo;

  // Build Claude-compatible SKILL.md
  let claudeContent = `---
name: ${name}
description: ${description}
version: ${version || '1.0.0'}
---

`;

  if (hasFrontmatter) {
    claudeContent += body;
  } else {
    claudeContent += originalContent;
  }

  return claudeContent;
}

/**
 * Deploy skills to target
 */
function deploySkills(skills, options) {
  const { target, provider, mode, dryRun, force } = options;

  // Filter skills by mode
  let filteredSkills = skills;
  if (mode !== 'all') {
    filteredSkills = skills.filter(s => {
      if (mode === 'sdlc') return s.category === 'sdlc' || s.category === 'addons';
      if (mode === 'mmk') return s.category === 'mmk' || s.category === 'addons';
      if (mode === 'addons') return s.category === 'addons';
      return true;
    });
  }

  // Determine output directory
  const skillsDir = provider === 'factory'
    ? path.join(target, '.factory', 'skills')
    : path.join(target, '.claude', 'skills');

  // Create directory
  if (!dryRun && !fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }

  console.log(`\nDeploying ${filteredSkills.length} skills to ${provider}...`);
  console.log(`Target: ${skillsDir}\n`);

  let deployed = 0;
  let skipped = 0;
  let errors = 0;

  for (const skill of filteredSkills) {
    const skillDir = path.join(skillsDir, skill.name);
    const skillFile = path.join(skillDir, 'SKILL.md');

    // Check if exists
    if (fs.existsSync(skillFile) && !force) {
      if (!dryRun) {
        console.log(`  [SKIP] ${skill.name} (exists, use --force to overwrite)`);
        skipped++;
        continue;
      }
    }

    try {
      // Read and parse original skill
      const originalContent = fs.readFileSync(skill.path, 'utf8');
      const skillInfo = parseSkillFile(skill.path);

      // Override name from directory if not in frontmatter
      if (!skillInfo.name) {
        skillInfo.name = skill.name;
      }

      // Transform content
      const transformedContent = provider === 'factory'
        ? transformToFactory(skillInfo, originalContent)
        : transformToClaude(skillInfo, originalContent);

      if (dryRun) {
        console.log(`  [DRY] ${skill.name} (${skill.source})`);
      } else {
        // Create skill directory
        if (!fs.existsSync(skillDir)) {
          fs.mkdirSync(skillDir, { recursive: true });
        }

        // Write transformed skill
        fs.writeFileSync(skillFile, transformedContent, 'utf8');
        console.log(`  [OK]  ${skill.name} (${skill.source})`);

        // Copy any supporting files (schemas, scripts, etc.)
        const sourceDir = path.dirname(skill.path);
        for (const file of fs.readdirSync(sourceDir)) {
          if (file !== 'SKILL.md') {
            const srcFile = path.join(sourceDir, file);
            const destFile = path.join(skillDir, file);
            if (fs.statSync(srcFile).isFile()) {
              fs.copyFileSync(srcFile, destFile);
            }
          }
        }
      }

      deployed++;
    } catch (err) {
      console.error(`  [ERR] ${skill.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDeployment complete:`);
  console.log(`  Deployed: ${deployed}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);

  return { deployed, skipped, errors };
}

/**
 * List available skills
 */
function listSkills(skills) {
  console.log('\nAvailable AIWG Skills:\n');

  // Group by category
  const byCategory = {};
  for (const skill of skills) {
    if (!byCategory[skill.category]) {
      byCategory[skill.category] = [];
    }
    byCategory[skill.category].push(skill);
  }

  for (const [category, categorySkills] of Object.entries(byCategory)) {
    console.log(`${category.toUpperCase()} (${categorySkills.length}):`);
    for (const skill of categorySkills) {
      const info = parseSkillFile(skill.path);
      const desc = info.description?.substring(0, 60) || 'No description';
      console.log(`  ${skill.name.padEnd(25)} ${desc}${desc.length > 60 ? '...' : ''}`);
    }
    console.log();
  }

  console.log(`Total: ${skills.length} skills`);
}

// Main execution
async function main() {
  const options = parseArgs();

  // Validate provider
  if (!['claude', 'factory'].includes(options.provider)) {
    console.error(`Invalid provider: ${options.provider}. Use 'claude' or 'factory'.`);
    process.exit(1);
  }

  // Validate mode
  if (!['all', 'sdlc', 'mmk', 'addons'].includes(options.mode)) {
    console.error(`Invalid mode: ${options.mode}. Use 'all', 'sdlc', 'mmk', or 'addons'.`);
    process.exit(1);
  }

  // Discover skills
  const skills = discoverSkills();

  if (skills.length === 0) {
    console.error('No skills found in AIWG installation.');
    console.error(`Searched in: ${AIWG_ROOT}/agentic/code/`);
    process.exit(1);
  }

  // List mode
  if (options.list) {
    listSkills(skills);
    return;
  }

  // Deploy skills
  const result = deploySkills(skills, options);

  if (result.errors > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
