#!/usr/bin/env node
/**
 * Add Post-Completion section to flow commands for workspace health guidance
 *
 * Usage: node tools/commands/add-post-completion.mjs [--dry-run] [--target <dir>]
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetIdx = args.indexOf('--target');
const targetDir = targetIdx !== -1 ? args[targetIdx + 1] : '.claude/commands';

// Only apply to phase transition and major workflow flows
const FLOW_PATTERNS = [
  /^flow-.*-to-.*\.md$/,         // Phase transitions
  /^flow-delivery-track\.md$/,   // Delivery iterations
  /^flow-discovery-track\.md$/,  // Discovery iterations
  /^flow-iteration-.*\.md$/,     // Iteration flows
  /^flow-gate-check\.md$/,       // Gate checks (after pass)
  /^flow-deploy-to-production\.md$/, // Deployment
];

const POST_COMPLETION_SECTION = `

## Post-Completion

After this flow completes successfully:

### Workspace Health Check (Recommended)

Run a workspace health assessment to ensure alignment:

\`\`\`
/project-status
\`\`\`

Or ask: "check workspace health"

This will:
- Verify artifacts are properly archived
- Check for stale files in .aiwg/working/
- Confirm documentation alignment with current phase
- Suggest any cleanup actions

### Common Follow-up Actions

**If workspace needs cleanup**:
- \`/workspace-prune-working\` - Remove stale draft files
- \`/workspace-realign\` - Reorganize misaligned documentation

**If documentation is out of sync**:
- \`/aiwg-regenerate\` - Regenerate context files
- \`/check-traceability\` - Verify requirement links
`;

function shouldProcess(filename) {
  return FLOW_PATTERNS.some(pattern => pattern.test(filename));
}

function processCommand(filePath) {
  const filename = basename(filePath);

  if (!shouldProcess(filename)) {
    return { skipped: true };
  }

  const content = readFileSync(filePath, 'utf-8');

  // Check if already has Post-Completion section
  if (content.includes('## Post-Completion')) {
    console.log(`  [OK] ${filename} (already has Post-Completion)`);
    return { alreadyHas: true };
  }

  // Find a good insertion point - before References or at end
  let newContent;
  const referencesMatch = content.match(/\n## References\n/);

  if (referencesMatch) {
    // Insert before References section
    const insertPoint = content.indexOf(referencesMatch[0]);
    newContent = content.slice(0, insertPoint) + POST_COMPLETION_SECTION + content.slice(insertPoint);
  } else {
    // Append to end
    newContent = content + POST_COMPLETION_SECTION;
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
console.log(`\nAdding Post-Completion section to flow commands in: ${targetDir}`);
console.log(`Mode: ${dryRun ? 'DRY RUN' : 'WRITE'}\n`);

const files = readdirSync(targetDir)
  .filter(f => f.endsWith('.md') && f.startsWith('flow-'))
  .map(f => join(targetDir, f));

const stats = {
  skipped: 0,
  alreadyHas: 0,
  updated: 0,
  wouldUpdate: 0,
};

for (const file of files) {
  const result = processCommand(file);
  if (result.skipped) stats.skipped++;
  else if (result.alreadyHas) stats.alreadyHas++;
  else if (result.updated) stats.updated++;
  else if (result.wouldUpdate) stats.wouldUpdate++;
}

console.log(`\nSummary:`);
console.log(`  Already has section: ${stats.alreadyHas}`);
console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${dryRun ? stats.wouldUpdate : stats.updated}`);
console.log(`  Skipped (not matching): ${stats.skipped}`);
