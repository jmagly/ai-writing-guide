# ADR: Unified Registry Shape — Extend `aiwg.config.installed.source` (No Sibling Registry File)

## Status

**PROPOSED** — companion to [#1038](../../../../issues/1038); required by [#1035](../../../../issues/1035), [#1037](../../../../issues/1037)

## Date

2026-05-01

## Context

### Trigger

Epic [#1033](../../../../issues/1033) needs a registry to track deployed project-local artifacts (which provider paths each was deployed to, deploy timestamp, manifest hash for stale-detection). The original spec proposed a sibling file `.aiwg/extensions/registry.json` mirroring the legacy `.aiwg/frameworks/registry.json`. The legacy file is mid-migration into the unified `aiwg.config.installed` map (`src/config/aiwg-config.ts:542`). Adding another sibling file repeats the mistake we are actively unwinding.

### Current state — what `InstalledEntry` actually looks like

The companion issue body referenced an `installedFrom: 'builtin'|'registry'|'local'|'git'` enum. The actual current shape in `src/config/aiwg-config.ts:33` is:

```ts
export interface InstalledEntry {
  version: string;
  source: 'bundled' | 'cache' | string;  // string = git URL
  installedAt: string;
  deployedTo: Record<string, DeployedArtifactCounts>;
  manifestHash?: string;
}
```

The actual discriminator is `source`, not `installedFrom`. Current values:

- `'bundled'` — came from the npm package (upstream `agentic/code/<type>/<name>/`)
- `'cache'` — came from `~/.cache/aiwg/packages/` (the [#557](../../../../issues/557) cache for `aiwg install owner/repo`)
- a git URL string — direct source URL for a git-installed package

This ADR aligns with the real field name. References elsewhere (including [#1038](../../../../issues/1038)) that mention `installedFrom` are using the placeholder name from the original gap analysis; the field is `source`.

### Constraints

1. The registry must support project-local entries with sufficient metadata to enable `aiwg refresh` reconciliation, `aiwg doctor` reporting, and `aiwg promote` (graduation).
2. Adding fields to `InstalledEntry` is straightforward; adding a sibling registry file creates a second source of truth and is rejected.
3. The schema must round-trip cleanly — entries written by `aiwg use` must read back identically on the next CLI invocation.
4. The legacy `.aiwg/frameworks/registry.json` deprecation timeline (handled in [#1047](../../../../issues/1047)) is independent of this ADR, but this ADR codifies that no new registry-style sibling files are introduced.

### Scope boundary

This ADR defines:
- The `source` enum extension for project-local entries
- The schema additions required to track project-local-specific metadata
- The migration story for the legacy `.aiwg/frameworks/registry.json` (high level — implementation in [#1047](../../../../issues/1047))

It does NOT:
- Implement the schema changes (that's the work delegated to [#1035](../../../../issues/1035) deploy and [#1047](../../../../issues/1047) legacy migration)
- Define the manifest schema itself ([#1044](../../../../issues/1044))
- Define override / shadowing policy ([#1041](../../../../issues/1041))

## Decision

### 1. Extend `InstalledEntry.source` to Include `'project-local'`

```ts
export interface InstalledEntry {
  version: string;
  source: 'bundled' | 'cache' | 'project-local' | string;
  installedAt: string;
  deployedTo: Record<string, DeployedArtifactCounts>;
  manifestHash?: string;

  /** Project-local-only fields (set when source === 'project-local') */
  localPath?: string;          // e.g., ".aiwg/extensions/foo/"
  localType?: ProjectLocalType; // 'extension' | 'addon' | 'framework' | 'plugin'
  manifestVersion?: string;     // schema version of the manifest.json this entry was written from
}

export type ProjectLocalType = 'extension' | 'addon' | 'framework' | 'plugin';
```

`source: 'project-local'` is the new enum literal. `localPath`, `localType`, and `manifestVersion` are optional fields that MUST be set when `source === 'project-local'` and MUST be absent (or null) otherwise.

The string-typed git-URL case for `source` is preserved unchanged.

### 2. No Sibling Registry File

Project-local artifacts register under the unified `aiwg.config.installed` map. There is no `.aiwg/extensions/registry.json`, no `.aiwg/addons/registry.json`, and no other per-type registry sibling. The four canonical paths from [#1039](../../../../issues/1039) (`.aiwg/{extensions,addons,frameworks,plugins}/<name>/`) are scanned at runtime; the registry only persists deployment state.

### 3. Filesystem-First Source-of-Truth (Restating from #1039)

This ADR restates the precedence rule from [#1039](../../../../issues/1039) §4 to make registry-side semantics explicit:

| Filesystem state | Registry state | Outcome on next `aiwg refresh` |
|------------------|----------------|--------------------------------|
| `<dir>/manifest.json` present | entry present, `source === 'project-local'` | No change |
| present | entry absent | New entry written (`source: 'project-local'`, fresh `installedAt`, recompute `manifestHash`) |
| present | entry present, `source !== 'project-local'` (collision) | Surface in doctor; reconciliation requires operator intervention |
| absent | entry present, `source === 'project-local'` | Stale entry — reverted (deployed files removed per [#1037](../../../../issues/1037)) and entry deleted from registry |
| absent | entry absent | No-op |

### 4. Migration: Legacy `.aiwg/frameworks/registry.json` → Unified Config

The unified-registry migration is **already in progress** in `src/config/aiwg-config.ts:542` — on first config load, the legacy file is read and entries are written into the unified `installed` map. What is missing is the **deletion** of the legacy file after successful migration.

This ADR specifies the deletion sequencing (handed off to [#1047](../../../../issues/1047) for implementation):

1. After successful migration, write a marker comment to the legacy file: `{"_deprecated": "Migrated to aiwg.config.installed on <timestamp>", "frameworks": [...]}` — keep the original payload so partial-rollback is recoverable.
2. After two minor versions with the marker present, delete the legacy file on next migration pass.
3. `aiwg doctor` surfaces residual legacy files until deletion.

This means: as long as the legacy file is in transition state, the unified config is authoritative. Conflicts between the legacy file and the unified config are resolved in favor of the unified config (the legacy file is treated as an out-of-date snapshot).

### 5. Schema Additions Are Additive

The three new optional fields (`localPath`, `localType`, `manifestVersion`) are added to `InstalledEntry`. Existing entries (with `source: 'bundled'` or git URL) continue to read and write without these fields — they are simply absent.

JSON schema migration: the `version: '1'` discriminator on `AiwgConfig` does NOT need to bump. These are additive optional fields. Old CLI versions reading a config written by a new CLI will silently ignore the new fields (forward-compat); new CLI versions reading a config written by an old CLI will get `undefined` for the new fields (backward-compat). Both are correct.

### 6. Out of Scope: Persistent Project-Local Manifest Cache

A natural temptation is to write a per-project cached copy of every project-local `manifest.json` (e.g., `.aiwg/.cache/manifests.json`) for fast lookup. This ADR explicitly does NOT add such a cache:

- Filesystem scan of `.aiwg/<type>/<name>/manifest.json` is fast (≤200 manifests, ≤64 KB each per [#1044](../../../../issues/1044)).
- A cache would create a third source of truth (filesystem, config, cache) that can fall out of sync.
- The `manifestHash` field on `InstalledEntry` already provides stale-detection without the cache.

If discovery performance becomes a problem in measurement, a cache can be added later as a non-breaking optimization.

## Decision Drivers

1. **One source of truth per concern**: filesystem owns "what artifacts exist," `aiwg.config.installed` owns "what is currently deployed where." A sibling registry file would muddy this.
2. **Don't recreate the legacy mistake**: the unified registry exists precisely because the sibling-registry pattern caused drift. Adding a new sibling immediately after migrating away is structural debt.
3. **Match real code**: aligning with `src/config/aiwg-config.ts:33`'s actual field names eliminates a class of "ADR vs reality" confusion that has cost time elsewhere.
4. **Additive only**: schema migration is the most expensive thing to get wrong; making the changes additive avoids version bumps and ensures forward/backward compat.

## Decision Matrix

| Alternative | Source-of-truth clarity | Migration cost | Cross-tool consistency | Score |
|-------------|------------------------|----------------|------------------------|-------|
| **Extend `installed.source` (SELECTED)** | 5 | 2 (additive only) | 5 | **4.0** |
| Sibling `.aiwg/<type>/registry.json` per type | 2 | 3 | 2 | 2.3 |
| Single `.aiwg/registry.json` (project-local only) | 3 | 3 | 3 | 3.0 |
| Hybrid: `installed` is canonical, materialized cache file | 4 | 4 | 3 | 3.7 |

## Consequences

### Positive

- Single registry surface across all sources (`bundled`, `cache`, git URL, `project-local`) — `aiwg list`, `aiwg doctor`, and `aiwg refresh` all operate on one map
- Project-local entries are first-class, not a sidecar
- Backward-compatible — existing config files read unchanged

### Negative

- Operators inspecting `aiwg.config` see project-local entries mixed with upstream entries; the `source` discriminator is the only differentiator. Mitigated by `aiwg list --project-local` and `aiwg doctor` per-source breakdowns.
- The legacy `.aiwg/frameworks/registry.json` lingers until [#1047](../../../../issues/1047) lands — minor wart in `aiwg doctor` until then.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Legacy file conflicts with unified entries during migration window | Low | Low | Unified config is authoritative; legacy treated as out-of-date snapshot |
| Old CLI overwrites a config with `source: 'project-local'` and drops the new fields | Low | Medium | `version: '1'` discriminator unchanged; old CLIs preserve unknown fields when serializing (current implementation does — verify in [#1035](../../../../issues/1035) tests) |
| Operator manually edits `aiwg.config` and sets `source: 'project-local'` without a corresponding `localPath` directory | Low | Low | Validation refuses (`source: 'project-local'` requires `localPath` and `localType`) |
| Future need for a fifth source kind | Low | Low | Add another enum literal — additive |

## Implementation Sequence

1. This ADR accepted
2. [#1044](../../../../issues/1044) manifest schema (defines what `manifestVersion` and `localType` mean)
3. [#1034](../../../../issues/1034) discovery reads existing entries; refuses entries with `source: 'project-local'` but missing `localPath`
4. [#1035](../../../../issues/1035) deploy writes project-local entries with full schema
5. [#1037](../../../../issues/1037) `aiwg remove` reverts project-local entries (deletes both deployed files and registry entry)
6. [#1047](../../../../issues/1047) deletes legacy `.aiwg/frameworks/registry.json` per §4 sequencing

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form invariant (registry source label is E1)
- [#1039](../../../../issues/1039) — Directory layout (§4 source-of-truth precedence — re-stated here)
- [#1041](../../../../issues/1041) — Override / shadow policy (uses `source` to determine precedence on collision)
- [#1044](../../../../issues/1044) — Manifest schema (defines `localType` discriminator and `manifestVersion`)
- [#1047](../../../../issues/1047) — Legacy registry deletion (consumes §4 sequencing)
- `src/config/aiwg-config.ts:33` — current `InstalledEntry` interface this ADR extends
- `src/config/aiwg-config.ts:542` — current legacy migration code path
