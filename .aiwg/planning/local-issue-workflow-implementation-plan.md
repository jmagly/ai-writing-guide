# Local Issue Workflow Implementation Plan

Date: 2026-05-24
Parent Issue: #1453
Status: Planned from completed research
Research: .aiwg/research/local-issue-workflow-research.md

## Goal

Add a local file-system backed issue provider that can support `issue-audit` and `address-issues` workflows without requiring Gitea/GitHub.

## Architecture Decision

Use markdown issue files as canonical data and a rebuildable JSON index as the first implementation slice. Keep the provider interface compatible with a later SQLite index.

## Phases

### Phase 1: Local Provider Core

- Define issue schema and event schema.
- Create `.aiwg/issues/` layout initializer.
- Implement parser/serializer for `items/*.md` frontmatter.
- Implement append-only JSONL event store.
- Implement lock manager with stale lock reporting.
- Implement JSON index rebuild and query.
- Add unit tests for parsing, locking, CRUD, filtering, and rebuild.

### Phase 2: CLI And Workflow Integration

- Add `aiwg issue init/new/list/show/comment/close/index rebuild` commands.
- Add provider abstraction for `gitea | github | local` where workflow skills need issue operations.
- Wire `issue-audit --provider local` to list and inspect local issues.
- Wire `address-issues --provider local` to fetch bounded slices and append cycle comments.
- Ensure `address-issues-threat-assess` runs against local issue bodies/comments.

### Phase 3: Sync And Migration

- Add one-way import/export with Gitea/GitHub.
- Store external issue/comment IDs in local metadata.
- Add conflict reports before two-way sync.
- Document backup and Git usage.

## Verification Gates

- Unit tests for local issue schema and parser.
- Unit tests for lock acquisition, stale lock detection, and atomic writes.
- Integration test: create local issue, list/filter, show bounded comments, append comment, close issue.
- Workflow test: `address-issues --provider local` consumes a fixture issue without reading unrelated backlog files.
- Documentation: local issue workflow guide and migration/sync caveats.

## Open Questions For Implementation

- Whether local IDs should be numeric (`#1`) or prefixed (`AIWG-0001`) at the CLI surface.
- Whether `.aiwg/issues/index/issues.index.json` should be committed by default or regenerated in CI.
- Whether SQLite should be optional in Phase 1 or deferred completely to a later issue.
