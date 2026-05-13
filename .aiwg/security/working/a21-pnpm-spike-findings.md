# A21 pnpm Workspace Migration Spike — Findings

**Date**: 2026-05-12
**Issue**: #1301
**Parent epic**: #1278 (Mini Shai-Hulud supply-chain hardening)
**Decision**: **Stay on npm** — A21 closes as a no-op spike; A15 lands in `.npmrc` shape

## Spike scope

Evaluated migration of the in-scope npm workspace (root + `apps/web` + `tools/eval`) to pnpm workspaces under pnpm@10.32.1 (current stable line).

Out of scope per planning doc decision item 2:
- `vscode-extension/` (no lockfile, hasn't surfaced in CI)
- `agentic/code/addons/*/package.json` files (Phase 3 follow-up)

## Topology inventory

```
In-scope package.json files (4 total, 3 with lockfiles):
  ./package.json                       (lockfile: ./package-lock.json)
  ./apps/web/package.json              (lockfile: ./apps/web/package-lock.json)
  ./tools/eval/package.json            (lockfile: ./tools/eval/package-lock.json)
  ./vscode-extension/package.json      (no lockfile — out of scope)

optionalDependencies in root:
  @hono/node-server, @xenova/transformers, better-sqlite3,
  hnswlib-node, hono, node-pty, ws

Build scripts that npm 10+ blocks without allowlist:
  better-sqlite3, esbuild (multiple versions), hnswlib-node,
  node-pty, protobufjs, sharp

CI workflows referencing npm ci / npm install:
  .gitea/workflows/build-plugins.yml
  .gitea/workflows/ci.yml
  .gitea/workflows/docsite-build.yml
  .gitea/workflows/docsite-deploy.yml
  .gitea/workflows/gitea-release.yml
  .gitea/workflows/metadata-validation.yml
  .gitea/workflows/npm-publish.yml
  .gitea/workflows/skill-lint-pr.yml
  .github/workflows/npm-publish.yml
  (9 total)

Private registry surface:
  tools/eval/.npmrc declares @matric:registry pointing to
  https://git.integrolabs.net/api/packages/roctinam/npm/
  The @matric/eval-client dep is published to the AIWG team's
  private Gitea npm registry, not public npmjs.org.
```

## Spike probe — pnpm install + build + test

Executed in an isolated worktree (`/tmp/aiwg-pnpm-spike`) detached from main. Cleaned up post-spike.

### Step 1: Generate pnpm-workspace.yaml + remove package-lock.json files

`pnpm-workspace.yaml`:
```yaml
packages:
  - .
  - apps/web
  - tools/eval
```

### Step 2: Run pnpm install (issue 1 — registry config)

**First attempt failed** with `ERR_PNPM_FETCH_404 GET https://registry.npmjs.org/@matric%2Feval-client`.

Root cause: pnpm doesn't pick up workspace-package-level `.npmrc` for resolution during workspace install. The `@matric:registry=...` config in `tools/eval/.npmrc` must be promoted to the workspace **root** `.npmrc`.

**Resolution**: Add root `.npmrc` containing the `@matric:registry` line. After this fix, `pnpm install --no-frozen-lockfile` succeeded.

**Migration cost**: Add a root `.npmrc` that mirrors the per-package config. Operator follow-up: ensure the Gitea token used in CI works at workspace root too (likely already does, but verify).

### Step 3: Native binding builds (issue 2 — allowlist config location)

pnpm 10+ refuses to run install-time build scripts unless the package is in `pnpm.onlyBuiltDependencies`. Found two **wrong configuration locations** before getting it right:

- `pnpm-workspace.yaml` — silently ignored (deprecated as of pnpm 10+)
- `package.json` → `pnpm.onlyBuiltDependencies` — correct, builds run

Required allowlist (from the warning output):
```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "better-sqlite3",
      "node-pty",
      "hnswlib-node",
      "esbuild",
      "protobufjs",
      "sharp"
    ]
  }
}
```

Once configured correctly, native bindings built. Verified `node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3/build/Release/better_sqlite3.node` exists.

**Migration cost**: 6-entry allowlist; needs annual review as transitive deps shift.

### Step 4: Phantom imports (issue 3 — REAL bugs surfaced)

pnpm's strict node_modules layout exposed two genuine phantom imports in source code:

| Package | File | Severity |
|---------|------|----------|
| `minimatch` | `src/artifacts/query-engine.ts`, `src/lint/runner.ts` | **Build-blocking** (TS2307) |
| `semver` | `src/plugin/metadata-validator.ts` | Test-blocking (loader fails) |

Both are imported in source but absent from `package.json` direct/dev/optional/peer. They work under npm because of flat hoisting (both are transitive deps of declared packages — `minimatch` via `glob` via `@vitest/coverage-v8`, `semver` via Vite chain).

**Migration cost**: Add `minimatch` and `semver` as direct deps. Verified: after `pnpm add minimatch semver -w`, the TypeScript build succeeds.

These are real bugs even under npm — silent transitive coupling that would break if upstream changed its dep graph. Independently worth fixing.

### Step 5: CLI build chain

Root build script: `npm run build:cli && npm --prefix apps/web ci && npm --prefix apps/web run build`

The `npm --prefix apps/web ci` step **hardcodes npm** and requires `apps/web/package-lock.json`. Under pnpm workspaces, `apps/web` deps are already installed by the root `pnpm install`. The script must change to:

```
pnpm --filter @aiwg/web build
```

OR keep both (npm script using `npm --prefix apps/web ci` still works if we keep `apps/web/package-lock.json` alongside `pnpm-lock.yaml`, but this gets us two lockfiles for the same package — confusing and error-prone).

**Migration cost**: Rewrite `build`, `build:web`, and any other script that uses `npm --prefix`. Tested `pnpm --filter @aiwg/web build` — works, produces correct vite output.

### Step 6: Test suite (issue 4 — ajv createRequire pattern incompatible)

After fixing minimatch + semver, ran full test suite under pnpm:

```
Test Files  1 failed | 317 passed | 1 skipped (319)
Tests       1 failed | 6421 passed | 12 skipped (6434)
```

Single remaining failure: `test/unit/serve/executor-registry.test.ts > register > returns 400 on invalid payload`.

**Root cause**: `src/serve/executor-registry.ts` uses an intentional `createRequire`-based deep import:

```typescript
const ajvPaths = [
  join(projectRoot, 'node_modules', 'ajv', 'dist', '2020.js'),
  join(projectRoot, 'node_modules', 'ajv', 'dist', 'ajv.js'),
];
// ...
if (existsSync(p)) { Ajv = require(p); }
```

This works under npm because ajv (a transitive dep) lives at `node_modules/ajv/`. Under pnpm, ajv lives at `node_modules/.pnpm/ajv@<ver>/node_modules/ajv/`. The path check fails, `Ajv` stays null, validation degrades to no-op (returns `{ valid: true }` for invalid payloads), and the 400-response test fails.

The code comment explicitly says "Ajv bootstrap (transitive dep — zero new top-level deps)". This was a deliberate workaround to avoid adding ajv as a top-level dep. Under pnpm, this pattern is **architecturally incompatible** and would need to be refactored to either:

1. Add `ajv` and `ajv-formats` as direct deps + normal `import 'ajv'`
2. Resolve via `import.meta.resolve` (newer Node) — still works under pnpm
3. Use `require.resolve('ajv')` instead of path-walking

Option 1 is the cleanest fix but it adds two top-level deps (which the comment was trying to avoid). Option 2/3 require code changes and testing.

**Migration cost**: Either add ajv/ajv-formats as direct deps (counter to the file's stated design intent — needs sign-off from #1179 owner) OR refactor to use require.resolve. Either way, real code change + test re-validation required.

### Step 7: Tarball + audit lints (A11, A12, A20)

| Lint | Status | Notes |
|------|--------|-------|
| A11 `tools/lint/tarball-audit.mjs` | ✅ Works | Shells out to `npm pack --dry-run --json`; npm CLI still available alongside pnpm. 12 entries scanned, all match allowlist. |
| A12 `tools/lint/audit-signatures.mjs` | ⏭ Not tested | Same pattern (shells out to `npm audit signatures`); should work for the same reason as A11. |
| A20 `tools/lint/dep-source.mjs` | ⚠️ Re-target needed | Hardcoded to scan `package-lock.json`. Output: `package-lock.json (not present, skipped)`. **Silently skips lockfile scanning under pnpm.** Must be re-targeted at `pnpm-lock.yaml` (different format — YAML vs JSON, different structure for transitive `resolved` URLs). |

## Risk score table

| Risk | Severity | Mitigation cost | Net |
|------|----------|----------------|-----|
| Private registry config promotion to root `.npmrc` | Low | Trivial (cp + verify token scope) | Low |
| Native binding allowlist (6 packages) | Low | One-time config; annual drift review | Low |
| Phantom imports in src/ (`minimatch`, `semver`) | Medium | 2 direct deps added; A20 follow-up to scan pnpm-lock | Low-Medium |
| ajv createRequire pattern in `src/serve/` | **High** | Code refactor + retest of #1179 contract surface; runs counter to file's stated design intent (no new top-level deps); requires owner sign-off | **High** |
| 9 CI workflows require pnpm/action-setup integration | Medium | 9 workflow YAML changes + action SHA pin + digest tracking in `ci/digests.txt` | Medium |
| Build script rewrite (npm --prefix → pnpm --filter) | Medium | Multiple script entries; coordinate with `build:web` callers | Low-Medium |
| A20 dep-source lint re-target to pnpm-lock.yaml | Medium | YAML parser + new lockfile structure traversal | Medium |
| Apps/web vite/typescript compatibility under pnpm | Low | Tested — vite builds clean (1.76s) | Low |
| Operator learning curve (pnpm vs npm idioms) | Low | Documentation + CONTRIBUTING update | Low |
| Lockfile commit churn during cutover | Low | One large diff; mitigated by isolating in a single commit | Low |

**Mitigatable High risks**: 1 (ajv createRequire pattern).

The ajv risk isn't a blocker per se — refactoring it is doable. But it requires:
1. Coordination with #1179 (executor contract) owner to amend the explicit "zero new top-level deps" design choice
2. Re-running the executor contract validation surface
3. Adding ajv to the dep-source allowlist if it's flagged
4. Adding ajv to the A15 release-age gate's normal-flow path (new top-level dep enters the release-age window)

## Cost-benefit assessment

### What pnpm migration would buy us
- **Phantom import detection**: pnpm's strict layout would have caught `minimatch` and `semver` long ago. Net positive for code hygiene.
- **Smaller node_modules disk footprint** (via content-addressed store)
- **Faster installs in CI** (with cache)
- **Better monorepo ergonomics** when we get to addon migration (Phase 3)

### What it would cost in Wave 7 scope
- 9 CI workflow file rewrites + pnpm/action-setup SHA pinning + digests.txt update
- A20 lint re-target to pnpm-lock.yaml (non-trivial — different file format)
- ajv createRequire refactor in src/serve/ (cross-issue coordination with #1179)
- Build script rewrite + test
- Root .npmrc setup with private registry config
- New `pnpm.onlyBuiltDependencies` allowlist
- Lockfile migration commit (large diff)
- Operator + contributor learning curve

### Wave 7 context
Wave 7 is the **completion** of the Mini Shai-Hulud campaign. The goal is to land the release-age gate (A15) cleanly and close A21. The campaign is supply-chain-focused — pnpm migration is **tangential** to that goal. The primary benefits of pnpm (monorepo ergonomics) don't materialize until Phase 3 addon migration, which is already deferred.

The single forcing function for pnpm in Wave 7 is **`min-release-age` semantics** — pnpm gates this via `pnpm-workspace.yaml minimumReleaseAge`, npm 11.5+ gates it via `.npmrc min-release-age`. Both work. npm's gate has the same effect for AIWG's threat model (a brand-new-malicious-publish-window attack against the npm registry is blocked equivalently by either gate during `npm ci` / `pnpm install --frozen-lockfile`).

**Decision**: Stay on npm. Land A15 in `.npmrc` shape. Keep A21 closed as a no-op spike with this ADR as the evidence trail.

Phantom imports (`minimatch`, `semver`) and the ajv createRequire pattern are real findings worth fixing **independently** — file follow-up issues but don't block them on a workspace migration. They are tracked as Wave 7 follow-ups, not Wave 7 deliverables.

## Operator follow-ups (filed as issues, not blockers)

1. Add `minimatch` and `semver` to `package.json` dependencies (phantom imports). Follow-up filed.
2. Refactor `src/serve/executor-registry.ts` ajv bootstrap to be store-layout-agnostic (use `require.resolve('ajv')` or add ajv as direct dep). Follow-up filed.
3. Revisit pnpm migration once addon monorepo (Phase 3) is in scope — at that point the cost-benefit flips because addon ergonomics dominate.

## Spike artifacts retained

- This findings doc: `.aiwg/security/working/a21-pnpm-spike-findings.md`
- ADR at decision time: `.aiwg/architecture/adr-pnpm-workspace-migration.md`
