---
id: delivery-policy
severity: HIGH
applies_to: [all-agents]
tags: [git, workflow, project-config, branching]
---

# Delivery Policy Rule

**Enforcement Level**: HIGH
**Scope**: Every agent that recommends, plans, or executes git workflow actions (branching, commits, PRs, issue closure)
**Addon**: aiwg-utils (core, universal)

## Overview

AIWG projects declare their git delivery policy in `.aiwg/aiwg.config` under the `delivery` block. Agents MUST read and respect this configuration before recommending or executing branch creation, pull-request workflows, or issue closure patterns. The config is authoritative — agents must not invent a workflow from first principles when the project has already declared one.

### Default policy

**`delivery.mode: pr-required` is the default for newly scaffolded AIWG projects** and the runtime fallback if the field is missing or the file is absent. This is the safe default for shared repos and team projects: branch + PR + review. Solo developers and prototype projects can opt down to `feature-branch` (branch only, no PR) or `direct` (commit straight to main, no branch, no PR). The opt-down is via `aiwg config set --project delivery.mode <mode>` or by asking the **AIWG Steward** agent to change it.

## Problem Statement

A project's delivery policy reflects deliberate trade-offs (review overhead vs. velocity, single-developer vs. team workflow, CI requirements). Agents that ignore the policy and default to "feature branch + PR" — common in training data — impose ceremony on solo-developer projects and create churn. Agents that ignore the policy and default to "commit to main" on team projects bypass review.

The config exists. A handful of skills (`issue-create`, `issue-update`, `flow-delivery-track`) consume it. But agents reasoning about branching outside those skills — for example when answering "should I open a PR?" or when interactively asking the user via `AskUserQuestion` — frequently never see it.

## The `delivery` Block

Located at `.aiwg/aiwg.config` (top level), the `delivery` block contains:

```json
{
  "delivery": {
    "mode": "direct" | "feature-branch" | "pr-required",
    "default_branch": "main",
    "require_ci_green": true,
    "force_push_policy": "never" | "main-only-blocked" | "allowed",
    "auto_close_issues": true,
    "issue_comment_on_cycle": true,
    "rationale": "Free-text explaining why this mode was chosen"
  },
  "remotes": {
    "primary": "origin",
    "issue_tracker": "origin",
    "ci": "origin",
    "secondary": [ ... ]
  }
}
```

## Mandatory Rules

### Rule 1: Read the Delivery Block Before Any Git Workflow Action

Before recommending or executing **any** of:

- Creating a feature branch
- Opening a pull request
- Pushing to `main` (or `master` / `default_branch`)
- Force-pushing
- Closing an issue or referencing one in a commit message
- Asking the user to choose a branching strategy

The agent MUST read `.aiwg/aiwg.config` and consult the `delivery` block. The simplest method:

```bash
cat .aiwg/aiwg.config 2>/dev/null | jq -r '.delivery.mode // "unknown"'
```

If the file does not exist, treat as `delivery.mode: pr-required` (the team-default for shared repos) and surface the missing config to the user — they should run `aiwg init` so the policy is written down.

### Rule 2: Apply the Mode Literally

Each mode has a specific workflow. Agents MUST follow it without substituting their own preference.

**`delivery.mode: direct`** (single-developer projects, internal tools):

- Commit directly to `default_branch` after CI verification
- Do NOT create feature branches
- Do NOT open pull requests
- Reference issues with `Closes #N` / `Fixes #N` syntax in commit messages so they auto-close on push
- Still wait for CI green if `require_ci_green: true`
- Still confirm with user before destructive operations (force-push, history rewrites)

**`delivery.mode: feature-branch`** (small teams, flexible review):

- Create a feature branch off `default_branch`
- Push the branch to `remotes.primary`
- No pull request required
- Issues closed via commit message or manual closure
- CI still gates the merge

**`delivery.mode: pr-required`** (shared repos, formal review):

- Create a feature branch off `default_branch`
- Push to `remotes.primary`
- Open a pull request against `default_branch`
- Wait for review and CI green before merging
- Use `Closes #N` in PR body to link issues

### Rule 3: Use Configured Remotes, Not Guesses

Always resolve remote names through `aiwg.config.remotes`:

- Issues, PRs, milestones, labels → `remotes.issue_tracker`
- CI status checks → `remotes.ci`
- Tag pushes → `remotes.primary` (and `remotes.secondary[].push_on_release` if applicable)

Do not assume `origin` is the issue tracker. Do not assume GitHub. Read the config.

### Rule 4: Surface, Don't Re-Ask

When the policy is already declared, do NOT use `AskUserQuestion` (or equivalent interactive prompt) to ask the user "feature branch or direct to main?" — the answer is already in the config. Instead:

- Surface the configured mode in your status update ("Per `delivery.mode: direct`, I'll commit straight to main and use `Closes #N`")
- Only ask if there's a *specific reason to deviate* (e.g., the change is unusually large or risky), and explicitly frame it as a one-time exception.

### Rule 5: Respect Force-Push Policy

`force_push_policy` defines what's allowed:

- `never`: no force-push to any branch, ever
- `main-only-blocked`: force-push allowed on feature branches, never on `default_branch`
- `allowed`: force-push allowed everywhere (rare; only configure on solo projects)

Agents MUST NOT force-push outside the declared policy.

### Rule 6: CI Green Before Done

If `require_ci_green: true` (default), an action is not complete until the relevant CI run on `remotes.ci` is green. This applies regardless of mode. Agents must wait, check, and report.

## Detection Heuristics for Reviewers

When reviewing agent output for compliance:

- Did the agent ever cite `delivery.mode` or `aiwg.config`? If not, suspect violation.
- Did a single-developer project (mode: direct) end up with a PR? Violation.
- Did a shared repo (mode: pr-required) end up with a direct-to-main commit? Violation.
- Did an agent ask "feature branch or main?" via AskUserQuestion when the config already answered it? Violation.

## Rationale

The delivery policy is a project-level decision the user has already made. Re-deciding it per session — or worse, defaulting to a workflow that suits training-data norms rather than the actual project — wastes time, creates inconsistent history, and trains the user to expect re-litigation of settled questions.

This rule complements:

- **`instruction-comprehension`**: respect declared user preferences over inferred best practices
- **`human-authorization`**: don't invent ceremony (PR review) or skip it (direct commit) outside what the user has authorized at the project level
- **`research-before-decision`**: the project config IS the prior research; consult it before guessing

## See Also

- `aiwg config get --project delivery.mode` — CLI command to inspect current policy
- `aiwg config set --project delivery.mode <mode>` — change project policy
- `agentic/code/frameworks/sdlc-complete/skills/issue-create/SKILL.md` — example of a skill that reads `aiwg.config` properly
- `agentic/code/frameworks/sdlc-complete/skills/flow-delivery-track/SKILL.md` — delivery workflow integration
