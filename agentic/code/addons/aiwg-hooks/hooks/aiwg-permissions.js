#!/usr/bin/env node
/**
 * AIWG Permissions Hook
 *
 * Auto-approve trusted AIWG operations to reduce permission prompts.
 *
 * Research Foundation:
 * - Claude Code 2.0.54: PermissionRequest hook for auto-approve patterns
 *
 * Hook Event: PermissionRequest
 *
 * Usage:
 * Add to .claude/settings.local.json:
 * {
 *   "hooks": {
 *     "PermissionRequest": ["node", "/path/to/aiwg-permissions.js"]
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Configuration
const VERBOSE = process.env.AIWG_PERMISSIONS_VERBOSE === 'true';
const LOG_FILE = process.env.AIWG_PERMISSIONS_LOG || '.aiwg/logs/permissions.jsonl';

// Auto-approve patterns
const AUTO_APPROVE_PATTERNS = {
  // Write operations in .aiwg/ directory
  Write: [
    /^\.aiwg\//,
    /^\.aiwg\/working\//,
    /^\.aiwg\/reports\//,
    /^\.aiwg\/traces\//
  ],

  // Read operations for AIWG installation
  Read: [
    /ai-writing-guide/,
    /\.aiwg\//,
    /\.claude\/agents\//,
    /\.claude\/commands\//,
    /CLAUDE\.md$/
  ],

  // Glob operations for AIWG
  Glob: [
    /\.aiwg\//,
    /\.claude\//
  ],

  // Grep operations for AIWG
  Grep: [
    /\.aiwg\//,
    /\.claude\//
  ],

  // Git operations on AIWG branches
  Bash: [
    /^git\s+(status|diff|log|branch)/,
    /^git\s+add\s+\.aiwg\//,
    /^git\s+commit/,
    /^node\s+.*aiwg/,
    /^npm\s+(run|exec)\s+/
  ]
};

// Log permission decision
function logDecision(input, decision, reason) {
  if (!VERBOSE && decision === 'approve') return;

  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    tool: input.tool,
    parameters: input.parameters,
    decision,
    reason
  };

  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');

  if (VERBOSE) {
    console.error(`[AIWG-PERMISSIONS] ${decision}: ${input.tool} - ${reason}`);
  }
}

// Check if operation matches auto-approve patterns
function shouldAutoApprove(tool, parameters) {
  const patterns = AUTO_APPROVE_PATTERNS[tool];
  if (!patterns) return { approve: false, reason: 'No patterns for tool' };

  // Get the relevant parameter to check
  let checkValue = '';
  switch (tool) {
    case 'Write':
    case 'Read':
      checkValue = parameters.file_path || '';
      break;
    case 'Glob':
      checkValue = parameters.pattern || '';
      break;
    case 'Grep':
      checkValue = parameters.path || '.';
      break;
    case 'Bash':
      checkValue = parameters.command || '';
      break;
    default:
      return { approve: false, reason: 'Unknown tool' };
  }

  // Check against patterns
  for (const pattern of patterns) {
    if (pattern.test(checkValue)) {
      return { approve: true, reason: `Matches pattern: ${pattern}` };
    }
  }

  return { approve: false, reason: 'No matching patterns' };
}

// Parse hook input from stdin
async function parseInput() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    setTimeout(() => resolve({}), 100);
  });
}

// Main
async function main() {
  const input = await parseInput();

  if (!input.tool) {
    // No input, just exit
    process.exit(0);
  }

  const { approve, reason } = shouldAutoApprove(input.tool, input.parameters || {});

  if (approve) {
    logDecision(input, 'approve', reason);
    // Output approval decision
    console.log(JSON.stringify({ decision: 'approve' }));
  } else {
    logDecision(input, 'ask', reason);
    // Let user decide
    console.log(JSON.stringify({ decision: 'ask' }));
  }
}

main().catch(err => {
  console.error('[AIWG-PERMISSIONS] Error:', err.message);
  // On error, fall back to asking user
  console.log(JSON.stringify({ decision: 'ask' }));
});
