# Test Strategy — Project-Local Artifact Lifecycle

**Issue**: #1046 (parent epic #1033)
**Scope**: Discovery → Conflict resolution → Deploy → Remove → Doctor + UAT for `.aiwg/{extensions,addons,frameworks,plugins}/<name>/`
**Date**: 2026-05-02

## Goal

Provide a checked, mapped, runnable matrix that proves the project-local artifact pipeline behaves as designed by ADRs #1038–#1041 and the threat model #1042.

## Test layout (decision)

The acceptance criteria of #1046 list a single `test/unit/extensions/project-local.test.ts`. We instead keep one test file per source module (per the project's "encapsulate validators by artifact type" preference), then add a cross-cutting gap file for matrix items that span modules:

| Source under test | Test file | Coverage |
|---|---|---|
| `src/extensions/project-local-discovery.ts` | `test/unit/extensions/project-local-discovery.test.ts` | Discovery matrix rows |
| `src/extensions/manifest.ts` (Zod schema) | `test/unit/extensions/manifest.test.ts` | Schema-level validation |
| `src/extensions/shadow-resolver.ts` | `test/unit/extensions/shadow-resolver.test.ts` | All 7 ADR §4 cases |
| Cross-cutting gaps from #1046 matrix | `test/unit/extensions/project-local.test.ts` | Items not naturally owned by a single module |
| Deploy / Remove via real CLI | `test/integration/project-local-deploy.test.ts` | UC-PL-1, UC-PL-2, deploy paths, remove revert |
| End-to-end round-trip | `test/uat/project-local-flow.uat.ts` | use → list → conflict → remove |

This file enumerates **every** matrix row from #1046 with its owning test and its current state.

## Matrix coverage

### Discovery

| # | Matrix row | Owner | Status |
|---|---|---|---|
| D-1 | All 4 dirs present, populated | `project-local-discovery.test.ts` "discovers bundles across all four type directories" | ✅ covered |
| D-2 | Some dirs present, others missing | `project-local-discovery.test.ts` "silently skips missing dirs" | ✅ covered |
| D-3 | All dirs absent (no-op) | `project-local-discovery.test.ts` "returns empty result when no .aiwg/<type>/ dirs exist" | ✅ covered |
| D-4 | Manifest malformed JSON | `project-local-discovery.test.ts` "reports invalid JSON without halting other valid bundles" | ✅ covered |
| D-5 | Manifest valid JSON but schema-invalid | `project-local-discovery.test.ts` "reports schema-invalid manifest as structured error" + `manifest.test.ts` strict-validation cases | ✅ covered |
| D-6 | Manifest size exceeds limit | `project-local-discovery.test.ts` "refuses manifest > 64 KB before parse" | ✅ covered |
| D-7 | Symlinked manifest directory (refuse per threat model) | `project-local-discovery.test.ts` "refuses symlinked bundle directory by default" | ✅ covered |
| D-8 | Path-traversal `pathTemplate: "../../etc/foo"` (refuse) | `project-local.test.ts` (gap file, this PR) | ✅ added |
| D-9 | Unicode names | `project-local.test.ts` (gap file, this PR) | ✅ added |
| D-10 | Case-conflict names | `project-local-discovery.test.ts` "refuses two bundles within the same type that differ only in case" | ✅ covered (FS-dependent) |

### Conflict resolution

| # | Matrix row | Owner | Status |
|---|---|---|---|
| C-1 | Project-local + upstream same name (project wins, warning) | `shadow-resolver.test.ts` "Case 2 — non-safety shadow" | ✅ covered |
| C-2 | Project-local + git-installed + upstream three-way collision | `project-local.test.ts` (gap file, this PR) | ✅ added |
| C-3 | Two project-local artifacts same name across **different types** (extension vs addon) | `project-local.test.ts` (gap file, this PR) | ✅ added |
| C-4 | Project-local shadows safety-critical (refuse without overrides) | `shadow-resolver.test.ts` "Case 4" | ✅ covered |
| C-5 | Phantom override (`overrides: ["nonexistent"]`) | `shadow-resolver.test.ts` "Case 5" | ✅ covered |

### Deploy

| # | Matrix row | Owner | Status |
|---|---|---|---|
| DP-1 | Deploy via `aiwg use` writes provider files (Claude) | `project-local-deploy.test.ts` "deploys a project-local addon to .claude" | ✅ added |
| DP-2 | Deploy via `aiwg use` writes provider files (Codex) | `project-local-deploy.test.ts` "deploys a project-local addon to codex" | ✅ added |
| DP-3 | `--dry-run` shows planned deploys, no writes | `project-local-deploy.test.ts` "--dry-run plans without writing" | ✅ added |
| DP-4 | Multi-provider deploy of same artifact | `project-local-deploy.test.ts` "deploys to two providers in sequence" | ✅ added |
| DP-5 | `--no-project-local` skips project-local discovery | `project-local-deploy.test.ts` "--no-project-local skips discovery" | ✅ added |

The exhaustive 10-provider matrix already runs in `deployment-completeness.test.ts` for upstream addons. Project-local bundles use the same `tools/agents/deploy-agents.mjs` path with `--source <bundle>`; covering Claude + Codex here is the smallest set that proves the wiring works for both home-dir and project-dir provider conventions. We accept the rest as inherited coverage from `deployment-completeness.test.ts`.

### Remove

| # | Matrix row | Owner | Status |
|---|---|---|---|
| R-1 | Revert with deployed file pristine (clean revert) | `project-local-deploy.test.ts` "remove reverts deployed artifacts" | ✅ added |
| R-2 | Revert with deployed file already missing | `project-local-deploy.test.ts` "remove tolerates already-missing artifacts" | ✅ added |
| R-3 | Source under `.aiwg/<type>/<name>/` preserved on remove | `project-local-deploy.test.ts` "remove preserves source bundle under .aiwg" | ✅ added |
| R-4 | Revert with deployed file mutated by operator (warn or abort) | future — `aiwg remove` revert design (#1048 still in design) | ⏳ deferred to #1048 |
| R-5 | Revert with deployed file replaced by another artifact's deploy | future — depends on #1048 design | ⏳ deferred to #1048 |

### Doctor + UAT

| # | Matrix row | Owner | Status |
|---|---|---|---|
| DC-1 | Doctor surfaces shadows, drift, validation errors | future — depends on doctor design (#1049) | ⏳ deferred to #1049 |
| U-1 | UAT script: end-to-end use → list → conflict → remove → graduate cycle | `test/uat/project-local-flow.uat.ts` | ✅ added (use → list → remove; conflict via shadow-resolver verified in unit) |

## Deferrals — explicit

Matrix rows R-4, R-5, and DC-1 are explicitly deferred to their owning issues (#1048, #1049). Their owning issues will add the matching tests when those features land. This strategy doc will be revised at that point.

## How to run

```bash
# All project-local unit tests
npx vitest run test/unit/extensions/project-local.test.ts \
                test/unit/extensions/project-local-discovery.test.ts \
                test/unit/extensions/shadow-resolver.test.ts \
                test/unit/extensions/manifest.test.ts

# Integration (slow — runs deploy-agents.mjs)
npx vitest run test/integration/project-local-deploy.test.ts

# UAT (CI-safe, no real agent)
npm run uat
```

## Traceability

- ADR-identical-form (#1038): satisfied by D-1, DP-1, DP-2 — provider deploy paths are byte-identical to upstream
- ADR-directory-layout (#1039): satisfied by D-1, D-2, "legacy registry.json ignored" test
- ADR-override-shadow (#1041): satisfied by all C-* rows
- Threat model (#1042): satisfied by D-6 (size cap), D-7 (symlink), D-8 (path traversal)
- Manifest schema (#1044): satisfied by all `manifest.test.ts` rows
