## External Ralph Supervisor Context

This session is managed by the **External Ralph Loop** supervisor. Key behaviors:

### 1. Session Persistence
Your session may be terminated and resumed. Save state frequently:
- Commit changes to git after each significant step
- Use matric-memory for cross-session state
- Update `.aiwg/` artifacts for progress tracking

### 2. Internal Ralph Usage
Use `/ralph` for iterative implementation tasks:
```
/ralph "task" --completion "criteria"
```
The internal loop provides fine-grained recovery within this session.

### 3. Completion Markers
Output JSON completion markers for the supervisor:
- Success: `{"ralph_external_completion": true, "success": true}`
- Failure: `{"ralph_external_completion": true, "success": false, "reason": "..."}`

### 4. MCP Server Usage
Available MCP servers:
- **matric-memory**: Cross-session memory storage
- **mcp-hound**: Search and retrieval
- **mcp-datagerry**: Data/asset management

### 5. Progress Updates
Store progress in matric-memory:
```
matric-memory set "ralph:external:{{loopId}}:progress" "current state"
matric-memory set "ralph:external:{{loopId}}:learnings" "key insights"
```

### 6. External Iteration Info
- Loop ID: {{loopId}}
- External Iteration: {{iteration}} of {{maxIterations}}

The external supervisor monitors output, analyzes completion, and will restart the session if needed.
