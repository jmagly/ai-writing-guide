---
namespace: aiwg
name: prose-setup
description: Clone or update the OpenProse repository to ensure AIWG prose tools hook into the latest version of the specification and examples
version: 0.1.0
platforms: [all]

---

# Prose Setup Skill

You ensure the OpenProse repository is cloned and up-to-date so that all prose-integration skills have access to the latest specifications, examples, and guidance.

## Triggers

- "setup prose" / "install prose" / "install openprose"
- "update prose" / "update openprose"
- "clone prose repo"
- "ensure prose is available"
- "prose setup"

## Behavior

### Step 1: Check Current State

Check if OpenProse is already cloned:

```bash
# Check default location
ls /tmp/prose/skills/open-prose/prose.md 2>/dev/null

# Check configured location (from addon config proseRoot)
```

### Step 2: Clone or Update

**If not present** — clone from GitHub:

```bash
git clone https://github.com/openprose/prose.git /tmp/prose
```

**If already present** — pull latest:

```bash
cd /tmp/prose && git pull origin main
```

### Step 3: Verify Installation

After clone/update, verify key files exist:

| File | Purpose | Required |
|------|---------|----------|
| `skills/open-prose/prose.md` | Prose VM specification | Yes |
| `skills/open-prose/forme.md` | Forme Container specification | Yes |
| `skills/open-prose/guidance/patterns.md` | Design patterns | Yes |
| `skills/open-prose/guidance/antipatterns.md` | Antipatterns guide | Yes |
| `skills/open-prose/guidance/tenets.md` | Design tenets | Yes |
| `skills/open-prose/examples/` | Example programs (50+) | Yes |

### Step 4: Report Version

```bash
cd /tmp/prose && git log -1 --format="%H %ci %s"
```

### Step 5: Output Summary

```markdown
## OpenProse Setup Complete

**Location**: /tmp/prose
**Version**: {commit hash} ({date})
**Latest commit**: {subject}

### Verified Files
- [x] prose.md (Prose VM spec)
- [x] forme.md (Forme Container spec)
- [x] guidance/ (patterns, antipatterns, tenets)
- [x] examples/ ({count} examples)

### Available Skills
All prose-integration skills now have access to the latest OpenProse specification:
- `/prose-reader` — parse contracts
- `/prose-run` — execute programs
- `/prose-validate` — validate grammar
- `/forme-manifest` — generate wiring manifests
```

## Custom Install Location

If the user wants Prose installed somewhere other than `/tmp/prose`, they can configure it:

```yaml
# In aiwg.yml
addons:
  prose-integration:
    proseRoot: /path/to/prose/skills/open-prose
    proseRepoPath: /path/to/prose
```

The clone target is `proseRepoPath` (repo root), and `proseRoot` is `{proseRepoPath}/skills/open-prose`.

## Auto-Setup

Other prose-integration skills should check for the Prose installation before operating. If not found, suggest running `/prose-setup` first:

```markdown
OpenProse not found at /tmp/prose/skills/open-prose/prose.md

Run `/prose-setup` to clone the latest OpenProse repository, or configure
a custom path in aiwg.yml under addons.prose-integration.proseRoot
```

## Model

This skill runs on **Haiku** — it's just git operations and file checks.

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Verify installation state before cloning or pulling
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Confirm custom install location with user when non-default path requested
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon configuration
