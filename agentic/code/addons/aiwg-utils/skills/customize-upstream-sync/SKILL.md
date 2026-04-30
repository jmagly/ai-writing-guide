---
namespace: aiwg
name: customize-upstream-sync
platforms: [all]
description: Pull the latest upstream AIWG updates into the user's fork and rebuild — preserves user customizations
---

# Customize Upstream Sync

You pull the latest upstream AIWG changes into the user's fork, handle conflicts (preserving user customizations), rebuild, and report what changed. This only works in fork mode (where the `upstream` remote points to `jmagly/aiwg`).

## Triggers

- "sync my AIWG"
- "pull in the latest AIWG updates"
- "update my fork"
- "update my AIWG from upstream"
- "what's new in upstream AIWG?"
- "pull upstream changes"
- "get the latest AIWG"

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Sync request | "sync my AIWG" | Full upstream sync + rebuild |
| Check only | "what's new in upstream?" | Fetch + diff summary, no merge |
| Update request | "update my fork" | Full upstream sync + rebuild |

## Behavior

When triggered:

1. **Verify fork mode** — `upstream` remote must exist:
   ```bash
   git -C <edgePath> remote get-url upstream
   ```
   If no `upstream` remote, explain: "This only works if you forked AIWG. Your clone doesn't have an upstream remote. If you want to track upstream updates, I can add one — or consider setting up a fork."

2. **Show what's incoming** (before merging):
   ```bash
   git -C <edgePath> fetch upstream
   git -C <edgePath> log HEAD..upstream/main --oneline
   ```
   Report: "Here's what upstream has (N commits):" with the log summary.

3. **If check-only** ("what's new") — stop here. Don't merge unless user confirms.

4. **Merge**:
   ```bash
   git -C <edgePath> merge upstream/main
   ```

5. **Handle conflicts**:
   - If clean merge: proceed to rebuild
   - If conflicts: run `git -C <edgePath> diff --name-only --diff-filter=U`
   - For each conflicted file:
     - If it's a user-added file (new file, not in upstream): auto-resolve keeping user's version
     - If it's an upstream file the user also modified: **pause and show the diff**, ask which version to keep
   - After all conflicts resolved: `git -C <edgePath> commit --no-edit`

6. **Rebuild and redeploy**:
   ```bash
   npm --prefix <edgePath> run build
   aiwg use all
   ```

7. **Push fork** (so GitHub fork stays current):
   ```bash
   git -C <edgePath> push origin main
   ```

8. **Report**:
   ```
   Synced to upstream/main (N commits merged).

   What changed upstream:
     - New skill: agentic/code/.../new-skill
     - Updated agent: agentic/code/.../some-agent.md
     + 3 more changes

   Your customizations: preserved (2 files unaffected)
   
   Deployed and pushed to your fork.
   ```

## Conflict Strategy

- **User-only files** (new files the user added): always preserve, never overwrite
- **Upstream-modified files the user also touched**: pause, show diff, ask
- **Pure upstream changes** (files user never touched): auto-accept upstream version

When in doubt, keep the user's version and flag it for review.

## Examples

### Example 1: Clean sync

**User**: "sync my AIWG"

**Action**: fetch → log 5 new commits → merge (clean) → build → `aiwg use all` → push

**Response**: "Synced — 5 upstream commits merged, 0 conflicts. Your 2 customizations untouched. Rebuilt and pushed to your fork."

### Example 2: Check only

**User**: "what's new in upstream AIWG?"

**Action**: fetch → `git log HEAD..upstream/main --oneline`

**Response**: "Upstream has 3 new commits: [list]. Say 'sync my AIWG' to pull them in."

### Example 3: Conflict

**User**: "sync my AIWG"

**Action**: fetch → merge → conflict in `agentic/code/addons/aiwg-utils/agents/aiwg-steward.md` (user modified it too)

**Response**: "Upstream changed aiwg-steward.md which you've also modified. Here's the diff: [diff]. Keep yours, keep upstream's, or merge manually?"

## Clarification Prompts

- "This will merge N upstream commits into your fork. Proceed?"
- "Upstream changed [file] which you also modified. Keep your version, upstream's version, or should I show you the diff?"

## References

- @$AIWG_ROOT/src/channel/manager.mjs — edgePath config
- @$AIWG_ROOT/docs/customization/fork-workflow.md — Fork lifecycle docs
