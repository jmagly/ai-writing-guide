# ADR: AGENTS.md and AIWG.md — Cross-Platform Context Pipeline

## Status

**ACCEPTED** — operator signoff 2026-05-05; required by parity epic [#1089](../../../../issues/1089); unblocks [#1103](../../../../issues/1103) (PUW-002), [#1123](../../../../issues/1123) (PUW-022), [#1130](../../../../issues/1130) (PUW-029), and the AGENTS.md aggregation cluster (PUW-007, PUW-013, PUW-014, PUW-023, PUW-029, PUW-036).

> **Glossary**: PUW = Parity Update Work item, the unit of work in the parity epic [#1089](../../../../issues/1089). Each PUW is one shippable scope.

> **Companion ADR**: This ADR is paired with [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md). Any artifact carrying `safety-critical: true` per that policy is treated specially in §2 (link index marker) and §6 (overflow protection).

> **Load-bearing principle: parity = always-deploy + adapt.** AIWG never *removes* a writer in the parity work. Every artifact type continues to deploy to every provider's directory map. When a provider's loader does not natively scan a path, the bridge to discovery is a link from AGENTS.md (and via AGENTS.md from AIWG.md). Modern agentic systems resolve cited paths even without native auto-scan. This ADR is purely an *additive* layer — no PUW under it removes existing writer paths.

## Date

2026-05-05

## Context

### Trigger

Seven of AIWG's ten supported providers consume an `AGENTS.md` file (or close variant) at the repository root for project-scope role context: Codex, Cursor, Windsurf, Hermes, Warp, Factory, OpenCode. Today AIWG only generates this file when the operator explicitly opts in via `--create-agents-md`. The gap surfaces in different ways per provider — Codex silently drops `.codex/agents/`, `.codex/rules/`, and `.codex/commands/` writes because the Rust loader never scanned those paths; Cursor and Windsurf load AGENTS.md as primary identity context but receive nothing from AIWG; Hermes scans for `.hermes.md` then AGENTS.md and gets neither.

Multiple PUWs in the parity backlog (PUW-002, PUW-007, PUW-013, PUW-014, PUW-022, PUW-023, PUW-029, PUW-036) all assume an AGENTS.md aggregation pipeline exists and has well-defined section semantics. None of those PUWs can ship cleanly without first agreeing on what AGENTS.md should contain, how it scales against Codex's 32KB hard cap, and what default behavior operators expect. This ADR defines that pipeline.

### Why this is non-obvious

CLAUDE.md (the Claude Code equivalent) inlines large amounts of content directly — 700+ lines is normal in production AIWG repositories. That works for Claude Code because the platform tolerates large context loads on every session. The other six providers do not share that profile:

- **Codex** caps `AGENTS.md` at 32KB hard, with `AGENTS.override.md` checked first. Per `codex-rs/config_toml.rs:68`.
- **Cursor**, **Windsurf**, **Factory**, **OpenCode** load AGENTS.md once into model context per-conversation; large content displaces actual task tokens.
- **Hermes** sets a `.hermes.md` priority-1 file at git root (per its own resolver), and that file behaves as a slim index pointing into deeper contexts.
- **Warp** prefers `WARP.md` but accepts `AGENTS.md` and treats it as session-bootstrap context.

A naïve port of CLAUDE.md's inlining strategy across these providers blows the Codex cap on day one and degrades context efficiency for all the others.

### Codebase references

- `src/cli/handlers/use.ts:161-232` — `PROVIDER_PATHS` map (canonical source of deploy paths)
- `src/smiths/platform-paths.ts` — TypeScript path resolvers (parallel source; must stay in sync)
- `src/smiths/agentsmith/` — **subagent definition generator** (creates agent personas; NOT the home for AGENTS.md / AIWG.md emission). The new context-pipeline emitter described in this ADR is a separate module.
- `src/config/aiwg-config.ts:552` — config-level path map
- `AIWG.md` (repo root, today) — framework-context companion to `CLAUDE.md`, currently `@`-referenced from `CLAUDE.md` line 3. This ADR formalizes its emission to all repos and its role as the AGENTS.md content target.
- `.aiwg/research/parity/codex/assessment.md` — Codex 32KB cap citation, AGENTS.override.md precedence
- `.aiwg/research/parity/capability-matrix.md` — gaps #1, #2, #3, #14, #29, #33, #38, #45, #48
- `.aiwg/planning/parity-update-plan.md:166` — explicit ADR-1 prerequisite

### Scope boundary

This ADR defines:
- The four AGENTS.md sections AIWG aggregates and their purpose
- The link-indexed style mandate (the load-bearing decision in this ADR)
- The default-on rollout strategy across seven providers
- Per-provider variants and the relationship to the 32KB Codex cap
- The contract that PUW-029 (size validator + auto-split) consumes

It does NOT:
- Specify the auto-split heuristic for AGENTS.override.md (that lives in the PUW-029 design note that consumes this ADR — operator-priority frontmatter is the chosen strategy per /address-issues 2026-05-05 sign-off)
- Replace `adr-universal-provider-deployment.md` (this ADR amends the AGENTS.md section of that prior ADR; everything else stands)
- Define user-global aggregation (`~/.codex/AGENTS.md`, etc.) — that is ADR-4's scope

## Decision

### 0. The two-file pipeline: AIWG.md + AGENTS.md (load-bearing)

***AIWG generates two project-root files on `aiwg use`:***

- **`AIWG.md`** — framework-context content; mirrors what `CLAUDE.md` carries today via its `@AIWG.md` reference. This is the operator-and-model-readable description of the AIWG framework as deployed to *this* project: which frameworks are installed, which provider is active, which addons are deployed, which behaviors and rules are enforced. Same content shape as `CLAUDE.md`'s framework section, lifted out so non-Claude providers can consume it.
- **`AGENTS.md`** — link-indexed bridge file; tells each non-Claude provider's loader *where things are*. Its first content section after the project header is `## Framework Context`, which reads:
  > See [AIWG.md](./AIWG.md) for the full AIWG framework context (active frameworks, addons, agents, behaviors, rules).

  The link is the bridge: providers that auto-resolve `./AIWG.md` from their loaded AGENTS.md (Codex confirmed; Hermes confirmed; Cursor and Windsurf treat it as plain markdown reference but the path is resolvable on demand) get the full framework context one hop away.

The two files share generator infrastructure but emit independently. AIWG.md is content-rich (framework prose); AGENTS.md is link-indexed (artifact pointers). The combination gives every provider both the *story* of what AIWG is doing in this project and the *map* of where the artifacts live on disk.

**Why this pipeline:** it normalizes cross-platform context delivery using the pattern Claude Code operators already understand:
- Claude Code reads `CLAUDE.md` → `@AIWG.md` → full content
- Codex/Cursor/Windsurf/Hermes/Warp/Factory/OpenCode read `AGENTS.md` → link to `AIWG.md` → full content
- Operator extension stays consistent: `AGENTS.override.md` (Codex/peers) and `CLAUDE.local.md` (Claude) are the operator-controlled siblings that the framework never overwrites

The previous `--create-agents-md` opt-in flag is deprecated. Both files emit by default on every `aiwg use`. Operators opt out with `--no-context-files` (singular flag covering both) or per-file with `--no-aiwg-md` / `--no-agents-md`.

### 0.5. AIWG.md is CLAUDE.md renamed for non-Claude providers

**`AIWG.md` at project root has the same content shape as `CLAUDE.md`** — same headings, same prose structure, same `@`-reference pattern. The only difference is the file name. CLAUDE.md is read by Claude Code; AIWG.md is read (transitively, via the AGENTS.md `## Framework Context` link) by every other provider.

The chain for non-Claude providers becomes:

```
AGENTS.md (project root)
    └─> ## Framework Context: See [AIWG.md](./AIWG.md)
            │
            ▼
        AIWG.md (project root, CLAUDE.md-shaped content)
            └─> @.aiwg/AIWG.md   (or @AIWG.md when sourced from agentic/)
                    │
                    ▼
                .aiwg/AIWG.md (project source of truth — framework context customized per project)
```

The chain for Claude Code is unchanged from today:

```
CLAUDE.md (project root)
    └─> @AIWG.md   →   .aiwg/AIWG.md (same source of truth)
```

Both CLAUDE.md and AIWG.md `@`-reference the same downstream `.aiwg/AIWG.md`. The two project-root files contain identical framework prose; they exist as two named files because Claude Code looks for `CLAUDE.md` and the seven AGENTS.md providers reach AIWG.md via the AGENTS.md `## Framework Context` hook-up.

**Operator control:** AIWG.md is operator-editable just like CLAUDE.md. The framework regenerates AIWG.md on `aiwg use` only when an `<!-- aiwg-managed -->` signature comment is present at the top. If the operator has removed the signature (claiming ownership), the generator refuses to overwrite without `--force`. This mirrors how operators today claim ownership of CLAUDE.md.

**Generation:** the generator emits AIWG.md by reading the same source CLAUDE.md uses (`agentic/code/CLAUDE.md` template + project customizations from `.aiwg/AIWG.md`) and writing the rendered content to project root with the AIWG.md filename. Generator runs as part of `aiwg use`, after deploy and before activity-log emission (per §7).

**No conflict with existing CLAUDE.md:** AIWG.md does not replace CLAUDE.md. Both files emit. Claude users get CLAUDE.md as today; non-Claude users get AIWG.md plus AGENTS.md.

### 0.6. Always-deploy invariant (load-bearing)

***This ADR adds files; it removes none.*** Specifically:

- All current writer paths in `src/cli/handlers/use.ts:161-232` (`PROVIDER_PATHS`) continue to deploy as today. `.codex/agents/`, `.codex/commands/`, `.codex/rules/`, `.opencode/rule/`, and every other path remains a deploy target.
- When a provider's loader does not natively scan a path AIWG writes to, the AGENTS.md link index in §2 is the bridge that gives the loader the path on demand. The agent runtime resolves the link; the operator can `@`-mention the file; nothing is "lost."
- The PUW issues that say "deprecate" or "stop writing" (PUW-002 #1103, PUW-003 #1104, PUW-007, PUW-022 #1123) reframe under this invariant: their work becomes "ensure AGENTS.md links to the deployed files cleanly" plus any *additive* path-correction (e.g., adding `.agents/skills/` as an additional skill target alongside `.codex/skills/`, not replacing it).
- Trade-off: doubles disk usage for some artifact types. Operator-visibility and parity-consistency gains dominate. Agentic systems are smart enough to discover linked content; we do not need to prune disk to help them.

### 1. Four canonical AGENTS.md sections

Every AIWG-generated AGENTS.md contains up to four named sections, in this order:

```markdown
# AGENTS.md
<!-- Generated by AIWG. Edit AGENTS.override.md for operator additions. -->

## Framework Context
See [AIWG.md](./AIWG.md) for the full AIWG framework context
(active frameworks, addons, agents, behaviors, rules).

## Project Context
<short prose lifted from intake/vision; ≤ 1000 chars>

## Agents
<link index — see §2>

## Rules
<link index — see §2>

## Skills
<link index — see §2>

## Behaviors
<link index — see §2>

---
*See `AGENTS.override.md` for operator-authored additions and overflow.*
```

Sections are emitted only when their corresponding artifact type has at least one deployed entry. An empty section is omitted entirely.

### 2. Link-indexed style (load-bearing)

***Each section is a link index, not an inlined content dump.*** Entry format:

```markdown
- **<id>** — <one-line description, ≤ 120 chars>
  - Path: `<relative-path-from-repo-root>`
  - Tags: <comma-separated tags, optional>
```

Worked example from a real Codex deploy:

```markdown
## Agents

- **api-designer** — Designs and evolves API and data contracts with stable interfaces
  - Path: `.agents/agents/api-designer.md`
  - Tags: design, api, contracts

- **security-architect** — Threat modeling and release gates across the SDLC
  - Path: `.agents/agents/security-architect.md`
  - Tags: security, gates

## Rules

- **human-authorization** (HIGH) — Seek explicit operator approval before irreversible actions
  - Path: `.agents/rules/human-authorization.md`

## Skills

- **address-issues** — Issue-driven AL orchestrator for working through open issues
  - Path: `.agents/skills/address-issues/SKILL.md`

## Behaviors

- **delivery-policy** — Read .aiwg/aiwg.config delivery before any branch/PR/push action
  - Path: `.agents/behaviors/delivery-policy.md`
```

The agent runtime opens detail files on demand. AGENTS.md stays small even for large AIWG installations.

**Safety-critical marker:** any indexed artifact whose source manifest declares `safety-critical: true` (per [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md)) gets a `(SAFETY-CRITICAL)` suffix in the link index. If that artifact has been legitimately shadowed via an `overrides:` manifest declaration, the suffix becomes `(SAFETY-CRITICAL, SHADOWED → <shadowing-source>)`. The marker surfaces both to the loaded model and the operator at every session.

**Why this matters:** at AIWG's current scale (200+ agents, 386 skills, 14+ rules), a fully-inlined AGENTS.md would exceed 200KB — 6× the Codex hard cap. The link-indexed form for the same surface lands at ~25–30KB and degrades gracefully when an operator's repo grows.

***The `Path:` field records where `aiwg use` already wrote the file.*** AGENTS.md reads those paths; it does not write or move files. The deploy path map in `src/cli/handlers/use.ts` is the authority for where files land; the index emitter only observes and cites.

**Path-emission allowlist (security):** the generator MUST only emit `Path:` values that match a path produced by the AIWG-owned `PROVIDER_PATHS` map plus the canonical user-scope target `~/.agents/skills/`. Files deployed by project-local manifests at non-AIWG paths are not indexed. This closes the link-redirect attack surface where a malicious project-local artifact could cite a shadow file outside AIWG's path-map domain.

**Field sanitization (security):** the `name`, description, and tag fields are sanitized at generation time. Backticks, code fences, control characters, absolute URLs (any scheme except relative paths), and HTML are rejected. Description length cap is 120 characters. AGENTS.md is loaded into model context every session; a poisoned link entry is a high-reach prompt-injection vector and must be filtered at the only point where AIWG controls the bytes.

### 3. Default-on for all seven AGENTS.md providers

Codex, Cursor, Windsurf, Hermes, Warp, Factory, and OpenCode all receive an AGENTS.md by default on `aiwg use`. Operators opt out with `--no-agents-md`.

The previous `--create-agents-md` opt-in flag is deprecated — kept for one minor version with a deprecation warning, then removed.

### 4. Per-provider variants

| Provider | File name | Variant notes |
|---|---|---|
| Codex | `AGENTS.md` | Hard cap 32KB; auto-split into `AGENTS.override.md` per PUW-029 |
| Cursor | `AGENTS.md` | No size cap; same content as Codex |
| Windsurf | `AGENTS.md` | Aggregated (single file is canonical for Windsurf) |
| Hermes | `.hermes.md` (priority 1) + `AGENTS.md` (priority 2) | Identical content; Hermes-specific file emitted alongside |
| Warp | `AGENTS.md` + `WARP.md` | Both files; identical content; Warp prefers AGENTS.md per its own docs but tooling expects WARP.md |
| Factory | `AGENTS.md` | No size cap; rule content lands here per PUW-023 |
| OpenCode | `AGENTS.md` | Rule content lands here per PUW-007; same shape as Codex |

Variants share the same generator. Per-provider differences are limited to: file name, optional 32KB enforcement, optional twin file (`.hermes.md`, `WARP.md`).

### 5. Operator extension surface

Operators add content via `AGENTS.override.md` at the repo root. Generator never overwrites operator content. In the Codex runtime (`codex-rs/agents_md.rs:65`), the loader checks `AGENTS.override.md` before `AGENTS.md` — operator additions take precedence by the loader's own ordering.

**Shared file partitioning (load-bearing):** `AGENTS.override.md` is *both* the operator extension surface *and* the auto-split overflow target from §6. To prevent overflow content from displacing operator content, the generator partitions the file with section markers:

```markdown
<!-- spillover-from-AGENTS.md:START -->
<auto-generated overflow content>
<!-- spillover-from-AGENTS.md:END -->

<-- everything outside the spillover block is operator-authored and never modified -->
```

Generator behavior:
- The generator MUST NOT modify any byte outside a `spillover-from-AGENTS.md:START`/`:END` pair.
- On each run, the generator hashes the non-spillover content. If the hash diverges from its previous-run record (stored in `.aiwg/working/agents-md-overlay.hash`), the generator treats the content as operator-authored and preserves it byte-for-byte.
- A single spillover block exists per file. When PUW-029 auto-splits more than one section, all overflowed sections are emitted inside the same block, in priority order (§6).

**Pre-existing AGENTS.md handling (R1 mitigation):** If `aiwg use` finds an AGENTS.md at repo root that AIWG did not generate (no AIWG signature comment), the generator refuses to overwrite without `--force`. With `--force`, the generator copies the original to `AGENTS.md.bak.<RFC3339-timestamp>` before writing. Detect-and-refuse alone is insufficient; `--force` is one keystroke from data loss without the backup step.

### 6. Section ordering rule (PUW-029 hook)

When PUW-029 (#1130) auto-split fires, sections move to `AGENTS.override.md` in this order based on **bundle-manifest-declared overflow priority**, not per-artifact frontmatter. Each framework or addon manifest declares an `overflow_priority` map keyed by artifact id:

```jsonc
// agentic/code/frameworks/sdlc-complete/manifest.json (excerpt)
{
  "overflow_priority": {
    "human-authorization": 1,        // priority 1 = high; last to overflow
    "delivery-policy":     1,
    "api-designer":        2,        // default if unset
    "*":                   3         // wildcard for everything else; first to overflow
  }
}
```

Priority semantics:
- `1` (high): last to overflow; pinned to AGENTS.md until all of priority 2 and 3 has been moved
- `2` (medium): overflow second; default for any artifact whose id is not explicitly listed
- `3` (low): overflow first
- Within a priority tier, overflow order is alphabetical by `id` (deterministic and reproducible)

**Why manifest-level, not per-artifact frontmatter:** priority is a deployment concern, not a content concern. Per-artifact frontmatter would leak deployment ordering into every artifact file, would not survive transport across project↔user scope, and would force PUW-029 to scan every artifact at deploy time. Manifest-level keeps the contract one-place-readable and lets bundle authors tune overflow without touching artifact bodies.

**Safety-critical pinning (security):** any artifact carrying `safety-critical: true` (per [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md)) is pinned to **priority 1** regardless of its manifest entry. Safety-critical content is never moved to the spillover block by overflow pressure. If priority-1 content alone exceeds the 32KB cap, that is a hard error (operator must split the framework, not silently lose safeguards).

The 30KB warning threshold and 32KB error threshold are owned by PUW-029; this ADR only names the contract.

### 7. Generator ordering invariant (load-bearing)

***The AGENTS.md generator runs as the last step of `aiwg use`, after all writers have completed and before activity-log emission.*** This is a load-bearing invariant: the index can only emit `Path:` values for files the generator observes on disk, so failed deploys produce shorter indexes rather than broken links. Future changes to `aiwg use` orchestration MUST preserve this ordering. If a future writer needs to run after the generator, it MUST trigger a re-run of the generator before activity-log close.

## Consequences

### Positive

- All seven AGENTS.md providers reach feature parity with their native loader expectations.
- Codex 32KB cap becomes the rare edge case rather than the default failure mode.
- One generator, six (per-provider) thin variants — code is centralized and testable.
- `.codex/agents/` (PUW-002), `.codex/rules/` (PUW-022), and similar provider-specific paths whose loaders do not auto-scan now have a discoverability bridge through AGENTS.md links. Writers keep deploying; AGENTS.md tells the loader where to look.
- Operator extension via `AGENTS.override.md` is single-surface and well-defined.

### Negative

- Existing `--create-agents-md` flag becomes deprecated; one minor version of dual support adds carry cost.
- Operators with hand-edited `AGENTS.md` files at repo root will see warnings on first run after the flag flip — generator detects pre-existing AGENTS.md and refuses to overwrite without `--force` (or `--no-agents-md` if they want to keep their own).
- Link-indexed style requires that all referenced detail files actually deploy. Skills not yet deployed on a given provider must be filtered out of the index — the generator runs after deploy, not before.

### Neutral

- AGENTS.md size grows roughly linearly with deployed-artifact count. At ~30 bytes per index entry, the 32KB cap accommodates ~1000 entries — well above the current AIWG corpus and any plausible per-project overlay.

### Risks

- **R1 — Operator content collision**: an operator-authored AGENTS.md at repo root predates AIWG and gets overwritten. **Mitigation**: generator detects pre-existing file, asks operator to rename to AGENTS.override.md or pass `--force`. Documented in deploy output.
- **R2 — Drift between path map and AGENTS.md links**: paths emitted in the index point to files the deploy phase did not produce. **Mitigation**: generator runs as the *last* step of `aiwg use` and only indexes files it observes on disk. Failed deploys produce shorter indexes, never broken links.
- **R3 — Hermes priority-1 vs AGENTS.md staleness**: if `.hermes.md` and `AGENTS.md` ever diverge, Hermes loads the newer one (priority-1) and may miss content. **Mitigation**: write both atomically, with `.hermes.md` always identical to AGENTS.md. Add hash check in `aiwg doctor`.

## Alternatives Considered

### A1 — Inline content (CLAUDE.md style)

**Rejected.** Blows Codex 32KB cap immediately; degrades context efficiency on every other provider; carries no benefit over link-indexed for non-Claude consumers.

### A2 — Per-provider AGENTS.md generators

**Rejected.** Would produce six separate codepaths for what is fundamentally the same content with thin variant differences. Maintenance cost outweighs flexibility benefit. Single generator with declarative variant config is strictly simpler.

### A3 — Stay opt-in (current `--create-agents-md`)

**Rejected.** PUW-013 explicitly identifies opt-in as the parity gap. Operators don't know to opt in; default-on is the correct posture for content that providers expect to find at repo root.

### A4 — Generate AGENTS.md but make link/inline a per-section flag

**Rejected.** Adds operator-facing complexity (which sections inline vs link?) without demonstrated need. If a future operator workflow requires inlining one section, that becomes a follow-up ADR with concrete use case. YAGNI.

## Validation

- [ ] Architecture review (architecture-designer agent)
- [ ] Security review (security-architect agent — focus on R1, R2)
- [ ] Tech writing review (technical-writer agent — clarity of generator contract)
- [ ] Operator signoff
- [ ] Smoke test: deploy AIWG to a Codex sandbox and verify AGENTS.md < 32KB with full agent + rule + skill + behavior catalog
- [ ] Smoke test: deploy to Hermes sandbox and verify both `.hermes.md` and AGENTS.md emit with identical content

## Implementation tracking

Once accepted, this ADR is consumed by:
- **AIWG.md/AGENTS.md generator module** — new code, NOT in `src/smiths/agentsmith/` (that module creates subagent personas, not context files). Likely location: `src/smiths/context-pipeline/` or `src/extensions/context-files/`. Builds and emits both AIWG.md and AGENTS.md at the end of `aiwg use`.
- PUW-002 (#1103) — Codex agent links surface in AGENTS.md `## Agents`. **Writer remains** per §0.6.
- PUW-003 (#1104) — Codex command links surface in AGENTS.md (when commands deploy is observed). **Writer remains** per §0.6; `platform-paths.ts:23` gets a comment documenting the static enum, but the path keeps writing.
- PUW-007 — OpenCode rule links surface in AGENTS.md `## Rules`. **Writer remains** per §0.6.
- PUW-013 — Default-on AIWG.md + AGENTS.md generation across seven providers (the rollout PUW).
- PUW-014 — Hermes `.hermes.md` twin emission alongside AGENTS.md.
- PUW-022 (#1123) — Codex rule links surface in AGENTS.md `## Rules`. **Writer remains** per §0.6.
- PUW-023 — Factory rule links surface in AGENTS.md `## Rules`. **Writer remains** per §0.6.
- PUW-028 (#1129) — `agents/openai.yaml` UI sidecar emission alongside the existing skill writers.
- PUW-029 (#1130) — 32KB validator + auto-split using manifest-priority map from §6.
- PUW-036 — Warp `WARP.md` twin emission alongside AGENTS.md.

## References

- `.aiwg/architecture/adr-universal-provider-deployment.md` — prior ADR; this one amends its AGENTS.md guidance
- `.aiwg/architecture/adr-behaviors-deployable-artifact.md` — `## Behaviors` section consumes this ADR's link-index format
- `.aiwg/research/parity/capability-matrix.md` — gaps #1, #2, #3, #14, #29, #33, #38, #45, #48
- `.aiwg/research/parity/codex/assessment.md` — 32KB cap citation
- `.aiwg/planning/parity-update-plan.md:166` — explicit ADR-1 prerequisite
