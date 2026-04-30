---
namespace: aiwg
name: customize-setup
platforms: [all]
description: Set up personal AIWG customization mode from a local clone or fork — makes your clone the live global AIWG instance so edits go live immediately
---

# Customize Setup

You set up AIWG in **personal customization mode** — where a local clone or fork of the AIWG repo becomes the user's global AIWG instance. Any edits they make to that clone go live on next rebuild.

This is the **ownership** story, not the developer/contributor story. Frame everything around "make it yours," not "build for the repo."

## Triggers

- "set up AIWG customization mode"
- "I want to customize AIWG live"
- "make AIWG mine" / "make it mine"
- "set up my personal AIWG"
- "fork and customize AIWG"
- "I want to edit my agents and rules"
- "how do I customize AIWG?"

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Fork path | "set up AIWG with my own fork" | gh fork + clone + dev mode |
| Clone path | "clone AIWG so I can customize it" | git clone + dev mode |
| From existing clone | "I already cloned AIWG, set it up" | Just run dev mode + deploy |
| Vague customization | "I want to tweak my AIWG setup" | Ask fork or clone, then proceed |

## Behavior

When triggered:

1. **Ask one question** (if not already clear from context):
   > "Do you want to fork AIWG on GitHub first (recommended — keeps your changes safe when upstream releases), or just clone it locally to get started?"

   - Fork: user gets their own copy on GitHub, upstream sync works, can PR back
   - Clone: fastest start, no upstream sync later

2. **Determine target path** — ask where to put the clone (default: `~/my-aiwg`):
   > "Where should I clone it? (default: ~/my-aiwg)"

3. **Execute the appropriate path:**

### Fork Path

Requires `gh` CLI logged into GitHub.

```bash
# Fork jmagly/aiwg to user's GitHub account + clone + set upstream remote
gh repo fork jmagly/aiwg --clone --remote --clone-dir ~/my-aiwg

# Switch AIWG to use this fork as the global source
aiwg --use-dev ~/my-aiwg

# Build (compiles TypeScript + web app)
npm --prefix ~/my-aiwg run build

# Deploy from local source
aiwg --prefix ~/my-aiwg use all
```

Verify remotes after fork:
```bash
cd ~/my-aiwg && git remote -v
# origin    https://github.com/USER/aiwg.git    (their fork)
# upstream  https://github.com/jmagly/aiwg.git  (canonical)
```

### Local Clone Path

```bash
git clone https://github.com/jmagly/aiwg.git ~/my-aiwg

aiwg --use-dev ~/my-aiwg

npm --prefix ~/my-aiwg run build

aiwg --prefix ~/my-aiwg use all
```

No upstream remote is set — note to user that "sync my AIWG" won't work until they add one.

### From Existing Clone

If user says they already have a clone at a specific path:
```bash
# Skip clone step, just activate dev mode and deploy
aiwg --use-dev <their-path>
npm --prefix <their-path> run build
aiwg --prefix <their-path> use all
```

4. **Confirm success** — run `aiwg version` to show `[dev]` mode is active, then report:

```
Your AIWG is now running from ~/my-aiwg.

Any changes you make there go live when you say "apply my changes."

What you can customize:
  agentic/code/addons/aiwg-utils/rules/   — rules (how Claude behaves)
  agentic/code/addons/aiwg-utils/agents/  — agents (specialized personas)
  agentic/code/addons/aiwg-utils/skills/  — skills (slash commands)

Try it: ask me to "add a rule that [something personal to you]" and then "apply my changes."
```

Do NOT mention manifest.json, npm build internals, or addon taxonomy unless the user specifically asks.

## Examples

### Example 1: Fork setup

**User**: "Set up AIWG so I can customize it with my own fork"

**Action**: Ask where to clone → `gh repo fork jmagly/aiwg --clone --remote --clone-dir ~/my-aiwg` → `aiwg --use-dev ~/my-aiwg` → `npm run build` → `aiwg use all` → verify `aiwg version`

**Response**: "Your fork is now your global AIWG. Edit anything in ~/my-aiwg and tell me 'apply my changes' when ready."

### Example 2: Quick local clone

**User**: "I just want to tweak my AIWG setup, don't need a fork"

**Action**: `git clone` → `aiwg --use-dev` → `npm run build` → `aiwg use all`

**Response**: "AIWG is now running from ~/my-aiwg. No upstream sync (you cloned without forking), but you can customize freely. Say 'apply my changes' after any edit."

### Example 3: Already have a clone

**User**: "I already cloned AIWG to ~/dev/aiwg, can I use that?"

**Action**: Confirm path → `aiwg --use-dev ~/dev/aiwg` → `npm run build` → `aiwg use all`

**Response**: "Done — AIWG is now running from ~/dev/aiwg."

## Clarification Prompts

- "Do you want to fork on GitHub first (recommended), or just clone locally?"
- "Where should I put the clone? (e.g. ~/my-aiwg)"
- "Do you already have a clone somewhere I can use?"

## References

- @$AIWG_ROOT/bin/aiwg.mjs — `--use-dev` flag handler
- @$AIWG_ROOT/src/channel/manager.mjs — `switchToDev()` implementation
- @$AIWG_ROOT/docs/customization/README.md — User customization guide
