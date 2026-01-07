# Invoke Droid

Invoke Factory Droid to execute a task from within Claude Code.

## Usage

```
/invoke-droid <task-description> [--background] [--timeout <seconds>]
```

## Parameters

- `<task-description>`: The task for Droid to execute (required)
- `--background`: Run in background, return immediately (optional)
- `--timeout <seconds>`: Maximum execution time, default 120 (optional)

## Examples

```bash
# Simple invocation
/invoke-droid "fix all linting errors in src/"

# Background execution for long tasks
/invoke-droid "add JSDoc comments to all functions" --background

# With custom timeout
/invoke-droid "refactor database queries" --timeout 300
```

## Behavior

When invoked, you (Claude Code) should:

1. **Validate Droid is available**:
   ```bash
   command -v droid && echo "Droid available" || echo "Droid not found"
   ```

2. **Create log directory if needed**:
   ```bash
   mkdir -p .aiwg/logs/droid
   ```

3. **Execute based on mode**:

   **Standard mode**:
   ```bash
   droid exec "<task-description>" 2>&1 | tee .aiwg/logs/droid/$(date +%Y%m%d-%H%M%S).log
   ```

   **Background mode**:
   ```bash
   nohup droid exec "<task-description>" > .aiwg/logs/droid/background-$(date +%Y%m%d-%H%M%S).log 2>&1 &
   echo $! > .aiwg/logs/droid/current.pid
   echo "Droid running in background. PID: $(cat .aiwg/logs/droid/current.pid)"
   echo "Monitor with: /monitor-droid"
   ```

4. **Report results**:
   - Show Droid's output
   - List any files that were modified
   - Report success/failure status

## File Coordination

For complex tasks, create a request file before invoking:

```bash
cat > .aiwg/droid/request.json << EOF
{
  "task": "<task-description>",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "requester": "claude-code",
  "session_context": "brief context from current conversation"
}
EOF
```

Include in the Droid prompt: "After completing, write a summary to .aiwg/droid/response.json"

## Error Handling

- If Droid is not installed: Report error and suggest installation
- If Droid times out: Kill process, report partial results
- If Droid fails: Capture error output, suggest fixes

## Output Format

```
========================================
DROID INVOCATION
========================================
Task: <task-description>
Mode: standard|background
Started: <timestamp>
----------------------------------------

<droid output here>

----------------------------------------
Status: SUCCESS|FAILED|RUNNING (background)
Duration: <time>
Log: .aiwg/logs/droid/<filename>.log
Files modified: <list or "none detected">
========================================
```

## Notes

- Droid operates without Claude Code's conversation context
- Always review Droid's changes before committing
- Use `/monitor-droid` to check background tasks
- Logs are preserved in `.aiwg/logs/droid/` for audit trail
