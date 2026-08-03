# UAT-MCP Toolkit

Agent-executable acceptance testing via MCP connections. Generate phased UAT plans from MCP tool manifests, execute them against live connections, and produce structured coverage reports.

## Quick Start

```bash
# Install the addon
aiwg use uat-mcp

# Generate a UAT plan from connected MCP servers
/uat-generate --mode mcp

# Execute the plan
/uat-execute .aiwg/testing/uat/plan.md

# Generate coverage report
/uat-report .aiwg/testing/uat/results/
```

Or use natural language:

```
"run UAT on the MCP tools"
"generate a UAT plan for this server"
"acceptance test the MCP connections"
```

## Components

| Type | Name | Purpose |
|------|------|---------|
| Agent | `uat-planner` | Designs phased UAT plans from MCP tool manifests and domain context |
| Agent | `uat-executor` | Executes UAT plans step-by-step via MCP, filing issues on failure |
| Command | `/uat-generate` | Discover MCP tools and scaffold phased UAT plan with test specs |
| Command | `/uat-execute` | Run a UAT plan against live MCP connections |
| Command | `/uat-report` | Generate UAT completion report with coverage metrics |
| Skill | `uat-mode` | Natural language detection for UAT-related requests |

## Key Principles

### MCP-First Policy

All tests use MCP tool calls. If a tool doesn't exist for an operation, that's a finding — file a bug. Never fall back to curl/HTTP. The purpose is to validate the interface agents actually use.

### Phase Structure

Tests are organized into sequential phases:

1. **Preflight** — Verify MCP connectivity and authentication
2. **Seed Data** — Create test data via MCP tools
3. **Per-Category** — Test each tool category (CRUD, search, admin, etc.)
4. **E2E Chains** — Cross-phase workflows using stored variables
5. **Cleanup** — Remove test data (always runs, regardless of failures)

### Negative Test Isolation

Tests expecting errors run in isolation (single MCP call per turn) to prevent sibling-call cascades from polluting results.

### Auto-Issue Filing

Failed tests automatically create issues tagged `bug` + `uat` in the configured tracker (Gitea or GitHub).

## Execution Modes

| Mode | Tests Run | Duration | Use Case |
|------|-----------|----------|----------|
| Quick Smoke | Preflight + 1 happy path per tool | ~5 min | CI/pre-commit |
| Standard | All happy paths + key edge cases | ~15 min | Sprint validation |
| Full | All tests including negative + E2E | ~30 min | Release qualification |

## Configuration

In `.aiwg/config.yaml`:

```yaml
uat:
  mode: mcp                    # Default test mode (mcp, future: api, ui)
  issue_filing: true           # Auto-create issues for failures
  issue_provider: gitea        # gitea | github | local
  max_phases: 30               # Safety limit on phase count
  execution_mode: standard     # quick | standard | full
  cleanup_always: true         # Run cleanup phase even on failure
  negative_test_isolation: true # Isolate error-expecting tests
```

## When to Use

- **Pre-release**: Validate MCP tool surface before shipping
- **After refactors**: Ensure MCP tools still behave correctly
- **New MCP server setup**: Generate baseline test suite from tool manifest
- **CI integration**: Run quick smoke tests on every push
- **Regression detection**: Compare results across runs

## Future Modes

The `--mode` parameter defaults to `mcp` but is designed for extensibility:

| Mode | Status | Description |
|------|--------|-------------|
| `mcp` | Available | Test MCP tool connections |
| `api` | Planned | Test REST/GraphQL API endpoints |
| `ui` | Planned | Test UI interactions via browser automation |

## Related

- Issue: #380
- RLM addon (similar structure): `agentic/code/addons/rlm/`
- MCP server implementation: `src/mcp/`
