# Risk Register: LFD Control Patterns for AIWG Agent Loops

**Document Type**: Risk Management Artifact  
**Issue**: `roctinam/aiwg#1585`  
**Related ADR**: `.aiwg/architecture/adr-lfd-control-patterns-for-agent-loops.md`  
**Status**: Draft for pre-construction review  
**Date**: 2026-06-17  
**Review Cadence**: Before construction, then at each implementation wave

## Summary Dashboard

| Risk Level | Count |
|---|---:|
| Critical | 0 |
| High | 5 |
| Medium | 5 |
| Low | 1 |
| **Total** | **11** |

## Scoring

Probability and impact use the AIWG `risk-cycle` five-point model:

- Probability: 1 rare, 2 unlikely, 3 possible, 4 likely, 5 certain
- Impact: 1 negligible, 2 minor, 3 moderate, 4 major, 5 catastrophic
- Score: probability x impact
- Level: low 1-5, medium 6-11, high 12-19, critical 20-25

## Top Risks

1. **R-LFD-001: Overbroad control import** - score 16, high
2. **R-LFD-002: Holdout/lint leakage creates a new oracle** - score 16, high
3. **R-LFD-003: Runtime budget metrics are not actually observable** - score 12, high
4. **R-LFD-004: VOID semantics frustrate diagnosis and adoption** - score 12, high
5. **R-LFD-005: Mechanical gates are documented but not load-bearing** - score 12, high

## Active Risks

### R-LFD-001: Overbroad Control Import

| Attribute | Value |
|---|---|
| Category | Technical / Scope |
| Probability | 4 likely |
| Impact | 4 major |
| Score | 16 high |
| Owner | Architecture |
| Status | Open |

**Description**: LFD controls are useful for long-running, eval-driven,
adversarial, or budgeted loops, but applying them to every AIWG workflow would
add unnecessary setup, slow simple tasks, and encourage bypass.

**Mitigation**:

- Make the mechanical-control layer conditional by criticality and task type.
- Document examples where LFD controls are not required.
- Stage docs/rules first, runtime support second, harness conventions third.

**Contingency**: If early construction drifts toward mandatory global controls,
split the feature into opt-in high-criticality/eval-driven rules.

### R-LFD-002: Holdout/Lint Leakage Creates a New Oracle

| Attribute | Value |
|---|---|
| Category | Security / Evaluation Integrity |
| Probability | 4 likely |
| Impact | 4 major |
| Score | 16 high |
| Owner | Security / Test Architecture |
| Status | Open |

**Description**: Any lint or score instrument that touches hidden eval content
can leak holdout membership through detailed error messages, timing, or repeated
queries. This recreates the oracle-mining failure LFD is designed to prevent.

**Mitigation**:

- Return only `VOID: constraint violation` to optimizer-readable surfaces.
- Write detailed diagnostics only to human-only logs outside the agent surface.
- Rate-limit holdout scoring and record all holdout calls.
- Add tests that plant eval-shaped literals and prove the score voids without
  revealing which literal matched.

**Contingency**: Disable holdout-touching lint in optimizer-accessible commands
until private diagnostic channels are implemented.

### R-LFD-003: Runtime Budget Metrics Are Not Actually Observable

| Attribute | Value |
|---|---|
| Category | Technical / Instrumentation |
| Probability | 3 possible |
| Impact | 4 major |
| Score | 12 high |
| Owner | Runtime / Mission Control |
| Status | Open |

**Description**: The proposed budget stop needs wall-clock, token, and spend
observability. Wall-clock is straightforward, but token and dollar accounting
may be unavailable or provider-dependent.

**Mitigation**:

- Define a budget object with explicit `unknown` states for token/spend fields.
- Make wall-clock stop the baseline invariant.
- Use provider logs only where available; do not infer precise spend from weak
  signals.
- Document confidence level for each budget metric.

**Contingency**: Ship docs/rules and wall-clock stop first; defer token/spend
hard stops until the runtime can observe them authoritatively.

### R-LFD-004: VOID Semantics Frustrate Diagnosis and Adoption

| Attribute | Value |
|---|---|
| Category | Adoption / Developer Experience |
| Probability | 4 likely |
| Impact | 3 moderate |
| Score | 12 high |
| Owner | Developer Experience |
| Status | Open |

**Description**: VOID is intentionally opaque to the optimizer, but humans still
need enough information to fix harness/configuration mistakes. If private
diagnostics are awkward, users will weaken or bypass the control.

**Mitigation**:

- Pair VOID output with a human-only diagnostic location.
- Explain the oracle-mining rationale in docs.
- Provide a safe troubleshooting flow that does not expose holdout membership to
  the optimizer.

**Contingency**: Restrict VOID semantics to high-criticality/eval-driven loops
until UX is proven.

### R-LFD-005: Mechanical Gates Are Documented but Not Load-Bearing

| Attribute | Value |
|---|---|
| Category | Governance / Security |
| Probability | 3 possible |
| Impact | 4 major |
| Score | 12 high |
| Owner | Architecture / Security |
| Status | Open |

**Description**: The ADR separates mechanical and cooperative controls, but
implementation may still let self-report substitute for tests, checksums,
holdout scoring, or other objective evidence under pressure.

**Mitigation**:

- Define a rule-tier table with "substitutable by self-report: yes/no".
- Require high-criticality gates to cite mechanical evidence.
- Add review checks for claims that close work based only on narrative.

**Contingency**: Add a blocking gate for high-criticality workflows if review
finds self-report substituting for mechanical checks.

### R-LFD-006: Exploration Quota Causes Unbounded Churn

| Attribute | Value |
|---|---|
| Category | Technical / Loop Behavior |
| Probability | 3 possible |
| Impact | 3 moderate |
| Score | 9 medium |
| Owner | Agent Loop Runtime |
| Status | Open |

**Description**: A forced structural variation every K cycles can become random
thrashing if K is poorly chosen or "structural variation" is vague.

**Mitigation**:

- Require K to be declared per loop or inherited from a documented default.
- Require each variation to name a hypothesis and diagnostic before change.
- Keep budget and plateau stop conditions in force.

### R-LFD-007: Schema Churn in Progress Files

| Attribute | Value |
|---|---|
| Category | Technical / Compatibility |
| Probability | 3 possible |
| Impact | 3 moderate |
| Score | 9 medium |
| Owner | SDLC / Runtime |
| Status | Open |

**Description**: Adding hypothesis-before-change fields can break tools that
consume existing progress files if schemas are changed in place.

**Mitigation**:

- Add fields as optional first.
- Version structured schemas where they exist.
- Provide migration examples and preserve existing unstructured logs.

### R-LFD-008: Research Citation Drift

| Attribute | Value |
|---|---|
| Category | Research / Traceability |
| Probability | 2 unlikely |
| Impact | 3 moderate |
| Score | 6 medium |
| Owner | Research |
| Status | Open |

**Description**: Issue #1585 originally listed REF-1398 through REF-1403, but
the research repo later added REF-1404 through REF-1406 and follow-up issue #72.
Construction could accidentally cite the older incomplete set.

**Mitigation**:

- Treat REF-1398 through REF-1406 as the core cluster.
- Cross-link `section9/research-papers#72` when citing lower-priority sources.
- Update construction docs from the research brief, not only issue body text.

### R-LFD-009: Harness Convention Becomes a Parallel Framework

| Attribute | Value |
|---|---|
| Category | Architecture / Maintainability |
| Probability | 3 possible |
| Impact | 3 moderate |
| Score | 9 medium |
| Owner | Architecture |
| Status | Open |

**Description**: Adding score/lint/probe/status conventions could turn into a
second workflow framework instead of an optional eval-driven pattern integrated
with AIWG gates.

**Mitigation**:

- Keep harness conventions optional and composable.
- Reuse existing AIWG gate, progress, and issue artifacts.
- Avoid importing LFD wholesale as a separate island.

### R-LFD-010: Human Review Gate Skipped

| Attribute | Value |
|---|---|
| Category | Process / Governance |
| Probability | 2 unlikely |
| Impact | 4 major |
| Score | 8 medium |
| Owner | Project Lead |
| Status | Open |

**Description**: The operator explicitly requested review before construction.
Continuing directly into rule/runtime implementation would violate the workflow
and risk solving the wrong scope.

**Mitigation**:

- Keep this issue at review gate until the operator approves the ADR, backlog
  split, and first construction wave.
- Use tracker comments to make review state visible.

### R-LFD-011: Follow-up Research Induction Lags Construction

| Attribute | Value |
|---|---|
| Category | Research / Dependency |
| Probability | 3 possible |
| Impact | 2 minor |
| Score | 6 medium |
| Owner | Research |
| Status | Open |

**Description**: `section9/research-papers#72` may remain open while
construction begins. This is acceptable if those sources are not treated as
load-bearing evidence, but risky if implementation claims depend on them.

**Mitigation**:

- Use REF-1398 through REF-1406 for load-bearing construction claims.
- Treat #72 sources as pending unless inducted before citation.
- Mark any use of #72 sources as "candidate / pending induction".

## Review Actions

- [ ] Operator reviews whether the risk register captures the right blockers.
- [ ] Decide whether VOID semantics are high-criticality-only or a broader
  pattern.
- [ ] Decide whether budget observation starts as wall-clock-only or includes
  provider-specific token/spend data.
- [ ] Revisit this register after the first construction wave is scoped.
