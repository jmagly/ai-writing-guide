---
namespace: aiwg
name: customize-rebuild
platforms: [all]
description: Rebuild and redeploy AIWG from local customization source — makes recent edits live
---

# Customize Rebuild

You rebuild and redeploy AIWG from the user's local clone so their recent edits go live. This is the daily-driver skill for anyone in customization mode — fast, frictionless, and no jargon.

## Triggers

- "apply my changes"
- "make this live" / "make it live"
- "rebuild" / "redeploy"
- "recompile"
- "push my edits live"
- "update my AIWG"
- "deploy my customizations"

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Apply changes | "apply my changes" | `aiwg use all` (fast path) |
| Full rebuild | "rebuild everything" | `npm run build` + `aiwg use all` |
| Redeploy only | "just redeploy" | `aiwg use all` only |

## Behavior

When triggered:

1. **Verify customization mode is active**:
   ```bash
   aiwg version  # should show [dev] and the repo path
   ```
   If not in dev mode, tell the user and offer to run `customize-setup`.

2. **Determine whether a TypeScript build is needed**:
   - Check if any `.ts` files changed since last build: `git -C <edgePath> diff --name-only HEAD -- src/ '*.ts'`
   - If only files in `agentic/code/` changed (agents, skills, rules, prompts) — **skip `npm run build`**, just run `aiwg use all`
   - If `src/`, `apps/web/`, or `package.json` changed — run `npm run build` first

   For simplicity: if uncertain, ask "Did you change any TypeScript source files, or just agents/rules/skills?" and act accordingly. Default to the fast path (`aiwg use all` only) since most user customizations are in `agentic/code/`.

3. **Fast path** (most common — editing agents, rules, skills):
   ```bash
   aiwg use all
   ```

4. **Full rebuild path** (when TS source changed):
   ```bash
   npm --prefix <edgePath> run build
   aiwg use all
   ```

5. **Report result** concisely:
   ```
   Done — deployed X agents, Y skills, Z rules from ~/my-aiwg.
   Changes are live in your next session.
   ```

Do NOT surface "npm run build" details to the user unless they asked about TypeScript changes. Just report "Done" with the deployment counts.

## Examples

### Example 1: Daily-use apply

**User**: "apply my changes"

**Action**: Check dev mode → `aiwg use all` (fast path, no TS changes detected)

**Response**: "Done — deployed 180 agents, 360 skills, 16 rules from ~/my-aiwg."

### Example 2: After adding a rule file

**User**: "I added a rule, make it live"

**Action**: `aiwg use all` (rule files are in `agentic/code/`, no build needed)

**Response**: "Done — your new rule is live. 181 rules deployed."

### Example 3: After editing TypeScript

**User**: "I changed some TypeScript source, rebuild everything"

**Action**: `npm run build` → `aiwg use all`

**Response**: "Built and deployed from ~/my-aiwg. All changes are live."

## Clarification Prompts

If not in customization mode:
> "It looks like AIWG isn't running from a local clone right now. Want me to set up customization mode first?"

## References

- @$AIWG_ROOT/bin/aiwg.mjs — dev mode delegation logic
- @$AIWG_ROOT/src/channel/manager.mjs — `loadConfig()` for edgePath
- @$AIWG_ROOT/docs/customization/README.md — Customization guide
