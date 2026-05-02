# Non-Functional Requirements: Project-Local Artifact Discovery

## Metadata

- **ID**: NFR-PROJECT-LOCAL
- **Name**: Non-Functional Requirements for Project-Local Artifact Discovery
- **Owner**: Requirements Analyst
- **Status**: PROPOSED
- **Created**: 2026-05-02
- **Priority**: P1
- **Parent Epic**: [#1033](../../../issues/1033)
- **Companion**: [UC-project-local-artifacts.md](./UC-project-local-artifacts.md)

## Scope

Non-functional requirements for the project-local artifact discovery, deployment, override, and graduation lifecycle. Each NFR has a measurable threshold and a verification method.

## Performance

### NFR-PL-1: Discovery Scan Budget (Cold Cache)

| Field | Value |
|-------|-------|
| **Requirement** | Discovery + validation of 50 project-local artifacts MUST complete within 200 ms on commodity hardware (mid-tier laptop, NVMe storage) on cold filesystem cache. |
| **Threshold** | ≤200 ms wall-clock for 50 artifacts |
| **Verification** | Microbenchmark in `test/perf/project-local-discovery.bench.ts` running on CI; fixture creates 50 valid manifests and measures end-to-end scan + validation time. CI fails on regression beyond 250 ms (25% headroom). |
| **Rationale** | `aiwg use` and `aiwg refresh` are interactive commands; >200 ms perceptibly slows the operator. |

### NFR-PL-2: Memory Ceiling During Discovery

| Field | Value |
|-------|-------|
| **Requirement** | Loader memory footprint MUST stay under 50 MB during a 200-artifact discovery (the maximum-allowed bundle count per project). |
| **Threshold** | ≤50 MB resident set size measured between scan start and scan end |
| **Verification** | `process.memoryUsage().heapUsed` sampled at scan start and scan end in the perf benchmark; assert delta < 50 MB. |
| **Rationale** | AIWG runs alongside the operator's editor and other tools; aggressive memory use degrades the host environment. |

### NFR-PL-3: No-Op Path Overhead

| Field | Value |
|-------|-------|
| **Requirement** | Additional startup overhead added to `aiwg use` MUST be <100 ms when zero project-local artifacts exist (none of the four `.aiwg/<type>/` directories exist or all are empty). |
| **Threshold** | ≤100 ms wall-clock added to baseline `aiwg use` time |
| **Verification** | Comparative benchmark: same `aiwg use` invocation with vs without project-local code path (feature flag or branch comparison). Difference must be <100 ms. |
| **Rationale** | Most operators will not use project-local artifacts. They MUST NOT pay a perceptible cost for the feature being available. |

### NFR-PL-4: Refresh Reconciliation Time

| Field | Value |
|-------|-------|
| **Requirement** | `aiwg refresh` end-to-end time (including project-local discovery, deploy, and registry reconciliation) MUST stay within 1.5x the time of `aiwg refresh` on the same project without project-local artifacts. |
| **Threshold** | ≤1.5x baseline refresh time |
| **Verification** | Comparative benchmark with 50-artifact project-local fixture vs empty-fixture baseline. |
| **Rationale** | Refresh is run frequently (release prep, post-update, after `aiwg use`); regression here compounds. |

## Correctness

### NFR-PL-5: Manifest UTF-8 Encoding

| Field | Value |
|-------|-------|
| **Requirement** | Manifest files MUST be UTF-8 encoded. Other encodings MUST be rejected with a clear error. |
| **Threshold** | 0 manifests in a non-UTF-8 encoding accepted |
| **Verification** | Unit test in `test/unit/extensions/manifest-encoding.test.ts` writes manifests in UTF-16, Latin-1, and UTF-8-BOM; asserts validation rejects non-UTF-8 with a structured error citing the encoding mismatch. |
| **Rationale** | Mixed encodings cause subtle parse failures and cross-platform display issues. |

### NFR-PL-6: Filename Casing — Refuse Case-Conflicting Names

| Field | Value |
|-------|-------|
| **Requirement** | Bundle directory names MUST be case-sensitive on Linux and case-preserving on macOS. The discovery scanner MUST refuse to deploy when two bundles within the same `.aiwg/<type>/` directory differ only in case (e.g., `foo/` and `Foo/`). |
| **Threshold** | 0 case-conflicting bundle pairs deployed |
| **Verification** | Unit test creates two manifests with names differing only in case; assert validation refuses with a clear error citing the conflict. |
| **Rationale** | Case-only differences silently break on case-insensitive filesystems (HFS+, default APFS, NTFS) and cause cryptic deploy failures. |

### NFR-PL-7: Idempotent Deploy

| Field | Value |
|-------|-------|
| **Requirement** | Running `aiwg refresh` twice in a row on the same project state MUST produce byte-identical deployed artifacts and an unchanged `aiwg.config` (excluding `installedAt` timestamps which may bump on re-deploy). |
| **Threshold** | 0 byte differences in deployed artifact files between consecutive refresh runs |
| **Verification** | Integration test runs `refresh` twice; diffs the deployed file tree; asserts only `installedAt` fields differ in `aiwg.config`. |
| **Rationale** | Operators run refresh frequently; non-idempotent deploy creates churn in version control and false-positive change detection. |

## Security

### NFR-PL-8: Deploy Path Allowlist Enforcement (Validation Time)

| Field | Value |
|-------|-------|
| **Requirement** | All deploy paths in manifest `pathTemplate` and `pathOverrides` MUST resolve under the allowlisted provider prefixes (`.claude/`, `.codex/`, `.cursor/`, `.factory/`, `.opencode/`, `.warp/`, `.windsurf/`, `.github/`, `~/.openclaw/`, `~/.hermes/`). No `..` segments. No absolute paths outside `~/`. |
| **Threshold** | 0 manifests with disallowed deploy paths accepted |
| **Verification** | Unit test in `test/unit/extensions/manifest.test.ts` provides 8+ adversarial path templates (`../../etc/foo`, `/etc/foo`, `.claude/../config`, `.unknown-provider/foo`, etc.); asserts each is refused with a structured error. |
| **Rationale** | Path traversal at deploy time is a documented critical threat ([#1042](../../../issues/1042) T2). |

### NFR-PL-9: Deploy Path Allowlist Enforcement (Deploy Time)

| Field | Value |
|-------|-------|
| **Requirement** | Defense-in-depth: in addition to validation-time enforcement (NFR-PL-8), the deploy step MUST re-check resolved paths against the allowlist after path-variable substitution and refuse if any resolved path escapes the allowlist. |
| **Threshold** | 0 file writes to disallowed paths |
| **Verification** | Integration test crafts a manifest with a path template that LOOKS allowlisted but resolves to a disallowed path after variable substitution; asserts deploy refuses. |
| **Rationale** | Validation can miss pathological substitutions; deploy-time check is the last line of defense. |

### NFR-PL-10: Symlink Refusal by Default

| Field | Value |
|-------|-------|
| **Requirement** | Discovery scanner MUST refuse symlinked bundle directories (i.e., `.aiwg/extensions/foo/` is a symlink) by default. Operator must pass `--allow-symlinks` to opt in. Use of the flag MUST be recorded in `.aiwg/activity.log`. |
| **Threshold** | 0 symlinked bundles deployed without explicit `--allow-symlinks` |
| **Verification** | Integration test creates a symlinked bundle; asserts default `aiwg use` skips it with a warning; asserts `--allow-symlinks` accepts it; asserts activity log entry written. |
| **Rationale** | Symlink escape is a documented threat ([#1042](../../../issues/1042) T3). |

### NFR-PL-11: Manifest Size Cap

| Field | Value |
|-------|-------|
| **Requirement** | Individual `manifest.json` files MUST be ≤64 KB on disk. Larger files MUST be refused before parse. |
| **Threshold** | 0 files >64 KB parsed |
| **Verification** | Unit test creates a 65 KB manifest; asserts it is refused with a size-limit error before any JSON parse is attempted. |
| **Rationale** | DoS protection per [#1042](../../../issues/1042) D1. |

### NFR-PL-12: Bundle Count Cap

| Field | Value |
|-------|-------|
| **Requirement** | Total bundle count across all four `.aiwg/<type>/` directories MUST be ≤200 per project. Beyond 200, discovery MUST refuse and report the count. |
| **Threshold** | ≤200 bundles per project; refusal at 201+ |
| **Verification** | Integration test creates 201 bundles; asserts discovery refuses with a clear count-limit error. |
| **Rationale** | DoS protection per [#1042](../../../issues/1042) D2. |

## Reliability

### NFR-PL-13: One Bad Manifest Does Not Halt Discovery

| Field | Value |
|-------|-------|
| **Requirement** | A malformed `manifest.json` (invalid JSON, schema-invalid, oversized) MUST NOT prevent discovery of other valid manifests. The scanner reports the bad manifest as a structured error and continues. |
| **Threshold** | 100% of valid manifests in a mixed-validity project successfully process |
| **Verification** | Integration test mixes 1 invalid + 4 valid manifests; asserts 4 deploy successfully and 1 surfaces as an error in the summary. |
| **Rationale** | Brittle discovery defeats the no-op-when-absent value (UC-PL-6) and causes operators to fight the tool. |

### NFR-PL-14: Filesystem-First Source-of-Truth Reconciliation

| Field | Value |
|-------|-------|
| **Requirement** | When a previously-registered project-local bundle is deleted from `.aiwg/<type>/`, the next `aiwg refresh` MUST detect the absence, revert the deployed files, and remove the registry entry. |
| **Threshold** | 0 stale `installed` entries remaining after `aiwg refresh` once source bundle is deleted |
| **Verification** | Integration test deploys a bundle, deletes the source dir, runs `refresh`; asserts deployed files removed and registry entry deleted. |
| **Rationale** | Operator-deleted bundles must not leave orphaned deployed copies that mislead the agent runtime. |

## Operational

### NFR-PL-15: Activity Log Coverage

| Field | Value |
|-------|-------|
| **Requirement** | Discovery, deploy, conflict-resolution, shadow (allowed/refused), and remove events MUST each append a structured entry to `.aiwg/activity.log` per the standard `## [YYYY-MM-DD HH:MM] <op> | <name>:<type> | <summary>` format. |
| **Threshold** | 100% of these events produce an activity-log line |
| **Verification** | Integration test exercises each event type; asserts presence of the corresponding activity-log line. |
| **Rationale** | Operator hygiene per [#1042](../../../issues/1042) R1; activity log is the post-incident audit trail. |

### NFR-PL-16: Doctor Visibility

| Field | Value |
|-------|-------|
| **Requirement** | `aiwg doctor` MUST surface: per-bundle validation status, per-bundle count by type, active shadows (with safety-critical highlighted), deploy-state drift, denylist violations, and unresolvable `@-references`. |
| **Threshold** | All listed conditions reported when present |
| **Verification** | Integration test creates a project state with one example of each condition; asserts each surfaces in `aiwg doctor` output. |
| **Rationale** | Doctor is the operator's primary inspection surface; missing conditions create silent debt. |

## Compatibility

### NFR-PL-17: Backward Compatibility — Existing Projects Without Project-Local Content

| Field | Value |
|-------|-------|
| **Requirement** | Projects that have NO `.aiwg/<type>/` directories MUST continue to work without any behavioral change after this feature ships. No new errors, no new warnings, no new doctor entries. |
| **Threshold** | 0 behavioral differences from the pre-feature baseline |
| **Verification** | UAT test on a project with empty `.aiwg/`; assert `aiwg use`, `aiwg refresh`, `aiwg doctor`, `aiwg list` produce identical output to the baseline (excluding version strings). |
| **Rationale** | Feature is opt-in by directory presence; non-users must pay zero cost. |

### NFR-PL-18: Forward Compatibility — `manifestVersion` Discriminator

| Field | Value |
|-------|-------|
| **Requirement** | Manifests with `manifestVersion: "1"` (current) MUST validate against the unified schema. Manifests with `manifestVersion: "2+"` (future) MUST be refused with a clear "newer schema version, please upgrade AIWG" error rather than silently mis-parsing. |
| **Threshold** | 0 future-version manifests silently accepted |
| **Verification** | Unit test provides `manifestVersion: "2"`; asserts refusal with version-mismatch error. |
| **Rationale** | Forward-compat error path lets future schema bumps coexist with older CLI installations gracefully. |

## Verification Summary

| Category | NFR Count | Verification Method |
|----------|-----------|---------------------|
| Performance | 4 (NFR-PL-1 through 4) | Microbenchmark + comparative |
| Correctness | 3 (NFR-PL-5 through 7) | Unit + integration |
| Security | 5 (NFR-PL-8 through 12) | Unit + integration with adversarial fixtures |
| Reliability | 2 (NFR-PL-13 through 14) | Integration |
| Operational | 2 (NFR-PL-15 through 16) | Integration |
| Compatibility | 2 (NFR-PL-17 through 18) | UAT + unit |

Test surface entry points: `test/unit/extensions/manifest*.test.ts`, `test/integration/project-local-*.test.ts`, `test/perf/project-local-discovery.bench.ts`. All thresholds CI-enforced.

## References

- Epic [#1033](../../../issues/1033)
- Use case companion: [`UC-project-local-artifacts.md`](./UC-project-local-artifacts.md)
- ADR [#1038](../../../issues/1038), [#1039](../../../issues/1039), [#1040](../../../issues/1040), [#1041](../../../issues/1041)
- Threat model [#1042](../../../issues/1042) — sources NFR-PL-8 through NFR-PL-12
- Design [#1043](../../../issues/1043) — sources NFR-PL-16 reference resolution check
- Design [#1044](../../../issues/1044) — sources NFR-PL-11, 12 limits
- Test matrix [#1046](../../../issues/1046) — implements verification methods
