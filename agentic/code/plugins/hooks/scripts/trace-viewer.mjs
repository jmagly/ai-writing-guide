#!/usr/bin/env node
/**
 * AIWG Trace Viewer
 *
 * View and analyze multi-agent workflow traces.
 *
 * Usage:
 *   aiwg trace-view [--trace <file>] [--format tree|timeline|json] [--filter <agent>]
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const TRACE_DIR = process.env.AIWG_TRACE_DIR || '.aiwg/traces';
const DEFAULT_TRACE = 'current-trace.jsonl';

// Parse command line args
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    trace: path.join(TRACE_DIR, DEFAULT_TRACE),
    format: 'tree',
    filter: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--trace':
      case '-t':
        options.trace = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i];
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

// Read trace file
async function readTrace(tracePath) {
  if (!fs.existsSync(tracePath)) {
    console.error(`Trace file not found: ${tracePath}`);
    process.exit(1);
  }

  const events = [];
  const fileStream = fs.createReadStream(tracePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        events.push(JSON.parse(line));
      } catch {
        // Skip invalid lines
      }
    }
  }

  return events;
}

// Format as tree
function formatTree(events, filter) {
  const agents = new Map();
  const roots = [];

  // Build agent tree
  for (const event of events) {
    if (event.type === 'agent_start') {
      const agent = {
        id: event.agent_id,
        type: event.subagent_type,
        model: event.model,
        parent: event.parent_id,
        start: event.timestamp,
        children: [],
        outcome: null
      };
      agents.set(event.agent_id, agent);

      if (event.parent_id && agents.has(event.parent_id)) {
        agents.get(event.parent_id).children.push(agent);
      } else {
        roots.push(agent);
      }
    } else if (event.type === 'agent_stop') {
      const agent = agents.get(event.agent_id);
      if (agent) {
        agent.end = event.timestamp;
        agent.outcome = event.outcome;
        agent.duration = event.duration_ms;
        agent.transcript = event.transcript_path;
      }
    }
  }

  // Render tree
  function renderAgent(agent, indent = 0) {
    if (filter && !agent.type.includes(filter)) {
      return '';
    }

    const prefix = '  '.repeat(indent);
    const icon = agent.outcome === 'success' ? '✓' :
                 agent.outcome === 'error' ? '✗' :
                 agent.outcome === 'timeout' ? '⏱' : '•';
    const duration = agent.duration ? ` (${agent.duration}ms)` : '';

    let output = `${prefix}${icon} ${agent.type} [${agent.model || 'default'}]${duration}\n`;

    for (const child of agent.children) {
      output += renderAgent(child, indent + 1);
    }

    return output;
  }

  let output = '# Workflow Trace\n\n';
  for (const root of roots) {
    output += renderAgent(root);
  }

  return output;
}

// Format as timeline
function formatTimeline(events, filter) {
  let output = '# Workflow Timeline\n\n';
  output += '| Time | Event | Agent | Details |\n';
  output += '|------|-------|-------|--------|\n';

  for (const event of events) {
    if (filter && event.subagent_type && !event.subagent_type.includes(filter)) {
      continue;
    }

    const time = event.timestamp.split('T')[1].split('.')[0];
    const type = event.type.replace('agent_', '').toUpperCase();
    const agent = event.subagent_type || '-';
    let details = '';

    if (event.type === 'agent_start') {
      details = `model=${event.model || 'default'}`;
    } else if (event.type === 'agent_stop') {
      details = `${event.outcome || 'unknown'} ${event.duration_ms ? `(${event.duration_ms}ms)` : ''}`;
    } else if (event.type === 'tool_call') {
      details = event.tool;
    }

    output += `| ${time} | ${type} | ${agent} | ${details} |\n`;
  }

  return output;
}

// Format as JSON
function formatJson(events, filter) {
  if (filter) {
    events = events.filter(e =>
      e.subagent_type && e.subagent_type.includes(filter)
    );
  }
  return JSON.stringify(events, null, 2);
}

// Show help
function showHelp() {
  console.log(`
AIWG Trace Viewer

Usage:
  aiwg trace-view [options]

Options:
  --trace, -t <file>    Trace file to view (default: .aiwg/traces/current-trace.jsonl)
  --format, -f <type>   Output format: tree, timeline, json (default: tree)
  --filter <agent>      Filter by agent type substring
  --help, -h            Show this help

Examples:
  aiwg trace-view                           # View current trace as tree
  aiwg trace-view -f timeline               # View as timeline
  aiwg trace-view --filter security         # Filter security agents
  aiwg trace-view -t .aiwg/traces/old.jsonl # View specific trace
`);
}

// Main
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  const events = await readTrace(options.trace);

  let output;
  switch (options.format) {
    case 'tree':
      output = formatTree(events, options.filter);
      break;
    case 'timeline':
      output = formatTimeline(events, options.filter);
      break;
    case 'json':
      output = formatJson(events, options.filter);
      break;
    default:
      console.error(`Unknown format: ${options.format}`);
      process.exit(1);
  }

  console.log(output);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
