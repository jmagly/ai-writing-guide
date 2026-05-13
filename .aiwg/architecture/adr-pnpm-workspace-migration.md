# ADR: pnpm Workspace Migration — Spike Outcome

**Status**: Decided — **stay on npm**
**Date**: 2026-05-12
**Issue**: #1301 (A21 spike)
**Related**: #1290 (A15 release-age gate), #1278 (Wave 7 supply-chain hardening epic)

## Context

Wave 7 of the Mini Shai-Hulud supply-chain hardening campaign included a spike (A21, #1301) to evaluate migrating the AIWG npm workspace to pnpm. The trigger was A15 (#1290) — the release-age gate — which has a slightly cleaner shape under pnpm (`pnpm-workspace.yaml minimumReleaseAge`) than under npm 11.5+ (`.npmrc min-release-age`). The spike was time-boxed and explicit: either migrate to pnpm and ship A15 in pnpm shape, or stay on npm and ship A15 in `.npmrc` shape.

The full evidence trail lives at `.aiwg/security/working/a21-pnpm-spike-findings.md`. This ADR captures the decision and the headline reasoning.

## Decision

**Stay on npm.** Close A21 (#1301) as a no-op spike. Land A15 (#1290) in `.npmrc` shape — a new root `.npmrc` with `min-release-age=7` (7-day default; 10-day high-sensitivity profile documented as an env-var override).

## Rationale

The spike successfully installed and tested AIWG under pnpm@10.32.1 in an isolated worktree. Results:

- **6421 of 6434 tests pass** under pnpm after fixing two genuine phantom imports (`minimatch`, `semver`).
- **1 test failure** remains, caused by an architecturally incompatible pattern in `src/serve/executor-registry.ts`: a deliberate `createRequire`-based deep import of ajv from `node_modules/ajv/dist/`, which doesn't work under pnpm's symlinked store. The code comment explicitly says "Ajv bootstrap (transitive dep — zero new top-level deps)" — refactoring it requires coordinating with the #1179 (executor contract) owner.
- **Web app builds clean** under pnpm (`pnpm --filter @aiwg/web build` → 1.76s vite build).
- **Native bindings** (better-sqlite3, node-pty, hnswlib-node, esbuild, protobufjs, sharp) build successfully once added to `package.json` → `pnpm.onlyBuiltDependencies` allowlist.
- **Private registry** (`@matric:registry` on AIWG team's Gitea-hosted npm registry) requires promoting `tools/eval/.npmrc` config to a workspace-root `.npmrc`. Solvable.

The migration is **feasible** but the cost in Wave 7 scope outweighs the benefit:

- 9 CI workflows need `pnpm/action-setup` integration (with SHA pinning + `ci/digests.txt` updates per Wave 4 conventions).
- A20 dep-source lint (`tools/lint/dep-source.mjs`) needs re-targeting from `package-lock.json` (JSON) to `pnpm-lock.yaml` (YAML — different structure for transitive `resolved` URLs).
- Build script must be rewritten (`npm --prefix apps/web ci` → `pnpm --filter @aiwg/web`).
- ajv createRequire pattern must be refactored — cross-issue coordination with #1179.
- New top-level `.npmrc`, new `pnpm.onlyBuiltDependencies` allowlist, lockfile migration commit (large diff).

The forcing function for pnpm in Wave 7 was a slightly cleaner shape for A15. But npm 11.5+ honors `min-release-age` and achieves the same supply-chain threat-model effect: a brand-new-malicious-publish-window attack against the npm registry is blocked equivalently during `npm ci --userconfig $PWD/.npmrc`. The threat model doesn't distinguish between the two.

The primary benefits of pnpm — monorepo ergonomics, content-addressed store, strict layout — pay off when **addon `package.json` files migrate (Phase 3, deferred)**. At that point the cost-benefit flips because addon ergonomics dominate. Right now, with Phase 3 explicitly out of scope, the cost is paying full migration tax for tangential gain.

## Consequences

### What lands now (Wave 7)
- A21 (#1301) closes with this ADR as the no-op outcome.
- A15 (#1290) lands as a separate commit in `.npmrc` shape:
  - Root `.npmrc` with `min-release-age=7`
  - 10-day high-sensitivity profile via `AIWG_MIN_RELEASE_AGE_HIGH=10` env override pattern, applied in publish workflows
  - CI workflows updated to use the repo-local `.npmrc` (most already do; verify)
  - Docs in `docs/contributing/versioning.md` § Release-age policy + `docs/contributing/dependency-sources.md` § Lockfile regeneration

### Operator follow-ups (filed as separate issues — not Wave 7 blockers)
- Add `minimatch` and `semver` to root `package.json` dependencies. These are real phantom imports that work today only because of npm's flat hoisting. Trivial fix; independently worth doing.
- Refactor `src/serve/executor-registry.ts` ajv bootstrap to be store-layout-agnostic. Two reasonable options: (a) `require.resolve('ajv')` instead of path-walking, (b) add ajv/ajv-formats as direct deps + normal imports. (b) is cleaner but counter to the file's stated design intent; needs #1179 owner sign-off.
- Re-evaluate pnpm migration when Phase 3 (addon monorepo) is scoped.

### What stays unchanged
- Existing `package-lock.json` files in root, `apps/web`, `tools/eval` remain authoritative.
- A20 dep-source lint continues scanning `package-lock.json`.
- A11 tarball audit and A12 audit signatures continue working (they shell out to `npm pack --dry-run --json` and `npm audit signatures` respectively, which work alongside any package manager).
- All 9 CI workflows continue using `npm ci`.
- Node 20 for dev, Node 22 in the publish workflow.

## Verification (run in spike worktree, retained for audit)

```text
# In /tmp/aiwg-pnpm-spike (detached HEAD of main + pnpm-workspace.yaml + root .npmrc + minimatch/semver added)
pnpm install --no-frozen-lockfile    # → succeeds, 508 resolved
pnpm --filter @aiwg/web build         # → vite build 1.76s, clean
pnpm test                             # → 6421/6434 pass, 1 fail (ajv pattern), 12 skip
node tools/lint/tarball-audit.mjs     # → 12 entries match allowlist, pass
node tools/lint/dep-source.mjs        # → 0 violations BUT silently skips lockfile (not present)
```

Spike worktree removed post-evaluation.

## References

- `.aiwg/security/working/a21-pnpm-spike-findings.md` — full evidence trail, file-by-file
- `.aiwg/security/working/wave-7-completion-plan.md` (if present in planning artifacts) — original Wave 7 scope
- npm 11.5 release notes — `min-release-age` config
- pnpm 10 docs — `minimumReleaseAge`, `onlyBuiltDependencies`, workspace `.npmrc` resolution
- Issue #1301 — A21 spike outcome (this ADR closes it)
- Issue #1290 — A15 release-age gate (lands separately in `.npmrc` shape)
- Issue #1278 — Wave 7 supply-chain hardening epic
- Issue #1179 — executor contract (owns the src/serve/executor-registry.ts ajv pattern)
