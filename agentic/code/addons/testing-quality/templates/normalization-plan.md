# Testing normalization plan review

Machine plan path/hash and target root: {{plan}}
Finding IDs and intended behavioral acceptance: {{purpose}}
Batch number and finite batch budget: {{batch}}

| Path | Before hash/mode | After hash/mode | Behavioral reason | Verification |
| --- | --- | --- | --- | --- |
| {{path}} | {{before}} | {{after}} | {{finding_and_correction}} | {{command_and_expected_outcome}} |

Attach the complete machine plan containing before/after contents. `{path, content:null}` is deletion, requiring an
explicit obsolete behavior or replacement justification. The runtime creates/modifies/deletes bounded UTF-8 files,
preserves permissions and rejects duplicate/ancestor paths, traversal, symlinks, root mismatch and source drift.

Runner/discovery consequences: {{newly_visible_cases_or_lane_change}}
Coverage denominator/threshold consequences: {{scope_change_and_rationale}}
Oracle/fixture/cleanup consequences: {{semantic_change}}
Negative controls and restored baseline verification: {{controls}}

No tests disabled, assertions weakened, thresholds lowered or snapshots blindly accepted to obtain green status:
{{review_evidence_or_explicit_issue}}
Execution authorization already present or concrete out-of-scope step: {{authorization_context}}

Apply receipt and status: {{receipt}}
Post-apply verification artifacts: {{verification}}
Rollback receipt or partial/drift recovery plan: {{rollback}}

A hash conflict requires fresh source inspection. Partial failure is not an applied transaction; inspect the journal's
observed states before making a recovery plan. Rollback refuses intervening unrelated changes. A plan is reviewable
without asking the user to reapprove work already authorized.
