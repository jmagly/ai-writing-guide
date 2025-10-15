#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Get target directory from command line, default to .claude/agents
const agentsDir = process.argv[2] || '.claude/agents';

// Required tools that must be present
const requiredTools = ['Read', 'Write', 'MultiEdit', 'Bash', 'WebFetch'];

// Tool name normalization map
const toolMap = {
  'read': 'Read',
  'write': 'Write',
  'multiedit': 'MultiEdit',
  'edit': 'Edit',
  'bash': 'Bash',
  'glob': 'Glob',
  'grep': 'Grep',
  'webfetch': 'WebFetch'
};

function normalizeTools(toolsLine) {
  // Extract tools from the line
  // Could be: tools: ["read", "write"] or tools: Read, Grep, Glob

  const match = toolsLine.match(/tools:\s*(.+)/);
  if (!match) return toolsLine;

  const toolsStr = match[1].trim();
  let tools = [];

  // Check if it's JSON array format
  if (toolsStr.startsWith('[')) {
    try {
      const parsed = JSON.parse(toolsStr);
      tools = parsed.map(t => t.toLowerCase());
    } catch (e) {
      console.error('Failed to parse JSON tools:', toolsStr);
      return toolsLine;
    }
  } else {
    // Comma-separated format
    tools = toolsStr.split(',').map(t => t.trim().toLowerCase());
  }

  // Normalize tool names
  const normalizedTools = new Set();
  tools.forEach(tool => {
    const normalized = toolMap[tool] || tool;
    normalizedTools.add(normalized);
  });

  // Add required tools
  requiredTools.forEach(tool => normalizedTools.add(tool));

  // Remove 'Edit' if 'MultiEdit' is present (as requested to avoid overlap)
  if (normalizedTools.has('MultiEdit') && normalizedTools.has('Edit')) {
    normalizedTools.delete('Edit');
  }

  // Sort tools for consistency
  const sortedTools = Array.from(normalizedTools).sort();

  // Return as comma-separated list without quotes or brackets
  return `tools: ${sortedTools.join(', ')}`;
}

function updateAgentFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let modified = false;
  const updatedLines = lines.map((line, idx) => {
    if (line.startsWith('tools:')) {
      const normalized = normalizeTools(line);
      if (normalized !== line) {
        modified = true;
        console.log(`  Updated: ${line} -> ${normalized}`);
      }
      return normalized;
    }
    return line;
  });

  if (modified) {
    writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
    return true;
  }
  return false;
}

// Main execution
// Skip non-agent files
const skipFiles = ['README.md', 'manifest.md', 'agent-template.md', 'openai-compat.md'];
const files = readdirSync(agentsDir)
  .filter(f => f.endsWith('.md') && !skipFiles.includes(f))
  .map(f => join(agentsDir, f));

let updatedCount = 0;
console.log('Updating agent tool configurations...\n');

files.forEach(file => {
  console.log(`Processing: ${file}`);
  if (updateAgentFile(file)) {
    updatedCount++;
  }
});

console.log(`\nCompleted: ${updatedCount} agents updated`);
