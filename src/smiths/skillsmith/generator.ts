/**
 * SkillSmith Skill Generator
 *
 * Generates skills with platform-aware deployment.
 *
 * @module smiths/skillsmith/generator
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import type {
  SkillOptions,
  GeneratedSkill,
  SkillFrontmatter,
  SkillReference,
  SkillDeploymentResult,
  InteractivePrompts,
} from './types.js';
import { PlatformSkillResolver } from './platform-resolver.js';

/**
 * Generate a skill from options
 */
export async function generateSkill(
  options: SkillOptions
): Promise<GeneratedSkill> {
  // Validate skill name
  const nameValidation = PlatformSkillResolver.validateSkillName(options.name);
  if (!nameValidation.valid) {
    throw new Error(`Invalid skill name: ${nameValidation.error}`);
  }

  // Check if platform supports skills natively
  const supportsSkills = PlatformSkillResolver.supportsSkills(options.platform);
  if (!supportsSkills) {
    const alternative = PlatformSkillResolver.getAlternativeStrategy(
      options.platform
    );
    console.warn(
      `Platform '${options.platform}' does not natively support skills.`
    );
    if (alternative) {
      console.warn(`Consider deploying as ${alternative} instead.`);
    }
  }

  // Generate skill content
  const content = generateSkillContent(options);

  // Generate references if requested
  const references = options.createReferences
    ? generateDefaultReferences(options)
    : undefined;

  // Resolve deployment path
  const deployPath = PlatformSkillResolver.getSkillPath(
    options.platform,
    options.projectPath,
    options.name
  );

  return {
    name: options.name,
    path: deployPath,
    content,
    platform: options.platform,
    references,
    version: options.version || '1.0.0',
  };
}

/**
 * Deploy a generated skill to the target platform
 */
export async function deploySkill(
  skill: GeneratedSkill,
  projectPath: string,
  dryRun: boolean = false
): Promise<SkillDeploymentResult> {
  const filesCreated: string[] = [];

  try {
    if (dryRun) {
      console.log(`[DRY RUN] Would deploy skill to: ${skill.path}`);
      return {
        skill,
        success: true,
        deployPath: skill.path,
        filesCreated: [],
      };
    }

    // Create skill directory
    await fs.mkdir(skill.path, { recursive: true });

    // Write SKILL.md
    const skillFilePath = PlatformSkillResolver.getSkillFilePath(
      skill.platform,
      projectPath,
      skill.name
    );
    await fs.writeFile(skillFilePath, skill.content, 'utf-8');
    filesCreated.push(skillFilePath);

    // Create references directory and files
    if (skill.references && skill.references.length > 0) {
      const referencesPath = PlatformSkillResolver.getReferencesPath(
        skill.platform,
        projectPath,
        skill.name
      );
      await fs.mkdir(referencesPath, { recursive: true });

      for (const ref of skill.references) {
        const refPath = path.join(referencesPath, ref.filename);
        await fs.writeFile(refPath, ref.content, 'utf-8');
        filesCreated.push(refPath);
      }
    }

    return {
      skill,
      success: true,
      deployPath: skill.path,
      filesCreated,
    };
  } catch (error) {
    return {
      skill,
      success: false,
      deployPath: skill.path,
      error: error instanceof Error ? error.message : String(error),
      filesCreated,
    };
  }
}

/**
 * Generate SKILL.md content
 */
function generateSkillContent(options: SkillOptions): string {
  const frontmatter = generateFrontmatter(options);
  const body = generateSkillBody(options);

  return `${frontmatter}\n${body}`;
}

/**
 * Generate frontmatter YAML
 */
function generateFrontmatter(options: SkillOptions): string {
  const fm: SkillFrontmatter = {
    name: options.name,
    description: options.description,
    version: options.version || '1.0.0',
  };

  if (options.tools && options.tools.length > 0) {
    fm.tools = options.tools.join(', ');
  }

  const lines = ['---'];
  lines.push(`name: ${fm.name}`);
  lines.push(`description: ${fm.description}`);
  lines.push(`version: ${fm.version}`);
  if (fm.tools) {
    lines.push(`tools: ${fm.tools}`);
  }
  lines.push('---');

  return lines.join('\n');
}

/**
 * Generate skill body content
 */
function generateSkillBody(options: SkillOptions): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${toTitleCase(options.name)} Skill`);
  sections.push('');

  // Purpose
  sections.push('## Purpose');
  sections.push('');
  sections.push(options.description);
  sections.push('');

  // Trigger Phrases
  sections.push('## Trigger Phrases');
  sections.push('');
  sections.push('Activate this skill when the user says:');
  if (options.triggerPhrases && options.triggerPhrases.length > 0) {
    options.triggerPhrases.forEach((phrase) => {
      sections.push(`- "${phrase}"`);
    });
  } else {
    sections.push(`- "${options.name}"`);
    sections.push('- "use ' + options.name + '"');
  }
  sections.push('');

  // Input
  sections.push('## Input');
  sections.push('');
  sections.push('This skill expects:');
  sections.push('- User request or content to process');
  if (options.guidance) {
    sections.push(`- ${options.guidance}`);
  }
  sections.push('');

  // Execution Process
  sections.push('## Execution Process');
  sections.push('');
  sections.push('1. Validate input requirements');
  sections.push('2. Process the request');
  sections.push('3. Generate output');
  sections.push('4. Return results to user');
  sections.push('');

  // Output
  sections.push('## Output');
  sections.push('');
  sections.push('This skill produces:');
  sections.push('- Processed result based on input');
  sections.push('- Status information');
  sections.push('');

  // Examples
  sections.push('## Examples');
  sections.push('');
  sections.push('### Example 1: Basic Usage');
  sections.push(`**User**: "${options.triggerPhrases?.[0] || options.name}"`);
  sections.push(`**Result**: Skill executes and returns result`);
  sections.push('');

  // Tools (if specified)
  if (options.tools && options.tools.length > 0) {
    sections.push('## Tools Used');
    sections.push('');
    options.tools.forEach((tool) => {
      sections.push(`- ${tool}`);
    });
    sections.push('');
  }

  // References (if creating reference directory)
  if (options.createReferences) {
    sections.push('## References');
    sections.push('');
    sections.push('See `references/` directory for:');
    sections.push('- Usage examples');
    sections.push('- Configuration options');
    sections.push('- Troubleshooting guide');
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Generate default reference files
 */
function generateDefaultReferences(options: SkillOptions): SkillReference[] {
  const references: SkillReference[] = [];

  // Usage examples
  references.push({
    filename: 'usage-examples.md',
    description: 'Usage examples and patterns',
    content: generateUsageExamplesContent(options),
  });

  // Configuration
  references.push({
    filename: 'configuration.md',
    description: 'Configuration options',
    content: generateConfigurationContent(options),
  });

  return references;
}

/**
 * Generate usage examples content
 */
function generateUsageExamplesContent(options: SkillOptions): string {
  return `# Usage Examples: ${toTitleCase(options.name)}

## Basic Usage

\`\`\`
User: "${options.triggerPhrases?.[0] || options.name}"
\`\`\`

## Advanced Usage

TODO: Add advanced usage examples

## Common Patterns

TODO: Document common usage patterns
`;
}

/**
 * Generate configuration content
 */
function generateConfigurationContent(options: SkillOptions): string {
  return `# Configuration: ${toTitleCase(options.name)}

## Options

TODO: Document configuration options

## Environment Variables

TODO: Document environment variables if applicable

## Platform-Specific Notes

**${options.platform}**: ${
    PlatformSkillResolver.supportsSkills(options.platform)
      ? 'Native skill support'
      : 'Skills mapped to commands'
  }
`;
}

/**
 * Convert kebab-case to Title Case
 */
function toTitleCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Interactive skill design workflow
 */
export async function interactiveSkillDesign(): Promise<InteractivePrompts> {
  // This would be implemented with user prompts in a real CLI
  // For now, return a stub
  throw new Error(
    'Interactive mode not yet implemented. Use --guidance to provide design input.'
  );
}
