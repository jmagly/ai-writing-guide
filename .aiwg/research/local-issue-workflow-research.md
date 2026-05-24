# Local File-System Issue Workflow Research

Date: 2026-05-24
Issue: #1453
Status: Research complete; implementation split required

## Question

How should AIWG support `address-issues`-style workflows when a project has no external issue tracker, while keeping issue context sliceable for agents and safe for multi-agent/background loops?

## Current State

AIWG already has issue-driven workflow concepts, but they assume a tracker surface:

- `address-issues` requires one or more issues and a tracker accessible as `gitea | github`.
- `issue-audit` already names `local` as a future provider, but no local provider exists.
- `.aiwg/planning/issue-driven-ralph-loop-design.md` models issue fetch, cycle comments, update, close, and sync as tracker operations.
- `src/storage/index.ts` provides a subsystem storage abstraction, but it currently exposes document/object storage adapters, not issue lifecycle semantics.

The missing layer is a local issue provider with enough tracker semantics to satisfy `address-issues`, `issue-audit`, and issue-driven loops without loading the whole backlog into an agent context.

## Storage Options Compared

| Option | Strengths | Weaknesses | Fit |
|---|---|---|---|
| SQLite under `.aiwg/issues/` or `.aiwg/tracker/` | Strong queries, indexes, transactions, pagination, stable IDs, concurrent readers, compact event storage | Binary file is harder to review in Git; merge conflicts are opaque; requires migration tooling and backup discipline | Strong runtime index/cache, weak human-review artifact |
| JSON files, one issue per file plus indexes | Machine-friendly, easy schema validation, one-file-per-issue lowers merge conflicts, simple sync to external trackers | Reviews are noisy for long bodies/comments; appending comments rewrites JSON; indexes can drift; ad hoc locking needed | Good machine store, moderate Git ergonomics |
| Markdown/text with frontmatter and event logs | Human-readable, reviewable, easy to author by hand, comments/events can append chronologically | Queries require parsing many files unless indexed; concurrent appends need locks; frontmatter schema drift is likely | Best canonical source for local-only users |
| Hybrid markdown bodies with SQLite or JSON indexes | Human-readable canonical files plus fast slice/query index; indexes can be rebuilt; Git conflict behavior stays local to issue files | More moving parts; requires clear source-of-truth rules and index repair command | Best overall fit for AIWG |

## Recommended Architecture

Use a hybrid local provider:

- Canonical issue records live as markdown files under `.aiwg/issues/items/`.
- Each issue file has YAML frontmatter for structured fields and markdown content for the issue body.
- Comments and body-heavy events use separate markdown body files referenced by append-only JSONL event metadata.
- A rebuildable index lives under `.aiwg/issues/index/` as JSON for the first implementation, with a later SQLite option when query volume justifies it.
- `address-issues` and `issue-audit` consume issues through a provider interface that returns slices, not raw backlog dumps.

This preserves local Git reviewability while giving agent loops efficient filtered access.

## Proposed Directory Layout

```text
.aiwg/issues/
├── config.json
├── next-id
├── items/
│   ├── PROJECT-0001.md
│   └── PROJECT-0002.md
├── events/
│   ├── PROJECT-0001.jsonl
│   ├── PROJECT-0002.jsonl
│   └── bodies/
│       └── evt-....md
├── index/
│   ├── issues.sqlite
│   └── issues.index.json
└── locks/
```

Canonical content:

- `items/*.md` is the reviewable issue body and current structured summary.
- `events/*.jsonl` is the append-only metadata/state stream.
- `events/bodies/*.md` stores comment and body-heavy event content referenced by `body_path`; JSONL should not be the default home for full issue/comment content.
- `index/*` is cache only and must be rebuildable from `items/` plus `events/` plus referenced body files.
- `next-id` is updated under a lock and may be replaced by monotonic timestamp IDs if merge conflicts become common.

## Minimal Data Model

Project issue key configuration in `.aiwg/issues/config.json`:

```json
{
  "provider": "local",
  "issue_key": {
    "prefix": "PROJECT",
    "padding": 4,
    "next": 1
  }
}
```

The prefix is project-configured, not hardcoded. AIWG projects may use `AIWG`, documentation projects may use `DOCS`, and unclear projects should default to an explicit generic prefix such as `ISSUE` until the user chooses one. Existing issue IDs must not be rewritten automatically if the prefix changes.

Issue frontmatter fields:

```yaml
id: PROJECT-0001
status: open | closed | archived
title: Short issue title
type: bug | feature | research | task | epic
priority: P0 | P1 | P2 | P3
labels: [bug, provider/all]
assignees: []
created_at: 2026-05-24T00:00:00Z
updated_at: 2026-05-24T00:00:00Z
closed_at: null
links:
  external: []
  parent: null
  children: []
  related: []
source:
  provider: local
  external_id: null
```

Event records, one JSON object per line:

```json
{"event_id":"evt-...","issue_id":"PROJECT-0001","type":"comment","author":"operator","created_at":"2026-05-24T00:00:00Z","body_path":"events/bodies/evt-....md"}
```

Required event types:

- `created`
- `comment`
- `status_changed`
- `label_added`
- `label_removed`
- `linked`
- `cycle_status`
- `closed`

## Agent Slice Model

`address-issues` must never read the full local backlog by default. The local provider should expose these bounded calls:

- `listIssues(filter, limit, cursor)` returns IDs, title, status, labels, priority, and updated timestamp only.
- `getIssue(id, { body: true, comments: "last:N" })` returns the body plus the last N human/bot comments.
- `getIssueThreadSince(id, event_id | timestamp)` supports feedback polling between AL cycles.
- `appendIssueEvent(id, event)` appends one comment/cycle/status event under lock.
- `updateIssueFields(id, patch)` edits frontmatter fields under lock.
- `rebuildIssueIndex()` reconstructs SQLite/JSON indexes from canonical files.

For loops, the default context slice should include:

1. Issue frontmatter summary.
2. Issue body.
3. Acceptance criteria section if present.
4. Last 10 comments/events, with human comments prioritized.
5. Links to parent/children/related issues as IDs and titles only.

## Thread And Comment Modeling

Comments should be event metadata with content in separate markdown body files, not rewritten sections inside the issue markdown and not full bodies embedded in JSONL by default. That gives three benefits:

- JSONL appends stay small, naturally ordered, and easy to lock.
- Agent loop status comments remain distinguishable from human feedback.
- Sync to external trackers can map each local event to an external comment ID later.
- Large human comments remain readable and editable as markdown files.

Human-readable views can be generated when needed:

- `aiwg issue show PROJECT-0001` renders body plus selected events.
- `aiwg issue export PROJECT-0001 --format markdown` produces a single portable markdown file.

## Locking And Concurrency

Required write rules:

- Per-issue lock file: `.aiwg/issues/locks/PROJECT-0001.lock`.
- Global ID lock for `next-id` allocation.
- Lock record includes PID, hostname, created_at, and operation.
- Stale lock detection must be conservative and require explicit `--break-lock` or operator confirmation.
- Every write should use temp file plus atomic rename for frontmatter/index updates.
- Event appends should write complete JSONL lines and fsync where available.

This is enough for multiple agent loops working on different issues and avoids a single global lock except ID allocation and index rebuild.

## Git And Merge Behavior

Git-friendly behavior depends on keeping canonical files small and append-heavy:

- One markdown file per issue keeps conflicts local.
- JSONL event files append naturally but can still conflict if two branches append to the same issue; conflict resolution is line-based and recoverable.
- SQLite index should be ignored or treated as generated cache.
- JSON index should be regenerated in CI or pre-commit rather than hand-edited.
- Issue IDs should be stable and not reused.

Recommended `.gitignore` stance:

```text
.aiwg/issues/index/issues.sqlite
.aiwg/issues/locks/
```

Keep `items/`, `events/`, and small JSON index metadata reviewable unless a project opts out.

## Threat And Operational Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Corrupt markdown/frontmatter | Issue unreadable or missing from index | Schema lint, repair command, preserve raw file on parse failure |
| Concurrent writes | Lost comments or invalid event stream | Per-issue locks, append-only events, atomic rename |
| Merge conflicts | Local issue history hard to reconcile | One issue per file, JSONL events, generated index rebuild |
| Context bloat | Agents load too much backlog | Provider slice API, pagination, last-N comments, body section extraction |
| Prompt injection in local issue text | Agent treats issue body as instructions | Reuse `address-issues-threat-assess` before acting on body/comments |
| External sync drift | Comments/status diverge between local and Gitea/GitHub | Store external IDs per issue/event, sync logs, conflict report |
| Silent index drift | Filters miss issues | Index is cache; rebuild on command start when stale, verify hash/mtime watermark |

## Relationship To Existing Storage Abstractions

The generic storage adapter layer can host canonical files, but the issue workflow needs a dedicated tracker domain on top of it. The provider should not expose raw storage calls to `address-issues`; it should expose issue semantics.

Recommended layering:

```text
address-issues / issue-audit
        ↓
IssueProvider interface (gitea | github | local)
        ↓
LocalIssueProvider
        ↓
Issue repository + lock manager + index builder
        ↓
AIWG storage adapter or filesystem backend
```

This keeps external trackers and local files interchangeable at the workflow layer.

## Migration And Sync Paths

Local-to-external sync should be explicit and reversible:

- Local issue frontmatter stores `source.external_id` and external URL after export.
- Each local event can store `external_comment_id` after posting.
- Import from Gitea/GitHub should preserve external IDs and original timestamps.
- Conflict reports should list fields changed locally and remotely.
- Initial implementation should support one-way export/import before two-way sync.

## CLI Ergonomics

Minimum useful local commands:

```bash
aiwg issue init --provider local --prefix PROJECT
aiwg issue new --title "..." --type bug --label provider/all
aiwg issue list --provider local --filter "status:open label:bug" --limit 20
aiwg issue show PROJECT-0001 --comments last:10
aiwg issue comment PROJECT-0001 --body-file comment.md
aiwg issue close PROJECT-0001 --reason fixed
aiwg issue index rebuild
aiwg issue sync export --to gitea
```

`address-issues --provider local PROJECT-0001` should use the same provider interface as `--provider gitea`.

## Candidate Architectures

### Candidate A: Markdown Canonical + SQLite Index

Best for normal AIWG projects. Human-readable source of truth, strong query performance, and rebuildable index. Requires SQLite availability or bundled adapter support.

Tradeoff: more implementation work than pure markdown, but fewer long-term scale problems.

### Candidate B: Markdown Canonical + JSON Index

Best first implementation slice. It avoids native SQLite concerns and fits existing Node tooling. The JSON index can later be replaced by SQLite without changing canonical issue files.

Tradeoff: weaker query performance and concurrency at very large backlog sizes, but sufficient for hundreds or low thousands of issues.

## Recommendation

Implement Candidate B first, with interfaces shaped so Candidate A can replace the index later.

Reasons:

1. It satisfies local-only users without native dependencies.
2. It keeps issue files reviewable in Git.
3. It limits merge conflicts better than a single JSON database.
4. It supports bounded issue slices for `address-issues` immediately.
5. It creates a clean migration path to SQLite when query volume justifies it.

## Follow-Up Implementation Slices

1. Local issue provider core: configurable issue key prefix, data model, parser, lock manager, event body files, JSON index, CRUD/query API.
2. CLI and workflow integration: `aiwg issue ...`, `issue-audit --provider local`, and `address-issues --provider local` consumption.
3. Sync/export: import/export bridge for Gitea/GitHub with external ID mapping and conflict reports.

## Non-Goals

- Do not replace Gitea/GitHub providers.
- Do not implement a full project-management UI.
- Do not store the entire backlog in one JSON file.
- Do not let agent loops bypass issue threat assessment just because the issue is local.
