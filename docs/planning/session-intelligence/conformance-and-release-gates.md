# Session ingestion conformance and release gates

The executable source of truth is
[`provider-conformance-matrix.json`](provider-conformance-matrix.json). It maps every canonical provider to
its implementation issue, support state, operations, synthetic fixtures, contract tests, and user
documentation. The `windsurf` entry is a compatibility ID for the current Devin Desktop product surface.

## Blocking gate map

All gates below run under the required CI `Test` job, primarily through `npm run test:ci` with typecheck and
build/conformance prerequisites in earlier steps; `Build` runs only after that job succeeds.

| Gate | Blocking evidence |
|---|---|
| Contract and provider import | `contracts-policy`, `discovery-readers`, and all 12 adapter suites |
| Security and bounded input | traversal/symlink authorization, record/total/depth limits, schema drift, malformed/truncated input, redaction canaries |
| Retrieval | `repository-importer`, `optional-backends`, and CLI session search tests |
| Curation and promotion | `candidates`, `promotion`, and knowledge-shard tests |
| Lifecycle | replay, relocation, tombstone, restore, purge, revocation, and deletion receipt tests |
| Release traceability | `provider-conformance.test.ts`, full typecheck, CLI build, and required Test + Build workflow jobs |

The matrix gate checks that all provider IDs occur exactly once, every referenced path exists, each fixture
directory is non-empty, provider tests cover drift/malformed behavior, and fixture content uses only
synthetic reserved identities. This prevents a provider from being declared complete with missing fixtures
or documentation.

## Performance evidence

`node tools/benchmarks/session-search.mjs` builds a temporary one-million-event FTS5 catalog, runs 25
authorized lexical searches, enforces the 2,000 ms p95 requirement, reports JSON, and removes the temporary
database. The 2026-07-27 reference-maintainer result was **115.55 ms p95**. This is indexed retrieval
evidence, not an import-throughput claim.

Metadata listing is structurally bounded by stable cursor pagination and a caller-provided limit. The
functional gate verifies deterministic pagination; the provisional 500 ms target must be re-measured on
each deployment’s storage. Peak memory and import throughput remain deployment observations because input
size limits and the optional SQLite backend vary by installation. AIWG does not present the FTS result as
evidence for those distinct measurements.

## Fixture policy

Session fixtures are generated examples. They may contain reserved redaction canaries such as
`example.test`, synthetic token markers, or non-existent absolute paths to prove sanitization. They must
not contain real home-directory identities, credential values, or copied user transcripts. Provider source
files are read-only inputs; lifecycle operations mutate only AIWG-owned normalized state.
