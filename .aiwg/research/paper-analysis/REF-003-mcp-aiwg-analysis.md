# REF-003 AIWG Analysis: Model Context Protocol Specification

> **Source Paper**: [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: 2026-01-24

## Overview

The Model Context Protocol (MCP) is an open standard for AI systems to integrate with external tools, data sources, and services. Originally introduced by Anthropic in November 2024, MCP was donated to the Agentic AI Foundation (Linux Foundation) in December 2025.

**Current Version**: 2025-11-25
**Ecosystem Scale**: 10,000+ active public MCP servers

This analysis extracts AIWG-specific implementation guidance and integration opportunities.

## AIWG Alignment with MCP Principles

### Three Primitives

| MCP Primitive | AIWG Equivalent | Implementation Status |
|---------------|-----------------|----------------------|
| **Tools** | Agent tools (Read, Write, Bash, etc.) | **Implemented** - Direct tool calls |
| **Resources** | Artifacts in `.aiwg/`, templates, agent definitions | **Partial** - File-based, not URI-addressable |
| **Prompts** | Agent definitions, flow commands, skills | **Strong** - Externalized as markdown |

**Key Alignment**: AIWG's externalized agent/command definitions align with MCP's prompts primitive.

**Gap**: AIWG resources (templates, artifacts) not exposed via URI scheme for external consumption.

## Recommended AIWG MCP Server Design

### Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `workflow_run` | Execute AIWG workflow | prompt, guidance, framework, project_dir, dry_run | Execution result with status |
| `workflow_status` | Check workflow status | workflow_id | Current state, progress |
| `artifact_read` | Read AIWG artifact | path (relative to `.aiwg/`) | Artifact content |
| `artifact_write` | Write AIWG artifact | path, content | Write confirmation |
| `template_render` | Render template | template_id, variables | Rendered content |
| `agent_list` | List available agents | framework, filter | Agent catalog |

### Resources (URI Patterns)

| Resource | URI Pattern | Purpose |
|----------|-------------|---------|
| Prompts | `aiwg://prompts/{category}/{name}` | AIWG prompt templates |
| Templates | `aiwg://templates/{category}/{name}` | SDLC templates |
| Agents | `aiwg://agents/{framework}/{name}` | Agent definitions |
| Voices | `aiwg://voices/{name}` | Voice profiles |
| Artifacts | `aiwg://artifacts/{path}` | Project artifacts in `.aiwg/` |

### Prompts

| Prompt | Purpose | Arguments |
|--------|---------|-----------|
| `decompose_task` | Break task into subtasks (≤7) | task, max_subtasks |
| `parallel_execution` | Identify parallelizable work | workflow_description |
| `recovery_protocol` | PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE | error_context, attempt_number |

## Implementation Phases

### Phase 1: Core MCP Server

**Scope**: Basic AIWG workflow execution via MCP

**Implementation**:
- Tools: `workflow_run`, `artifact_read`, `artifact_write`
- Resources: `agents`, `templates`
- Transport: stdio (local execution)

**Timeline**: Short-term (1-2 weeks)

**Benefits**:
- Claude Desktop integration
- Other MCP-compatible clients can use AIWG
- Standardized tool interface

**Location**: `src/mcp-server/core.ts`

### Phase 2: Full Capability

**Scope**: Complete AIWG feature set exposed

**Implementation**:
- All tools from table above
- All resources with URI templates
- Prompts for common patterns
- Transport: stdio + Streamable HTTP

**Timeline**: Medium-term (1-2 months)

**Benefits**:
- Remote AIWG execution
- Rich resource discovery
- Reusable prompt library

**Location**: `src/mcp-server/full.ts`

### Phase 3: Production

**Scope**: Enterprise-ready deployment

**Implementation**:
- Tasks (async operations for long workflows)
- OAuth 2.1 with RFC 8707 resource indicators
- Server discovery via `.well-known/mcp.json`
- Registry listing

**Timeline**: Long-term (3-6 months)

**Benefits**:
- Fault-tolerant execution
- Secure multi-user access
- Auto-discovery in MCP registries

**Location**: `src/mcp-server/production.ts`

## AIWG MCP Server Example

### Basic Server Setup

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "aiwg-server",
  version: "1.0.0"
});

// Tool: Run AIWG workflow
server.registerTool("workflow_run", {
  title: "Run AIWG Workflow",
  description: "Execute an AIWG workflow with natural language prompt",
  inputSchema: {
    prompt: z.string().describe("Natural language workflow request"),
    guidance: z.string().optional().describe("Strategic guidance"),
    framework: z.enum(["sdlc-complete", "media-marketing-kit", "auto"]).default("auto"),
    project_dir: z.string().default("."),
    dry_run: z.boolean().default(false)
  }
}, async ({ prompt, guidance, framework, project_dir, dry_run }) => {
  // Implementation: Execute AIWG workflow
  const result = await executeWorkflow({ prompt, guidance, framework, project_dir, dry_run });
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
  };
});

// Resource: Agent catalog
server.registerResource(
  "agents-catalog",
  "aiwg://agents/catalog",
  {
    title: "AIWG Agent Catalog",
    description: "List of all available AIWG agents",
    mimeType: "application/json"
  },
  async (uri) => {
    const catalog = await loadAgentCatalog();
    return {
      contents: [{ uri: uri.href, text: JSON.stringify(catalog, null, 2) }]
    };
  }
);

// Prompt: Task decomposition
server.registerPrompt(
  "decompose_task",
  {
    title: "Task Decomposition",
    description: "Break down complex task into manageable subtasks",
    argsSchema: {
      task: z.string().describe("Complex task to decompose"),
      max_subtasks: z.number().default(7).describe("Maximum subtasks (cognitive limit)")
    }
  },
  ({ task, max_subtasks }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Decompose this task into ${max_subtasks} or fewer subtasks:\n\n${task}\n\nEach subtask should be:\n- Actionable (clear deliverable)\n- Independent (minimal dependencies)\n- Testable (verifiable completion)\n- Appropriately sized (2-8 hours)`
      }
    }]
  })
);

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

## MCP Best Practices Applied to AIWG

### 1. Single Responsibility

**Principle**: Each MCP server should have one clear, well-defined purpose.

**AIWG Application**: `aiwg-workflow-server` focuses solely on AIWG workflow execution. Don't combine with unrelated functionality.

### 2. Configuration Externalization

```typescript
const config = {
  aiwgRoot: process.env.AIWG_ROOT || "~/.local/share/ai-writing-guide",
  projectDir: process.env.PROJECT_DIR || process.cwd(),
  logLevel: process.env.LOG_LEVEL || "info"
};
```

### 3. Tool Design (0-3 Tools per Server)

**AIWG Implementation**: 6 tools across 2 servers
- **Core server** (3 tools): `workflow_run`, `artifact_read`, `artifact_write`
- **Extended server** (3 tools): `template_render`, `agent_list`, `workflow_status`

### 4. Security

- **Validate all inputs** with Zod schemas
- **Use RFC 8707** resource indicators for OAuth
- **Short-lived tokens**
- **Explicit user consent** for tool execution
- **Never log sensitive data**

### 5. Error Handling

```typescript
server.registerTool("workflow_run", { ... }, async (args) => {
  try {
    const result = await executeWorkflow(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error executing workflow: ${error.message}\n\nSuggestion: Check project directory and framework availability.`
      }],
      isError: true
    };
  }
});
```

### 6. Debugging

Use MCP Inspector for testing:

```bash
npx @modelcontextprotocol/inspector node ./dist/mcp-server.js
```

## Integration with Existing AIWG Architecture

### Current AIWG Tool System

**Location**: Agent frontmatter declarations

```yaml
tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
```

**Mechanism**: Direct invocation through Claude Code's native tool system

### MCP Integration Strategy

**Complementary, Not Replacement**:

1. **Keep direct tools** for Claude Code native execution
2. **Add MCP server** for external client access
3. **Shared business logic** between both interfaces

**Architecture**:
```
┌─────────────────────────────────────────┐
│         AIWG Core Logic                 │
│  (workflow execution, agent loading)    │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼─────┐   ┌──────▼──────┐
│ Direct     │   │ MCP Server  │
│ Tools      │   │ Interface   │
│ (Claude)   │   │ (External)  │
└────────────┘   └─────────────┘
```

### Implementation Location

```
src/
├── core/
│   ├── workflow-executor.ts     # Shared logic
│   ├── agent-loader.ts          # Shared logic
│   └── template-renderer.ts     # Shared logic
└── mcp-server/
    ├── index.ts                 # MCP server entry
    ├── tools.ts                 # Tool registrations
    ├── resources.ts             # Resource registrations
    └── prompts.ts               # Prompt registrations
```

## Key Features for AIWG

### 1. Tasks (Experimental - Async Operations)

**Use Case**: Long-running AIWG workflows (full SDLC phase transitions)

**Implementation**:
```typescript
// Client makes request, receives task handle
const result = await client.callTool("workflow_run", {
  prompt: "complete elaboration phase",
  framework: "sdlc-complete"
});

if (result.task) {
  // Poll for completion
  const status = await client.getTaskStatus(result.task.id);
  // states: working, input_required, completed, failed, cancelled
}
```

**Benefits**:
- Fault-tolerant execution (survives network interruptions)
- Non-blocking operations
- Real-time status updates
- Multi-step workflow coordination

### 2. Server Identity & Discovery

**`.well-known/mcp.json`**:
```json
{
  "name": "AIWG Workflow Server",
  "version": "1.0.0",
  "description": "AI Writing Guide SDLC framework execution",
  "capabilities": ["tools", "resources", "prompts"],
  "transport": ["stdio", "streamable-http"],
  "extensions": ["tasks"]
}
```

**Benefits**:
- Discover capabilities without connecting
- Registry auto-cataloging
- Service auto-detection

### 3. OAuth 2.1 Authorization

**Required for multi-user deployments**:

```typescript
const tokenRequest = {
  grant_type: "authorization_code",
  code: authCode,
  resource: "https://aiwg-server.example.com"  // RFC 8707
};
```

**Security**:
- Tokens bound to specific AIWG server instance
- Prevents "confused deputy" attacks
- Short-lived tokens recommended

## Transport Protocols for AIWG

### stdio (Recommended for Local)

**Use Case**: Claude Desktop integration, local development

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Benefits**:
- Simplest setup
- Most performant for single-client
- No network configuration needed

### Streamable HTTP (Recommended for Remote)

**Use Case**: Team collaboration, CI/CD integration

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});
await server.connect(transport);
```

**Benefits**:
- Stateless-friendly
- Infrastructure-compatible (proxies, load balancers)
- Optional SSE for streaming responses

## Comparison with REF-001 (Production-Grade Workflows)

| REF-001 Best Practice | MCP Alignment |
|----------------------|---------------|
| **BP-1: Tool Calls Over MCP** | AIWG already uses direct tools; MCP optional for external access |
| **BP-7: Workflow/MCP Separation** | MCP server is thin adapter over core workflow logic |
| **BP-5: Externalized Prompts** | MCP prompts primitive directly supports this |
| **BP-9: KISS** | MCP encourages simple, focused servers |

**Key Insight**: REF-001 warns against MCP complexity for reliability. AIWG should:
- Keep direct tools as primary interface
- Use MCP only for external client integration
- Maintain thin, stateless MCP server layer

## Implementation Checklist

### Phase 1: Core MCP Server

- [ ] **Server Setup** - Basic McpServer with name/version
- [ ] **Tool: workflow_run** - Execute AIWG workflows
- [ ] **Tool: artifact_read** - Read from `.aiwg/`
- [ ] **Tool: artifact_write** - Write to `.aiwg/`
- [ ] **Resource: agents** - Agent catalog listing
- [ ] **Resource: templates** - Template catalog
- [ ] **Transport: stdio** - Local execution
- [ ] **Error Handling** - Graceful failures with suggestions
- [ ] **Testing** - MCP Inspector validation

### Phase 2: Full Capability

- [ ] **Tool: template_render** - Render templates with variables
- [ ] **Tool: agent_list** - Filtered agent listings
- [ ] **Tool: workflow_status** - Status checking
- [ ] **Resource: prompts** - URI-addressable prompts
- [ ] **Resource: voices** - Voice profile access
- [ ] **Resource: artifacts** - Dynamic artifact access
- [ ] **Prompt: decompose_task** - Task breakdown
- [ ] **Prompt: parallel_execution** - Parallelization analysis
- [ ] **Prompt: recovery_protocol** - Error recovery
- [ ] **Transport: Streamable HTTP** - Remote access
- [ ] **Documentation** - API reference

### Phase 3: Production

- [ ] **Tasks Support** - Async long-running workflows
- [ ] **OAuth 2.1** - RFC 8707 resource indicators
- [ ] **Server Discovery** - `.well-known/mcp.json`
- [ ] **Registry Listing** - Submit to MCP registry
- [ ] **Health Checks** - Monitoring endpoints
- [ ] **Metrics** - Usage tracking
- [ ] **Rate Limiting** - Prevent abuse
- [ ] **Deployment Guide** - Docker, Kubernetes

## Improvement Opportunities

### High Priority

1. **Implement Core MCP Server** (Phase 1)
   - Location: `src/mcp-server/index.ts`
   - Exposes AIWG to MCP-compatible clients
   - Enables Claude Desktop integration

2. **Define URI Scheme**
   - `aiwg://` protocol for resources
   - Standardized path structure
   - Documentation of all addressable resources

3. **Add to Claude Desktop**
   - Configuration file for local MCP server
   - Testing with Claude Desktop client
   - User documentation

### Medium Priority

4. **Full Resource Exposure** (Phase 2)
   - All templates, agents, voices URI-addressable
   - Dynamic artifact discovery
   - Prompt library

5. **Streamable HTTP Transport**
   - Remote access capability
   - Team collaboration support
   - CI/CD integration

### Future Enhancements

6. **Tasks for Long Workflows** (Phase 3)
   - Async execution with status polling
   - Resume from checkpoints
   - Fault tolerance

7. **OAuth for Multi-User**
   - Secure token-based access
   - User-specific workflows
   - Audit logging

## Related AIWG Components

| Component | Relevance |
|-----------|-----------|
| `@src/extensions/types.ts` | Extension type definitions (MCP server as extension type) |
| `@src/mcp/` | MCP implementation location (to be created) |
| `@agentic/code/frameworks/sdlc-complete/` | Core workflow logic exposed via MCP |
| `@.aiwg/architecture/platform-adapter-spec.md` | Platform integration patterns |

## Key Quotes from Specification

> "MCP has become the de-facto standard for providing context to models in less than twelve months."

> "Tasks provide a new abstraction in MCP for tracking the work being performed by an MCP server."

> "The 2025-11-25 spec doesn't just add features; it adds infrastructure: async execution, scalable OAuth identity, extension lanes for experimentation."

## References

- **Source Specification**: [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- **TypeScript SDK**: [NPM Package](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- **Best Practices**: [Official Guide](https://modelcontextprotocol.info/docs/best-practices/)
- **Related Papers**: REF-001 (Production patterns warn against MCP complexity)
- **AIWG Architecture**: Platform Adapter Spec
