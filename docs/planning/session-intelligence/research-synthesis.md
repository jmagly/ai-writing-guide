# Session Intelligence Research Synthesis

## Objective

Define an implementable, local-first subsystem for discovering explicitly
authorized provider session sources, normalizing evidence, searching imported
content, extracting reviewable intelligence, and promoting approved candidates
into existing AIWG memory consumers.

## Method

Four parallel provider research streams reviewed official documentation,
primary repositories, pinned source revisions, and local code contracts for all
12 canonical provider IDs. Separate architecture, privacy, requirements, test,
and citation reviews evaluated the resulting design.

The research did not treat undocumented local implementation details as stable
provider contracts. Evidence is classified as:

1. `native_api_export`
2. `documented_local_adapter`
3. `empirical_local_adapter`
4. `manual_import_only`
5. `unsupported`

Operational state is independent: `available`, `unavailable`, `inaccessible`,
`version_unknown`, `schema_unsupported`, or `error`.

## Findings

1. Provider capabilities differ by surface, not only by vendor. Cursor editor,
   CLI, and cloud agents have different contracts; Copilot export and VS Code
   local storage do as well.
2. Append-only JSONL is common but cannot be assumed complete while active.
   SQLite sources require provider APIs or consistent snapshots.
3. Archive, compaction, thread deletion, provider deletion, and AIWG-copy
   deletion are distinct states.
4. Provider-native exports and APIs take precedence over local implementation
   parsing. Empirical adapters remain opt-in, version-gated, and fail closed.
5. Raw transcripts and tool outputs are untrusted data. No content found in a
   transcript may invoke a command, tool, URL, or workflow.
6. Redaction and sensitivity policy must run before search indexing, embeddings,
   extraction, or transfer to an optional backend.
7. Extraction produces evidence-linked candidates, not memory. Promotion
   requires explicit review and produces a receipt.
8. AIWG needs a dedicated operational repository contract. Existing generic
   storage adapters and artifact body scanning do not supply transactions,
   checkpoints, evidence locators, or scalable transcript search.
9. The local implementation must not depend on Fortemi. Fortemi integration is
   an optional backend after generic core contracts are available.

## Existing Foundations

- `src/providers/provider-definitions.ts`: canonical provider IDs and aliases.
- `src/cli/skill-usage.ts`: bounded Claude JSONL parsing lessons, not a general
  transcript store.
- `src/memory/cli.ts` and semantic-memory `memory-ingest`: downstream routing,
  provenance, and discussion-first promotion patterns.
- `@fortemi/core/aiwg-index`: record types, facets, provenance, privacy,
  chunking, hybrid retrieval, and Knowledge Shard portability.
- AIWG #1649, #608, #826, and #1690: related telemetry, memory, ingestion, and
  Fortemi migration work with distinct boundaries.

## Research References

Already inducted and directly applicable:

- REF-062, W3C PROV-DM.
- REF-451, Datasheets for Datasets.
- REF-141, A-MEM.
- REF-162, Mem0.
- REF-718, Stateless Decision Memory.
- REF-955, Is Grep All You Need?
- REF-962, Memory-R1.
- REF-1450, Agent-Native Memory System.
- REF-1589, OpenTelemetry.
- REF-1915, NIST AI RMF and Generative AI Profile.
- REF-1986, Bad Memory: prompt-injection risks in agent memory.

Missing high-value sources are tracked as one induction issue per reference:
LongMemEval, CoALA, MemoryBank, and Deng et al.'s privacy threat analysis
framework.

## Recommended Delivery Order

1. Canonical contracts, status/error model, security policy, and fixture SDK.
2. Authorized source discovery, bounded readers, and SQLite repository.
3. Provider adapters in evidence order.
4. Catalog lifecycle, lexical/metadata search, and evidence citations.
5. Candidate extraction, review, conflicts, and supersession.
6. Explicit memory/KB promotion and deletion/revocation workflows.
7. Optional semantic and Fortemi backends.
8. Cross-provider conformance, security gates, documentation, and release.
