# Smithing Framework

Smiths create tools, agents, and servers on-demand while you work. Need a script to find duplicates? An MCP server to analyze repos? A custom agent for accessibility reviews? Ask a Smith. You get the result without the work polluting your context.

## Why Smithing?

**The Problem**: During development, you need custom tools - shell scripts, MCP servers, specialized agents. Creating them yourself interrupts your flow. The back-and-forth of designing, testing, and debugging clutters your conversation context with implementation details you don't care about.

**The Solution**: Delegate to Smiths. Each Smith is a specialized agent that:

1. **Runs in isolated context** via `Task()` - the messy work stays out of your conversation
2. **Creates project-local assets** in `.aiwg/smiths/` or `.claude/` - no global installation
3. **Caches everything** - ask for something similar later, get it instantly
4. **Only runs what's needed** - 100 definitions doesn't mean 100 running processes

```
You: "I need to find duplicate files by hash"
     ↓
Task(ToolSmith) → [designs script, tests on your OS, registers in catalog]
     ↓
You get: "Tool ready: .aiwg/smiths/toolsmith/scripts/find-duplicates.sh"
```

You asked for a tool. You got a tool. Your context stayed focused on your actual work.

## Available Smiths

| Smith | Purpose | Assets Created | Deploys To |
|-------|---------|----------------|------------|
| **ToolSmith** | Shell/OS tool creation | Shell scripts, tool specifications | `.aiwg/smiths/toolsmith/` |
| **MCPSmith** | MCP server creation | Dockerized MCP servers | `.aiwg/smiths/mcpsmith/` |
| **AgentSmith** | Agent definition creation | Agent markdown definitions | `.claude/agents/` |
| **SkillSmith** | Skill definition creation | Skill directories with SKILL.md | `.claude/skills/` |
| **CommandSmith** | Slash command creation | Command markdown definitions | `.claude/commands/` |

### Smith Categories

**Infrastructure Smiths** (ToolSmith, MCPSmith):
- Create reusable infrastructure assets
- Store in `.aiwg/smiths/` for catalog-based reuse
- Assets invoked by the orchestrating agent

**Agentic Smiths** (AgentSmith, SkillSmith, CommandSmith):
- Create platform-native artifacts
- Deploy directly to platform directories (`.claude/`)
- Assets are immediately available to the AI platform

## Directory Structure

```
.aiwg/smiths/
├── system-definition.yaml      # OS info for ToolSmith
├── mcp-definition.yaml         # Container runtime info for MCPSmith
├── agentic-definition.yaml     # Platform capabilities for Agentic Smiths
├── toolsmith/
│   ├── catalog.yaml            # Index of created tools
│   ├── tools/                  # Tool specifications (YAML)
│   │   └── find-duplicates.yaml
│   └── scripts/                # Generated shell scripts
│       └── find-duplicates.sh
├── mcpsmith/
│   ├── catalog.yaml            # Index of created MCP servers
│   ├── servers/                # Server specifications (YAML)
│   │   └── github-repo-analyzer.yaml
│   └── containers/             # Dockerfile and server code
│       └── github-repo-analyzer/
│           ├── Dockerfile
│           └── server.mjs
├── agentsmith/
│   ├── catalog.yaml            # Index of created agents
│   └── specs/                  # Agent specifications (YAML)
├── skillsmith/
│   ├── catalog.yaml            # Index of created skills
│   └── specs/                  # Skill specifications (YAML)
└── commandsmith/
    ├── catalog.yaml            # Index of created commands
    └── specs/                  # Command specifications (YAML)

.claude/                        # Platform deployment target
├── agents/                     # AgentSmith deploys here
├── skills/                     # SkillSmith deploys here
└── commands/                   # CommandSmith deploys here
```

## Getting Started

### 1. Generate Grounding Definitions

Before using Smiths, generate their respective definition files:

```bash
# For ToolSmith - probes OS capabilities
/smith-sysdef

# For MCPSmith - probes container runtime
/smith-mcpdef

# For Agentic Smiths - probes platform capabilities
/smith-agenticdef
```

### 2. Request an Asset

Orchestrating agents can request assets via the Task tool:

```
# ToolSmith - creates shell scripts
Task(ToolSmith) -> "Create a tool to find duplicate files by content hash"

# MCPSmith - creates MCP servers
Task(MCPSmith) -> "Create an MCP server to analyze GitHub repositories"

# AgentSmith - creates agent definitions
Task(AgentSmith) -> "Create an agent that reviews code for accessibility issues"

# SkillSmith - creates skill definitions
Task(SkillSmith) -> "Create a skill that converts JSON to YAML"

# CommandSmith - creates slash commands
Task(CommandSmith) -> "Create a command to run ESLint with auto-fix"
```

### 3. Use the Asset

**Tools** are executable scripts:
```bash
.aiwg/smiths/toolsmith/scripts/find-duplicates.sh /path/to/directory
```

**MCP Servers** run as Docker containers:
```bash
docker run -i aiwg-mcp-github-analyzer
```

**Agents** are invoked via Task:
```
Task(accessibility-reviewer) -> "Review src/components/"
```

**Skills** trigger on natural language:
```
"convert this JSON to YAML"
```

**Commands** use slash prefix:
```
/lint-fix src/ --fix
```

## Common Patterns

### Operating Rhythm

All Smiths follow a similar workflow:

```
┌─────────────────────┐
│ Orchestrating Agent │
└──────────┬──────────┘
           │ "Need a..."
           ▼
┌─────────────────────┐
│       Smith         │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Catalog │ │ Define  │
│ Check   │ │ Check   │
└────┬────┘ └────┬────┘
     │           │
     │  >80%     │  Verify
     │  match?   │  capabilities
     │           │
     ├───────────┤
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Reuse   │ │ Create  │
│ Existing│ │ New     │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           ▼
┌─────────────────────┐
│ Deploy/Register     │
│ Return Instructions │
└─────────────────────┘
```

### Catalog Reuse (80% Threshold)

Before creating new assets, Smiths search their catalog:

```yaml
# catalog.yaml (common pattern)
artifacts:
  - name: asset-name
    version: "1.0.0"
    description: "Brief description"
    capabilities:
      - Capability 1
      - Capability 2

capability_index:
  "natural language query": asset-name
  "alternative query": asset-name
```

When a request semantic similarity exceeds 80%, existing assets are returned instead of creating duplicates.

### Grounding Definitions

Each Smith reads a definition file to understand available capabilities:

| Smith | Definition File | Contents |
|-------|-----------------|----------|
| ToolSmith | `system-definition.yaml` | OS, shell, tested commands |
| MCPSmith | `mcp-definition.yaml` | Container runtime, registries, ports |
| Agentic Smiths | `agentic-definition.yaml` | Models, tools, deployment paths |

## Detailed Documentation

| Topic | Documentation |
|-------|---------------|
| ToolSmith | This document (below) |
| MCPSmith | [mcpsmith.md](./mcpsmith.md) |
| Agentic Smiths | [agentic-smiths.md](./agentic-smiths.md) |
| **Making it Permanent** | [graduating-creations.md](./graduating-creations.md) |

When a Smith creation proves valuable across projects, you can graduate it to a permanent addon, extension, or framework component. See the graduation guide for the path from project-local to ecosystem-wide.

---

# ToolSmith Reference

ToolSmith creates shell scripts for OS-level operations.

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

---

## References

### Agent Definitions
- ToolSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/toolsmith-dynamic.md`
- MCPSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/mcpsmith.md`
- AgentSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/agentsmith.md`
- SkillSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/skillsmith.md`
- CommandSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/commandsmith.md`

### Commands
- `/smith-sysdef`: `agentic/code/frameworks/sdlc-complete/commands/smith-sysdef.md`
- `/smith-mcpdef`: `agentic/code/frameworks/sdlc-complete/commands/smith-mcpdef.md`
- `/smith-agenticdef`: `agentic/code/frameworks/sdlc-complete/commands/smith-agenticdef.md`

### Detailed Documentation
- MCPSmith: `docs/smithing/mcpsmith.md`
- Agentic Smiths: `docs/smithing/agentic-smiths.md`

### Test Coverage
- ToolSmith Tests: `test/unit/smithing/system-definition.test.ts`
- MCPSmith Tests: `test/unit/smithing/mcp-definition.test.ts`
- Agentic Smiths Tests: `test/unit/smithing/agentic-definition.test.ts`
