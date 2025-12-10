#!/usr/bin/env node

/**
 * CLI tool to add an agent to an existing addon, framework, or extension
 * Usage: aiwg add-agent <name> --to <target> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  updateManifest,
  resolveTargetPath,
  loadTemplate,
  substituteTemplate,
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
const template = flags.template || 'simple';
const agentDescription = flags.description || flags.d || `${formatName(name || 'agent').title} agent`;
const tools = flags.tools || 'Read, Write, MultiEdit, Bash, WebFetch';
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

const VALID_TEMPLATES = ['simple', 'complex', 'orchestrator'];

function printHelp() {
  const addons = listAddons();
  const frameworks = listFrameworks();

  console.log(`
Usage: aiwg add-agent <name> --to <target> [options]

Add a new agent to an existing addon, framework, or extension.

Arguments:
  name                  Agent name (kebab-case recommended)

Required:
  --to, -t              Target addon, framework, or extension path

Options:
  --template            Agent template: simple (default), complex, orchestrator
  --description, -d     Agent description
  --tools               Comma-separated tools (default: Read, Write, MultiEdit, Bash, WebFetch)
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Templates:
  simple       Single-purpose, focused agent (default)
  complex      Domain expert with deep knowledge sections
  orchestrator Multi-agent coordination patterns

Available Targets:
  Addons:     ${addons.length > 0 ? addons.join(', ') : '(none)'}
  Frameworks: ${frameworks.length > 0 ? frameworks.join(', ') : '(none)'}
  Extensions: <framework>/extensions/<name>

Examples:
  aiwg add-agent code-reviewer --to aiwg-utils
  aiwg add-agent security-auditor --to sdlc-complete --template complex
  aiwg add-agent compliance-checker --to sdlc-complete/extensions/hipaa
`);
}

function generateAgentSimple(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
model: sonnet
tools: ${options.tools}
---

# ${title} Agent

${options.description}

## Expertise

- [Define primary expertise area]
- [Define secondary capabilities]

## Responsibilities

1. [Primary responsibility]
2. [Secondary responsibility]
3. [Quality checks]

## Workflow

1. Understand the request
2. Gather necessary context
3. Execute the task
4. Validate output quality
5. Report results

## Output Format

Provide clear, structured output with:
- Summary of actions taken
- Key findings or results
- Recommendations if applicable
`;
}

function generateAgentComplex(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
model: sonnet
tools: ${options.tools}
---

# ${title} Agent

${options.description}

## Domain Expertise

### Primary Domain
- [Core domain knowledge]
- [Key concepts and terminology]
- [Industry standards and best practices]

### Secondary Domains
- [Related expertise area 1]
- [Related expertise area 2]

## Responsibilities

### Primary
1. [Core responsibility with detailed expectations]
2. [Key deliverable responsibility]

### Quality Assurance
1. [Validation criteria]
2. [Error handling approach]
3. [Edge case considerations]

## Knowledge Base

### Standards & Frameworks
- [Relevant standard 1]
- [Relevant framework 1]

### Common Patterns
- [Pattern 1]: [When to use, how to apply]
- [Pattern 2]: [When to use, how to apply]

### Anti-Patterns
- [Anti-pattern 1]: [Why to avoid, what to do instead]

## Workflow

### Analysis Phase
1. Gather requirements and context
2. Identify constraints and dependencies
3. Assess complexity and risk

### Execution Phase
1. Plan approach based on analysis
2. Execute in logical steps
3. Validate at checkpoints

### Delivery Phase
1. Compile results
2. Document decisions and rationale
3. Provide actionable recommendations

## Output Format

### Standard Output
\`\`\`
## Summary
[Brief overview]

## Findings
- [Finding 1]
- [Finding 2]

## Recommendations
1. [Recommendation with rationale]

## Next Steps
- [Actionable next step]
\`\`\`

## Error Handling

- **Missing context**: Request clarification before proceeding
- **Ambiguous requirements**: List interpretations and ask for confirmation
- **Conflicting constraints**: Highlight trade-offs and recommend approach
`;
}

function generateAgentOrchestrator(name, options) {
  const { kebab, title } = formatName(name);

  return `---
name: ${kebab}
description: ${options.description}
model: opus
tools: ${options.tools}, Task
---

# ${title} Orchestrator

${options.description}

## Role

This is an **orchestrator agent** that coordinates multiple specialized agents to accomplish complex, multi-step tasks.

## Orchestration Capabilities

### Agent Coordination
- Launch parallel agents when tasks are independent
- Sequence dependent tasks appropriately
- Aggregate and synthesize results from multiple agents

### Workflow Management
- Break complex tasks into sub-tasks
- Assign sub-tasks to appropriate specialist agents
- Track progress and handle failures gracefully

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| [agent-1] | [purpose] | [conditions] |
| [agent-2] | [purpose] | [conditions] |

## Orchestration Patterns

### Parallel Review Pattern
\`\`\`
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (3-5)      Final merge    Output
\`\`\`

### Sequential Pipeline Pattern
\`\`\`
Analysis → Design → Implementation → Validation → Delivery
\`\`\`

### Fan-Out/Fan-In Pattern
\`\`\`
Split Task → Multiple Workers → Aggregate Results → Deliver
\`\`\`

## Workflow

### 1. Task Analysis
- Understand the overall goal
- Identify required sub-tasks
- Determine dependencies between sub-tasks

### 2. Agent Selection
- Match sub-tasks to specialist agents
- Consider agent expertise and availability
- Plan parallel vs sequential execution

### 3. Execution
- Launch agents with clear prompts
- Monitor progress
- Handle failures and retries

### 4. Synthesis
- Collect results from all agents
- Resolve conflicts between outputs
- Synthesize into cohesive deliverable

### 5. Delivery
- Compile final output
- Document process and decisions
- Archive artifacts

## Output Format

### Progress Updates
\`\`\`
✓ = Complete
⏳ = In progress
❌ = Error/blocked
⚠️ = Warning/attention needed

[Task 1] ✓ Complete
[Task 2] ⏳ Running agent-x...
[Task 3] Pending
\`\`\`

### Final Output
\`\`\`
## Orchestration Complete

### Summary
[What was accomplished]

### Agents Used
- [agent-1]: [contribution]
- [agent-2]: [contribution]

### Artifacts Created
- [artifact 1]: [location]
- [artifact 2]: [location]

### Issues Encountered
- [Issue and resolution]

### Recommendations
- [Follow-up actions]
\`\`\`

## Error Handling

- **Agent failure**: Retry once, then report and continue with alternatives
- **Timeout**: Report status and offer to continue or abort
- **Conflicting outputs**: Flag for human review with analysis
`;
}

function generateAgent(name, templateType, options) {
  switch (templateType) {
    case 'complex':
      return generateAgentComplex(name, options);
    case 'orchestrator':
      return generateAgentOrchestrator(name, options);
    case 'simple':
    default:
      return generateAgentSimple(name, options);
  }
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  if (!name) {
    printError('Agent name is required.');
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

  const agentsDir = join(resolved.path, 'agents');
  const agentPath = join(agentsDir, `${kebab}.md`);
  const manifestPath = join(resolved.path, 'manifest.json');

  // Check if agent already exists
  if (existsSync(agentPath)) {
    printError(`Agent already exists: ${agentPath}`);
    process.exit(1);
  }

  printHeader(`Adding Agent: ${title}`);
  printInfo(`Target: ${resolved.type} (${target})`);
  printInfo(`Template: ${template}`);

  // Generate agent content
  const agentContent = generateAgent(name, template, {
    description: agentDescription,
    tools,
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    console.log(`  📄 ${agentPath}`);
    console.log(`  📝 Update ${manifestPath}`);
    console.log('\nAgent content preview:');
    console.log('─'.repeat(40));
    console.log(agentContent.slice(0, 500) + '...');
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create agents directory if needed
  ensureDir(agentsDir);

  // Write agent file
  writeFileIfNotExists(agentPath, agentContent, { force: true });
  printSuccess(`Created ${agentPath}`);

  // Update manifest
  try {
    updateManifest(manifestPath, 'agents', kebab);
    printSuccess(`Updated ${manifestPath}`);
  } catch (err) {
    printError(`Could not update manifest: ${err.message}`);
  }

  // Summary
  printHeader('Agent Added Successfully');
  printInfo(`Agent: ${kebab}`);
  printInfo(`Location: ${agentPath}`);
  printInfo(`Template: ${template}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo('  1. Edit the agent file to customize expertise and workflow');
  printInfo('  2. Test the agent in a Claude Code session');
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
