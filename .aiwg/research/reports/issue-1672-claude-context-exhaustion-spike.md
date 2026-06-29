# Issue 1672 Claude Code Context Exhaustion Spike

**Date:** 2026-06-29
**Issue:** https://git.integrolabs.net/roctinam/aiwg/issues/1672
**Status:** Research spike plus first mitigation pass

## Problem

AIWG's Claude-facing skill and subagent surface can exhaust a standard Claude
Code Sonnet context before useful work starts, especially in combined workflows
such as:

```text
docSync code2doc then make sure the blog post is fully covering our work for the month then commit-and-push
```

The highest-risk pattern is a long skill body that immediately fans out broad
parallel auditors and asks them to return detailed findings into the parent
conversation.

## Primary Source Guidance

- Claude Code skills: https://code.claude.com/docs/en/skills
- Claude Code subagents: https://code.claude.com/docs/en/sub-agents
- Anthropic context engineering guidance: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- Stable AIWG design note: `docs/providers/claude-context-budget.md`
- Existing AIWG skill budget guide: `docs/skills-budget-guide.md`
- Existing Claude Code parity assessment: `.aiwg/research/parity/claude-code/assessment.md`

Interpretation for AIWG:

1. Keep always-visible skill metadata short.
2. Keep invoked skill bodies short because the full rendered skill remains a
   recurring context cost after invocation and compaction.
3. Do not use subagent `skills:` preloads casually; preloaded skills add full
   skill content before the subagent does task work.
4. Use subagents to isolate noisy file reading, but require bounded return
   summaries so the parent context does not absorb the entire audit.
5. Treat standard Sonnet context as the design baseline; do not assume a 1M
   context account.

## Inventory Evidence

Command:

```bash
npm run lint:claude-context -- --limit 15
```

Result summary:

- Scanned 1601 Claude-facing skill files and 712 agent/subagent definitions.
- Skill ceiling used by the check: 24 KiB.
- Agent definition ceiling used by the check: 16 KiB.
- Largest current skill bodies:
  - `agentic/code/frameworks/sdlc-complete/skills/intake-wizard/SKILL.md`:
    71.9 KiB, about 18,361 tokens.
  - `plugins/codex-sdlc/skills/intake-wizard/SKILL.md`: 70.1 KiB, about
    17,892 tokens.
  - `agentic/code/frameworks/sdlc-complete/skills/flow-incident-response/SKILL.md`:
    68.1 KiB, about 16,975 tokens.
  - `agentic/code/frameworks/sdlc-complete/skills/flow-deploy-to-production/SKILL.md`:
    59.6 KiB, about 14,998 tokens.

The inventory check now flags:

- oversized Claude-facing skill bodies,
- subagent definitions with `skills:` preloads,
- skill bodies that prescribe broad `parallel-dispatch`,
- unbounded or detailed output-return language.

## Doc-Sync Path Findings

Before this pass, the SDLC `doc-sync` skill used:

- `model: opus`,
- eight domain-specific auditors in the first wave,
- broad inventory instructions,
- detailed per-file findings in the parent return path,
- no hard cap on auditor result size.

That structure matches the failure mode in #1672: it expands scope and subagent
traffic before it knows whether the user's request only needs a small changed
file set.

## Mitigation Applied

Updated:

- `agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md`
- `plugins/sdlc/skills/doc-sync/SKILL.md`
- `plugins/codex-sdlc/skills/doc-sync/SKILL.md`
- `.github/commands/doc-sync.md`
- `agentic/code/addons/aiwg-utils/skills/doc-sync/SKILL.md`
- `plugins/utils/skills/doc-sync/SKILL.md`
- `agentic/code/frameworks/sdlc-complete/flows/capabilities/release-doc-sync.yaml`

New doc-sync rules:

- default to `model: sonnet`,
- start with `git status --short` and `git diff --name-only`,
- ask before expanding beyond scoped or changed files,
- default to two auditors and cap at four,
- require exact paths in auditor prompts,
- cap each auditor return to 10 findings and 600 words,
- store detailed evidence under `.aiwg/working/doc-sync/`,
- do not preload other skills into auditor agents,
- hand off to `commit-and-push` instead of chaining commit logic inside
  doc-sync.

## Added Regression Check

New tool:

```bash
npm run lint:claude-context
```

Files:

- `tools/lint/claude-context-inventory.mjs`
- `test/unit/lint/claude-context-inventory.test.ts`

This is currently an inventory/check tool. `--strict` exits non-zero when risks
are present, which is useful for future CI gating once the existing large-skill
backlog is triaged.

## Added Live Validation Harness

New command:

```bash
npm run validate:claude-context
```

Files:

- `tools/validation/claude-context-repro.mjs`
- `test/unit/validation/claude-context-repro.test.ts`

The harness:

- copies the current repo to `/tmp/aiwg-1672-claude-validation` by default,
- removes `origin` and `github` remotes from the disposable copy,
- runs Claude Code in `--permission-mode plan`,
- denies `Edit`, `Write`, `git add`, `git commit`, and `git push`,
- preserves the #1672 repro prompt,
- writes the Claude stream transcript and debug log under
  `.aiwg/reports/` in the disposable copy,
- exits `0` when a model turn runs without context exhaustion,
- exits `2` when Claude Code is not authenticated,
- exits `3` when the stream contains context-exhaustion markers.

This makes the remaining standard-context Claude Code acceptance gate
repeatable for an authenticated operator account.

## Stable Design Note

The durable provider-facing rules are documented in:

```text
docs/providers/claude-context-budget.md
```

That note separates startup skill listing budgets from runtime costs after a
skill/subagent is invoked and captures standard Sonnet assumptions, bounded
subagent return contracts, `skills:` preload warnings, and the live validation
command.

## Validation Performed

```bash
npm run lint:claude-context -- --limit 15
npm test -- --run test/unit/lint/claude-context-inventory.test.ts
```

Both commands completed successfully. The lint command reported the existing
large-skill backlog and confirmed the new check can inventory and flag risks.

Additional validation after tightening the utility copies:

```bash
rg -n 'full audit|5 domain auditors|Dispatch 8|parallel-dispatch.*Launch audit agents|model: opus|falls back to full audit|detailed per-file|full drift report' \
  agentic/code/addons/aiwg-utils/skills/doc-sync/SKILL.md \
  plugins/utils/skills/doc-sync/SKILL.md \
  .claude/skills/doc-sync/SKILL.md \
  agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md \
  plugins/sdlc/skills/doc-sync/SKILL.md \
  plugins/codex-sdlc/skills/doc-sync/SKILL.md \
  .github/commands/doc-sync.md \
  .github/skills/doc-sync/SKILL.md
npm test -- --run test/unit/lint/claude-context-inventory.test.ts test/unit/lint/agent-def-sizes.test.ts test/unit/smiths/context-size-guard.test.ts
npm run lint:claude-context -- --limit 10
npm test -- --run test/unit/validation/claude-context-repro.test.ts test/unit/lint/claude-context-inventory.test.ts
npm run validate:claude-context -- --help
npm run validate:claude-context -- --workdir /tmp/aiwg-1672-harness-smoke --timeout-ms 30000
```

The search returned no matches. The focused tests passed. The harness smoke run
classified this environment as `auth-blocked`, which is expected until Claude
Code login is available.

Live Claude Code validation was attempted in a disposable copy at
`/tmp/aiwg-1672-claude-validation` with repository remotes removed and commit,
push, add, edit, and write tools denied:

```bash
claude -p --verbose --model sonnet --permission-mode plan \
  --max-budget-usd 1.00 \
  --output-format stream-json \
  --debug-file /tmp/aiwg-1672-claude-validation/claude-debug.log \
  --disallowedTools 'Edit,Write,Bash(git commit*),Bash(git push*),Bash(git add*)' \
  --append-system-prompt 'Validation harness for AIWG issue 1672: do not modify files, do not stage, do not commit, do not push, and stop after producing the initial decomposition and first safe scope-discovery actions. The user prompt is the repro scenario; validate that it does not immediately exhaust context.' \
  'docSync code2doc then make sure the blog post is fully covering our work for the month then commit-and-push, we will review before release'
```

Claude Code initialized on `claude-sonnet-4-6` but did not execute the model
turn because this environment is not authenticated:

```text
Not logged in · Please run /login
```

This means the live standard-context acceptance gate remains unverified in this
environment.

## Remaining Work

- Run the user scenario in a live authenticated standard-context Claude Code
  account/model: `/clear`, then the combined doc-sync/blog/commit request from
  #1672.
- Decide whether to make `lint:claude-context --strict` a CI gate after a
  backlog pass on large existing skills.
- Split the biggest SDLC workflow skills into concise entry-point bodies plus
  supporting files loaded on demand.
- Audit `plugins/**/agents/*.md` for `skills:` preloads and remove or justify
  each one.
