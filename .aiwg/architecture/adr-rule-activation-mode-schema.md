# ADR: Rule Activation Mode Schema (Cross-Provider)

## Status

**ACCEPTED** — operator signoff 2026-05-06; required by parity epic [#1089](../../../../issues/1089); unblocks [#1112](../../../../issues/1112) (PUW-011 Cursor), PUW-020 Windsurf trigger modes, PUW-021 `applyTo` glob field.

> **Glossary**: PUW = Parity Update Work item, the unit of work in the parity epic [#1089](../../../../issues/1089).

> **Companion ADRs**: pairs with [`adr-agents-md-aggregation.md`](./adr-agents-md-aggregation.md) (ADR-1) and [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md) (safety-critical handling).

## Date

2026-05-06

## Context

### Trigger

AIWG ships rule artifacts (15+ from `aiwg-utils`, more from SDLC and security frameworks) that downstream providers consume in materially different ways. Cursor's rule loader (per vendor docs) recognizes four activation modes — `alwaysApply` / `auto` / `glob` / `manual` — which control when a rule becomes part of the model's context. Windsurf has the analogous `always_on` / `model_decision` / `glob` / `manual` taxonomy. Copilot uses `applyTo: '<glob>'` frontmatter to scope rules to specific paths. AIWG today emits rules without any of these fields, which means every rule is loaded unconditionally on every session. That is functionally correct (no rules silently miss being loaded) but wasteful: a `voice-framework` rule that only matters for `*.md` files still costs context tokens for every code-only session.

The original PUW-011 framing was "classify each rule with one of 4 activation modes." The architecture-designer review on the parity plan (per `parity-update-plan.md:166`) flagged this as needing an ADR before downstream PUWs ship, because it touches the AIWG rule schema and per-provider emitters at the same time. This ADR is that prerequisite.

### Why this is non-obvious

A naïve port of Cursor's 4-way taxonomy across providers fails because:

- **Cursor and Windsurf semantics differ.** Cursor `auto` and Windsurf `model_decision` are both "the model decides," but Cursor evaluates per-message and Windsurf per-conversation-start. Same name space; different runtime behavior.
- **Copilot lacks `manual` and `auto`.** Copilot only has `applyTo: '<glob>'` (which collapses `glob` and `alwaysApply`-with-`**`). A rule classified as `manual` for Cursor has no Copilot analog and must default to either always-on or never-loaded.
- **Default preservation is load-bearing.** Today every AIWG rule loads always. A schema change that makes the *default* anything other than `alwaysApply` would silently drop rule coverage for every operator who hasn't yet classified their rules. The schema must default to `alwaysApply` so unannotated rules behave exactly as today.
- **Provider closed-source risk.** Cursor's loader is closed-source; we have vendor docs but no source-of-truth verification. Any non-`alwaysApply` mode shipping must include a live-Cursor smoke test before declaring complete (per the original PUW-011 risk note).

### Codebase references

- `tools/agents/providers/cursor.mjs:177-228` — current Cursor rule deployer (no MDC frontmatter injection)
- `tools/agents/providers/windsurf.mjs` — Windsurf rule deployer
- `tools/agents/providers/copilot.mjs:280-326` — `transformRule` already adds `applyTo` derivation; this ADR formalizes the upstream schema feeding it
- `agentic/code/addons/aiwg-utils/rules/*.md` — 15 rules with no `activation` field today
- `.aiwg/research/parity/cursor/assessment.md §6 gap 1`, `.aiwg/research/parity/windsurf/assessment.md §6 gap 1`

### Scope boundary

This ADR defines:
- The four activation modes and their semantics
- The schema field name (`activation`) and where it lives in rule frontmatter
- The default value and its preservation contract
- Per-provider emission policy (Cursor MDC, Windsurf trigger, Copilot `applyTo`)
- The classification work required across existing AIWG rules and the schedule to do it

It does NOT:
- Implement per-rule classification of the existing 15+ rules — that's a separate PUW (and the only safe near-term default is `alwaysApply` for all existing rules)
- Change the rule deployer's transform pipeline beyond adding the `activation` field read
- Replace `applyTo` for Copilot — `applyTo` is the Copilot-native expression of `glob` mode and continues to live in copilot.mjs's `transformRule`

## Decision

### 1. Four activation modes

***AIWG rule frontmatter gains a single new field: `activation`.*** Allowed values:

| Value | Cursor mapping | Windsurf mapping | Copilot mapping | Semantics |
|---|---|---|---|---|
| `alwaysApply` (default) | `alwaysApply: true` | `trigger: always_on` | `applyTo: '**'` | Loaded on every session/message |
| `auto` | `alwaysApply: false`, no globs | `trigger: model_decision` | `applyTo: '**'` (degraded) | Provider's auto-attach decides per session |
| `glob` | `globs: '<pattern>'` | `trigger: glob`, `glob: '<pattern>'` | `applyTo: '<pattern>'` | Loaded only when files matching `<pattern>` are in context |
| `manual` | `alwaysApply: false`, `description: '<short>'` | `trigger: manual`, `description: '<short>'` | `applyTo: '**'` (degraded) | Loaded only on explicit `@`-mention by operator/model |

For `glob` activation, the rule frontmatter must also declare the glob pattern in a sibling field (`globs:` for Cursor compatibility). For `manual`, a short `description:` is required so the model can recognize when the rule is relevant for `@`-mention.

**Copilot degraded fallback (load-bearing):** Copilot's `applyTo` model only expresses `alwaysApply` (with `'**'`) and `glob`. The `auto` and `manual` modes degrade to `applyTo: '**'` (always loaded) on Copilot. This is the safer-than-default behavior — operators who classify a rule as `manual` accept it being always-on for Copilot users until Copilot expands its loader semantics. Documented in CLAUDE.md as a known difference.

### 2. Default = alwaysApply (load-bearing)

***Rules without an `activation` field default to `activation: alwaysApply`.*** This is the schema-rollout safety guarantee: the existing AIWG rule corpus has no `activation` field, and every one of those rules must continue to load unconditionally until classified. The default field is read at emit time, not stored on disk; rule files stay unchanged.

### 3. Schema field placement

The `activation` field lives in the rule's YAML frontmatter at the top level:

```yaml
---
name: voice-framework
priority: medium
activation: glob
globs: '**/*.md'
description: Apply voice consistency rules to markdown content
---
```

Sibling fields (`globs:`, `description:`) are read only when their corresponding `activation` mode requires them. Validators reject:
- `activation: glob` without `globs:`
- `activation: manual` without `description:`
- Unknown `activation:` values (must be one of the four modes)

### 4. Per-provider emission

Per-provider emitters consume the `activation` field at deploy time and produce the provider-native expression:

- **Cursor** (`tools/agents/providers/cursor.mjs`): emit MDC frontmatter with `alwaysApply: true|false`, `globs:`, `description:` per the table in §1
- **Windsurf** (`tools/agents/providers/windsurf.mjs`): emit `trigger:` and supporting fields per the table in §1
- **Copilot** (`tools/agents/providers/copilot.mjs:280-326`): existing `transformRule` already does `applyTo` derivation; update to read `activation` from source frontmatter and respect explicit values rather than deriving from filename
- **Other providers** (Codex, OpenCode, Factory, Hermes, Warp, OpenClaw, Claude Code): no native rule activation system; emission is unaffected. Rules continue to deploy as full `.md` content; loader behavior is provider-default (always-load).

### 5. Live-Cursor smoke test gate

***Non-`alwaysApply` modes must not ship for Cursor without a live-Cursor smoke test in CI.*** The closed-source loader makes static verification insufficient. The smoke test creates a minimal repo with one rule per activation mode, deploys to a Cursor sandbox, opens the rule's target file, and asserts that the rule appears in Cursor's loaded rules panel. Until this gate is in place, Cursor emission must continue to use `alwaysApply: true` regardless of the source rule's `activation` value (with a warning emitted at deploy time noting the degraded behavior).

The same gate applies to Windsurf at the corresponding rollout. Copilot's `applyTo` is documented and verifiable from the Copilot extension's open-source instruction loader, so no additional smoke test is required there.

### 6. Classification rollout

The 15+ existing AIWG rules ship as `alwaysApply` (the default) until classified. Classification is a separate PUW (likely a per-framework rules audit) and is explicitly out of scope for this ADR. The default-preservation contract in §2 means classification can happen incrementally without coordinating across the rule corpus.

## Consequences

### Positive

- AIWG rules can express provider-native scoping without the deployer guessing.
- Default-preservation means existing operators see no behavior change at upgrade time.
- Copilot's `applyTo` derivation becomes deterministic (read from `activation`/`globs`) instead of a heuristic over filename.
- Future per-rule classification is a content change in rule files only, no deployer changes needed.

### Negative

- New schema field adds validator complexity (rejecting unknown `activation` values, requiring `globs:` for `glob` mode).
- Copilot degraded fallback for `auto`/`manual` modes is an explicit asymmetry that needs documentation. Operators classifying rules as `manual` for Cursor get always-on behavior on Copilot — that's the correct safer default, but it's surprising.
- Live-Cursor smoke test gate adds CI infrastructure work (Cursor sandbox setup, rule-load assertion).

### Neutral

- Existing rules without `activation` continue working unchanged (default = `alwaysApply`).
- Other providers (Codex, OpenCode, Factory, Hermes, Warp, OpenClaw, Claude Code) are unaffected.

### Risks

- **R1 — Vendor doc drift.** Cursor's activation taxonomy is from vendor docs; the closed-source loader could behave differently than documented. **Mitigation**: live smoke-test gate per §5 catches divergence before non-`alwaysApply` modes reach users.
- **R2 — Operator misclassification.** An operator marks a rule `manual` thinking Copilot supports it; gets always-on Copilot behavior they didn't expect. **Mitigation**: deploy-time warning when `activation: manual|auto` deploys to Copilot ("manual mode degraded to applyTo: '**' for Copilot").
- **R3 — Schema collision with `applyTo`.** Some rules already declare `applyTo:` directly for Copilot via the existing `transformRule`. **Mitigation**: precedence rule — explicit `applyTo:` in source frontmatter wins; `activation: glob` + `globs:` is the canonical form going forward; future PUW migrates direct-`applyTo` rules to `activation: glob`.

## Alternatives Considered

### A1 — Per-provider activation fields

**Rejected.** Would mean rules carry `cursor.activation:`, `windsurf.trigger:`, `copilot.applyTo:` separately. Triples the schema surface for the same expressive power. The 4-way taxonomy in §1 collapses cleanly to each provider's native form via the table.

### A2 — Skip the schema; use heuristics from filename

**Rejected.** Already what `transformRule` does for Copilot today. Heuristics are unstable across renaming, framework reorgs, and operator-authored rules. Explicit `activation` is the right primitive.

### A3 — Default to `auto` instead of `alwaysApply`

**Rejected.** Default-preservation contract is load-bearing — the existing AIWG rule corpus expects unconditional loading. `auto` would drop rule coverage on day one for every operator who hasn't yet classified.

## Validation

- [ ] Architecture review (architecture-designer agent — already conducted as part of parity-plan signoff per `parity-update-plan.md:166`)
- [x] Operator signoff
- [ ] Live-Cursor smoke test in CI (required before non-`alwaysApply` modes ship for Cursor)
- [ ] Live-Windsurf smoke test in CI (same gate for Windsurf trigger modes)
- [ ] Classification PUW filed for the existing 15+ rules

## Implementation tracking

Once accepted, this ADR is consumed by:
- PUW-011 (#1112) — Cursor MDC frontmatter emission with `alwaysApply: true` default
- PUW-020 — Windsurf trigger mode emission
- PUW-021 — `applyTo` glob field unification across Copilot/Cursor/Windsurf
- (Future) Rules classification PUW — per-rule audit assigning `activation` modes to the existing corpus

## References

- `.aiwg/architecture/adr-agents-md-aggregation.md` — ADR-1; rule entries in AGENTS.md `## Rules` link index pick up `activation` field for the link decoration
- `.aiwg/research/parity/cursor/assessment.md §6 gap 1` — Cursor activation taxonomy source
- `.aiwg/research/parity/windsurf/assessment.md §6 gap 1` — Windsurf trigger taxonomy source
- `.aiwg/research/parity/copilot/assessment.md §7.1` — Copilot `applyTo` source
- `.aiwg/planning/parity-update-plan.md:166` — explicit ADR-2 prerequisite
