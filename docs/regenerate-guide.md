# Context File Integration

After deploying AIWG with `aiwg use sdlc`, you need to integrate it with your platform's context file. This guide explains how regeneration works and how your files are managed.

---

## Choose Your Integration Method

### Option 1: Quick Setup (`/aiwg-setup-project`)

Fast scaffold - appends AIWG template to your context file.

```text
/aiwg-setup-project
```

**What it does:**
- Appends AIWG framework section to CLAUDE.md/AGENTS.md
- Creates `.aiwg/` directory structure
- Validates setup
- Simple merge - no project analysis

**Best for:** Quick testing, minimal setup, getting started fast.

---

### Option 2: Intelligent Integration (`/aiwg-regenerate`) - Recommended

Deep integration - analyzes your project and wires everything together.

```text
/aiwg-regenerate
```

**What it does:**
- Analyzes your project structure, dependencies, conventions
- Intelligently preserves your team content
- Links your rules to SDLC workflows via @-mentions
- Enables natural language command mapping
- Creates deep context integration

**Best for:** Production use, full feature support, natural language commands.

---

## How Regeneration Works

Regeneration is an **intelligent merge**, not a blind replacement. The agent understands the difference between your team's content and AIWG-generated content.

### The Core Principle

**Your content is preserved. AIWG content is updated.**

The regeneration agent:
1. Reads your existing context file
2. Identifies team-written sections (project rules, conventions, requirements)
3. Identifies AIWG-generated sections (framework integration, agent definitions)
4. Updates only the AIWG sections with fresh analysis
5. Preserves your team content exactly as written
6. Adds @-mentions to link your content with relevant AIWG resources

### What the Agent Recognizes as Team Content

The agent intelligently identifies content that belongs to your team:

- **Project-specific rules** - API guidelines, coding standards, architectural decisions
- **Team conventions** - Naming patterns, review processes, deployment procedures
- **Business requirements** - Security policies, compliance needs, SLAs
- **Custom workflows** - Team-specific processes not part of AIWG
- **Historical context** - Why decisions were made, lessons learned

This content is **never modified** during regeneration unless it's factually outdated.

### What the Agent Updates

AIWG-related sections are refreshed:

- Project overview (re-analyzed from codebase)
- Tech stack and commands (re-detected)
- AIWG framework references
- Agent definitions and available commands
- Natural language mappings
- @-mention links to AIWG documentation

---

## The Bootstrap Pattern

The regenerated file is built in layers:

```
┌───────────────────────────────────────────────────┐
│               Your Context File                   │
├───────────────────────────────────────────────────┤
│  1. PROJECT ANALYSIS                              │
│     Tech stack, commands, structure               │
│     (Re-detected each regeneration)               │
├───────────────────────────────────────────────────┤
│  2. YOUR TEAM CONTENT                             │
│     Rules, conventions, requirements              │
│     (Preserved exactly as written)                │
├───────────────────────────────────────────────────┤
│  3. PROJECT ARTIFACTS (.aiwg/)                    │
│     @-mentions linking to your docs               │
├───────────────────────────────────────────────────┤
│  4. AIWG REFERENCES                               │
│     Core utilities + installed frameworks         │
│     (Updated each regeneration)                   │
└───────────────────────────────────────────────────┘
```

---

## How @-Mentions Enhance Your Content

During regeneration, the agent can add @-mentions to link your team content with relevant AIWG resources. This happens **without modifying your words**.

**Example - Your original content:**
```markdown
## Security Requirements
- Must comply with SOC2
- All data encrypted at rest
- Quarterly penetration testing required
```

**After regeneration - Enhanced with links:**
```markdown
## Security Requirements
- Must comply with SOC2
- All data encrypted at rest
- Quarterly penetration testing required

Related workflows: @.aiwg/security/, /flow-security-review-cycle, /flow-compliance-validation
```

Your requirements are untouched. The agent simply adds helpful references below.

---

## Updating Outdated Information

If the agent detects genuinely outdated information (e.g., old version numbers, deprecated patterns), it may update that specific content. This is rare and only happens when:

- Version numbers are clearly stale
- Referenced files no longer exist
- Patterns have been officially deprecated

The agent **does not** change your team's opinions, preferences, or decisions.

---

## Platform-Specific Commands

Each platform has its own regenerate command:

| Platform | Context File | Regenerate Command |
|----------|--------------|-------------------|
| Claude Code | CLAUDE.md | `/aiwg-regenerate-claude` |
| Warp Terminal | WARP.md | `/aiwg-regenerate-warp` |
| Factory AI | AGENTS.md | `/aiwg-regenerate-agents` |
| OpenCode | AGENTS.md | `/aiwg-regenerate-agents` |
| Codex | AGENTS.md | `/aiwg-regenerate-agents` |
| Cursor | .cursorrules | `/aiwg-regenerate-cursorrules` |
| Windsurf | .windsurfrules | `/aiwg-regenerate-windsurfrules` |
| GitHub Copilot | copilot-instructions.md | `/aiwg-regenerate-copilot` |
| Any (auto-detect) | varies | `/aiwg-regenerate` |

**Auto-detect:** Use `/aiwg-regenerate` to let the system detect which file to regenerate.

---

## Regenerate Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without writing |
| `--no-backup` | Skip creating backup file |
| `--full` | Full regeneration - replaces everything (destructive) |

```text
/aiwg-regenerate --dry-run        # Preview what would change
/aiwg-regenerate                  # Run regeneration
/aiwg-regenerate --full           # Complete reset (use with caution)
```

---

## When to Regenerate

**Run regenerate when:**
- Project structure changes significantly
- You add or remove major dependencies
- After `npm update aiwg` to get new features
- After installing a new framework (`aiwg use marketing`)
- After deploying new agents to your project
- Natural language commands stop working

**You don't need to regenerate when:**
- Adding team content to your context file
- Making normal code changes
- Updating `.aiwg/` artifacts (references are dynamic)

---

## Backup and Recovery

Every regeneration creates a timestamped backup:

```text
CLAUDE.md → CLAUDE.md.backup-20251213-143022
```

To restore:
```bash
cp CLAUDE.md.backup-20251213-143022 CLAUDE.md
```

---

## Troubleshooting

**Natural language not working:**
Run the regenerate command for your platform to re-establish mappings.

**Agents not orchestrating:**
Run the appropriate regenerate command for your platform.

**After adding new frameworks:**
```bash
aiwg use marketing              # Add marketing framework
```
```text
/aiwg-regenerate                # Re-integrate
```

**Content unexpectedly changed:**
1. Check your backup file
2. Compare with `diff CLAUDE.md.backup-* CLAUDE.md`
3. Report unexpected changes - the agent should preserve team content

---

## Quick Reference

| Action | Command |
|--------|---------|
| Quick setup (append) | `/aiwg-setup-project` |
| Intelligent integration | `/aiwg-regenerate` |
| Preview changes | `/aiwg-regenerate --dry-run` |
| Claude Code | `/aiwg-regenerate-claude` |
| Warp Terminal | `/aiwg-regenerate-warp` |
| Factory/OpenCode/Codex | `/aiwg-regenerate-agents` |
| Cursor | `/aiwg-regenerate-cursorrules` |
| Windsurf | `/aiwg-regenerate-windsurfrules` |
| GitHub Copilot | `/aiwg-regenerate-copilot` |
