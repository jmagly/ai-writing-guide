# Smithing Framework

The Smithing Framework enables agents to create runnable agentic assets on the fly. "Smith" agents specialize in creating specific types of assets - tools, templates, configurations - that can be cached and reused across workflows.

## Overview

**Problem**: Tool creation during agentic workflows is constrained and impacts the main process. Agents need to create, reuse, and modify tools dynamically without disrupting their primary task flow.

**Solution**: Specialized "Smith" agents handle asset creation independently. The orchestrating agent delegates to a Smith, which creates or returns cached assets, allowing the main workflow to continue uninterrupted.

## Available Smiths

| Smith | Purpose | Assets Created |
|-------|---------|----------------|
| **ToolSmith** | Shell/OS tool creation | Shell scripts, tool specifications |

*Future smiths may include: TemplateSmith, ConfigSmith, WorkflowSmith*

## Directory Structure

All Smithing assets are stored in `.aiwg/smiths/`:

```
.aiwg/smiths/
├── system-definition.yaml      # OS info and tested commands
└── toolsmith/
    ├── catalog.yaml            # Index of all tools
    ├── tools/                  # Tool specifications (YAML)
    │   ├── find-duplicates.yaml
    │   └── bulk-rename.yaml
    └── scripts/                # Generated shell scripts
        ├── find-duplicates.sh
        └── bulk-rename.sh
```

## Getting Started

### 1. Generate System Definition

Before using ToolSmith, generate a system definition file:

```
/smith-sysdef
```

This probes your system and creates `.aiwg/smiths/system-definition.yaml` with:
- Platform information (OS, kernel, architecture)
- Shell details
- Tested commands organized by category

### 2. Request a Tool

Orchestrating agents can request tools via the Task tool:

```
Task(ToolSmith) -> "Create a tool to find duplicate files by content hash in a directory"
```

ToolSmith will:
1. Check if a matching tool exists in the catalog
2. If not, create the tool using available system commands
3. Test the tool
4. Register it in the catalog
5. Return the tool path and usage instructions

### 3. Use the Tool

Tools are stored as executable shell scripts:

```bash
.aiwg/smiths/toolsmith/scripts/find-duplicates.sh /path/to/directory
```

## System Definition

The system definition (`system-definition.yaml`) describes:

### Platform Information
```yaml
platform:
  os: "linux"
  distribution: "Ubuntu 22.04"
  kernel: "5.15.0"
  shell: "/bin/bash"
  architecture: "x86_64"
```

### Command Categories

| Category | Purpose | Example Commands |
|----------|---------|------------------|
| file-ops | File system operations | find, ls, cp, mv, chmod |
| text-processing | Text manipulation | grep, sed, awk, sort, uniq |
| hashing | Checksums | md5sum, sha256sum |
| compression | Archives | tar, gzip, zip |
| network | Network utilities | curl, wget, ping |
| process | Process management | ps, kill, pgrep |
| json | JSON processing | jq |

### Command Entry
```yaml
commands:
  - name: find
    path: /usr/bin/find
    version: "4.8.0"
    tested: true
    capabilities:
      - recursive search
      - pattern matching
      - exec actions
```

## Tool Specification

Tools are defined with YAML specifications:

```yaml
name: find-duplicates
version: "1.0.0"
description: "Find duplicate files by content hash"

requirements:
  commands: [find, md5sum, sort, awk]

inputs:
  - name: directory
    type: path
    required: true

outputs:
  - name: duplicates
    type: text

script_path: "../scripts/find-duplicates.sh"

tests:
  - name: "Basic test"
    command: "./find-duplicates.sh /tmp/test"
    expect_exit_code: 0

tags: [duplicates, files, hash]
```

## Tool Catalog

The catalog (`catalog.yaml`) indexes all tools:

```yaml
tools:
  - name: find-duplicates
    version: "1.0.0"
    description: "Find duplicate files by content hash"
    path: tools/find-duplicates.yaml
    script: scripts/find-duplicates.sh
    tags: [duplicates, files, hash]
    capabilities:
      - Find duplicate files
      - Compare by content hash

capability_index:
  "find duplicates": find-duplicates
  "duplicate files": find-duplicates
```

## Workflow

```
┌─────────────────────┐
│ Orchestrating Agent │
└──────────┬──────────┘
           │
           │ "Need a tool to..."
           ▼
┌─────────────────────┐
│     ToolSmith       │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Catalog │ │ System  │
│ Check   │ │ Def     │
└────┬────┘ └────┬────┘
     │           │
     ├───────────┤
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Reuse   │ │ Create  │
│ Tool    │ │ Tool    │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           ▼
┌─────────────────────┐
│ Return Tool Path    │
│ + Usage Instructions│
└─────────────────────┘
```

## Commands

### /smith-sysdef

Generate or update the system definition file.

```bash
# Generate full system definition
/smith-sysdef

# Test specific categories
/smith-sysdef --categories file-ops,text-processing

# Verify existing definition
/smith-sysdef --verify-only

# Update with changes
/smith-sysdef --update
```

## Best Practices

### For Orchestrating Agents

1. **Be specific in requests**: "Find duplicate files by MD5 hash" is better than "find duplicates"
2. **Include constraints**: "Maximum 10MB file size" helps ToolSmith design efficient tools
3. **Check for existing tools first**: The catalog may already have what you need

### For Tool Design

1. **Use strict mode**: Always start scripts with `set -euo pipefail`
2. **Validate inputs**: Check all parameters before processing
3. **Handle edge cases**: Empty directories, missing files, permission errors
4. **Include tests**: At least one test case per tool

### For System Definitions

1. **Keep updated**: Run `/smith-sysdef --update` after installing new tools
2. **Verify periodically**: Run `/smith-sysdef --verify-only` to catch removed commands
3. **Document customizations**: Note any manual additions to the system definition

## Limitations

- **Shell scripts only**: ToolSmith creates bash scripts, not compiled binaries
- **Local execution**: Tools run on the local system, not remote
- **Command availability**: Tools can only use commands in the system definition
- **Platform-specific**: Tools may behave differently on Linux vs macOS

## Troubleshooting

### "System definition not found"

Run `/smith-sysdef` to generate the system definition.

### "Required command not available"

The tool needs a command not in your system definition:
1. Install the missing command
2. Run `/smith-sysdef --update`
3. Retry the tool creation

### Tool fails tests

ToolSmith will attempt to debug and fix. If issues persist:
1. Check the system definition for command availability
2. Review man pages for platform-specific differences
3. Manually inspect the generated script

## References

- ToolSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/toolsmith-dynamic.md`
- System Definition Command: `agentic/code/frameworks/sdlc-complete/commands/smith-sysdef.md`
- Tool Catalog: `.aiwg/smiths/toolsmith/catalog.yaml`
