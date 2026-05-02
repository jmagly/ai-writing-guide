# ADR: `.aiwg/` Directory Layout for Project-Local Artifacts

## Status

**PROPOSED** — companion to [#1038](../../../../issues/1038), required by [#1034](../../../../issues/1034)

## Date

2026-05-01

## Context

### Trigger

Epic [#1033](../../../../issues/1033) introduces project-local artifact discovery across four bundle types (extension, addon, framework, plugin). [#1038](../../../../issues/1038) established the identical-form portability invariant. This ADR fills the next required slot: where exactly do project-local artifacts live, and how do those paths interact with the existing `.aiwg/` content?

### Current state of `.aiwg/`

The `.aiwg/` directory already hosts a substantial amount of content with established semantics:

```
.aiwg/
├── activity.log              # unified cross-framework event log
├── aiwg.config               # project config (delivery, providers, installed)
├── architecture/             # ADRs, design docs, schemas
├── deployment/               # deployment plans, runbooks
├── frameworks/               # LEGACY: registry.json (mid-migration to aiwg.config.json.installed)
├── intake/                   # project intake forms
├── memory/                   # auto-memory (per-platform)
├── planning/                 # phase plans
├── quality/                  # reviews
├── ralph/                    # internal agent loop state
├── ralph-external/           # external agent loop state
├── reports/                  # generated reports
├── requirements/             # UCs, NFRs, user stories
├── risks/                    # risk register
├── security/                 # threat models, classifications
├── testing/                  # test strategy, plans
└── working/                  # temporary scratch
```

`.aiwg/frameworks/` already exists for the legacy `registry.json` that `src/config/aiwg-config.ts:542` reads on first load and migrates into `aiwg.config.json.installed`. The legacy file lingers because no removal path exists yet (tracked in [#1047](../../../../issues/1047)).

### Constraints

1. The layout must support all four bundle types as canonical authoring locations.
2. The chosen paths must be distinct from existing `.aiwg/` semantic dirs (no collision with `architecture/`, `requirements/`, etc.).
3. `.aiwg/frameworks/` is occupied by legacy registry data — repurposing it for project-local frameworks requires that legacy data move first.
4. The identical-form invariant ([#1038](../../../../issues/1038)) requires that project-local paths mirror their upstream counterparts (`agentic/code/addons/`, `agentic/code/frameworks/`).

### Scope boundary

This ADR defines paths and source-of-truth precedence. It does NOT:

- Define manifest schema (deferred to [#1044](../../../../issues/1044))
- Define registry shape (deferred to [#1040](../../../../issues/1040))
- Implement the legacy `frameworks/registry.json` migration (deferred to [#1047](../../../../issues/1047))

## Decision

### 1. Canonical Project-Local Paths

The four bundle types are authored at the following paths under `.aiwg/`:

| Bundle type | Canonical path | Upstream counterpart |
|-------------|---------------|---------------------|
| Extension | `.aiwg/extensions/<name>/` | (no direct upstream — extensions are bundle-local artifact collections; closest analogue is the unified `Extension` type in `src/extensions/`) |
| Addon | `.aiwg/addons/<name>/` | `agentic/code/addons/<name>/` |
| Framework | `.aiwg/frameworks/<name>/` | `agentic/code/frameworks/<name>/` |
| Plugin | `.aiwg/plugins/<name>/` | (no direct upstream — plugins are a delivery wrapper; closest analogue is registry-installed packages from `aiwg install owner/repo`) |

Each `<name>` directory contains a `manifest.json` plus the bundle's contents (agents, skills, rules, templates, hooks, etc.) per the manifest schema defined in [#1044](../../../../issues/1044).

### 2. Flat Layout — No Nested Bundles

Nested bundle directories are NOT permitted. `.aiwg/extensions/team-a/skill-x/` is invalid; the discovery scanner only recognizes one level of bundle directory under each `.aiwg/<type>/` root.

Rationale: nested bundles defeat the identical-form invariant (upstream is flat) and create ambiguity in the registry — should `team-a` or `skill-x` be the registered ID?

If an operator wants logical grouping, they SHOULD prefix bundle names: `.aiwg/extensions/team-a-skill-x/`.

### 3. Legacy `.aiwg/frameworks/registry.json` Coexistence

`.aiwg/frameworks/registry.json` is the legacy file mid-migration into `aiwg.config.json.installed`. While the legacy file exists, the discovery scanner MUST:

1. Treat `.aiwg/frameworks/registry.json` as a non-bundle file (skip it during the scan — only directories that contain `manifest.json` are bundles).
2. Surface its presence in `aiwg doctor` output as a deprecation notice.

After [#1047](../../../../issues/1047) lands the deletion path, this rule becomes a no-op (the file is gone).

This means: `.aiwg/frameworks/<name>/` is a valid project-local framework today, as long as `<name>/manifest.json` exists. The legacy `registry.json` is just a sibling file the scanner ignores. **No sequencing dependency between this ADR and [#1047](../../../../issues/1047) for new project-local content** — the discovery layer does not conflict with the legacy file. [#1047](../../../../issues/1047) is required for the deprecation hygiene story, not for the discovery story.

### 4. Source-of-Truth Precedence

Two pieces of information about project-local artifacts can disagree:

- **The filesystem** (`.aiwg/<type>/<name>/manifest.json` is present and parses)
- **The config** (`aiwg.config.json.installed["<name>"].installedFrom == "project-local"`)

Precedence:

| Filesystem state | Config state | Effective state |
|------------------|--------------|-----------------|
| `manifest.json` present | entry present, `installedFrom == "project-local"` | Active project-local artifact |
| `manifest.json` present | entry absent | New artifact — write entry on next `aiwg use`/`refresh` |
| `manifest.json` absent | entry present, `installedFrom == "project-local"` | Stale entry — `aiwg doctor` warns; `aiwg refresh` removes the entry |
| `manifest.json` absent | entry absent | No artifact (normal) |

The **filesystem is authoritative for existence**; the **config is authoritative for deployment state**. They are reconciled on every `aiwg refresh` and reported by `aiwg doctor`.

### 5. Reserved Names and Path Safety

The following bundle names are reserved and rejected by validation:

- Names starting with `.` (e.g., `.foo/`) — hidden by convention; reserved
- Names containing path separators or `..` — security
- Names matching upstream-reserved IDs that have not been declared in `overrides:` (per [#1041](../../../../issues/1041))
- Names that don't match `[a-z0-9][a-z0-9-]*[a-z0-9]` (kebab-case, alphanumeric)

Symlinked bundle directories are refused by default per the threat model ([#1042](../../../../issues/1042)), with an explicit `--allow-symlinks` flag for advanced use cases.

### 6. Existing `.aiwg/` Subdirectories Remain Untouched

This ADR does NOT change the semantics of any existing `.aiwg/` subdirectory. `.aiwg/intake/`, `.aiwg/requirements/`, `.aiwg/architecture/`, etc. continue to mean what they meant before. The four new top-level dirs (`extensions/`, `addons/`, `frameworks/`, `plugins/`) are additive.

`.aiwg/frameworks/` is the only existing dir that overlaps with the new canonical paths, and §3 covers its coexistence story.

## Decision Drivers

1. **Mirror upstream**: keeping `.aiwg/<type>/` parallel to `agentic/code/<type>/` is what makes the identical-form invariant tractable.
2. **No-op when absent**: each of the four dirs is optional; absence means zero project-local artifacts of that type. Operators who never create one pay no cost.
3. **Filesystem as source-of-truth for existence**: operators expect to add a directory and have it picked up. Any precedence rule that lets the config "ghost" a deleted directory creates user confusion.
4. **Don't repurpose `.aiwg/frameworks/`**: keeping the same name and adding the bundle-discovery semantic on top is less disruptive than renaming. The legacy file is just ignored by the scanner.

## Decision Matrix

| Alternative | Identical-form alignment | Disruption | Operator clarity | Score |
|-------------|--------------------------|------------|-------------------|-------|
| **`.aiwg/{extensions,addons,frameworks,plugins}/` flat (SELECTED)** | 5 | 3 (legacy coexistence) | 4 | **4.0** |
| Single `.aiwg/bundles/<type>/<name>/` | 3 (extra path layer breaks invariant) | 4 | 3 | 3.3 |
| Repurpose entirely under `.aiwg/local/<type>/` | 3 | 5 (no legacy collision) | 2 (extra prefix) | 3.3 |
| Per-type config: `.aiwg/aiwg-extensions/` | 2 | 5 | 2 | 3.0 |

## Consequences

### Positive

- Project-local paths mirror upstream paths cleanly, supporting the identical-form invariant
- Each bundle type has its own canonical home; no need to inspect manifest before knowing the type
- Filesystem-first precedence matches operator intuition
- Legacy `.aiwg/frameworks/registry.json` requires no immediate migration to start using `.aiwg/frameworks/<name>/`

### Negative

- Four new top-level dirs under `.aiwg/`. Discoverable via `aiwg doctor` and docs, but adds visual clutter for operators who don't use project-local artifacts (they remain absent if unused — no clutter on disk)
- The legacy `frameworks/registry.json` file persists alongside new project-local frameworks until [#1047](../../../../issues/1047) lands, which is a small wart in `aiwg doctor` output

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Operator creates a name that collides with a reserved upstream ID | Medium | Low | Validation in [#1044](../../../../issues/1044) refuses; `aiwg new-extension` ([#1050](../../../../issues/1050)) checks before scaffolding |
| Operator nests bundles expecting recursive discovery | Medium | Low | Doctor warning; docs ([#1051](../../../../issues/1051)) make flat layout explicit |
| Stale config entry confuses operator after deleting a bundle dir | Low | Low | `aiwg doctor` surfaces; `aiwg refresh` cleans up |
| Legacy `frameworks/registry.json` gets parsed as a bundle by mistake | Very low | Medium | Scanner only recognizes directories with `manifest.json`, not files |

## Implementation Sequence

1. This ADR accepted
2. [#1044](../../../../issues/1044) manifest schema (defines what counts as a valid `manifest.json` per §1)
3. [#1034](../../../../issues/1034) discovery implements the four-dir scan with §4 precedence
4. [#1047](../../../../issues/1047) deletes the legacy `frameworks/registry.json` (parallel; not a blocker)

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form portability invariant (this ADR's foundation)
- [#1040](../../../../issues/1040) — Unified registry shape (defines §4's config side)
- [#1041](../../../../issues/1041) — Override / shadowing policy (§5 reserved names)
- [#1042](../../../../issues/1042) — Threat model (§5 symlink refusal)
- [#1044](../../../../issues/1044) — Manifest schema (§1 manifest.json structure)
- [#1047](../../../../issues/1047) — Legacy `frameworks/registry.json` migration
- [#1050](../../../../issues/1050) — Scaffolding CLI (§5 name validation entry point)
- `src/config/aiwg-config.ts:542` — current legacy migration code path
- `agentic/code/addons/` — upstream addon layout this mirrors
- `agentic/code/frameworks/` — upstream framework layout this mirrors
