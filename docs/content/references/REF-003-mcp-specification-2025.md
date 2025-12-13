# REF-003: Model Context Protocol (MCP) Specification 2025

## Citation

Model Context Protocol. (2025). MCP Specification 2025-11-25. Agentic AI Foundation (Linux Foundation).

**Links**:

- [Official Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [Key Changes / Changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [NPM Package](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Best Practices Guide](https://modelcontextprotocol.info/docs/best-practices/)

## Summary

The Model Context Protocol (MCP) is an open standard for AI systems to integrate with external tools, data sources, and services. Originally introduced by Anthropic in November 2024, MCP was donated to the Agentic AI Foundation (Linux Foundation) in December 2025, with support from Anthropic, Block, OpenAI, Google, Microsoft, AWS, Cloudflare, and Bloomberg.

**Current Version**: 2025-11-25 (released November 25, 2025)

**Ecosystem Scale**: 10,000+ active public MCP servers

## Core Concepts

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   MCP Server    │────▶│ External System │
│ (Claude, etc.)  │◀────│   (Your App)    │◀────│  (DB, API, FS)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │    JSON-RPC 2.0      │
         │    (stdio/HTTP)      │
         └──────────────────────┘
```

### Three Primitives

| Primitive | Purpose | Analogy |
|-----------|---------|---------|
| **Tools** | Actions with side effects | REST POST/PUT/DELETE |
| **Resources** | Read-only data exposure | REST GET |
| **Prompts** | Reusable interaction templates | Pre-configured queries |

## Specification 2025-11-25 Key Features

### 1. Tasks (Experimental - Async Operations)

Tasks enable "call-now, fetch-later" patterns for long-running operations.

```typescript
// Client makes request, receives task handle immediately
const result = await client.callTool("long_operation", { input: "..." });
// If server supports tasks, result may include task info
if (result.task) {
  // Poll for completion
  const status = await client.getTaskStatus(result.task.id);
  // states: working, input_required, completed, failed, cancelled
}
```

**Benefits**:

- Fault-tolerant execution (survives network interruptions)
- Non-blocking operations
- Multi-step workflow coordination
- Real-time status updates without blocking

### 2. Stateless Architecture Direction

SEP-1442 introduces stateless MCP as default:

- Removes mandatory initialization handshake
- Each request is self-contained
- Enables horizontal scaling across server instances
- Streamable HTTP provides stateless support

### 3. Extensions Framework

Formalizes optional extensions:

- Lightweight registry/namespace for extensions
- Explicit capability negotiation
- Extension settings for client/server coordination
- Popular extensions can graduate to core spec

### 4. Server Identity & Discovery

`.well-known/mcp.json` for server metadata:

```json
{
  "name": "My MCP Server",
  "version": "1.0.0",
  "description": "Description of capabilities",
  "capabilities": ["tools", "resources", "prompts"],
  "transport": ["stdio", "streamable-http"]
}
```

**Benefits**:

- Discover capabilities without connecting
- Registry auto-cataloging
- Service auto-detection

### 5. OAuth 2.1 Authorization

**Required**: RFC 8707 Resource Indicators

```typescript
// Token request MUST include resource indicator
const tokenRequest = {
  grant_type: "authorization_code",
  code: authCode,
  resource: "https://mcp-server.example.com"  // RFC 8707
};
```

**Security Requirements**:

- Tokens bound to specific MCP server
- Prevents "confused deputy" attacks
- Short-lived tokens recommended
- Servers MUST validate audience

## Transport Protocols

### stdio (Recommended for Local)

```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const transport = new StdioServerTransport();
await server.connect(transport);
```

- Client launches server as subprocess
- JSON-RPC over stdin/stdout
- Newline-delimited messages
- Simplest, most performant for single-client

### Streamable HTTP (Recommended for Remote)

```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID()
});
await server.connect(transport);
```

- Replaced HTTP+SSE in spec version 2025-03-26
- Stateless-friendly
- Infrastructure-compatible (proxies, load balancers)
- Optional SSE for streaming responses
- Session management via `Mcp-Session-Id` header

### Backward Compatibility (SSE)

For older servers:

1. POST InitializeRequest to server URL
2. If fails with 4xx, fall back to GET for SSE stream

## TypeScript SDK Implementation

### Package Installation

```bash
npm install @modelcontextprotocol/sdk zod
```

**Note**: Zod is a peer dependency for schema validation.

### Server Setup

```typescript
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "aiwg-server",
  version: "1.0.0"
});
```

### Registering Tools (Recommended API)

```typescript
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
  // Implementation
  return {
    content: [{ type: "text", text: JSON.stringify(result) }]
  };
});
```

### Registering Resources

```typescript
// Static resource
server.registerResource(
  "agents-catalog",
  "aiwg://agents/catalog",
  {
    title: "AIWG Agent Catalog",
    description: "List of all available AIWG agents",
    mimeType: "application/json"
  },
  async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(agentCatalog) }]
  })
);

// Dynamic resource with URI template
server.registerResource(
  "template",
  new ResourceTemplate("aiwg://templates/{category}/{name}", { list: listTemplates }),
  {
    title: "AIWG Template",
    description: "Retrieve specific AIWG template"
  },
  async (uri, { category, name }) => ({
    contents: [{ uri: uri.href, text: await loadTemplate(category, name) }]
  })
);
```

### Registering Prompts

```typescript
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
        text: `Decompose this task into ${max_subtasks} or fewer subtasks:\n\n${task}`
      }
    }]
  })
);
```

### Starting Server

```typescript
// stdio transport (local)
const transport = new StdioServerTransport();
await server.connect(transport);

// Or HTTP transport (remote)
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });
app.use("/mcp", transport.requestHandler());
await server.connect(transport);
app.listen(3000);
```

## Best Practices

### 1. Single Responsibility

Each MCP server should have one clear, well-defined purpose.

```
GOOD: aiwg-workflow-server (handles AIWG workflows)
BAD:  all-in-one-server (handles everything)
```

### 2. Configuration Externalization

```typescript
const config = {
  aiwgRoot: process.env.AIWG_ROOT || "~/.local/share/ai-writing-guide",
  projectDir: process.env.PROJECT_DIR || process.cwd(),
  logLevel: process.env.LOG_LEVEL || "info"
};
```

### 3. Tool Design

- 0-3 tools per focused server
- Clear, descriptive names
- Comprehensive input schemas with descriptions
- Explicit error handling

### 4. Security

- Validate all inputs with Zod schemas
- Use RFC 8707 resource indicators for OAuth
- Short-lived tokens
- Explicit user consent for tool execution
- Never log sensitive data

### 5. Error Handling

```typescript
server.registerTool("risky_operation", { ... }, async (args) => {
  try {
    const result = await performOperation(args);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});
```

### 6. Debugging

Use MCP Inspector for testing:

```bash
npx @modelcontextprotocol/inspector node ./dist/server.js
```

## AIWG Alignment

### Recommended AIWG MCP Server Design

| Tool | Purpose | Input |
|------|---------|-------|
| `workflow_run` | Execute AIWG workflow | prompt, guidance, framework |
| `workflow_status` | Check workflow status | workflow_id |
| `artifact_read` | Read AIWG artifact | path |
| `artifact_write` | Write AIWG artifact | path, content |
| `template_render` | Render template | template_id, variables |
| `agent_list` | List available agents | framework, filter |

| Resource | URI Pattern | Purpose |
|----------|-------------|---------|
| Prompts | `aiwg://prompts/{category}/{name}` | AIWG prompt templates |
| Templates | `aiwg://templates/{category}/{name}` | SDLC templates |
| Agents | `aiwg://agents/{framework}/{name}` | Agent definitions |
| Voices | `aiwg://voices/{name}` | Voice profiles |

| Prompt | Purpose |
|--------|---------|
| `decompose_task` | Break task into subtasks (≤7) |
| `parallel_execution` | Identify parallelizable work |
| `recovery_protocol` | PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE |

### Implementation Phases

**Phase 1: Core MCP Server**

- Tools: workflow_run, artifact_read, artifact_write
- Resources: agents, templates
- Transport: stdio

**Phase 2: Full Capability**

- All tools
- All resources with URI templates
- Prompts
- Transport: stdio + Streamable HTTP

**Phase 3: Production**

- Tasks (async operations)
- OAuth 2.1 with RFC 8707
- Server discovery via .well-known
- Registry listing

## Cross-References

- **REF-001**: Production-Grade Agentic Workflows (complementary patterns)
- **REF-002**: LLM Failure Modes (recovery patterns for MCP tools)
- **Platform Adapter Spec**: `.aiwg/architecture/platform-adapter-spec.md`

## Key Quotes

> "MCP has become the de-facto standard for providing context to models in less than twelve months."

> "Tasks provide a new abstraction in MCP for tracking the work being performed by an MCP server."

> "The 2025-11-25 spec doesn't just add features; it adds infrastructure: async execution, scalable OAuth identity, extension lanes for experimentation."

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial reference from MCP spec 2025-11-25 |
