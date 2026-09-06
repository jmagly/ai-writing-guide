# Autonomy classification and human operating roles

Rate ambiguity, reversibility, architectural consequence, familiarity, testability, data sensitivity, and external side effects low/medium/high. The most restrictive factor controls; no average cancels high sensitivity, irreversibility, or external effects.

| Class | Profile | Human checkpoint | Verification / escalation |
|---|---|---|---|
| Autonomous | Low consequence/ambiguity; familiar, reversible, strongly testable; no sensitive/external effect | Review completion | Deterministic evidence; escalate on scope change, check failure, or material assumption |
| Supervised | Medium factors; reversible with reliable review | Approve boundary, review completion | Deterministic plus targeted review; escalate on architecture/security impact or retry exhaustion |
| Interactive | High ambiguity/unfamiliarity, consequential architecture, or weakly testable synthesis | Approve decisions as they arise | Independent evidence/alternatives; escalate on conflict, low confidence, or boundary crossing |
| Human-owned | Sensitive/legal judgment, irreversible action, credentials/production, consequential external effect | Human decides and executes/authorizes | Dual control/audit trail; AI never claims final authority |

## Human roles

- Director sets outcome, scope, authority, risk appetite, checkpoints, and consequential choices.
- Operator controls environments, credentials, external mutations, evidence, and rollback; confirms actual system state.
- Reviewer checks traceability, evidence quality, correctness, safety, and acceptance criteria; rejects unsupported completion.

For research, the director defines the question, operator fixes/acquires sources, and reviewer checks citations/GRADE. For planning, the director prioritizes, operator mutates the tracker, and reviewer checks dependencies, testability, and architecture alignment.

## Scenarios

1. Formatting a generated index with snapshot tests is autonomous.
2. Unfamiliar cross-service architecture is interactive with architecture-owner decisions.
3. Mixed-quality research synthesis is interactive because verification is inferential; require citation/GRADE review.
4. Publishing, deploying, purchasing, sending messages, or changing production access is human-owned unless narrowly authorized and reversible; the operator records evidence.
