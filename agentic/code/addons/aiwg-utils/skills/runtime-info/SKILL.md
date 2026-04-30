---
namespace: aiwg
name: runtime-info
platforms: [all]
description: Display a comprehensive runtime environment report covering detected provider, available tools, AIWG version, and installed frameworks
---

# Runtime Info

You display a comprehensive runtime environment report — detected provider, available tools and permissions, AIWG version, installed frameworks, and relevant environment variables. Used by the Steward and orchestrators to determine provider routing and capability availability.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what provider am I on" → runtime-info (provider section)
- "do I have bash access" → runtime-info (tools section)
- "what version of aiwg is this" → runtime-info (version section)
- "what's installed" → runtime-info (frameworks section)
- "check my environment" → runtime-info

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Full report | "show runtime info" | Run `aiwg runtime-info` |
| Provider check | "which provider is active?" | Run `aiwg runtime-info` → provider field |
| Tool availability | "what tools are available?" | Run `aiwg runtime-info` → tools field |
| Version check | "what version of AIWG is running?" | Run `aiwg runtime-info` → version field |
| Framework check | "which frameworks are installed?" | Run `aiwg runtime-info` → frameworks field |
| Environment dump | "show environment variables" | Run `aiwg runtime-info` → env field |

## Behavior

When triggered:

1. **Identify what the user wants**:
   - Full report, or a specific field (provider, tools, version, frameworks, env)?
   - Is this for routing decisions (Steward context) or user curiosity?

2. **Run the command**:

   ```bash
   # Full runtime report
   aiwg runtime-info

   # Machine-readable (for orchestration / Steward routing)
   aiwg runtime-info --json
   ```

3. **Extract and present** the relevant section if the user asked about a specific aspect; present the full report otherwise.

## Report Fields

The runtime-info report covers:

| Field | Description |
|-------|-------------|
| `provider` | Detected AI platform (claude-code, copilot, cursor, etc.) |
| `aiwg_version` | Installed AIWG version (CalVer) |
| `node_version` | Node.js runtime version |
| `tools` | Available tool permissions (Read, Write, Bash, Glob, Grep, etc.) |
| `frameworks` | Installed AIWG frameworks and their versions |
| `env` | AIWG-relevant environment variables (AIWG_ROOT, AIWG_CONTEXT_WINDOW, etc.) |
| `platform` | OS and architecture |
| `cwd` | Current working directory |

## Examples

### Example 1: Full report

**User**: "Show runtime info"

**Extraction**: Full report, no specific field

**Action**:
```bash
aiwg runtime-info
```

**Response**:
```
Provider:      claude-code
AIWG version:  2026.3.15
Node:          v22.11.0
Platform:      linux/x64
CWD:           /mnt/dev-inbox/jmagly/aiwg

Tools available:
  Read, Write, Edit, Bash, Glob, Grep

Frameworks installed:
  sdlc-complete   2026.3.15
  aiwg-utils      2026.3.15

Environment:
  AIWG_ROOT=/mnt/dev-inbox/jmagly/aiwg
  AIWG_CONTEXT_WINDOW=200000
```

### Example 2: Provider routing (Steward context)

**User (Steward)**: "Which provider is active so I can route this deployment?"

**Extraction**: Provider field only

**Action**:
```bash
aiwg runtime-info --json
```

**Response**: "Active provider is `claude-code`. Use `aiwg use sdlc --provider claude-code` for deployment."

### Example 3: Tool availability check

**User**: "Do I have Bash access in this environment?"

**Extraction**: Tools field

**Action**:
```bash
aiwg runtime-info --json
```

**Response**: "Yes — Bash is listed in available tools. You also have Read, Write, Edit, Glob, and Grep."

### Example 4: Framework inventory

**User**: "What frameworks are installed?"

**Extraction**: Frameworks field

**Action**:
```bash
aiwg runtime-info
```

**Response**: "2 frameworks installed: sdlc-complete (2026.3.15), aiwg-utils (2026.3.15). Run `aiwg list` for full framework details."

## Clarification Prompts

If the user's intent is ambiguous:

- "Are you checking the environment for a specific purpose (e.g., provider routing, tool availability), or would a full report be useful?"

## References

- @$AIWG_ROOT/src/cli/handlers/runtime-info.ts — Runtime info handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference (runtime-info section)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/agent-deployment.md — Provider routing context
