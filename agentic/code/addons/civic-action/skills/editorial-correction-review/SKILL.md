---
namespace: aiwg
platforms: [all]
name: editorial-correction-review
description: Review a challenged civic claim and prepare a visible, append-only correction or withdrawal with downstream propagation evidence.
triggers:
  - correct an unsupported civic claim
  - prepare a correction notice and reindex plan
  - review a public information takedown request
---

# Editorial Correction Review

## Process

1. Freeze silent edits and preserve the challenged version/hash.
2. Collect the complaint, original sources, contrary evidence, response, safety
   concerns, retention holds, and all downstream locations.
3. Create a linked new version and correction note. Use `withheld` during review
   and `canceled` only for permanent withdrawal from public reuse.
4. Update owned caches, feeds, APIs, indexes, and exports; record third-party
   reindex/removal as requested or observed, never guaranteed global deletion.
5. Re-run source, citation, privacy, freshness, accessibility, and publish gates;
   a named human approves release.

## Output

A `correction-record` artifact and completion evidence per downstream target.
