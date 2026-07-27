# Session Catalog CLI

`aiwg session` remains the provider launcher. Catalog management uses the
plural `aiwg sessions` namespace.

## Catalog location

The default catalog is `.aiwg/sessions/catalog.sqlite` in the current
workspace. Override it with `--db <path>`. The catalog requires the optional
`better-sqlite3` peer dependency; `aiwg sessions doctor --json` reports
`CATALOG_UNAVAILABLE` when it is absent.

## Commands

```text
aiwg sessions sources [--json]
aiwg sessions import <file> --source-id <id> [--workspace <id>] [--dry-run] [--json]
aiwg sessions list [--provider <id>] [--workspace <id>] [--tag <tag>]
                   [--limit <1..500>] [--cursor <offset>] [--json]
aiwg sessions show <session-id> [--json]
aiwg sessions search <query> --workspace <id>
                     [--provider <id>] [--date-from <rfc3339>] [--date-to <rfc3339>]
                     [--participant <role>] [--model <id>] [--role <role>]
                     [--tool <name>] [--tag <tag>] [--entity <entity>]
                     [--sensitivity <class>] [--extraction-state <state>]
                     [--limit <1..500>] [--cursor <opaque>] [--json]
aiwg sessions extract [session-id] --workspace <id>
                      [--policy-version <semver>] [--min-confidence <0..1>]
                      [--dry-run] [--json]
aiwg sessions candidates [--state <state>] [--json]
aiwg sessions review <candidate-id> <version> <state>
                     --reviewer <id> --reason <text> [--dry-run] [--json]
aiwg sessions promote <candidate-id> <version> --consumer <id>
                      --reviewer <id> [--confirm] [--dry-run] [--json]
aiwg sessions tag <session-id> <tag> [--dry-run] [--json]
aiwg sessions relocate <source-id> <file> [--dry-run] [--json]
aiwg sessions reindex [--dry-run] [--json]
aiwg sessions delete <session-id> [--confirm] [--dry-run] [--json]
aiwg sessions doctor [--json]
```

Generic imports accept only the declared, versioned AIWG interchange. Provider
logs are never modified. `delete` previews by default and only tombstones the
AIWG-owned normalized session after `--confirm`.

## Search authorization and citations

Search uses SQLite FTS5 over policy-approved normalized text. `--workspace` is
required so authorization scope is applied before matching, scoring, or
snippet generation. `--provider` can narrow that scope further. Metadata
filters are combined with the lexical query.

Every hit carries a stable citation containing provider, session, event,
import-run, source, and source-locator-class identity. Snippets contain only
the already-redacted normalized text. Tombstoned sessions, staged imports, and
records outside the authorized workspace/provider scope cannot contribute hits
or snippets.

Search cursors are opaque snapshots. A cursor fixes the maximum visible event
row for the query, so imports committed between pages do not reorder or insert
hits into the active traversal. Start a new search without the cursor to
include newly imported events.

## Candidate extraction and review

`extract` consumes only normalized, redacted events from the explicitly named
workspace. The built-in structural extractor recognizes fixed labels such as
`Decision:`, `Requirement:`, `Risk:`, `Entity:`, and
`Relationship: subject | predicate | object`. Transcript text remains inert
data: it is never evaluated as a command, tool request, URL, template, or
workflow.

Extractor output is validated with a strict schema. Every candidate includes an
exact event span and quote digest, extractor and policy versions, confidence,
sensitivity, project/temporal scope, and conflict/supersession links. Uncited,
out-of-scope, malformed-span, unknown-field, or relationship-incomplete output
is rejected before persistence.

Candidates begin in `pending`. Supported review transitions are:

```text
pending  -> accepted | rejected | deferred
deferred -> pending | accepted | rejected
accepted -> superseded
promoted -> superseded
```

Each review transition requires a reviewer and reason and creates a content-free
receipt. `accepted -> promoted` is reserved for the promotion gateway and its
destination receipt. Rejected and superseded versions are terminal. Extraction and review
do not write durable memory; `durableMemoryWrites` remains zero. Repeating an
unchanged extraction returns the existing candidate version, while changed
content under the same evidence identity creates a new pending version.

`promote` requires an exact accepted candidate version and a named consumer
whose manifest declares an `.aiwg/` memory topology. It previews by default,
showing the destination, before/after hashes, evidence event IDs, conflicts,
supersession links, and a confirmation-bound operation ID. `--confirm` writes
the derived memory page and records the source-event → candidate → destination
lineage receipt. Repeating the same promotion returns the original receipt as
a duplicate and does not write again. Unreviewed candidates are never promoted
automatically.

## Optional semantic and Fortemi integration

`SessionSearchService` keeps lexical SQLite/FTS5 search as the standalone
default. Hybrid retrieval is opt-in and uses a two-step contract:

1. `preview(options, backend)` reports the exact workspace, backend, approved
   candidate count, text-transfer status, and whether network/model use occurs.
2. `search(...)` requires approval carrying that preview's operation ID.

The operation ID covers the query digest and every authorized candidate event
ID. A scope, lifecycle, or candidate-set change invalidates prior approval.
Only normalized, classified, redacted events that pass workspace and metadata
filters are offered to a backend. Returned IDs are checked against that
allowlist before fusion, so stale, deleted, or cross-workspace candidates
cannot become hits. Omitting the backend or selecting lexical mode performs no
model/network work.

`FortemiSessionBackend` is capability-gated. It remains unavailable until
Fortemi provides source-addressed upsert, typed metadata predicates, and
evidence locators (Fortemi issues 1090–1092); this does not block local search.
Its injected client boundary supports conformance tests without starting a
service.

`convertSessionEventsToKnowledgeShard()` exports approved event text and stable
evidence metadata through the Knowledge Shard v1 boundary. Its conversion
report includes typed losses for provider-native extensions and raw byte or
sequence locators that v1 cannot represent. Callers must inspect `lossless` and
`losses`; a record count match is not a claim of parity.

## Reference performance

The reproducible FTS5 reference benchmark is:

```bash
node tools/benchmarks/session-search.mjs
```

It creates a temporary one-million-event catalog shape, runs 25 authorized
lexical queries, reports p50/p95/max latency as JSON, enforces the provisional
2,000 ms p95 target, and removes the temporary database. On the 2026-07-27
reference maintainer host, p95 was 115.55 ms. This measures indexed query
latency, not import construction time; operators should rerun it on their
deployment storage and retain the JSON result with release evidence.

## JSON contract

Every `--json` response has the same versioned top-level shape:

```json
{
  "contractVersion": "1.0.0",
  "command": "sessions.list",
  "status": "ok",
  "data": {},
  "error": null
}
```

Fields may be added within major version 1, but existing fields retain their
meaning. List order is stable and list pagination uses a deterministic numeric
cursor; search pagination uses a deterministic opaque snapshot cursor.
Unsupported providers return `UNSUPPORTED_OPERATION`; this is distinct
from a successful query with an empty `items` array.

Exit codes are stable within major version 1:

| Code | Meaning |
|---:|---|
| 0 | Success or preview |
| 2 | Invalid command or arguments |
| 3 | Unsupported operation |
| 4 | Requested catalog object unavailable |
| 5 | Source or contract validation failure |
| 6 | Catalog/storage unavailable |
