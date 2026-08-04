# Fortemi Index Export Contract

AIWG can emit browser-consumable index exports for Fortemi integrations. The
default remains the v1 compatibility contract:

```bash
aiwg index export --format fortemi --graph project --out aiwg-fortemi-index.json
```

The Fortemi Core migration uses a v2 contract and local static cache for the
default AIWG artifact search/traversal paths:

```bash
aiwg index export --format fortemi --graph project --schema-version v2 --out aiwg-fortemi-index-v2.json
aiwg index sync --graph project
aiwg index build --graph source
aiwg index sync --graph source
aiwg index build --graph user
aiwg index sync --graph user
```

To convert an AIWG v2 index into a Knowledge Shard candidate, use:

```bash
aiwg index export --format fortemi-shard --graph project \
  --schema-version 2.0.0 --profile full-v1 --fail-on-loss \
  --out aiwg-project.shard --json
```

`fortemi-shard` always builds the v2 contract and passes it to the canonical
`@fortemi/core/aiwg-index-shard` converter. The default and advertised tuple is
exactly `2.0.0/full-v1`; AIWG never infers a profile from a filename. The JSON
result includes the Core conversion receipt, `lossless` state, and structured
losses. `--fail-on-loss` prevents a lossy result from being written.

During the compatibility window, legacy output remains explicit:

```bash
aiwg index export --format fortemi-shard --graph project \
  --schema-version 1.2.0 --profile core-v1 \
  --out aiwg-project-core-v1.shard
```

The shard uses deterministic note/link identities and preserves the complete
v2 envelope and every source record in the canonical
`ai_metadata.aiwg_fortemi_index` carrier. AIWG returns the converter's archive
bytes unchanged: it does not repair component records or restamp the manifest.
The legacy `core-v1` output declares notes, collections, tags, and links;
SKOS, provenance, chunks, privacy fields, checksums, and other rich AIWG data
remain intact inside the embedded source records.

npm package `@fortemi/core@2026.7.15` is pinned exactly in both the root and CLI
manifests. Its registry artifact has integrity
`sha512-49GThHQHzLFD2BbjgXB7AUznRrwtWo8MsH6IcFMhSmCKj/h+Q5j18EBpkwPHJfC5E7crp+rVzy/GcrT/PF1SXA==`
and corresponds to signed-release source tag `v2026.7.15`. Compatibility
verification confirms that the public `@fortemi/core/aiwg-index-shard`
converter exports remain available and that the package root now exports
`FORTEMI_SERVER_COMPATIBILITY_REVISION` (`2026-07-06`). The package-embedded
core-v1 contract receipt pins revision 19, schema 1.2.0, and the `core-v1`
authority bytes. The immutable representative
archive and machine-readable producer/consumer receipt live under
`test/fixtures/fortemi-shard/`. Blocking CI verifies the locked npm integrity,
archive digest and manifest, clean PGlite import/re-export, five rejection
classes with zero mutation, and a clean Fortemi server import/re-export at the
receipt's exact server receipt commit. The server check consumes the archive
unchanged through the two native Fortemi conformance tests; no patch is applied
to the clean checkout.

The published package exposes the report-bearing
`aiwgFortemiIndexToKnowledgeShardWithReport` entry point. AIWG pins the released
source fixture and verifies byte-identical `2.0.0/full-v1` conversion against
Fortemi contract revision 20 in
`test/fixtures/fortemi-shard/aiwg-full-v1.consumer.receipt.json`. This
published-package consumer receipt is the basis for the CLI default.
This package adoption succeeds the bounded core-v1 delivery in AIWG
[#1790](https://git.integrolabs.net/roctinam/aiwg/issues/1790) and
[#1797](https://git.integrolabs.net/roctinam/aiwg/issues/1797). Native
full-v1 production and cross-repository advertisement are now receipt-backed:
Fortemi React [#381](https://git.integrolabs.net/Fortemi/fortemi-react/issues/381)
and [#382](https://git.integrolabs.net/Fortemi/fortemi-react/issues/382), plus
Fortemi runtime [#1087](https://git.integrolabs.net/Fortemi/fortemi/issues/1087)
and destination matrix
[#1084](https://git.integrolabs.net/Fortemi/fortemi/issues/1084), are closed.
These gates support only the named exact `2.0.0/full-v1` tuple, not suite-wide
portability or complete-backup claims.

The representative v2 graph is deterministic. The committed `.shard` is the
immutable evidence artifact identified by its receipt digest; canonical zero
mtimes in both tar entries and the gzip header make independently regenerated
converter output byte-identical. Semantic comparisons additionally operate on
validated components and the embedded AIWG envelope.

`full-v1` is reserved for lossless server/PGlite interchange over every
component declared by that profile. `record-v1` is a RecordStore subset with an
explicit loss/unsupported-field report. Neither name may be inferred merely
from filenames in an archive.

The legacy `core-v1` profile inventory is notes, collections, tags, templates,
and links. The representative AIWG graph
materializes notes, a three-level collection hierarchy, tags, and links;
templates are recorded as absent in the source graph, not silently lost. AIWG
chunks, provenance, SKOS, privacy, checksums, lifecycle state, tombstones,
hierarchy, and relationship detail are reversibly carried inside
`metadata.aiwg_fortemi_index` and checked after both consumer round trips.

## Upgrade and migration

Source-backed indices and shards are regenerated rather than modified in
place. Preview first, write to a new path, verify, then switch consumers:

```bash
aiwg index export --format fortemi-shard --graph project \
  --schema-version 2.0.0 --profile full-v1 --fail-on-loss \
  --out aiwg-project-v2.shard --dry-run --json
aiwg index export --format fortemi-shard --graph project \
  --schema-version 2.0.0 --profile full-v1 --fail-on-loss \
  --out aiwg-project-v2.shard --json
```

Existing paths are never overwritten unless `--force` is explicit. Writes use
a same-directory temporary file and an atomic publish step; failed conversion
or publication leaves the prior output untouched. Repeating an export with the
same source and deterministic timestamp produces the same archive bytes.

Source-less `core-v1` artifacts cannot be promoted losslessly because omitted
rich components cannot be reconstructed. The CLI provides a non-mutating,
actionable diagnostic:

```bash
aiwg index export --format fortemi-shard \
  --migrate-from legacy-core-v1.shard --dry-run --json
```

Retain the legacy archive for rollback and regenerate full-v1 from the
source-backed AIWG index. To roll back a consumer, select the retained
`1.2.0/core-v1` archive explicitly; do not relabel a full-v1 archive.

This static-index conversion path is separate from the older Fortemi MCP
storage adapter. The adapter remains a live storage backend; it does not select
Knowledge Shard schema/profile tuples and is not a shard migration mechanism.

The sync command materializes:

```text
.aiwg/.index/fortemi-core/<graph>/aiwg-fortemi-index-v2.json
.aiwg/.index/fortemi-core/<graph>/manifest.json
```

Incremental syncs compare against the previous manifest before stamping a new
generated timestamp, so a repeated sync over unchanged index content reports
`status: "unchanged"` instead of churn from timestamp-only differences.

The cache is the default artifact search backend. AIWG continues to ship
`.aiwg/.index/<graph>/` as the explicit legacy fallback while the local backend
is phased out.
Release packages also include a prebuilt `framework` graph cache under
`prebuilt/fortemi-core/framework/` so `aiwg discover ...` can answer from the
distro package when no local framework cache exists. This
packaged cache is a compact metadata/capability projection; run a local
`aiwg index sync --graph framework` when source-body
fulltext fidelity is required.

## Contracts

### v1 Compatibility

`aiwg.fortemi.index.export.v1` emits `aiwg.artifact` records from the selected
index graph. Domain tools such as AIWG CRM may project CRM records into the same
envelope with `crm.contact`, `crm.organization`, `crm.event`, and
`crm.interaction` records.

The v1 shape is preserved for existing Fortemi React consumers.

AIWG also keeps a v2-to-v1 compatibility projection for older Fortemi React
consumers that still read the v1 static index contract. The projection keeps
AIWG domain record types and searchable text, but removes v2-only fields and
downstream reverse relationships. The JSON schema enforces that boundary by
rejecting v1 exports with v2-only compatibility metadata, graph source
metadata, search/chunk fields, SKOS/provenance-event metadata, or directional
relationship fields.

### v2 Migration Contract

`aiwg.fortemi.index.export.v2` adds AIWG domain records needed for search
replacement:

- capabilities: `aiwg.skill`, `aiwg.agent`, `aiwg.command`, `aiwg.rule`,
  `aiwg.behavior`, `aiwg.flow`, `aiwg.provider`, `aiwg.bundle`;
- research: `aiwg.research.ref`, `aiwg.research.profile`,
  `aiwg.research.view`, `aiwg.research.synthesis`;
- knowledge and memory: `aiwg.kb.page`, `aiwg.memory.entry`;
- tracking and project artifacts: `aiwg.issue`, `aiwg.project.*`, and
  `aiwg.artifact` fallback records.
- source graph records: `aiwg.source.file`, `aiwg.source.module`,
  `aiwg.source.package`, `aiwg.source.builtin`, `aiwg.source.asset`,
  `aiwg.source.unresolved`, and `aiwg.source.entrypoint`.

Each v2 item can include:

- stable IDs derived from record type and source path;
- `source` provenance with graph origin, generated flag, checksum, and update
  timestamp;
- `search` projection fields for discovery/query parity: title, name, summary,
  body, triggers, aliases, capability, tags, phase, type, and frontmatter;
- structured facets, tags, concepts, provenance, privacy, and locality;
- typed relationships with `target_path` and `direction` so dependency,
  citation, profile, and KB graph traversal can be reconstructed;
- source-body chunks and embedding metadata slots for the Fortemi chunk/body
  embedding path;
- an explicit `state_transfer.deleted_at` lifecycle projection for Knowledge
  Shard bridges; active records use `null`, while a source-authored tombstone
  uses an ISO date-time;
- SKOS concept and relation extraction from source frontmatter
  (`skos.concepts`, `skos.relations`, `skos_concepts`, `skos_relations`) plus
  a tag-to-SKOS projection in the `aiwg-tags` scheme so every tagged record has
  concept coverage for Fortemi community and graph tooling. The Fortemi Core
  sync manifest records `skos_coverage.records_with_concepts`,
  `skos_coverage.total_records`, and `skos_coverage.ratio` for verification.

### State-transfer lifecycle

Knowledge Shard lifecycle is never inferred from tracker state or file
absence. A source artifact that intentionally represents a transferable
tombstone declares:

```yaml
state_transfer:
  deleted_at: 2026-07-20T12:30:00Z
```

The v2 index normalizes that value into `state_transfer.deleted_at`. An
explicit active record may declare `deleted_at: null`. Unknown fields, missing
`deleted_at`, and invalid timestamps fail index construction. V1 exports omit
the projection.

This field does not make the AIWG static index a persistence database. It is
AIWG-owned bridge input consumed by the separate
`@fortemi/core/aiwg-index-shard` converter. `operational_state` remains
time-bound evidence about external systems and must never be interpreted as a
Knowledge Shard tombstone.

### Operational live-state provenance

Tracker- and repository-derived memory can declare an allowlisted
`operational_state` block in YAML frontmatter. AIWG carries the normalized
block into the Fortemi v2 record and the embedded Knowledge Shard source
record:

```yaml
operational_state:
  source_repo: roctinam/agentic-sandbox
  source_kind: issue
  source_id: agentic-sandbox#656
  observed_state: open
  observed_at: 2026-07-21T10:00:00Z
  source_updated_at: 2026-07-21T09:00:00Z
  evidence_url: https://git.example.test/roctinam/agentic-sandbox/issues/656
  observer: gitea-mcp
  stale_after: 2026-07-22T10:00:00Z
  classification: fresh
  confidence: source
  current_action_selector: true
```

The classifications are `fresh`, `historical`, `superseded`,
`contradicted`, and `needs-source`:

- `fresh` means supplied authoritative evidence matches the remembered state;
- `historical` preserves chronology but must not drive current action;
- `superseded` means newer authoritative evidence exists for the same source;
- `contradicted` means remembered and live states disagree;
- `needs-source` means the record lacks complete source identity or observation
  metadata.

Fortemi-backed JSON query output includes an `operational_state` projection
with `classification`, `current`, and `requires_live_check`. `current` is true
only for an explicitly fresh `current_action_selector`. It does not make the
cache authoritative: action selection must re-check a time-bound record or any
record with a live source against its named provider before acting. The query
projection therefore keeps `requires_live_check: true` even for a cached fresh
assertion.

Only documented fields are serialized. Evidence URLs are limited to HTTP(S)
and have user information, query parameters, and fragments removed. Arbitrary
headers, tokens, cookies, provider payloads, and unknown frontmatter keys are
discarded. Use `evidence_path` for a local audit artifact and never put live
credentials in operational memory.

### Source Graph Export Boundary

The `source` graph is built locally by AIWG from the filesystem with the
TypeScript compiler API resolver selected in
`.aiwg/architecture/adr-source-code-graph-module-resolution.md`. Fortemi Core
does not scan the repository. It receives the already-built graph through
`aiwg index export --format fortemi --graph source --schema-version v2` or
`aiwg index sync --graph source`.

Source graph exports preserve import relationships, type-only imports,
re-exports, dynamic imports, CommonJS requires, external package and builtin
dependencies, asset imports, entrypoint reachability, derived
implementation-to-test `exercised_by` links, and unresolved import diagnostics.
The original specifier, resolved target, source location, confidence, and
diagnostic metadata are carried on relationship metadata.

Source text chunks are included only through the normal v2 chunk field and can
be suppressed by callers of the export API for static fixtures or package-size
boundaries. The local `.aiwg/.index/source/` graph remains the fallback source
of truth; Fortemi storage/MCP persistence is separate from this static
index/search cache.

## Fortemi-Backed CLI Paths

After `aiwg index sync`, these commands read the local v2 static cache by
default:

```bash
aiwg index discover "intake workflow"
aiwg index show skill intake-wizard
aiwg index query "retrieval" --json
aiwg index query "static retrieval evidence" --fulltext --json
aiwg index query "static retrieval evidence" --semantic --json
aiwg index query "static retrieval architecture" --hybrid --type adr --tags search --path .aiwg/architecture --json
aiwg index deps .aiwg/architecture/search-adr.md --json
aiwg index neighbors --graph kb --node retrieval.md --json
aiwg index set --graph project --op intersection --node-a REF-001 --node-b .aiwg/research/profiles/PROF-001.md --json
aiwg research-query "static retrieval evidence" --sources-only --json
```

The top-level `aiwg discover` and `aiwg show` routes delegate to the same
artifact CLI and inherit the default Fortemi Core backend. Pass
`--backend local` only for the legacy fallback.

`aiwg research-query` uses the same static cache for deterministic research
source selection. It emits REF/PROF source metadata and GRADE extraction for the
research-query skill to synthesize from; it does not replace the agent-mediated
answer-writing step. Thorough retrieval reads the source body captured in the
synced Fortemi record text/chunks, so it remains functional without the original
source file. Quarantine records and generated integrity/artifact scans are
excluded from normal research results. Use `--include-diagnostics` to inspect
them explicitly. Diagnostic severity and confidence labels are never promoted
to GRADE evidence quality; GRADE must be explicitly declared in research
metadata or content.

`aiwg index query --hybrid` is intentionally tied to the
Fortemi static cache. It combines static semantic/chunk scoring with the
existing metadata filters (`--type`, `--phase`, `--tags`, and `--path`) so the
default path exercises the same filtered hybrid contract Fortemi Core exposes.

`aiwg index query --fulltext` also stays cache-local by default: it
ranks the exported v2 record text/chunks, including source body captured at
sync time, with BM25 and preserves the same type/phase/tag/path filters. It
does not need to reread the original source files after the cache has been
synced.

## Fallback And Rollback

Fortemi Core is the default artifact search backend. If the static cache is
missing, stale, malformed, or incompatible, the commands fail with actionable
guidance and the operator can immediately retry with the explicit legacy
backend:

```bash
# Fortemi-backed default
aiwg index query "retrieval"

# Legacy local fallback
aiwg index query "retrieval" --backend local
```

`aiwg index status --json` also reports the Fortemi cache after a
project has synced it or a Fortemi cache manifest exists. It marks the cache
stale when the manifest is unreadable, when the export file is missing or
unreadable, when the export checksum no longer matches the manifest, when the
export schema no longer matches the manifest's expected v2 schema, or when the
source graph has been rebuilt after the Fortemi sync.

A valid synced cache with zero items is not stale. Fortemi-backed query and
fulltext commands return empty result sets, `discover` returns a Fortemi
static-cache no-match hint, and `show` reports no Fortemi artifact match without
falling back to the local AIWG corpus. This keeps empty-cache behavior distinct
from missing or corrupt cache recovery.

Rollback is file-level and does not require data migration:

1. Pass `--backend local` on search/traversal commands to select the legacy
   local backend.
2. Rebuild the local graph if needed:

   ```bash
   aiwg index build --all
   ```

3. Remove only the Fortemi static cache if a clean retry is needed:

   ```bash
   rm -rf .aiwg/.index/fortemi-core
   ```

4. Re-sync later:

   ```bash
   aiwg index sync --graph project
   ```

Do not remove `.aiwg/.index/<graph>/` during rollback. That directory is the
legacy fallback during the deprecation window.

Packaged framework discovery has a second fallback: the npm tarball ships
`prebuilt/fortemi-core/framework/` with a manifest checksum and size ceiling.
The release gate validates that `npm pack` includes those files and that
Fortemi-backed discovery works with an empty `XDG_DATA_HOME`.

## Privacy

The default export privacy is `private`. It is intended for local browser
storage and should not be committed or uploaded. Use `--privacy sanitized` only
for fixture data after removing private names, addresses, tokens, account
identifiers, and operational notes. Use `--privacy public` only for
already-public source material.

Fortemi React consumes `--format fortemi` JSON locally. The
`--format fortemi-shard` archive is a conversion path toward profile-scoped
portable transport. A hosted backend is not required to generate or consume
the static index locally, but verified server-transport claims require the
server import/re-export gate.

For user/global capability sidecars under `~/.aiwg`, see
[`docs/user-level-indices.md`](../user-level-indices.md).

## Migration Gates

The default backend is Fortemi Core. The legacy local backend must remain
available until:

- #1691 parity fixtures run green in CI;
- the locked Fortemi 2026.7.14 package contract remains green against AIWG v2
  export, query, and relationship traversal fixtures;
- semantic/hybrid behavior keeps the static-cache CI fixture green, with any
  direct Fortemi package integration gated and skipped cleanly without
  credentials or optional dependencies;
- fallback/rollback remains documented and tested through `--backend local`
  for the deprecation window.

Knowledge Shard conversion has additional, independent gates:

- AIWG CI pins published `@fortemi/core@2026.7.15`
  and executes the real converter against the current AIWG v2 schema;
- the output declares a supported server-owned profile and validates against a
  revision-and-digest-pinned schema receipt;
- a real Fortemi server imports and re-exports the fixture with no undeclared
  loss for the selected profile.

`@fortemi/core@2026.7.1` remains the historical static-index baseline for this
migration. It includes `@fortemi/core/aiwg-index`, direct
`aiwg.fortemi.index.export.v2` validation, v2 relationship fields, chunked
index helpers, relationship traversal, static semantic/hybrid helpers, SKOS
metadata fields, and provenance-event fields. AIWG tests direct v2 validation
and query behavior against that contract when the package is installed. The
archived package-boundary workflow proposal in
`.aiwg/planning/fortemi-core-index-migration/fortemi-package-boundary-workflow-proposal.md`
installs `@fortemi/core@2026.7.7` without changing the lockfile and sets
`AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1` so a reviewed CI copy would fail if
`@fortemi/core/aiwg-index` is unavailable or rejects the direct v2 export.
That proposal records the earlier static-index gate; the current shard gate
instead uses the locked `@fortemi/core@2026.7.15` dependency and `npm ci`.

For shard conversion, AIWG now pins `@fortemi/core@2026.7.15`. The immutable
`core-v1` receipt records the registry integrity, Core authority and schema
bundle digests, AIWG v2 source-schema authority and digest, archive SHA-256,
producer/consumer revisions, native consumer receipts, exact CI jobs, and
capability loss report. It also binds the canonical matrix coverage vocabulary
used to promote each consumer cell. Blocking CI verifies the actual published
converter, a clean PGlite import/re-export, and a clean Fortemi server
import/re-export.

The separate schema-validated `full-v1` consumer receipt binds the public
package entry point, release source/tag, registry integrity, schema-2 authority
digests, source fixture, deterministic 33-component archive, zero-loss
conversion report, clean PGlite evidence, and Fortemi's immutable schema-2
runtime receipt. It records `advertised: true` and `default_profile: full-v1`
only because the named Fortemi #1084/#1087 and React #381/#382 gates are
closed. Suite-wide and complete-backup claims remain outside this receipt.

The default static-index fixture path still does not require a live service.
The separate portable-shard conformance workflow starts an isolated Fortemi
test database, checks out the exact full-v1 receipt commit, verifies the
server-owned fixture and schema-2 runtime receipt digests, and executes the
native clean-destination full-v1 test. It proves all 33 declared components and
34 count fields, presence semantics, hierarchy and lifecycle preservation,
repeat convergence, compatibility-window handling, and zero-mutation rejection.
The legacy core-v1 cell remains explicit and independently receipt-backed.
This evidence is limited to named profiles; it does not unify the
AIWG static index, Knowledge Shard transport, and live Fortemi persistence
planes. Removing the legacy local backend remains gated by deprecation,
fallback, and rollback evidence.
