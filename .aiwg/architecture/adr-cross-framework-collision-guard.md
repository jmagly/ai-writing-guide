---
title: Cross-framework agent/command/skill filename collision handling
status: Accepted
date: 2026-05-09
issue: https://git.integrolabs.net/roctinam/aiwg/issues/1169
deciders: roctinam
---

# ADR — Cross-framework collision handling for shared filenames

## Context

Multiple AIWG frameworks ship files with the same filename but different content:

| Filename | Framework A | Framework B |
|---|---|---|
| `agents/acquisition-agent.md` | `forensics-complete` (chain-of-custody) | `research-complete` (paper acquisition) |
| `agents/deployment-manager.md` | `ops-complete` | `sdlc-complete` |
| `agents/project-manager.md` | `media-marketing-kit` | `sdlc-complete` |
| `agents/quality-assessor.md` | `media-curator` | `sdlc-complete` |

All deployed providers flatten artifacts into a single namespace per type (e.g., `.claude/agents/<filename>`, `.factory/droids/<filename>`). Installing two frameworks that ship the same filename silently overwrites whichever was deployed first — surfaced by the install smoke test for #1152 and filed as #1169.

## Decision

Two-part fix, hybrid approach (per #1169 recommendation):

### Part 1 — Deploy-time collision guard (this ADR, lands in 2026.5.0-rc.11)

Modify `tools/agents/providers/base.mjs deployFiles()` so it:

1. Records the `frameworkSlug` of each deployed file in the per-directory sidecar manifest (`.aiwg-manifest.json`). Slug extracted from the source path under `agentic/code/{frameworks,addons}/<slug>/...`.
2. Detects two collision modes and refuses silent overwrites in both:
   - **within-batch**: two source files in the same `deployFiles()` call resolve to the same dest with different content. First one wins; second is skipped with a `collision` reason and the operator gets a warning naming both frameworks.
   - **cross-batch**: a new deploy sees a sidecar entry for the same dest from a *different* framework and the new content differs. The previously-installed framework keeps the slot; the incoming deploy is skipped with the same warning shape.
3. Treats `--force` as the explicit override — last-wins, sidecar `frameworkSlug` updates to the new owner.
4. Surfaces collisions with a clear stderr warning regardless of `verbose` (silent loss is the failure mode being prevented):

   ```
   ⚠ Cross-framework deploy collision detected (1):
     acquisition-agent.md: forensics-complete owns this slot; research-complete skipped (cross-batch)
     Re-run with --force to override (last-wins) or rename the colliding file at framework source.
   ```

5. Still treats identical-content cases as `duplicate-identical` skip (no warning) — common when an addon and framework re-export the same agent.

The guard works for **all artifact types** (agents, commands, skills, rules, soul companions) because they all route through `deployFiles()`. Tested for agents in `test/unit/agents/cross-framework-collision.test.mjs` (10 tests across both modes, plus `--force` override and same-framework non-collision).

### Part 2 — Source rename (deferred to 2026.5.1, tracked in follow-up issue)

The four existing collisions in the framework source are still cosmetic problems even with the guard in place — operators with both frameworks installed can only have one of the two agents at a time, and the guard turns the choice into a hard "first-installed wins, the other is muted" decision. The cleaner long-term fix is to rename the colliding files at framework source so both can coexist:

- `forensics-complete/agents/acquisition-agent.md` → `forensic-acquisition-agent.md`
- `research-complete/agents/acquisition-agent.md` → `research-acquisition-agent.md`
- `ops-complete/agents/deployment-manager.md` → `ops-deployment-manager.md` (sdlc keeps canonical)
- `media-marketing-kit/agents/project-manager.md` → `marketing-project-manager.md` (sdlc keeps canonical)
- `media-curator/agents/quality-assessor.md` → `media-quality-assessor.md` (sdlc keeps canonical)

Plus updating cross-references in skill files (`agent: <name>` references), framework READMEs, manifest.json entries, and the plugin packager output. Out of scope for this ADR; tracked as a 2026.5.1 follow-up.

## Alternatives considered

- **Option 2 (subdirectory namespace)** — deploy plugins to `.claude/agents/<plugin-name>/`. Rejected: requires Claude Code (and other providers') support for nested agent directories, which is not currently guaranteed, and the change would be platform-by-platform with different feasibility.
- **Hard-error instead of skip-and-warn** — rejected for default behavior because it makes `aiwg refresh` fail noisily on operators who installed two frameworks before the guard landed. Skip-with-loud-warning preserves forward motion while making the loss explicit. `--force` exists for the deliberate-override case.
- **Rename only (no guard)** — rejected because it solves only the four known collisions; new collisions could be introduced silently. The guard is permanent regression protection.

## Consequences

- Operators upgrading from rc.10 or earlier with both colliding frameworks installed will see one collision warning per existing collision on the next `aiwg refresh`. The first-installed framework's agent stays; the second framework's agent does not get redeployed. Operators can `--force` to switch ownership or wait for 2026.5.1's rename.
- Sidecar manifest schema gains an optional `frameworkSlug` field per managed entry. Backwards-compatible with existing manifests (missing slug → no cross-batch detection for that entry, same as today).
- New regression test in `test/unit/agents/cross-framework-collision.test.mjs` plus an `extractFrameworkSlug()` helper exported from `base.mjs` for use by future deploy-related tooling.

## References

- #1169 — original report with reproduction steps and the four documented collisions
- #1152 — framework→plugin parity work that surfaced this bug
- `tools/agents/providers/base.mjs` — `deployFiles()`, `extractFrameworkSlug()`, `updateSidecarManifest()`
- `test/unit/agents/cross-framework-collision.test.mjs` — regression tests
