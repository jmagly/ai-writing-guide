# ADR: Agentic Flow Steps — intra-step multi-agent fan-out + synthesis

Date: 2026-05-31
Status: Accepted
Issues: #1547, #1539, #1534

## Context

The SDLC `flow-*` skills encode the **multi-agent documentation pattern**: a logical step dispatches **N executor agents in parallel** (a review panel), then a **synthesis** step draws one conclusion (Primary Author → Parallel Reviewers → Synthesizer → Archive). See `agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`.

The declarative Flow metalanguage (`workflow.aiwg.io/v1` / `flow.aiwg.io/v1`) models a `WorkflowPlaybook` as a DAG where **each step references exactly one `capability` → one executor agent**, sequenced by `depends_on`. The #1539 pilot (`flow-release`) converted cleanly because it is a gate-oriented sequence. But a heavy flow's "dispatch a panel of N reviewers, then synthesize" cannot be expressed except by hand-exploding it into N sibling steps + a manual synthesis step — which loses the intent and does not scale across ~24 flows. Converting heavy flows on the one-capability-per-step schema is **lossy** and violates #1539's "must not lose agentic flexibility" constraint.

## Decision

Add an **additive, back-compatible `fanout` step field** to the playbook step schema. A step is one of:

1. **Single-capability step** (today): `capability: <name>` → one executor agent. Unchanged.
2. **Inline kind step** (today): `kind: gate | extension` + `spec`. Unchanged.
3. **Fan-out step** (new): `fanout: { agents: [<capability>...], strategy: parallel|pipeline, synthesize: <capability> }`. The executor dispatches `agents` per `strategy`, awaits all, then runs `synthesize` over their outputs to produce the step's single result.

Chosen over the alternatives (a `WorkflowPanel` kind; a `parallel:true` + `synthesis_of:[step-ids]` pair) because:

- It keeps the **panel + synthesis as one logical step** (matches the prose intent and the `depends_on` DAG — downstream steps depend on the synthesized result, not on N sibling steps).
- It is purely **additive**: existing playbooks (single-capability / inline-kind steps) are unaffected; `fanout` is an optional, mutually-exclusive-with-`capability` field.
- It maps **directly onto the Claude Workflow-tool** `parallel()` / `pipeline()` + structured-output aggregation already described in `adr-workflow-routing.md` — the declarative `fanout` step is the provider-agnostic spelling of that mechanism.

### Schema shape

```yaml
steps:
  - id: review
    fanout:
      strategy: parallel              # parallel (panel) | pipeline (chained)
      agents:                         # ≥1 capability refs — the panel
        - security-review
        - test-review
        - architecture-review
      synthesize: review-synthesizer  # capability that draws one conclusion from the panel
    depends_on: [draft]
  - id: archive
    capability: archive-artifact
    depends_on: [review]              # depends on the SYNTHESIZED result
```

Constraints (enforced by schema): a `fanout` step MUST have `agents` (≥1) and `synthesize`; a step MUST NOT set both `capability` and `fanout`.

## Executor contract

When the executor encounters a `fanout` step:

1. Dispatch each `agents[*]` capability (parallel for `strategy: parallel`; chained for `pipeline`).
2. Await all; collect structured outputs.
3. Run `synthesize` with the panel outputs as input → the step's single output (available to `depends_on` consumers).
4. **Retained-ownership invariant (unchanged):** activity-log, human-authorization/threat gates, best-output selection, checkpoint/resume durability, reproducibility, and cost tracking apply **across the whole panel** — AIWG owns the bookkeeping; the panel agents drive only the worker mechanism. (Same invariant as `adr-workflow-routing.md`.)

## Cross-stack (#1546)

A `fanout` step's `agents` may target executors advertising different `stack:<name>` capabilities — i.e. the declarative `fanout` step is the natural **authoring surface for a cross-stack Mission** (a panel spanning Claude + Codex workers, synthesized under one AIWG conductor). The schema does not encode stack selection itself; that is the dispatch-time `executor_filter` (#1546).

## Consequences

- Heavy `flow-*` conversions (#1539) become expressible without loss — the review-panel pattern has a first-class shape.
- Validation harness gains fan-out coverage (valid fan-out validates; synthesis-without-agents and capability+fanout-together rejected).
- One heavy-flow proof (e.g. `flow-deploy-to-production`'s review panel) closes #1547; the bulk rollout proceeds under #1539.

## Follow-ups

- Implement the executor's fan-out dispatch behavior (the schema + ADR define the contract; executor wiring is the impl slice of #1547).
- Convert one heavy flow as the proof.
