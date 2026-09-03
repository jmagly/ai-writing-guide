# Dataset task guide

This guide starts from a user outcome. It does not assume that the user knows
which schema, adapter, index, or provenance vocabulary to choose.

## Delivery status

The dataset contracts, source-adapter SDK, projections, declarative addon, and
thirteen-action orchestration CLI are shipped. Local JSONL and CSV adapters are
stable; local orchestration, offline, provenance, and standards cells are
qualified. Pre-stable migration, Fortemi Core parity, and live Fortemi Server
persistence remain pending for the reasons in [support status](#support-status).
The aggregate conformance receipt therefore reports `stableEligible: false`.

| Task | Required evidence | Safe outcome |
|---|---|---|
| Source | locator, policy, credential locator, adapter version | immutable source definition; no secret value |
| Check | bounded connectivity and schema evidence | diagnostics without durable writes |
| Preview | explicit record/byte limits and redaction | representative, non-authoritative sample |
| Plan | source revision, schemas, reads/writes, degradation | immutable digest for human review |
| Ingest | approved digest and idempotency key | receipt, rejections, and checkpoint reference |
| Monitor | run identity and backend capability evidence | state report; polling never grants authority |
| Verify | canonical revision, artifact digests, receipts | verified, degraded, unverifiable, or failed |
| Query | bounded result count and privacy policy | results with revision and evidence references |
| Trace | assertion basis, evidence locator, confidence | lineage without upgrading inference to fact |
| Export | named versioned profile | portable output plus mapping/loss report |
| Resume | committed checkpoint and unchanged plan binding | a new attempt, never silent replay |
| Retire | complete inventory, holds, threshold and rollback | tombstones/reconciliation before deletion |

The exact CLI mappings are: monitor → `status` and `show`; trace → `lineage`;
resume → `retry`; retirement preparation → `plan`, inspection, and `cancel` as
needed. There is no `monitor`, `trace`, `resume`, or `retire` CLI action.

## Exact CLI surface

```bash
aiwg dataset source --file source.json --json
aiwg dataset check source:example --json
aiwg dataset preview source:example --count 10 --offline --json
aiwg dataset plan --file plan-input.json --json
aiwg dataset ingest plan:example --digest <sha256> --idempotency-key <key> --approve <approval-id> --json
aiwg dataset status run:example --json
aiwg dataset show run:example --json
aiwg dataset verify run:example --json
aiwg dataset query dataset:example --json
aiwg dataset lineage dataset:example --json
aiwg dataset export dataset:example --json
aiwg dataset cancel run:example --json
aiwg dataset retry run:example --json
```

`source` and `plan` require JSON input files. `ingest` binds the exact plan
digest and idempotency key; reconciliation additionally uses
`--reconciliation-digest` and `--reconciliation-threshold`. Every action can
emit the `aiwg.dataset-orchestration/v1` envelope with `--json`.

## Support status

| Evidence cell | Status | Claim boundary |
|---|---|---|
| local JSONL and CSV real sources | stable | bounded reference adapters only |
| local plan/replay/checkpoint/security/offline/provenance/standards | qualified | checked-in deterministic fixtures; not live-server evidence |
| pre-stable migration | pending | no stable predecessor exists |
| Fortemi Core parity | pending | requires a pinned compatible Fortemi dependency |
| Fortemi Server live persistence | pending | requires explicit live authorization and cross-repository receipt |

Nine cells pass and three remain pending; the aggregate release gate is not
stable-eligible while any required pending evidence remains unresolved.

## Default routing

Start with the `dataset-intelligence` skill. It delegates assessment to the
bounded addon skills, which in turn may only delegate operations to `aiwg
dataset`. Agents and skills never open a connector, mutate a checkpoint, write
an index, or delete data themselves.

Before a write, verify the source revision and schema, inspect the exact plan
digest, and confirm privacy, locality, network, retention, and expected writes.
After a write, retain the receipt and rejection report. Search success is not
verification.

## Terms that must remain distinct

- A **canonical source** is the authoritative input selected by policy.
- An **immutable revision** binds that input to identity and digest evidence.
- A **derived artifact** is produced from a revision and may not be reversible.
- A **regenerable index** can be rebuilt from available canonical inputs.
- A **static cache** answers reads but is neither canonical nor live storage.
- A **portable export** is a versioned projection with an explicit loss report.

See [offline and troubleshooting](offline-troubleshooting.md) for diagnostics
and [migration](migration-guide.md) before changing an existing workflow. Use
the [standards profile matrix](https://github.com/jmagly/aiwg/blob/main/docs/dataset/standards-profiles.md) to
distinguish tested profiles from descriptor-only plans.
