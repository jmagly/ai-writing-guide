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

Targets for 'install':
  claude    Generate config for Claude Code (.claude/settings.local.json)
  factory   Generate config for Factory AI (~/.factory/mcp.json)
  codex     Generate config for OpenAI Codex (~/.codex/config.toml)
  cursor    Generate config for Cursor (.cursor/mcp.json)
  opencode  Generate config for OpenCode (opencode.json)

Examples:
  # Start MCP server with stdio (default)
  aiwg mcp serve

  # Start MCP server with HTTP transport
  aiwg mcp serve --transport http --port 3100

  # Generate Claude Code MCP configuration
  aiwg mcp install claude

  # Generate Factory AI MCP configuration
  aiwg mcp install factory

  # Generate project-specific Factory MCP config
  aiwg mcp install factory /path/to/project

  # Generate OpenCode MCP configuration
  aiwg mcp install opencode

  # Show server capabilities
  aiwg mcp info
`);
}

/**
 * Generate MCP client configuration
 */
async function generateConfig(target, projectDir = '.') {
  const homeDir = process.env.HOME || process.env.USERPROFILE;

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
        mcpServers: {
          aiwg: {
            command: 'aiwg',
            args: ['mcp', 'serve']
          }
        }
      },
      merge: (existing, content) => ({
        ...existing,
        mcpServers: {
          ...(existing.mcpServers || {}),
          ...content.mcpServers
        }
      })
    },
    factory: {
      // Factory stores MCP config at user level in ~/.factory/mcp.json
      // or project level in .factory/mcp.json
      path: projectDir === '.' || projectDir === 'global'
        ? path.join(homeDir, '.factory/mcp.json')
        : path.join(projectDir, '.factory/mcp.json'),
      content: {
        mcpServers: {
          aiwg: {
            type: 'stdio',
            command: 'aiwg',
            args: ['mcp', 'serve'],
            disabled: false
          }
        }
      },
      merge: (existing, content) => ({
        ...existing,
        mcpServers: {
          ...(existing.mcpServers || {}),
          ...content.mcpServers
        }
      })
    },
    codex: {
      // Codex stores config in ~/.codex/config.toml (TOML format)
      path: path.join(homeDir, '.codex/config.toml'),
      // We generate TOML snippet to append, not JSON
      content: null,
      toml: `
# AIWG MCP Server Configuration
# Add this section to your ~/.codex/config.toml

[mcp_servers.aiwg]
command = "aiwg"
args = ["mcp", "serve"]
startup_timeout_sec = 10.0
tool_timeout_sec = 60.0
enabled_tools = [
  "workflow-run",
  "artifact-read",
  "artifact-write",
  "template-render",
  "agent-list"
]
`,
      // Custom handler for TOML
      handler: async (configPath, tomlContent) => {
        // Check if config.toml exists
        let existing = '';
        try {
          existing = await fs.readFile(configPath, 'utf-8');
        } catch {
          // File doesn't exist
        }

        // Check if AIWG MCP already configured
        if (existing.includes('[mcp_servers.aiwg]')) {
          console.log('AIWG MCP already configured in ~/.codex/config.toml');
          return true;
        }

        // Append TOML config
        const updated = existing.trimEnd() + '\n' + tomlContent.trim() + '\n';

        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, updated);
        console.log(`MCP configuration appended to: ${configPath}`);
        console.log(`\nTo use AIWG MCP server with Codex:`);
        console.log(`  1. Restart Codex CLI`);
        console.log(`  2. AIWG tools will be available via MCP`);
        return true;
      }
    },
    openai: {
      // Alias for codex
      path: path.join(homeDir, '.codex/config.toml'),
      alias: 'codex'
    },
    opencode: {
      // OpenCode stores MCP config in opencode.json at project root or .opencode/
      path: projectDir === '.' || projectDir === 'global'
        ? path.join(process.cwd(), 'opencode.json')
        : path.join(projectDir, 'opencode.json'),
      content: {
        mcp: {
          aiwg: {
            type: 'local',
            command: ['aiwg', 'mcp', 'serve']
          }
        }
      },
      merge: (existing, content) => ({
        ...existing,
        mcp: {
          ...(existing.mcp || {}),
          ...content.mcp
        }
      }),
      // Custom handler to handle both JSON and JSONC formats
      handler: async (configPath, _, content, mergeFunc) => {
        // Check multiple locations for opencode config
        const locations = [
          configPath,
          path.join(path.dirname(configPath), '.opencode', 'opencode.jsonc'),
          path.join(path.dirname(configPath), '.opencode', 'opencode.json')
        ];

        let targetPath = configPath;
        let existing = {};

        // Find existing config
        for (const loc of locations) {
          try {
            const rawContent = await fs.readFile(loc, 'utf-8');
            // Strip JSONC comments for parsing
            const jsonContent = rawContent
              .replace(/\/\/.*$/gm, '')
              .replace(/\/\*[\s\S]*?\*\//g, '');
            existing = JSON.parse(jsonContent);
            targetPath = loc;
            break;
          } catch {
            // Continue to next location
          }
        }

        // Check if AIWG MCP already configured
        if (existing.mcp && existing.mcp.aiwg) {
          console.log('AIWG MCP already configured in OpenCode config');
          return true;
        }

        // Merge configuration
        const merged = mergeFunc(existing, content);

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, JSON.stringify(merged, null, 2));
        console.log(`MCP configuration written to: ${targetPath}`);
        console.log(`\nTo use AIWG MCP server with OpenCode:`);
        console.log(`  1. Restart OpenCode`);
        console.log(`  2. AIWG tools will be available via MCP`);
        return true;
      }
    }
  };

  let config = configs[target];
  if (!config) {
    console.error(`Unknown target: ${target}`);
    console.error(`Available targets: ${Object.keys(configs).join(', ')}`);
    return false;
  }

  // Handle alias
  if (config.alias) {
    config = configs[config.alias];
  }

  // Handle custom handler (for TOML configs like Codex, or OpenCode JSON)
  if (config.handler) {
    return await config.handler(config.path, config.toml, config.content, config.merge);
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

  // Merge configuration using custom merge function if available
  const merged = config.merge
    ? config.merge(existing, config.content)
    : {
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
      // Parse install arguments (skip flags)
      const installArgs = args.slice(1).filter(a => !a.startsWith('--'));
      const target = installArgs[0] || 'claude';
      const projectDir = installArgs[1] || '.';

      // Check for --dry-run flag
      if (args.includes('--dry-run')) {
        const homeDir = process.env.HOME || process.env.USERPROFILE;
        console.log(`[DRY RUN] Would generate MCP config for: ${target}`);
        console.log(`[DRY RUN] Target directory: ${projectDir}`);
        const configPaths = {
          claude: '.claude/settings.local.json',
          cursor: '.cursor/mcp.json',
          factory: (projectDir === '.' || projectDir === 'global')
            ? path.join(homeDir, '.factory/mcp.json')
            : path.join(projectDir, '.factory/mcp.json'),
          codex: path.join(homeDir, '.codex/config.toml'),
          openai: path.join(homeDir, '.codex/config.toml'),
          opencode: (projectDir === '.' || projectDir === 'global')
            ? 'opencode.json'
            : path.join(projectDir, 'opencode.json')
        };
        console.log(`[DRY RUN] Config file: ${configPaths[target] || 'unknown'}`);
        break;
      }

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
