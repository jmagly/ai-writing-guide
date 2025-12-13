#!/usr/bin/env node
/**
 * SkillSmith Demo
 *
 * Demonstrates SkillSmith functionality.
 * Run: node --loader ts-node/esm src/smiths/skillsmith/demo.ts
 *
 * @module smiths/skillsmith/demo
 */

import { generateSkill, deploySkill } from './generator.js';
import { PlatformSkillResolver } from './platform-resolver.js';
// SkillOptions type used inline in generateSkill calls

async function demo() {
  console.log('=== SkillSmith Demo ===\n');

  // Example 1: Generate a basic skill
  console.log('1. Generating basic skill...');
  const basicSkill = await generateSkill({
    name: 'hello-world',
    description: 'A simple hello world skill',
    platform: 'claude',
    projectPath: '/tmp/demo',
    triggerPhrases: ['hello', 'say hello', 'greet'],
  });

  console.log(`   Generated: ${basicSkill.name}`);
  console.log(`   Platform: ${basicSkill.platform}`);
  console.log(`   Deploy path: ${basicSkill.path}\n`);

  // Example 2: Generate skill with tools
  console.log('2. Generating skill with tools...');
  const toolSkill = await generateSkill({
    name: 'file-analyzer',
    description: 'Analyzes file structure and content',
    platform: 'claude',
    projectPath: '/tmp/demo',
    tools: ['Read', 'Glob', 'Grep'],
    triggerPhrases: ['analyze files', 'check structure', 'review files'],
    createReferences: true,
  });

  console.log(`   Generated: ${toolSkill.name}`);
  console.log(`   Tools: ${toolSkill.content.match(/tools: (.+)/)?.[1] || 'none'}`);
  console.log(`   References: ${toolSkill.references?.length || 0} files\n`);

  // Example 3: Platform-specific paths
  console.log('3. Platform-specific deployment paths:');
  const platforms: Array<'claude' | 'factory' | 'cursor'> = ['claude', 'factory', 'cursor'];
  platforms.forEach((platform) => {
    const basePath = PlatformSkillResolver.getBaseDir(platform, '/project');
    const supports = PlatformSkillResolver.supportsSkills(platform);
    const alternative = PlatformSkillResolver.getAlternativeStrategy(platform);
    console.log(`   ${platform}:`);
    console.log(`     Base: ${basePath}`);
    console.log(`     Native support: ${supports}`);
    if (!supports && alternative) {
      console.log(`     Alternative: ${alternative}`);
    }
  });
  console.log();

  // Example 4: Skill name validation
  console.log('4. Skill name validation:');
  const names = ['valid-skill', 'Invalid_Name', 'also-valid', '-invalid'];
  names.forEach((name) => {
    const result = PlatformSkillResolver.validateSkillName(name);
    console.log(`   "${name}": ${result.valid ? '✓ valid' : '✗ ' + result.error}`);
  });
  console.log();

  // Example 5: Dry run deployment
  console.log('5. Dry run deployment...');
  const result = await deploySkill(basicSkill, '/tmp/demo', true);
  console.log(`   Success: ${result.success}`);
  console.log(`   Deploy path: ${result.deployPath}`);
  console.log(`   Files created: ${result.filesCreated.length}\n`);

  // Example 6: Show generated content
  console.log('6. Sample generated content:');
  console.log('   ---');
  const lines = basicSkill.content.split('\n').slice(0, 20);
  lines.forEach((line) => console.log(`   ${line}`));
  console.log('   ...\n');

  console.log('=== Demo Complete ===');
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}

export { demo };
