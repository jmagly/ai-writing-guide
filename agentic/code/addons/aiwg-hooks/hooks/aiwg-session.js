#!/usr/bin/env node
/**
 * AIWG Session Naming Hook
 *
 * Auto-names sessions based on AIWG workflow context.
 *
 * Research Foundation:
 * - Claude Code 2.0.64: Named sessions with /rename and /resume
 * - REF-001: Workflow state persistence for recovery
 *
 * Hook Event: SessionStart (conceptual - for documentation)
 *
 * Usage:
 * This hook is invoked by AIWG flow commands to suggest session names.
 * It can also be used manually:
 *
 *   node aiwg-session.js suggest <workflow-name>
 *   node aiwg-session.js record <session-name>
 *   node aiwg-session.js list
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SESSIONS_FILE = process.env.AIWG_SESSIONS_FILE || '.aiwg/sessions.json';

// Generate session name
function generateSessionName(workflowName, context = {}) {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');

  // Extract iteration if present
  const iteration = context.iteration ? `-iter${context.iteration}` : '';

  // Extract phase if present
  const phase = context.phase ? `-${context.phase}` : '';

  // Clean workflow name
  const cleanWorkflow = workflowName
    .replace(/^flow-/, '')
    .replace(/-/g, '-')
    .slice(0, 30);

  return `aiwg-${cleanWorkflow}${phase}${iteration}-${date}-${time}`;
}

// Load sessions registry
function loadSessions() {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    } catch {
      return { sessions: [] };
    }
  }
  return { sessions: [] };
}

// Save sessions registry
function saveSessions(data) {
  const dir = path.dirname(SESSIONS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2));
}

// Record a session
function recordSession(name, metadata = {}) {
  const data = loadSessions();

  data.sessions.push({
    name,
    created: new Date().toISOString(),
    workflow: metadata.workflow || 'unknown',
    phase: metadata.phase || null,
    iteration: metadata.iteration || null,
    status: 'active'
  });

  // Keep last 50 sessions
  if (data.sessions.length > 50) {
    data.sessions = data.sessions.slice(-50);
  }

  saveSessions(data);
  return name;
}

// List sessions
function listSessions(filter = {}) {
  const data = loadSessions();
  let sessions = data.sessions;

  if (filter.workflow) {
    sessions = sessions.filter(s => s.workflow.includes(filter.workflow));
  }

  if (filter.status) {
    sessions = sessions.filter(s => s.status === filter.status);
  }

  return sessions.slice(-10).reverse(); // Last 10, newest first
}

// Mark session complete
function completeSession(name) {
  const data = loadSessions();
  const session = data.sessions.find(s => s.name === name);
  if (session) {
    session.status = 'complete';
    session.completed = new Date().toISOString();
    saveSessions(data);
  }
  return session;
}

// Format session list for output
function formatSessionList(sessions) {
  if (sessions.length === 0) {
    return 'No sessions found.\n';
  }

  let output = 'Recent AIWG Sessions:\n\n';
  output += '| Name | Workflow | Status | Created |\n';
  output += '|------|----------|--------|--------|\n';

  for (const s of sessions) {
    const date = s.created.split('T')[0];
    output += `| ${s.name} | ${s.workflow} | ${s.status} | ${date} |\n`;
  }

  output += '\nTo resume: claude --resume "<session-name>"\n';
  return output;
}

// Main CLI
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'suggest': {
      // Generate suggested session name
      const workflow = arg || 'unknown';
      const context = {};

      // Parse additional context from args
      for (let i = 4; i < process.argv.length; i += 2) {
        const key = process.argv[i]?.replace('--', '');
        const value = process.argv[i + 1];
        if (key && value) context[key] = value;
      }

      const name = generateSessionName(workflow, context);
      console.log(name);
      break;
    }

    case 'record': {
      // Record a session
      const name = arg;
      if (!name) {
        console.error('Usage: aiwg-session.js record <session-name> [--workflow <name>]');
        process.exit(1);
      }

      const metadata = {};
      for (let i = 4; i < process.argv.length; i += 2) {
        const key = process.argv[i]?.replace('--', '');
        const value = process.argv[i + 1];
        if (key && value) metadata[key] = value;
      }

      recordSession(name, metadata);
      console.log(`Recorded session: ${name}`);
      break;
    }

    case 'complete': {
      // Mark session complete
      const name = arg;
      if (!name) {
        console.error('Usage: aiwg-session.js complete <session-name>');
        process.exit(1);
      }

      const session = completeSession(name);
      if (session) {
        console.log(`Completed session: ${name}`);
      } else {
        console.error(`Session not found: ${name}`);
        process.exit(1);
      }
      break;
    }

    case 'list': {
      // List sessions
      const filter = {};
      for (let i = 3; i < process.argv.length; i += 2) {
        const key = process.argv[i]?.replace('--', '');
        const value = process.argv[i + 1];
        if (key && value) filter[key] = value;
      }

      const sessions = listSessions(filter);
      console.log(formatSessionList(sessions));
      break;
    }

    default:
      console.log(`
AIWG Session Manager

Usage:
  aiwg-session.js suggest <workflow> [--phase <phase>] [--iteration <n>]
  aiwg-session.js record <name> [--workflow <name>]
  aiwg-session.js complete <name>
  aiwg-session.js list [--workflow <filter>] [--status <active|complete>]

Examples:
  aiwg-session.js suggest inception-to-elaboration
  # Output: aiwg-inception-to-elaboration-2025-01-15-1030

  aiwg-session.js record aiwg-security-review-2025-01-15 --workflow security-review
  aiwg-session.js list
`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
