---
namespace: aiwg
platforms: [all]
name: local-resource-index
description: Index cited local emergency, transit, and human-service resources with authority, freshness, correction, and takedown controls.
triggers:
  - index local public resources with citations
  - build a local emergency transit or services index
  - publish structured local resource data
---

# Local Resource Index

## Process

1. Register and gate every source before acquisition.
2. Select `cap`, `gtfs`, or `hsds`; retain the original payload/hash, publisher,
   profile/version, mappings, and validation result.
3. Never infer absent availability, accessibility, cancellations, contacts, or
   eligibility. Keep `not_provided` distinct from `none`.
4. Apply domain expiry/freshness and public-scope rules. Expired active alerts,
   unverified publishers, fabricated contacts, and sensitive client data block.
5. Provide correction/takedown intake and retain an append-only audit chain.

## Output

A `local-resource-index` record plus `block|warn|record` findings.

## References

- `schemas/local-resource-index.schema.json`
- OASIS CAP 1.2, GTFS, and Open Referral HSDS sources in the research brief
