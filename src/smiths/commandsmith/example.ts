/**
 * CommandSmith Usage Examples
 *
 * Demonstrates how to generate and deploy platform-aware commands.
 */

import {
  generateCommand,
  deployCommand,
  generateAndDeploy,
  listCommands,
  validateCommand,
} from './index.js';

/**
 * Example 1: Generate a simple utility command
 */
export async function generateSimpleUtility(projectPath: string) {
  const command = await generateCommand({
    name: 'backup-config',
    description: 'Backup project configuration files',
    template: 'utility',
    platform: 'claude',
    projectPath,
    args: [
      {
        name: 'destination',
        description: 'Backup location',
        required: false,
        default: './backups',
      },
    ],
  });

  console.log('Generated command:');
  console.log(`  Name: ${command.name}`);
  console.log(`  Path: ${command.path}`);
  console.log(`  Template: ${command.template}`);

  return command;
}

/**
 * Example 2: Generate a transformation pipeline
 */
export async function generateTransformationPipeline(projectPath: string) {
  const result = await generateAndDeploy(
    {
      name: 'convert-docs',
      description: 'Convert documentation from Markdown to HTML',
      template: 'transformation',
      platform: 'claude',
      projectPath,
      args: [
        { name: 'input', description: 'Input directory', required: true },
        { name: 'output', description: 'Output directory', required: true },
      ],
      options: [
        { name: 'theme', description: 'HTML theme', type: 'string', default: 'default' },
        { name: 'minify', description: 'Minify output', type: 'boolean', default: false },
      ],
    },
    { backup: true }
  );

  if (result.success) {
    console.log(`✓ Deployed to ${result.command.path}`);
    if (result.backed_up) {
      console.log('  (existing file backed up)');
    }
  } else {
    console.error(`✗ Failed: ${result.error}`);
  }

  return result;
}

/**
 * Example 3: Generate an orchestration workflow
 */
export async function generateOrchestrationWorkflow(projectPath: string) {
  const result = await generateAndDeploy(
    {
      name: 'flow-security-audit',
      description: 'Execute comprehensive security audit workflow',
      template: 'orchestration',
      platform: 'claude',
      projectPath,
      args: [
        { name: 'scope', description: 'Audit scope', required: true },
      ],
      options: [
        {
          name: 'severity',
          description: 'Minimum severity level',
          type: 'string',
          default: 'medium',
        },
      ],
      guidance: 'Focus on OWASP Top 10 and supply chain security',
    },
    { force: false, backup: true }
  );

  return result;
}

/**
 * Example 4: Deploy to multiple platforms
 */
export async function deployMultiPlatform(projectPath: string) {
  const platforms = ['claude', 'factory', 'cursor'] as const;
  const results = [];

  for (const platform of platforms) {
    const result = await generateAndDeploy({
      name: 'lint-all',
      description: 'Run all linters on the codebase',
      template: 'utility',
      platform,
      projectPath,
      args: [
        { name: 'fix', description: 'Auto-fix issues', required: false },
      ],
      options: [
        { name: 'strict', description: 'Strict mode', type: 'boolean', default: false },
      ],
    });

    results.push({ platform, success: result.success, path: result.command.path });
  }

  console.log('\nMulti-platform deployment:');
  results.forEach(({ platform, success, path }) => {
    console.log(`  ${success ? '✓' : '✗'} ${platform}: ${path}`);
  });

  return results;
}

/**
 * Example 5: Validate before deploying
 */
export async function validateBeforeDeploy(projectPath: string) {
  const command = await generateCommand({
    name: 'invalid-command',
    description: 'This will have validation issues',
    template: 'utility',
    platform: 'claude',
    projectPath,
  });

  const validation = validateCommand(command);

  if (!validation.valid) {
    console.log('Validation errors:');
    validation.issues
      .filter(i => i.type === 'error')
      .forEach(issue => {
        console.log(`  ✗ ${issue.field}: ${issue.message}`);
        if (issue.suggestion) {
          console.log(`    Suggestion: ${issue.suggestion}`);
        }
      });

    return null;
  }

  const result = await deployCommand(command, { backup: true });
  return result;
}

/**
 * Example 6: List existing commands
 */
export async function showExistingCommands(projectPath: string) {
  const platforms = ['claude', 'factory', 'cursor'] as const;

  console.log('\nExisting commands by platform:');
  for (const platform of platforms) {
    const commands = await listCommands(platform, projectPath);
    console.log(`\n${platform}:`);
    if (commands.length === 0) {
      console.log('  (no commands)');
    } else {
      commands.forEach(cmd => console.log(`  - ${cmd}`));
    }
  }
}

/**
 * Example 7: Dry run (preview without deploying)
 */
export async function previewCommand(projectPath: string) {
  const result = await generateAndDeploy(
    {
      name: 'preview-example',
      description: 'This is a preview command',
      template: 'utility',
      platform: 'claude',
      projectPath,
      dryRun: true,
    },
    { backup: true }
  );

  console.log('Preview (dry run):');
  console.log(`  Would deploy to: ${result.command.path}`);
  console.log(`  Content preview:\n${result.command.content.slice(0, 200)}...`);

  return result;
}

/**
 * Example 8: Generate Cursor-specific JSON command
 */
export async function generateCursorCommand(projectPath: string) {
  const command = await generateCommand({
    name: 'cursor-example',
    description: 'Example command for Cursor',
    template: 'utility',
    platform: 'cursor',
    projectPath,
    args: [
      { name: 'input', description: 'Input file', required: true },
    ],
    options: [
      { name: 'format', description: 'Output format', type: 'string', default: 'json' },
    ],
  });

  console.log('Cursor command (JSON format):');
  console.log(JSON.parse(command.content));

  return command;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  const projectPath = process.cwd();

  console.log('=== CommandSmith Examples ===\n');

  console.log('1. Simple utility command:');
  await generateSimpleUtility(projectPath);

  console.log('\n2. Transformation pipeline:');
  await generateTransformationPipeline(projectPath);

  console.log('\n3. Orchestration workflow:');
  await generateOrchestrationWorkflow(projectPath);

  console.log('\n4. Multi-platform deployment:');
  await deployMultiPlatform(projectPath);

  console.log('\n5. Validate before deploy:');
  await validateBeforeDeploy(projectPath);

  console.log('\n6. List existing commands:');
  await showExistingCommands(projectPath);

  console.log('\n7. Dry run preview:');
  await previewCommand(projectPath);

  console.log('\n8. Cursor JSON command:');
  await generateCursorCommand(projectPath);
}
