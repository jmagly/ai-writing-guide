# Dataset migration and compatibility

Migration is projection, not relabeling. Preserve the original store, produce
a mapping and loss report, verify the result, and keep rollback available.

| Existing surface | Dataset compatibility path | Known boundary | Status |
|---|---|---|---|
| `index.graphs` and user indices | keep using existing index commands; legacy layout migration can build named sidecars | indexes/caches are regenerable, not canonical datasets | active compatibility workflow |
| semantic-memory `memory-ingest` | retain its summary, entity, contradiction, and topology behavior; optionally register source/run evidence | raw dataset ingestion cannot reproduce semantic synthesis | active; no retirement scheduled |
| research provenance | project records through the canonical ledger when useful | arbitrary entity/activity attributes require a governed extension | projection shipped; workflow remains active |
| marketplace provenance | project graph entities, activities, agents and relations | non-core entity attributes require a governed extension | projection shipped; workflow remains active |
| mention edges | project file entities, locator evidence and inferred assertions | a mention is not verified causality | projection shipped; workflow remains active |
| SDLC traceability | project requirement links with evidence and run identity | verified without a run ID remains inferred | projection shipped; workflow remains active |
| Fortemi v2 export | project field provenance into ledger events | search is not provenance; unsupported relationships are semantic loss | projection shipped; static export remains active |
| ledger to dependency graph | generate legacy graph view | drops basis, evidence, run, field, privacy and retention | lossy compatibility projection |

## Migration procedure

1. Back up or snapshot canonical sources and current configuration.
2. Run the existing workflow’s read-only check or dry run.
3. Record source revision, schema, privacy and retention.
4. Generate the compatibility projection and inspect every loss item.
5. Build beside the existing derived store; never overwrite the only copy.
6. Verify identities, counts, relationships, evidence and representative queries.
7. Switch consumers only after review; retain the old path for the support window.
8. Roll back consumer selection if verification fails. Preserve failed output for diagnosis.

No surface in this table is newly deprecated by Dataset Intelligence Stage A.
The machine-readable [deprecation inventory](../deprecations/dataset-deprecations.v1.json) is empty until
a release owner supplies a date, support window, automated detector, rollback,
and measurable removal criteria.
