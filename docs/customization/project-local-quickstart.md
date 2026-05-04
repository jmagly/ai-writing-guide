# Project-Local Bundles — 5-Minute Quickstart

Author your first project-local AIWG bundle without forking anything.

## What you'll build

A project-local extension that adds a custom rule to your project — only
your project, not anyone else's — and deploys it alongside the upstream
SDLC framework.

## Prerequisites

- AIWG installed: `aiwg version` returns ≥ `2026.5.0`
- A project with `.aiwg/aiwg.config` (run `aiwg init` if not)

## Steps

### 1. Scaffold

```bash
aiwg new-bundle my-team-rules --type extension --starter rule
```

Output:

```
✓ Scaffolded project-local extension 'my-team-rules' at /…/my-project/.aiwg/extensions/my-team-rules
  Files created:
    + manifest.json
    + README.md
    + rules/my-team-rules.md

Next steps:
  1. Edit manifest.json (description, version, keywords)
  2. Customize the starter artifact under .aiwg/extensions/my-team-rules/
  3. Deploy:  aiwg use my-team-rules
  4. Inspect: aiwg doctor --project-local
```

### 2. Customize the rule

Edit `.aiwg/extensions/my-team-rules/rules/my-team-rules.md`:

```markdown
---
id: no-vendored-edits
---

# no-vendored-edits

Never modify files under `vendor/` or `node_modules/`.

## Why
Vendored code is replaced wholesale on dependency updates, so any local
edit silently disappears the next time someone runs `npm install`.

## How to apply
If a fix needs to land in vendored code, file an upstream PR or vendor a
fork. Don't edit in place.
```

### 3. Deploy

```bash
aiwg use my-team-rules
```

The deploy pipeline picks up the bundle, validates it, runs shadow
resolution against the upstream registry, and writes
`.claude/rules/no-vendored-edits.md` (and the same for any other
configured providers).

### 4. Verify

```bash
aiwg doctor --project-local
```

You should see your bundle listed under "Project-local artifacts" with
zero validation errors and zero drift.

```bash
cat .aiwg/activity.log | tail -5
```

You'll see a `deploy` entry confirming the artifact landed.

### 5. Iterate

Edit the rule, re-run `aiwg use my-team-rules`, and the deployed file
gets refreshed. The `installed` registry entry's `artifactHashes` is
updated so a future `aiwg remove` can detect operator mutations.

### 6. Tidy up

```bash
aiwg remove my-team-rules
```

Reverts the deployed file. The bundle source under `.aiwg/extensions/`
is **never** deleted by `remove` — only `rm -rf` does that, and only
when you ask for it explicitly.

## What just happened

| You ran | What happened |
|---------|---------------|
| `aiwg new-bundle` | Created `.aiwg/extensions/my-team-rules/` with valid manifest + starter; if your `.gitignore` blanket-ignored `.aiwg/`, AIWG appended a managed un-ignore block so the bundle source is tracked by git |
| `aiwg use my-team-rules` | Discovered, validated, resolved shadows, deployed to provider paths, recorded artifactHashes |
| `aiwg doctor --project-local` | Reported counts, validation, shadows, drift, and any bundles silently git-ignored — all from the registry + filesystem |
| `aiwg remove my-team-rules` | Hash-checked deployed file (pristine), deleted it, dropped registry entry; source preserved |

### A note on `.gitignore`

AIWG-managed projects historically `.gitignore` the whole `.aiwg/` tree because most of its content is generated state (working scratch, ralph state, research corpora, etc.). Project-local bundle source under `.aiwg/{addons,extensions,frameworks,plugins}/` is the exception — it's operator-authored, and it should travel with the project.

`aiwg new-bundle` detects this and self-heals: when it finds a blanket `.aiwg/` ignore rule and no existing source-directory negation, it appends a sentinel-marked block:

```gitignore
# AIWG project-local bundle source — track these (managed by AIWG)
!.aiwg/aiwg.config
!.aiwg/addons/
!.aiwg/extensions/
!.aiwg/frameworks/
!.aiwg/plugins/
```

The block is idempotent (re-running `new-bundle` doesn't duplicate it) and a no-op when:
- there's no `.gitignore` (the project may not be using git)
- `.aiwg/` isn't blanket-ignored (you've configured selective ignores)
- you already have an explicit `!.aiwg/...` negation (you're managing this yourself)

If you adopted project-local bundles before this self-heal landed, run `aiwg doctor --project-local` — it surfaces any bundle whose `manifest.json` is currently git-ignored, with the exact lines to add to `.gitignore`.

## Next steps

- Add more artifacts (`skills/`, `agents/`, `commands/`) — see [`project-local-lifecycle.md`](project-local-lifecycle.md)
- Pick the right type for your next bundle — see [`extensions-vs-addons-vs-frameworks-vs-plugins.md`](extensions-vs-addons-vs-frameworks-vs-plugins.md)
- Graduate to upstream — see "Graduation" in the lifecycle doc
