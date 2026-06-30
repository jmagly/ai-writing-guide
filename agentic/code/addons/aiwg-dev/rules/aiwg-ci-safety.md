---
enforcement: high
---

# AIWG CI Safety

**Enforcement Level**: HIGH
**Scope**: aiwg-development
**Addon**: aiwg-dev (devOnly)

## Overview

AIWG is both a framework and a dogfooding project. Changes to AIWG's own CI (`.gitea/workflows/`) directly affect the release pipeline that publishes to npm — reaching thousands of downstream users and projects. A single bad workflow merge can break the publish pipeline, ship a corrupt package, or trigger unreviewed agentic automation against the repo itself.

CI changes require more care here than in any ordinary project.

## The Downstream Risk

Every AIWG release is consumed by users who run `aiwg use sdlc`, `aiwg use marketing`, etc. to deploy agents, skills, and rules into their own projects. If AIWG ships a broken release:

- Every user's next `aiwg sync` ingests the breakage
- Deployed agents and skills may malfunction silently
- Recovery requires users to manually roll back or wait for a patch

The blast radius of a broken AIWG CI run is proportional to the install base. This is not a normal project.

## Mandatory Rules

### Rule 1: Never Modify `.gitea/workflows/` Without Human Authorization

Adding, editing, or removing files in `.gitea/workflows/` requires explicit human authorization before committing. This includes:

- New workflow files
- Changes to trigger conditions (`on:`, `branches:`, `paths:`)
- Changes to secrets usage
- Changes to deployment steps

**Pattern**: propose the change in an issue or PR comment, await explicit approval, then implement.

This is `human-authorization` applied to CI specifically. See `aiwg-utils/rules/human-authorization.md` for the general pattern.

### Rule 2: CI Hook Templates Are Not AIWG's Own CI

CI workflow files intended for deployment into user projects via `aiwg use --ci-hooks-enabled` are **source templates**, not CI. They belong in:

```
agentic/code/frameworks/<name>/ci/github/workflows/
agentic/code/frameworks/<name>/ci/gitea/workflows/
```

**NEVER** place these in `.gitea/workflows/` or `.github/workflows/` in this repo. They would execute as AIWG's own CI on every push — unintended and potentially dangerous.

### Rule 3: Gitea Is Authoritative CI — GitHub Is Publish Mirror

| Remote | Purpose | CI workflows |
|--------|---------|-------------|
| `origin` (git.integrolabs.net) | Authoritative — all development | `.gitea/workflows/` |
| `github` (github.com) | Publish mirror only | `.github/workflows/` only for GitHub-specific publish steps (e.g., VS Code Marketplace) |

Do not duplicate CI between `.gitea/` and `.github/`. If a workflow only makes sense on GitHub (e.g., GitHub Releases, VS Code Marketplace publish), it may live in `.github/workflows/` — but must still be reviewed before committing.

### Rule 4: Test Changes Locally Before Touching CI

Before any CI workflow change:

1. Run `npm test` locally — all tests must pass
2. Run `npm run uat` — all UAT tests must pass
3. Verify the change does not affect trigger conditions for unrelated workflows
4. Have a rollback plan (previous workflow commit to revert to)

### Rule 5: No Agentic Self-Modification of CI

An agent (including Claude Code in this repo) must not autonomously modify `.gitea/workflows/` or `.github/workflows/` in response to task instructions. Agents may **propose** CI changes by filing an issue or writing a draft, but must stop short of committing to forge directories without explicit user approval in the same session.

**Why**: Agentic CI edits are fast, hard to review in context, and have immediate downstream effects once merged. The value of a human pause before CI changes outweighs the cost of the delay.

## What Agents May Do

| Action | Allowed? |
|--------|---------|
| Draft a workflow file and show it to the user | YES |
| Store a CI template in `agentic/code/frameworks/<name>/ci/` | YES |
| File an issue proposing a CI change | YES |
| Modify `.gitea/workflows/` after explicit user approval in the session | YES, once |
| Autonomously modify `.gitea/workflows/` as part of a larger task | NO |
| Copy CI templates to `.gitea/workflows/` as a "deployment" step | NO — that is for user projects only |

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md — Source vs output boundary, CI template placement
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/skill-placement.md — CI workflow special cases
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Authorization pattern

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-4-3
