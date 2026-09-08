---
name: test-normalize
description: Repair and standardize a testing regime through concrete file plans, guarded deployment receipts and repeatable verification of runner and oracle behavior.
---

# Test normalization

Start from an evidence-backed assessment or a confirmed individual finding. For an unaudited whole testing regime, run
`test-conformance` first. Use [the normalization plan template](../../templates/normalization-plan.md) and the
[workflow](../../docs/conformance-workflow.md).

Select a finite batch and write the intended behavioral acceptance condition. Prioritize fail-open validators, omitted
tests and ineffective gates before cosmetic fixture conventions. Existing authorized cleanup covers necessary reversible
edits; ask only when a concrete step is outside that authorization.

Inspect `templates --action list` for a suitable platform bundle. Use `templates --action develop` to produce a custom
editable bundle when needed, then validate and review it. `templates --action deploy` plans/applies platform files
through the same ownership and receipt rules; provider addon deployment and target test configuration deployment are
separate operations.

Prepare explicit `{path, content}` edits; `content: null` means intentional deletion. Run `plan` to capture complete
before/after state. Review its actual paths and changed behavior, then `apply` within the authorized scope. Preserve the
receipt; changed hashes or receipt collisions require investigation and a new plan, not a forced write. No arbitrary
shell commands belong inside an edit plan.

Run the affected tests and discovery, negative controls, and declared wider verification. Update source-bound reviews
and regenerate the assessment/report. If the batch causes a regression, use `rollback` only while its receipt and
post-apply state remain valid. A partial transaction requires inspection and a fresh recovery plan; rollback refuses
unrelated drift.

Repeat with a new plan and a stated finite batch budget. Stop on conformance, an unresolved external prerequisite, or
budget exhaustion; report remaining findings. Do not silence tests, reduce thresholds or remove required checks to
satisfy the gate. A normalization template standardizes a convention; its successful deployment alone does not prove
real tests.
