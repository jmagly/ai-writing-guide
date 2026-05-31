# ADR: Rename AIWG "workflow" concepts → Flows (pre-established) + Missions (dynamic)

Date: 2026-05-31
Status: Accepted (mechanical rename staged)
Issues: #1536, #1534; related #1539 (merge decision)

## Context

"Workflow" is overloaded in AIWG and now collides with the provider `/workflow` surface (Claude Code's Workflow tool; Codex `/plan`+`/goal`). Two distinct AIWG concepts carry the name:

1. **Pre-established** — the workflow *metalanguage* under `agentic/code/addons/aiwg-utils/workflow/` (`WorkflowCapability`, `WorkflowPlaybook`, `WorkflowInventory`, `WorkflowGate`, `WorkflowRole`, `WorkflowExtension`; `apiVersion: workflow.aiwg.io/v1`).
2. **Dynamic** — AIWG's dynamic multi-agent orchestration (`mc` mission-control–style runs / script fan-out).

Note: the SDLC `flow-*` command family is **already** named "flow" (not "workflow"), so it does not collide — it aligns with the target naming.

## Decision

- **Pre-established → "Flows".** Rename the metalanguage's user-facing concept and `Workflow*` kind names to `Flow*` (`FlowCapability`, `FlowPlaybook`, …), unifying with the existing SDLC `flow-*` family. Per #1539 this is the **merge** direction: `flow-*` skills become thin wrappers over declarative YAML Flow definitions in the same conceptual family.
- **Dynamic → "Missions".** Refer to dynamic multi-agent orchestration as "Missions", unifying with `mc` (mission-control already uses "missions" and a "conductor").

## Wire-stability strategy (back-compat)

The naming confusion is *user-facing* (the `/workflow` command vs the AIWG concept), not machine-facing. To avoid a breaking change to authored documents:

- **Keep `apiVersion: workflow.aiwg.io/v1` and the `Workflow*` `kind` values as recognized wire identifiers** (machine contracts). Add `flow.aiwg.io/v1` + `Flow*` kinds as **forward aliases** the loader/validator/indexer accept. Deprecate the `workflow.*` spellings over a release line, never hard-break (mirror the existing `ops.aiwg.io/v1 → workflow.aiwg.io/v1` alias model already documented in the metalanguage README).
- The index Flow-detector (`parseFlowDoc`, #1540) already matches `(workflow|ops).aiwg.io/v1`; extend it to also match `flow.aiwg.io/v1` when the alias lands.

## Mechanical rename — staged (do not mass-rename in one pass)

The rename touches schemas, README/docs, the executor contract, and any `Workflow*` type references. Stage it behind this ADR to avoid a reckless cross-codebase edit:

1. Add `flow.aiwg.io/v1` + `Flow*` kind aliases to the loader/validator (additive, tested).
2. Update docs + README to lead with "Flows"/"Missions", noting `workflow.*` as the legacy spelling.
3. Migrate authored examples + the executor agent name (`workflow-executor`) where low-risk.
4. Deprecation note for `workflow.*` wire identifiers; remove no earlier than the release after the alias ships.

## Consequences

- User-facing vocabulary disambiguates cleanly from the provider `/workflow` command: AIWG has **Flows** (declarative, pre-established) and **Missions** (dynamic orchestration); the provider has its own `/workflow`/`/goal`.
- No authored Flow document breaks (wire identifiers stay valid via alias).
- The SDLC `flow-*` family and the metalanguage converge under one "Flows" concept (#1539).

## Alternatives considered

- **Playbooks + Orchestrations** (scheme A): rejected by operator in favor of reusing existing `flow-*`/`mc` vocabulary.
- **Hard-rename the apiVersion/kind** (no alias): rejected — breaks authored documents for a user-facing-naming problem that aliasing solves.
