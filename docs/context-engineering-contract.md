# Provider-neutral context engineering contract

Research and planning dispatches use the same semantic packet on every provider: `purpose`, `authoritative_inputs`, `working_set`, `constraints`, `expected_artifacts`, `verification_contract`, `budget`, and `handoff_target`. Prefer resolvable pointers to copied bodies and never substitute an abstract for required full source content.

## Minimal context packets

| Workflow | Required packet |
|---|---|
| Research induction | Source identifier and full content, acquisition fixity/metadata, source-type rules, REF/sidecar templates, corpus root |
| Research synthesis | Question/scope, retained REF findings and GRADE, contradiction/gap notes, citation policy, synthesis sections |
| Issue planning | Requested outcome, repository evidence, research synthesis, delivery policy, dependencies and testable acceptance constraints |
| SDLC planning | Approved scope, use cases/NFRs, architecture decisions/risks, gate state, traceability targets |

## Budget, compaction, and reset

Start with 15% for instructions/safety, 50% authoritative inputs, 15% active work/tool results, and 20% output/verification/handoff. Split work and persist intermediate artifacts instead of silently truncating evidence. At 70% consumption prune duplicates; at 85% persist and compact; at 95% stop adding input and reset or hand off. Lower provider limits win.

Reset when the objective changes, instructions conflict, provenance cannot be reconstructed, required evidence was summarized away, or exhaustion is imminent. Before compaction, reset, or handoff persist the objective/scope, decisions/open questions, exact artifact paths and revision, verification results, next action/owner, and escalation condition. The receiver must continue from this summary plus authoritative artifacts without hidden chat state. Durable facts belong in the artifact corpus; chat is a cache.

## Provider adapters

- Claude Code: project memory/imports plus `/compact` or a fresh session; see [Claude context budget](providers/claude-context-budget.md).
- Codex: `AGENTS.md`, skills, and goal/commentary summaries; see [Codex provider guidance](agents/providers/codex.md#skills-context-budget-2-ceiling).
- Generic fallback: packet manifest plus resolvable paths and a persisted handoff; begin a new conversation at reset criteria.

Adapters preserve packet fields, thresholds, artifact-first persistence, and the verification link.
