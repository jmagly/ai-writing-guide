# Monitor Droid

Monitor Factory Droid operations, check status, and view logs.

## Usage

```
/monitor-droid [--status] [--logs] [--tail <lines>] [--kill]
```

## Parameters

- `--status`: Show current Droid process status (default if no flags)
- `--logs`: List available log files
- `--tail <lines>`: Show last N lines of most recent log (default: 50)
- `--kill`: Terminate running background Droid process

## Examples

```bash
# Check if Droid is running
/monitor-droid --status

# View recent output
/monitor-droid --tail 100

# List all logs
/monitor-droid --logs

# Stop a background task
/monitor-droid --kill
```

## Behavior

When invoked, you (Claude Code) should:

### Status Check (--status or default)

```bash
# Check for running Droid process
if [ -f .aiwg/logs/droid/current.pid ]; then
    PID=$(cat .aiwg/logs/droid/current.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "Droid is RUNNING (PID: $PID)"
        echo "Started: $(stat -f %Sm .aiwg/logs/droid/current.pid 2>/dev/null || stat -c %y .aiwg/logs/droid/current.pid 2>/dev/null)"
    else
        echo "Droid is NOT RUNNING (last PID: $PID - completed or failed)"
    fi
else
    echo "No background Droid process tracked"
fi

# Check for any droid processes
pgrep -f "droid exec" && echo "Found droid processes" || echo "No active droid processes"
```

### View Logs (--logs)

```bash
echo "Available Droid logs:"
ls -la .aiwg/logs/droid/*.log 2>/dev/null | tail -10 || echo "No logs found"
```

### Tail Output (--tail N)

```bash
# Find most recent log
LATEST=$(ls -t .aiwg/logs/droid/*.log 2>/dev/null | head -1)
if [ -n "$LATEST" ]; then
    echo "=== Last $N lines of $LATEST ==="
    tail -n $N "$LATEST"
else
    echo "No log files found"
fi
```

### Kill Process (--kill)

```bash
if [ -f .aiwg/logs/droid/current.pid ]; then
    PID=$(cat .aiwg/logs/droid/current.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        echo "Terminated Droid process (PID: $PID)"
        rm .aiwg/logs/droid/current.pid
    else
        echo "Process $PID not running"
        rm .aiwg/logs/droid/current.pid
    fi
else
    # Try to find and kill any droid exec processes
    pkill -f "droid exec" && echo "Killed droid processes" || echo "No droid processes to kill"
fi
```

## Output Format

### Status Output
```
========================================
DROID MONITOR
========================================
Status: RUNNING | IDLE | COMPLETED | FAILED
PID: <pid or N/A>
Last Activity: <timestamp>
----------------------------------------
Recent Logs:
  - 20250105-143022.log (2.3 KB)
  - 20250105-141500.log (1.1 KB)
  - background-20250105-140000.log (5.2 KB)
----------------------------------------
Response File: EXISTS | NOT FOUND
  .aiwg/droid/response.json
========================================
```

### Log Tail Output
```
========================================
DROID LOG: <filename>
========================================
<log contents>
========================================
EOF - Showing last <N> lines
========================================
```

## Coordination Files

Check for response from Droid:

```bash
if [ -f .aiwg/droid/response.json ]; then
    echo "=== Droid Response ==="
    cat .aiwg/droid/response.json
fi
```

## Notes

- Background tasks write to timestamped log files
- PID tracking only works for tasks started with `--background`
- Old logs are preserved - consider periodic cleanup
- Response files indicate Droid was instructed to report back
