# Fortemi Live Dataset UAT Plan

**Issue:** [AIWG #2242](https://git.integrolabs.net/roctinam/aiwg/issues/2242)

**Baseline:** [AIWG #2194](https://git.integrolabs.net/roctinam/aiwg/issues/2194)

**Status:** Planned; execution not started

**Scope:** Community live Fortemi dataset behavior only

## Purpose and boundary

This plan validates the Community `aiwg dataset` control plane against an approved live Fortemi service. It exercises the contracts delivered by [#2235](https://git.integrolabs.net/roctinam/aiwg/issues/2235), [#2236](https://git.integrolabs.net/roctinam/aiwg/issues/2236), [#2237](https://git.integrolabs.net/roctinam/aiwg/issues/2237), and [#2238](https://git.integrolabs.net/roctinam/aiwg/issues/2238), using the qualification and receipt controls established by #2194.

Tenant/RLS certification, restart or fault injection, backup/restore, full migration execution, and bounded load certification are Enterprise concerns and are excluded. This plan must not be used to authorize those activities.

## Entry criteria

- The tested AIWG revision, package lock, Fortemi server version, schema catalog, conformance manifest, and fixture digests are recorded before execution.
- The operator has an approved live-test window and an isolated disposable namespace.
- Read-only qualification is the default. Any mutation uses a separately recorded, digest-bound authorization and the workflow's explicit write gate.
- Storage qualification evidence is directed to `AIWG_STORAGE_EVIDENCE_DIR`; dataset preflight evidence is directed to `AIWG_DATASET_EVIDENCE_DIR`. Receipts must pass verification and sanitization before publication.
- Stop conditions, cleanup ownership, and the maximum permitted records/bytes/duration are recorded.
- No endpoint, authorization material, tenant identity, infrastructure topology, or raw service log may enter a receipt, console transcript, or public issue comment.

## Evidence contract

Each executed case records a case ID, UTC window, AIWG commit/ref, Fortemi version, applicable schema and fixture digests, command/action, expected and observed outcome, receipt reference, cleanup result, and pass/fail/pending status. Secrets and raw locators are replaced by approved fingerprints. A skipped or unavailable live cell is `pending`, never `pass`.

## UAT matrix

### UAT-LIVE-01 — Smoke and protocol negotiation

- Run the existing read-only live qualification entry point: `npm run test:fortemi:live`.
- Confirm initialization identifies a compatible server version and negotiated capabilities.
- Confirm read/list/search probes remain bounded and produce no retained record when the write gate is false.
- Accept only when a sanitized `aiwg.fortemi-live-qualification-receipt/v1` receipt is durably written and validates.

### UAT-LIVE-02 — Live dataset conformance

- Run `npm run qualify:dataset:fortemi-live` first. An absent or drifted dataset execution contract is `pending` and exits 2 without invoking any Fortemi tool.
- Register a synthetic source through `aiwg dataset source --file <approved-source-file> --json`.
- Exercise bounded `check` and `preview`; verify source identity, format, schema recommendation, capability requirements, and explicit degradation.
- Create an immutable plan, then—only with separate mutation authorization—ingest the plan using its exact digest, idempotency key, and approval identifier.
- Verify `status`, `show`, `verify`, and `query` against the resulting stable references.
- Repeat the identical authorized request and confirm replay does not duplicate effects; conflicting idempotency reuse must fail distinctly.

### UAT-LIVE-03 — CLI orchestration

- Verify `aiwg dataset --help` exposes the canonical 13 actions: `source`, `check`, `preview`, `plan`, `ingest`, `status`, `show`, `verify`, `query`, `lineage`, `export`, `cancel`, and `retry`.
- Confirm JSON output is machine-readable and stable references flow from source to plan, run, dataset, receipt, and exported artifact.
- Confirm an unknown action, malformed reference, missing required digest, and unapproved mutation fail closed with actionable diagnostics.
- Confirm addon agents, skills, commands, and flows delegate to `aiwg dataset`; no shadow runtime or service API is accepted.

### UAT-LIVE-04 — Schema and digest integrity

- Validate source, plan, run/checkpoint, receipt, provenance, and export objects against their cataloged schemas.
- Recompute all advertised SHA-256 digests and compare them with the bound values.
- Change one plan field after approval and confirm execution is rejected for digest mismatch.
- Change one receipt or fixture field and confirm verification rejects tampered evidence without advancing maturity.

### UAT-LIVE-05 — Standards profiles

- Exercise each maturity-eligible standards profile declared by the live capability descriptor.
- Validate the external document, mapping coverage, round-trip result, and explicit loss report.
- Confirm unsupported required profile capabilities fail closed; optional degradation remains visible in the plan and receipt.
- Do not claim profile conformance for a mock-only or pending live cell.

### UAT-LIVE-06 — Ledger and provenance

- Query `lineage` for a dataset and representative record produced by the authorized run.
- Trace source revision, run, principal fingerprint, adapter, configuration/transform digest, checkpoint, validation result, and derived artifacts.
- Confirm ledger ordering and identifiers are deterministic and that evidence-bearing relationships are not flattened.
- Confirm exported provenance refers to the same logical identities and digests returned by `show` and `verify`.

### UAT-LIVE-07 — Negative and tamper controls

- Submit wrong-source, wrong-schema, stale, corrupt, and wrong-pipeline checkpoint fixtures and require distinct failures.
- Exercise malformed record, duplicate, same-cursor tie, late record, tombstone, and capability-downgrade fixtures within declared limits.
- Verify traversal, redirect, symlink, resource-exhaustion, digest-substitution, and prohibited-disclosure cases fail safely using controlled fixtures only.
- Verify receipt mutation, stale evidence, revision mismatch, and weakened required cells prevent qualification.
- Do not perform uncontrolled network probing or any Enterprise fault/restart scenario.

### UAT-LIVE-08 — Cleanup and reconciliation

- With the same mutation authorization, retire or remove only objects created in the disposable namespace and verify the cleanup plan digest before execution.
- Confirm all created source, plan, run, dataset, checkpoint, and export references are reconciled.
- Confirm repeated cleanup is idempotent and cannot affect objects outside the declared namespace.
- Record cleanup status in the durable receipt; unresolved residue fails UAT and is escalated privately to the operator.

## Execution order and gates

1. Record the immutable test baseline and run UAT-LIVE-01 read-only.
2. Complete UAT-LIVE-03 and UAT-LIVE-04 negative preflights before permitting writes.
3. Obtain mutation authorization bound to the reviewed plan digest.
4. Run UAT-LIVE-02, UAT-LIVE-05, and UAT-LIVE-06 against the bounded synthetic corpus.
5. Run controlled UAT-LIVE-07 cases that do not require Enterprise infrastructure controls.
6. Run UAT-LIVE-08 cleanup and reconcile every created reference.
7. Validate and sanitize receipts, then post only aggregate evidence to #2242.

Stop immediately on isolation ambiguity, unexpected mutation, digest mismatch, evidence leakage, cleanup escape, server saturation, or an exceeded resource limit. Preserve the sanitized receipt and mark remaining cells blocked or pending; do not improvise recovery or destructive cleanup.

## Exit criteria

- All applicable Community live cells pass; unavailable cells are explicitly pending with reasons.
- Schema, digest, CLI, standards, replay, ledger, provenance, tamper, and cleanup assertions have durable receipt evidence.
- Cleanup reconciliation reports no unexplained residue.
- The receipt is bound to exact revisions, schema/fixture digests, and test outcome and passes sanitization review.
- No Enterprise category was exercised or claimed.

## Result record

Execution will append a separate dated result artifact. This planning commit intentionally contains no live endpoint, authorization material, execution output, or claimed test result.
