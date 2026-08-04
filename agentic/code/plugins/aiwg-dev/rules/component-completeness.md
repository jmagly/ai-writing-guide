---
enforcement: medium
---

# Component Completeness Rules

**Enforcement Level**: MEDIUM
**Scope**: aiwg-development
**Addon**: aiwg-dev (devOnly)

## Overview

Each AIWG artifact type has a minimum set of required files and registrations. A component that is missing any required element is incomplete and must not be shared, merged, or submitted as done. Incomplete components cause silent failures at deployment time.

## Problem Statement

Common incompleteness patterns that reach code review:

- A SKILL.md exists but the skill is not listed in the addon's `manifest.json` — the deployment pipeline ignores it
- An agent has a description file but missing required frontmatter fields — the provider cannot load it
- A command has a TypeScript definition in `definitions.ts` but no handler — the CLI throws at runtime
- A rule file exists but is not included in `RULES-INDEX.md` — it is never deployed
- An addon directory exists but has no `README.md` — users cannot understand what it does

## Required Files by Artifact Type

### Skill

| Requirement | Detail |
|-------------|--------|
| `SKILL.md` | Must exist in `skills/<name>/SKILL.md` |
| `description:` frontmatter | Required field in SKILL.md YAML frontmatter |
| Title section | `# Title` at minimum |
| Process or Behavior section | `## Process` or `## Behavior` describing what the skill does |
| Manifest registration | Skill name listed in parent addon's `manifest.json` `skills` array |

**Minimal valid SKILL.md**:
```yaml
---
description: One-sentence description of what this skill does
platforms:
  - claude-code
---

# Skill Name

Brief intro sentence.

## Triggers

- "phrase that activates this skill"

## Behavior

What the skill actually does, step by step.

## Examples

At least one example showing input and expected output.
```

### Agent

| Requirement | Detail |
|-------------|--------|
| Agent `.md` file | In `agents/<name>.md` or `agents/<name>/agent.md` |
| `name:` frontmatter | Required YAML frontmatter field |
| `description:` frontmatter | Required YAML frontmatter field |
| `model:` frontmatter | Required YAML frontmatter field |
| `tools:` frontmatter | Required YAML frontmatter field (may be empty array) |
| Manifest registration | Agent name listed in parent addon's `manifest.json` `agents` array |

### Command (CLI)

| Requirement | Detail |
|-------------|--------|
| Definition entry | Entry in `src/extensions/commands/definitions.ts` |
| Handler OR skill flag | TypeScript handler in `src/cli/handlers/` registered in `allHandlers`, OR `executedViaSkillRunner: true` with a self-contained SKILL.md |
| No circular call | If `executedViaSkillRunner: true`, SKILL.md must not invoke `aiwg <same-command>` (see `no-circular-skill-calls.md`) |

### Addon

| Requirement | Detail |
|-------------|--------|
| `manifest.json` | Required at addon root |
| `id` field | Required in manifest |
| `type` field | Required in manifest (must be `"addon"`) |
| `name` field | Required in manifest |
| `version` field | Required in manifest (CalVer: `YYYY.M.PATCH`) |
| `description` field | Required in manifest |
| `README.md` | Required at addon root |
| At least one artifact | Addon must contain skills, agents, rules, commands, or templates |

### Behavior

| Requirement | Detail |
|-------------|--------|
| `BEHAVIOR.md` | Must exist in `behaviors/<name>/BEHAVIOR.md` |
| `name:` frontmatter | Required field |
| `description:` frontmatter | Required field |
| `platforms:` frontmatter | Required field — **must list only daemon-capable platforms** (e.g. `[openclaw, claude-code]`). Behaviors require a persistent process for trigger management and lifecycle hooks; `platforms: [all]` is never correct for behaviors. Include a comment above the field explaining the restriction. |
| `triggers:` frontmatter | Required — at least one trigger phrase or event |
| `hooks:` or `mode: agent` | At least one hook definition OR `mode: agent` with agent routing config |

**Minimal valid BEHAVIOR.md**:
```yaml
---
name: my-behavior
version: 1.0.0
description: One-sentence description.
# platforms restricted to daemon-capable systems — behaviors require a persistent
# process for trigger management and lifecycle hooks
platforms: [openclaw, claude-code]

triggers:
  - "phrase that activates this behavior"

hooks:
  on_file_write:
    - filter: "src/**/*.ts"
      action: run_script
      script: scripts/main.sh
---
```

### Rule

| Requirement | Detail |
|-------------|--------|
| Rule `.md` file | In `rules/<name>.md` |
| `name:` in body | Rule name heading or frontmatter |
| Priority level | `**Enforcement Level**: HIGH/MEDIUM/LOW` in rule body |
| `RULES-INDEX.md` entry | Rule listed in addon's `rules/RULES-INDEX.md` with summary and "When to apply" |

## Completeness Checklist

Use this checklist before marking any artifact as done:

### Skill Checklist

- [ ] `SKILL.md` exists at `skills/<name>/SKILL.md`
- [ ] `description:` field present in frontmatter
- [ ] `# Title` section present
- [ ] `## Behavior` or `## Process` section present
- [ ] At least one `## Examples` entry
- [ ] Skill listed in `manifest.json` `skills` array
- [ ] If `executedViaSkillRunner: true`, no circular CLI call

### Agent Checklist

- [ ] Agent `.md` file exists
- [ ] `name:`, `description:`, `model:`, `tools:` all in frontmatter
- [ ] Agent listed in `manifest.json` `agents` array

### Command Checklist

- [ ] Entry in `src/extensions/commands/definitions.ts`
- [ ] TypeScript handler registered in `allHandlers` OR `executedViaSkillRunner: true`
- [ ] If skill-executed: SKILL.md is self-contained (no circular call)

### Addon Checklist

- [ ] `manifest.json` with `id`, `type`, `name`, `version`, `description`
- [ ] `README.md` at addon root
- [ ] All listed skills have `SKILL.md` files
- [ ] All listed agents have properly formed `.md` files
- [ ] All listed rules exist and have `RULES-INDEX.md` entries
- [ ] No deployment-target files without `agentic/code/` source (see `skill-placement.md`)

### Behavior Checklist

- [ ] `BEHAVIOR.md` exists at `behaviors/<name>/BEHAVIOR.md`
- [ ] `name:`, `description:`, `platforms:`, `triggers:` all present in frontmatter
- [ ] `platforms:` lists only daemon-capable systems (never `[all]`)
- [ ] Comment above `platforms:` explains the daemon restriction
- [ ] At least one `hooks:` entry OR `mode: agent` with routing config

### Rule Checklist

- [ ] Rule `.md` file exists in `rules/<name>.md`
- [ ] Name and enforcement level present in rule body
- [ ] Entry in `rules/RULES-INDEX.md` with summary and "When to apply"

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/skill-placement.md — Placement requirements
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/no-circular-skill-calls.md — Skill-executed command requirements
- @$AIWG_ROOT/src/extensions/commands/definitions.ts — Command definition registry
- @$AIWG_ROOT/src/extensions/types.ts — Extension type definitions
- @$AIWG_ROOT/docs/extensions/creating-extensions.md — Extension creation guide

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-4-1
