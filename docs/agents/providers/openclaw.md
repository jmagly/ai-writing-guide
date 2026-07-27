---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.provider.openclaw
---

# OpenClaw Operational Reference

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to OpenClaw**

```bash
# Deploy the complete AIWG system
aiwg use all --provider openclaw
```

All artifacts deploy to `~/.openclaw/` — OpenClaw discovers them automatically at startup.

**3. Configure MCP (optional)**

```bash
aiwg mcp install openclaw
```

**4. Verify**

```bash
openclaw skills list | grep aiwg
```

**5. You're ready.** See the [Intake Guide](#intake-guide) for starting projects.

---

## What Gets Created

```text
~/.openclaw/
├── agents/      # SDLC agents (Requirements Analyst, Architecture Designer, etc.)
├── commands/    # Slash commands (/project-status, /security-gate, etc.)
├── skills/      # Skill directories with SKILL.md (voice profiles, project awareness, etc.)
├── rules/       # Context rules (token security, anti-laziness, etc.)
└── behaviors/   # Reactive behaviors with BEHAVIOR.md + scripts/ (OpenClaw-exclusive)

.aiwg/           # SDLC artifacts (created per-project)
```

OpenClaw is the **only provider** where all artifacts deploy to the home directory (`~/.openclaw/`), making them available across all projects.

---

## Behaviors — OpenClaw-Exclusive

OpenClaw is the first and only platform to support **behaviors** natively. Behaviors are reactive capabilities that fire on system events — not just when a user asks.

```
Skills:    User asks  ->  skill runs  ->  done
Behaviors: File saved ->  behavior reacts  ->  done
           Deploy completes  ->  behavior reacts  ->  done
           Cron fires  ->  behavior reacts  ->  done
```

AIWG ships 5 behaviors out of the box:

| Behavior | Hooks | What It Does |
|---------|-------|-------------|
| `security-sentinel` | on_file_write, on_deploy, on_schedule | Continuous security monitoring |
| `test-watcher` | on_file_write, on_schedule | Reactive test execution |
| `build-monitor` | on_tool_complete, on_schedule | Build health tracking |
| `quality-gate-watcher` | on_commit, on_pr_open | SDLC gate enforcement |
| `artifact-sync` | on_file_write (.aiwg/**) | Keep artifact index current |

See the [Behaviors Guide](../behaviors-guide.md) for the full format spec.

---

## Skills

AIWG deploys a small kernel set to `~/.openclaw/skills/aiwg/` in directory format (each skill has a `SKILL.md`). The broader on-demand skill index lives under `~/.openclaw/.aiwg/skills/` and is reached through AIWG discovery commands.

Skill precedence: `workspace/skills/` > `~/.openclaw/skills/` > bundled > `extraDirs`. AIWG deploys kernel skills to the `aiwg/` namespace in user-global scope; workspace skills take precedence if names collide.

---

## Using Agents

AIWG agents deploy to `~/.openclaw/agents/`. Invoke them in OpenClaw chat:

```text
@security-architect Review the authentication implementation
@test-engineer Generate unit tests for the user service
```

---

## Agent Loop

Agent loops support multi-provider execution:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See the [Al Guide](../ralph-guide.md) for full documentation.

---

## ClawHub Installation (Alternative)

If AIWG is published to ClawHub, install without a full npm setup:

```bash
# Install SDLC skills from ClawHub
clawhub install aiwg-sdlc

# Install all frameworks
clawhub install aiwg-sdlc aiwg-forensics aiwg-media aiwg-research

# Update
clawhub update --all
```

See [ClawHub docs](https://docs.openclaw.ai/tools/clawhub) for registry details.

---

## Troubleshooting

**Skills not showing up?**
```bash
# Verify deployment
find ~/.openclaw/skills/aiwg -mindepth 1 -maxdepth 1 -type d
find ~/.openclaw/.aiwg/skills -mindepth 1 -maxdepth 1 -type d

# Re-deploy
aiwg use sdlc --provider openclaw --force
```

**Behaviors not triggering?**
- Verify `~/.openclaw/behaviors/` contains BEHAVIOR.md files with valid hooks
- Restart OpenClaw to re-discover behaviors
- Check hook event names match OpenClaw's supported events

**MCP tools not visible?**
- Verify `aiwg mcp serve` runs successfully standalone
- Check `~/.openclaw/config.yaml` for MCP server entry
- Restart OpenClaw after config changes

**Redeploy if needed:**
```bash
aiwg use sdlc --provider openclaw --force
```

---

## MCP Sidecar (Unrestricted AIWG Access)

For full unrestricted AIWG tool access (artifact management, workflow execution, template rendering), connect the AIWG MCP server as a sidecar:

```bash
aiwg mcp install openclaw
```

See the [OpenClaw MCP Sidecar Guide](openclaw-mcp-sidecar.md) for complete setup including tool whitelisting and context optimization.

---

## Related Resources

- [OpenClaw MCP Sidecar Guide](openclaw-mcp-sidecar.md) - Full MCP integration
- [Cross-Platform Overview](cross-platform-overview.md) - All provider comparison
- [OpenClaw Guide](../openclaw-guide.md)
- [OpenClaw Integration Guide](../openclaw-guide.md) - Comprehensive guide with routing advice
- [Behaviors Guide](../behaviors-guide.md) - Behaviors format spec and authoring
- [OpenClaw Official Docs](https://docs.openclaw.ai) - Upstream documentation
