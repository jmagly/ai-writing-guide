# Droid Bridge Addon

Bridge addon for orchestrating Factory Droid from Claude Code.

## Overview

This addon enables Claude Code to invoke and monitor Factory Droid operations with:
- Proper process management via Python bootstrap script
- File-based coordination protocol
- Change detection and logging
- Background execution support

## Components

```
droid-bridge/
├── manifest.json           # Addon metadata
├── CLAUDE-ADDON.md         # Priming content for CLAUDE.md
├── README.md               # This file
├── commands/
│   ├── invoke-droid.md     # /invoke-droid command
│   └── monitor-droid.md    # /monitor-droid command
├── skills/
│   └── droid-launcher/
│       └── SKILL.md        # Droid launcher skill definition
└── scripts/
    └── droid_bridge.py     # Python bootstrap script
```

## Installation

### 1. Copy CLAUDE.md priming content

Append the contents of `CLAUDE-ADDON.md` to your project's `CLAUDE.md`:

```bash
cat .claude/addons/droid-bridge/CLAUDE-ADDON.md >> CLAUDE.md
```

### 2. Symlink commands (optional)

To make commands available at project level:

```bash
ln -s ../addons/droid-bridge/commands/invoke-droid.md .claude/commands/
ln -s ../addons/droid-bridge/commands/monitor-droid.md .claude/commands/
```

### 3. Symlink skill (optional)

```bash
ln -s ../addons/droid-bridge/skills/droid-launcher .claude/skills/
```

## Usage

### Invoke Droid

```bash
# Via command
/invoke-droid "fix all linting errors"

# Via Python script directly
python3 .claude/addons/droid-bridge/scripts/droid_bridge.py --task "your task"
```

### Monitor Droid

```bash
/monitor-droid --status
/monitor-droid --tail 50
/monitor-droid --logs
```

### Skill Usage

```bash
/droid-launcher "refactor utils.js to ES6 modules"
```

## Python Script Options

```
python3 droid_bridge.py --help

Options:
  --task          Task description for Droid (required)
  --mode          'wait' or 'background' (default: wait)
  --timeout       Max seconds to wait (default: 120)
  --context       Additional context string
  --project-dir   Project directory (default: current)
```

## Output

The Python script outputs JSON:

```json
{
  "status": "success",
  "pid": null,
  "log_file": ".aiwg/logs/droid/20250105-143022.log",
  "output": "Droid's output...",
  "files_changed": ["src/utils.js"],
  "duration_seconds": 15.3,
  "exit_code": 0,
  "error": null
}
```

## File Coordination

The addon creates coordination files in `.aiwg/droid/`:

- `context.md` - Context passed to Droid
- `request.json` - Request audit trail
- `response.json` - Response from Droid (if instructed)

## Logs

All Droid invocations are logged to `.aiwg/logs/droid/`:

- `YYYYMMDD-HHMMSS.log` - Standard execution logs
- `background-YYYYMMDD-HHMMSS.log` - Background execution logs
- `current.pid` - PID of running background process

## Requirements

- Python 3.6+
- Factory Droid CLI (`droid` in PATH)
- Git (for change detection)

## License

MIT
