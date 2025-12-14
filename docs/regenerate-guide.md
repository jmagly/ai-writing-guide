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
- Preserves team directives and custom content
- Links your rules to SDLC workflows
- Enables natural language command mapping
- Creates deep context integration

**Best for:** Production use, full feature support, natural language commands.

---

## How Regeneration Works

When you run a regenerate command, AIWG performs these steps:

### Step 1: Create Backup

Your existing file is backed up with a timestamp:
```
CLAUDE.md → CLAUDE.md.backup-20251213-143512
```

This happens automatically unless you use `--no-backup`.

### Step 2: Extract Preserved Content

AIWG scans your file for content marked as preserved (see [What Gets Preserved](#what-gets-preserved) below). This content will be re-inserted into the regenerated file.

### Step 3: Analyze Your Project

AIWG examines:
- **Languages and frameworks** - Detected from file extensions and config files
- **Package manager** - npm, pip, cargo, etc.
- **Development commands** - From package.json scripts, Makefile, etc.
- **Test framework** - Vitest, Jest, pytest, etc.
- **CI/CD configuration** - GitHub Actions, etc.
- **Directory structure** - Source, test, docs locations

### Step 4: Detect AIWG State

AIWG checks what's installed:
- Core AIWG utilities (always available)
- SDLC framework (if installed)
- Marketing Kit (if installed)
- Deployed agents and commands
- Project artifacts in `.aiwg/`

### Step 5: Generate New File

The new file is built in layers (the "bootstrap pattern"):

```
┌─────────────────────────────────────────────────┐
│           Your Context File                      │
├─────────────────────────────────────────────────┤
│  1. PROJECT ANALYSIS                             │
│     Tech stack, commands, structure              │
├─────────────────────────────────────────────────┤
│  2. PROJECT ARTIFACTS (.aiwg/)                   │
│     @-mentions to your requirements,             │
│     architecture, and planning docs              │
├─────────────────────────────────────────────────┤
│  3. CORE AIWG REFERENCES                         │
│     Orchestration, agent design, error recovery  │
│     (Always available - no framework required)   │
├─────────────────────────────────────────────────┤
│  4. FRAMEWORK REFERENCES (if installed)          │
│     SDLC workflows, natural language mappings    │
├─────────────────────────────────────────────────┤
│  5. TEAM DIRECTIVES                              │
│     Your preserved custom content                │
└─────────────────────────────────────────────────┘
```

### Step 6: Write and Report

The file is written and you see a summary:

```
CLAUDE.md Regenerated
=====================

Backup: CLAUDE.md.backup-20251213-143512

Preserved: 2 sections, 15 lines
Regenerated: Project overview, structure, AIWG integration

Output: CLAUDE.md (287 lines)
```

---

## What Gets Preserved

Your custom content survives regeneration if marked properly.

### Method 1: Preserve Blocks

Wrap content in preserve comments:

```markdown
<!-- PRESERVE -->
## Our API Guidelines

- All endpoints must use kebab-case
- Authentication via Bearer tokens only
- Rate limiting: 100 requests/minute
<!-- /PRESERVE -->
```

### Method 2: Protected Section Names

Sections with these heading prefixes are automatically preserved:

- `Team *` (e.g., "Team Guidelines", "Team Standards")
- `Org *` (e.g., "Org Requirements", "Org Policies")
- `Definition of Done`
- `Project Rules`
- `Security Requirements`
- `Custom *`

```markdown
## Team API Standards

These standards are specific to our team and will survive regeneration.

- Use TypeScript for all new code
- 80% test coverage minimum
- PR reviews required from 2 team members
```

### Method 3: Inline Directives

Lines containing directive keywords are preserved:

```markdown
IMPORTANT: Never expose internal IDs in API responses
REQUIRED: All database queries must use prepared statements
DIRECTIVE: Use feature flags for all new functionality
```

---

## What Gets Updated

The regenerate command **updates** (replaces with fresh analysis):

- Project overview and tech stack
- Development commands table
- Project structure diagram
- AIWG framework sections
- Agent definitions and tool lists
- Command mappings
- Natural language translation patterns
- @-mention references to AIWG docs

Your preserved sections are then merged back in.

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

All regenerate commands support these flags:

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview changes without writing |
| `--show-preserved` | List detected preserved content and exit |
| `--no-backup` | Skip creating backup file |
| `--full` | Full regeneration - loses ALL custom content |

```text
/aiwg-regenerate --dry-run        # Preview changes
/aiwg-regenerate --show-preserved # See what's kept
/aiwg-regenerate                  # Run regeneration
/aiwg-regenerate --full           # Full regen (destructive!)
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
- Adding content to preserved sections
- Making normal code changes
- Updating `.aiwg/` artifacts (references are dynamic)

---

## Backup and Recovery

Every regeneration creates a timestamped backup:

```text
CLAUDE.md.backup-20251213-143022
```

To restore:
```bash
cp CLAUDE.md.backup-20251213-143022 CLAUDE.md
```

Old backups aren't automatically cleaned. Periodically remove them:
```bash
rm *.backup-* 2>/dev/null
```

---

## Troubleshooting

**Content not being preserved:**
1. Check preserve markers are exactly `<!-- PRESERVE -->` and `<!-- /PRESERVE -->`
2. Ensure section headings match protected patterns exactly
3. Run with `--show-preserved` to see what's detected

**Natural language not working:**
Run the regenerate command for your platform to re-establish mappings.

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
