#!/usr/bin/env node

/**
 * CLI tool to add a command to an existing addon, framework, or extension
 * Usage: aiwg add-command <name> --to <target> [options]
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
const template = flags.template || 'utility';
const commandDescription = flags.description || flags.d || `${formatName(name || 'command').title} command`;
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

const VALID_TEMPLATES = ['utility', 'transformation', 'orchestration'];

function printHelp() {
  const addons = listAddons();
  const frameworks = listFrameworks();

  console.log(`
Usage: aiwg add-command <name> --to <target> [options]

Add a new slash command to an existing addon, framework, or extension.

Arguments:
  name                  Command name (kebab-case recommended)

Required:
  --to, -t              Target addon, framework, or extension path

Options:
  --template            Command template: utility (default), transformation, orchestration
  --description, -d     Command description
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Templates:
  utility         Simple operation, single action (default)
  transformation  Content/code transformation pipeline
  orchestration   Multi-agent workflow coordination

Available Targets:
  Addons:     ${addons.length > 0 ? addons.join(', ') : '(none)'}
  Frameworks: ${frameworks.length > 0 ? frameworks.join(', ') : '(none)'}
  Extensions: <framework>/extensions/<name>

Examples:
  aiwg add-command lint-fix --to aiwg-utils
  aiwg add-command security-scan --to sdlc-complete --template transformation
  aiwg add-command deploy-all --to sdlc-complete --template orchestration
`);
}

function generateCommandUtility(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
args: [target-path] [--option value]
---

# ${title}

${options.description}

## Usage

\`\`\`
/${kebab} [target-path] [options]
\`\`\`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| target-path | No | Path to target (default: current directory) |

## Options

| Option | Description |
|--------|-------------|
| --option value | Description of option |
| --dry-run | Preview changes without executing |
| --verbose | Show detailed output |

## Examples

\`\`\`bash
# Basic usage
/${kebab}

# With target path
/${kebab} ./src

# With options
/${kebab} --option value --verbose
\`\`\`

## Execution

1. Validate inputs and options
2. [Step 2 of execution]
3. [Step 3 of execution]
4. Report results

## Output

\`\`\`
✓ [Action completed]
  - [Detail 1]
  - [Detail 2]
\`\`\`
`;
}

function generateCommandTransformation(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
args: <input> [--output value] [--format value]
---

# ${title}

${options.description}

## Usage

\`\`\`
/${kebab} <input> [options]
\`\`\`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| input | Yes | Input file, directory, or content to transform |

## Options

| Option | Description |
|--------|-------------|
| --output | Output location (default: stdout or in-place) |
| --format | Output format (default: auto-detect) |
| --dry-run | Preview transformation without applying |
| --backup | Create backup before modifying files |

## Transformation Pipeline

### Stage 1: Parse Input
- Read input content
- Validate format
- Build internal representation

### Stage 2: Transform
- Apply transformation rules
- [Specific transformation step]
- [Specific transformation step]

### Stage 3: Output
- Format output according to --format
- Write to destination
- Report changes

## Examples

\`\`\`bash
# Transform file
/${kebab} input.md

# Transform with output
/${kebab} input.md --output output.md

# Transform directory
/${kebab} ./src --format json

# Preview changes
/${kebab} input.md --dry-run
\`\`\`

## Output

### Success
\`\`\`
✓ Transformed: input.md → output.md
  - [Change 1]
  - [Change 2]
  - [Change 3]
\`\`\`

### Dry Run
\`\`\`
[DRY RUN] Would transform:
  input.md:
    - Line 5: [change description]
    - Line 12: [change description]
\`\`\`
`;
}

function generateCommandOrchestration(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
args: [project-directory] [--guidance "text"] [--interactive]
---

# ${title}

${options.description}

## Usage

\`\`\`
/${kebab} [project-directory] [options]
\`\`\`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| project-directory | No | Project root (default: current directory) |

## Options

| Option | Description |
|--------|-------------|
| --guidance "text" | Strategic guidance to influence execution |
| --interactive | Enable interactive mode with strategic questions |
| --dry-run | Preview workflow without executing |

## Workflow Overview

This command orchestrates multiple agents to accomplish:

1. [Phase 1 objective]
2. [Phase 2 objective]
3. [Phase 3 objective]

## Agent Assignments

| Phase | Agent | Responsibility |
|-------|-------|----------------|
| 1 | [primary-author] | Create initial draft |
| 2 | [reviewer-1] | Review from perspective X |
| 2 | [reviewer-2] | Review from perspective Y |
| 3 | [synthesizer] | Merge feedback and finalize |

## Orchestration Pattern

\`\`\`
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (2-4)      Final merge    .aiwg/
\`\`\`

## Execution Steps

### Phase 1: Initialize
1. Validate project directory
2. Create working directories
3. Gather context from existing artifacts

### Phase 2: Generate
1. Launch primary author agent
2. Wait for draft completion
3. Launch parallel reviewers

### Phase 3: Synthesize
1. Collect all reviews
2. Launch synthesizer agent
3. Produce final artifact

### Phase 4: Archive
1. Move artifacts to appropriate .aiwg/ directories
2. Update indexes and traceability
3. Report completion

## Examples

\`\`\`bash
# Basic execution
/${kebab}

# With guidance
/${kebab} --guidance "Focus on security, SOC2 audit in 3 months"

# Interactive mode
/${kebab} --interactive

# Preview workflow
/${kebab} --dry-run
\`\`\`

## Output

### Progress Updates
\`\`\`
✓ Initialized workspaces
⏳ Phase 1: Generating draft...
✓ Draft complete (1,245 words)
⏳ Phase 2: Launching reviewers (3 agents)...
  ✓ Reviewer 1: APPROVED
  ✓ Reviewer 2: CONDITIONAL (minor suggestions)
  ✓ Reviewer 3: APPROVED
⏳ Phase 3: Synthesizing...
✓ Final artifact: .aiwg/[category]/[artifact].md
\`\`\`

### Artifacts Created
| Artifact | Location |
|----------|----------|
| [Artifact 1] | .aiwg/[dir]/[file].md |
| [Artifact 2] | .aiwg/[dir]/[file].md |

## Error Handling

- **Missing context**: Request additional information before proceeding
- **Agent failure**: Retry once, then report and offer alternatives
- **Conflicting reviews**: Flag for human review with analysis
`;
}

function generateCommand(name, templateType, options) {
  switch (templateType) {
    case 'transformation':
      return generateCommandTransformation(name, options);
    case 'orchestration':
      return generateCommandOrchestration(name, options);
    case 'utility':
    default:
      return generateCommandUtility(name, options);
  }
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  if (!name) {
    printError('Command name is required.');
    printHelp();
    process.exit(1);
  }

  if (!target) {
    printError('Target is required. Use --to <addon|framework|extension>');
    process.exit(1);
  }

  if (!VALID_TEMPLATES.includes(template)) {
    printError(`Invalid template: ${template}. Valid options: ${VALID_TEMPLATES.join(', ')}`);
    process.exit(1);
  }

  const { kebab, title } = formatName(name);
  const resolved = resolveTargetPath(target);

  if (!resolved) {
    printError(`Target not found: ${target}`);
    printInfo('Check that the addon, framework, or extension exists.');
    process.exit(1);
  }

  const commandsDir = join(resolved.path, 'commands');
  const commandPath = join(commandsDir, `${kebab}.md`);
  const manifestPath = join(resolved.path, 'manifest.json');

  // Check if command already exists
  if (existsSync(commandPath)) {
    printError(`Command already exists: ${commandPath}`);
    process.exit(1);
  }

  printHeader(`Adding Command: /${kebab}`);
  printInfo(`Target: ${resolved.type} (${target})`);
  printInfo(`Template: ${template}`);

  // Generate command content
  const commandContent = generateCommand(name, template, {
    description: commandDescription,
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    console.log(`  📄 ${commandPath}`);
    console.log(`  📝 Update ${manifestPath}`);
    console.log('\nCommand content preview:');
    console.log('─'.repeat(40));
    console.log(commandContent.slice(0, 500) + '...');
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create commands directory if needed
  ensureDir(commandsDir);

  // Write command file
  writeFileIfNotExists(commandPath, commandContent, { force: true });
  printSuccess(`Created ${commandPath}`);

  // Update manifest
  try {
    updateManifest(manifestPath, 'commands', kebab);
    printSuccess(`Updated ${manifestPath}`);
  } catch (err) {
    printError(`Could not update manifest: ${err.message}`);
  }

  // Summary
  printHeader('Command Added Successfully');
  printInfo(`Command: /${kebab}`);
  printInfo(`Location: ${commandPath}`);
  printInfo(`Template: ${template}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo('  1. Edit the command file to customize behavior');
  printInfo('  2. Deploy and test: aiwg use <framework>');
  printInfo(`  3. Use in session: /${kebab}`);
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
