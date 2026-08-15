# OpenClaw Integration Guide

Connect AIWG to OpenClaw for structured SDLC workflows, artifact management, and multi-agent orchestration — all accessible from the OpenClaw terminal.

## Overview

AIWG integrates with OpenClaw through two complementary modes:

- **MCP sidecar** — Full workflow engine via `aiwg mcp serve`. OpenClaw calls AIWG tools for artifact management, template rendering, and staged execution.
- **Native skills** — AIWG skills deployed directly to OpenClaw's skill directories. Discovered and loaded by OpenClaw's native skill loader.

```
OpenClaw → MCP → AIWG (workflows, artifacts, templates)
OpenClaw → native skills (quick single-step operations)
```

**Ownership boundaries:**
- **OpenClaw** owns: conversation flow, tool orchestration, session state, user-facing chat
- **AIWG** owns: workflow execution, template-driven outputs, artifact generation, project state in `.aiwg/`
- **MCP** is the seam. Clear ownership, not system fusion.

## Prerequisites

- OpenClaw installed and working ([docs.openclaw.ai](https://docs.openclaw.ai))
- AIWG installed via npm: `npm install -g aiwg`
- Verify both independently:

```bash
# Verify OpenClaw
openclaw --version

# Verify AIWG
aiwg version
aiwg mcp info    # Confirm MCP server capabilities
```

## Quick Start

### Option A: Native Skills Only (simplest)

Deploy AIWG skills to OpenClaw's skill directories:

```bash
# Deploy SDLC framework skills
aiwg use sdlc --provider openclaw

# Deploy all frameworks
aiwg use all --provider openclaw

# Verify AIWG kernel skills
find ~/.openclaw/skills/aiwg -mindepth 1 -maxdepth 1 -type d
openclaw skills list | grep aiwg
```

AIWG kernel skills land in `~/.openclaw/skills/aiwg/<skill-name>/SKILL.md` to avoid collisions with non-AIWG ClawHub installs. The larger on-demand skill index remains under `~/.openclaw/.aiwg/skills/`.

### Option B: MCP Sidecar (full power)

Connect AIWG as an MCP server for the complete workflow engine:

**1. Add MCP configuration**

In your OpenClaw config (typically `~/.openclaw/config.yaml` or workspace config):

```yaml
mcp_servers:
  aiwg:
    command: "aiwg"
    args: ["mcp", "serve"]
    tools:
      include:
        - discover
        - command-run
        - artifact-read
        - artifact-write
        - template-render
        - agent-list
        - skill-list
```

**2. Reload and verify**

```bash
# Restart OpenClaw to pick up new MCP config
openclaw reload

# Verify AIWG tools are visible
openclaw tools list | grep aiwg
```

You should see the whitelisted tools available in your OpenClaw session.

**3. Test the connection**

```
You: Run a workflow to create an architecture decision record
OpenClaw: [calls aiwg command-run/template-render/artifact-write → creates .aiwg/architecture/adr-001.md]
```

### Option C: Both (recommended)

Use both modes together for maximum flexibility:

```bash
# Deploy native skills
aiwg use sdlc --provider openclaw

# Add MCP config (see Option B)
```

- **Native skills** handle quick, single-step operations (doc scraping, code analysis, etc.)
- **MCP sidecar** handles full SDLC workflows, artifact management, and multi-agent orchestration

## Routing Guidance

When both modes are active, route requests based on complexity:

### Route to AIWG MCP when:
- SDLC phase work is needed (inception, elaboration, construction transitions)
- Artifact generation required (architecture docs, test plans, requirements)
- Multi-agent orchestration requested (parallel reviewers, synthesis)
- Template-driven output needed (use case templates, ADR templates)
- Agent loops or iterative task execution
- Recovery-oriented or staged planning work

### Use AIWG native skills when:
- Skill trigger phrase matches (e.g., "scrape docs", "run security audit", "analyze code")
- Quick single-step operation with no artifact persistence needed
- Voice profile application or content validation

### Keep in OpenClaw when:
- Short one-off conversation questions
- Code editing without SDLC artifact tracking
- Quick debugging sessions
- Tasks that don't need persistent artifacts

## What Gets Deployed

`aiwg use sdlc --provider openclaw` deploys:

| Artifact Type | Target Directory | Count |
|---|---|---|
| Kernel skills | `~/.openclaw/skills/aiwg/` | 15-30 |
| On-demand skill index | `~/.openclaw/.aiwg/skills/` | 90+ |
| Agents | `~/.openclaw/agents/` | 90+ |
| Commands | `~/.openclaw/commands/` | 50+ |
| Rules | `~/.openclaw/rules/` | 33 |
| Behaviors | `~/.openclaw/behaviors/` | 5+ |

### Behaviors — OpenClaw's Reactive Layer

OpenClaw is the first platform to support **behaviors** natively. Behaviors are a new AIWG artifact type: reactive capabilities with scripts and event hooks that fire automatically when system events occur — not just when a user asks.

```
Skills:    User asks → skill runs → done
Behaviors: User asks → behavior runs → done
           File written → behavior reacts → done
           Deploy completes → behavior reacts → done
           30 minutes pass → behavior reacts → done
```

AIWG ships behaviors for SDLC workflows out of the box:

| Behavior | Hooks | What It Does |
|---------|-------|-------------|
| `security-sentinel` | on_file_write, on_deploy, on_schedule | Continuous security monitoring |
| `test-watcher` | on_file_write, on_schedule | Reactive test execution |
| `build-monitor` | on_tool_complete, on_schedule | Build health tracking |
| `quality-gate-watcher` | on_commit, on_pr_open | SDLC gate enforcement |
| `artifact-sync` | on_file_write (.aiwg/**) | Keep artifact index current |

OpenClaw discovers behaviors in `~/.openclaw/behaviors/` and wires their hooks at startup. No additional configuration needed after `aiwg use`.

See the [Behaviors Guide](behaviors-guide.md) for the full format spec and authoring guide.

## ClawHub Installation (alternative)

If AIWG is published to ClawHub, install without a full AIWG installation:

```bash
# Install SDLC skills from ClawHub
clawhub install aiwg-sdlc

# Install all AIWG skills
clawhub install aiwg-sdlc aiwg-forensics aiwg-media aiwg-research

# Update
clawhub update --all
```

See [ClawHub docs](https://docs.openclaw.ai/tools/clawhub) for registry details.

## Skill Format

AIWG skills use the AgentSkills SKILL.md format, which is natively compatible with OpenClaw:

```markdown
---
name: sdlc-accelerate
description: End-to-end SDLC ramp-up from idea to construction-ready
platforms: [claude-code, hermes, openclaw]
metadata: {"openclaw": {"primaryEnv": "terminal"}}
---

# Skill content...
```

### OpenClaw-Specific Gating

Skills with external dependencies use `metadata.openclaw.*` for gating:

| Field | Purpose | Example |
|---|---|---|
| `requires.bins` | Required binaries | `["curl", "docker"]` |
| `requires.env` | Required env vars | `["AIWG_TOKEN"]` |
| `os` | OS filter | `["linux", "macos"]` |
| `primaryEnv` | Preferred environment | `"terminal"` |
| `always` | Load unconditionally | `true` |

Most AIWG skills require no gating — they run on any platform.

## Verification Checklist

After setup, verify the integration:

- [ ] `openclaw skills list` shows AIWG skills (if native deployment)
- [ ] `openclaw tools list` shows AIWG MCP tools (if MCP sidecar)
- [ ] Run one native skill: "analyze this codebase for quality"
- [ ] Run one MCP workflow: "create an architecture decision record"
- [ ] Check `.aiwg/` directory created with artifacts
- [ ] Disable AIWG MCP server — verify OpenClaw still works (graceful degradation)

## Troubleshooting

### Skills not showing up

```bash
# Verify deployment
find ~/.openclaw/skills/aiwg -mindepth 1 -maxdepth 1 -type d
find ~/.openclaw/.aiwg/skills -mindepth 1 -maxdepth 1 -type d

# Check OpenClaw skill discovery
openclaw skills list --verbose

# Re-deploy
aiwg use sdlc --provider openclaw
```

### MCP connection failing

```bash
# Test AIWG MCP server independently
aiwg mcp serve
# Should start without errors

# Check OpenClaw MCP config
openclaw config show | grep aiwg

# Verify tool whitelist
openclaw tools list
```

### Skills conflict with existing skills

OpenClaw skill precedence: `workspace/skills/` > `~/.openclaw/skills/` > bundled > `extraDirs`. AIWG deploys kernel skills to `~/.openclaw/skills/aiwg/` (user-global) and on-demand skills to `~/.openclaw/.aiwg/skills/`. Workspace skills take precedence if names collide.

### Performance

The MCP sidecar adds minimal overhead — AIWG runs as a local process. For latency-sensitive operations, use native skills instead of MCP.

## Cross-References

- [AIWG Quick Start](quickstart.md) — General AIWG setup
- [Behaviors Guide](behaviors-guide.md) — Behaviors format spec and authoring guide
- [Daemon Guide](daemon-guide.md) — Running AIWG as a background daemon
- [Messaging Guide](messaging-guide.md) — Chat platform integration
- [Al Guide](ralph-guide.md) — Iterative task execution
- [CLI Reference](https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md) — All 50 AIWG commands
- [OpenClaw Skills Docs](https://docs.openclaw.ai/tools/skills) — OpenClaw skill system
- [ClawHub](https://docs.openclaw.ai/tools/clawhub) — OpenClaw skill registry
- `.aiwg/planning/openclaw-aiwg-integration-plan.md` — Full integration plan
