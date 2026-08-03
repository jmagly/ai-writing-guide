---
enforcement: high
---

# Skill Placement Rules

**Enforcement Level**: HIGH
**Scope**: aiwg-development
**Addon**: aiwg-dev (devOnly)

## Overview

New skills, agents, commands, rules, and templates MUST go into an addon or framework directory under `agentic/code/`. Files placed directly into provider deployment directories (`.claude/`, `.github/`, `.cursor/`, etc.) are silently overwritten on the next `aiwg sync` and are invisible to the installer.

## Problem Statement

AIWG is a dogfooding project that deploys its own framework into `.claude/`, `.cursor/`, `.github/`, and other provider directories. This creates a persistent trap: the directories that an agent _sees_ (e.g. `.claude/skills/`) are deployment targets, not source locations. Work placed there is not part of the framework and will not survive the next sync.

Common mistakes:

- Creating `SKILL.md` directly in `.claude/skills/my-skill/` instead of `agentic/code/addons/<name>/skills/my-skill/`
- Placing an agent definition in `.claude/agents/my-agent.md` without a corresponding source file in `agentic/code/`
- Editing a deployed command file in `.github/prompts/` and expecting the change to persist
- Treating `.claude/rules/` as a place to author new rules

## Mandatory Rules

### Rule 1: Source in `agentic/code/`, Never in Provider Directories

All framework artifacts MUST be authored in `agentic/code/addons/<name>/` or `agentic/code/frameworks/<name>/`.

**FORBIDDEN**:
```
.claude/skills/my-new-skill/SKILL.md         ← deployment target, will be overwritten
.github/prompts/my-command.md                ← deployment target
.cursor/agents/my-agent.md                   ← deployment target
.warp/skills/my-skill/SKILL.md               ← deployment target
```

**REQUIRED**:
```
agentic/code/addons/my-addon/skills/my-new-skill/SKILL.md   ← source
agentic/code/addons/my-addon/rules/my-rule.md               ← source
agentic/code/frameworks/my-framework/agents/my-agent.md     ← source
```

### Rule 2: Ask "Is This in `agentic/code/`?" Before Creating

Before creating any new artifact, ask: is this file going into `agentic/code/`?

- If YES → proceed
- If NO → you are likely creating it in the wrong place

The only exception is `.aiwg/` for project-local artifacts (requirements, architecture docs, etc. for developing AIWG itself). See `addon-boundaries.md`.

### Rule 3: Edits to Deployed Files Do Not Propagate

If you need to fix a skill, agent, or command that is already deployed, edit the SOURCE file in `agentic/code/`, then run `aiwg use <addon>` or `aiwg sync` to redeploy. Editing the deployed copy has no effect on the source and will be overwritten.

## Detection Patterns

A placement violation exists when:

- A `SKILL.md` is found in `.claude/skills/`, `.cursor/skills/`, `.warp/skills/`, etc. but has NO corresponding source in `agentic/code/`
- An agent `.md` is found in `.claude/agents/`, `.github/agents/`, etc. but has NO corresponding source in `agentic/code/`
- A command `.md` is found in `.claude/commands/`, `.github/prompts/`, etc. but has NO corresponding source in `agentic/code/` or `src/extensions/commands/`
- A rule is found in `.claude/rules/` but has NO corresponding source in `agentic/code/`

The `validate-addon` and `dev-doctor` skills check for these violations automatically.

## Correct Workflow

```
1. Identify the addon or framework this artifact belongs to
2. Create the artifact in:
     agentic/code/addons/<addon-name>/<type>/<artifact-name>/
3. Register it in the addon's manifest.json
4. Run `aiwg use <addon>` to deploy to .claude/ and other providers
5. Verify the deployed copy looks correct
6. Commit the source (agentic/code/), not the deployment
```

## Platform Applicability

This rule applies to all AIWG deployment targets:

| Provider Directory | Is a Deployment Target |
|-------------------|----------------------|
| `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/rules/` | YES |
| `.github/agents/`, `.github/prompts/`, `.github/instructions/` | YES — Copilot provider artifacts |
| `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/rules/` | YES |
| `.warp/agents/`, `.warp/commands/`, `.warp/skills/` | YES |
| `.codex/agents/`, `~/.codex/prompts/`, `~/.codex/skills/` | YES |
| `.windsurf/workflows/`, `.windsurf/skills/`, `.windsurf/rules/` | YES |
| `.opencode/agent/`, `.opencode/command/`, `.opencode/skill/` | YES |
| `~/.openclaw/agents/`, `~/.openclaw/commands/`, `~/.openclaw/skills/` | YES |
| `agentic/code/addons/<name>/` | SOURCE — author here |
| `agentic/code/frameworks/<name>/` | SOURCE — author here |

## CI Workflow Files — Special Cases

`.github/workflows/` and `.gitea/workflows/` have a dual nature that requires precise handling:

### AIWG's own CI workflows

AIWG uses **Gitea as its authoritative CI**. GitHub is a publish-only mirror. AIWG's own CI workflows (test runners, release pipelines, extension publishing) belong in `.gitea/workflows/`, not `.github/workflows/`.

**CRITICAL**: AIWG has thousands of downstream users. A broken CI workflow that merges to main can cascade — breaking the release pipeline, publishing a bad version, or corrupting the npm package that users install. **Never add or modify `.gitea/workflows/` files without explicit human authorization.** See `aiwg-ci-safety.md`.

### CI hook templates for target projects

When AIWG deploys CI hooks to a user's project via `aiwg use <framework> --ci-hooks-enabled`, the source templates must live in:

```
agentic/code/frameworks/<name>/ci/github/workflows/   ← deployed to user's .github/workflows/
agentic/code/frameworks/<name>/ci/gitea/workflows/    ← deployed to user's .gitea/workflows/
```

**FORBIDDEN** — CI templates must NOT be stored in this repo's own forge directories:
```
.github/workflows/my-framework-hook.yml   ← would execute as AIWG's own CI
.gitea/workflows/my-framework-hook.yml    ← would execute as AIWG's own CI
```

The templates are inert data in `agentic/code/`. They only execute in the user's project after `--ci-hooks-enabled` deploys them there.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md — Source vs output boundary
- @$AIWG_ROOT/docs/development/aiwg-development-guide.md — Full contributor guide
- @$AIWG_ROOT/docs/extensions/creating-extensions.md — Extension creation walkthrough

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-4-1
