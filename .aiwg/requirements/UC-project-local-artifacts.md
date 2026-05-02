# Use Cases: Project-Local Artifact Discovery and Lifecycle

## Metadata

- **ID**: UC-PROJECT-LOCAL
- **Name**: Project-Local Artifact Discovery and Lifecycle
- **Owner**: Requirements Analyst
- **Status**: PROPOSED
- **Created**: 2026-05-02
- **Priority**: P1
- **Parent Epic**: [#1033](../../../issues/1033)
- **Companion**: [NFR-project-local-artifacts.md](./NFR-project-local-artifacts.md)
- **Format**: Brief-catalog style — eight scenarios in a single document (the full per-UC RUP template is reserved for individually owned features; project-local is a unified discovery/deploy/lifecycle capability covered as one feature with eight scenarios).

## Scope

Use cases for the project-local artifact discovery, deployment, override, and graduation lifecycle introduced by [#1033](../../../issues/1033). Covers all four bundle types (extension, addon, framework, plugin) authored under `.aiwg/{extensions,addons,frameworks,plugins}/<name>/`.

## Primary Actors

- **Operator**: developer working in a project that has, or wants to add, project-local artifacts. Owns the `.aiwg/` directory.
- **Project Reviewer**: a second person reviewing a PR that adds or changes project-local artifacts.
- **CLI**: `aiwg use`, `aiwg refresh`, `aiwg list`, `aiwg doctor`, `aiwg remove`, `aiwg promote`.

## Use Cases

### UC-PL-1: First Discovery — Operator Opens a Project With Pre-Populated `.aiwg/extensions/`

**Trigger**: operator clones a project that already has `.aiwg/extensions/foo/manifest.json` checked in.

**Main Success Scenario**:
1. Operator runs `aiwg use sdlc` (or any deploy-triggering command) for the first time in the project.
2. CLI scans the four `.aiwg/<type>/` directories.
3. CLI validates each `manifest.json` against the unified schema ([#1044](../../../issues/1044)).
4. CLI deploys valid artifacts to provider paths (`.claude/`, `.codex/`, etc.).
5. CLI writes `aiwg.config.installed["foo"]` with `source: "project-local"`, `localPath: ".aiwg/extensions/foo/"`, `localType: "extension"`.
6. CLI emits a one-line summary per discovered artifact.

**Postconditions**: project-local artifacts are deployed and registered. `aiwg list --project-local` reflects them.

**Acceptance**: deploy completes within budget (NFR-PL-1); registry entry written exactly once per artifact.

---

### UC-PL-2: Incremental Add — Operator Drops a New Artifact Into `.aiwg/addons/`

**Trigger**: operator creates `.aiwg/addons/bar/manifest.json` and supporting files in an already-initialized project.

**Main Success Scenario**:
1. Operator runs `aiwg refresh`.
2. CLI scans the four directories; finds `bar` is new (filesystem present, no registry entry).
3. CLI validates `bar`'s manifest, deploys, writes registry entry.
4. CLI surfaces the new addition in summary output.

**Postconditions**: `bar` is deployed; existing artifacts are unaffected.

**Variant**: operator runs `aiwg use bar` instead of `refresh` — CLI deploys only `bar`.

---

### UC-PL-3: Operator Overrides Upstream Artifact (Non-Safety-Critical)

**Trigger**: operator's `.aiwg/extensions/foo/agents/api-designer.md` collides with upstream `agentic/code/addons/aiwg-utils/agents/api-designer.md` (same `id`, both deploy to `.claude/agents/api-designer.md`).

**Main Success Scenario**:
1. CLI detects collision during deploy.
2. Per [#1041](../../../issues/1041) precedence chain (project-local > git-installed > cache > bundled), project-local wins.
3. CLI emits a structured warning naming the shadowed upstream component.
4. Project-local artifact deploys to `.claude/agents/api-designer.md`.

**Postconditions**: project-local content is what the platform reads. Upstream is shadowed but not deleted from its source location.

**Variant**: `aiwg list --shadows` enumerates active shadows.

---

### UC-PL-4: Operator Attempts to Shadow a Safety-Critical Upstream Without Declaration

**Trigger**: operator's `.aiwg/extensions/foo/rules/human-authorization.md` matches upstream's `safety-critical: true` artifact, but the project-local `manifest.json` does NOT declare `overrides: ["human-authorization"]`.

**Main Success Scenario**:
1. CLI detects collision during deploy.
2. CLI checks upstream's `safety-critical` flag — true.
3. CLI checks project-local manifest's `overrides:` — does not include the upstream id.
4. CLI **refuses to deploy** the project-local override and falls back to deploying upstream.
5. CLI emits an error explaining the resolution and pointing to the manifest fix.

**Postconditions**: upstream `human-authorization` rule is deployed. The project-local override is NOT deployed. `aiwg.config.installed` records the upstream entry, not the project-local one.

**Variant** (UC-PL-4a, authorized override): operator adds `overrides: ["human-authorization"]` to manifest. Re-run deploys the project-local artifact with a prominent multi-line warning (red in TTY) and an activity-log entry.

---

### UC-PL-5: Malformed Manifest — One Bad Apple Doesn't Spoil the Barrel

**Trigger**: `.aiwg/extensions/foo/manifest.json` has invalid JSON; other project-local artifacts are valid.

**Main Success Scenario**:
1. CLI scans the four directories.
2. CLI fails to parse `foo/manifest.json`; records structured error (path, reason).
3. CLI continues scanning; valid artifacts process normally.
4. CLI summary reports `1 artifact failed validation, 3 deployed successfully` and surfaces the error path/reason.

**Postconditions**: valid artifacts deployed; invalid one skipped. `aiwg doctor` continues to surface the validation error until resolved.

**Variant**: schema-valid JSON but fails Zod schema → same flow with a different error type.

---

### UC-PL-6: No Project-Local Artifacts Present — Fully No-Op

**Trigger**: project has no `.aiwg/{extensions,addons,frameworks,plugins}/` directories, or those directories exist but contain no `manifest.json` files.

**Main Success Scenario**:
1. CLI runs `aiwg use sdlc`.
2. Discovery scanner finds zero project-local manifests.
3. CLI proceeds with upstream deployment unchanged.
4. No errors, no warnings, no informational output about project-local at all.

**Postconditions**: behavior is identical to a project without `.aiwg/` content (no regression for projects that don't use the feature).

**Acceptance**: per NFR-PL-3, additional startup cost is <100ms for the empty-discovery case.

---

### UC-PL-7: Operator Graduates a Project-Local Artifact to Upstream

**Trigger**: operator decides their `.aiwg/extensions/foo/` artifact is broadly useful and wants to contribute it to upstream AIWG.

**Main Success Scenario**:
1. Operator runs `aiwg promote foo --to upstream --dry-run`.
2. CLI validates the identical-form invariant ([#1038](../../../issues/1038)) — checks all files in `.aiwg/extensions/foo/` for byte-equivalence with what would land in `agentic/code/addons/foo/` (modulo six permitted exceptions).
3. CLI scans the artifact body for `@-references` per [#1043](../../../issues/1043) graduation rules.
4. If `@.aiwg/...` references are present and operator has not chosen `--strip-aiwg-refs` or `--rewrite-aiwg-refs <map>`, CLI refuses graduation with line-by-line report of offending references.
5. Operator either edits the artifact, supplies a mapping file, or invokes `--strip-aiwg-refs`.
6. Operator runs `aiwg promote foo --to upstream` (no `--dry-run`).
7. CLI copies bundle to `agentic/code/addons/foo/`; updates `aiwg.config` to reflect new source.

**Postconditions**: artifact is in upstream tree. The project-local copy still exists unless `--cleanup` was passed. Operator commits the change to a fork branch and opens a PR.

**Variant** (UC-PL-7a): `--to corpus <path>` copies to the operator's company-private corpus instead of the upstream AIWG tree; same invariant validation.

---

### UC-PL-8: Project With 100+ Artifacts — Discovery Stays Within Budget

**Trigger**: large project ships ~100 project-local artifacts spanning all four bundle types.

**Main Success Scenario**:
1. Operator runs `aiwg use sdlc` on cold filesystem cache.
2. Discovery scanner reads all 100 manifests.
3. Validation runs against all 100.
4. Total discovery+validation time is within NFR-PL-1 budget.

**Postconditions**: all 100 artifacts deployed; CLI startup remains responsive.

**Variant** (degenerate): 200+ artifacts → CLI refuses with a clear error pointing to the 200-artifact-per-project limit ([#1044](../../../issues/1044) DoS limit).

---

## Out of Scope

These scenarios are explicitly NOT covered by the project-local feature and are tracked elsewhere or deferred:

- **Marketplace publishing of project-local artifacts** — out of scope per [#1033](../../../issues/1033). Project-local is, by design, not for the marketplace.
- **Cryptographic signing** of project-local artifacts — future hardening per [#1042](../../../issues/1042).
- **Multi-operator collaboration on `.aiwg/<type>/` content within a single project** — handled via normal git workflows; no AIWG-specific UCs.
- **Automatic `@-reference` rewriting on graduation** — out of scope per [#1043](../../../issues/1043) (silent rewriting was rejected as too dangerous).

## Traceability

| UC | Linked Implementation Issues |
|----|------------------------------|
| UC-PL-1 | [#1034](../../../issues/1034), [#1035](../../../issues/1035) |
| UC-PL-2 | [#1034](../../../issues/1034), [#1035](../../../issues/1035) |
| UC-PL-3 | [#1036](../../../issues/1036) |
| UC-PL-4 | [#1036](../../../issues/1036), [#1041](../../../issues/1041), [#1042](../../../issues/1042) |
| UC-PL-5 | [#1034](../../../issues/1034), [#1044](../../../issues/1044) |
| UC-PL-6 | [#1034](../../../issues/1034) |
| UC-PL-7 | [#1037](../../../issues/1037), [#1038](../../../issues/1038), [#1043](../../../issues/1043), [#1049](../../../issues/1049) |
| UC-PL-8 | [#1034](../../../issues/1034), [#1044](../../../issues/1044) |

## References

- Epic [#1033](../../../issues/1033)
- ADR [#1038](../../../issues/1038) — identical-form invariant
- ADR [#1039](../../../issues/1039) — directory layout
- ADR [#1040](../../../issues/1040) — registry shape
- ADR [#1041](../../../issues/1041) — override / shadowing policy
- Threat model [#1042](../../../issues/1042)
- Design [#1043](../../../issues/1043) — `@-reference` resolution
- Design [#1044](../../../issues/1044) — manifest schema
- NFR companion: [`NFR-project-local-artifacts.md`](./NFR-project-local-artifacts.md)
