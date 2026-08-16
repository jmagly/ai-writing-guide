# Cross-asset artifact verification

`aiwg verify` implements the accepted DSSE + in-toto contract for setup
manifests, provider output, packages, schemas, bundles, and other AIWG assets.
It verifies the exact artifact bytes and the exact decoded DSSE payload bytes;
it never reparses and reserializes the payload before signature verification.

## Verify an artifact

```bash
aiwg verify provider.yaml \
  --attestation provider.yaml.aiwg-attestation.json \
  --policy artifact-trust-root.json \
  --state .aiwg/security/artifact-trust-state.json \
  --json
```

The first trusted root must be bootstrapped with a SHA-256 fingerprint obtained
through an independent channel:

```bash
aiwg verify trust bootstrap \
  --root artifact-trust-root.json \
  --fingerprint <64-lowercase-hex-digits>
```

Use `--material '<signed-uri>=<local-file>'` for every derivation material the
policy requires and for detached Sigstore bundles. Detached material is accepted
only when its byte length and SHA-256 match the descriptor. `--offline` rejects network locations and requires persisted
trust/freshness state plus portable verification material. Remote inputs are
HTTPS-only, size limited, and fail closed after redirects.

Unsigned exemptions additionally require caller-supplied `--asset-type`,
`--namespace`, and `--channel`; the verifier never grants an exemption from
claims inside an unsigned payload. The same flags bind a signed payload to an
expected scope when supplied.

The public API exports `verifyArtifact()`, the stable result/status types, and
trust-root bootstrap/update helpers from the `aiwg` package. API callers supply
bytes directly, which avoids hidden text encoding or line-ending changes.

## Stable outcomes

| Status | Exit | Meaning |
|---|---:|---|
| `verified` | 0 | Signature, policy, bytes, materials, and freshness passed |
| `policy-exempt` | 20 | Explicit exemption for a non-executable asset |
| `unsigned` | 21 | A required signature is absent |
| `unknown-signer` | 22 | No trust-root identity authenticated the DSSE signature |
| `expired` | 23 | Root or attestation is outside its validity window |
| `revoked` | 24 | The signer is revoked for this scope/time |
| `stale` | 25 | Clock, rollback, replay, freeze, or fast-forward check failed |
| `mismatched` | 26 | Signature, exact subject bytes, material, or bound state differs |
| `malformed` | 27 | Input does not satisfy the protocol shape |
| `offline-evidence-missing` | 28 | Required portable evidence/state is absent |
| `policy-denied` | 29 | Evidence is valid but not authorized by policy |

`--allow-policy-exempt` changes only the process exit for status 20 to zero;
JSON still reports `policy-exempt` and its stable exit code. No execution or
provider-context asset can use that exemption.

## Trust and limitations

DSSE `keyid`, embedded public keys, and all other outer metadata are hints or
transport only. Authority comes from the versioned trust root. Public-key
profiles support Ed25519, ECDSA P-256/SHA-256, and RSA-PSS/SHA-256. Sigstore
profiles use an explicit embedded trusted root, certificate identity/issuer
policy, and configured transparency-log, certificate-log, and timestamp
thresholds; offline Sigstore verification requires a complete bundle.

A `verified` result proves integrity, authorized origin, and freshness under
the selected policy. It does not prove that content is safe, correct, or free
of malicious behavior. Existing release-specific signature gates remain in
force while producers migrate to cross-asset sidecars.
