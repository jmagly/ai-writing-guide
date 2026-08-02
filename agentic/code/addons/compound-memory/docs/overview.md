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

`aiwg compound-memory review` exposes a bounded pending-candidate queue using
identities, assertion digests, confidence, sensitivity, warning counts, and
relationship metadata. The same read-only scan reports contradiction markers,
stale line handles, orphan wiki locators, unregistered output locators, and due
or conflicting canonical-context entries. It intentionally omits assertions,
evidence text, and output bodies.

`aiwg compound-memory maintain` produces a deterministic preview tied to the
current memory snapshot. Exact confirmation replays only pending derived-output
index registrations and persists an idempotent receipt. The receipt marks wiki
index work, line-memory repair, and candidate decisions as delegated instead of
bypassing their owning add-ons or review contracts.

`aiwg compound-memory context <task>` is the reusable retrieval boundary. Its
default 8,000-character pack allocates 2,000 characters to line facts, 4,000
to wiki excerpts, 1,500 to citations, and 500 to trusted instructions. CLI
flags can reduce or redistribute those bounds, but the hard total is always
enforced. Equal inputs produce the same pack identity. Duplicate claims are
removed, invalid lifecycle states are excluded, stale material is down-ranked,
and every excerpt is labeled `quoted-data` rather than instructions.

The fixed conformance target is p95 below 250 ms for a 1,000-file local corpus
on the CI runner, with precision and recall measured against the checked-in
three-session fixture. Fortemi Core is used when its project graph is current;
otherwise the result names the line-memory/wiki lexical backends.

Canonical project context is a separate reviewed destination at
`.aiwg/context/compound-memory/context.json`. An update proposal declares a
typed target, stable key, value, minimized source locator/digest, reviewer,
reason, scope, classification, and optional review/expiry dates. Preview shows
the current value, proposed value, and conflicting active entry identities.
Exact confirmation atomically advances the revision and writes an idempotent
receipt. Replacements retain the prior entry as superseded; revocation retains
its disposition. Instruction-like material, unsafe locators, and keys reserved
for higher-authority namespaces are rejected.

Export/import bundles contain no provider-specific fields. Cross-workspace
import is rejected unless explicitly authorized, and records the source
workspace identity. Provider adapter refresh is deliberately outside this
addon command and remains governed by existing update/regeneration workflows.

The driver skill exposes the ingest, retrieve/use, write, manage, review,
update, and maintain workflows through the existing portable skills and CLI
contracts. Authority-changing automation remains proposal-only until the
compound-memory lifecycle ADR is accepted.

Generated outputs use the core derived-output registration coordinator before
candidate extraction. Registration verifies the immutable file digest, records
the exact context-pack/source lineage, and uses a replayable outbox plus
idempotent incremental index record. It never treats registration itself as
knowledge promotion.

Raw intake follows the same separation. A preview classifies the source,
computes its exact digest, chooses a digest-addressed raw locator, and reports
the sessions or llm-wiki route. Confirmation preserves a byte-identical copy
and provenance receipt. Derivation remains the responsibility of the existing
session importer or semantic-memory `memory-ingest` workflow, so registering a
source cannot silently create accepted knowledge.
