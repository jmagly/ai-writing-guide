---
name: security-engineering-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Security-engineering framework quick reference — applied crypto, chain-of-trust, auth factors, degraded modes, supply-chain trust, and physical-threat modeling
---

# Security Engineering Framework — Quick Reference

You are operating in a project that has the AIWG **security-engineering** framework installed. This skill is your always-loaded directory for applied security decision-aids. The framework's catalog is reachable through the AIWG artifact index.

## What this framework is for

**Decision-aid skills for applied security**, distinct from the SDLC framework's broader security review (`flow-security-review-cycle`). Each skill in this framework forces explicit reasoning about a narrow class of security decisions — primitive selection, trust chains, factor architecture, fail-safe behavior — and identifies anti-patterns the operator should reject before implementation.

This is **not** a vulnerability scanner or pen-test framework. It is a thinking-discipline framework for the cryptographic and trust-boundary decisions that get baked into a system early and become hard to change.

## When to reach for which skill

| Decision being made | Skill |
|---|---|
| Choosing AEAD / KDF / MAC / signature algorithms | `crypto-primitive-selection` |
| Designing the boot/bootstrap verification chain | `chain-of-trust-design` |
| Architecting authentication factors (have/know/are) | `auth-factor-design` |
| Fail-closed vs fail-open behavior matrices | `degraded-mode-design` |
| Supply-chain trust beyond CVE/SBOM | `supply-chain-trust` |
| Runtime secret hygiene (fd passing, scratch surfaces) | `secret-handling-runtime` |
| Threat modeling physical-access classes | `physical-threat-modeling` |

This framework ships **7 skills**. Each is self-contained — invoke the one matching the decision being made.

## Anti-patterns each skill rejects

| Skill | Anti-patterns it identifies |
|---|---|
| `crypto-primitive-selection` | CBC-without-MAC, ad-hoc KDF, key reuse across purposes, PBKDF2 on high-entropy input, openssl enc without explicit flags |
| `chain-of-trust-design` | Circular trust roots, signing-key custody confusion, missing measured-boot anchors |
| `auth-factor-design` | Python deps in PRF hot paths, missing coercion-resistance analysis, FIDO2 PIN/UV policy gaps |
| `degraded-mode-design` | "Type Y to override" prompts, missing degraded-mode matrix, fail-open by accident |
| `supply-chain-trust` | Dependency pinning by version (not hash), reproducible-build gaps, firmware version-not-locked |
| `secret-handling-runtime` | SECRETS_ENV aggregation, missing scratch-surface verification, identifier reuse for secrets and logs |
| `physical-threat-modeling` | Threats STRIDE/OWASP miss: evil-maid, DMA, hostile peripheral, travel-host, coercion, cold-boot, supply-chain implant, side-channel |

## When to use this framework vs the SDLC security flow

| Use this framework | Use `flow-security-review-cycle` (SDLC) |
|---|---|
| Deciding the *primitive* (which AEAD?) | Reviewing whether the *implementation* uses any AEAD correctly |
| Designing the boot chain | Threat-modeling the application boundary |
| Picking an MFA scheme | Auditing existing auth code |
| Defining degraded-mode behavior | Vulnerability scan + STRIDE on a feature |

The SDLC's `flow-security-review-cycle` is the broader periodic audit. The skills here are pinpoint decision aids — invoke them when the decision is being made, not after.

## Rules deployed

This framework ships 4 applied-cryptography rules into the rules index:

- `no-unauthenticated-encryption` — block CBC/CTR without a MAC
- `no-key-reuse-across-purposes` — separate keys for distinct purposes
- `no-adhoc-kdf` — use a vetted KDF, not hash-of-password
- `crypto-flag-verification` — require explicit flags on `openssl enc` and equivalents

These deploy to `.claude/rules/` and are enforced via the rules-index pipeline.

## Finding the right skill when this quickref doesn't list it

```bash
aiwg index discover "<security decision phrase>"
```

For asks outside the seven listed skills (e.g., "audit a TLS config", "review a JWT implementation"), the SDLC framework's `flow-security-review-cycle` and the broader index are the right surfaces. This framework is decision-time, not audit-time.

## Common multi-skill flows

- **New crypto feature**: `crypto-primitive-selection` → `secret-handling-runtime` → review with `flow-security-review-cycle` (SDLC) once implemented
- **Boot/firmware design**: `chain-of-trust-design` → `supply-chain-trust` → physical threat sweep with `physical-threat-modeling`
- **MFA system design**: `auth-factor-design` → `degraded-mode-design` (lockout / recovery)

## Don't list from this skill — query the index

If a user asks "what security skills are available?", **do not enumerate from memory**. Run `aiwg index discover --type skill --graph framework "security"`. This skill exists to orient.
