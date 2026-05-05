# AIWG Project Config Reference

## Overview

`.aiwg/aiwg.config` is the project-level record AIWG agents and the CLI consult to determine
which AI provider toolchains a project targets, which frameworks and addons are deployed,
what user-defined scripts are runnable via `aiwg run`, the repo remote topology, and the
git delivery policy agents must follow.

This document is the source-of-truth reference for fields the loader at
`src/config/aiwg-config.ts` actually parses. Fields not documented here are not
recognized by the loader.

## File Location and Discovery

The config lives at:

```text
<project-root>/.aiwg/aiwg.config
```

It is JSON-formatted (despite the missing `.json` extension). The loader resolves the
path via `getConfigPath(projectDir)` and reads it through `readAiwgConfig(projectDir)`,
which returns `null` if the file does not exist.

The active project directory is resolved with this precedence:

1. `--target <path>` or `--prefix <path>` flag in CLI args
2. The handler context's `cwd` (when invoked programmatically)
3. `process.cwd()`

Writes are atomic: the loader writes to a randomly-suffixed temp sibling, then
`rename()`s into place to prevent partial-write corruption.

## Top-Level Structure

| Field       | Type                             | Required | Description                                                                                                                                           |
| ----------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$schema`   | string                           | optional | Schema URL hint for editors. Default: `https://aiwg.io/schemas/aiwg.config.v1.json`.                                                                  |
| `version`   | `"1"`                            | yes      | Schema version literal.                                                                                                                               |
| `providers` | `string[]`                       | yes      | AI provider toolchains this project targets. `aiwg use <framework>` with no `--provider` deploys to all of these. Defaults to `["claude"]` if absent. |
| `installed` | `Record<string, InstalledEntry>` | yes      | Frameworks and addons currently deployed, keyed by the name passed to `aiwg use`. Defaults to `{}`.                                                   |
| `scripts`   | `Record<string, string>`         | yes      | User-defined scripts, run via `aiwg run <name>`. Executed with `sh -c "<command>"` (or `cmd /c` on Windows). Defaults to `{}`.                        |
| `remotes`   | `RemotesConfig`                  | optional | Repo origin topology. When absent, agents treat `origin` as primary. See [Remotes Block](#remotes-block).                                             |
| `delivery`  | `DeliveryConfig`                 | optional | Repo control / delivery policy. When absent, runtime defaults apply. See [Delivery Block](#delivery-block).                                           |

Valid `providers` values: `claude`, `factory`, `codex`, `opencode`, `copilot`, `cursor`,
`warp`, `windsurf`, `hermes`, `openclaw`.

### `installed` entry shape

Each entry under `installed` records one deployment.

| Field             | Type                                                  | Description                                                                    |
| ----------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `version`         | string                                                | Deployed version (CalVer or semver).                                           |
| `source`          | union string (see below)                              | Provenance tag — see allowed values after the table.                           |
| `installedAt`     | ISO-8601 string                                       | Timestamp of last deployment.                                                  |
| `deployedTo`      | `Record<provider, {agents, commands, skills, rules}>` | Per-provider artifact counts.                                                  |
| `manifestHash`    | string                                                | Optional `sha256:...` of `manifest.json` at deploy time, for stale detection.  |
| `localPath`       | string                                                | Project-local only: bundle directory relative to project root.                 |
| `localType`       | string                                                | Project-local only: bundle type (`extension`, `addon`, `framework`, `plugin`). |
| `manifestVersion` | string                                                | Project-local only: manifest schema version.                                   |
| `artifactHashes`  | `Record<string, string>`                              | Optional source-artifact hash map for `aiwg remove` revert (#1037).            |

Allowed `source` values:

- `bundled` — came from the npm package
- `cache` — came from `~/.cache/aiwg/packages/`
- `project-local` — came from `.aiwg/{extensions,addons,frameworks,plugins}/<id>/`
- a git URL — direct source URL

When `source: 'project-local'`, the loader requires `localPath` and `localType` to be
present together; non-project-local entries clear these fields.

## Delivery Block

The `delivery` block declares how AIWG agents ship code on this project. Every field is
optional; defaults applied via `resolveDelivery()` are intentionally conservative
(PR-required, rebase-merge, no force-push) so adding the schema does not change
behavior for existing projects.

**Default when the entire block is omitted: `mode: pr-required`**, `default_branch: main`,
with the per-field defaults below.

### Fields

| Field                    | Type           | Default        | Description                                                                                |
| ------------------------ | -------------- | -------------- | ------------------------------------------------------------------------------------------ |
| `mode`                   | enum (below)   | `pr-required`  | Delivery workflow. See mode values below.                                                  |
| `default_branch`         | string         | `main`         | Branch agents merge into and treat as the trunk.                                           |
| `branch_naming`          | `BranchNaming` | see below      | Per-type branch prefix templates with `{issue}` and `{slug}` interpolation.                |
| `merge_style`            | enum (below)   | `rebase-merge` | Preferred merge strategy. Matches Gitea/GitHub/GitLab API values.                          |
| `delete_branch_on_merge` | bool           | `true`         | Delete feature branch after merge.                                                         |
| `require_ci_green`       | bool           | `true`         | Agents must wait for CI green on `remotes.ci` before declaring done.                       |
| `require_signed_commits` | bool           | `false`        | Require GPG/SSH-signed commits.                                                            |
| `force_push_policy`      | enum (below)   | `never`        | When force-pushes are permitted.                                                           |
| `auto_close_issues`      | bool           | `true`         | Include `Closes #N` / `Fixes #N` in PR body or commit message when an issue is referenced. |
| `issue_comment_on_cycle` | bool           | `true`         | Post AL CYCLE status comments to issue threads from `address-issues` loops.                |

#### `mode` values

- `direct` — commit straight to default branch
- `feature-branch` — branch + push, no PR
- `pr-required` — branch + PR via primary remote

#### `merge_style` values

- `rebase-merge`
- `squash`
- `merge`
- `fast-forward-only`

#### `force_push_policy` values

- `never` — agents may never force-push
- `own-branch-only` — OK on the agent's own feature branch, never to default branch
- `allowed` — escape hatch for tooling that needs it

### `branch_naming` defaults

```json
{
  "prefix_by_type": {
    "feat":     "feat/{issue}-{slug}",
    "fix":      "fix/{issue}-{slug}",
    "docs":     "docs/{slug}",
    "chore":    "chore/{slug}",
    "refactor": "refactor/{slug}",
    "test":     "test/{slug}"
  }
}
```

Per-type prefixes you provide are merged into these defaults (your values win).

### Semantic rules

The `delivery-policy` rule (HIGH severity, applies to all agents) governs how agents
must read and respect this block. Key points:

- Read the block before any branch creation, PR opening, push to `default_branch`,
  force-push, issue closure via commit message, or interactive question about git
  workflow.
- Apply the mode literally — don't substitute training-data norms.
- Use `remotes.{primary,issue_tracker,ci}` rather than guessing.
- Don't ask the user to pick a workflow when the config already answers it.

Full rule: `agentic/code/addons/aiwg-utils/rules/delivery-policy.md`.

## Remotes Block

The `remotes` block declares repo topology — which git remote drives CI and PRs
(primary), where issues live, and which secondary remotes are mirrors or publishing
targets. Defaults: `primary: origin`, `issue_tracker: primary`, `ci: primary`,
`secondary: []`.

### Fields

| Field           | Type                | Default   | Description                                                                         |
| --------------- | ------------------- | --------- | ----------------------------------------------------------------------------------- |
| `primary`       | string              | `origin`  | Git remote name driving CI and PRs by default. Must match a name from `git remote`. |
| `issue_tracker` | string              | `primary` | Where issues live.                                                                  |
| `ci`            | string              | `primary` | Where CI runs.                                                                      |
| `secondary`     | `SecondaryRemote[]` | `[]`      | Mirrors, fork bases, publishing targets.                                            |

### `SecondaryRemote` shape

| Field             | Type   | Description                                                                     |
| ----------------- | ------ | ------------------------------------------------------------------------------- |
| `name`            | string | Must match a name from `git remote`.                                            |
| `purpose`         | string | Free-form tag (`mirror`, `upstream`, `publish`, `replica`, `public-mirror`, …). |
| `push_on_release` | bool   | Hint to release workflows: push tags here on stable cuts.                       |

### Provider classification

The loader exposes `resolveRemoteProvider(url)` which classifies a remote URL by host:

- `github.com` → `github`
- `gitlab.com` or self-hosted GitLab → `gitlab`
- Hosts containing `gitea` → `gitea`
- Anything else → `unknown` (callers fall back to the configured provider list)

## Worked Examples

### Minimal config (new project default)

```json
{
  "$schema": "https://aiwg.io/schemas/aiwg.config.v1.json",
  "version": "1",
  "providers": ["claude"],
  "installed": {},
  "scripts": {},
  "delivery": {
    "mode": "pr-required",
    "default_branch": "main",
    "require_ci_green": true,
    "auto_close_issues": true,
    "issue_comment_on_cycle": true,
    "force_push_policy": "never"
  }
}
```

This is what `emptyConfig()` produces. The `delivery` block is explicit (matching the
runtime default) so users see the policy without having to discover the field exists.

### Mono-remote setup (single-developer, direct-to-main)

```json
{
  "version": "1",
  "providers": ["claude"],
  "installed": {},
  "scripts": {},
  "delivery": {
    "mode": "direct",
    "default_branch": "main",
    "require_ci_green": true,
    "force_push_policy": "never",
    "auto_close_issues": true
  }
}
```

Skills like `address-issues` skip branch-per-issue and PR creation; commits use
`Closes #N` to auto-close issues. CI on main is still required to be green before
declaring resolution.

### Mirror setup (Gitea primary + GitHub public mirror)

This is the AIWG repo's own configuration — primary on Gitea (issues, PRs, CI), public
mirror on GitHub (tags pushed on release).

```json
{
  "version": "1",
  "providers": ["claude", "codex"],
  "installed": { "...": "..." },
  "scripts": {},
  "remotes": {
    "primary": "origin",
    "issue_tracker": "origin",
    "ci": "origin",
    "secondary": [
      {
        "name": "github",
        "purpose": "public-mirror",
        "push_on_release": true
      }
    ]
  },
  "delivery": {
    "mode": "direct",
    "default_branch": "main",
    "require_ci_green": true,
    "force_push_policy": "never",
    "auto_close_issues": true,
    "issue_comment_on_cycle": true
  }
}
```

## Cross-References

- **Delivery semantic rules**: `agentic/code/addons/aiwg-utils/rules/delivery-policy.md`
- **Activity log rule** (records writes to this config):
  `agentic/code/addons/aiwg-utils/rules/activity-log.md`
- **Project-local registry shape**:
  `.aiwg/architecture/adr-unified-registry-shape.md`
- **`aiwg remove` revert design** (consumes `artifactHashes`):
  `.aiwg/architecture/design-aiwg-remove-revert.md`
- **Identical-form portability** (project-local promote):
  `.aiwg/architecture/adr-identical-form-portability.md`
- **Loader source**: `src/config/aiwg-config.ts`
- **CLI commands that read or write this file**: `aiwg use`, `aiwg remove`,
  `aiwg promote`, `aiwg list`, `aiwg doctor`, `aiwg run`, `aiwg config`,
  `aiwg activity-log`
- **Setup manifests** (separate language for installer addon): see
  [`setup-manifest.md`](./setup-manifest.md)
