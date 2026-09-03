---
description: Route plain-language dataset work to governed AIWG dataset orchestration
argument-hint: "<source path/URI and desired outcome, or aiwg dataset action>"
allowed-tools: Read, Bash
---

Start with `dataset-intelligence` for plain-language requests. Use the canonical
`aiwg dataset` CLI actions only: source, check, preview, plan, ingest, status,
show, verify, query, lineage, export, cancel, and retry. Synchronization and
retirement are governed plan/ingest workflows, not separate runtimes.

Never perform source enumeration, indexing, checkpoint mutation, deletion, or
backend writes inside this command wrapper. Show the exact proposed
`aiwg dataset` operation and preserve its plan/run/receipt references.
