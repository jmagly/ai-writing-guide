# Droid Bridge Addon - Claude Code Priming

> Add this section to your project's CLAUDE.md to enable Droid orchestration.

---

## Factory Droid Integration

This project has **Factory Droid** available as a secondary AI agent for automated code operations.

### Understanding the Relationship

**Critical Context**: Claude Code and Factory Droid are **independent AI agents** that share:
- The same filesystem
- The same git repository
- The same terminal environment (but not simultaneously)

They do **NOT** share:
- Conversation context or memory
- Real-time coordination
- Direct communication channels

### When to Use Droid vs Claude Code Agents

| Task Type | Use | Reason |
|-----------|-----|--------|
| Quick batch fixes (linting, formatting) | **Droid** | Fast, non-interactive |
| Code review with context | **Claude Code agents** | Has conversation history |
| Auto-fix on commit | **Droid** (automatic) | Pre-commit hook |
| Complex multi-file refactoring | **Claude Code** | Better context management |
| CI/CD fixes | **Droid** (automatic) | Pipeline integration |
| Architecture planning | **Claude Code agents** | Requires dialogue |

### Invoking Droid from Claude Code

Use the `/invoke-droid` command or `droid-launcher` skill:

```bash
# Via command
/invoke-droid "fix all TypeScript errors"

# Via skill (with monitoring)
/droid-launcher "refactor utils.js to use ES6 modules"
```

### Droid Invocation Patterns

**Simple execution** (fire-and-forget):
```bash
droid exec "task description"
```

**With output capture** (for processing results):
```bash
droid exec "task description" 2>&1 | tee .aiwg/logs/droid/last-run.log
```

**Background execution** (for long tasks):
```bash
nohup droid exec "task" > .aiwg/logs/droid/background.log 2>&1 &
echo $! > .aiwg/logs/droid/pid
```

### Monitoring Droid Operations

Use `/monitor-droid` to check on background operations:
- View running Droid processes
- Read output logs
- Check exit status of last run

### File-Based Coordination Protocol

Since Claude Code and Droid cannot communicate directly, use files for coordination:

**Request file** (Claude Code writes):
```
.aiwg/droid/request.json
{
  "task": "description",
  "timestamp": "ISO-8601",
  "requester": "claude-code",
  "context_files": ["file1.js", "file2.js"]
}
```

**Response file** (Droid writes via prompt):
```
.aiwg/droid/response.json
{
  "status": "complete|error",
  "timestamp": "ISO-8601",
  "files_modified": ["file1.js"],
  "summary": "What was done"
}
```

### Best Practices

1. **Don't duplicate work**: If Claude Code can do it with agents, don't also invoke Droid
2. **Use Droid for speed**: Quick fixes, formatting, simple refactors
3. **Use Claude Code for depth**: Reviews, planning, complex changes
4. **Check results**: Always verify Droid's output - it operates without conversation context
5. **Log everything**: Use `.aiwg/logs/droid/` for audit trail

### Limitations

- Droid cannot see your conversation with Claude Code
- Droid may make different decisions than Claude Code would
- No real-time feedback during Droid execution
- Interactive Droid mode requires separate terminal

---
