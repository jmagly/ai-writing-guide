# Droid Launcher Skill

Launch and coordinate Factory Droid operations with full lifecycle management.

## Skill Metadata

- **Name**: droid-launcher
- **Version**: 1.0.0
- **Trigger**: `/droid-launcher <task>` or natural language "launch droid to..."
- **Dependencies**: Python 3.6+, Factory Droid CLI

## Description

This skill provides a robust way to launch Factory Droid from Claude Code with:
- Pre-flight checks (Droid availability, permissions)
- Context file generation (passes relevant info to Droid)
- Execution monitoring
- Result capture and reporting
- File change detection

## Usage

```bash
# Basic usage
/droid-launcher "fix all linting errors"

# With options
/droid-launcher "refactor utils.js" --wait --detect-changes

# Background mode
/droid-launcher "add tests for api/" --background
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `<task>` | Task description for Droid | Required |
| `--wait` | Wait for completion and show results | true |
| `--background` | Run in background, don't wait | false |
| `--detect-changes` | Report files modified by Droid | true |
| `--timeout` | Max seconds to wait | 120 |
| `--context` | Additional context to pass | none |

## Execution Flow

When this skill is invoked, Claude Code should:

### 1. Run the Python bootstrap script

```bash
python3 .claude/addons/droid-bridge/scripts/droid_bridge.py \
    --task "<task-description>" \
    --mode "wait|background" \
    --timeout <seconds> \
    --context "<optional context>"
```

### 2. Parse the script output

The Python script outputs JSON:
```json
{
  "status": "success|error|running",
  "pid": 12345,
  "log_file": ".aiwg/logs/droid/20250105-143022.log",
  "output": "Droid's output text",
  "files_changed": ["file1.js", "file2.js"],
  "duration_seconds": 15.3,
  "error": null
}
```

### 3. Report results to user

Format the JSON into a readable report showing:
- Task executed
- Status and duration
- Files modified
- Droid's output (truncated if long)
- Next steps or errors

## Context Passing

The skill creates a context file that Droid can reference:

**.aiwg/droid/context.md**
```markdown
# Droid Task Context

## Task
<task description>

## Relevant Files
<files mentioned in conversation or detected as relevant>

## Recent Changes
<git diff summary if available>

## Notes from Claude Code
<any context that might help Droid>
```

The Droid prompt includes: "Reference .aiwg/droid/context.md for additional context."

## File Change Detection

Before and after Droid runs:
```bash
# Before
git status --porcelain > .aiwg/droid/pre-status.txt

# After
git status --porcelain > .aiwg/droid/post-status.txt

# Diff
diff .aiwg/droid/pre-status.txt .aiwg/droid/post-status.txt
```

## Error Handling

| Error | Handling |
|-------|----------|
| Droid not installed | Exit with install instructions |
| Droid timeout | Kill process, return partial output |
| Droid crash | Capture stderr, report error |
| Permission denied | Report and suggest fixes |

## Output Format

```
╔══════════════════════════════════════════════════════════════╗
║                    DROID LAUNCHER                            ║
╠══════════════════════════════════════════════════════════════╣
║ Task: <task description>                                     ║
║ Status: SUCCESS ✓ | FAILED ✗ | RUNNING ⏳                    ║
║ Duration: <X.X seconds>                                      ║
╠══════════════════════════════════════════════════════════════╣
║ FILES MODIFIED:                                              ║
║   • src/utils.js                                             ║
║   • src/helpers.js                                           ║
╠══════════════════════════════════════════════════════════════╣
║ DROID OUTPUT:                                                ║
║ <truncated output from Droid>                                ║
╠══════════════════════════════════════════════════════════════╣
║ Log: .aiwg/logs/droid/20250105-143022.log                   ║
╚══════════════════════════════════════════════════════════════╝
```

## Integration Notes

- This skill uses the Python script for reliable process management
- All output is logged for audit trail
- Context files enable loose coordination without direct communication
- File change detection helps Claude Code understand what Droid modified
