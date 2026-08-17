---
enforcement: high
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
    "committer": {
      "name": "Joseph Magly",
      "email": "1159087+jmagly@users.noreply.github.com"
    },
    "signing": {
      "format": "openpgp" | "ssh" | "x509",
      "key": "0117DAAA677A5BF2",
      "key_file": "~/.config/.../signing.key",
      "program": "gpg",
      "enforce": "commits" | "tags" | "all"
    },
    "release_signing": {
      "format": "openpgp" | "ssh" | "x509",
      "key": "RELEASE_KEY_FINGERPRINT",
      "program": "tools/release/cut-tag.sh",
      "enforce": "tags"
    },
    "require_ci_green": true,
    "force_push_policy": "never" | "own-branch-only" | "allowed",
    "require_signed_commits": true,
    "auto_close_issues": true,
    "issue_comment_on_cycle": true,
    "rationale": "Free-text explaining why this mode was chosen"
  },
  "remotes": {
    "primary": "origin",
    "issue_tracker": "origin",
    "ci": "origin",
    "tracker_actor": {
      "login": "roctinam",
      "via": "tea" | "gh" | "mcp" | "api",
      "forbid_actors": ["roctibot"]
    },
    "transport": {
      "login": "roctinam",
      "protocol": "ssh" | "https",
      "helper": "tools/git/push-origin-as-roctinam.sh",
      "key_fingerprint": "SHA256:..."
    },
    "secondary": [ ... ]
  }
}
```

## Mandatory Rules

### Rule 0: Run The Project Config Preflight Before Tracker Or Git Writes

Before filing an issue, commenting on an issue, closing an issue, changing
labels or milestones, creating a branch, committing, pushing, opening a PR, or
preparing release tags, the agent MUST run a project-config preflight:

1. Resolve the target repository through the workspace `repos` list when one
   exists, check the requested operation with `aiwg repo-access check`, and read
   `.aiwg/aiwg.config` from the **target member repository**. Never apply the
   workspace root config or a sibling config to the target. In a single-repo
   project: Read `.aiwg/aiwg.config` from the repository root.
2. Resolve `remotes.primary`, `remotes.issue_tracker`, and `remotes.ci`.
3. Resolve `delivery.mode`, `delivery.default_branch`, commit and release-tag
   signing requirements, and `delivery.committer` when present.
4. Resolve `remotes.tracker_actor` for tracker mutations and reject any route
   that would write as a login listed in `remotes.tracker_actor.forbid_actors`.
5. Resolve `remotes.transport` for git pushes and verify its configured login,
   protocol, helper, and public key fingerprint rather than using an arbitrary
   available SSH credential.
6. Resolve tracker access for `remotes.issue_tracker` in this order:
   MCP/app tools for the configured tracker, tracker HTTP API with configured
   credentials, then the tracker CLI after confirming authentication.
7. If the config file is missing, unreadable, invalid, or ambiguous, stop and
   report the exact missing/ambiguous field instead of guessing a provider,
   remote, branch lifecycle, or commit identity.

This preflight is required for both issue workflows and commit/PR workflows.
Read-only issue inspection may use any available credential, but tracker
mutations and git delivery actions must follow the configured topology and
identity.

In a workspace, authorization and repo policy compose: the workspace member
must allow the operation and the target member config must provide the route
and workflow. An allowed `push` does not override
`delivery.force_push_policy`; a valid tracker route does not override a missing
`issue-comment` capability.

Do not infer tracker authority from whichever CLI is installed or authenticated.
An unauthenticated tracker CLI is one failed access path, not proof that the
configured tracker is unavailable. Git SSH remote access is sufficient for repo
sync, pushes, and tags only; it is not issue, PR, release, label, milestone, or
CI API access. If no MCP/app/API/CLI path can operate on the configured tracker,
stop and report a blocker. Do not file on a mirror or secondary remote just
because its CLI is authenticated unless the user explicitly asks for that.

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

### Rule 2.5: Keep Backup Mirrors Current

Projects may declare redundant mirrors under `remotes.secondary[]`:

```json
{
  "remotes": {
    "primary": "origin",
    "secondary": [
      { "name": "github", "purpose": "backup-mirror", "push_on_release": true }
    ]
  }
}
```

When `push_on_release: true`, release workflows MUST push release commits and tags to that mirror before declaring the release complete. Use `git-mirror-audit` to detect drift; do not assume a mirror is current because the remote exists.

### Rule 3: Use Configured Remotes, Not Guesses

Always resolve remote names through `aiwg.config.remotes`:

- Issues, PRs, milestones, labels → `remotes.issue_tracker`
- CI status checks → `remotes.ci`
- Tag pushes → `remotes.primary` (and `remotes.secondary[].push_on_release` if applicable)

Do not assume `origin` is the issue tracker. Do not assume GitHub. Read the config.
Prefer MCP/app/API access for the configured tracker before CLI access. Use a
tracker CLI only after confirming it targets the configured tracker and is
authenticated as an allowed actor.

Treat issue location as project topology, not as a separate provider-design
decision. If `remotes.issue_tracker` resolves to a git remote, derive the
tracker host from that remote URL and use the matching tracker tools. If the
project is configured for local issue storage instead of an external tracker,
use the AIWG issue CLI for local issue operations. Do not invent a parallel
issue-provider setting when `remotes.issue_tracker` already answers where
issues live.

### Rule 3.5: Use Configured Delivery Identity For Mutations

When delivery identity fields are present, they are authoritative for writes:

- Commits → use `delivery.committer.name` / `delivery.committer.email` when set; otherwise inherit normal `git config`.
- Commit signing → if `delivery.require_signed_commits: true` or `delivery.signing.enforce` covers commits, use `delivery.signing.format`, `delivery.signing.key` or `delivery.signing.key_file`, and `delivery.signing.program` where applicable.
- Release-tag signing → use `delivery.release_signing` when present; never fall back to the commit key merely because it is Git's configured `user.signingkey`.
- Git pushes → use `remotes.transport.login` through the declared protocol/helper and verify `key_fingerprint` when present.
- Issue comments, issue closures, PRs, labels, and milestone writes → use `remotes.tracker_actor.login` through `remotes.tracker_actor.via` when set.
- Never author delivery mutations as any login listed in `remotes.tracker_actor.forbid_actors`.

Read-only tracker operations may use any available credential, including an MCP token, because they do not create attribution. Delivery mutations must use the configured actor or stop and ask the operator to configure/authorize a route.

`aiwg doctor` warns when signed commits are required but no signing key/key file is declared, and when an issue tracker remote is configured without a `tracker_actor` in a repo likely to perform tracker writes.

### Rule 4: Surface, Don't Re-Ask

When the policy is already declared, do NOT use `AskUserQuestion` (or equivalent interactive prompt) to ask the user "feature branch or direct to main?" — the answer is already in the config. Instead:

- Surface the configured mode in your status update ("Per `delivery.mode: direct`, I'll commit straight to main and use `Closes #N`")
- Only ask if there's a *specific reason to deviate* (e.g., the change is unusually large or risky), and explicitly frame it as a one-time exception.

### Rule 5: Respect Force-Push Policy

`force_push_policy` defines what's allowed:

- `never`: no force-push to any branch, ever
- `own-branch-only`: force-push allowed on the agent's own feature branch, never on `default_branch`
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
- `aiwg config set --project delivery.signing.key <key-id>` — declare the signing key used for commits/tags
- `aiwg config set --project remotes.tracker_actor.login <login>` — declare the forge actor for issue/PR writes
- `agentic/code/frameworks/sdlc-complete/skills/issue-create/SKILL.md` — example of a skill that reads `aiwg.config` properly
- `agentic/code/frameworks/sdlc-complete/skills/flow-delivery-track/SKILL.md` — delivery workflow integration
