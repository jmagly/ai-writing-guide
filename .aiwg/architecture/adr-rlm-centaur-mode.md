# ADR: RLM Centaur Mode — Human-Pause Hooks for Recursive Operations

**Status**: Accepted (forward-looking design; phased implementation)
**Date**: 2026-05-08
**Deciders**: Joseph Magly
**Tags**: rlm, human-in-the-loop, centaur, design, ref-169

---

## Context

REF-169 (Evans, Bratton, & Agüera y Arcas, 2026, GRADE: MODERATE — preprint, established institution) reframes multi-agent design as social-system design and introduces:

> "Centaur configurations — composite actors in shifting configurations where one human may direct many agents, one AI may serve many humans, or many of each collaborate dynamically."

> "A recursive descent into collective deliberation that expands when complexity demands and collapses when the problem resolves."

Today's RLM is "fire-and-forget" — the root agent dispatches sub-agents, aggregates, and returns. The human is excluded mid-recursion.

This is a problem on two axes:

1. **Reliability** (REF-127, GRADE: VERY LOW): industry reports suggest agent success degrades after ~35 minutes; doubling duration quadruples failure rate. RLM operations on large corpora can run >35 minutes. Without human intervention points, failures compound silently until the whole run is wasted.

2. **Architectural fitness** (REF-169, GRADE: MODERATE): Evans et al. argue that for high-complexity tasks, human-in-the-loop intervention is not a safety bolt-on — it is *the correct architecture*. "Recursive descent into collective deliberation" requires expansion *and* collapse signals from the operator.

Today's `human-authorization` rule provides authorization gates *before* dispatch. This ADR extends authorization to *during* dispatch.

---

## Decision

**Add staged centaur-mode hooks to the RLM addon.** Phased implementation; this ADR scopes the design and prioritizes phases.

The design intentionally starts small. Full centaur configurations from REF-169 (many-humans-to-one-agent, fission-fusion teams) are out of scope. Single-operator-with-pause-hooks is the immediate target.

### Phase 1: Elapsed-time warning

Add to `rlm-status`:

- Display elapsed wall-clock time for any active RLM operation
- Emit a warning at 25 minutes (5 minutes before the REF-127 35-min threshold)
- Recommend checkpointing or split-into-loops if the operation is open-ended

Implementation surface: extends existing `rlm-status` skill output. No new commands.

### Phase 2: Cost/time confirmation gates

For RLM operations exceeding a configurable threshold:

- **Cost gate**: `--cost-limit USD` — pauses for human confirmation when cumulative estimated cost crosses the limit
- **Time gate**: `--time-limit MINUTES` — pauses at the limit before continuing recursion
- **Default thresholds**: cost $5, time 30 minutes — configurable in `.aiwg/rlm/centaur.config.yaml`

Implementation surface: new flags on `rlm-batch`, `rlm-search`. Add the flags to `argumentHint` to keep the canonical command-surface contract test happy.

### Phase 3: Inter-wave review checkpoints

For `rlm-batch` with `--max-parallel >1`:

- After each wave of sub-agents completes, optionally pause for human review
- Display per-wave summary: sub-agents launched, succeeded, failed; aggregate cost; deltas from prior wave
- Operator commands: continue, abort, redirect (modify the dispatching prompt for the next wave)

Implementation surface: `--review-each-wave` flag. New CLI surface for wave-resume operations.

### Phase 4: `rlm-status --interactive`

A live-monitoring TUI for active RLM operations:

- Real-time status of active sub-agents
- Pause / kill / redirect controls per sub-agent
- Aggregate cost and time tracking
- Drill-down into individual sub-agent transcripts

Implementation surface: substantial — new TUI dependency, websocket or filesystem-poll bridge to the running runtime. Track as a separate project once Phases 1-3 land.

---

## Architectural Principles

### Principle 1: Default-pass, opt-in pause

Centaur hooks must default to no-op behavior. Existing RLM users see no change unless they explicitly enable hooks.

### Principle 2: Hooks compose with `human-authorization`

Existing rule already requires authorization for high-stakes actions. Centaur hooks extend the same pattern *during* a long-running operation, not just at dispatch time. The mental model is unified.

### Principle 3: Fail-safe on operator absence

If the operator does not respond to a confirmation gate within a configurable timeout (default: 1 hour), the operation pauses (state externalized to filesystem) rather than continuing or aborting. Operator can resume from checkpoint. This aligns with `degraded-mode-design` patterns.

### Principle 4: All hooks observable from `rlm-status`

Every gate, pause, or wave checkpoint must be reflected in the `rlm-status` output. The operator should never have to dig through filesystem state to know an RLM operation is waiting on them.

---

## Acceptance Criteria

### For this ADR (#1202)

- ADR scoping centaur-mode design — **this document satisfies that**
- Cross-references `human-authorization.md` rule — **done**
- Phased implementation plan with clear surface areas — **specified above**

### For follow-up phase issues

Each phase becomes its own implementation issue when prioritized. Phase 1 has the smallest surface and unblocks the rest by establishing the elapsed-time tracking infrastructure.

---

## Consequences

### Positive

- Closes the silent-degradation gap from REF-127 — operators get warning before reliability degrades
- Implements REF-169's "recursive descent" architecture pattern as opt-in operator control
- Composes cleanly with existing `human-authorization` rule
- Phased approach allows incremental landing without disrupting current users

### Negative

- New configuration surface (`.aiwg/rlm/centaur.config.yaml`)
- Pause-and-resume semantics add complexity to RLM state management
- Phase 4 (`--interactive` TUI) is substantial work — risks scope creep if not deferred

### Neutral

- Most users never use centaur hooks; default is fire-and-forget as today
- For long-running operations, the cost of one extra confirmation gate is dominated by the cost of the operation itself

---

## Out of Scope

- Many-humans-to-one-agent configurations (REF-169) — single-operator scope
- Many-AI-to-many-human "fission-fusion" dynamics — single-operator scope
- Devil's-advocate / constructive-conflict patterns within RLM — separate research project
- Full institutional alignment framework (REF-169) — AIWG agent ecosystems already implement role-based delegation; institutional layer is a separate concern
- Phase 4 implementation specifics — tracked separately when prioritized

---

## Quality Note

REF-169 is GRADE: MODERATE — the strongest-graded source citing centaur configurations as architecturally important, but the paper is conceptual without empirical evaluation of specific implementations. This ADR's design is an *interpretation* of REF-169's principles applied to AIWG's RLM addon; it is not a direct implementation of an evaluated framework. Treat as exploratory design, not a validated pattern.

---

## References

- @.aiwg/research/findings/REF-169-agentic-ai-intelligence-explosion.md — centaur configurations (GRADE: MODERATE)
- @.aiwg/research/findings/REF-127-long-running-agents-task-decomposition.md — degradation thresholds (GRADE: VERY LOW)
- @agentic/code/addons/aiwg-utils/rules/human-authorization.md — authorization gates
- @agentic/code/addons/aiwg-utils/rules/degraded-mode-design.md — fail-safe patterns
- @agentic/code/addons/rlm/rules/rlm-context-management.md — Rule 9 (long-running checkpointing)
- Gitea issue #1196 — research-corpus update epic (parent)
- Gitea issue #1199 — long-running degradation guidance (related)
