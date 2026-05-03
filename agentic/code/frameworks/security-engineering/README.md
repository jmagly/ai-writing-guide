# Security Engineering

**Status**: Scaffolding (v0.1.0) — skills, agents, rules, and templates are tracked as Gitea issues under the `security-engineering-v1` milestone.

Applied-security framework for the design-time decisions that web-app threat modeling and CVE scanning don't catch: cryptographic primitive selection, chain-of-trust integrity, authentication-factor architecture, degraded-mode behavior, runtime secret hygiene, supply-chain trust, and physical-access threats.

## Why this exists

AIWG's existing security coverage (`sdlc-complete/agents/security-architect`, `security-auditor`, `security-gatekeeper`) is strong on **application-layer threats** — STRIDE on networked services, OWASP Top 10, CVE scanning, secrets-in-repo. It is silent on **applied-cryptography review** and **chain-of-trust integrity**, which is where most "we shipped insecure" outcomes actually happen.

This framework was scoped after a real-world gap analysis: a pre-production review of a hardware-backed offline secrets system surfaced four blockers and seven highs that no STRIDE/OWASP pass would have caught. They clustered into seven design-time pattern categories, all of which this framework addresses.

## Boundary with `sdlc-complete`

| This framework owns | `sdlc-complete` continues to own |
|---|---|
| Cryptographic primitive selection (AEAD, KDF, MAC, signature) | STRIDE threat modeling at system altitude |
| Chain-of-trust / bootstrap integrity | OWASP Top 10, CVE scanning, secrets-in-repo |
| Authentication factor architecture (have/know/are mapping) | Phase-gate compliance and control coverage |
| Degraded-mode (fail-closed vs fail-open) design | SAST/DAST tool execution |
| Runtime secret handling (fd passing, scratch surface, error paths) | Vulnerability management plan |
| Supply-chain trust beyond CVE scanning | SBOM generation |
| Physical-access threat modeling | Networked-service threat scenarios |

When the new agents land, the existing `security-architect` and `security-auditor` will be narrowed to delegate primitive-level review and chain-of-trust review to the applied agents (per the `god-session` rule).

## Catalog format

Skills that name tools/libraries follow a three-part pattern:

1. **Suggested default** with rationale (e.g., "AEAD: prefer `XChaCha20-Poly1305` via libsodium for new code in unconstrained environments — misuse-resistant nonces, audited C implementation, broad language bindings").
2. **Vetted alternatives menu** with selection criteria (e.g., when to choose AES-GCM, when to choose RustCrypto's `aes-gcm-siv`, when BoringSSL is the right call).
3. **Research path** for finding a better/newer fit (which RFCs, which audit reports, which standards bodies, what to grep in dependency manifests).

Skills never hard-pick a vendor product (no Keycloak/OpenBao/specific HSM models). They describe properties and patterns; the operator chooses the product against their constraints.

## Planned scope (Tier 1 + Tier 2)

### Tier 1 — highest leverage

- **Skill**: `crypto-primitive-selection` — AEAD/KDF/MAC/signature decision tree; anti-patterns (CBC-without-MAC, ad-hoc KDF, key reuse, PBKDF2-on-high-entropy, `openssl enc` without explicit flags)
- **Skill**: `chain-of-trust-design` — signed bootstrap, measured boot, "verify the verifier"
- **Agent**: `applied-cryptographer` — narrow primitive-choice review
- **Rule**: `no-unauthenticated-encryption`
- **Rule**: `no-key-reuse-across-purposes`
- **Rule**: `no-adhoc-kdf`
- **Rule**: `crypto-flag-verification`
- **Template**: `cryptographic-decisions.md`
- **Template**: `chain-of-trust-design.md`

### Tier 2 — completes the gap

- **Skill**: `auth-factor-design`
- **Skill**: `degraded-mode-design`
- **Skill**: `secret-handling-runtime`
- **Skill**: `supply-chain-trust`
- **Skill**: `physical-threat-modeling`
- **Agent**: `secure-bootstrap-reviewer`
- **Template**: `factor-design-rationale.md`
- **Template**: `degraded-mode-matrix.md`
- **Template**: `physical-threat-scenarios.md`
- **Extension**: `sdlc-complete/templates/security/threat-model-template.md` — physical-access and trusted-host sections

### Narrowing pass

- Audit + narrow `sdlc-complete/agents/security-architect.md` (delegate primitive review)
- Audit + narrow `sdlc-complete/agents/security-auditor.md` (delegate chain-of-trust review)

## Quick start

```bash
# Once skills are implemented:
aiwg use security-engineering

# Run an applied-crypto review on a design doc
"applied crypto review of .aiwg/architecture/secrets-design.md"

# Generate a cryptographic decision record
"record crypto decision: AEAD selection for at-rest backup encryption"
```

## Standards referenced

NIST SP 800-57, 800-63B, 800-108, 800-208 · RFC 5869 (HKDF), 9106 (Argon2), 8446 (TLS 1.3) · OWASP ASVS 4.0, Cryptographic Storage Cheat Sheet · FIPS 140-3.

## Tracking

- Epic and milestone: `security-engineering-v1` on the `origin` Gitea remote
- Source motivation: `~/SECURITY-REVIEW-RESPONSE.md` (local gap analysis, 2026-05-03)
