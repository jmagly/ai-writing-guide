#!/usr/bin/env node
/**
 * AIWG Demo Command
 * Creates a minimal working AIWG project for quick evaluation
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEMO_DIR = path.join(process.env.HOME || '', 'aiwg-demo');

// Minimal project template
const DEMO_FILES = {
  'README.md': `# AIWG Demo Project

This is a demo project created by \`aiwg demo\` to help you explore AIWG.

## Quick Start

\`\`\`bash
# You're already in the demo directory!

# Check project status
aiwg -status

# Run the intake wizard to set up your project
# (This is where the magic happens)
/intake-wizard

# Or try natural language commands:
# "where are we?"
# "check workspace health"
\`\`\`

## What's Included

- \`.aiwg/\` - Project artifacts directory (requirements, architecture, etc.)
- \`CLAUDE.md\` - Instructions for Claude Code
- \`.claude/agents/\` - AI agents deployed and ready
- \`.claude/commands/\` - Workflow commands available

## Next Steps

1. Open this folder in Claude Code or Cursor
2. Try \`/intake-wizard\` to configure your project
3. Explore the available commands with \`/help\`

## Learn More

- Website: https://aiwg.io
- Discord: https://discord.gg/BuAusFMxdA
- Docs: https://github.com/jmagly/ai-writing-guide
`,

  '.aiwg/intake/project-intake.md': `# Project Intake Form

## Project Overview

**Project Name:** AIWG Demo Project
**Description:** A demo project to explore AIWG capabilities
**Type:** Exploration/Learning

## Stakeholders

- **Primary User:** Demo User

## Goals

1. Explore AIWG workflows
2. Understand SDLC automation
3. Test agent capabilities

## Status

- [x] Intake form created
- [ ] Solution profile defined
- [ ] Requirements gathered
`,

  '.aiwg/requirements/UC-001-explore-aiwg.md': `# UC-001: Explore AIWG Capabilities

## Summary

As a new user, I want to explore AIWG's capabilities so that I can understand how it can help my projects.

## Actors

- Demo User

## Preconditions

- AIWG installed via npm
- Demo project created

## Main Flow

1. User runs \`aiwg demo\`
2. System creates demo project
3. User opens project in Claude Code
4. User explores available commands
5. User runs intake wizard
6. System guides user through setup

## Postconditions

- User understands AIWG basics
- User ready to create real project

## Acceptance Criteria

- [ ] Demo project created successfully
- [ ] All agents deployed
- [ ] Commands available
- [ ] MCP server can start
`,
};

async function createDemo() {
  console.log('');
  console.log('🚀 Creating AIWG Demo Project...');
  console.log('');

  // Check if demo dir exists
  try {
    await fs.access(DEMO_DIR);
    console.log(`⚠️  Demo directory already exists: ${DEMO_DIR}`);
    console.log('   Delete it first or use a different location.');
    console.log('');
    console.log(`   rm -rf ${DEMO_DIR}`);
    console.log('');
    process.exit(1);
  } catch {
    // Good, doesn't exist
  }

  // Create demo directory
  await fs.mkdir(DEMO_DIR, { recursive: true });
  console.log(`✓ Created ${DEMO_DIR}`);

  // Create subdirectories
  const dirs = [
    '.aiwg/intake',
    '.aiwg/requirements',
    '.aiwg/architecture',
    '.aiwg/planning',
    '.aiwg/working',
    '.claude/agents',
    '.claude/commands',
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(DEMO_DIR, dir), { recursive: true });
  }
  console.log('✓ Created directory structure');

  // Write demo files
  for (const [filePath, content] of Object.entries(DEMO_FILES)) {
    const fullPath = path.join(DEMO_DIR, filePath);
    await fs.writeFile(fullPath, content, 'utf-8');
  }
  console.log('✓ Created demo files');

  // Deploy SDLC framework
  console.log('');
  console.log('📦 Deploying SDLC framework...');

  try {
    execSync('aiwg use sdlc', {
      cwd: DEMO_DIR,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('⚠️  Framework deployment had issues, but demo may still work');
  }

  // Print success message
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Demo project ready!');
  console.log('');
  console.log('   🚀 Next steps:');
  console.log('');
  console.log(`   cd ${DEMO_DIR}`);
  console.log('');
  console.log('   Then open in Claude Code or Cursor and try:');
  console.log('');
  console.log('   /intake-wizard          # Configure your project');
  console.log('   "where are we?"         # Check project status');
  console.log('   "check workspace health" # Validate setup');
  console.log('');
  console.log('   Or explore: @.aiwg/requirements/');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

// Run
createDemo().catch(error => {
  console.error('Error creating demo:', error.message);
  process.exit(1);
});
