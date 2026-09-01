---
template: civic-minutes-reconciliation
version: 1.0.0
category: civic-action
description: Human-readable comparison of transcript/ledger assertions and official minutes.
variables: [meeting_id]
---

# Minutes reconciliation: {{ meeting_id }}

For each assertion record the ledger selector, minutes selector, relation
(`match|mismatch|absent_from_source|ambiguous|human_review_required`), exact
difference, materiality, decision, rationale, and named reviewer. A match does
not certify legal validity and machine output is never official minutes.
