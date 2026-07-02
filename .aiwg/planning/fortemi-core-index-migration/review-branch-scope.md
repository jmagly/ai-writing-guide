---
title: Fortemi Core Migration Review Branch Scope
date: 2026-07-02
parent_issue: 1664
status: commit-scope-ready
---

# Fortemi Core Migration Review Branch Scope

This manifest defines the intended file scope for the #1664 opt-in Fortemi Core
backend review branch. It is a commit-preparation artifact, not tracker
closeout evidence and not permission to push or mutate issues.

## Include In Review Branch

Include the Fortemi Core opt-in backend implementation and its local evidence:

- Fortemi export/schema/cache/query implementation:
  - `schemas/aiwg-fortemi-index-export.json`
  - `src/artifacts/browser-export.ts`
  - `src/artifacts/fortemi-core-sync.ts`
  - `src/artifacts/fortemi-core-query-adapter.ts`
  - `src/artifacts/cli.ts`
  - `src/artifacts/query-engine.ts`
  - `src/artifacts/index-status.ts`
  - `src/artifacts/dep-graph.ts`
  - `src/artifacts/graph-query.ts`
- CLI and command-surface wiring:
  - `src/cli/handlers/index.ts`
  - `src/cli/handlers/subcommands.ts`
  - `src/extensions/commands/definitions.ts`
  - `src/research/query-cli.ts`
  - `src/issues/cli.ts`
- Cockpit capability-surface validation:
  - `apps/cockpit/bridge/src/server.mjs`
  - `test/integration/cockpit-bridge.test.js`
- Focused regression coverage:
  - `test/unit/artifacts/browser-export.test.ts`
  - `test/unit/artifacts/fortemi-core-discover-show.test.ts`
  - `test/unit/artifacts/fortemi-core-parity.test.ts`
  - `test/unit/artifacts/fortemi-core-security.test.ts`
  - `test/unit/artifacts/fortemi-core-sync.test.ts`
  - `test/unit/artifacts/index-status.test.ts`
  - `test/unit/artifacts/corpus-views.test.ts`
  - `test/unit/research/query-cli.test.ts`
  - `test/unit/cli/doctor.test.ts`
  - `test/unit/cli/handlers/subcommands.test.ts`
  - `test/unit/issues/cli.test.ts`
  - `test/unit/skills/routing-docs.test.ts`
- User/operator documentation:
  - `CHANGELOG.md`
  - `docs/cli-reference.md`
  - `docs/integrations/fortemi-index-export.md`
  - `docs/local-issues.md`
  - `docs/releases/_manifest.json`
  - `docs/releases/v2026.7.1-announcement.md`
  - `docs/storage/backends/fortemi.md`
- Skill documentation copies updated for Fortemi Core routing boundaries:
  - `agentic/code/addons/aiwg-utils/skills/index/SKILL.md`
  - `agentic/code/addons/semantic-memory/skills/memory-query-capture/SKILL.md`
  - `agentic/code/frameworks/knowledge-base/skills/kb-health/SKILL.md`
  - `agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md`
  - `agentic/code/frameworks/knowledge-base/skills/knowledge-base-quickref/SKILL.md`
  - `agentic/code/frameworks/research-complete/skills/corpus-snapshot/SKILL.md`
  - `agentic/code/frameworks/research-complete/skills/research-query/SKILL.md`
  - `agentic/code/frameworks/sdlc-complete/skills/artifact-lookup/SKILL.md`
  - `agentic/code/frameworks/sdlc-complete/skills/build-artifact-index/SKILL.md`
  - `agentic/code/plugins/codex-sdlc/skills/artifact-lookup/SKILL.md`
  - `agentic/code/plugins/codex-sdlc/skills/build-artifact-index/SKILL.md`
  - `agentic/code/plugins/knowledge-base/skills/kb-health/SKILL.md`
  - `agentic/code/plugins/knowledge-base/skills/kb-ingest/SKILL.md`
  - `agentic/code/plugins/knowledge-base/skills/knowledge-base-quickref/SKILL.md`
  - `agentic/code/plugins/research/skills/corpus-snapshot/SKILL.md`
  - `agentic/code/plugins/research/skills/research-query/SKILL.md`
  - `agentic/code/plugins/sdlc/skills/artifact-lookup/SKILL.md`
  - `agentic/code/plugins/sdlc/skills/build-artifact-index/SKILL.md`
  - `agentic/code/plugins/utils/skills/index/SKILL.md`
- Planning, handoff, and audit artifacts:
  - `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md`
  - `.aiwg/security/working/ci-workflow-audit.md`
  - all files under `.aiwg/planning/fortemi-core-index-migration/` except this
    manifest's own future superseded copies if replaced.

## Exclude From Review Branch

Do not include unrelated or generated local artifacts:

- `.aiwg/reports/doc-sync-20260630T164445Z.md` is pre-existing and unrelated to
  the Fortemi migration.
- Do not include Fortemi static cache outputs under `.aiwg/.index/`; they are
  runtime/generated evidence and are rebuilt by `aiwg index sync --backend
  fortemi-core`.
- Do not include `.gitea/workflows/` changes unless a human maintainer
  explicitly authorizes installing the optional package-boundary workflow.
- Do not include package manifest or lockfile changes for the transient
  `@fortemi/core@2026.7.0` package-boundary smoke install unless a maintainer
  approves adopting that dependency path.

## Pre-Commit Verification

Before creating a review commit, rerun the gate from
`pr-readiness-checklist.md`:

```bash
git status --short --branch
npm run build:cli
npm run test:ci
aiwg index build --all
aiwg index sync --backend fortemi-core
aiwg index status --json
aiwg doctor
git diff --check
git diff -- .gitea/workflows AGENTS.md
tea login list
```

The expected `git status --short` output should include the Fortemi migration
files listed above and should continue to show
`.aiwg/reports/doc-sync-20260630T164445Z.md` as excluded/untracked unless the
operator explicitly brings that report into scope.

## Commit Guard

Use the configured regular commit signing key for any commit:

```bash
GNUPGHOME=/home/roctinam/.gnupg git commit -S62297562B1C7053088F405DB0117DAAA677A5BF2
```

Do not use the AIWG release tag signing key for this review commit.
