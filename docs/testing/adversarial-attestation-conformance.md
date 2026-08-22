# Adversarial attestation conformance

The mandatory #2092 gate runs one production-verifier matrix across file,
HTTPS/web-resource, release sidecar, marketplace/Fortemi, OCI referrer, and
provider-transformation receipt representations. Equivalent evidence must
produce the same stable verification status on every transport.

Run the gate locally with:

```bash
npm run test:security:attestation-conformance
```

## Fixture provenance

[`test/fixtures/security/generate-adversarial-attestation-conformance.mjs`](../../test/fixtures/security/generate-adversarial-attestation-conformance.mjs)
derives three Ed25519 authorities from fixed SHA-256 seed labels containing
`TEST ONLY`. The generated trust root also names its policy `TEST ONLY`, marks
release use as `forbidden`, and exists only under `test/fixtures/security/`.
Release publishers never read this path or these seed labels.

The generator fixes timestamps and canonical serialization, so identical
source produces identical fixture bytes. Regenerate with:

```bash
node test/fixtures/security/generate-adversarial-attestation-conformance.mjs
git diff --exit-code -- test/fixtures/security/adversarial-attestation-conformance-v1.json
```

CI runs exactly those commands before the matrix. Drift therefore fails the
gate until the generated fixture and generator are reviewed together.

The portable evidence object is deliberately a test bundle: it records the
DSSE payload binding and exercises offline carriage without claiming to be a
public Sigstore transparency-log entry. Production Sigstore parsing and policy
thresholds remain covered by `test/unit/security/artifact-sigstore-profile.test.ts`.

## Required outcomes

The matrix includes valid two-independent-signature threshold and offline
verification, plus tampering, LF/CRLF mutation, noncanonical reserialization,
replay, rollback, freeze, fast-forward rejection and recovery, mix-and-match,
unknown signer, expiry, revocation, retroactive compromise, dependency
substitution, changed provider output, and missing offline evidence.

Unsigned legacy evidence remains `unsigned`. Only a trust-root-authenticated,
explicit policy exemption for a non-executable asset returns `policy-exempt`.
No generic insecure input is part of the verifier contract, and compatibility
handling cannot convert a negative cryptographic result to `verified`.
