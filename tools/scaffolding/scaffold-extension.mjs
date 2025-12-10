#!/usr/bin/env node

/**
 * CLI tool to scaffold a new AIWG extension (framework expansion pack)
 * Usage: aiwg scaffold-extension <name> --for <framework> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  writeJson,
  getFrameworksPath,
  listFrameworks,
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
const framework = flags.for || flags.f;
const description = flags.description || flags.d || `${formatName(name || 'extension').title} extension`;
const author = flags.author || flags.a || '';
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

function printHelp() {
  const frameworks = listFrameworks();
  const frameworkList = frameworks.length > 0 ? frameworks.join(', ') : '(none found)';

  console.log(`
Usage: aiwg scaffold-extension <name> --for <framework> [options]

Create a new AIWG extension (framework expansion pack).

Extensions enhance a specific parent framework with additional templates,
checklists, and domain-specific content. They cannot operate standalone.

Arguments:
  name                  Extension name (kebab-case recommended)

Required:
  --for, -f             Parent framework ID (required)

Options:
  --description, -d     Extension description
  --author, -a          Author name
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Available Frameworks: ${frameworkList}

Examples:
  aiwg scaffold-extension hipaa --for sdlc-complete
  aiwg scaffold-extension gdpr --for sdlc-complete --description "GDPR compliance templates"
  aiwg scaffold-extension ftc --for media-marketing-kit --author "Legal Team"

Creates:
  agentic/code/frameworks/<framework>/extensions/<name>/
  ├── manifest.json      # type: "extension", requires: ["<framework>"]
  ├── README.md
  ├── templates/
  └── checklists/
`);
}

function generateManifest(name, options) {
  const { kebab, title } = formatName(name);

  return {
    id: kebab,
    type: 'extension',
    name: title,
    version: '1.0.0',
    description: options.description,
    requires: [options.framework],
    author: options.author || undefined,
    entry: {
      templates: 'templates',
      checklists: 'checklists',
    },
    templates: [],
    checklists: [],
  };
}

function generateReadme(name, options) {
  const { kebab, title } = formatName(name);
  const { title: frameworkTitle } = formatName(options.framework);

  return `# ${title} Extension

${options.description}

## Overview

This extension enhances the **${frameworkTitle}** framework with additional templates and checklists for ${title.toLowerCase()} requirements.

## Requirements

- Parent framework: \`${options.framework}\`

This extension cannot operate standalone. Install the parent framework first:

\`\`\`bash
aiwg use ${options.framework.includes('marketing') ? 'marketing' : 'sdlc'}
\`\`\`

## Contents

### Templates

| Template | Description |
|----------|-------------|
| (none yet) | Add templates with \`aiwg add-template <name> --to ${options.framework}/extensions/${kebab}\` |

### Checklists

| Checklist | Description |
|-----------|-------------|
| (none yet) | Add manually to \`checklists/\` directory |

## Usage

Once the parent framework is deployed, this extension's templates are available in the framework's template library.

### In Claude Code

Reference templates in prompts:
\`\`\`
Use the ${kebab} templates for compliance requirements...
\`\`\`

### Manually

Copy templates from:
\`\`\`
agentic/code/frameworks/${options.framework}/extensions/${kebab}/templates/
\`\`\`

## Development

### Add Templates

\`\`\`bash
aiwg add-template compliance-matrix --to ${options.framework}/extensions/${kebab}
aiwg add-template audit-checklist --to ${options.framework}/extensions/${kebab}
\`\`\`

### Validate

\`\`\`bash
aiwg validate agentic/code/frameworks/${options.framework}/extensions/${kebab}
\`\`\`

## License

See repository LICENSE file.
`;
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  if (!name) {
    printError('Extension name is required.');
    printHelp();
    process.exit(1);
  }

  if (!framework) {
    printError('Parent framework is required. Use --for <framework>');
    const frameworks = listFrameworks();
    if (frameworks.length > 0) {
      printInfo(`Available frameworks: ${frameworks.join(', ')}`);
    }
    process.exit(1);
  }

  const { kebab, title } = formatName(name);
  const aiwgPath = detectAiwgPath();

  if (!aiwgPath) {
    printError('AIWG installation not found. Set AIWG_ROOT environment variable.');
    process.exit(1);
  }

  // Validate parent framework exists
  const frameworksPath = getFrameworksPath();
  const frameworkPath = join(frameworksPath, framework);

  if (!existsSync(join(frameworkPath, 'manifest.json'))) {
    printError(`Framework not found: ${framework}`);
    const frameworks = listFrameworks();
    if (frameworks.length > 0) {
      printInfo(`Available frameworks: ${frameworks.join(', ')}`);
    }
    process.exit(1);
  }

  // Extension path
  const extensionPath = join(frameworkPath, 'extensions', kebab);

  // Check if extension already exists
  if (existsSync(extensionPath)) {
    printError(`Extension already exists: ${extensionPath}`);
    process.exit(1);
  }

  printHeader(`Scaffolding Extension: ${title}`);
  printInfo(`Parent framework: ${framework}`);

  const filesToCreate = [
    { path: join(extensionPath, 'manifest.json'), content: null, type: 'json' },
    { path: join(extensionPath, 'README.md'), content: null, type: 'text' },
  ];

  const dirsToCreate = [
    join(extensionPath, 'templates'),
    join(extensionPath, 'checklists'),
  ];

  // Generate content
  const manifest = generateManifest(name, { description, author, framework });
  const readme = generateReadme(name, { description, framework });

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

  // Create extensions directory in framework if needed
  ensureDir(join(frameworkPath, 'extensions'));

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
  printHeader('Extension Created Successfully');
  printInfo(`Location: ${extensionPath}`);
  printInfo(`Parent:   ${framework}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo(`  1. Add templates:  aiwg add-template <name> --to ${framework}/extensions/${kebab}`);
  printInfo(`  2. Add checklists: Create files in ${extensionPath}/checklists/`);
  printInfo(`  3. Deploy parent:  aiwg use ${framework.includes('marketing') ? 'marketing' : 'sdlc'}`);
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
