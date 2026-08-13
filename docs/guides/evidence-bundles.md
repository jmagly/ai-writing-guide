# Portable Evaluation Evidence Bundles

`aiwg evidence` packages local evaluation artifacts into a portable, self-describing directory and verifies its integrity. It is intended for review handoffs, regression records, and reproducible local evaluation—not as an enterprise evidence service.

## Export a complete bundle

```bash
aiwg evidence export \
  --output ./evidence/run-2026-08-13 \
  --activity-export ./activity-export.json \
  --report ./report.json \
  --source ./src/evaluator.ts \
  --eval-config ./eval.yaml \
  --provenance ./provenance.json \
  --model-version evaluator=model-v1 \
  --tool-version harness=2.4.0
```

The output contains copied members plus `evidence-manifest.json`. Each member records its role, portable source name, byte size, and SHA-256 digest. The manifest also records model and tool versions and a deterministic checkpoint over the sorted member hashes. Keep or publish the printed checkpoint separately when the verifier must detect coordinated edits to both a member and its manifest.

An activity export is complete only when it supplies:

- coverage label or coverage layers;
- sequence gaps, durable-loss state, and dropped-event count;
- stale collectors and clock uncertainty;
- redaction status and restricted-content grant labels; and
- the signed export key ID and Merkle root.

Missing fields produce an `incomplete` manifest with explicit reasons. Raw prompts, terminal content, environment values, credentials, secrets, and other restricted-content fields are rejected before being copied. `restricted_content_grants` is metadata only; it does not allow the local utility to package restricted content.

## Verify a bundle

```bash
aiwg evidence verify ./evidence/run-2026-08-13
aiwg evidence verify ./evidence/run-2026-08-13 --expected-root <sha256>
```

Verification fails for missing, changed, malformed, path-escaping, duplicate, or undeclared members. `--expected-root` additionally compares the computed checkpoint with a value retained outside the bundle.

## Record a sandbox evaluation that could not run

When the live sandbox capability is unavailable, emit an explicit record instead of implying that the evaluation passed:

```bash
aiwg evidence export \
  --output ./evidence/sandbox-not-run \
  --check-only \
  --not-run "sandbox runtime unavailable"
```

The resulting manifest has status `not-run`, preserves the reason, and remains verifiable. Signed activity evidence can be obtained through the `sandbox-activity-export` MCP tool and passed to `--activity-export`; that tool requires explicit confirmation because exporting evidence can disclose metadata.

## Local utility and enterprise boundary

The public local utility copies caller-selected files, applies a conservative restricted-content check to activity JSON, records completeness, and verifies hashes. It does not upload evidence, manage retention, validate organizational grant policy, provide remote signing or timestamping, or operate a multi-tenant evidence store.

Those capabilities—central retention, policy-aware redaction, grant authorization, external trust anchors, access audit, and fleet-wide evidence search—are enterprise candidates and are intentionally outside this command's contract.
