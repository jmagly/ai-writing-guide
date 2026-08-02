# Compound Memory addon

Governed orchestration for persistent project memory across semantic-memory,
llm-wiki, line-memory, session candidates, and generated artifacts.

```bash
aiwg use compound-memory --provider <provider>
aiwg compound-memory status
aiwg compound-memory ingest sources/decision.md --json
aiwg compound-memory context "task description" --budget 8000 --no-touch --json
aiwg compound-memory review --limit 50 --json
aiwg compound-memory update decision session.catalog "SQLite is authoritative" \
  --source-ref session:<opaque-id> --reviewer <id> --reason "reviewed" --json
aiwg compound-memory maintain --json
aiwg compound-memory capture-output output/report.md \
  --media-type text/markdown \
  --context-pack-id context-pack:<opaque-id> \
  --context-pack-digest sha256:<digest> \
  --source-ref session:<opaque-id> \
  --source-digest sha256:<digest> --json
```

`capture-output` is a two-step operation. Its default mode is a mutation-free
preview. Re-run it with `--confirm --operation-id <preview-operation-id>` to
write the durable registration, derived index entry, and receipt. Registration
records exact minimized lineage but never promotes generated text into the wiki
or line memory; proposed knowledge must pass the independent review workflow.

`ingest` is also preview-first. Exact confirmation copies a project-local
regular file into the wiki's immutable, digest-addressed raw area and writes an
idempotent provenance receipt without changing the source. Transcript formats
route to sessions; other supported documents/media route to llm-wiki through
the existing `memory-ingest` workflow. Raw registration never promotes claims.

`review` reads a bounded queue of pending candidates plus contradiction, stale
fact, orphan page, unlinked output, and canonical-context review signals without
returning evidence bodies or raw assertions. `maintain` also starts in preview mode and binds its
operation ID to the current line-memory, wiki, output-outbox, and review state.
Confirming the exact preview replays idempotent output registrations and writes
a restart-safe receipt. Wiki refresh, line-memory repair, and candidate choices
remain delegated actions so their own review and authority checks stay intact.

`context` combines relevant line facts with linked wiki pages under hard total,
tier, and citation character budgets. It prefers a materialized Fortemi Core
project graph and degrades to a bounded lexical wiki scan. Every selected item
is marked as quoted data and carries a locator, digest, backend, lifecycle
state, freshness, and verification status. Normal use touches only selected
line facts; `--no-touch` is a mutation-free inspection.

`update` writes only the provider-neutral canonical context contract under
`.aiwg/context/compound-memory/`. Its default is a readable/JSON preview with
the exact diff and conflicts. Confirmation requires the preview operation ID.
Every accepted change emits a receipt and retains provenance, review metadata,
supersession, and revocation history. `--export` produces a portable bundle;
`--import <file>` requires matching workspace identity unless
`--allow-cross-workspace` is explicitly supplied. Provider adapters are never
generated or modified by this command.

See [docs/overview.md](docs/overview.md) and the `compound-memory` driver skill.
The addon adds orchestration only; disabling it leaves the underlying wiki and
line-memory data independently usable.
