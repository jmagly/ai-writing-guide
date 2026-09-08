---
name: test-conformance-evidence
description: Evidence boundaries and fail-closed gates for test conformance audits and normalization
---

# Test conformance evidence

Apply these rules when conducting a conformance audit or normalization workflow.

- Report source files, declarations, registered cases, executed cases and assertions as different units. Expand
  parameterized cases only from actual runner evidence. Preserve lane overlap and unassigned files.
- Lexical test smells and SUT import hints are screening candidates. A semantic finding needs source/control-flow
  review. Mock assertions prove only their declared boundary.
- A green runner cannot compensate for zero tests, missing discovery, excluded files, missing reports, malformed output
  or setup failure. Optional omissions remain unknown even when policy permits continuation.
- Source-bound review and negative controls must refer to current file hashes and actual test identities. A sampled
  review cannot certify its unsampled population. Whole-scope review policy requires whole-scope evidence.
- Coverage needs a stated source denominator and measured scope. Missing data is unavailable; zero denominator is not
  100%. Prove threshold enforcement with a deliberate failure, rather than trusting configuration text.
- Negative controls must execute the affected test and fail for the intended semantic reason. Timeout, missing
  dependency or runner startup failure is not a killed mutation. Restore changes and verify the baseline.
- Preserve failing/skipped/tool-error states; never swallow schema compilation errors or missing prerequisites as valid
  evidence. A validator passing an artifact is not evidence that its test claims are true.
- Normalize via concrete changes and digest-guarded receipts. Never weaken assertions, disable tests, expand exclusions
  or blindly rewrite snapshots to produce green status. Drift and partial application are explicit conflicts.
- Research states source provenance, date, platform/version applicability and evidence limitations. A documented recipe
  is not a verified platform integration. Tool installation follows actual task authorization, not the mere presence of
  a recommendation.
