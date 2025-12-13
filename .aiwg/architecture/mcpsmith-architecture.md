# MCPsmith Architecture Document

**Document Type**: Feature Architecture Specification
**Project**: AI Writing Guide - MCPsmith MCP Server Generator
**Version**: 1.0
**Status**: PROPOSED
**Date**: 2025-12-12
**Phase**: Elaboration
**Author**: Architecture Designer

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Directory Structure](#3-directory-structure)
4. [Schema Definitions](#4-schema-definitions)
5. [Component Design](#5-component-design)
6. [Server Generation Workflow](#6-server-generation-workflow)
7. [CLI Command Specification](#7-cli-command-specification)
8. [Integration Architecture](#8-integration-architecture)
9. [Security Architecture](#9-security-architecture)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Risk Analysis](#11-risk-analysis)
12. [Appendices](#12-appendices)

---

## 1. Executive Summary

### 1.1 Vision

MCPsmith transforms any command set, tool, or system into an MCP (Model Context Protocol) server. It serves as a "smithy" for forging MCP servers - analyzing source specifications (CLI tools, REST APIs, catalogs, natural language) and producing fully functional, version-controlled MCP servers.

### 1.2 Key Capabilities

| Capability | Description |
|------------|-------------|
| **CLI Tool Wrapping** | Parse `--help` output to generate MCP tools |
| **API Integration** | Convert OpenAPI specs to MCP servers |
| **Catalog Generation** | Create servers from YAML/JSON tool catalogs |
| **NL Description** | Generate servers from natural language descriptions |
| **Version Control** | All servers stored in `.aiwg/smiths/` and git-friendly |
| **Lifecycle Management** | Start, stop, configure, register servers |
| **Platform Integration** | Register with Claude Code, Factory, Codex, Cursor |

### 1.3 Core Principles

1. **Convention over Configuration**: Sensible defaults, minimal required configuration
2. **Git-Native**: All artifacts designed for version control
3. **Security-First**: Sandboxed execution, allowlists, dangerous command protection
4. **Reproducible**: Regenerate servers from source specifications
5. **Extensible**: Plugin architecture for custom analyzers

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
+------------------------------------------------------------------+
|                        MCPsmith System                            |
+------------------------------------------------------------------+
|                                                                    |
|  +-----------------------+    +---------------------------+       |
|  |    MCPsmith CLI       |    |    AIWG MCP Server        |       |
|  |  aiwg smith <cmd>     |    |  mcpsmith:// resources    |       |
|  +-----------+-----------+    +-------------+-------------+       |
|              |                              |                      |
|              v                              v                      |
|  +-----------------------+    +---------------------------+       |
|  |   Command Router      |    |   MCPsmith Resource       |       |
|  |  (src/cli/smith.mjs)  |    |   Provider                |       |
|  +-----------+-----------+    +---------------------------+       |
|              |                                                     |
|    +---------+---------+---------+---------+                      |
|    |         |         |         |         |                      |
|    v         v         v         v         v                      |
| +-----+  +-----+  +-----+  +-----+  +-----+                      |
| | CLI |  | API |  | Cat |  | NL  |  | Ext |    Analyzers         |
| |Anlz |  |Anlz |  |Anlz |  |Anlz |  |Anlz |                      |
| +--+--+  +--+--+  +--+--+  +--+--+  +--+--+                      |
|    |         |         |         |         |                      |
|    +---------+---------+---------+---------+                      |
|                        |                                          |
|                        v                                          |
|         +-----------------------------+                           |
|         |     Code Generator          |                           |
|         |  (Templates + Schemas)      |                           |
|         +-------------+---------------+                           |
|                       |                                           |
|                       v                                           |
|         +-----------------------------+                           |
|         |    Server Store             |                           |
|         | .aiwg/smiths/mcpsmith/      |                           |
|         +-------------+---------------+                           |
|                       |                                           |
|                       v                                           |
|         +-----------------------------+                           |
|         |   Server Lifecycle Manager  |                           |
|         | (Start/Stop/Health/Register)|                           |
|         +-----------------------------+                           |
|                                                                    |
+------------------------------------------------------------------+
```

### 2.2 Data Flow

```
                           Source Specification
                                   |
                                   v
                    +----------------------------+
                    |     Source Analyzer        |
                    |  (CLI/API/Catalog/NL/Ext)  |
                    +------------+---------------+
                                 |
                                 v
                    +----------------------------+
                    |   Intermediate Model       |
                    |  (Tool/Resource/Prompt     |
                    |   Definitions)             |
                    +------------+---------------+
                                 |
                                 v
                    +----------------------------+
                    |    Template Renderer       |
                    |  (server.mjs, configs,     |
                    |   tool schemas)            |
                    +------------+---------------+
                                 |
                                 v
                    +----------------------------+
                    |   Generated Server         |
                    |  .aiwg/smiths/mcpsmith/    |
                    |  servers/{id}/             |
                    +------------+---------------+
                                 |
          +----------------------+----------------------+
          |                      |                      |
          v                      v                      v
   +-------------+      +---------------+      +---------------+
   | Registry    |      | MCP Client    |      | AIWG MCP      |
   | Update      |      | Registration  |      | Integration   |
   +-------------+      +---------------+      +---------------+
```

### 2.3 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **CLI Router** | Parse commands, route to handlers |
| **Analyzers** | Extract tool definitions from sources |
| **Code Generator** | Transform models to runnable code |
| **Server Store** | Persist generated servers |
| **Lifecycle Manager** | Start/stop/health/register servers |
| **Registry Manager** | Track all MCPsmith servers |
| **AIWG Integration** | Expose MCPsmith via main MCP server |

---

## 3. Directory Structure

### 3.1 MCPsmith Root Structure

```
.aiwg/
└── smiths/
    └── mcpsmith/
        ├── registry.json                # Server registry
        ├── servers/                     # Generated servers
        │   └── {server-id}/
        │       ├── server.mjs           # MCP server entry point
        │       ├── manifest.json        # Server manifest
        │       ├── config.json          # Runtime configuration
        │       ├── package.json         # Node.js package (optional)
        │       ├── tools/               # Tool definitions
        │       │   └── {tool-name}.json
        │       ├── resources/           # Resource definitions
        │       │   └── {resource-name}.json
        │       └── prompts/             # Prompt definitions
        │           └── {prompt-name}.json
        ├── templates/                   # Generation templates
        │   ├── server-base.mjs.tpl
        │   ├── server-http.mjs.tpl
        │   ├── tool-handler.mjs.tpl
        │   ├── resource-handler.mjs.tpl
        │   └── prompt-handler.mjs.tpl
        ├── analyzers/                   # Analyzer configurations
        │   ├── cli-patterns.json
        │   ├── api-mappings.json
        │   └── nl-prompts.json
        └── logs/                        # Execution logs
            └── {server-id}/
                └── {timestamp}.log
```

### 3.2 Individual Server Structure

```
servers/{server-id}/
├── server.mjs              # Generated MCP server code
├── manifest.json           # Server metadata and capabilities
├── config.json             # Runtime configuration
├── package.json            # Optional: For standalone distribution
├── node_modules/           # Optional: Dependencies (gitignored)
├── tools/
│   ├── tool-one.json       # Tool definition with schema
│   ├── tool-two.json
│   └── ...
├── resources/
│   └── resource-one.json   # Resource definition
├── prompts/
│   └── prompt-one.json     # Prompt template definition
└── .mcpsmith               # MCPsmith metadata marker file
```

---

## 4. Schema Definitions

### 4.1 Registry Schema

**File**: `.aiwg/smiths/mcpsmith/registry.json`

```typescript
interface MCPsmithRegistry {
  $schema: string;                    // JSON Schema URL
  version: string;                    // Registry schema version
  servers: MCPsmithServerEntry[];     // Registered servers
  integration: {
    aiwgMcp: {
      enabled: boolean;               // Register with AIWG MCP
      autoRegister: boolean;          // Auto-register new servers
      resourcePrefix: string;         // URI prefix (mcpsmith://)
    };
    platforms: {
      claude: boolean;
      factory: boolean;
      codex: boolean;
      cursor: boolean;
    };
  };
  defaults: {
    transport: 'stdio' | 'http';
    sandbox: boolean;
    timeout: number;
  };
}

interface MCPsmithServerEntry {
  id: string;                         // Unique identifier
  name: string;                       // Display name
  description: string;                // Brief description
  version: string;                    // Server version
  source: {
    type: 'cli' | 'api' | 'catalog' | 'nl' | 'extension';
    command?: string;                 // For CLI sources
    specFile?: string;                // For API sources
    catalogFile?: string;             // For catalog sources
    description?: string;             // For NL sources
    basePath?: string;                // For extensions
    discovery: string;                // Discovery method used
  };
  status: 'active' | 'inactive' | 'error' | 'generating';
  path: string;                       // Relative path from mcpsmith/
  transport: 'stdio' | 'http';
  port?: number;                      // For HTTP transport
  createdAt: string;                  // ISO 8601
  updatedAt: string;                  // ISO 8601
  tools: string[];                    // Tool names
  resources: string[];                // Resource URIs
  prompts: string[];                  // Prompt names
  health: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: string;
    errorMessage?: string;
  };
  platforms: {                        // Platform registrations
    claude?: boolean;
    factory?: boolean;
    codex?: boolean;
    cursor?: boolean;
  };
}
```

### 4.2 Server Configuration Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/config.json`

```typescript
interface MCPsmithServerConfig {
  $schema: string;
  server: {
    name: string;
    version: string;
    description: string;
  };
  transport: {
    type: 'stdio' | 'http';
    options: {
      port?: number;                  // For HTTP
      host?: string;                  // For HTTP
    };
  };
  source: {
    type: 'cli' | 'api' | 'catalog' | 'nl' | 'extension';
    command?: string;                 // CLI command to wrap
    baseUrl?: string;                 // API base URL
    workingDirectory: string;         // Execution directory
    environment: Record<string, string>;
    timeout: number;                  // Command timeout (ms)
  };
  tools: {
    prefix: string;                   // Tool name prefix
    allowlist: string[];              // Allowed subcommands
    denylist: string[];               // Blocked subcommands
    dangerousCommands: {
      require_confirmation: string[];
      blocked: string[];
    };
  };
  resources: {
    enabled: boolean;
    patterns: string[];               // Glob patterns for URIs
  };
  prompts: {
    enabled: boolean;
  };
  security: {
    sandboxed: boolean;
    maxExecutionTime: number;
    allowedPaths: string[];
    blockedCommands: string[];
    requireConfirmation: string[];
  };
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFiles: number;
    maxSize: string;                  // e.g., "10mb"
  };
}
```

### 4.3 Server Manifest Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/manifest.json`

```typescript
interface MCPsmithManifest {
  $schema: string;
  id: string;
  name: string;
  version: string;
  mcpVersion: string;                 // MCP protocol version
  generated: {
    at: string;                       // ISO 8601
    by: string;                       // MCPsmith version
    from: {
      type: string;
      source: string;
      version?: string;               // Source tool version
    };
  };
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    sampling: boolean;
    logging: boolean;
  };
  tools: MCPsmithToolManifest[];
  resources: MCPsmithResourceManifest[];
  prompts: MCPsmithPromptManifest[];
  dependencies: {
    runtime: string[];                // e.g., ["node >= 18.0.0"]
    external: string[];               // e.g., ["git >= 2.20.0"]
  };
  files: string[];                    // Files included in server
  checksum: string;                   // SHA256 of generated files
}

interface MCPsmithToolManifest {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  dangerous: boolean;
  requiresConfirmation: boolean;
}

interface MCPsmithResourceManifest {
  name: string;
  uri: string;
  uriTemplate?: string;
  description: string;
  mimeType?: string;
}

interface MCPsmithPromptManifest {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;
}
```

### 4.4 Tool Definition Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/tools/{tool-name}.json`

```typescript
interface MCPsmithToolDefinition {
  name: string;                       // Tool identifier
  title: string;                      // Display name
  description: string;                // Tool description
  source: {
    type: 'cli' | 'api' | 'function';
    // For CLI sources
    command?: string;
    subcommand?: string;
    mapping: Record<string, {
      flag?: string;                  // CLI flag (e.g., "-v", "--verbose")
      position?: number;              // Positional argument index
      type: 'string' | 'boolean' | 'number' | 'array';
      transform?: string;             // Optional transform function
    }>;
    // For API sources
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    endpoint?: string;
    headers?: Record<string, string>;
    bodyMapping?: Record<string, string>;
    // For function sources
    handler?: string;                 // Path to handler function
  };
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
  outputSchema?: {
    type: string;
    properties?: Record<string, JSONSchema>;
  };
  examples: Array<{
    name: string;
    input: Record<string, unknown>;
    description: string;
  }>;
  metadata: {
    dangerous: boolean;
    requiresConfirmation: boolean;
    timeout?: number;
    retryable: boolean;
  };
}
```

### 4.5 Resource Definition Schema

**File**: `.aiwg/smiths/mcpsmith/servers/{id}/resources/{resource-name}.json`

```typescript
interface MCPsmithResourceDefinition {
  name: string;
  uri: string;
  uriTemplate?: string;               // For parameterized resources
  description: string;
  mimeType: string;
  source: {
    type: 'cli' | 'api' | 'file' | 'function';
    // For CLI sources
    command?: string;
    args?: string[];
    // For API sources
    method?: string;
    endpoint?: string;
    // For file sources
    path?: string;
    // For function sources
    handler?: string;
  };
  cache: {
    enabled: boolean;
    ttl: number;                      // Seconds
  };
}
```

---

## 5. Component Design

### 5.1 CLI Analyzer

**Purpose**: Extract tool definitions from CLI tools by parsing help output.

**Module**: `src/mcpsmith/analyzers/cli-analyzer.mjs`

```
Input: CLI command name (e.g., "git")
                |
                v
    +------------------------+
    |  Execute --help, -h    |
    |  Capture stdout/stderr |
    +------------------------+
                |
                v
    +------------------------+
    |  Parse Help Text       |
    |  - Extract description |
    |  - Find subcommands    |
    |  - Identify global opts|
    +------------------------+
                |
                v
    +------------------------+
    |  For Each Subcommand   |
    |  - Execute sub --help  |
    |  - Parse flags/args    |
    |  - Build input schema  |
    +------------------------+
                |
                v
    +------------------------+
    |  Generate Tool Defs    |
    |  - Name: {cmd}-{sub}   |
    |  - Map flags to schema |
    |  - Identify dangerous  |
    +------------------------+
                |
                v
    Output: Tool definitions array
```

**Key Functions**:
- `parseHelpText(text: string): ParsedHelp`
- `extractSubcommands(text: string): Subcommand[]`
- `parseFlags(text: string): Flag[]`
- `generateToolDefinition(cmd: string, sub: Subcommand, flags: Flag[]): ToolDefinition`

### 5.2 API Analyzer

**Purpose**: Convert OpenAPI/Swagger specifications to MCP tools.

**Module**: `src/mcpsmith/analyzers/api-analyzer.mjs`

```
Input: OpenAPI spec file
            |
            v
    +------------------------+
    |  Parse OpenAPI Spec    |
    |  (JSON or YAML)        |
    +------------------------+
            |
            v
    +------------------------+
    |  Extract Operations    |
    |  - Path + Method       |
    |  - Operation ID        |
    |  - Parameters          |
    |  - Request body        |
    +------------------------+
            |
            v
    +------------------------+
    |  For Each Operation    |
    |  - Map to tool name    |
    |  - Convert params to   |
    |    Zod schema          |
    |  - Map body to schema  |
    +------------------------+
            |
            v
    +------------------------+
    |  Generate Tool Defs    |
    |  - Name: {method}-{op} |
    |  - Input from params   |
    |  - HTTP call in handler|
    +------------------------+
            |
            v
    Output: Tool definitions array
```

**OpenAPI to MCP Mapping**:

| OpenAPI | MCP Tool |
|---------|----------|
| operationId | tool name |
| summary | description |
| parameters (query) | inputSchema properties |
| parameters (path) | inputSchema properties (required) |
| requestBody | inputSchema properties |
| responses | output handling |

### 5.3 Catalog Analyzer

**Purpose**: Parse YAML/JSON tool catalogs into MCP tools.

**Module**: `src/mcpsmith/analyzers/catalog-analyzer.mjs`

**Catalog Format**:
```yaml
# tools.yaml
name: dev-tools
version: 1.0.0
description: Developer productivity tools

tools:
  - name: format-json
    description: Format JSON with proper indentation
    command: jq
    args: ['.']
    input:
      json:
        type: string
        description: JSON to format
        required: true
      indent:
        type: number
        description: Indentation spaces
        default: 2

  - name: compress-file
    description: Compress a file using gzip
    command: gzip
    args: ['-k', '{{file}}']
    input:
      file:
        type: string
        description: File path to compress
        required: true
```

### 5.4 Natural Language Analyzer

**Purpose**: Generate tool definitions from natural language descriptions.

**Module**: `src/mcpsmith/analyzers/nl-analyzer.mjs`

**Process**:
1. Parse description for tool names and operations
2. Generate placeholder schemas
3. Prompt user for refinement
4. Validate and confirm

**Example**:
```
Input: "File operations: read, write, copy, move, delete"

Generated:
- file-read: Read file contents
  - path (string, required)
  - encoding (string, default: utf-8)

- file-write: Write content to file
  - path (string, required)
  - content (string, required)
  - append (boolean, default: false)

- file-copy: Copy file
  - source (string, required)
  - destination (string, required)

- file-move: Move/rename file
  - source (string, required)
  - destination (string, required)

- file-delete: Delete file
  - path (string, required)
  - force (boolean, default: false)
```

### 5.5 Code Generator

**Purpose**: Transform tool definitions into runnable MCP server code.

**Module**: `src/mcpsmith/generator/code-generator.mjs`

**Template Engine**: Simple string interpolation with markers

**Templates**:

1. **server-base.mjs.tpl**: Main server entry point
2. **tool-handler.mjs.tpl**: Individual tool handler
3. **resource-handler.mjs.tpl**: Resource handler
4. **cli-executor.mjs.tpl**: CLI command execution wrapper

**Generation Process**:
```
Tool Definitions + Config
         |
         v
+------------------------+
|  Load Templates        |
+------------------------+
         |
         v
+------------------------+
|  Render server.mjs     |
|  - Import statements   |
|  - Tool registrations  |
|  - Resource registrations|
|  - Transport setup     |
+------------------------+
         |
         v
+------------------------+
|  Generate tool files   |
|  - Schema JSON         |
|  - Handler code        |
+------------------------+
         |
         v
+------------------------+
|  Generate config       |
|  - config.json         |
|  - manifest.json       |
+------------------------+
         |
         v
Output: Complete server directory
```

### 5.6 Server Lifecycle Manager

**Purpose**: Manage server lifecycle (start, stop, health check, register).

**Module**: `src/mcpsmith/lifecycle/manager.mjs`

**States**:
```
                 +----------+
                 | inactive |<-----------------+
                 +----+-----+                  |
                      |                        |
              start() |                        | stop()
                      v                        |
                 +----------+                  |
                 |  active  |------------------+
                 +----+-----+
                      |
              error() |
                      v
                 +----------+
                 |  error   |
                 +----------+
```

**Key Operations**:
- `start(serverId)`: Launch server process
- `stop(serverId)`: Gracefully stop server
- `restart(serverId)`: Stop then start
- `health(serverId)`: Check server health
- `register(serverId, platforms[])`: Register with MCP clients
- `unregister(serverId, platforms[])`: Remove registrations

---

## 6. Server Generation Workflow

### 6.1 CLI Tool Generation Workflow

```
User: aiwg smith new git-server --from-cli git
                    |
                    v
        +------------------------+
        |  Validate CLI exists   |
        |  which git             |
        +------------------------+
                    |
                    v
        +------------------------+
        |  CLI Analyzer          |
        |  - Parse git --help    |
        |  - Find subcommands    |
        |  - Parse each subcmd   |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Interactive Filter    |
        |  - Show discovered     |
        |  - User selects tools  |
        |  - Mark dangerous      |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Code Generator        |
        |  - Generate server.mjs |
        |  - Generate tools/*.json|
        |  - Generate config     |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Registry Update       |
        |  - Add to registry.json|
        |  - Set status: active  |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Output Summary        |
        |  - Server location     |
        |  - Tool count          |
        |  - Next steps          |
        +------------------------+
```

### 6.2 API Generation Workflow

```
User: aiwg smith new petstore --from-api openapi.yaml
                    |
                    v
        +------------------------+
        |  Validate spec file    |
        |  Parse OpenAPI 3.x     |
        +------------------------+
                    |
                    v
        +------------------------+
        |  API Analyzer          |
        |  - Extract paths       |
        |  - Extract operations  |
        |  - Build schemas       |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Authentication Setup  |
        |  - Detect auth methods |
        |  - Configure secrets   |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Code Generator        |
        |  - Generate server     |
        |  - HTTP client setup   |
        |  - Auth middleware     |
        +------------------------+
                    |
                    v
        Output: Generated API server
```

### 6.3 Regeneration Workflow

```
User: aiwg smith regenerate git-server
                    |
                    v
        +------------------------+
        |  Load existing config  |
        |  Preserve customizations|
        +------------------------+
                    |
                    v
        +------------------------+
        |  Re-analyze source     |
        |  (git --help)          |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Diff detection        |
        |  - New tools found     |
        |  - Changed flags       |
        |  - Removed commands    |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Merge strategy        |
        |  - Keep customizations |
        |  - Add new tools       |
        |  - Warn on removals    |
        +------------------------+
                    |
                    v
        +------------------------+
        |  Regenerate code       |
        |  Update manifest       |
        +------------------------+
```

---

## 7. CLI Command Specification

### 7.1 Command Structure

```
aiwg smith <command> [options]

Commands:
  new         Create new MCP server
  list        List generated servers
  info        Show server details
  start       Start server
  stop        Stop server
  restart     Restart server
  regenerate  Regenerate from source
  remove      Remove server
  register    Register with platforms
  unregister  Remove platform registration
  health      Check server health
  export      Export as standalone
  logs        View server logs
```

### 7.2 Detailed Command Specifications

#### `aiwg smith new`

```
aiwg smith new <server-id> [options]

Create a new MCP server from source specification.

Options:
  --from-cli <command>         Generate from CLI tool
  --from-api <spec-file>       Generate from OpenAPI spec
  --from-catalog <file>        Generate from YAML/JSON catalog
  --from-description <text>    Generate from natural language
  --from-extension <server>    Extend existing server

  --name <name>               Server display name
  --description <text>        Server description
  --version <version>         Initial version (default: 1.0.0)

  --transport <type>          Transport: stdio (default), http
  --port <number>             Port for HTTP transport

  --sandbox                   Enable sandboxed execution (default)
  --no-sandbox                Disable sandboxing (dangerous)
  --allow-dangerous           Allow dangerous commands
  --timeout <ms>              Command timeout (default: 30000)

  --interactive               Interactive mode for tool selection
  --non-interactive           Skip all prompts (use defaults)

  --register                  Immediately register with platforms
  --register-claude           Register with Claude Code
  --register-factory          Register with Factory AI

Examples:
  aiwg smith new git --from-cli git
  aiwg smith new petstore --from-api openapi.yaml
  aiwg smith new file-tools --from-description "read, write, copy files"
  aiwg smith new docker --from-cli docker --allow-dangerous
```

#### `aiwg smith list`

```
aiwg smith list [options]

List all generated MCP servers.

Options:
  --status <status>    Filter by status (active, inactive, error)
  --source <type>      Filter by source type (cli, api, catalog, nl)
  --format <format>    Output format: table (default), json, yaml

Example Output:
  ID            NAME              STATUS    TOOLS  TRANSPORT  REGISTERED
  git           Git CLI           active    23     stdio      claude, factory
  docker        Docker CLI        active    45     stdio      claude
  petstore-api  Petstore API      inactive  12     http       -
```

#### `aiwg smith info`

```
aiwg smith info <server-id> [options]

Show detailed server information.

Options:
  --tools              Show tool list
  --resources          Show resource list
  --config             Show configuration
  --format <format>    Output format

Example Output:
  Server: git
  Name: Git CLI Server
  Version: 1.0.0
  Status: active
  Transport: stdio

  Source:
    Type: cli
    Command: git
    Version: 2.43.0

  Capabilities:
    Tools: 23
    Resources: 2
    Prompts: 0

  Registered Platforms:
    - Claude Code
    - Factory AI

  Health:
    Status: healthy
    Last Check: 2025-12-12T10:30:00Z

  Tools (showing 5 of 23):
    - git-status: Show working tree status
    - git-log: Show commit logs
    - git-diff: Show changes
    - git-commit: Record changes to repository
    - git-branch: List, create, or delete branches
    Use --tools to see all
```

#### `aiwg smith start/stop/restart`

```
aiwg smith start <server-id> [options]
aiwg smith stop <server-id>
aiwg smith restart <server-id> [options]

Manage server lifecycle.

Start Options:
  --transport <type>    Override transport (stdio, http)
  --port <number>       Port for HTTP transport
  --foreground          Run in foreground (default: background)
  --env <KEY=VALUE>     Set environment variable

Examples:
  aiwg smith start git
  aiwg smith start petstore-api --transport http --port 3200
  aiwg smith stop git
  aiwg smith restart git
```

#### `aiwg smith register/unregister`

```
aiwg smith register <server-id> [options]
aiwg smith unregister <server-id> [options]

Manage platform registrations.

Options:
  --claude              Register/unregister with Claude Code
  --factory             Register/unregister with Factory AI
  --codex               Register/unregister with OpenAI Codex
  --cursor              Register/unregister with Cursor
  --all                 All supported platforms
  --global              Global registration (vs project-local)

Examples:
  aiwg smith register git --claude --factory
  aiwg smith register petstore-api --all --global
  aiwg smith unregister git --factory
```

#### `aiwg smith export`

```
aiwg smith export <server-id> [options]

Export server as standalone package.

Options:
  --output <path>       Output directory (default: ./mcpsmith-{id})
  --format <format>     Package format: npm (default), docker, zip
  --include-deps        Include node_modules
  --standalone          Create fully standalone executable

Examples:
  aiwg smith export git --output ./git-mcp-server
  aiwg smith export git --format docker
  aiwg smith export git --standalone
```

---

## 8. Integration Architecture

### 8.1 AIWG MCP Server Integration

MCPsmith servers can be exposed through the main AIWG MCP server.

**Resource URIs**:
- `mcpsmith://servers/catalog` - List all servers
- `mcpsmith://servers/{id}` - Server info
- `mcpsmith://servers/{id}/tools` - Server tools
- `mcpsmith://servers/{id}/config` - Server config

**New Tool**: `mcpsmith-invoke`

```javascript
server.registerTool('mcpsmith-invoke', {
  title: 'Invoke MCPsmith Server Tool',
  description: 'Execute a tool from a generated MCPsmith server',
  inputSchema: {
    server: z.string().describe('MCPsmith server ID'),
    tool: z.string().describe('Tool name to invoke'),
    input: z.record(z.any()).describe('Tool input parameters')
  }
}, async ({ server, tool, input }) => {
  // Load server, invoke tool, return result
});
```

### 8.2 Platform Registration

**Claude Code** (`.claude/settings.local.json`):
```json
{
  "mcpServers": {
    "mcpsmith-git": {
      "command": "node",
      "args": [".aiwg/smiths/mcpsmith/servers/git/server.mjs"],
      "env": {}
    }
  }
}
```

**Factory AI** (`~/.factory/mcp.json`):
```json
{
  "mcpServers": {
    "mcpsmith-git": {
      "type": "stdio",
      "command": "node",
      "args": [".aiwg/smiths/mcpsmith/servers/git/server.mjs"],
      "disabled": false
    }
  }
}
```

**OpenAI Codex** (`~/.codex/config.toml`):
```toml
[mcp_servers.mcpsmith-git]
command = "node"
args = [".aiwg/smiths/mcpsmith/servers/git/server.mjs"]
startup_timeout_sec = 10.0
```

### 8.3 Cross-Server Communication

MCPsmith servers can invoke tools from other MCPsmith servers:

```javascript
// In server.mjs
import { MCPsmithClient } from './mcpsmith-client.mjs';

const client = new MCPsmithClient();
const result = await client.invoke('other-server', 'tool-name', { param: 'value' });
```

---

## 9. Security Architecture

### 9.1 Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| Command Injection | High | Input sanitization, allowlisting |
| Path Traversal | High | Path validation, sandboxing |
| Arbitrary Code Execution | Critical | Sandboxed execution, no eval |
| Sensitive Data Exposure | Medium | Environment isolation, secrets management |
| Denial of Service | Medium | Timeouts, rate limiting |
| Privilege Escalation | High | Least privilege, blocked commands |

### 9.2 Security Controls

#### 9.2.1 Command Sandboxing

```javascript
// Sandbox configuration
const sandbox = {
  // Working directory restrictions
  cwd: config.security.allowedPaths[0],

  // Environment isolation
  env: {
    PATH: '/usr/bin:/bin',  // Restricted PATH
    HOME: process.env.HOME,
    ...config.source.environment
  },

  // Process limits
  timeout: config.security.maxExecutionTime,
  maxBuffer: 10 * 1024 * 1024,  // 10MB

  // Shell disabled
  shell: false
};
```

#### 9.2.2 Command Allowlisting

```json
{
  "tools": {
    "allowlist": ["status", "log", "diff", "branch", "checkout"],
    "denylist": ["push --force", "reset --hard", "clean -fd"],
    "dangerousCommands": {
      "require_confirmation": ["reset", "rebase", "push"],
      "blocked": ["rm -rf", "format", "mkfs"]
    }
  }
}
```

#### 9.2.3 Input Validation

```javascript
function validateInput(input, schema) {
  // Type validation
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error);
  }

  // Path traversal check
  for (const [key, value] of Object.entries(result.data)) {
    if (typeof value === 'string') {
      if (value.includes('..') || value.startsWith('/')) {
        throw new SecurityError(`Invalid path in ${key}`);
      }
    }
  }

  // Command injection check
  const dangerousPatterns = /[;&|`$(){}[\]<>]/;
  for (const [key, value] of Object.entries(result.data)) {
    if (typeof value === 'string' && dangerousPatterns.test(value)) {
      throw new SecurityError(`Potentially dangerous characters in ${key}`);
    }
  }

  return result.data;
}
```

### 9.3 Audit Logging

All tool invocations are logged:

```json
{
  "timestamp": "2025-12-12T10:30:00.000Z",
  "server": "git",
  "tool": "git-status",
  "input": { "path": "." },
  "output": { "exitCode": 0 },
  "duration": 150,
  "user": "claude-code",
  "ip": "local"
}
```

**Log Location**: `.aiwg/smiths/mcpsmith/logs/{server-id}/{date}.log`

---

## 10. Implementation Roadmap

### 10.1 Phase 1: Core Infrastructure (Weeks 1-2)

**Deliverables**:
- Directory structure and schemas
- Registry management
- Basic CLI (`new`, `list`, `info`)
- CLI Analyzer
- Server template generation
- Basic server lifecycle

**Acceptance Criteria**:
- `aiwg smith new git --from-cli git` generates working server
- Registry tracks all servers
- Generated server starts and responds to MCP protocol

### 10.2 Phase 2: Analyzer Expansion (Weeks 3-4)

**Deliverables**:
- API Analyzer (OpenAPI 3.x)
- Catalog Analyzer (YAML/JSON)
- Basic NL Analyzer
- Interactive refinement UI

**Acceptance Criteria**:
- `aiwg smith new api --from-api openapi.yaml` works
- Catalog format documented and working
- NL generates reasonable tool stubs

### 10.3 Phase 3: Lifecycle Management (Weeks 5-6)

**Deliverables**:
- Start/stop/restart commands
- Health checking
- Platform registration
- AIWG MCP integration
- Resource support

**Acceptance Criteria**:
- `aiwg smith start/stop` work reliably
- Health checks detect issues
- Registration updates platform configs
- MCPsmith resources available in AIWG MCP

### 10.4 Phase 4: Polish & Documentation (Weeks 7-8)

**Deliverables**:
- Export functionality
- Docker support
- Comprehensive documentation
- Example servers
- Test coverage

**Acceptance Criteria**:
- Export produces standalone packages
- Docker images build and run
- Documentation covers all features
- 80% test coverage

---

## 11. Risk Analysis

### 11.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| CLI help parsing accuracy | High | Medium | Pattern database, manual refinement |
| OpenAPI complexity | Medium | Medium | Focus on common patterns, warn on unsupported |
| Security vulnerabilities | Medium | High | Security audit, sandboxing, testing |
| Node.js version compatibility | Low | High | Lock to LTS, CI testing |
| MCP SDK breaking changes | Low | High | Pin version, monitor releases |

### 11.2 Project Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | Medium | High | Strict MVP definition |
| Timeline slippage | Medium | Medium | Phased delivery |
| Maintenance burden | Medium | Medium | Strong documentation |

---

## 12. Appendices

### 12.1 Example: Git Server Generation

**Command**:
```bash
aiwg smith new git --from-cli git --interactive
```

**Generated Tools** (subset):
- `git-status`: Show working tree status
- `git-log`: Show commit logs
- `git-diff`: Show changes between commits
- `git-add`: Add file contents to index
- `git-commit`: Record changes to repository
- `git-branch`: List, create, delete branches
- `git-checkout`: Switch branches
- `git-merge`: Join development histories
- `git-pull`: Fetch and integrate
- `git-fetch`: Download objects and refs

**Excluded (dangerous)**:
- `git-push --force`
- `git-reset --hard`
- `git-clean -fd`

### 12.2 Example: OpenAPI Server Generation

**Input**: Petstore OpenAPI 3.0 spec

**Generated Tools**:
- `list-pets`: GET /pets
- `create-pet`: POST /pets
- `get-pet`: GET /pets/{petId}
- `update-pet`: PUT /pets/{petId}
- `delete-pet`: DELETE /pets/{petId}

### 12.3 JSON Schema Files

Full JSON Schema definitions available at:
- `.aiwg/smiths/mcpsmith/schemas/registry.schema.json`
- `.aiwg/smiths/mcpsmith/schemas/config.schema.json`
- `.aiwg/smiths/mcpsmith/schemas/manifest.schema.json`
- `.aiwg/smiths/mcpsmith/schemas/tool.schema.json`

### 12.4 Template Files

Templates stored in:
- `agentic/code/frameworks/sdlc-complete/templates/mcpsmith/`

Available templates:
- `server-base.mjs.tpl`
- `server-http.mjs.tpl`
- `tool-cli.json.tpl`
- `tool-api.json.tpl`
- `config.json.tpl`
- `manifest.json.tpl`

---

## Traceability

### References

- @.aiwg/architecture/decisions/ADR-014-mcpsmith-mcp-server-generator.md - ADR
- @src/mcp/server.mjs - Existing MCP server implementation
- @src/mcp/cli.mjs - MCP CLI implementation
- @tools/agents/deploy-agents.mjs - Deployment patterns
- @agentic/code/frameworks/sdlc-complete/config/models.json - Configuration patterns

### Implementation Files (Planned)

- @src/mcpsmith/cli.mjs - MCPsmith CLI router
- @src/mcpsmith/analyzers/cli-analyzer.mjs - CLI analyzer
- @src/mcpsmith/analyzers/api-analyzer.mjs - API analyzer
- @src/mcpsmith/generator/code-generator.mjs - Code generator
- @src/mcpsmith/lifecycle/manager.mjs - Lifecycle manager
- @src/mcpsmith/registry/registry-manager.mjs - Registry manager

### Tests (Planned)

- @test/unit/mcpsmith/cli-analyzer.test.ts
- @test/unit/mcpsmith/api-analyzer.test.ts
- @test/unit/mcpsmith/code-generator.test.ts
- @test/integration/mcpsmith/server-generation.test.ts

---

**Document Status**: PROPOSED
**Next Review**: Construction Phase Kickoff
**Author**: Architecture Designer
**Reviewers**: Pending multi-agent review

---

**END OF DOCUMENT**
