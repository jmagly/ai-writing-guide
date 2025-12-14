# Toolsmith

Create automation tools, scripts, and developer experience enhancements.

---

## Overview

Toolsmith capabilities help you create:

- **CLI tools** - Command-line utilities for common tasks
- **Build scripts** - Automation for compilation, testing, deployment
- **Integration scripts** - Connect services and workflows
- **Developer utilities** - Linters, formatters, generators

---

## Using the Toolsmith Agent

The Toolsmith agent creates automation tooling on demand:

```text
"Create a script to validate all manifest files"
"Build a CLI tool for batch file renaming"
"Generate a pre-commit hook for lint checks"
```

### Agent Capabilities

| Capability | Description |
|------------|-------------|
| Script generation | Shell, Node.js, Python scripts |
| CLI development | Interactive command-line tools |
| Build automation | Task runners, build pipelines |
| Integration | API wrappers, service connectors |

---

## Toolsmith Provider

The Toolsmith Provider generates platform-aware tool specifications for agents.

### Purpose

When agents need to use system tools (git, npm, docker), they need accurate command syntax for the current platform. The Toolsmith Provider:

1. **Discovers** installed tools on the system
2. **Verifies** tool availability and version
3. **Generates** platform-specific usage specs
4. **Caches** specs for efficient reuse

### Usage

```bash
# Get spec for a specific tool
aiwg toolsmith get git

# List available tools
aiwg toolsmith list

# Refresh tool catalog
aiwg toolsmith scan
```

### Output Example

```json
{
  "tool": "git",
  "version": "2.43.0",
  "platform": "linux",
  "commands": {
    "status": "git status [options] [--] [<pathspec>...]",
    "add": "git add [options] [--] <pathspec>...",
    "commit": "git commit [options] [--] [<pathspec>...]"
  }
}
```

---

## Creating Custom Tools

### Script Template

```bash
#!/usr/bin/env bash
# Tool: my-utility
# Description: What this tool does
# Usage: my-utility [options] <args>

set -euo pipefail

# Implementation
main() {
    # Your logic here
    echo "Running my-utility"
}

main "$@"
```

### Node.js CLI Template

```javascript
#!/usr/bin/env node
// Tool: my-cli
// Description: What this CLI does

import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    verbose: { type: 'boolean', short: 'v' }
  },
  allowPositionals: true
});

if (values.help) {
  console.log('Usage: my-cli [options] <input>');
  process.exit(0);
}

// Implementation
console.log('Processing:', positionals);
```

---

## Tool Storage

Generated tools are stored in `.aiwg/smiths/toolsmith/`:

```text
.aiwg/smiths/toolsmith/
├── runtime.json      # Tool catalog
├── index.json        # Search index
└── tools/            # Generated specifications
    ├── git.json
    ├── npm.json
    └── docker.json
```

---

## Best Practices

1. **Single purpose** - Each tool does one thing well
2. **Document usage** - Include help text and examples
3. **Handle errors** - Graceful failure with clear messages
4. **Test thoroughly** - Verify on target platforms
5. **Version control** - Track tool changes in git

---

## Related

| Topic | Description |
|-------|-------------|
| [MCP Smith](mcpsmith.md) | Generate MCP servers |
| [Agentic Smiths](agentic-smiths.md) | Generate agents and skills |
| [Graduating Creations](graduating-creations.md) | Promote to production |
