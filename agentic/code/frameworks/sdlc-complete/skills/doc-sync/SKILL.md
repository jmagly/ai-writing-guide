---
namespace: aiwg
name: doc-sync
platforms: [all]
description: Synchronize documentation and code with bounded, scope-first drift checks
commandHint:
  argumentHint: <direction> [--scope "path" --dry-run --parallel N --incremental --guidance "text" --no-commit]
  allowedTools: Task, Read, Write, Bash, Glob, Grep, Edit
  model: haiku
  category: documentation
  modelRole: efficiency
  modelTier: economy
---

# Documentation-Code Sync

Detect and resolve drift between code and documentation without front-loading a
full repository audit. Treat standard Sonnet context as the baseline.

## Invocation

`/doc-sync <direction> [options]`

Directions:
- `code-to-docs`: code is source of truth
- `docs-to-code`: docs are source of truth
- `full`: bidirectional reconciliation; conflicts require human review

Options:
- `--scope "path"`: limit the run to a subtree or file group
- `--incremental`: inspect changed files first
- `--dry-run`: report only
- `--parallel N`: cap concurrent auditors; default `2`, maximum `4`
- `--guidance "text"`: use operator guidance for ambiguous cases
- `--no-commit`: do not commit

## Artifact root resolution

Treat every `.aiwg/...` path below as a logical artifact path. Before reading
or writing sync state, working evidence, or reports, run `aiwg artifacts path`
from the active workspace and use the returned absolute directory as
`AIWG_ARTIFACT_ROOT`. Never write these payloads to a literal project-local
`.aiwg/` when `AIWG_ARTIFACTS_PATH` or `.aiwg-location` redirects the corpus.

## Context Budget Rules

- Start with `git status --short` and `git diff --name-only`; do not read broad
  diffs before the changed-file set is known.
- If neither `--scope` nor `--incremental` is supplied, derive a candidate scope
  from changed files and ask before expanding to full repo.
- Prefer shell inventories (`find`, `rg --files`, `git diff --name-only`) over
  reading file bodies.
- Dispatch subagents only after scope is known. Use at most `min(--parallel, 4)`
  auditors, and prefer `2` for broad or release requests.
- Each auditor must return at most 10 findings and 600 words. It should write
  detailed evidence to `$AIWG_ARTIFACT_ROOT/working/doc-sync/` and return only the path plus a
  summary.
- Do not preload other skills into subagents. If another capability is needed,
  invoke it after this skill finishes or in an isolated follow-up.

## Workflow

1. Parse direction and options.
2. Build a cheap scope inventory:
   - `git status --short`
   - `git diff --name-only`
   - `git diff --cached --name-only`
   - `rg --files docs README.md CHANGELOG.md package.json src agentic tools`
     only when the changed-file set is insufficient.
3. Choose audit lanes from the scoped files:
   - CLI/API docs
   - provider/deployment docs
   - skill/agent catalogs
   - README, changelog, release, or blog material
   - config/schema docs
4. Run bounded auditors for only the selected lanes. Each prompt must include:
   - exact paths to inspect
   - direction
   - max 10 findings
   - max 600-word return summary
   - instruction to store detailed notes under `$AIWG_ARTIFACT_ROOT/working/doc-sync/`
5. Merge summaries into `$AIWG_ARTIFACT_ROOT/reports/doc-sync-audit-{date}.md` with:
   - scope
   - findings by severity
   - auto-fixable vs human-required items
   - files changed or proposed changes
6. If not `--dry-run`, apply high-confidence fixes only.
7. Validate modified files with targeted checks:
   - markdown link/anchor checks where available
   - `npm run lint:claude-context` if Claude-facing skills or agents changed
   - project-specific build/test checks only when source changed
8. Record `$AIWG_ARTIFACT_ROOT/.last-doc-sync`.
9. Commit only when requested by the surrounding workflow and not blocked by
   `--no-commit`; otherwise leave a concise final summary.

## Release or Blog Coverage Requests

For combined requests such as "docSync code2doc, ensure the monthly blog covers
the work, then commit-and-push":

1. Keep this skill to documentation drift detection and fixes.
2. Treat blog/release coverage as one selected audit lane with changed files plus
   month-bounded git history, not a full repository read.
3. Return a handoff summary for `commit-and-push` instead of invoking it inside
   this skill.

## Output Contract

Return:
- audit report path
- files changed
- remaining human-review items
- validation commands run
- next recommended skill, if any
