# ADR-004: Treat Extracted Intelligence as Reviewable Candidates

Status: Accepted for planning

Date: 2026-07-26

## Context

Model-assisted extraction can hallucinate, overgeneralize, mis-scope, or repeat
hostile transcript instructions. Directly writing extracted claims into memory
would collapse evidence, interpretation, and durable policy.

## Decision

Extraction creates versioned candidates:

```text
pending -> accepted -> promoted
       \-> rejected
accepted/promoted -> superseded
```

Each candidate includes type, structured value, temporal/project scope,
evidence citations, extractor/model and policy version, confidence, sensitivity,
conflicts, and supersession links.

Promotion requires explicit review, a named consumer, and a receipt containing
the exact candidate version and destination outcome. Automatic unreviewed
promotion is prohibited.

## Consequences

- Extraction can be rerun without changing durable memory.
- Review and promotion are independently auditable.
- Repeated promotion can be idempotent.
- Candidate queues and conflict handling add operational complexity.
