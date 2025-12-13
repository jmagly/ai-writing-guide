# ADR-014: MCPsmith - MCP Server Generator Architecture

**Status**: PROPOSED
**Date**: 2025-12-12
**Author**: Architecture Designer
**Phase**: Elaboration

---

## Context

AIWG users need a way to expose arbitrary command sets, tools, and systems as MCP (Model Context Protocol) servers. Currently, creating an MCP server requires manual coding, understanding of the MCP SDK, and TypeScript/JavaScript expertise. This creates a barrier for users who want to integrate existing CLI tools, REST APIs, or custom systems with Claude Code and other MCP-compatible platforms.

**Problem Statement**: Users cannot easily convert existing tools into MCP servers without significant development effort.

**Key Requirements**:
1. Generate MCP servers from CLI tools (parse --help, man pages)
2. Generate MCP servers from REST APIs (OpenAPI/Swagger specs)
3. Generate MCP servers from tool catalogs (YAML/JSON definitions)
4. Generate MCP servers from natural language descriptions
5. Generated servers should be version-controlled and managed by AIWG
6. Support server lifecycle management (start, stop, configure, register)

## Decision

Implement **MCPsmith** as a new AIWG subsystem that:

1. Analyzes source specifications (CLI, API, catalog, natural language)
2. Generates complete, runnable MCP servers
3. Stores generated servers in `.aiwg/smiths/mcpsmith/servers/`
4. Provides lifecycle management via CLI commands
5. Integrates with existing AIWG MCP infrastructure

## Architecture Overview

```
                         +-------------------+
                         |    MCPsmith CLI   |
                         |  aiwg smith ...   |
                         +--------+----------+
                                  |
                    +-------------+-------------+
                    |                           |
           +--------v--------+         +--------v--------+
           |    Analyzers    |         | Server Manager  |
           |  (Source Parse) |         |  (Lifecycle)    |
           +--------+--------+         +--------+--------+
                    |                           |
    +-------+-------+-------+-------+           |
    |       |       |       |       |           |
 +--v--+ +--v--+ +--v--+ +--v--+ +--v--+    +---v---+
 | CLI | | API | | Cat | | NL  | | Ext |   |Server |
 |Parse| |Parse| |Parse| |Parse| |Parse|   |Store  |
 +--+--+ +--+--+ +--+--+ +--+--+ +--+--+    +---+---+
    |       |       |       |       |           |
    +-------+-------+-------+-------+           |
                    |                           |
           +--------v--------+                  |
           |  Code Generator |                  |
           | (MCP Templates) |                  |
           +--------+--------+                  |
                    |                           |
           +--------v--------+         +--------v--------+
           | Generated Server|<------->|  Registry.json  |
           | (.aiwg/smiths/) |         |   (Metadata)    |
           +-----------------+         +-----------------+
```

## Detailed Design

### 1. Directory Structure

```
.aiwg/
└── smiths/
    └── mcpsmith/
        ├── registry.json              # MCPsmith server registry
        ├── servers/                   # Generated server storage
        │   ├── git-server/            # Example: Git CLI as MCP
        │   │   ├── server.mjs         # Generated MCP server
        │   │   ├── manifest.json      # Server metadata
        │   │   ├── config.json        # Runtime configuration
        │   │   ├── tools/             # Tool definitions
        │   │   │   └── *.json         # Individual tool schemas
        │   │   └── resources/         # Resource definitions (optional)
        │   │       └── *.json         # Individual resource schemas
        │   ├── docker-server/
        │   │   └── ...
        │   └── {custom-server}/
        │       └── ...
        ├── templates/                 # Server generation templates
        │   ├── server-base.mjs.tpl    # Base MCP server template
        │   ├── tool-handler.mjs.tpl   # Tool handler template
        │   └── resource-handler.mjs.tpl
        └── analyzers/                 # Analyzer configurations
            ├── cli-patterns.json      # CLI parsing patterns
            └── api-mappings.json      # OpenAPI to MCP mappings
```

### 2. MCPsmith Registry Schema

**File**: `.aiwg/smiths/mcpsmith/registry.json`

```json
{
  "$schema": "https://aiwg.io/schemas/mcpsmith-registry.json",
  "version": "1.0",
  "servers": [
    {
      "id": "git-server",
      "name": "Git CLI MCP Server",
      "description": "Exposes git commands as MCP tools",
      "version": "1.0.0",
      "source": {
        "type": "cli",
        "command": "git",
        "discovery": "help-parsing"
      },
      "status": "active",
      "path": "servers/git-server/",
      "port": null,
      "transport": "stdio",
      "createdAt": "2025-12-12T10:00:00Z",
      "updatedAt": "2025-12-12T10:00:00Z",
      "tools": ["git-status", "git-log", "git-diff", "git-commit"],
      "resources": ["git://repo/status"],
      "health": {
        "status": "healthy",
        "lastCheck": "2025-12-12T10:30:00Z"
      }
    }
  ]
}
```

### 3. Server Configuration Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/config.json`

```json
{
  "$schema": "https://aiwg.io/schemas/mcpsmith-server-config.json",
  "server": {
    "name": "git-server",
    "version": "1.0.0",
    "description": "Git CLI exposed as MCP server"
  },
  "transport": {
    "type": "stdio",
    "options": {}
  },
  "source": {
    "type": "cli",
    "command": "git",
    "workingDirectory": "${PROJECT_ROOT}",
    "environment": {},
    "timeout": 30000
  },
  "tools": {
    "prefix": "git-",
    "allowlist": ["status", "log", "diff", "commit", "branch"],
    "denylist": ["push", "force-push"],
    "dangerousCommands": {
      "require_confirmation": ["reset", "rebase", "push"],
      "blocked": ["push --force", "clean -fd"]
    }
  },
  "resources": {
    "enabled": true,
    "patterns": ["git://**"]
  },
  "security": {
    "sandboxed": true,
    "maxExecutionTime": 60000,
    "allowedPaths": ["${PROJECT_ROOT}"],
    "blockedCommands": []
  }
}
```

### 4. Server Manifest Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/manifest.json`

```json
{
  "$schema": "https://aiwg.io/schemas/mcpsmith-manifest.json",
  "id": "git-server",
  "name": "Git CLI MCP Server",
  "version": "1.0.0",
  "mcpVersion": "2025-11-25",
  "generated": {
    "at": "2025-12-12T10:00:00Z",
    "by": "mcpsmith/1.0.0",
    "from": {
      "type": "cli",
      "source": "git --help",
      "version": "2.43.0"
    }
  },
  "capabilities": {
    "tools": true,
    "resources": true,
    "prompts": false
  },
  "tools": [
    {
      "name": "git-status",
      "description": "Show the working tree status",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Path to check status for"
          },
          "short": {
            "type": "boolean",
            "description": "Give output in short format"
          }
        }
      }
    }
  ],
  "resources": [
    {
      "name": "git-repo-status",
      "uri": "git://repo/status",
      "description": "Current repository status"
    }
  ],
  "dependencies": {
    "runtime": ["node >= 18.0.0"],
    "external": ["git >= 2.20.0"]
  },
  "files": [
    "server.mjs",
    "config.json",
    "tools/*.json"
  ]
}
```

### 5. Tool Definition Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/tools/{tool-name}.json`

```json
{
  "name": "git-status",
  "description": "Show the working tree status",
  "source": {
    "command": "git",
    "subcommand": "status",
    "mapping": {
      "path": { "flag": null, "position": 0 },
      "short": { "flag": "-s", "type": "boolean" },
      "branch": { "flag": "-b", "type": "boolean" }
    }
  },
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path to check status for",
        "default": "."
      },
      "short": {
        "type": "boolean",
        "description": "Give output in short format",
        "default": false
      },
      "branch": {
        "type": "boolean",
        "description": "Show branch info even in short format",
        "default": true
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "output": { "type": "string" },
      "exitCode": { "type": "number" }
    }
  },
  "examples": [
    {
      "input": { "short": true },
      "description": "Get short status"
    }
  ]
}
```

### 6. Generated Server Template

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/server.mjs`

```javascript
#!/usr/bin/env node
/**
 * MCPsmith Generated Server: {{SERVER_NAME}}
 *
 * Generated: {{GENERATED_AT}}
 * Source: {{SOURCE_TYPE}} ({{SOURCE_COMMAND}})
 * MCPsmith Version: {{MCPSMITH_VERSION}}
 *
 * DO NOT EDIT DIRECTLY - Regenerate using:
 *   aiwg smith regenerate {{SERVER_ID}}
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load configuration
const config = JSON.parse(
  await fs.readFile(path.join(__dirname, 'config.json'), 'utf-8')
);

// Load tool definitions
const toolsDir = path.join(__dirname, 'tools');
const toolFiles = await fs.readdir(toolsDir);
const toolDefinitions = await Promise.all(
  toolFiles
    .filter(f => f.endsWith('.json'))
    .map(async f => JSON.parse(await fs.readFile(path.join(toolsDir, f), 'utf-8')))
);

/**
 * Execute CLI command
 */
async function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      timeout: config.source.timeout || 30000,
      ...options
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', data => { stdout += data; });
    proc.stderr.on('data', data => { stderr += data; });

    proc.on('close', code => {
      resolve({ stdout, stderr, exitCode: code });
    });

    proc.on('error', reject);
  });
}

/**
 * Map tool input to CLI arguments
 */
function mapInputToArgs(toolDef, input) {
  const args = [toolDef.source.subcommand];
  const mapping = toolDef.source.mapping;

  for (const [key, value] of Object.entries(input)) {
    const map = mapping[key];
    if (!map) continue;

    if (map.type === 'boolean' && value === true) {
      args.push(map.flag);
    } else if (map.flag) {
      args.push(map.flag, String(value));
    } else if (map.position !== undefined) {
      args[map.position + 1] = String(value);
    }
  }

  return args.filter(Boolean);
}

// Create MCP Server
const server = new McpServer({
  name: config.server.name,
  version: config.server.version
});

// Register tools from definitions
for (const toolDef of toolDefinitions) {
  // Build Zod schema from JSON Schema
  const schema = {};
  for (const [key, prop] of Object.entries(toolDef.inputSchema.properties || {})) {
    let zodType = z.string();
    if (prop.type === 'boolean') zodType = z.boolean();
    if (prop.type === 'number') zodType = z.number();
    if (prop.type === 'array') zodType = z.array(z.string());

    if (prop.default !== undefined) zodType = zodType.default(prop.default);
    if (!toolDef.inputSchema.required?.includes(key)) zodType = zodType.optional();

    schema[key] = zodType.describe(prop.description || '');
  }

  server.registerTool(toolDef.name, {
    title: toolDef.name,
    description: toolDef.description,
    inputSchema: schema
  }, async (input) => {
    try {
      const args = mapInputToArgs(toolDef, input);
      const result = await executeCommand(config.source.command, args);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            output: result.stdout || result.stderr,
            exitCode: result.exitCode
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error executing ${toolDef.name}: ${error.message}`
        }],
        isError: true
      };
    }
  });
}

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[MCPsmith] ${config.server.name} started`);
```

### 7. CLI Commands

```
aiwg smith <command> [options]

Commands:
  aiwg smith new <name>              Create new MCP server from source
  aiwg smith list                    List generated servers
  aiwg smith info <server-id>        Show server details
  aiwg smith start <server-id>       Start a server
  aiwg smith stop <server-id>        Stop a running server
  aiwg smith regenerate <server-id>  Regenerate server from source
  aiwg smith remove <server-id>      Remove a generated server
  aiwg smith register <server-id>    Register server with MCP clients
  aiwg smith health [server-id]      Check server health
  aiwg smith export <server-id>      Export server as standalone package

Creation Options:
  --from-cli <command>       Parse CLI tool (e.g., --from-cli git)
  --from-api <spec-file>     Parse OpenAPI/Swagger spec
  --from-catalog <file>      Parse tool catalog YAML/JSON
  --from-description <text>  Generate from natural language description
  --from-extension <path>    Extend existing server with custom tools

Server Options:
  --transport <type>         Transport: stdio (default), http
  --port <number>            Port for HTTP transport
  --sandbox                  Enable sandboxed execution (default: true)
  --allow-dangerous          Allow dangerous commands (requires confirmation)

Examples:
  # Create MCP server from Git CLI
  aiwg smith new git-server --from-cli git

  # Create from OpenAPI spec
  aiwg smith new petstore-api --from-api openapi.yaml

  # Create from tool catalog
  aiwg smith new dev-tools --from-catalog tools.yaml

  # Create from description
  aiwg smith new file-ops --from-description "File operations: read, write, copy, move, delete"

  # Register with Claude Code
  aiwg smith register git-server

  # Export as standalone package
  aiwg smith export git-server --output ./git-mcp-server
```

### 8. Analyzer Specifications

#### 8.1 CLI Analyzer

**Input**: CLI command name
**Process**:
1. Execute `{command} --help` and `{command} -h`
2. Parse help text for subcommands
3. For each subcommand, parse `{command} {subcommand} --help`
4. Extract: command name, description, flags, arguments
5. Generate tool definitions

**Pattern File**: `.aiwg/smiths/mcpsmith/analyzers/cli-patterns.json`

```json
{
  "helpPatterns": [
    {
      "pattern": "^\\s*(-{1,2}[a-zA-Z][\\w-]*)(?:,\\s*(-{1,2}[a-zA-Z][\\w-]*))?\\s+(.+)$",
      "groups": ["shortFlag", "longFlag", "description"]
    }
  ],
  "subcommandPatterns": [
    {
      "pattern": "^\\s{2,4}([a-z][a-z0-9-]*)\\s{2,}(.+)$",
      "groups": ["name", "description"]
    }
  ],
  "argumentPatterns": [
    {
      "pattern": "<([a-zA-Z][\\w-]*)>",
      "type": "required"
    },
    {
      "pattern": "\\[([a-zA-Z][\\w-]*)\\]",
      "type": "optional"
    }
  ]
}
```

#### 8.2 API Analyzer

**Input**: OpenAPI/Swagger specification file
**Process**:
1. Parse OpenAPI spec (JSON or YAML)
2. Extract endpoints and operations
3. Map HTTP methods to tool actions
4. Extract request/response schemas
5. Generate tool definitions with proper input schemas

**Mapping Rules** (`.aiwg/smiths/mcpsmith/analyzers/api-mappings.json`):

```json
{
  "methodMapping": {
    "GET": { "prefix": "get", "description": "Retrieve" },
    "POST": { "prefix": "create", "description": "Create" },
    "PUT": { "prefix": "update", "description": "Update" },
    "PATCH": { "prefix": "patch", "description": "Partially update" },
    "DELETE": { "prefix": "delete", "description": "Delete" }
  },
  "schemaMapping": {
    "string": "z.string()",
    "integer": "z.number().int()",
    "number": "z.number()",
    "boolean": "z.boolean()",
    "array": "z.array()",
    "object": "z.object()"
  }
}
```

#### 8.3 Natural Language Analyzer

**Input**: Natural language description
**Process**:
1. Parse description for tool names and operations
2. Generate placeholder schemas
3. Create interactive refinement prompts
4. User confirms/adjusts generated definitions

### 9. Integration with Existing MCP Infrastructure

#### 9.1 AIWG MCP Server Integration

MCPsmith servers can be registered with the main AIWG MCP server as sub-servers:

```json
// .aiwg/smiths/mcpsmith/registry.json
{
  "integration": {
    "aiwgMcp": {
      "enabled": true,
      "autoRegister": true,
      "resourcePrefix": "mcpsmith://"
    }
  }
}
```

This adds resources to the main AIWG MCP:
- `mcpsmith://servers/catalog` - List all MCPsmith servers
- `mcpsmith://servers/{id}/info` - Server details
- `mcpsmith://servers/{id}/tools` - Server tool definitions

#### 9.2 Platform Registration

MCPsmith servers can be registered with MCP clients:

```bash
# Register with Claude Code
aiwg smith register git-server
# Updates .claude/settings.local.json with server entry

# Register with Factory AI
aiwg smith register git-server --provider factory
# Updates ~/.factory/mcp.json

# Register globally (all platforms)
aiwg smith register git-server --global
```

### 10. Security Considerations

1. **Sandboxed Execution**: All CLI commands run in sandboxed environment by default
2. **Command Allowlisting**: Only explicitly allowed commands/flags are executable
3. **Dangerous Command Confirmation**: High-risk operations require explicit confirmation
4. **Path Restrictions**: Commands can only access allowed directories
5. **Timeout Limits**: All operations have configurable timeouts
6. **Audit Logging**: All tool invocations logged to `.aiwg/logs/mcpsmith/`

### 11. Implementation Phases

**Phase 1: Core Infrastructure** (Week 1-2)
- Directory structure and schemas
- Basic CLI commands (new, list, info)
- Server template generation
- CLI analyzer (--from-cli)

**Phase 2: Analyzer Expansion** (Week 3-4)
- API analyzer (--from-api)
- Catalog analyzer (--from-catalog)
- Natural language analyzer (basic)

**Phase 3: Lifecycle Management** (Week 5-6)
- Start/stop server management
- Health checking
- Platform registration
- AIWG MCP integration

**Phase 4: Polish & Documentation** (Week 7-8)
- Export functionality
- Interactive refinement
- Documentation and examples
- Testing and validation

## Consequences

### Positive
- Users can easily expose any CLI tool as MCP server
- Generated servers are version-controlled and reproducible
- Consistent patterns across all generated servers
- Integration with existing AIWG ecosystem

### Negative
- Increased complexity in AIWG codebase
- Generated servers require Node.js runtime
- CLI parsing may not capture all nuances of complex tools

### Risks
- **R-011**: CLI help text parsing accuracy varies by tool
  - Mitigation: Manual refinement capability, pattern database growth
- **R-012**: Security of executing arbitrary CLI commands
  - Mitigation: Sandboxing, allowlisting, confirmation prompts

## Alternatives Considered

1. **Manual MCP server creation**: Too high barrier for most users
2. **External tool wrapping**: Wouldn't integrate with AIWG ecosystem
3. **LLM-only generation**: Inconsistent, non-reproducible results

## References

- MCP Specification: https://modelcontextprotocol.io/specification/2025-11-25
- @src/mcp/server.mjs - Existing AIWG MCP server implementation
- @agentic/code/frameworks/sdlc-complete/config/models.json - Model configuration patterns
- @tools/agents/deploy-agents.mjs - Deployment patterns

## Traceability

- **Implements**: FID-014 (MCPsmith Feature)
- **Extends**: @src/mcp/server.mjs
- **Tests**: @test/unit/mcpsmith/*.test.ts (planned)
- **Documentation**: @docs/mcpsmith/README.md (planned)
