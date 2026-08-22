---
namespace: aiwg
name: composition-validate
platforms: [all]
description: Validate a Flow graph manifest, explain semantic diagnostics, and emit one provider-neutral normalized composition contract.
triggers:
  - validate a Flow graph
  - validate composition manifest
  - check graph joins and ceilings
  - normalize agent tool graph
---

# Validate a Flow graph

Use this skill when an operator needs to author or validate
**flow.aiwg.io/v1alpha1 FlowGraph**.

## Process

1. Confirm the manifest uses **apiVersion: flow.aiwg.io/v1alpha1** and
   **kind: FlowGraph**.
2. Run **aiwg composition validate MANIFEST --format json**.
3. When an AIWG index export is available, add **--catalog INDEX.json** so
   stable candidate IDs are proven against that captured catalog.
4. Repair every error diagnostic. Do not weaken permissions, ceilings,
   approval boundaries, retry modes, or cycle guards merely to pass validation.
5. Pass the returned normalized envelope to an adapter or runtime. Do not add
   provider-specific fields to the source graph.

## Contract rules

- Every non-gate node resolves through the authorized candidate set.
- Every cycle has a CEL guard and finite iteration limit.
- Node permissions are a subset of both graph and declared-capability scopes.
- Approval-required side effects are never automatically retried.
- Trace policy covers declared execution metadata and bindings, never private
  chain-of-thought.

See **schemas/flow-graph.schema.json**, **README.md**, and
**docs/schema-evolution.md** in the addon for the complete contract.
