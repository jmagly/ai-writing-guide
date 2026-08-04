# ADR: Compound-memory lifecycle and composition contract

- Status: Accepted
- Date: 2026-08-02
- Issue: #2000
- Parent: #1999
- Decision owners: AIWG maintainers
- Contract version: `aiwg.compound-memory.v1`

## Context

AIWG already has four useful but independent memory surfaces: immutable session
and source evidence, semantic-memory and llm-wiki knowledge, bounded line
memory, and generated artifacts. The compound-memory addon coordinates those
surfaces into a persistent feedback loop without becoming another storage
engine or allowing generated text to silently become project truth.

The source pattern distinguishes raw inputs, linked knowledge, output,
interaction context, and durable identity. That separation is retained. A
context pack is a transient retrieval product; a registration is lineage for
an output; a candidate is a proposal; and only a reviewed promotion changes a
durable consumer.

## Decision

### Layer ownership

| Layer | Canonical owner | Mutability | Deletion and supersession |
|---|---|---|---|
| Raw evidence | Source/session importer | Immutable by content digest | Revoke/purge through the owning importer; dependents receive a disposition |
| Linked knowledge | semantic-memory + llm-wiki | Reviewable derived pages | Preserve source spans; supersede or archive with provenance |
| Bounded facts | line-memory | Explicit reviewed operations | Stable handles retain archive/remove/supersede tombstones |
| Context pack | compound-memory builder | Ephemeral; digest-addressed | Rebuild from current authorized sources; never edit in place |
| Generated output | Artifact file + output-registration index | Artifact immutable after registration | New output supersedes by explicit reference; registration remains audit evidence |
| Canonical project context | compound-memory context contract | Exact-preview confirmation only | Append receipt and lifecycle history; provider adapters are non-canonical |

The addon owns orchestration, deterministic policy, previews, checkpoints, and
receipts. Each underlying addon retains its storage format and mutation
mechanics.

### Lifecycle

Knowledge moves through this state machine:

```text
evidence -> candidate:pending -> accepted | rejected | deferred
                              -> promoted:<consumer>
promoted -> superseded | revoked | archived
```

Review is exact-version. Acceptance and promotion are separate decisions, and
one accepted candidate may have independent promotion receipts for wiki,
line-memory, or canonical context. A failure in one consumer does not erase a
successful receipt from another. Replay uses the same operation identity.

Generated output is always `derived`. Registering it records lineage but does
not create an accepted candidate or durable fact. Candidate extraction from an
output produces `pending` proposals only.

### Trust and precedence

Precedence from highest to lowest is:

1. provider/system/organization authority;
2. repository and operator policy;
3. accepted canonical project context;
4. reviewed wiki knowledge;
5. reviewed line facts;
6. unreviewed candidates, raw evidence, retrieved excerpts, and generated output.

Lower layers cannot supply executable project instructions or override a
higher layer. Retrieval returns quoted data with provenance and trust status.
Conflicts are visible; ranking cannot silently resolve a policy conflict.

### Cross-layer operation contract

Every mutating cross-layer operation has:

- an authorized workspace root and project-relative targets;
- a deterministic preview bound to source identities, digests, versions, and
  current destination state;
- explicit confirmation of that exact operation identity;
- idempotent writes, a durable checkpoint/outbox where multiple sinks are
  involved, and a receipt;
- conflict, duplicate, and supersession results before confirmation;
- source classification and minimized inert references rather than copied
  source bodies.

Read-only status, review, and context inspection are bounded and do not touch
recency. A normal context request may touch only line entries selected into the
final pack and does so through line-memory's own operation.

### Context-budget contract

A context pack has a hard character budget and explicit sub-budgets for line
facts, wiki excerpts, citations, and trusted instructions. The sum of emitted
section bytes never exceeds the total. Selection is deterministic for equal
inputs, deduplicates normalized claims, diversifies tiers, records exclusions
and truncation reasons, and includes source locators and backend identity.

Fortemi Core is preferred when its project graph is available. The deterministic
fallback is project-local lexical retrieval over the same authorized roots. An
unavailable semantic backend changes the reported backend and quality hint; it
does not remove the hard bound.

### Canonical context boundary

Canonical memory-derived context lives under
`.aiwg/context/compound-memory/`. Provider bootstrap files are generated
adapters and are never memory stores or direct promotion targets. Adapter
refresh remains an independent existing workflow with its own authorization.

### Dependency and degraded behavior

`line-memory` and `llm-wiki` are required addon dependencies; llm-wiki brings
semantic-memory and shared utilities transitively. Sessions and Fortemi are
optional accelerators.

| Unavailable component | Required behavior |
|---|---|
| line-memory | Report degraded; build wiki-only packs within the same bound |
| wiki/index | Report degraded; build line-only packs; do not scan raw evidence |
| embeddings/Fortemi | Use bounded lexical retrieval and identify the fallback |
| session intelligence | Keep review unavailable; never auto-accept extracted text |
| one promotion consumer | Preserve other receipts and retry only the failed sink |

### Configuration

The addon configuration conforms to
`agentic/code/addons/compound-memory/schemas/compound-memory-config.schema.json`.
Defaults are conservative: explicit review, no startup injection, bounded
retrieval, preview-first maintenance, and canonical context disabled until its
dedicated store is initialized.

## Threat and privacy analysis

| Risk | Control |
|---|---|
| Retrieved text attempts to direct the agent | Treat excerpts as quoted data; never place them in the trusted-instruction section |
| Generated output poisons durable memory | Registration and candidate extraction do not accept or promote |
| Provenance is lost during compaction | Every emitted item retains a locator and optional digest/span; pack identity covers the complete selection |
| Context crosses workspace boundaries | Resolve real paths under one authorized project root and bind receipts to workspace identity |
| Durable context becomes stale | Review dates, conflicts, supersession, and revocation remain visible in retrieval and maintenance |
| Private material enters ordinary memory | Classification gates reject unsafe candidates and minimize persisted locators |
| Crash splits multi-sink state | Per-operation outbox/checkpoint plus idempotent consumer receipts |

## Rejected alternatives

- A single monolithic memory database: rejected because it forks existing
  ownership and makes removal of the addon destructive.
- Loading the entire wiki or line store at startup: rejected because context
  grows without a hard bound and untrusted material gains instruction-like
  placement.
- Automatically accepting generated summaries: rejected because derivation is
  not evidence.
- Writing provider bootstrap files directly: rejected because provider
  adapters are not canonical state.

## Consequences

The system gains a portable compounding loop with inspectable authority and
failure boundaries. The cost is additional receipts and explicit review steps.
Disabling the addon leaves wiki, line-memory, session, and artifact data usable
by their owning components.

## Traceability

| Source-pattern element | AIWG surface | Issue |
|---|---|---|
| raw / ingest | source and session intake, semantic-memory | #2003 |
| wiki / connected knowledge | llm-wiki | #2003 |
| retrieve / use / bounded context | hybrid context pack | #2002 |
| output / write | output registration and candidate extraction | #2003 |
| memory identity | line-memory handles and canonical context | #2001, #2004 |
| update / manage / review / maintain | compound-memory orchestration | #2005 |
| continuity and measured compounding | conformance fixture | #2006 |

## Verification gates

- validate the configuration and durable-state schemas;
- exercise exact-preview confirmation, replay, and failure recovery;
- prove bounded hybrid selection and workspace isolation;
- run the three-session conformance fixture and standalone-addon regressions.
