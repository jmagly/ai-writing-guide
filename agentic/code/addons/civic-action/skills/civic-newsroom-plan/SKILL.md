---
namespace: aiwg
platforms: [all]
name: civic-newsroom-plan
description: Plan an evidence-bound civic newsroom workflow with provenance, privacy, citation, correction, accessibility, and human publication gates.
triggers:
  - organize a lawful civic newsroom workflow
  - plan a cited local public information project
  - build a civic evidence and publishing plan
---

# Civic Newsroom Plan

## Process

1. Define the public-interest question, audience, jurisdiction, risk tier, and
   prohibited uses.
2. Inventory sources and create source/retrieval records; do not acquire before
   the source gate passes.
3. Map material claims to selectors and epistemic states.
4. Plan accessibility, privacy minimization, response, correction, retention,
   and named reviewer responsibilities.
5. Use `flows/civic-newsroom.yaml`; stop at its publication gate.

## Output

Return an artifact plan, dependency readiness table, open questions, and human
decisions. Missing optional frameworks are explicit degraded states.

## References

- `rules/RULES-INDEX.md`
- `docs/research/aiwg-design-patterns.md`
- `docs/research/control-source-matrix.md`
- research-complete `citation-guard`; media-marketing-kit `approval-workflow`
