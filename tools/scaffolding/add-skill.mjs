#!/usr/bin/env node

/**
 * CLI tool to add a skill to an existing addon or framework
 * Usage: aiwg add-skill <name> --to <target> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  updateManifest,
  resolveTargetPath,
  printSuccess,
  printError,
  printInfo,
  printHeader,
  listAddons,
  listFrameworks,
} from './utils.mjs';
import { existsSync } from 'fs';
import { join } from 'path';

const { positional, flags } = parseArgs(process.argv);

const name = positional[0];
const target = flags.to || flags.t;
const skillDescription = flags.description || flags.d || `${formatName(name || 'skill').title} skill`;
const triggers = flags.triggers || '';
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

function printHelp() {
  const addons = listAddons();
  const frameworks = listFrameworks();

  console.log(`
Usage: aiwg add-skill <name> --to <target> [options]

Add a new skill to an existing addon or framework.

Skills are auto-triggered capabilities that activate based on natural language patterns.

Arguments:
  name                  Skill name (kebab-case recommended)

Required:
  --to, -t              Target addon or framework

Options:
  --description, -d     Skill description
  --triggers            Comma-separated trigger phrases
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Available Targets:
  Addons:     ${addons.length > 0 ? addons.join(', ') : '(none)'}
  Frameworks: ${frameworks.length > 0 ? frameworks.join(', ') : '(none)'}

Examples:
  aiwg add-skill code-analyzer --to aiwg-utils
  aiwg add-skill voice-apply --to voice-framework --triggers "use voice,apply voice"
`);
}

function generateSkillMd(name, options) {
  const { kebab, title } = formatName(name);
  const triggerList = options.triggers
    ? options.triggers.split(',').map(t => `- "${t.trim()}"`).join('\n')
    : '- "[trigger phrase 1]"\n- "[trigger phrase 2]"';

  return `---
name: ${kebab}
description: ${options.description}
version: 1.0.0
---

# ${title} Skill

${options.description}

## Trigger Phrases

This skill activates when the user says:

${triggerList}

## Capability

[Describe what this skill does when triggered]

## Execution Process

1. **Detect**: Recognize trigger phrase in user input
2. **Parse**: Extract relevant parameters from context
3. **Execute**: Perform the skill's action
4. **Report**: Provide results to user

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| [param1] | string | [Description] |
| [param2] | boolean | [Description] |

## Examples

### Example 1: Basic Usage
\`\`\`
User: "[trigger phrase] [with context]"
Skill: [What the skill does]
\`\`\`

### Example 2: With Options
\`\`\`
User: "[trigger phrase] [with options]"
Skill: [What the skill does differently]
\`\`\`

## Implementation Notes

- [Technical consideration 1]
- [Technical consideration 2]
- [Error handling approach]

## Related Skills

- [related-skill-1]: [How they work together]
- [related-skill-2]: [How they work together]
`;
}

function generateSkillReadme(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title} Skill

${options.description}

## Files

- \`SKILL.md\` - Skill definition with triggers and execution process
- \`references/\` - Supporting documentation (optional)
- \`scripts/\` - Implementation scripts if needed (optional)

## Usage

This skill triggers automatically when the user says one of the trigger phrases defined in SKILL.md.

## Development

1. Edit \`SKILL.md\` to customize triggers and behavior
2. Add supporting documentation to \`references/\`
3. Add implementation scripts to \`scripts/\` if needed
4. Test by deploying and using trigger phrases
`;
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  if (!name) {
    printError('Skill name is required.');
    printHelp();
    process.exit(1);
  }

  if (!target) {
    printError('Target is required. Use --to <addon|framework>');
    process.exit(1);
  }

  const { kebab, title } = formatName(name);
  const resolved = resolveTargetPath(target);

  if (!resolved) {
    printError(`Target not found: ${target}`);
    printInfo('Check that the addon or framework exists.');
    process.exit(1);
  }

  // Skills typically not added to extensions
  if (resolved.type === 'extension') {
    printError('Skills are typically added to addons or frameworks, not extensions.');
    printInfo('Extensions usually contain templates and checklists.');
    process.exit(1);
  }

  const skillsDir = join(resolved.path, 'skills');
  const skillDir = join(skillsDir, kebab);
  const skillMdPath = join(skillDir, 'SKILL.md');
  const readmePath = join(skillDir, 'README.md');
  const manifestPath = join(resolved.path, 'manifest.json');

  // Check if skill already exists
  if (existsSync(skillDir)) {
    printError(`Skill already exists: ${skillDir}`);
    process.exit(1);
  }

  printHeader(`Adding Skill: ${title}`);
  printInfo(`Target: ${resolved.type} (${target})`);

  // Generate content
  const skillMdContent = generateSkillMd(name, {
    description: skillDescription,
    triggers,
  });
  const readmeContent = generateSkillReadme(name, {
    description: skillDescription,
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    console.log(`  📁 ${skillDir}/`);
    console.log(`  📄 ${skillMdPath}`);
    console.log(`  📄 ${readmePath}`);
    console.log(`  📁 ${join(skillDir, 'references')}/`);
    console.log(`  📝 Update ${manifestPath}`);
    console.log('\nSKILL.md content preview:');
    console.log('─'.repeat(40));
    console.log(skillMdContent.slice(0, 500) + '...');
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create skill directory structure
  ensureDir(skillDir);
  ensureDir(join(skillDir, 'references'));
  printSuccess(`Created ${skillDir}/`);

  // Write SKILL.md
  writeFileIfNotExists(skillMdPath, skillMdContent, { force: true });
  printSuccess(`Created ${skillMdPath}`);

  // Write README.md
  writeFileIfNotExists(readmePath, readmeContent, { force: true });
  printSuccess(`Created ${readmePath}`);

  // Update manifest
  try {
    updateManifest(manifestPath, 'skills', kebab);
    printSuccess(`Updated ${manifestPath}`);
  } catch (err) {
    printError(`Could not update manifest: ${err.message}`);
  }

  // Summary
  printHeader('Skill Added Successfully');
  printInfo(`Skill: ${kebab}`);
  printInfo(`Location: ${skillDir}/`);
  printInfo('');
  printInfo('Next steps:');
  printInfo('  1. Edit SKILL.md to define trigger phrases');
  printInfo('  2. Add implementation details');
  printInfo('  3. Deploy and test: aiwg use <framework>');
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
