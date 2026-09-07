---
namespace: aiwg
name: dataset-intake
description: Turn a source path or URI and desired outcome into a governed dataset intake envelope for any AIWG domain.
version: 1.0.0
platforms: [all]
aliases: [data onboarding, dataset onboarding, source intake]
triggers: [use this customer export, onboard this dataset, use these files, ingest this corpus, connect this data source]
---

# Dataset Intake

Accept a source path/URI and desired outcome. Default the calling domain to
`project-local`; SDLC, research, knowledge-base, media, marketing, and ops use
the same envelope and may add only namespaced extensions.

Create a `dataset-intake/v1` envelope without opening the source. Record opaque
source locator, outcome, domain, known privacy/locality/network constraints,
authorization references, and independently requested capabilities (`search`,
`traceability`, `provenance`, `graph`, `export`). Do not infer credential
values. Then propose `aiwg dataset preview <source> --json` and hand the intake
reference to `dataset-source-assess`.

For a question about existing normalized AI session history, route inspection to
`session-explore` before proposing a new dataset. A separately requested export
or derived index can enter this intake using its approved source/evidence
references, privacy constraints and intended outcome. Do not scan provider homes
or treat catalog inspection as approval to copy transcripts into another store.
