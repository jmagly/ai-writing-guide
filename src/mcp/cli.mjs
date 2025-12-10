#!/usr/bin/env node

/**
 * AIWG MCP CLI
 *
 * Command-line interface for AIWG MCP server operations.
 */

import { startServer, createServer } from './server.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
AIWG MCP Server

Usage:
  aiwg mcp serve [options]     Start the MCP server
  aiwg mcp install [target]    Generate MCP client configuration
  aiwg mcp info                Show server capabilities

Options:
  --transport <type>   Transport type: stdio (default), http
  --port <number>      Port for HTTP transport (default: 3100)
  --help               Show this help message

Examples:
  # Start MCP server with stdio (default)
  aiwg mcp serve

  # Start MCP server with HTTP transport
  aiwg mcp serve --transport http --port 3100

  # Generate Claude Code MCP configuration
  aiwg mcp install claude

  # Show server capabilities
  aiwg mcp info
`);
}

/**
 * Generate MCP client configuration
 */
async function generateConfig(target, projectDir = '.') {
  const configs = {
    claude: {
      path: path.join(projectDir, '.claude/settings.local.json'),
      content: {
        mcpServers: {
          aiwg: {
            command: 'aiwg',
            args: ['mcp', 'serve'],
            env: {
              AIWG_ROOT: process.env.AIWG_ROOT || '~/.local/share/ai-writing-guide'
            }
          }
        }
      }
    },
    cursor: {
      path: path.join(projectDir, '.cursor/mcp.json'),
      content: {
        servers: {
          aiwg: {
            command: 'aiwg',
            args: ['mcp', 'serve']
          }
        }
      }
    }
  };

  const config = configs[target];
  if (!config) {
    console.error(`Unknown target: ${target}`);
    console.error(`Available targets: ${Object.keys(configs).join(', ')}`);
    return false;
  }

  // Ensure directory exists
  await fs.mkdir(path.dirname(config.path), { recursive: true });

  // Check if file exists and merge
  let existing = {};
  try {
    const content = await fs.readFile(config.path, 'utf-8');
    existing = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Merge configuration
  const merged = {
    ...existing,
    ...config.content,
    mcpServers: {
      ...(existing.mcpServers || {}),
      ...config.content.mcpServers
    }
  };

  await fs.writeFile(config.path, JSON.stringify(merged, null, 2));
  console.log(`MCP configuration written to: ${config.path}`);
  console.log(`\nTo use AIWG MCP server with ${target}:`);
  console.log(`  1. Restart ${target}`);
  console.log(`  2. AIWG tools and resources will be available`);

  return true;
}

/**
 * Show server capabilities
 */
async function showInfo() {
  console.log(`
AIWG MCP Server v1.0.0
Protocol Version: 2025-11-25

TOOLS:
  workflow-run      Execute AIWG workflow (phase transitions, reviews)
  artifact-read     Read artifact from .aiwg/ directory
  artifact-write    Write artifact to .aiwg/ directory
  template-render   Render AIWG template with variables
  agent-list        List available AIWG agents

RESOURCES:
  aiwg://prompts/catalog              List of prompt templates
  aiwg://templates/catalog            List of document templates
  aiwg://agents/catalog               List of available agents
  aiwg://prompts/{category}/{name}    Specific prompt template
  aiwg://templates/{fw}/{cat}/{name}  Specific document template
  aiwg://agents/{framework}/{name}    Specific agent definition

PROMPTS:
  decompose-task       Break complex task into subtasks
  parallel-execution   Identify parallelizable work
  recovery-protocol    PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE

TRANSPORTS:
  stdio    Standard input/output (default, for local use)
  http     Streamable HTTP (for remote/containerized use)

ENVIRONMENT:
  AIWG_ROOT    Path to AIWG installation (default: ~/.local/share/ai-writing-guide)

For more information:
  https://github.com/jmagly/ai-writing-guide
`);
}

/**
 * Main CLI entry point
 */
export async function main(args = process.argv.slice(2)) {
  const command = args[0];

  switch (command) {
    case 'serve':
      // Parse options
      const transportIdx = args.indexOf('--transport');
      const transport = transportIdx !== -1 ? args[transportIdx + 1] : 'stdio';

      if (transport === 'http') {
        const portIdx = args.indexOf('--port');
        const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3100;
        console.error(`HTTP transport not yet implemented. Use stdio for now.`);
        console.error(`Would start on port ${port}`);
        process.exit(1);
      }

      await startServer();
      break;

    case 'install':
      const target = args[1] || 'claude';
      const projectDir = args[2] || '.';
      await generateConfig(target, projectDir);
      break;

    case 'info':
      await showInfo();
      break;

    case '--help':
    case '-h':
    case 'help':
      printUsage();
      break;

    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      printUsage();
      process.exit(command ? 1 : 0);
  }
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
