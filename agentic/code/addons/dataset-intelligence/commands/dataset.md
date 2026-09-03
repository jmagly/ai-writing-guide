---
description: Route plain-language dataset work to governed AIWG dataset orchestration
argument-hint: "<source path/URI and desired outcome, or aiwg dataset action>"
allowed-tools: Read, Bash
---

Start with `dataset-intelligence` for plain-language requests. Use the canonical
`aiwg dataset` CLI for every check, preview, plan, ingest, status, cancellation,
verification, lineage, export, synchronization, or retirement operation.

Never perform source enumeration, indexing, checkpoint mutation, deletion, or
backend writes inside this command wrapper. Show the exact proposed
`aiwg dataset` operation and preserve its plan/run/receipt references.
