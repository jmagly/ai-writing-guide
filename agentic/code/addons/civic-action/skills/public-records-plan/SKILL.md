---
namespace: aiwg
platforms: [all]
name: public-records-plan
description: Research, draft, and track a jurisdiction-specific public-records request without legal conclusions or automated submission.
triggers:
  - plan a public records request
  - draft a FOIA request for human review
  - track a records request and response
---

# Public Records Plan

## Process

1. Check already-published sources, then resolve a current official jurisdiction
   and agency profile. Never fall back from state/local law to federal FOIA.
2. Describe records, custodians, systems, dates, formats, exclusions, fee
   ceiling, urgency, privacy minimization, and source-linked contact details.
3. Mark calculated dates as estimates derived from an approved profile; preserve
   agency-provided dates separately.
4. Produce a versioned draft marked `NOT REVIEWED — DO NOT SEND` until a named
   human approves the exact version. Submission is always manual.
5. Hash and quarantine responses; preserve originals and label OCR/extraction as
   derived. Do not reverse redactions or construct personal dossiers.
6. Track sent and observed/calculated due dates separately, status/fees,
   response artifact hashes, revision and appeal windows, and the linked
   investigation. Support PDF, scan, email, spreadsheet, and attachment inputs.

## Output

A `public-records-plan` artifact, evidence checklist, and pending human action.

## References

- `templates/public-records-plan.md`
- `schemas/public-records-plan.schema.json`
- `docs/research/legal-ethics-guardrails.md`
- `docs/research/control-source-matrix.md`
