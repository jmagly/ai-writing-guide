# Fortemi Index Export Contract

AIWG can emit browser-consumable index exports for Fortemi integrations. The
default remains the v1 compatibility contract:

```bash
aiwg index export --format fortemi --graph project --out aiwg-fortemi-index.json
```

The Fortemi Core migration adds an opt-in v2 contract and a local static cache
used by the Fortemi-backed AIWG CLI paths:

```bash
aiwg index export --format fortemi --graph project --schema-version v2 --out aiwg-fortemi-index-v2.json
aiwg index sync --backend fortemi-core --graph project
```

The sync command materializes:

```text
.aiwg/.index/fortemi-core/<graph>/aiwg-fortemi-index-v2.json
.aiwg/.index/fortemi-core/<graph>/manifest.json
```

Incremental syncs compare against the previous manifest before stamping a new
generated timestamp, so a repeated sync over unchanged index content reports
`status: "unchanged"` instead of churn from timestamp-only differences.

The cache is opt-in. AIWG continues to read `.aiwg/.index/<graph>/` as the
local fallback until the Fortemi Core default switch is separately approved.
Release packages also include a prebuilt `framework` graph cache under
`prebuilt/fortemi-core/framework/` so `aiwg discover ... --backend fortemi-core`
can answer from the distro package when no local framework cache exists. This
packaged cache is a compact metadata/capability projection; run a local
`aiwg index sync --backend fortemi-core --graph framework` when source-body
fulltext fidelity is required.

## Contracts

### v1 Compatibility

`aiwg.fortemi.index.export.v1` emits `aiwg.artifact` records from the selected
index graph. Domain tools such as AIWG CRM may project CRM records into the same
envelope with `crm.contact`, `crm.organization`, `crm.event`, and
`crm.interaction` records.

The v1 shape is preserved for existing Fortemi React consumers.

AIWG also exposes a v2-to-v1 compatibility projection for the current
`@fortemi/core@2026.7.0` AIWG package validator. The projection keeps AIWG
domain record types and searchable text, but removes v2-only fields and
downstream reverse relationships so the result fits the published v1 static
index contract. The JSON schema enforces that boundary by rejecting v1 exports
with v2-only compatibility metadata, graph source metadata, search/chunk fields,
or directional relationship fields.

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
  embedding path.

## Fortemi-Backed CLI Paths

After `aiwg index sync --backend fortemi-core`, these commands can read the
local v2 static cache:

```bash
aiwg index discover "intake workflow" --backend fortemi-core
aiwg index show skill intake-wizard --backend fortemi-core
aiwg index query "retrieval" --backend fortemi-core --json
aiwg index query "static retrieval evidence" --fulltext --backend fortemi-core --json
aiwg index query "static retrieval evidence" --semantic --backend fortemi-core --json
aiwg index query "static retrieval architecture" --hybrid --backend fortemi-core --type adr --tags search --path .aiwg/architecture --json
aiwg index deps .aiwg/architecture/search-adr.md --backend fortemi-core --json
aiwg index neighbors --graph kb --node retrieval.md --backend fortemi-core --json
aiwg index set --graph project --op intersection --node-a REF-001 --node-b .aiwg/research/profiles/PROF-001.md --backend fortemi-core --json
aiwg research-query "static retrieval evidence" --backend fortemi-core --sources-only --json
```

The top-level `aiwg discover` and `aiwg show` routes delegate to the same
artifact CLI and inherit the backend flag.

`aiwg research-query` uses the same static cache for deterministic research
source selection. It emits REF/PROF source metadata and GRADE extraction for the
research-query skill to synthesize from; it does not replace the agent-mediated
answer-writing step.

`aiwg index query --hybrid --backend fortemi-core` is intentionally tied to the
Fortemi static cache. It combines static semantic/chunk scoring with the
existing metadata filters (`--type`, `--phase`, `--tags`, and `--path`) so the
preview exercises the same filtered hybrid contract Fortemi Core exposes without
changing the local default query behavior.

`aiwg index query --fulltext --backend fortemi-core` also stays cache-local: it
ranks the exported v2 record text/chunks, including source body captured at
sync time, with BM25 and preserves the same type/phase/tag/path filters. It
does not need to reread the original source files after the cache has been
synced.

## Fallback And Rollback

The Fortemi Core backend is not the default. If the static cache is missing,
stale, malformed, or incompatible, the Fortemi-backed commands fail with
actionable guidance and the operator can immediately retry without the backend
flag:

```bash
# Fortemi-backed, opt-in
aiwg index query "retrieval" --backend fortemi-core

# Local fallback
aiwg index query "retrieval"
```

`aiwg index status --json` also reports the opt-in Fortemi cache only after a
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

1. Stop passing `--backend fortemi-core`.
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
   aiwg index sync --backend fortemi-core --graph project
   ```

Do not remove `.aiwg/.index/<graph>/` during rollback. That directory is the
authoritative fallback until the default switch issue has passed the parity
gates and shipped with a rollback window.

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

Fortemi React consumes the JSON locally; `aiwg index export` and
`aiwg index sync --backend fortemi-core` do not require a hosted backend.

## Migration Gates

The default backend must not switch until:

- #1691 parity fixtures run green in CI;
- the Fortemi package accepts the v2 contract and either accepts v2 relationship
  traversal fields directly or AIWG ships a tested projection into Fortemi's
  normalized relationship APIs;
- semantic/hybrid behavior keeps the static-cache CI fixture green, with any
  direct Fortemi package integration gated and skipped cleanly without
  credentials or optional dependencies;
- fallback/rollback remains documented and tested, including a forced-local
  rollback selector or config path after the default switch.

`@fortemi/core@2026.7.0` is the first relevant released baseline for this
migration. It includes `@fortemi/core/aiwg-index`, relationship traversal, and
static semantic/hybrid helpers, but its published AIWG export validator remains
v1-only. AIWG's compatibility projection is tested against that contract when
the package is installed. The proposed package-boundary workflow in
`.aiwg/planning/fortemi-core-index-migration/fortemi-package-boundary-workflow-proposal.md`
installs `@fortemi/core@2026.7.0` without changing the lockfile and sets
`AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1` so a reviewed CI copy would fail if
`@fortemi/core/aiwg-index` is unavailable or rejects the compatibility
projection.

The default static fixture path does not require the package. v2 export adoption
remains gated until the package accepts `aiwg.fortemi.index.export.v2` fixtures
directly, or the v2-to-v1 projection is explicitly approved as the long-term
package boundary.
