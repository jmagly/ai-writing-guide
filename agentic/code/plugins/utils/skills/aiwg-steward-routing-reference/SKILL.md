---
name: aiwg-steward-routing-reference
namespace: aiwg
description: Tier-3 steward routing reference lookup for full CLI tables, deploy paths, issue/project-local routing, orchestration routes, diagnostics, and provider capability examples
platforms: [all]
triggers:
  - aiwg-steward routing reference
  - steward routing reference
  - steward tier 3 routing
  - steward full routing tables
  - aiwg steward lookup tables
---

# AIWG Steward Routing Reference

Tier-3 reference for `aiwg-steward`. Use this only after the Tier-1 steward
definition or `steward-quickref` points here.

Read the full reference at:

`agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-routing-reference.md`

## Contains

- Tier-2 / Tier-3 loading protocol.
- Setup repair and cleanup routing: `status --probe`, `doctor`, `refresh`, `use`, `regenerate`, index rebuild/sync, and provider reload boundaries.
- Issue workflow routing: `issue-workflow-guide`, `issue-audit`, `address-issues`, and `aiwg-issue` boundaries.
- Project-local authoring routing: `aiwg new-bundle`, `aiwg new-extension`, `aiwg new-provider`, and customization docs.
- Kernel-pivot deploy model and provider deploy paths.
- `$AIWG_ROOT` readability diagnostic and per-project-copy fallback.
- Full CLI toolset table.
- Command routing examples and invocation patterns.
- Catalog search by capability.
- Orchestration and loop routing, including `/goal`, `/aiwg-mission`, cross-stack Mission, `runtime:<name>`, `activity-log`, and `best-output`.

If this reference contradicts current CLI output, retry once with a broader
discover phrase, run the steward repair ladder for stale discovery when
appropriate, then file an AIWG correction issue with the stale target and
observed command output.

## References

- [[steward-quickref]]
- [[aiwg-steward worked examples]]
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-routing-reference.md
