# Windsurf Quick Start

---

## Install & Deploy

**1. Install**

```bash
npm install -g aiwg
```

**2. Deploy to your project**

```bash
cd /path/to/your/project

# Deploy SDLC framework:
aiwg use sdlc --provider windsurf
```

**3. Open in Windsurf**

```bash
# Windsurf automatically loads rules and agents
code /path/to/your/project  # or use Windsurf launcher
```

**4. Regenerate for intelligent integration**

```text
/aiwg-regenerate-windsurfrules
```

This step is critical - it aggregates all agents into `AGENTS.md` and updates `.windsurfrules` for natural language command mapping ("run security review" → workflow). Without it, advanced features won't work correctly. See the [Regenerate Guide](#regenerate-guide) for details.

**5. You're ready.** See the [Intake Guide](../intake-guide.md) for starting projects.

---

## What Gets Created

```text
AGENTS.md                    # Aggregated agent definitions (auto-loaded)
.windsurfrules               # Windsurf rules file
.windsurf/
├── workflows/               # Commands deployed as workflows
├── skills/                  # Skill directories
└── rules/                   # Rule files
.aiwg/                       # SDLC artifacts
```

**Key Architecture**:
- **Agents**: Aggregated into single `AGENTS.md` at project root (Windsurf reads automatically)
- **Commands**: Deployed as native workflows to `.windsurf/workflows/`
- **Skills**: Deployed to `.windsurf/skills/`
- **Rules**: Deployed to `.windsurf/rules/` AND root `.windsurfrules` file

---

## Using Agents

Windsurf reads `AGENTS.md` automatically. Use natural language to invoke agents:

```text
"Generate intake for an e-commerce platform"
"Transition to Elaboration"
"Run security review"
"Where are we in the project?"
```

### @-Mention Patterns

Reference agents directly using @-mentions:

```text
"@requirements-analyst create user stories for checkout"
"@architecture-designer review the SAD"
"@test-engineer generate integration tests"
```

### Workflow Commands

Commands are deployed as Windsurf workflows:

```text
/transition inception elaboration
/security-review
/project-status
```

---

## Agent Aggregation

Unlike platforms that support individual agent files, Windsurf uses a single aggregated `AGENTS.md`:

**Why Aggregation?**
- Windsurf reads project context from root files
- Single file is more performant than multiple scattered files
- All agent definitions remain accessible via @-mentions
- Regenerate updates aggregation when framework changes

**How It Works**:
1. Framework defines agents in `agentic/code/frameworks/sdlc-complete/agents/`
2. Deployment aggregates all agents into root `AGENTS.md`
3. Windsurf loads `AGENTS.md` automatically on project open
4. Regenerate command updates aggregation if needed

---

## Regenerate Guide

The regenerate command is essential for Windsurf integration:

```text
/aiwg-regenerate-windsurfrules
```

**What it does**:
- Aggregates all agent definitions into `AGENTS.md`
- Updates `.windsurfrules` with latest patterns
- Synchronizes `.windsurf/workflows/` with command definitions
- Enables natural language → workflow mapping

**When to regenerate**:
- After initial deployment
- After updating AIWG framework (`npm update -g aiwg`)
- When adding custom agents or commands
- If natural language workflows stop working

---

## Windsurf Commands

```bash
# Regenerate aggregated files
/aiwg-regenerate-windsurfrules

# Project setup
/aiwg-setup-project

# Workflow commands (examples)
/transition <from-phase> <to-phase>
/security-review
/project-status
```

---

## Troubleshooting

### Natural language not working?

Run regenerate to update mappings:

```text
/aiwg-regenerate-windsurfrules
```

### AGENTS.md not loading?

Windsurf reads root `AGENTS.md` automatically. If agents aren't available:

1. Verify `AGENTS.md` exists at project root
2. Check file isn't empty
3. Restart Windsurf
4. Regenerate if needed

### Workflows missing?

Check deployment:

```bash
# Redeploy framework
aiwg use sdlc --provider windsurf --force

# Verify workflows exist
ls .windsurf/workflows/
```

### Commands not found?

Ensure `.windsurfrules` is up to date:

```text
/aiwg-regenerate-windsurfrules
```

Then verify:

```bash
cat .windsurfrules | grep -A 2 "Commands"
```

### Agents not responding correctly?

1. Check `AGENTS.md` contains expected agents:
   ```bash
   grep "^# Agent:" AGENTS.md
   ```

2. Verify aggregation is recent:
   ```bash
   head -n 5 AGENTS.md  # Check timestamp comment
   ```

3. Regenerate if stale:
   ```text
   /aiwg-regenerate-windsurfrules
   ```

### Skills not available?

Skills are deployed to `.windsurf/skills/`:

```bash
# Check skills directory
ls .windsurf/skills/

# Redeploy if missing
aiwg use sdlc --provider windsurf --force
```

---

## Support Levels

| Artifact Type | Support | Location |
|---------------|---------|----------|
| **Agents** | Aggregated | `AGENTS.md` (root) |
| **Commands** | Native | `.windsurf/workflows/` |
| **Skills** | Conventional | `.windsurf/skills/` |
| **Rules** | Conventional | `.windsurf/rules/`, `.windsurfrules` |

**Aggregated**: All agent definitions combined into single file
**Native**: Deployed to platform-specific location with full support
**Conventional**: Standard directory-based deployment

---

## Ralph Iterative Loops

Ralph loops support multi-provider execution. While Windsurf agents are deployed via AIWG, Ralph task loops run through the CLI:

```bash
aiwg ralph "Fix all tests" --completion "npm test passes"
```

See [Ralph Guide](../ralph-guide.md) for full documentation including `--provider` options.

---

## Next Steps

- [Cross-Platform Overview](cross-platform-overview.md) - Compare platform differences
- [Intake Guide](../intake-guide.md) - Start your first project
- [SDLC Framework](../../agentic/code/frameworks/sdlc-complete/README.md) - Complete framework reference
- [Commands Reference](../cli-reference.md) - All 40 AIWG commands

---

## Additional Resources

**Windsurf Documentation**: [windsurf.ai/docs](https://windsurf.ai/docs)
**AIWG Repository**: [github.com/jmagly/aiwg](https://github.com/jmagly/aiwg)
**Support**: [Discord](https://discord.gg/BuAusFMxdA) | [Telegram](https://t.me/+oJg9w2lE6A5lOGFh)
