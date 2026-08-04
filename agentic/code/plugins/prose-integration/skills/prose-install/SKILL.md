---
namespace: aiwg
name: prose-install
description: Install OpenProse for AIWG when not found. Tries `npx skills add`, falls back to git clone, then saves the resolved path to .aiwg/config.json.
version: 0.1.0
platforms: [all]
requires:
  - "nothing: prose-install is self-contained — confirmation from user before installing"
ensures:
  - PROSE_ROOT: OpenProse installed and path validated at ~/.aiwg/prose/skills/open-prose
  - config-saved: path written to .aiwg/config.json prose.path for future prose-detect Signal 2
errors:
  - user-declined: user chose not to install when prompted
  - install-failed: both npx and git clone failed; network or permissions issue
invariants:
  - always confirms with user before installing — never installs silently
  - validates prose.md and forme.md exist after install before declaring success

---

# Prose Install Skill

You install OpenProse for AIWG use when `/prose-detect` reports no installation is found.

## Triggers

- Invoked by `/prose-detect` when all detection signals fail
- "install prose" / "install openprose"
- "prose install"
- "set up prose"

## Behavior

### Step 1: Confirm with User

Before installing, ask:

```
OpenProse is not installed. Install it to ~/.aiwg/prose/ so AIWG prose skills can use it?

  Primary method:   npx skills add openprose/prose
  Fallback method:  git clone https://github.com/openprose/prose ~/.aiwg/prose

[Y/n]
```

If the user declines, stop and report:

```
Installation cancelled. Set PROSE_ROOT to an existing OpenProse installation to proceed.
```

### Step 2: Try Primary Method

```bash
npx skills add openprose/prose --target ~/.aiwg/prose
```

If this succeeds and `~/.aiwg/prose/skills/open-prose/prose.md` exists, proceed to Step 4.

### Step 3: Fallback — git clone

If npx fails (not available or package not found):

```bash
git clone --depth=1 https://github.com/openprose/prose.git ~/.aiwg/prose
```

### Step 4: Validate Installation

Check that required files are present:

```bash
ls ~/.aiwg/prose/skills/open-prose/prose.md
ls ~/.aiwg/prose/skills/open-prose/forme.md
```

If either is missing, report failure:

```
Installation failed: prose.md or forme.md not found at ~/.aiwg/prose/skills/open-prose/.
Try cloning manually: git clone https://github.com/openprose/prose.git ~/.aiwg/prose
```

### Step 5: Save to Config

Write the resolved path to `.aiwg/config.json`:

```json
{
  "prose": {
    "path": "~/.aiwg/prose/skills/open-prose",
    "installedVia": "npx|git-clone",
    "installedAt": "2026-04-02T00:00:00Z"
  }
}
```

### Step 6: Report Success

```markdown
## OpenProse Installed

**Location**: ~/.aiwg/prose/skills/open-prose
**Method**: npx skills add | git clone
**prose.md**: present
**forme.md**: present
**Config saved**: .aiwg/config.json → prose.path

All prose-integration skills are now ready to use.
```

## Updating an Existing Installation

If OpenProse is already installed and the user wants to update:

```bash
cd ~/.aiwg/prose && git pull origin main
```

Or use `/prose-setup` which handles both install and update.

## Model

This skill runs on **Haiku** — it's confirmation prompts and shell commands.

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Explicit user confirmation required before installing
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Validate installation after each method before declaring success
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon configuration
