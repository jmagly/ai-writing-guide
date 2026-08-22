# ADR: Graph as an Optional AIWG Flow Profile

- Status: Accepted
- Date: 2026-08-22
- Issues: #2126, #2127, #2128, #2132
- Requirements: GRAPH-REQ-001, GRAPH-REQ-008

## Context

AIWG already has `flow.aiwg.io/v1` FlowCapabilities and FlowPlaybooks, typed
DAG steps, gates, retry, fanout, audit output, and run directories. The
Composition Engine adds a generic typed `flow.aiwg.io/v1alpha1` `FlowGraph`.
Agentic graph use additionally needs named conditional routes, route evidence,
guarded feedback, fan-in reducers, checkpoint policy, runtime bindings, and
stable graph-run identity.

## Decision

Implement graph orchestration as the optional `graph.flow.aiwg.io/v1`
`GraphPlaybook` domain/profile. Its validator projects into and reuses the
existing FlowGraph contract. Flow remains pattern-neutral; MissionConductor
retains durable ledger, authority, provenance, cost, checkpoint, and recovery
ownership. Ralph, RLM, A2A/Sandbox, external jobs, provider-native workers,
HITL, and durable code remain first-class runtimes wrapped by graph nodes only
when a graph profile is selected.

Graph metadata is optional on ordinary Flow/Mission runs and required on
GraphPlaybook runs. Operator views render the ledger and never become the only
source of truth.

## Rejected alternatives

1. A standalone `ControlTopology` or `GraphSpec` runtime was rejected as the
   first implementation path because it would fork Flow validation, scheduling,
   audit, and adapter semantics.
2. Making graph the default AIWG ideology was rejected because loops, DAGs,
   task trees, provider workflows, and durable code are better fits for many
   workloads.
3. Treating diagrams as executable truth was rejected because visual shape
   does not supply durability, idempotency, authority, or replay semantics.
4. Replacing the existing generic FlowGraph was rejected; the graph domain is
   a compatible enrichment and projection over that accepted alpha contract.

## Consequences

The graph-pattern addon can evolve its domain vocabulary while base Flow stays
stable. Every graph artifact pays an extra validation cost and must declare
guards, reducers, idempotency, HITL timeout routes, and authority narrowing.
Quality and cost claims remain prohibited until #2118 and graph conformance
gates provide evidence.
