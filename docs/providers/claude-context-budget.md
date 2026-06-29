# Claude Code Context Budget Rules

AIWG Claude-facing artifacts must fit standard Claude Code Sonnet usage. Do not
design skills, commands, or subagents around a 1M-context account.

This note complements the listing-budget troubleshooting guide. Listing budgets
cover the cost of skill names and descriptions at startup. This note covers the
runtime cost after a skill or subagent is invoked.

## Sources

- Claude Code skills: <https://code.claude.com/docs/en/skills>
- Claude Code subagents: <https://code.claude.com/docs/en/sub-agents>
- Anthropic context engineering guidance:
  <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>
- Issue #1672 research spike:
  `.aiwg/research/reports/issue-1672-claude-context-exhaustion-spike.md`

## Budget Model

Claude Code uses progressive disclosure for skills: the listing exposes skill
metadata first, then the full `SKILL.md` body enters context when invoked. Once a
skill body is loaded, it becomes recurring session cost.

Subagents isolate noisy work only if they return concise summaries. A subagent
that reads broadly and returns detailed findings still pushes a large result
back into the parent conversation.

Custom subagents can also load extra context at startup. Treat a `skills:` field
in a subagent definition as a preload: it can inject full skill bodies before the
subagent does any work.

## Required Rules

1. Keep Claude-facing skill bodies concise. Use supporting files for long
   examples, templates, checklists, and domain reference material.
2. Start workflows with cheap scope discovery: `git status --short`,
   `git diff --name-only`, `git diff --cached --name-only`, `rg --files`, and
   targeted `find` commands.
3. Do not launch broad parallel subagent waves before scope is known.
4. Cap subagent concurrency. Default to two workers for broad repository work and
   never exceed four without a specific reason.
5. Cap subagent returns. For audit-style workflows, return at most 10 findings
   and 600 words to the parent context; write detailed evidence to files.
6. Avoid subagent `skills:` preloads unless the cost is justified in the file.
7. Prefer built-in Explore/Plan or a forked/isolated skill context for broad
   reconnaissance when the parent session only needs a summary.
8. Keep commit, release, and blog synthesis as handoffs between bounded steps.
   Do not chain broad doc sync, monthly history review, and commit/push into one
   unbounded skill body.

## Artifact Patterns

### Skill Entry Point

The main `SKILL.md` should contain:

- purpose and trigger phrases,
- required inputs,
- scope-discovery commands,
- bounded workflow steps,
- output contract,
- links to supporting files.

Move these out of the main body:

- large examples,
- exhaustive tables,
- reusable templates,
- long checklists,
- provider matrices,
- historical notes.

### Subagent Prompt

Every broad subagent prompt should include:

```text
Inspect only these paths: ...
Return at most 10 findings and 600 words.
Write detailed evidence to .aiwg/working/<workflow>/...
Do not load additional skills unless explicitly instructed.
```

### Release or Blog Workflows

For requests like "docSync code2doc, make sure the blog covers the month, then
commit-and-push":

1. Run doc sync on changed or scoped files first.
2. Treat blog/release coverage as one bounded lane using changed files plus
   month-bounded git history.
3. Return a handoff summary for `commit-and-push`.
4. Commit only after the user or surrounding workflow confirms the review gate.

## Checks

Use:

```bash
npm run lint:claude-context
```

The check inventories Claude-facing skills and agents by approximate token size
and startup behavior. It flags:

- oversized skill bodies,
- subagent `skills:` preloads,
- broad parallel-dispatch wording,
- unbounded or detailed output instructions.

For the live #1672 repro gate, use:

```bash
npm run validate:claude-context
```

The harness runs the exact issue prompt in a disposable copy with remotes removed
and mutation tools denied. It requires an authenticated Claude Code account and
returns a distinct exit code for missing auth versus context exhaustion.
