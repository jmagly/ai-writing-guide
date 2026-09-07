# Session Catalog CLI

`aiwg session` remains the provider launcher. Catalog management uses the
plural `aiwg sessions` namespace.

## Catalog location

The default catalog is `.aiwg/sessions/catalog.sqlite` in the inferred
AIWG/Git project root. Override it with `--db <path>`. Read-only commands infer
the workspace from an explicit `--workspace`, the canonical current project
root, or a sole catalog workspace, in that order. Multiple candidates fail
with `WORKSPACE_AMBIGUOUS`; AIWG never chooses between them. Mutation commands
continue to require an explicit workspace. Install and verify the optional
SQLite runtime before using catalog commands:

```sh
aiwg features install sqlite
aiwg features info sqlite --json
```

The installer places the exact supported `better-sqlite3` release in AIWG's
user-owned feature root, allows only its required lifecycle script, and fails
unless the native module loads. Catalog commands resolve that feature root
before the base AIWG installation. If no compatible prebuild is available,
the package falls back to `node-gyp`; install Python 3, `make`, and a C/C++
compiler supported by your Node platform, then repeat the feature install.
`aiwg sessions doctor --json` reports `CATALOG_UNAVAILABLE` with the same
installer command when the package is absent or unusable.

## Commands

```text
aiwg sessions sources [--json]
aiwg sessions discover --workspace <path>
                       [--codex-root <authorized-path>]
                       [--omp-root <authorized-path>] [--dsh-root <authorized-path>]
                       [--manifest <path>] [--dry-run] [--json]
aiwg sessions import-discovered --workspace <path>
                                [--manifest <path>] [--confirm|--yes]
                                [--resume] [--lock-wait-ms <n>]
                                [--dry-run] [--json]
aiwg sessions import <file> --source-id <id> [--workspace <id>] [--dry-run] [--json]
aiwg sessions list [--provider <id>] [--workspace <id>] [--tag <tag>]
                   [--limit <1..500>] [--cursor <offset>]
                   [--min-coverage <0..1>] [--json]
aiwg sessions timeline [--workspace <id>] [--gap <duration>]
                       [--min-coverage <0..1>] [--json]
aiwg sessions show <session-id> [--json]
aiwg sessions search <query> --workspace <id>
                     [--provider <id>] [--date-from <rfc3339>] [--date-to <rfc3339>]
                     [--participant <role>] [--model <id>] [--role <role>]
                     [--tool <name>] [--tag <tag>] [--entity <entity>]
                     [--sensitivity <class>] [--extraction-state <state>]
                     [--control-events exclude|include|only]
                     [--limit <1..500>] [--cursor <opaque>] [--json]
aiwg sessions extract [session-id] --workspace <id>
                      [--policy-version <semver>] [--min-confidence <0..1>]
                      [--dry-run] [--json]
aiwg sessions candidates [--state <state>] [--json]
aiwg sessions review <candidate-id> <version> <state>
                     --reviewer <id> --reason <text>
                     [--acknowledge-security-risk] [--dry-run] [--json]
aiwg sessions promote <candidate-id> <version> --consumer <id>
                      --reviewer <id> [--confirm] [--dry-run] [--json]
aiwg sessions tag <session-id> <tag> [--dry-run] [--json]
aiwg sessions relocate <source-id> <file> [--dry-run] [--json]
aiwg sessions reindex [--dry-run] [--json]
aiwg sessions delete <session-id> [--confirm] [--dry-run] [--json]
aiwg sessions restore <session-id> [--dry-run] [--json]
aiwg sessions purge <session-id> [--confirm] --actor-class <class>
                    --reason-code <code>
                    [--dependent-action revoke|supersede|retain|origin_unavailable]
                    [--basis <text>] [--dry-run] [--json]
aiwg sessions audit --workspace <id> [--limit <1..500>] [--cursor <opaque>]
                    [--otel] [--json]
aiwg sessions analytics summary --workspace <id> [filters] [--json]
aiwg sessions analytics tool-calls --workspace <id>
                        [--group-by tool|session|provider] [filters] [--json]
aiwg sessions analytics escalations --workspace <id> [filters] [--json]
aiwg sessions analytics hitl --workspace <id> [filters] [--json]
aiwg sessions forensics timeline <session-id|query> --workspace <id>
                        --authorize-forensics [--markdown] [filters] [--json]
aiwg sessions forensics indicators --workspace <id>
                        --authorize-forensics [filters] [--json]
aiwg sessions forensics evidence <event-id|fact-id|candidate-id>
                        --workspace <id> --authorize-forensics [--json]
aiwg sessions doctor [--json]
```

## Discover and import a workspace history

Discovery scans only provider roots associated with the explicitly authorized
workspace. Claude, Cursor, and Factory have workspace-keyed local roots. Codex
rollouts use a shared root, so AIWG does not inspect `CODEX_HOME` implicitly:
pass `--codex-root` to authorize that root, or leave Codex reported as
`SHARED_ROOT_AUTHORIZATION_REQUIRED`. OMP and DeepSeek Harness also require an
explicit authorized root through `--omp-root` or `--dsh-root`. Harness imports
raw v2 JSONL; compressed histories require a reviewed raw export. Providers that
require an API or manual
export remain visible as `export-required`.

```sh
aiwg sessions discover --workspace "$PWD" --codex-root ~/.codex/sessions --json
aiwg sessions import-discovered --workspace "$PWD" --dry-run --json
aiwg sessions import-discovered --workspace "$PWD" --confirm
```

Discovery writes `.aiwg/sessions/discovery-manifest.json` by default. The
manifest binds canonical workspace identity, provider dispositions, source
IDs, sizes, timestamps, and SHA-256 content digests. Public output redacts
source locators. `import-discovered` reads that exact manifest and refuses a
workspace or source-content mismatch. `--confirm` is the interactive/scripted
confirmation; `--yes` is the documented non-interactive equivalent.

A batch has a deterministic run ID and durable per-source dispositions.
Sources are staged and remain invisible to list, search, extraction, and
timeline reads until every source reaches a terminal disposition. One short
publication transaction exposes all accepted sources together. A cancelled or
failed process leaves a resumable run; repeat `import-discovered --resume
--confirm` to process only incomplete or rejected sources. Repeated resume is
idempotent.

Single and batch imports acquire `<catalog>.import.lock`. The lease records run
ID, PID, host, start time, and heartbeat. A second writer waits up to
`--lock-wait-ms` (default 5000) and then returns `IMPORT_LOCKED` with safe owner
metadata and recovery guidance. AIWG auto-recovers only a stale same-host lease
whose process is confirmed dead; foreign-host ownership is never broken
automatically. WAL readers remain available while an importer owns the lease.

## Coverage and timeline

`list` and `timeline` include coverage schema `1.0.0`. Coverage distinguishes
checked, unavailable, export-required, and not-checked providers and reconciles
discovered, accepted, rejected, skipped, duplicate, previously committed, and
pending sources. It also reports event/session totals, source/import date
ranges, manifest age, stable rejection counts, and remediation commands.
Status is `complete`, `partial`, `stale`, or `unknown`.

Use `--min-coverage 0.95` in an audit or CI job. A lower or unknown ratio emits
`COVERAGE_BELOW_THRESHOLD` and exit code 8 while retaining the coverage report
in the JSON envelope.

`timeline` derives activity segments without changing canonical session
identity:

```sh
aiwg sessions timeline --gap 30m
aiwg sessions timeline --workspace /work/project --gap 6h --json
```

Segments sort across providers by absolute time and show provider, session ID,
start/end, duration, event count, boundary basis, and confidence. Explicit
provider pause/resume/continuation evidence takes precedence over inferred
gaps. Durations accept `ms`, `s`, `m`, `h`, or `d`.

Historical lifecycle inference uses a timezone-safe 24-hour inactivity
threshold by default. Set `--inactivity-threshold 12h` (or another duration)
on `import` or `import-discovered` to configure it for that run. Later
continuation or resume evidence can revise an earlier inferred inactive state;
explicit provider lifecycle evidence always takes precedence. When provider
records have no timestamps, AIWG uses the authorized source file's modification
time as content-free lifecycle evidence rather than treating every historical
session as currently active.

## User intent and control events

Normalized events retain provider bootstrap, workspace instructions, and tool
control data for provenance, but classify origin separately. Session intent is
derived only from the first confidently user-authored message; ambiguous
content remains `unknown` and native provider titles are not used as intent.

Search and extraction exclude control events by default. Search can opt into
all events or control-only evidence:

```sh
aiwg sessions search "bootstrap term" --control-events include
aiwg sessions search "control term" --control-events only
```

Generic imports accept only the declared, versioned AIWG interchange. Provider
logs are never modified. `delete` previews by default and only tombstones the
AIWG-owned normalized session after `--confirm`.

## Tombstone and purge

`delete` is reversible: it hides the session from list, search, extraction, and
health counts without removing provider logs or AIWG event rows. `restore`
returns that catalog copy to active service.

`purge` is terminal for the selected AIWG-owned session copy and previews by
default. Its plan counts sessions, events, search-index rows, embeddings,
candidates, snapshots, tags, and promoted dependents. Confirmation requires an
actor class and reason code. When promoted dependents exist,
`--dependent-action` and `--basis` are also mandatory; the explicit disposition
is recorded as `revoke`, `supersede`, `retain`, or `origin_unavailable`.

The committed transaction removes normalized events, FTS rows, tags,
candidates, and candidate receipts, then performs orphan checks. The retained
deletion receipt contains only opaque operation/dependent IDs, layer counts,
actor/reason classifications, outcome, time, and orphan counts—never transcript
content, source paths, or stable content hashes. Retrying after completion
returns the same terminal receipt. Provider-owned logs are never opened or
modified by tombstone, restore, or purge.

## Mutation audit

Every committed catalog mutation emits a versioned, content-free event in the
same SQLite transaction as its state change. Import event time and observation
time remain distinct. Events identify only safe workspace/target classes,
operation and correlation IDs, bounded counts, outcome, schema/policy/adapter
versions, resource, and instrumentation scope. They never contain transcript
text, prompts, candidate assertions, review reasons, native payloads, source
paths, or destination content.

`sessions audit` requires an explicit workspace and uses checksummed keyset
pagination. Cursors cannot be replayed against another workspace. Integrity
digests are verified on every read. `--otel` maps the same envelope to the
OpenTelemetry Logs data-model shape without adding an OpenTelemetry runtime
dependency.

Transcript content, mutation audit, skill-usage telemetry, and orchestration
telemetry remain separate physical stores and retention classes. Mutation audit
uses the catalog lifecycle and is retained until an operator applies the
catalog retention/disposal policy; transcript purge does not silently remove
its content-free accountability record. Skill-usage JSONL follows its own
documented rotation policy, while orchestration telemetry remains governed by
the service telemetry configuration.

## Analytics and forensic evidence

Session import maintains a versioned, content-free analytics index in the same
catalog transaction boundary as normalized events. Repeated import is
idempotent. `reindex` deterministically rebuilds both FTS and analytics facts;
tombstone, restore, and purge remove or restore derived facts with the session
lifecycle.

The `analytics` views report tool calls/results, retry groups, escalation
decisions, HITL decisions, lifecycle boundaries, and indicators. Filters compose
over provider, workspace, session, date range, tool, status, participant/actor,
tag, sensitivity, and extraction state. Escalation status distinguishes
requested, granted, denied, timed-out, unsupported, and provider-unknown.
Three or more closely repeated calls with the same normalized tool/input
identity emit the `tool-quota-pressure` indicator, matching the repository's
tool-quota loop semantics.

Facts contain stable citations to normalized event, import run, source, and
safe locator-class identity. They never store transcript text, command
arguments, URLs, secret values, or native payloads. Provider extensions are
already allowlisted/redacted before classification; opaque or malformed
extensions yield indicators rather than executable content.

Forensic views require `--authorize-forensics` on every invocation. This is an
explicit local-operator authorization boundary, not a persistent preference.
Timeline and indicator output is reconstructed from cited normalized facts.
Evidence output returns bounded normalized metadata and removes candidate
quotes. Historical commands, URLs, payloads, and instructions are never
executed or replayed.

`--markdown` emits a sanitized, investigator-friendly timeline table suitable
for incident review or handoff to the AIWG forensics framework. JSON remains
the stable automation contract. Both formats retain evidence IDs so an
authorized operator can inspect the corresponding normalized catalog event.

The initial derived schema is `1.0.0`. Provider-specific fields remain under
the existing `native.<provider>` envelope, while analytics classifications are
provider-neutral. HITL facts may link prompt type and task/session transition;
approval workflow routing remains owned by #1565.

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

Terms, quoted phrases, Unicode tokens, prefixes (`term*`), and explicit boolean
operators use FTS5 query syntax. Malformed syntax returns the stable
`INVALID_SEARCH_QUERY` contract error without database error text. Results use
FTS5 relevance with event ID as the deterministic tie-breaker. Bounded snippets
place `⟦` and `⟧` around matching context.

`--participant` identifies a normalized actor, while `--role` identifies the
message role. Tool name/call ID, model, entity, and extraction-state filters
read normalized event fields only; provider-native extension keys cannot
satisfy them. Citations include native event identity when supplied by the
provider and never expose unsafe source locators.

Session-list cursors are opaque, checksummed keyset cursors bound to the
workspace/filter scope and catalog snapshot. They are not numeric offsets.

## Candidate extraction and review

`extract` consumes only normalized, redacted events from the explicitly named
workspace. The built-in structural extractor recognizes fixed labels such as
`Decision:`, `Requirement:`, `Risk:`, `Entity:`, and
`Relationship: subject | predicate | object`. Transcript text remains inert
data: it is never evaluated as a command, tool request, URL, template, or
workflow.

Extractor output is validated with a strict schema and the same hostile-content
policy is applied to structural and model-based extractors. Every candidate
separates its proposed assertion from the exact redacted evidence quote, span,
and digest, and includes extractor/policy versions, confidence, sensitivity,
project/temporal scope, typed security warnings, and conflict/supersession
links. Uncited, out-of-scope, unsupported-by-evidence, malformed-span,
unknown-field, or relationship-incomplete output is rejected before
persistence.

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
Candidates with instruction-like, structure-breaking, active-content, secret,
control-character, bidirectional-control, or mixed-script-confusable warnings
cannot be accepted without `--acknowledge-security-risk`. The receipt records
only warning categories and the acknowledgment decision, never the hostile
payload.

`promote` requires an exact accepted candidate version and a named consumer
whose manifest declares an `.aiwg/` memory topology. It previews by default,
showing the destination, before/after hashes, evidence event IDs, conflicts,
supersession links, and a confirmation-bound operation ID. `--confirm` writes
the derived memory page and records the source-event → candidate → destination
lineage receipt. Repeating the same promotion returns the original receipt as
a duplicate and does not write again. Unreviewed candidates are never promoted
automatically. Promotion rechecks suspicious-content acknowledgment and writes
the assertion as encoded, explicitly untrusted data; transcript frontmatter,
Markdown, HTML, links, controls, and bidirectional text cannot alter the
destination document structure.

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

The reproducible production-path benchmark is:

```bash
npm run benchmark:sessions
```

It uses the real adapter, importer, repository, metadata, lexical search, and
extraction paths. The command records its generator seed, machine/dependency
profile, raw samples, throughput, heap/RSS, bounded-failure result, budgets,
and overall status in `test-results/session-performance.json`. Set
`AIWG_SESSION_BENCH_EVENTS=1000000` for release-scale evidence.

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
| 7 | Import lease contention |
| 8 | Coverage below requested threshold |
