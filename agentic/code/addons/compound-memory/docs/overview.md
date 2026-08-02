# Compound Memory

Compound Memory composes AIWG's existing memory capabilities into a governed
loop:

```text
immutable evidence -> reviewed candidates -> llm-wiki / line-memory
        ^                                           |
        |------- registered outputs + lineage ------|
```

The addon is deliberately an orchestration layer. `semantic-memory` owns
ingestion and memory logging, `llm-wiki` owns linked long-form knowledge,
`line-memory` owns bounded concise facts, and `sessions` owns candidate review,
promotion receipts, and source-purge dependent dispositions.

## Activation

```bash
aiwg use compound-memory --provider <provider>
aiwg compound-memory status --json
```

Activation resolves and deploys required addons in dependency-first order.
Optional dependencies are never activated implicitly. Missing dependencies,
cycles, malformed manifests, and identity mismatches fail before the selected
addon is deployed.

The initial status contract is read-only and bounded. It reports source
dependency availability, line-memory sidecar integrity, wiki index staleness,
the command needed to inspect pending review, and actionable next steps. It
does not read transcript bodies or persist secrets.

The driver skill exposes the ingest, retrieve/use, write, manage, review,
update, and maintain workflows through the existing portable skills and CLI
contracts. Authority-changing automation remains proposal-only until the
compound-memory lifecycle ADR is accepted.

Generated outputs use the core derived-output registration coordinator before
candidate extraction. Registration verifies the immutable file digest, records
the exact context-pack/source lineage, and uses a replayable outbox plus
idempotent incremental index record. It never treats registration itself as
knowledge promotion.
