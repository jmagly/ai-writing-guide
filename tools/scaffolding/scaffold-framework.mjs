#!/usr/bin/env node

/**
 * CLI tool to scaffold a new AIWG framework
 * Usage: aiwg scaffold-framework <name> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  writeJson,
  getFrameworksPath,
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
const description = flags.description || flags.d || `${formatName(name || 'framework').title} lifecycle framework`;
const author = flags.author || flags.a || '';
const phases = (flags.phases || 'inception,elaboration,construction,transition').split(',').map(p => p.trim());
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

function printHelp() {
  console.log(`
Usage: aiwg scaffold-framework <name> [options]

Create a new AIWG framework with complete directory structure.

Arguments:
  name                  Framework name (kebab-case recommended)

Options:
  --description, -d     Framework description
  --author, -a          Author name
  --phases              Comma-separated phase names (default: inception,elaboration,construction,transition)
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Examples:
  aiwg scaffold-framework fintech-lifecycle
  aiwg scaffold-framework research-project --phases "discovery,analysis,synthesis,publication"
  aiwg scaffold-framework legal-case --description "Legal case management lifecycle" --dry-run

Creates:
  agentic/code/frameworks/<name>/
  ├── manifest.json
  ├── README.md
  ├── plan-act-<name>.md
  ├── actors-and-templates.md
  ├── agents/
  │   └── manifest.md
  ├── commands/
  │   └── manifest.md
  ├── templates/
  │   ├── manifest.json
  │   └── <phase>/  (for each phase)
  ├── flows/
  │   └── <phase>.md  (for each phase)
  ├── metrics/
  │   └── tracking-catalog.md
  ├── config/
  │   └── models.json
  ├── extensions/
  └── docs/
`);
}

function generateManifest(name, options) {
  const { kebab, title } = formatName(name);

  return {
    id: kebab,
    type: 'framework',
    name: title,
    version: '1.0.0',
    description: options.description,
    author: options.author || undefined,
    entry: {
      agents: 'agents',
      commands: 'commands',
      templates: 'templates',
      flows: 'flows',
      metrics: 'metrics',
    },
    agents: [],
    commands: [],
    templates: [],
    phases: options.phases,
    defaultPhase: options.phases[0],
  };
}

function generateReadme(name, options) {
  const { kebab, title } = formatName(name);
  const phaseList = options.phases.map(p => `- **${formatName(p).title}**`).join('\n');

  return `# ${title}

${options.description}

## Overview

This framework provides a complete lifecycle for ${kebab.replace(/-/g, ' ')} projects.

## Phases

${phaseList}

## Installation

\`\`\`bash
# Deploy to project
aiwg use ${kebab}

# Or deploy components individually
aiwg -deploy-agents --mode ${kebab}
aiwg -deploy-commands --mode ${kebab}
\`\`\`

## Agents

| Agent | Phase | Description |
|-------|-------|-------------|
| (none yet) | | Add agents with \`aiwg add-agent <name> --to ${kebab}\` |

## Commands

| Command | Description |
|---------|-------------|
| (none yet) | Add commands with \`aiwg add-command <name> --to ${kebab}\` |

## Templates

| Template | Phase | Description |
|----------|-------|-------------|
| (none yet) | | Add templates with \`aiwg add-template <name> --to ${kebab}\` |

## Directory Structure

\`\`\`
${kebab}/
├── manifest.json           # Framework metadata
├── README.md               # This file
├── plan-act-${kebab}.md    # High-level lifecycle guide
├── actors-and-templates.md # Role-to-artifact mapping
├── agents/                 # Role-based agents
├── commands/               # Workflow commands
├── templates/              # Artifact templates
├── flows/                  # Phase workflow documentation
├── metrics/                # Health and progress tracking
├── config/                 # Framework configuration
├── extensions/             # Framework-specific extensions
└── docs/                   # Additional documentation
\`\`\`

## Development

### Add Components

\`\`\`bash
# Add a new agent
aiwg add-agent analyst --to ${kebab} --template complex

# Add a new command
aiwg add-command flow-${options.phases[0]} --to ${kebab} --template orchestration

# Add a new template
aiwg add-template vision-doc --to ${kebab} --type document --category ${options.phases[0]}
\`\`\`

### Create Extensions

\`\`\`bash
aiwg scaffold-extension compliance --for ${kebab}
\`\`\`

### Validate

\`\`\`bash
aiwg validate agentic/code/frameworks/${kebab}
\`\`\`

## License

See repository LICENSE file.
`;
}

function generatePlanAct(name, options) {
  const { kebab, title } = formatName(name);
  const phaseSections = options.phases.map((phase, i) => {
    const { title: phaseTitle } = formatName(phase);
    const nextPhase = options.phases[i + 1];
    const transition = nextPhase ? `→ ${formatName(nextPhase).title}` : '→ Complete';

    return `## ${phaseTitle} Phase

### Entry Criteria
- [ ] Previous phase complete (if applicable)
- [ ] Stakeholder approval obtained

### Key Activities
- Activity 1
- Activity 2
- Activity 3

### Deliverables
- Deliverable 1
- Deliverable 2

### Exit Criteria
- [ ] All deliverables reviewed and approved
- [ ] Quality gates passed

### Transition
${transition}
`;
  }).join('\n');

  return `# ${title} Lifecycle Guide

This document provides the high-level lifecycle guidance for ${title} projects.

## Overview

The ${title} framework follows a ${options.phases.length}-phase lifecycle:

${options.phases.map((p, i) => `${i + 1}. ${formatName(p).title}`).join('\n')}

${phaseSections}
## Workflow Commands

| Command | Purpose |
|---------|---------|
${options.phases.map(p => `| \`/flow-${p}\` | Execute ${formatName(p).title} phase |`).join('\n')}
${options.phases.slice(0, -1).map((p, i) => `| \`/flow-${p}-to-${options.phases[i+1]}\` | Transition ${formatName(p).title} → ${formatName(options.phases[i+1]).title} |`).join('\n')}

## Getting Started

1. Initialize project: \`/intake-wizard "project description"\`
2. Start first phase: \`/flow-${options.phases[0]}\`
3. Check progress: \`/project-status\`
`;
}

function generateActorsAndTemplates(name, options) {
  const { title } = formatName(name);

  return `# ${title} Actors and Templates

This document maps roles (actors) to the artifacts they produce and consume.

## Actor Definitions

| Actor | Responsibilities | Primary Phase(s) |
|-------|-----------------|------------------|
| (define actors) | | |

## Template Assignments

| Template | Primary Author | Reviewers | Phase |
|----------|---------------|-----------|-------|
| (define templates) | | | |

## RACI Matrix

| Artifact | ${options.phases.map(p => formatName(p).title).join(' | ')} |
|----------|${options.phases.map(() => '---').join('|')}|
| (define artifacts) | | | |

Legend: R=Responsible, A=Accountable, C=Consulted, I=Informed
`;
}

function generateAgentManifest(name) {
  const { title } = formatName(name);

  return `# ${title} Agents

This document catalogs all agents in the ${title} framework.

## Agent Roster

| Agent | Model | Description | Phase(s) |
|-------|-------|-------------|----------|
| (none yet) | | | |

## Agent Categories

### Analysis Agents
- (add analysis-focused agents)

### Design Agents
- (add design-focused agents)

### Implementation Agents
- (add implementation-focused agents)

### Quality Agents
- (add quality-focused agents)

### Orchestration Agents
- (add orchestration agents)

## Adding Agents

\`\`\`bash
aiwg add-agent <name> --to ${formatName(name).kebab} --template simple|complex|orchestrator
\`\`\`
`;
}

function generateCommandManifest(name) {
  const { title } = formatName(name);

  return `# ${title} Commands

This document catalogs all commands in the ${title} framework.

## Command Roster

| Command | Description | Category |
|---------|-------------|----------|
| (none yet) | | |

## Command Categories

### Intake Commands
- (add project intake commands)

### Phase Commands
- (add phase execution commands)

### Transition Commands
- (add phase transition commands)

### Utility Commands
- (add utility commands)

## Adding Commands

\`\`\`bash
aiwg add-command <name> --to ${formatName(name).kebab} --template utility|transformation|orchestration
\`\`\`
`;
}

function generateTemplateManifest(name, options) {
  const { kebab } = formatName(name);

  const manifest = {
    id: `${kebab}-templates`,
    version: '1.0.0',
    templates: [],
    categories: options.phases.reduce((acc, phase) => {
      acc[phase] = [];
      return acc;
    }, {}),
  };

  return manifest;
}

function generateFlowDoc(name, phase, options) {
  const { title: frameworkTitle } = formatName(name);
  const { title: phaseTitle } = formatName(phase);
  const phaseIndex = options.phases.indexOf(phase);
  const prevPhase = options.phases[phaseIndex - 1];
  const nextPhase = options.phases[phaseIndex + 1];

  return `# ${phaseTitle} Phase

## Overview

The ${phaseTitle} phase of the ${frameworkTitle} framework.

## Entry Criteria

${prevPhase ? `- ${formatName(prevPhase).title} phase complete` : '- Project initiated'}
- Stakeholder approval obtained
- Resources allocated

## Key Activities

1. **Activity 1**: Description
2. **Activity 2**: Description
3. **Activity 3**: Description

## Deliverables

| Deliverable | Template | Owner |
|-------------|----------|-------|
| Deliverable 1 | | |
| Deliverable 2 | | |

## Quality Gates

- [ ] Gate criterion 1
- [ ] Gate criterion 2
- [ ] Gate criterion 3

## Workflow

\`\`\`
Start → Activity 1 → Activity 2 → Activity 3 → Gate Check → ${nextPhase ? `${formatName(nextPhase).title}` : 'Complete'}
\`\`\`

## Commands

| Command | Purpose |
|---------|---------|
| \`/flow-${phase}\` | Execute this phase |
${nextPhase ? `| \`/flow-${phase}-to-${nextPhase}\` | Transition to ${formatName(nextPhase).title} |` : ''}

## Exit Criteria

- All deliverables complete and reviewed
- Quality gates passed
- Stakeholder sign-off obtained
${nextPhase ? `- Ready for ${formatName(nextPhase).title} phase` : '- Project complete'}
`;
}

function generateTrackingCatalog(name, options) {
  const { title } = formatName(name);

  return `# ${title} Tracking Catalog

## Health Metrics

| Metric | Description | Target | Measurement |
|--------|-------------|--------|-------------|
| Phase Progress | % of phase deliverables complete | 100% | Deliverable count |
| Quality Gates | Gates passed vs total | 100% | Gate status |
| Risk Status | Open risks by severity | 0 critical | Risk register |

## Phase Metrics

${options.phases.map(p => `### ${formatName(p).title}

| Metric | Description |
|--------|-------------|
| Deliverables Complete | Count of completed deliverables |
| Gate Status | Pass/Fail status |
| Duration | Days in phase |
`).join('\n')}

## Tracking Commands

| Command | Purpose |
|---------|---------|
| \`/project-status\` | Overall project health |
| \`/flow-gate-check <phase>\` | Validate phase gate criteria |
`;
}

function generateModelsConfig(name) {
  return {
    default: 'sonnet',
    reasoning: 'opus',
    efficiency: 'haiku',
    agents: {},
    commands: {},
  };
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

  const frameworksPath = getFrameworksPath();
  const frameworkPath = join(frameworksPath, kebab);

  // Check if framework already exists
  if (existsSync(frameworkPath)) {
    printError(`Framework already exists: ${frameworkPath}`);
    process.exit(1);
  }

  printHeader(`Scaffolding Framework: ${title}`);
  printInfo(`Phases: ${phases.join(' → ')}`);

  const dirsToCreate = [
    frameworkPath,
    join(frameworkPath, 'agents'),
    join(frameworkPath, 'commands'),
    join(frameworkPath, 'templates'),
    join(frameworkPath, 'flows'),
    join(frameworkPath, 'metrics'),
    join(frameworkPath, 'config'),
    join(frameworkPath, 'extensions'),
    join(frameworkPath, 'docs'),
    ...phases.map(p => join(frameworkPath, 'templates', p)),
  ];

  const filesToCreate = [
    { path: join(frameworkPath, 'manifest.json'), content: generateManifest(name, { description, author, phases }), type: 'json' },
    { path: join(frameworkPath, 'README.md'), content: generateReadme(name, { description, phases }), type: 'text' },
    { path: join(frameworkPath, `plan-act-${kebab}.md`), content: generatePlanAct(name, { phases }), type: 'text' },
    { path: join(frameworkPath, 'actors-and-templates.md'), content: generateActorsAndTemplates(name, { phases }), type: 'text' },
    { path: join(frameworkPath, 'agents', 'manifest.md'), content: generateAgentManifest(name), type: 'text' },
    { path: join(frameworkPath, 'commands', 'manifest.md'), content: generateCommandManifest(name), type: 'text' },
    { path: join(frameworkPath, 'templates', 'manifest.json'), content: generateTemplateManifest(name, { phases }), type: 'json' },
    { path: join(frameworkPath, 'metrics', 'tracking-catalog.md'), content: generateTrackingCatalog(name, { phases }), type: 'text' },
    { path: join(frameworkPath, 'config', 'models.json'), content: generateModelsConfig(name), type: 'json' },
    ...phases.map(p => ({
      path: join(frameworkPath, 'flows', `${p}.md`),
      content: generateFlowDoc(name, p, { phases }),
      type: 'text',
    })),
  ];

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    console.log('Directories:');
    for (const dir of dirsToCreate) {
      console.log(`  📁 ${dir}/`);
    }
    console.log('\nFiles:');
    for (const file of filesToCreate) {
      console.log(`  📄 ${file.path}`);
    }
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create directories
  for (const dir of dirsToCreate) {
    ensureDir(dir);
  }
  printSuccess(`Created ${dirsToCreate.length} directories`);

  // Create files
  for (const file of filesToCreate) {
    if (file.type === 'json') {
      writeJson(file.path, file.content);
    } else {
      writeFileIfNotExists(file.path, file.content, { force: true });
    }
  }
  printSuccess(`Created ${filesToCreate.length} files`);

  // Summary
  printHeader('Framework Created Successfully');
  printInfo(`Location: ${frameworkPath}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo(`  1. Define actors in actors-and-templates.md`);
  printInfo(`  2. Add agents:    aiwg add-agent <name> --to ${kebab}`);
  printInfo(`  3. Add commands:  aiwg add-command <name> --to ${kebab}`);
  printInfo(`  4. Add templates: aiwg add-template <name> --to ${kebab} --category <phase>`);
  printInfo(`  5. Create extensions: aiwg scaffold-extension <name> --for ${kebab}`);
  printInfo(`  6. Deploy: aiwg use ${kebab}`);
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
