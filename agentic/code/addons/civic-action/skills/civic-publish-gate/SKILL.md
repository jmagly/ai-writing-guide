---
namespace: aiwg
platforms: [all]
name: civic-publish-gate
description: Run deterministic source, citation, freshness, privacy, meeting-certainty, accessibility, correction-state, and human-approval checks before civic publication.
script:
  entrypoint: scripts/publish_gate.mjs
  runtime: node
  cwd: project-root
  argsHint: "<publication-packet.json>"
triggers:
  - publish cited local public information
  - run civic publication quality gates
  - check a civic story before publishing
---

# Civic Publish Gate

## Process

1. Supply a versioned publication packet with per-section count/freshness
   rules, claims, sources, links, structured-data validation, accessibility,
   privacy, correction state, static/CMS adapter results, and human review.
2. Run `aiwg run skill civic-publish-gate -- packet.json`.
3. Remediate every block. Warnings require visible human disposition.
4. Treat automated accessibility checks as evidence only, never a complete WCAG
   conformance determination.
5. Publication remains an external human action even after a machine pass.
6. Verify the live page, last-good copy, sitemap, reindex, and cache handoffs;
   each must pass or be explicitly not applicable before publication completes.

## Output

A schema-valid publication gate report. Exit `1` means blocked; exit `2` means
invalid input/usage. The command never writes to a CMS or external service.

## References

- `schemas/publication-gate-result.schema.json`
- `rules/publication-human-review.md`
- `docs/research/control-source-matrix.md`
- media-marketing-kit `qa-protocol` and `approval-workflow`; ops-complete `ops-verify`
