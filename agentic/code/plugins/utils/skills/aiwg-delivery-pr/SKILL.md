---
namespace: aiwg
name: aiwg-delivery-pr
platforms: [all]
description: AIWG-specific delivery pull request workflow; explicit alias for aiwg-pr, not a generic repository PR guide
triggers:
  - "AIWG delivery PR"
  - "AIWG release PR"
  - "AIWG product PR"
  - "open an AIWG PR"
---

# AIWG Delivery Pull Requests

Use this skill only for AIWG product/workspace delivery where `.aiwg/aiwg.config` delivery policy, AIWG issue linking, no-attribution, and CI-green-before-done rules are authoritative.

This is an explicit alias for `aiwg-pr`. Existing `aiwg-pr` callers remain valid. Generic requests like "open a PR for this repo" should use the host repository's normal PR tooling and templates, not this AIWG-specific workflow, unless the repository is the AIWG product workspace or the operator explicitly asks for AIWG delivery policy.

## Route

1. Read `aiwg-pr` with `aiwg show skill aiwg-pr`.
2. Apply its delivery-policy and shared threat-assessment gates exactly.
3. If the request is generic repository PR work, stop and route to ordinary git/Gitea/GitHub PR creation instead.
