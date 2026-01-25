# REF-066 AIWG Analysis: Model Context Protocol (MCP)

**Source**: @docs/references/REF-066-mcp-specification-2025.md

**Paper**: Model Context Protocol (2025). MCP Specification 2025-11-25. Agentic AI Foundation (Linux Foundation).

**AIWG Relevance**: HIGH - Industry standard for AI-tool integration; 10,000+ active servers; directly applicable to AIWG MCP server implementation.

---

## AIWG Concept Mapping

### MCP → AIWG Implementation

| MCP Concept | AIWG Implementation | Coverage |
|-------------|---------------------|----------|
| **Tools** (Actions) | Agent tool declarations | **Strong** |
| **Resources** (Read-only) | Artifact exposure | **Moderate** |
| **Prompts** (Templates) | Prompt templates | **Strong** |
| **Tasks** (Async) | Ralph loops | **Partial** |
| **Server Discovery** | Catalog commands | **Partial** |
| **OAuth 2.1** | Token security rules | **Strong** |
| stdio transport | CLI integration | **Strong** |
| Streamable HTTP | Remote access | **Planned** |

### AIWG MCP Server Alignment

| MCP Spec Feature | AIWG MCP Server Status |
|------------------|------------------------|
| Tools registration | ✓ Implemented |
| Resources registration | ✓ Implemented |
| Prompts registration | ✓ Implemented |
| Tasks (async) | ○ Planned |
| Stateless mode | ○ Planned |
| OAuth 2.1 | ○ Planned |
| Server discovery | ○ Planned |

---

## MCP Three Primitives

### Tools (Actions with Side Effects)

**MCP Definition**: Actions that can modify state, equivalent to REST POST/PUT/DELETE.

**AIWG Implementation**:

```typescript
// Current AIWG MCP tool registration
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
}, async (args) => {
  // Execute workflow
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

**Recommended AIWG Tools**:

| Tool | Purpose | Input |
|------|---------|-------|
| `workflow_run` | Execute AIWG workflow | prompt, guidance, framework |
| `workflow_status` | Check workflow status | workflow_id |
| `artifact_read` | Read AIWG artifact | path |
| `artifact_write` | Write AIWG artifact | path, content |
| `template_render` | Render template | template_id, variables |
| `research_acquire` | Acquire research source | url, ref_id |

### Resources (Read-Only Data)

**MCP Definition**: Data exposure without side effects, equivalent to REST GET.

**AIWG Implementation**:

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

**Recommended AIWG Resources**:

| Resource | URI Pattern | Purpose |
|----------|-------------|---------|
| Agent Catalog | `aiwg://agents/{framework}` | List available agents |
| Templates | `aiwg://templates/{category}/{name}` | SDLC templates |
| Voices | `aiwg://voices/{name}` | Voice profiles |
| Prompts | `aiwg://prompts/{category}/{name}` | Prompt templates |
| Research | `aiwg://research/{ref_id}` | Research documents |

### Prompts (Interaction Templates)

**MCP Definition**: Reusable interaction templates with arguments.

**AIWG Implementation**:

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

**Recommended AIWG Prompts**:

| Prompt | Purpose | Key Args |
|--------|---------|----------|
| `decompose_task` | Break task into subtasks | task, max_subtasks |
| `parallel_execution` | Identify parallelizable work | tasks |
| `recovery_protocol` | PAUSE→DIAGNOSE→ADAPT→RETRY | error, context |
| `phase_transition` | Evaluate phase gate readiness | from_phase, to_phase |
| `research_summary` | Summarize research paper | ref_id, focus_area |

---

## MCP Tasks (Async Operations)

### Experimental Feature for Long-Running Operations

**MCP Definition**: Tasks enable "call-now, fetch-later" patterns.

```typescript
// Client makes request, receives task handle immediately
const result = await client.callTool("long_operation", { input: "..." });
if (result.task) {
  // States: working, input_required, completed, failed, cancelled
  const status = await client.getTaskStatus(result.task.id);
}
```

### AIWG Application: Ralph Loops as MCP Tasks

```typescript
// Ralph loop as MCP task
server.registerTool("ralph_loop", {
  title: "Execute Ralph Loop",
  description: "Iterative task execution until completion",
  inputSchema: {
    task: z.string(),
    completion_criteria: z.string(),
    max_iterations: z.number().default(10)
  },
  async: true  // Enables task pattern
}, async (args) => {
  const taskId = createTask();

  // Start Ralph loop in background
  executeRalphLoop(args, taskId);

  return {
    task: {
      id: taskId,
      status: "working",
      progress: 0
    }
  };
});

// Status endpoint
server.registerTool("ralph_status", {
  title: "Check Ralph Loop Status",
  inputSchema: { task_id: z.string() }
}, async ({ task_id }) => {
  const status = getTaskStatus(task_id);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(status)
    }]
  };
});
```

**Benefits for AIWG**:
- Non-blocking Ralph loop execution
- Progress tracking via MCP
- Fault-tolerant (survives disconnection)
- Integration with external orchestrators

---

## MCP Best Practices Applied to AIWG

### 1. Single Responsibility Servers

**MCP Guidance**: Each server has one clear purpose.

**AIWG Implementation**:

```
GOOD: aiwg-workflow-server (handles AIWG workflows)
      aiwg-research-server (handles research operations)
      aiwg-artifacts-server (handles artifact CRUD)

BAD:  all-in-one-aiwg-server (handles everything)
```

### 2. Tool Design (0-3 Tools per Server)

**MCP Guidance**: Few, focused tools with comprehensive schemas.

**AIWG Application**:

```typescript
// aiwg-workflow-server: 3 focused tools
server.registerTool("workflow_run", { ... });
server.registerTool("workflow_status", { ... });
server.registerTool("workflow_cancel", { ... });

// aiwg-research-server: 3 focused tools
server.registerTool("research_acquire", { ... });
server.registerTool("research_document", { ... });
server.registerTool("research_search", { ... });
```

### 3. Security (OAuth 2.1 + RFC 8707)

**MCP Guidance**: Resource indicators required for tokens.

**AIWG Implementation**:

```typescript
// Token request MUST include resource indicator
const tokenRequest = {
  grant_type: "authorization_code",
  code: authCode,
  resource: "https://aiwg-server.example.com"  // RFC 8707
};

// Server validates audience
server.validateToken(token, {
  expectedAudience: "https://aiwg-server.example.com"
});
```

**Integration with AIWG Token Security Rules**:
- Aligns with `.claude/rules/token-security.md`
- Short-lived tokens
- Never log token values
- Heredoc pattern for token loading

### 4. Error Handling

**MCP Guidance**: Return structured errors with `isError: true`.

**AIWG Implementation**:

```typescript
server.registerTool("risky_operation", { ... }, async (args) => {
  try {
    const result = await performOperation(args);
    return { content: [{ type: "text", text: result }] };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}\n\nRecovery: ${getSuggestion(error)}`
      }],
      isError: true
    };
  }
});
```

---

## AIWG MCP Server Implementation Plan

### Phase 1: Core Server (Current)

**Tools**:
- `workflow_run` - Execute workflows
- `artifact_read` - Read artifacts
- `artifact_write` - Write artifacts

**Resources**:
- `aiwg://agents/catalog` - Agent list
- `aiwg://templates/{category}/{name}` - Templates

**Transport**: stdio only

### Phase 2: Full Capability

**Additional Tools**:
- `research_acquire` - Research acquisition
- `research_search` - Search research
- `template_render` - Render templates

**Additional Resources**:
- `aiwg://voices/{name}` - Voice profiles
- `aiwg://prompts/{category}/{name}` - Prompts
- `aiwg://research/{ref_id}` - Research docs

**Prompts**:
- `decompose_task`
- `recovery_protocol`
- `phase_transition`

**Transport**: stdio + Streamable HTTP

### Phase 3: Production

**Features**:
- Tasks (async operations for Ralph)
- OAuth 2.1 with RFC 8707
- Server discovery via `.well-known/mcp.json`
- Registry listing

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Add MCP Prompts

```typescript
// Add to existing AIWG MCP server
server.registerPrompt("decompose_task", {
  title: "Task Decomposition",
  description: "Break complex task into 7±2 subtasks",
  argsSchema: {
    task: z.string(),
    max_subtasks: z.number().default(7)
  }
}, ({ task, max_subtasks }) => ({
  messages: [{
    role: "user",
    content: {
      type: "text",
      text: `Apply cognitive load optimization: break this task into ${max_subtasks} or fewer subtasks.\n\nTask: ${task}`
    }
  }]
}));
```

#### 2. Add Research Resources

```typescript
server.registerResource(
  "research-doc",
  new ResourceTemplate("aiwg://research/{ref_id}"),
  { title: "Research Document" },
  async (uri, { ref_id }) => {
    const doc = await loadResearchDoc(ref_id);
    return { contents: [{ uri: uri.href, text: doc }] };
  }
);
```

#### 3. Implement Error Handling Pattern

Standardize error responses:

```typescript
function createErrorResponse(error, suggestions = []) {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        error: error.message,
        code: error.code || "UNKNOWN",
        suggestions: suggestions,
        documentation: "https://aiwg.io/docs/errors/" + error.code
      })
    }],
    isError: true
  };
}
```

### Short-Term (Enhancement)

#### 4. Add Server Discovery

Create `.well-known/mcp.json`:

```json
{
  "name": "AIWG MCP Server",
  "version": "2026.1.6",
  "description": "AI Writing Guide workflow orchestration",
  "capabilities": ["tools", "resources", "prompts"],
  "transport": ["stdio", "streamable-http"],
  "documentation": "https://aiwg.io/docs/mcp",
  "tools": [
    { "name": "workflow_run", "description": "Execute AIWG workflow" },
    { "name": "artifact_read", "description": "Read AIWG artifact" }
  ],
  "resources": [
    { "pattern": "aiwg://agents/*", "description": "Agent catalog" },
    { "pattern": "aiwg://templates/*/*", "description": "Templates" }
  ]
}
```

#### 5. Implement Tasks for Ralph

```typescript
// Ralph as async MCP task
server.registerTool("ralph_start", {
  title: "Start Ralph Loop",
  async: true,
  inputSchema: {
    task: z.string(),
    completion_criteria: z.string()
  }
}, async (args) => {
  const taskId = `ralph-${Date.now()}`;
  startRalphInBackground(taskId, args);
  return {
    task: { id: taskId, status: "working" }
  };
});
```

### Medium-Term (Production)

#### 6. OAuth 2.1 Integration

For remote deployments:

```typescript
// OAuth middleware
const authMiddleware = createOAuthMiddleware({
  issuer: "https://auth.aiwg.io",
  audience: "https://mcp.aiwg.io",
  scopes: ["aiwg:read", "aiwg:write", "aiwg:execute"]
});

// Apply to Streamable HTTP transport
app.use("/mcp", authMiddleware, transport.requestHandler());
```

---

## Cross-References to AIWG Components

| Component | Location | MCP Relevance |
|-----------|----------|---------------|
| MCP Server | `src/mcp/` | Implementation |
| CLI | `src/cli/` | stdio integration |
| Agent Catalog | `agentic/code/frameworks/*/agents/` | Resource exposure |
| Templates | `agentic/code/frameworks/*/templates/` | Resource exposure |
| Ralph | `tools/ralph-external/` | Task integration |
| Token Security | `.claude/rules/token-security.md` | OAuth alignment |

---

## Key Quotes for Documentation

### On Adoption:
> "MCP has become the de-facto standard for providing context to models in less than twelve months."

### On Tasks:
> "Tasks provide a new abstraction in MCP for tracking the work being performed by an MCP server."

### On the Spec:
> "The 2025-11-25 spec doesn't just add features; it adds infrastructure: async execution, scalable OAuth identity, extension lanes for experimentation."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (MCP) | Use In |
|-------------------|-------------------------|--------|
| Tool definitions | MCP Tools (Action Primitives) | API docs |
| Resource endpoints | MCP Resources | API docs |
| Prompt templates | MCP Prompts | Template docs |
| Long-running operations | MCP Tasks | Ralph docs |
| Server info | Server Discovery (.well-known) | Deployment docs |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-066
**AIWG Priority**: HIGH
**Implementation Status**: Partial - core implemented, advanced features planned
**Key Contribution**: Industry standard for AI-tool integration
**Ecosystem Scale**: 10,000+ active MCP servers
**Standards Alignment**: Linux Foundation (Agentic AI Foundation)
