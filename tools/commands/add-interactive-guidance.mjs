#!/usr/bin/env node
/**
 * Add --interactive and --guidance parameters to commands that are missing them
 *
 * Usage: node tools/commands/add-interactive-guidance.mjs [--dry-run] [--target <dir>]
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const targetDir = targetIdx !== -1 ? args[targetIdx + 1] : '.claude/commands';

// Files to skip (not actual commands)
const SKIP_FILES = [
  'subagents-README.md',
  'subagents-and-commands-guide.md',
  'mention-conventions.md', // Reference doc, not a command
];

// Commands that intentionally don't need interactive/guidance
const INTENTIONAL_SKIP = [
  'aiwg-kb.md', // Knowledge base lookup - simple query
];

function processCommand(filePath) {
  const filename = basename(filePath);

  if (SKIP_FILES.includes(filename) || INTENTIONAL_SKIP.includes(filename)) {
    console.log(`  [SKIP] ${filename} (excluded)`);
    return { skipped: true };
  }

  const content = readFileSync(filePath, 'utf-8');

  // Check if already has interactive or guidance
  if (content.includes('--interactive') || content.includes('--guidance')) {
    console.log(`  [OK] ${filename} (already has params)`);
    return { alreadyHas: true };
  }

  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.log(`  [WARN] ${filename} (no frontmatter)`);
    return { noFrontmatter: true };
  }

  const frontmatter = frontmatterMatch[1];
  const afterFrontmatter = content.slice(frontmatterMatch[0].length);

  // Find argument-hint line
  const argHintMatch = frontmatter.match(/^(argument-hint:\s*)(.*)$/m);

  let newFrontmatter;
  if (argHintMatch) {
    // Append to existing argument-hint
    const existingHint = argHintMatch[2].trim();
    const newHint = existingHint
      ? `${existingHint} [--guidance "text"] [--interactive]`
      : '[--guidance "text"] [--interactive]';
    newFrontmatter = frontmatter.replace(
      argHintMatch[0],
      `${argHintMatch[1]}${newHint}`
    );
  } else {
    // Add argument-hint line after description
    const descMatch = frontmatter.match(/^(description:\s*.*)$/m);
    if (descMatch) {
      newFrontmatter = frontmatter.replace(
        descMatch[0],
        `${descMatch[0]}\nargument-hint: [--guidance "text"] [--interactive]`
      );
    } else {
      console.log(`  [WARN] ${filename} (no description to insert after)`);
      return { noDescription: true };
    }
  }

  // Add usage section if not present
  let newContent = `---\n${newFrontmatter}\n---${afterFrontmatter}`;

  if (!newContent.includes('## Interactive Mode') && !newContent.includes('## Guidance')) {
    // Find a good place to add (before last section or at end)
    const usageSection = `

## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
\`\`\`
/${filename.replace('.md', '')} --guidance "Focus on security implications"
\`\`\`

### --interactive
Enable interactive mode for step-by-step confirmation and input:
\`\`\`
/${filename.replace('.md', '')} --interactive
\`\`\`

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them
`;

    // Insert before the last major section or at end
    const lastSectionMatch = newContent.match(/\n## [^#\n]+\n[^#]*$/);
    if (lastSectionMatch && lastSectionMatch.index) {
      newContent = newContent.slice(0, lastSectionMatch.index) + usageSection + lastSectionMatch[0];
    } else {
      newContent = newContent + usageSection;
    }
  }

  if (dryRun) {
    console.log(`  [DRY] ${filename} would be updated`);
    return { wouldUpdate: true };
  }

  writeFileSync(filePath, newContent);
  console.log(`  [UPDATED] ${filename}`);
  return { updated: true };
}

// Main
console.log(`\nAdding --interactive and --guidance to commands in: ${targetDir}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

const files = readdirSync(targetDir)
  .filter(f => f.endsWith('.md'))
  .map(f => join(targetDir, f));

const stats = {
  skipped: 0,
  alreadyHas: 0,
  updated: 0,
  wouldUpdate: 0,
  errors: 0
};

for (const file of files) {
  const result = processCommand(file);
  if (result.skipped) stats.skipped++;
  else if (result.alreadyHas) stats.alreadyHas++;
  else if (result.updated) stats.updated++;
  else if (result.wouldUpdate) stats.wouldUpdate++;
  else stats.errors++;
}

console.log(`\nSummary:`);
console.log(`  Already has params: ${stats.alreadyHas}`);
console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${dryRun ? stats.wouldUpdate : stats.updated}`);
console.log(`  Skipped: ${stats.skipped}`);
console.log(`  Errors: ${stats.errors}`);
