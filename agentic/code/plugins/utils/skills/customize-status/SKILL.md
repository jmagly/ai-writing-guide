---
namespace: aiwg
name: customize-status
platforms: [all]
description: Show current AIWG customization status — mode, source path, what you've customized vs upstream
---

# Customize Status

You report the current AIWG customization status: whether the user is in customization mode, what path their AIWG runs from, how many customizations they've made, and whether upstream has new commits they haven't pulled yet.

## Triggers

- "what have I customized?"
- "show my changes"
- "what's my AIWG setup?"
- "am I in customize mode?"
- "customization status"
- "what does my AIWG look like?"
- "how different is my AIWG from the default?"

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Mode check | "am I in customize mode?" | `aiwg version` check |
| Changes summary | "what have I customized?" | git diff vs upstream |
| Full status | "customization status" | Full report |

## Behavior

When triggered:

1. **Check current mode**:
   ```bash
   aiwg version
   ```
   Look for `[dev]` in output and the edgePath. If not in dev mode, report that and offer to run `customize-setup`.

2. **Load edgePath** from config (or parse from `aiwg version` output).

3. **Detect fork vs clone** — check if `upstream` remote exists:
   ```bash
   git -C <edgePath> remote -v
   ```

4. **Summarize customizations** — files the user added or modified vs what's in the repo:
   ```bash
   # If fork (upstream remote exists):
   git -C <edgePath> diff upstream/main --name-only -- agentic/code/ .claude/

   # If local clone only:
   git -C <edgePath> status --short -- agentic/code/ .claude/
   ```
   Group by type: rules, agents, skills, prompts.

5. **Check upstream staleness** (fork mode only):
   ```bash
   git -C <edgePath> fetch upstream --dry-run 2>&1 | grep -c "^From" || echo "0"
   git -C <edgePath> rev-list HEAD..upstream/main --count
   ```

6. **Report** in plain language:

```
AIWG Customization Status

  Mode:     live (fork)
  Source:   ~/my-aiwg
  Fork:     github.com/user/aiwg
  Upstream: github.com/jmagly/aiwg — 3 commits ahead

  Your customizations (4 files):
    rules/   my-conventions.md      (3 days ago)
             team-style.md          (1 week ago)
    agents/  domain-specialist.md   (2 days ago)
    skills/  my-shortcuts/SKILL.md  (1 day ago)

  → Say "apply my changes" to redeploy
  → Say "sync my AIWG" to pull the 3 upstream commits
```

If no customizations yet:
```
  Your customizations: none yet

  Try: "add a rule that [something personal]" then "apply my changes"
```

## Examples

### Example 1: Full status check

**User**: "what have I customized?"

**Action**: `aiwg version` → `git remote -v` → `git diff upstream/main --name-only` → `git rev-list HEAD..upstream/main --count`

**Response**: Full status report as above.

### Example 2: Quick mode check

**User**: "am I in customize mode?"

**Action**: `aiwg version`

**Response**: "Yes — AIWG is running from ~/my-aiwg [dev mode]. You have 2 customizations."

### Example 3: Not in customize mode

**User**: "customization status"

**Action**: `aiwg version` → not in dev mode

**Response**: "AIWG is running from the npm package (not in customization mode). Say 'set up AIWG customization mode' to get started."

## Clarification Prompts

None needed — report what you find.

## References

- @$AIWG_ROOT/src/channel/manager.mjs — `loadConfig()` for edgePath and channel
- @$AIWG_ROOT/docs/customization/README.md — Customization guide
