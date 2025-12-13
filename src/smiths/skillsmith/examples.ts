/**
 * SkillSmith Usage Examples
 *
 * Demonstrates how to use SkillSmith to generate skills.
 *
 * @module smiths/skillsmith/examples
 */

import { generateSkill, deploySkill } from './generator.js';
import type { SkillOptions } from './types.js';

/**
 * Example 1: Generate a basic voice application skill
 */
export async function generateVoiceApplySkill(projectPath: string) {
  const options: SkillOptions = {
    name: 'voice-apply',
    description: 'Applies voice profiles to transform content',
    platform: 'claude',
    projectPath,
    triggerPhrases: [
      'apply voice',
      'use voice',
      'write in voice',
      'transform to voice',
    ],
    tools: ['Read', 'Write'],
    createReferences: true,
    version: '1.0.0',
  };

  const skill = await generateSkill(options);
  const result = await deploySkill(skill, projectPath);

  console.log(`Deployed voice-apply skill to: ${result.deployPath}`);
  console.log(`Files created: ${result.filesCreated.length}`);

  return result;
}

/**
 * Example 2: Generate a code analysis skill
 */
export async function generateCodeAnalyzerSkill(projectPath: string) {
  const options: SkillOptions = {
    name: 'code-analyzer',
    description: 'Analyzes code quality, patterns, and potential issues',
    platform: 'claude',
    projectPath,
    triggerPhrases: [
      'analyze code',
      'check code quality',
      'review code',
      'find code issues',
    ],
    tools: ['Read', 'Glob', 'Grep', 'Bash'],
    createReferences: true,
  };

  const skill = await generateSkill(options);
  const result = await deploySkill(skill, projectPath);

  return result;
}

/**
 * Example 3: Generate a test generation skill
 */
export async function generateTestGeneratorSkill(projectPath: string) {
  const options: SkillOptions = {
    name: 'test-generator',
    description: 'Generates comprehensive test suites from code',
    platform: 'claude',
    projectPath,
    triggerPhrases: ['generate tests', 'create test suite', 'write tests for'],
    tools: ['Read', 'Write', 'Glob', 'Grep'],
    guidance: 'Focus on edge cases and integration scenarios',
  };

  const skill = await generateSkill(options);
  return deploySkill(skill, projectPath);
}

/**
 * Example 4: Generate skill with dry-run
 */
export async function previewSkillGeneration(projectPath: string) {
  const skill = await generateSkill({
    name: 'example-skill',
    description: 'An example skill',
    platform: 'claude',
    projectPath,
    triggerPhrases: ['example', 'demo skill'],
  });

  // Preview without writing files
  const result = await deploySkill(skill, projectPath, true);
  console.log('Dry run result:', result);

  return result;
}

/**
 * Example 5: Generate skill for multiple platforms
 */
export async function generateMultiPlatformSkill(projectPath: string) {
  const platforms = ['claude', 'factory', 'cursor'] as const;
  const results = [];

  for (const platform of platforms) {
    const skill = await generateSkill({
      name: 'multi-platform-skill',
      description: 'A skill that works across platforms',
      platform,
      projectPath,
      triggerPhrases: ['multi platform', 'cross platform'],
    });

    const result = await deploySkill(skill, projectPath);
    results.push(result);
    console.log(`Deployed to ${platform}: ${result.deployPath}`);
  }

  return results;
}

/**
 * Example 6: Generate skill with custom version
 */
export async function generateVersionedSkill(projectPath: string) {
  const skill = await generateSkill({
    name: 'versioned-skill',
    description: 'A skill with version control',
    platform: 'claude',
    projectPath,
    version: '2.1.0',
    triggerPhrases: ['versioned example'],
  });

  return deploySkill(skill, projectPath);
}

/**
 * Example 7: Batch generate skills from configuration
 */
export async function batchGenerateSkills(
  projectPath: string,
  skillConfigs: Array<Omit<SkillOptions, 'projectPath'>>
) {
  const results = [];

  for (const config of skillConfigs) {
    const skill = await generateSkill({
      ...config,
      projectPath,
    });

    const result = await deploySkill(skill, projectPath);
    results.push(result);
  }

  console.log(`Generated ${results.length} skills`);
  return results;
}

/**
 * Example usage in a CLI or script
 */
export async function exampleCliUsage() {
  const projectPath = process.cwd();

  // Generate a single skill
  await generateVoiceApplySkill(projectPath);

  // Generate multiple skills
  await batchGenerateSkills(projectPath, [
    {
      name: 'skill-one',
      description: 'First skill',
      platform: 'claude',
      triggerPhrases: ['skill one'],
    },
    {
      name: 'skill-two',
      description: 'Second skill',
      platform: 'claude',
      triggerPhrases: ['skill two'],
    },
  ]);
}
