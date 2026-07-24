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
aiwg index export --format fortemi-shard --graph project --out aiwg-project.shard
```

`fortemi-shard` always builds the v2 contract and passes it to the canonical
`@fortemi/core/aiwg-index-shard` converter. The shard uses deterministic note/link
identities and preserves the complete v2 envelope and every source record in
the canonical `ai_metadata.aiwg_fortemi_index` carrier. AIWG returns the
converter's archive bytes unchanged: it does not repair component records or
restamp the manifest. The `core-v1` output declares notes, tags, and links;
SKOS, provenance, chunks, privacy fields, checksums, and other rich AIWG data
remain intact inside the embedded source records.

npm package `@fortemi/core@2026.7.13` is pinned exactly. Its signed-release source
tag is `v2026.7.13`; the package-embedded core-v1 contract receipt pins revision 19,
schema 1.2.0, and the `core-v1` authority bytes. The immutable representative
archive and machine-readable producer/consumer receipt live under
`test/fixtures/fortemi-shard/`. Blocking CI verifies the locked npm integrity,
archive digest and manifest, clean PGlite import/re-export, five rejection
classes with zero mutation, and a clean Fortemi server import/re-export at the
receipt's exact server commit. The server check consumes the archive unchanged.

The same published package also exposes the report-bearing
`aiwgFortemiIndexToKnowledgeShardWithReport` entry point. AIWG pins the released
source fixture and verifies byte-identical `2.0.0/full-v1` conversion against
Fortemi contract revision 20 in
`test/fixtures/fortemi-shard/aiwg-full-v1.consumer.receipt.json`. This is a
published-package consumer receipt, not a capability advertisement: the CLI
continues to emit only the independently proven `core-v1` path until the
Fortemi destination and cross-repository advertisement issues close.
This package adoption succeeds the bounded core-v1 delivery in AIWG
[#1790](https://git.integrolabs.net/roctinam/aiwg/issues/1790) and
[#1797](https://git.integrolabs.net/roctinam/aiwg/issues/1797). Native
full-v1 production remains coordinated through Fortemi React
[#381](https://git.integrolabs.net/Fortemi/fortemi-react/issues/381), with
cross-repository advertisement gated by React
[#382](https://git.integrolabs.net/Fortemi/fortemi-react/issues/382).

The representative v2 graph is deterministic. The committed `.shard` is the
immutable evidence artifact identified by its receipt digest; canonical zero
mtimes in both tar entries and the gzip header make independently regenerated
converter output byte-identical. Semantic comparisons additionally operate on
validated components and the embedded AIWG envelope.

`full-v1` is reserved for lossless server/PGlite interchange over every
component declared by that profile. `record-v1` is a RecordStore subset with an
explicit loss/unsupported-field report. Neither name may be inferred merely
from filenames in an archive.

AIWG advertises only `core-v1` for this converter. Its profile inventory is
notes, collections, tags, templates, and links. The representative AIWG graph
materializes notes, tags, and links; collections and templates are recorded as
absent in the source graph, not silently lost. AIWG chunks, provenance, SKOS,
privacy, checksums, hierarchy, and relationship detail are reversibly carried
inside `metadata.aiwg_fortemi_index` and checked after both consumer round trips.

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
- SKOS concept and relation extraction from source frontmatter
  (`skos.concepts`, `skos.relations`, `skos_concepts`, `skos_relations`) plus
  a tag-to-SKOS projection in the `aiwg-tags` scheme so every tagged record has
  concept coverage for Fortemi community and graph tooling. The Fortemi Core
  sync manifest records `skos_coverage.records_with_concepts`,
  `skos_coverage.total_records`, and `skos_coverage.ratio` for verification.

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
answer-writing step.

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
- the locked Fortemi 2026.7.13 package contract remains green against AIWG v2
  export, query, and relationship traversal fixtures;
- semantic/hybrid behavior keeps the static-cache CI fixture green, with any
  direct Fortemi package integration gated and skipped cleanly without
  credentials or optional dependencies;
- fallback/rollback remains documented and tested through `--backend local`
  for the deprecation window.

Knowledge Shard conversion has additional, independent gates:

- AIWG CI pins published `@fortemi/core@2026.7.13`
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
instead uses the locked `@fortemi/core@2026.7.13` dependency and `npm ci`.

For shard conversion, AIWG now pins `@fortemi/core@2026.7.13`. The immutable
`core-v1` receipt records the registry integrity, Core authority and schema
bundle digests, archive SHA-256, producer/consumer revisions, and capability
loss report. Blocking CI verifies the actual published converter, a clean
PGlite import/re-export, and a clean Fortemi server import/re-export.

The separate `full-v1` consumer receipt binds the public package entry point,
release source/tag, registry integrity, schema-2 authority digests, source
fixture, deterministic 33-component archive, and zero-loss conversion report.
It deliberately records `advertised: false`: Fortemi schema-2 runtime support
and the independent destination matrix remain external gates.

The default static-index fixture path still does not require a live service.
The separate portable-shard conformance workflow starts an isolated Fortemi
test database, applies the pinned server harness to an exact clean checkout,
and proves clean import/re-export plus atomic rejection behavior. This evidence
is limited to named profile `core-v1`; removing the legacy local backend remains
gated by deprecation, fallback, and rollback evidence.
