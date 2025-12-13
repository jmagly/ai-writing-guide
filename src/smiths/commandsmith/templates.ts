/**
 * Command templates for different command types
 */

import { CommandTemplate, CommandArg, CommandOption } from './types.js';

/**
 * Generate frontmatter for a command
 */
export function generateFrontmatter(
  name: string,
  description: string,
  args: CommandArg[] = [],
  options: CommandOption[] = []
): string {
  // Build args string
  const argParts: string[] = [];

  // Required args
  args.filter(a => a.required).forEach(arg => {
    argParts.push(`<${arg.name}>`);
  });

  // Optional args
  args.filter(a => !a.required).forEach(arg => {
    argParts.push(`[${arg.name}]`);
  });

  // Options
  options.forEach(opt => {
    if (opt.type === 'boolean') {
      argParts.push(`[--${opt.name}]`);
    } else {
      argParts.push(`[--${opt.name} <value>]`);
    }
  });

  // Always add standard options
  argParts.push('[--interactive]');
  argParts.push('[--guidance "text"]');

  const argsString = argParts.join(' ');

  return `---
name: ${name}
description: ${description}
args: ${argsString}
---`;
}

/**
 * Generate Arguments section
 */
export function generateArgumentsSection(args: CommandArg[]): string {
  if (args.length === 0) {
    return '';
  }

  let section = '\n## Arguments\n\n';
  section += '| Argument | Required | Description |\n';
  section += '|----------|----------|-------------|\n';

  args.forEach(arg => {
    const defaultStr = arg.default ? ` (default: ${arg.default})` : '';
    section += `| ${arg.name} | ${arg.required ? 'Yes' : 'No'} | ${arg.description}${defaultStr} |\n`;
  });

  return section;
}

/**
 * Generate Options section
 */
export function generateOptionsSection(options: CommandOption[]): string {
  if (options.length === 0) {
    return '';
  }

  let section = '\n## Options\n\n';
  section += '| Option | Type | Description |\n';
  section += '|--------|------|-------------|\n';

  options.forEach(opt => {
    const defaultStr = opt.default !== undefined ? ` (default: ${opt.default})` : '';
    section += `| --${opt.name} | ${opt.type} | ${opt.description}${defaultStr} |\n`;
  });

  // Add standard options
  section += '| --interactive | boolean | Enable interactive mode with guided questions |\n';
  section += '| --guidance | string | Provide strategic guidance for execution |\n';

  return section;
}

/**
 * Utility template - simple operation, single action
 */
export function generateUtilityTemplate(
  name: string,
  description: string,
  args: CommandArg[] = [],
  options: CommandOption[] = [],
  guidance?: string
): string {
  const frontmatter = generateFrontmatter(name, description, args, options);
  const argsSection = generateArgumentsSection(args);
  const optionsSection = generateOptionsSection(options);

  const titleCase = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `${frontmatter}

# ${titleCase}

${description}

## Usage

\`\`\`
/${name}${args.length > 0 ? ' ' + args.map(a => a.required ? `<${a.name}>` : `[${a.name}]`).join(' ') : ''}${options.length > 0 ? ' [options]' : ''}
\`\`\`
${argsSection}${optionsSection}

## Execution

1. **Validate inputs**: Verify all required arguments are provided
2. **Process request**: Execute the primary operation
3. **Generate output**: Return results in appropriate format
4. **Report status**: Indicate success or failure with clear messaging

${guidance ? `## Guidance\n\n${guidance}\n` : ''}
## Output

The command returns:
- Success message with operation details
- Any generated artifacts or file paths
- Relevant metrics or status information

## Examples

\`\`\`bash
# Basic usage
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''}

# With options
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''}${options.length > 0 ? ` --${options[0].name} value` : ''}

# Interactive mode
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''} --interactive
\`\`\`

## Related Commands

- See other commands in the same domain for related functionality
`;
}

/**
 * Transformation template - input/output pipeline
 */
export function generateTransformationTemplate(
  name: string,
  description: string,
  args: CommandArg[] = [],
  options: CommandOption[] = [],
  guidance?: string
): string {
  const frontmatter = generateFrontmatter(name, description, args, options);
  const argsSection = generateArgumentsSection(args);
  const optionsSection = generateOptionsSection(options);

  const titleCase = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `${frontmatter}

# ${titleCase}

${description}

## Usage

\`\`\`
/${name}${args.length > 0 ? ' ' + args.map(a => a.required ? `<${a.name}>` : `[${a.name}]`).join(' ') : ''}${options.length > 0 ? ' [options]' : ''}
\`\`\`
${argsSection}${optionsSection}

## Transformation Pipeline

1. **Input validation**: Verify input format and content
2. **Pre-processing**: Prepare input for transformation
3. **Core transformation**: Apply main transformation logic
4. **Post-processing**: Format and validate output
5. **Output generation**: Write transformed content to target

${guidance ? `## Guidance\n\n${guidance}\n` : ''}
## Input Requirements

Describe expected input format, structure, or constraints.

## Output Format

Describe output format, structure, and location.

## Examples

\`\`\`bash
# Basic transformation
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''}

# With custom options
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''}${options.length > 0 ? ` --${options[0].name} value` : ''}

# Interactive mode
/${name} --interactive
\`\`\`

## Validation

- Input validation criteria
- Output validation criteria
- Error handling and recovery

## Related Commands

- See other transformation commands for similar pipelines
`;
}

/**
 * Orchestration template - multi-agent workflow
 */
export function generateOrchestrationTemplate(
  name: string,
  description: string,
  args: CommandArg[] = [],
  options: CommandOption[] = [],
  guidance?: string
): string {
  const frontmatter = generateFrontmatter(name, description, args, options);
  const argsSection = generateArgumentsSection(args);
  const optionsSection = generateOptionsSection(options);

  const titleCase = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `${frontmatter}

# ${titleCase}

${description}

## Usage

\`\`\`
/${name}${args.length > 0 ? ' ' + args.map(a => a.required ? `<${a.name}>` : `[${a.name}]`).join(' ') : ''}${options.length > 0 ? ' [options]' : ''}
\`\`\`
${argsSection}${optionsSection}

## Workflow Phases

### Phase 1: Initialization
- Validate prerequisites
- Gather required inputs
- Set up working context

### Phase 2: Primary Execution
- Coordinate agent assignments
- Execute parallel tasks
- Monitor progress

### Phase 3: Review & Synthesis
- Collect agent outputs
- Synthesize results
- Validate completeness

### Phase 4: Finalization
- Archive artifacts
- Generate reports
- Update project state

${guidance ? `## Guidance\n\n${guidance}\n` : ''}
## Agent Coordination

### Primary Author
- Responsible agent for main deliverable
- Draft initial version

### Parallel Reviewers
Launch in single message for concurrent review:
- Domain expert reviews
- Quality validation
- Technical validation

### Synthesizer
- Merge review feedback
- Resolve conflicts
- Generate final version

## Artifacts Generated

List expected artifacts, their locations, and purposes.

## Success Criteria

Define what constitutes successful completion:
- Required deliverables present
- Quality gates passed
- All reviews completed

## Examples

\`\`\`bash
# Standard execution
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''}

# With strategic guidance
/${name}${args.length > 0 && args[0].required ? ` <${args[0].name}>` : ''} --guidance "Focus on security and performance"

# Interactive mode
/${name} --interactive
\`\`\`

## Related Workflows

- See other orchestration commands for similar multi-agent patterns
`;
}

/**
 * Generate command content based on template type
 */
export function generateCommandContent(
  template: CommandTemplate,
  name: string,
  description: string,
  args: CommandArg[] = [],
  options: CommandOption[] = [],
  guidance?: string
): string {
  switch (template) {
    case 'utility':
      return generateUtilityTemplate(name, description, args, options, guidance);
    case 'transformation':
      return generateTransformationTemplate(name, description, args, options, guidance);
    case 'orchestration':
      return generateOrchestrationTemplate(name, description, args, options, guidance);
    default:
      throw new Error(`Unknown template type: ${template}`);
  }
}
