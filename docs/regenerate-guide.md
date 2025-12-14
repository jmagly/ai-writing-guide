# Context File Integration

After deploying AIWG with `aiwg use sdlc`, you need to integrate it with your platform's context file. You have two options.

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
- Preserves team directives and custom content
- Links your rules to SDLC workflows
- Enables natural language command mapping
- Creates deep context integration

**Best for:** Production use, full feature support, natural language commands.

---

## Why Intelligent Integration Works Better

Without regeneration, you get a basic append. With regeneration:

- **Natural language works** - "Run security review" → `/flow-security-review-cycle`
- **Context linking** - Your project rules linked to SDLC workflows
- **Content expansion** - Vague notes expanded with actionable details
- **Deep integration** - Your existing content enriched, not replaced

**Example transformation:**

```markdown
# Before (setup-project only)
## Security Requirements
- Must comply with SOC2

# After (regenerate)
## Security Requirements
- Must comply with SOC2
  → Security validation: /flow-security-review-cycle
  → Compliance framework: /flow-compliance-validation SOC2
```

---

## When to Use Each

| Scenario | Command |
|----------|---------|
| Quick test | `/aiwg-setup-project` |
| Production use | `/aiwg-regenerate` |
| Natural language needed | `/aiwg-regenerate` |
| After adding frameworks | `/aiwg-regenerate` |
| Fixing broken features | `/aiwg-regenerate` |
| Initial scaffold only | `/aiwg-setup-project` |

---

## Platform-Specific Commands

Each platform has its own regenerate command based on the context file:

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

All regenerate commands support these flags:

```text
/aiwg-regenerate --dry-run        # Preview changes
/aiwg-regenerate --show-preserved # See what's kept
/aiwg-regenerate                  # Run regeneration
/aiwg-regenerate --full           # Full regen (loses custom content)
/aiwg-regenerate --no-backup      # Skip backup (not recommended)
```

---

## What Gets Preserved

The regenerate command **always preserves**:

- Team directives and conventions
- Project-specific rules
- Custom configurations
- Organizational requirements
- Content marked with `<!-- PRESERVE -->` blocks
- Sections with headings like "Team *", "Definition of Done", "Security Requirements"

---

## What Gets Updated

The regenerate command **updates**:

- AIWG framework sections
- Agent definitions
- Command mappings
- Natural language translation patterns
- Links to your preserved content

---

## Backup and Recovery

Every regeneration creates a timestamped backup:

```text
CLAUDE.md.backup-2024-12-13-143022
```

To restore:
```bash
cp CLAUDE.md.backup-{timestamp} CLAUDE.md
```

---

## Troubleshooting

**Natural language not working:**
```text
/aiwg-regenerate-claude         # Claude Code
/aiwg-regenerate-warp           # Warp Terminal
/aiwg-regenerate-agents         # Factory/OpenCode/Codex
/aiwg-regenerate-cursorrules    # Cursor
/aiwg-regenerate-windsurfrules  # Windsurf
/aiwg-regenerate-copilot        # GitHub Copilot
```

**"Command not recognized":**
Run the appropriate regenerate command for your platform.

**Agents not orchestrating:**
Run the appropriate regenerate command for your platform.

**After adding new frameworks:**
```bash
aiwg use marketing              # Add marketing framework
```
```text
/aiwg-regenerate                # Re-integrate
```

---

## Quick Reference

| Action | Command |
|--------|---------|
| Quick setup (append) | `/aiwg-setup-project` |
| Intelligent integration | `/aiwg-regenerate` |
| Preview changes | `/aiwg-regenerate --dry-run` |
| See preserved content | `/aiwg-regenerate --show-preserved` |
| Claude Code | `/aiwg-regenerate-claude` |
| Warp Terminal | `/aiwg-regenerate-warp` |
| Factory/OpenCode/Codex | `/aiwg-regenerate-agents` |
| Cursor | `/aiwg-regenerate-cursorrules` |
| Windsurf | `/aiwg-regenerate-windsurfrules` |
| GitHub Copilot | `/aiwg-regenerate-copilot` |
