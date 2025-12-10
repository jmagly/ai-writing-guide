#!/usr/bin/env node

/**
 * CLI tool to scaffold a new AIWG addon
 * Usage: aiwg scaffold-addon <name> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  writeJson,
  getAddonsPath,
  printSuccess,
  printError,
  printInfo,
  printHeader,
  detectAiwgPath,
} from './utils.mjs';
import { existsSync } from 'fs';
import { join } from 'path';

const { positional, flags } = parseArgs(process.argv);

const name = positional[0];
const description = flags.description || flags.d || `${formatName(name || 'addon').title} addon`;
const author = flags.author || flags.a || '';
const isCore = flags.core === true || flags.core === 'true';
const autoInstall = flags['auto-install'] === true || flags['auto-install'] === 'true';
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

function printHelp() {
  console.log(`
Usage: aiwg scaffold-addon <name> [options]

Create a new AIWG addon with standard directory structure.

Arguments:
  name                  Addon name (kebab-case recommended)

Options:
  --description, -d     Addon description
  --author, -a          Author name
  --core                Mark as core addon (auto-installed with frameworks)
  --auto-install        Auto-install with any framework
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Examples:
  aiwg scaffold-addon my-utils
  aiwg scaffold-addon code-metrics --description "Code quality metrics"
  aiwg scaffold-addon security-scanner --author "Jane Doe" --dry-run

Creates:
  agentic/code/addons/<name>/
  ├── manifest.json
  ├── README.md
  ├── agents/
  ├── commands/
  └── skills/
`);
}

function generateManifest(name, options) {
  const { kebab, title } = formatName(name);

  return {
    id: kebab,
    type: 'addon',
    name: title,
    version: '1.0.0',
    description: options.description,
    author: options.author || undefined,
    core: options.isCore || undefined,
    autoInstall: options.autoInstall || undefined,
    entry: {
      agents: 'agents',
      commands: 'commands',
      skills: 'skills',
    },
    agents: [],
    commands: [],
    skills: [],
  };
}

function generateReadme(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title}

${options.description}

## Installation

This addon is automatically deployed with AIWG frameworks, or can be deployed standalone:

\`\`\`bash
aiwg -deploy-agents --source agentic/code/addons/${kebab} --deploy-commands --deploy-skills
\`\`\`

## Contents

### Agents

| Agent | Description |
|-------|-------------|
| (none yet) | Add agents with \`aiwg add-agent <name> --to ${kebab}\` |

### Commands

| Command | Description |
|---------|-------------|
| (none yet) | Add commands with \`aiwg add-command <name> --to ${kebab}\` |

### Skills

| Skill | Description |
|-------|-------------|
| (none yet) | Add skills with \`aiwg add-skill <name> --to ${kebab}\` |

## Development

### Add Components

\`\`\`bash
# Add a new agent
aiwg add-agent my-agent --to ${kebab} --template simple

# Add a new command
aiwg add-command my-command --to ${kebab} --template utility

# Add a new skill
aiwg add-skill my-skill --to ${kebab}
\`\`\`

### Validate

\`\`\`bash
aiwg validate agentic/code/addons/${kebab}
\`\`\`

## License

See repository LICENSE file.
`;
}

async function main() {
  if (help || !name) {
    printHelp();
    process.exit(help ? 0 : 1);
  }

  const { kebab, title } = formatName(name);
  const aiwgPath = detectAiwgPath();

  if (!aiwgPath) {
    printError('AIWG installation not found. Set AIWG_ROOT environment variable.');
    process.exit(1);
  }

  const addonsPath = getAddonsPath();
  const addonPath = join(addonsPath, kebab);

  // Check if addon already exists
  if (existsSync(addonPath)) {
    printError(`Addon already exists: ${addonPath}`);
    process.exit(1);
  }

  printHeader(`Scaffolding Addon: ${title}`);

  const filesToCreate = [
    { path: join(addonPath, 'manifest.json'), content: null, type: 'json' },
    { path: join(addonPath, 'README.md'), content: null, type: 'text' },
  ];

  const dirsToCreate = [
    join(addonPath, 'agents'),
    join(addonPath, 'commands'),
    join(addonPath, 'skills'),
  ];

  // Generate content
  const manifest = generateManifest(name, { description, author, isCore, autoInstall });
  const readme = generateReadme(name, { description });

  filesToCreate[0].content = manifest;
  filesToCreate[1].content = readme;

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    for (const dir of dirsToCreate) {
      console.log(`  📁 ${dir}/`);
    }
    for (const file of filesToCreate) {
      console.log(`  📄 ${file.path}`);
    }
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create directories
  for (const dir of dirsToCreate) {
    ensureDir(dir);
    printSuccess(`Created ${dir}/`);
  }

  // Create files
  for (const file of filesToCreate) {
    if (file.type === 'json') {
      writeJson(file.path, file.content);
    } else {
      writeFileIfNotExists(file.path, file.content, { force: true });
    }
    printSuccess(`Created ${file.path}`);
  }

  // Summary
  printHeader('Addon Created Successfully');
  printInfo(`Location: ${addonPath}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo(`  1. Add agents:   aiwg add-agent <name> --to ${kebab}`);
  printInfo(`  2. Add commands: aiwg add-command <name> --to ${kebab}`);
  printInfo(`  3. Add skills:   aiwg add-skill <name> --to ${kebab}`);
  printInfo(`  4. Deploy:       aiwg -deploy-agents --source agentic/code/addons/${kebab}`);
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
