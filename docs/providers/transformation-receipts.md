# Provider Transformation Receipts

Provider directories such as `.agents`, `.claude`, and `.codex` are generated
projections. They are never publication authorities. Canonical packaged AIWG
implementations remain below `agentic/code`; verified project-local or external
bundles retain their own source identity.

AIWG records provider transformation evidence under the local control root:

```text
.aiwg/receipts/providers/<provider>.<project|user>.json
```

Each `aiwg.provider-transformation-receipt.v1` document binds a verified source
subject and digest, provider and scope, transformer and provider-adapter
contract versions, and the SHA-256 and byte length of every recorded output.
For bundled AIWG sources, the trust handoff is the existing signature-verified
web release manifest: every regular file below the canonical bundle root must
match its exact signed `raw/` descriptor before AIWG derives the bundle-inventory
subject. Matching only `manifest.json`, a registry hash, or provider output is
not sufficient authentication. Cached signed release metadata supports the same
check offline after the first authenticated resolution.
Output paths are forward-slash relative paths. Receipts must not contain home
directories, usernames, hostnames, credentials, environment values, or other
machine-local identifiers. In split-root projects the receipt stays with local
control state while its output paths resolve against the configured output
root; an attached external corpus is not copied or rewritten.

## Drift diagnoses

`aiwg doctor --deployment` and `aiwg status --probe --json` use the same
classifier:

- `source-verification-failure` — the canonical source no longer satisfies its
  trust policy. Do not regenerate from it.
- `transformation-mismatch` — the active transformer or provider-adapter
  contract differs from the receipt. Regenerate after reviewing the adapter
  change.
- `user-modification` — a receipt-owned output exists but its exact bytes have
  changed. Back it up before replacing it.
- `stale-output` — the source changed, an expected output is absent, or a
  deployment completed only partially.
- `missing-receipt` — legacy or incomplete deployment evidence is unavailable.
  Run a verified regeneration to establish a receipt; absence is not proof of
  tampering.

## Safe recovery

1. Run `aiwg doctor --deployment --json` and preserve its evidence.
2. Back up any path classified `user-modification` if the change is wanted.
3. Reverify the canonical source. Never use a provider-root copy as the source.
4. Run the normal `aiwg use <bundle> --provider <provider>` regeneration.
5. Rerun doctor and confirm the receipt and output inventory verify.

Cleanup and regeneration may replace or remove only receipt-owned paths (or
legacy paths with an explicit AIWG managed marker during migration). They must
preserve unreceipted provider content, project control files, `.aiwg-location`,
external corpus attachments, and operator-authored sections in shared context
files. Never recover by deleting an entire provider root.

Idempotent regeneration preserves the existing receipt bytes when source,
transformer, and output evidence are unchanged.
