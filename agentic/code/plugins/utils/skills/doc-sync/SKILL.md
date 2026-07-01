---
namespace: aiwg
name: doc-sync
description: Synchronize documentation and code with bounded, scope-first drift checks
commandHint:
  argumentHint: "<direction> [--dry-run] [--scope <path>] [--incremental] [--parallel N]"
  allowedTools: Task, Read, Write, Bash, Glob, Grep, Edit
  category: utilities
  orchestration: true
platforms: [all]

---

# Doc Sync

Detect and resolve documentation drift without front-loading a full repository
audit. Treat standard Claude Code Sonnet context as the baseline.

## Triggers

Users may say:
- "doc sync"
- "sync docs"
- "fix doc drift"
- "reconcile docs"
- "update docs to match code"
- "update code to match docs"
- "check for documentation drift"

## Parameters

`direction` is required:
- `code-to-docs`: update docs to match code
- `docs-to-code`: identify code gaps against docs
- `full`: bidirectional reconciliation with human review for conflicts

Options:
- `--dry-run`: report only, no file edits
- `--scope <path>`: limit the audit to a subtree or file group
- `--incremental`: start from changed files since the last sync, then current
  git changed files if no last-run record exists
- `--parallel N`: cap concurrent auditors; default `2`, maximum `4`

## Context Budget Rules

- Start with `git status --short`, `git diff --name-only`, and
  `git diff --cached --name-only`.
- If no `--scope` or `--incremental` is supplied, derive a candidate scope from
  changed files and ask before expanding to the full repo.
- Use inventories (`rg --files`, `find`, git path lists) before reading file
  bodies.
- Dispatch auditors only for domains implicated by the scoped files.
- Each auditor returns at most 10 findings and 600 words to the parent context.
  Detailed evidence goes under `.aiwg/working/doc-sync/`.
- Do not preload other skills into auditor agents.
- For combined doc-sync, blog, and commit requests, keep blog/release coverage
  as one scoped lane and return a handoff summary for `commit-and-push`.

## Workflow

1. Parse direction and options.
2. Build the cheap scope inventory from git path lists.
3. Select relevant lanes only: CLI/API docs, provider docs, skill/agent catalogs,
   README/changelog/release/blog material, or config/schema docs.
4. Run bounded auditors for selected lanes only.
5. Write `.aiwg/reports/doc-sync-{timestamp}.md` with scope, findings,
   auto-fixable items, human-review items, and changed files.
6. If not `--dry-run`, apply high-confidence fixes only.
7. Validate modified files with targeted checks.
8. Record `.aiwg/reports/doc-sync-last-run.json`.
9. Return report path, files changed, validation commands, and remaining review
   items.

## Output Contract

Return:
- report path
- scope audited
- files changed
- validation commands run
- remaining human-review items
- recommended handoff skill, if any
