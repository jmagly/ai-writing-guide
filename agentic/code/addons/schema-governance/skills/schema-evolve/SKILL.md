---
namespace: aiwg
name: schema-evolve
description: Change a governed schema with conservative compatibility analysis, consumer impact review, migration, and deprecation planning.
version: 1.0.0
platforms: [all]
triggers: [change a schema, evolve a data contract, add a required field, breaking schema change]
---

# Schema Evolve

Resolve the catalog entry and baseline; inventory consumers; run compatibility
analysis before editing. Compatible changes retain the version policy. Breaking
changes require a new version, migration/rollback guidance, a support window,
updated fixtures/projections, and consumer signoff. Treat `unknown` as review
required, never as compatible. Finish with `schema-review`.
