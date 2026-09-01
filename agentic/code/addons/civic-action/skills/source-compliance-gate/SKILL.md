---
namespace: aiwg
platforms: [all]
name: source-compliance-gate
description: Evaluate source access, rights, robots, authorization, provenance, and freshness before automated acquisition or public reuse.
script:
  entrypoint: scripts/source_compliance_gate.mjs
  runtime: node
  cwd: project-root
  argsHint: "<source-registry.json>"
triggers:
  - check whether a public source may be acquired
  - validate a civic source registry
  - review robots terms license and freshness
---

# Source Compliance Gate

## Process

1. Create a versioned source registry from `templates/source-registry.yaml`.
   Record owner, URL, API/feed/HTML/browser/OCR/manual-export/records/skip
   method, cadence, decision state, citation format, fallback, and provenance.
2. Run `aiwg run skill source-compliance-gate -- registry.json`.
3. Stop automated collection on prohibited/unknown terms, robots error or
   disallow, authorization uncertainty, control bypass, or expired approval.
4. Route jurisdiction, terms, license, and publication rights to a named human.
5. Compare observed and minimum records. An empty or under-count result follows
   the declared block/warn/authoritative-empty policy and never silently erases
   the reviewed last-good copy.

## Output

The executable emits a `compliance-gate-result` JSON report and exit `1` when
any blocking result exists. It validates observed fields; it does not decide
law, contractual permission, or fair use.

## References

- `schemas/source-registry.schema.json`
- `rules/civic-safety.md`
- `docs/research/civic-workflow-standards.md`
- `docs/research/legal-ethics-guardrails.md`
