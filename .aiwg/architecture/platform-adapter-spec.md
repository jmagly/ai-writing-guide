# AIWG Platform Adapter Specification

**Status**: DRAFT - Architectural Discussion
**Purpose**: Define lightweight abstraction for multi-platform workflow execution
**MCP Version**: 2025-11-25 (November 25, 2025 release)
**Reference**: [REF-003: MCP Specification 2025](../../docs/references/REF-003-mcp-specification-2025.md)

## Design Principles

1. **MCP-First**: Model Context Protocol 2025-11-25 is the primary abstraction layer
2. **Minimal Abstraction**: Pipe communication to platforms, don't rebuild them
3. **Platform-Native**: Let each platform do what it does best
4. **Context Assembly**: Standardize how context stack is built and injected
5. **Simple CLI**: `aiwg run <workflow>` should just work
6. **Async-Ready**: Support MCP Tasks for long-running operations
7. **Security-First**: OAuth 2.1 with RFC 8707 resource indicators

## Architecture: MCP as Primary Abstraction

MCP (Model Context Protocol) provides a standard interface for AI tools. AIWG exposes its capabilities as an MCP server, making it consumable by any MCP-compatible client.

```
┌─────────────────────────────────────────────────────────┐
│                  AIWG MCP Server                        │
│  (Exposes AIWG capabilities via standard MCP protocol)  │
├─────────────────────────────────────────────────────────┤
│ Tools:                                                  │
│   - aiwg/workflow-run                                   │
│   - aiwg/workflow-status                                │
│   - aiwg/artifact-read                                  │
│   - aiwg/artifact-write                                 │
│   - aiwg/template-render                                │
│   - aiwg/agent-invoke                                   │
│                                                         │
│ Resources:                                              │
│   - aiwg://prompts/{category}/{name}                    │
│   - aiwg://templates/{framework}/{category}/{name}      │
│   - aiwg://agents/{framework}/{agent}                   │
│   - aiwg://artifacts/{project}/{path}                   │
│                                                         │
│ Prompts:                                                │
│   - aiwg/decompose-task                                 │
│   - aiwg/parallel-execution                             │
│   - aiwg/recovery-protocol                              │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ↓               ↓               ↓
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │  Claude  │   │  Future  │   │  Future  │
   │   Code   │   │  Warp    │   │ Factory  │
   │  (MCP)   │   │  (MCP?)  │   │  (MCP?)  │
   └──────────┘   └──────────┘   └──────────┘
         │
         │ For non-MCP platforms:
         ↓
   ┌──────────────────────────────────────┐
   │     Legacy Platform Adapters         │
   │  (Thin shim for non-MCP platforms)   │
   └──────────────────────────────────────┘
```

**Key Insight**: If a platform supports MCP, it can consume AIWG directly. Platform adapters are only needed for legacy/non-MCP platforms.

## Core Concept

```
┌─────────────────────────────────────────────────────────┐
│                    AIWG CLI                             │
│  aiwg run "transition to elaboration" --platform claude │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│                 Context Assembler                        │
│  - Load framework context (SDLC, MMK, etc.)             │
│  - Load project context (.aiwg/, CLAUDE.md)             │
│  - Load relevant prompts (@-imports)                    │
│  - Assemble into platform-specific format               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Platform Adapter (selected)                 │
│  - Format prompt for platform conventions               │
│  - Append platform-specific instructions                │
│  - Invoke platform CLI/API                              │
│  - Capture and normalize output                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
            ┌────────────┴────────────┐
            │   Platform CLI/API      │
            │   (claude, warp, etc.)  │
            └─────────────────────────┘
```

## Platform Registry

```yaml
# ~/.config/aiwg/platforms.yaml (or .aiwg/platforms.yaml for project override)
platforms:
  claude:
    name: "Claude Code"
    cli: "claude"
    available: true  # Auto-detected or manual
    context_file: "CLAUDE.md"
    agent_dir: ".claude/agents"
    command_dir: ".claude/commands"
    invoke_pattern: "claude --print \"{prompt}\""
    # Or for interactive: "claude" with stdin

  warp:
    name: "Warp Terminal"
    cli: "warp"  # Or null if AI pane only
    available: true
    context_file: "WARP.md"  # Symlinked to CLAUDE.md
    agent_dir: null  # Warp uses single context file
    command_dir: null
    invoke_pattern: null  # Manual - open Warp AI pane
    manual_mode: true

  factory:
    name: "Factory AI"
    cli: "factory"
    available: true
    context_file: "AGENTS.md"
    agent_dir: ".factory/droids"
    command_dir: ".factory/commands"
    invoke_pattern: "droid . --prompt \"{prompt}\""

  openai:
    name: "OpenAI Codex"
    cli: null  # API only
    available: false
    context_file: "AGENTS.md"
    agent_dir: ".codex/agents"
    api_endpoint: "https://api.openai.com/v1/responses"
    invoke_pattern: null  # API call, not CLI

default: claude
```

## Platform Adapter Interface

Each adapter implements:

```javascript
// Conceptual interface - actual implementation TBD
interface PlatformAdapter {
  // Platform identification
  id: string;           // 'claude', 'warp', 'factory', 'openai'
  name: string;         // Human-readable name

  // Capability detection
  detect(): Promise<boolean>;  // Is platform available?
  version(): Promise<string>;  // Platform version

  // Context assembly
  getContextFile(): string;    // CLAUDE.md, WARP.md, AGENTS.md
  getAgentDir(): string|null;  // .claude/agents, .factory/droids
  getCommandDir(): string|null;

  // Prompt formatting
  formatPrompt(prompt: string, context: Context): string;
  appendInstructions(prompt: string): string;  // Platform-specific additions

  // Execution
  invoke(prompt: string, options: InvokeOptions): Promise<Result>;

  // Output handling
  parseOutput(raw: string): NormalizedOutput;
}
```

## Context Assembly

The Context Assembler builds a unified context stack:

```javascript
interface Context {
  // Framework context
  framework: {
    id: string;              // 'sdlc-complete', 'media-marketing-kit'
    prompts: string[];       // Resolved @-imports
    agents: AgentDef[];      // Available agents
    commands: CommandDef[];  // Available commands
  };

  // Project context
  project: {
    contextFile: string;     // Contents of CLAUDE.md/WARP.md
    artifacts: string[];     // .aiwg/ contents relevant to task
    workingDir: string;      // Current working directory
  };

  // Task context
  task: {
    prompt: string;          // User's original request
    workflow: string|null;   // Detected workflow (flow-*, intake-*, etc.)
    guidance: string|null;   // --guidance parameter
  };
}
```

## Invocation Patterns

### Pattern 1: CLI Pipe (Claude, Factory)

```bash
# Claude Code
echo "transition to elaboration" | claude --print

# Or with context file explicit
claude --print "Given context in CLAUDE.md, execute: transition to elaboration"

# Factory AI
droid . --prompt "transition to elaboration"
```

### Pattern 2: Manual Mode (Warp)

```
# Warp doesn't have a scriptable CLI for AI
# Generate instructions for user:

To execute in Warp Terminal:
1. Open Warp AI pane (Ctrl+Shift+Space)
2. Paste the following:

---
transition to elaboration
---

Context has been prepared in WARP.md
```

### Pattern 3: API Call (OpenAI, future)

```javascript
// Direct API invocation
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    input: assembledPrompt,
    // ... other params
  })
});
```

## Platform-Specific Instructions

Each platform may need appended instructions:

### Claude Code

```markdown
## Platform Instructions

You are running via AIWG CLI external invocation.
- Output should be structured for parsing
- Use TodoWrite for progress tracking
- Artifacts go to .aiwg/ directory
- Signal completion with: AIWG_COMPLETE: <summary>
```

### Factory AI

```markdown
## Droid Instructions

Executing AIWG workflow via Factory CLI.
- Follow AGENTS.md agent definitions
- Output structured JSON for status
- Write artifacts to .aiwg/
```

### Warp Terminal

```markdown
## Warp Context

AIWG workflow prepared. Context in WARP.md.
- This is a single-shot execution
- No multi-agent orchestration available
- Focus on direct task completion
```

## CLI Interface

```bash
# Basic invocation
aiwg run "transition to elaboration"
# Uses default platform from config

# Explicit platform
aiwg run "transition to elaboration" --platform factory

# With guidance
aiwg run "create architecture baseline" --guidance "focus on security"

# Workflow shorthand
aiwg run flow-inception-to-elaboration

# Dry run (show what would be sent)
aiwg run "security review" --dry-run

# List available platforms
aiwg platforms
# Output:
# ✓ claude (default) - Claude Code v1.0.23
# ✓ factory - Factory AI v2.1.0
# ○ warp - Warp Terminal (manual mode)
# ✗ openai - Not configured

# Set default platform
aiwg config set default-platform factory
```

## Output Normalization

All platform outputs normalized to:

```typescript
interface NormalizedOutput {
  status: 'success' | 'partial' | 'error';
  summary: string;

  artifacts: {
    path: string;
    action: 'created' | 'modified' | 'deleted';
  }[];

  agents_invoked: {
    name: string;
    status: 'completed' | 'failed';
    duration_ms: number;
  }[];

  raw_output: string;  // Original platform output

  next_steps: string[];  // Suggested follow-ups
}
```

## MCP Server Specification

The AIWG MCP Server is the primary interface. Follows **MCP 2025-11-25 specification**.

### Server Info

```json
{
  "name": "aiwg",
  "version": "1.0.0",
  "description": "AI Workflow Guide - SDLC, Marketing, and Writing Quality frameworks",
  "protocolVersion": "2025-11-25"
}
```

### Capabilities

```json
{
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": true, "listChanged": true },
    "prompts": { "listChanged": true },
    "experimental": {
      "tasks": true
    }
  }
}
```

### Tools

#### aiwg/workflow-run

Execute an AIWG workflow.

```json
{
  "name": "aiwg/workflow-run",
  "description": "Execute AIWG workflow (phase transitions, reviews, artifact generation)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string",
        "description": "Natural language workflow request or command name"
      },
      "guidance": {
        "type": "string",
        "description": "Strategic guidance to influence execution"
      },
      "framework": {
        "type": "string",
        "enum": ["sdlc-complete", "media-marketing-kit", "auto"],
        "default": "auto",
        "description": "Framework to use (auto-detected from prompt if not specified)"
      },
      "project_dir": {
        "type": "string",
        "description": "Project directory path (default: current directory)"
      },
      "dry_run": {
        "type": "boolean",
        "default": false,
        "description": "Show what would be executed without running"
      }
    },
    "required": ["prompt"]
  }
}
```

#### aiwg/workflow-status

Check status of running or completed workflow.

```json
{
  "name": "aiwg/workflow-status",
  "description": "Get status of AIWG workflow execution",
  "inputSchema": {
    "type": "object",
    "properties": {
      "workflow_id": {
        "type": "string",
        "description": "Workflow ID (from workflow-run response)"
      },
      "project_dir": {
        "type": "string",
        "description": "Project directory to check status for"
      }
    }
  }
}
```

#### aiwg/artifact-read

Read an AIWG artifact.

```json
{
  "name": "aiwg/artifact-read",
  "description": "Read artifact from .aiwg/ directory",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path relative to .aiwg/ (e.g., 'requirements/UC-001.md')"
      },
      "project_dir": {
        "type": "string"
      }
    },
    "required": ["path"]
  }
}
```

#### aiwg/artifact-write

Write an AIWG artifact.

```json
{
  "name": "aiwg/artifact-write",
  "description": "Write artifact to .aiwg/ directory",
  "inputSchema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Path relative to .aiwg/"
      },
      "content": {
        "type": "string",
        "description": "Artifact content"
      },
      "project_dir": {
        "type": "string"
      }
    },
    "required": ["path", "content"]
  }
}
```

#### aiwg/template-render

Render a template with variables.

```json
{
  "name": "aiwg/template-render",
  "description": "Render AIWG template with provided variables",
  "inputSchema": {
    "type": "object",
    "properties": {
      "template": {
        "type": "string",
        "description": "Template path (e.g., 'sdlc/intake/project-intake-template.md')"
      },
      "variables": {
        "type": "object",
        "description": "Template variable substitutions"
      }
    },
    "required": ["template"]
  }
}
```

#### aiwg/agent-list

List available agents.

```json
{
  "name": "aiwg/agent-list",
  "description": "List available AIWG agents",
  "inputSchema": {
    "type": "object",
    "properties": {
      "framework": {
        "type": "string",
        "enum": ["sdlc-complete", "media-marketing-kit", "all"],
        "default": "all"
      },
      "category": {
        "type": "string",
        "description": "Filter by category (e.g., 'security', 'testing')"
      }
    }
  }
}
```

### Resources

Resources provide read-only access to AIWG content.

#### Prompts

```
aiwg://prompts/core/orchestrator
aiwg://prompts/core/multi-agent-pattern
aiwg://prompts/reliability/decomposition
aiwg://prompts/reliability/parallel-hints
aiwg://prompts/reliability/resilience
aiwg://prompts/agents/design-rules
```

#### Templates

```
aiwg://templates/sdlc-complete/intake/project-intake-template
aiwg://templates/sdlc-complete/analysis-design/software-architecture-doc-template
aiwg://templates/sdlc-complete/security/threat-model-template
aiwg://templates/media-marketing-kit/campaign/campaign-brief-template
```

#### Agents

```
aiwg://agents/sdlc-complete/architecture-designer
aiwg://agents/sdlc-complete/security-gatekeeper
aiwg://agents/sdlc-complete/test-engineer
aiwg://agents/media-marketing-kit/campaign-strategist
```

### Prompts (MCP Prompt Templates)

Pre-defined prompts for common patterns.

```json
{
  "name": "aiwg/decompose-task",
  "description": "Decompose complex task into subtasks using AIWG patterns",
  "arguments": [
    {
      "name": "task",
      "description": "Task to decompose",
      "required": true
    },
    {
      "name": "complexity",
      "description": "Expected complexity: atomic, small, medium, large, epic",
      "required": false
    }
  ]
}
```

```json
{
  "name": "aiwg/parallel-execution",
  "description": "Guide for parallel agent execution",
  "arguments": [
    {
      "name": "tasks",
      "description": "List of tasks to parallelize",
      "required": true
    }
  ]
}
```

### Transport

The AIWG MCP Server supports MCP 2025-11-25 transport protocols:

1. **stdio** (default): For local CLI usage - recommended for single-client scenarios
2. **Streamable HTTP**: For remote/containerized deployments - replaced HTTP+SSE in spec 2025-03-26

```bash
# stdio (local) - recommended for Claude Desktop, local tools
aiwg mcp serve

# Streamable HTTP (remote) - for multi-client, load-balanced deployments
aiwg mcp serve --transport http --port 3100
```

**Streamable HTTP Features**:

- Stateless-friendly (each request self-contained)
- Infrastructure-compatible (proxies, load balancers)
- Optional SSE for streaming responses
- Session management via `Mcp-Session-Id` header

```typescript
// Session ID handling for Streamable HTTP
const sessionId = response.headers.get('Mcp-Session-Id');
// Include in subsequent requests:
// Headers: { 'Mcp-Session-Id': sessionId }
```

### Client Configuration

#### Claude Code

Add to `.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "aiwg": {
      "command": "aiwg",
      "args": ["mcp", "serve"],
      "env": {
        "AIWG_ROOT": "~/.local/share/ai-writing-guide"
      }
    }
  }
}
```

#### Other MCP Clients

Any MCP 1.0 compatible client can connect:

```bash
# Example: Generic MCP client
mcp-client connect stdio "aiwg mcp serve"

# Example: HTTP transport
mcp-client connect http://localhost:3100
```

## Tasks (Async Operations) - MCP 2025-11-25

Tasks enable "call-now, fetch-later" patterns for long-running AIWG workflows.

### Task Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌───────────┐
│ Request  │────▶│ working  │────▶│input_required│────▶│ completed │
└──────────┘     └────┬─────┘     └──────────────┘     └───────────┘
                      │                                       │
                      └──────────────▶ failed ◀───────────────┘
                                         │
                                         ▼
                                    cancelled
```

### Task-Enabled Tools

```typescript
// aiwg/workflow-run returns task handle for long operations
const result = await client.callTool("aiwg/workflow-run", {
  prompt: "transition to elaboration",
  guidance: "focus on security architecture"
});

// If operation is long-running, result includes task info
if (result.task) {
  console.log(`Task ID: ${result.task.id}`);
  console.log(`Status: ${result.task.status}`);  // "working"

  // Poll for completion
  while (true) {
    const status = await client.callTool("aiwg/task-status", {
      task_id: result.task.id
    });

    if (status.status === "completed") {
      console.log("Workflow complete:", status.result);
      break;
    } else if (status.status === "failed") {
      console.error("Workflow failed:", status.error);
      break;
    } else if (status.status === "input_required") {
      // Handle interactive prompts
      await handleUserInput(status.input_request);
    }

    await sleep(5000);  // Poll every 5 seconds
  }
}
```

### Task Benefits for AIWG

- **Phase transitions** can run asynchronously (15-30 minute operations)
- **Multi-agent workflows** don't block the client
- **Fault tolerance** - operations survive network interruptions
- **Progress updates** without blocking

## OAuth 2.1 Authorization - MCP 2025-11-25

For remote/production MCP deployments, AIWG supports OAuth 2.1 with RFC 8707.

### Resource Indicators (RFC 8707)

**Required** for token requests to prevent confused deputy attacks:

```typescript
// Token request MUST include resource indicator
const tokenRequest = {
  grant_type: "authorization_code",
  code: authCode,
  client_id: clientId,
  resource: "https://aiwg.example.com/mcp"  // RFC 8707 - REQUIRED
};

// Server validates audience matches
const token = await authServer.issueToken(tokenRequest);
// Token is bound to specific AIWG MCP server
```

### Protected Resource Metadata

Publish at `/.well-known/oauth-protected-resource`:

```json
{
  "resource": "https://aiwg.example.com/mcp",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["aiwg:read", "aiwg:write", "aiwg:workflow"]
}
```

### AIWG OAuth Scopes

| Scope | Description |
|-------|-------------|
| `aiwg:read` | Read artifacts, templates, agents |
| `aiwg:write` | Write artifacts to .aiwg/ |
| `aiwg:workflow` | Execute workflows |
| `aiwg:admin` | Server configuration |

## Server Discovery - MCP 2025-11-25

### .well-known/mcp.json

Enable automatic discovery:

```json
{
  "name": "aiwg",
  "version": "1.0.0",
  "description": "AI Writing Guide - SDLC, Marketing, and Writing Quality frameworks",
  "protocolVersion": "2025-11-25",
  "capabilities": ["tools", "resources", "prompts", "tasks"],
  "transport": ["stdio", "streamable-http"],
  "documentation": "https://github.com/jmagly/ai-writing-guide",
  "contact": "https://github.com/jmagly/ai-writing-guide/issues"
}
```

### Benefits

- Clients discover capabilities without connecting
- MCP Registry can auto-catalog
- Service auto-detection in enterprise environments

## Implementation Phases

### Phase 1: MCP Server Core (MVP)

**Goal**: Claude Code can consume AIWG via MCP

1. MCP server skeleton using `@modelcontextprotocol/sdk`
2. Core tools: `workflow-run`, `artifact-read`, `artifact-write`
3. Resource serving: prompts, templates, agents
4. stdio transport only
5. Use `registerTool`, `registerResource`, `registerPrompt` API (recommended)

**Implementation**:

```typescript
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "aiwg",
  version: "1.0.0"
});

// Register tools
server.registerTool("workflow-run", {
  title: "Run AIWG Workflow",
  description: "Execute AIWG workflow",
  inputSchema: {
    prompt: z.string(),
    guidance: z.string().optional(),
    framework: z.enum(["sdlc-complete", "media-marketing-kit", "auto"]).default("auto"),
    project_dir: z.string().default("."),
    dry_run: z.boolean().default(false)
  }
}, async (args) => {
  // Implementation
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Deliverable**: `aiwg mcp serve` works with Claude Code

### Phase 2: Full Tool Suite

**Goal**: Complete MCP interface with all capabilities

1. All tools: `workflow-status`, `template-render`, `agent-list`, `task-status`
2. MCP prompts: `decompose-task`, `parallel-execution`, `recovery-protocol`
3. Streamable HTTP transport option
4. `aiwg mcp install` helper for client configuration
5. Tasks (experimental) for async workflow operations

**Deliverable**: Production-ready MCP server with multiple transport options

### Phase 3: Production Features

**Goal**: Enterprise-ready deployment

1. OAuth 2.1 with RFC 8707 resource indicators
2. Server discovery via `.well-known/mcp.json`
3. Workflow state persistence (Redis/file-based)
4. Multi-agent coordination via MCP Tasks
5. Containerized MCP server (Docker image)
6. MCP Registry listing
7. Metrics and observability (OpenTelemetry)

### Phase 4: Extensions (Future)

1. Custom extensions for AIWG-specific capabilities
2. Legacy platform adapters (for non-MCP platforms)
3. Plugin system for third-party integrations

## Open Questions

1. ~~**Session persistence**: How do we handle multi-turn conversations across invocations?~~
   **RESOLVED**: MCP 2025-11-25 Tasks provide async state persistence. Streamable HTTP supports `Mcp-Session-Id` for session continuity.

2. **Agent state**: If Claude spawns subagents, how do we track across platforms that don't have this concept?
   **PARTIAL**: MCP Tasks can track workflow state. Sub-agent coordination requires AIWG-specific extension.

3. **Credentials**: Where do API keys live? Environment? Config file? Keychain?
   **DIRECTION**: OAuth 2.1 for remote deployments. Environment variables (`AIWG_*`) for local. Keychain integration deferred.

4. **Error recovery**: If platform CLI fails, what's the retry/fallback strategy?
   **DIRECTION**: MCP Tasks provide fault tolerance. Implement AIWG recovery protocol (PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE).

5. ~~**Streaming**: Should output be streamed or buffered?~~
   **RESOLVED**: Streamable HTTP supports optional SSE for streaming. Default to buffered for simplicity.

6. **NEW - Extensions**: Should AIWG define custom MCP extensions for multi-agent coordination?
   **STATUS**: MCP 2025-11-25 formalizes extensions framework. Evaluate for Phase 4.

## Relationship to Existing Components

| Existing Component | Disposition |
|--------------------|-------------|
| Hooks (aiwg-trace, etc.) | **Platform-specific** - Move to `adapters/claude/hooks/` |
| API Adapter spec | **Becomes** MCP/webhook layer on top of this |
| Deploy generators | **Remain** as templates; runtime uses this adapter |
| Agent personas | **Remain** - Platform adapters load appropriate format |

## Next Steps

### Immediate (Phase 1)

1. ✅ Finalize MCP 2025-11-25 alignment (this spec update)
2. Create `src/mcp/` directory structure
3. Install `@modelcontextprotocol/sdk` and `zod` dependencies
4. Implement `McpServer` with core tools (workflow-run, artifact-read, artifact-write)
5. Register resources (prompts, templates, agents)
6. Add `aiwg mcp serve` CLI command
7. Test with Claude Code MCP client configuration
8. Document client setup in README

### Short-term (Phase 2)

1. Add remaining tools and prompts
2. Implement Streamable HTTP transport
3. Add MCP Inspector integration for debugging
4. Create `aiwg mcp install` helper

### Medium-term (Phase 3)

1. OAuth 2.1 implementation
2. Server discovery endpoints
3. Docker image for containerized deployment
4. MCP Registry submission

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.24.0",
    "zod": "^3.25.0"
  }
}
```

## References

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Best Practices](https://modelcontextprotocol.info/docs/best-practices/)
- [REF-003: MCP Specification 2025](../../docs/references/REF-003-mcp-specification-2025.md)
