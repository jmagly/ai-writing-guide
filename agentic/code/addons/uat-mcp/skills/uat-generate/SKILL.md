---
namespace: aiwg
name: uat-generate
platforms: [all]
description: Discover MCP tools and generate a phased UAT plan with agent-executable test specifications
commandHint:
  argumentHint: '[--mode mcp] [--server <name>] [--output <path>] [--execution-mode quick|standard|full] [--interactive]'
  allowedTools: 'Read, Write, Glob, Grep, Bash, Task'
  model: opus
  category: uat-mcp
---

# UAT Generate

Generate a phased User Acceptance Test plan by discovering tools from connected MCP servers and producing agent-executable test specifications.

## Usage

```bash
# Generate UAT plan from all connected MCP servers (default: --mode mcp)
/uat-generate

# Explicit MCP mode
/uat-generate --mode mcp

# Target specific server
/uat-generate --mode mcp --server gitea

# Quick smoke test plan
/uat-generate --execution-mode quick

# Full comprehensive plan
/uat-generate --execution-mode full

# Custom output path
/uat-generate --output .aiwg/testing/uat/my-plan.md

# Interactive — ask questions about scope and priorities
/uat-generate --interactive
```

## Parameters

### --mode (default: mcp)
Test mode. Currently only `mcp` is supported. Future modes: `api`, `ui`.

### --server (optional)
Target a specific MCP server by name. If omitted, discovers tools from all connected servers.

### --output (optional)
Output path for the generated plan. Default: `.aiwg/testing/uat/plan-{server}-{timestamp}.md`

### --execution-mode (default: standard)
Controls the breadth of generated tests:

| Mode | Description |
|------|-------------|
| `quick` | Preflight + 1 happy path per tool. Minimal, fast. |
| `standard` | Happy paths + key edge cases + negative tests. Balanced. |
| `full` | All paths including exhaustive negative tests and E2E chains. Comprehensive. |

### --interactive (optional)
Prompt for scope decisions before generating:
- Which tool categories to include/exclude
- Priority ordering of phases
- Whether to generate negative tests
- Custom test data values

## Workflow

### Step 1: Discover MCP Tools

Enumerate all tools from connected MCP servers:

```
Discovering MCP tools...
  Server: gitea (mcp__gitea__*)
    Found 78 tools
  Server: filesystem (mcp__fs__*)
    Found 12 tools

Total: 90 tools across 2 servers
```

For each tool, capture:
- Tool name and description
- Parameter schema (required/optional, types, defaults)
- Return type description
- Any documented constraints or side effects

### Step 2: Categorize Tools

Group tools into logical categories:

```
Categories:
  Repository Management: 15 tools (create, get, list, update, delete, fork, ...)
  Issue Tracking: 12 tools (create, get, list, edit, comment, close, ...)
  User & Org: 8 tools (get_user, search_users, get_orgs, ...)
  Actions/CI: 14 tools (list_runs, get_job, dispatch, ...)
  Labels & Milestones: 9 tools (create_label, edit_label, ...)
  Wiki: 5 tools (create, get, update, delete, list)
  Release & Tags: 8 tools (create_release, list_tags, ...)
  File Operations: 5 tools (get_file, create_file, update_file, ...)
  Misc: 2 tools (get_version, get_user_info)
```

### Step 3: Design Phases

Apply the standard phase structure:

1. **Phase 0: Preflight** — Connectivity, auth, server version
2. **Phase 1: Seed Data** — Create test entities needed by later phases
3. **Phases 2-N: Per-Category** — One phase per tool category
4. **Phase N+1: E2E Chains** — Cross-category workflows
5. **Phase N+2: Cleanup** — Delete all seeded data

### Step 4: Generate Test Specs

For each tool in each phase, generate test cases following the `uat-test-case.md` template:

- **Happy path**: Standard usage with valid inputs
- **Edge cases**: Boundary values, empty strings, max lengths (standard and full modes)
- **Negative tests**: Missing required params, invalid types, unauthorized access (standard and full modes)
- **E2E chains**: Multi-tool workflows (full mode only)

### Step 5: Wire Variables

Connect phases via stored variables:

```markdown
Phase 1 (Seed): create_repo → Store: TEST_REPO_NAME
Phase 3 (Issues): create_issue(repo: ${TEST_REPO_NAME}) → Store: ISSUE_INDEX
Phase 4 (Comments): create_issue_comment(index: ${ISSUE_INDEX})
Phase N (Cleanup): delete_repo(name: ${TEST_REPO_NAME})
```

### Step 6: Output Plan

Write the complete UAT plan to the output path. Display summary:

```
UAT Plan Generated
  Server: gitea
  Tools: 78
  Phases: 12
  Test cases: 165
  Negative tests: 32 (isolated)
  Estimated duration: ~20 minutes
  Output: .aiwg/testing/uat/plan-gitea-20260227.md

Review the plan, then execute with:
  /uat-execute .aiwg/testing/uat/plan-gitea-20260227.md
```

## Plan Output Format

The generated plan follows the `uat-phase.md` template. See `templates/uat-phase.md` for the full format.

## Error Handling

### No MCP Servers Connected

```
No MCP servers detected.

To use UAT-MCP, you need at least one MCP server connection.
Check your MCP configuration and try again.
```

### Server Discovery Fails

```
Failed to discover tools from server: {name}
Error: {details}

Continuing with remaining servers...
```

### Zero Tools Found

```
No tools discovered from {server_name}.

The server is connected but exposes no tools.
This may indicate a configuration issue.
```

## References

- Agent: @$AIWG_ROOT/agentic/code/addons/uat-mcp/agents/uat-planner.md
- Template: @$AIWG_ROOT/agentic/code/addons/uat-mcp/templates/uat-phase.md
- Schema: @$AIWG_ROOT/agentic/code/addons/uat-mcp/schemas/uat-plan.yaml
