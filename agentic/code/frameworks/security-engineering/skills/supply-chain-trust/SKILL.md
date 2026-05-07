---
namespace: aiwg
name: supply-chain-trust
platforms: [all]
description: Decision aid for supply-chain trust beyond CVE/SBOM — pinning depth, reproducible builds, snapshot pins, firmware locking, and vendor+hash-lock for critical-path deps.

---

# supply-chain-trust

Decision aid for verifying that the code you ship is the code you think you're shipping. Use when designing or reviewing systems whose threat model includes supply-chain compromise (build host, dependency mirror, package registry, firmware) — which is most production systems in 2026.

The skill is distinct from `sdlc-complete`'s SBOM and CVE-scanning capabilities. SBOM tells you **what is there**. CVE scanning tells you **what is known-broken**. This skill answers **"can I prove that what I shipped is what I expected, end-to-end"** — which neither of the others does.

## Triggers

- "reproducible build"
- "snapshot pinning" / "snapshot.debian.org"
- "vendor wheels" / "hash-locked deps"
- "firmware version" / "firmware pinning"
- "in-toto" / "SLSA"
- "transparency log" / "Sigstore"
- "build host compromise"
- "supply chain attack"

## When NOT to use this skill

- Pure CVE scanning of declared dependencies (use `sdlc-complete/skills/security-audit`)
- SBOM generation (use existing SBOM tooling — CycloneDX, SPDX)
- License compliance (out of scope; use a license scanner)

---

## Section 1: The four layers of supply-chain trust

```
Layer 4: Hardware / firmware
            ↑ (does the chip do what it says?)
Layer 3: Build environment
            ↑ (was the binary produced from the source we think?)
Layer 2: Source dependencies
            ↑ (did we get the source we expected?)
Layer 1: Source we wrote
            ↑ (we can audit this)
```

Each layer has its own attack surface and its own mitigations:

| Layer | Attack | Mitigation |
|---|---|---|
| 1 (own source) | malicious commit by insider | code review, signed commits, branch protection |
| 2 (deps) | typosquat, compromised maintainer, malicious update | pinning + hash-lock + vendoring; transparency logs |
| 3 (build) | compromised CI, build host malware | reproducible builds, signed-and-attested artifacts (in-toto, SLSA) |
| 4 (hardware) | malicious firmware, supply-chain implant | measured boot, vendor diversity, audit |

A system is only as trustworthy as the weakest layer in the chain it actually depends on.

---

## Section 2: Dependency pinning — beyond `requirements.txt`

### Suggested default: full hash-locked dependency manifests

For each language ecosystem:

| Ecosystem | Default tool | What it produces |
|---|---|---|
| Python | `pip-tools` (`pip-compile --generate-hashes`) → `requirements.txt` with hashes | `package==1.2.3 --hash=sha256:abc...` per dep, including transitive |
| Node | `npm ci` against `package-lock.json` (with `integrity` field), or `pnpm` | per-package SHA-512 integrity |
| Rust | `cargo` lock file (`Cargo.lock`) — versions only; for hashes use `cargo vet` |
| Go | `go.mod` + `go.sum` (per-module SHA-256) |
| Ruby | `Bundler` lockfile + `bundle config set --local frozen true` |
| Maven/Gradle | `dependency:resolve-plugin` with checksum verification |

**Required**: every dependency, including transitive, must have a hash in your lockfile. If a tool can't produce hashed locks, vendor the dep.

### Vendoring critical-path deps

For dependencies in security-sensitive paths (auth, crypto, key handling), go further than hash-locking — **vendor** them:

```
your-repo/
  vendor/
    python-fido2-1.1.3/        # checked-in source of the dep
    cryptography-41.0.7/        # ditto
    ...
  Cargo.toml or pyproject.toml  # references vendor/ paths, not registry
```

Why vendoring on top of hash-locking:

- Hash-locking verifies you got the bytes you expected; vendoring lets you AUDIT those bytes
- A compromised registry could publish a new "version" with a malicious patch; you control what's in `vendor/`
- Reduces transitive surface — you can prune deps that you don't actually use

Cost: you own update cadence. Acceptable for security-critical paths; impractical for everything.

### Anti-pattern: SHA-verified `.deb` whose SHA came from poisoned `apt` repo (review M10)

Original: bootstrap verifies SHA-256 of each downloaded `.deb`, but the SHA-256 manifest itself comes from `apt-cache` against the build-time `apt` repo.

What this skill flags: the verification is **circular within the same trust domain**. If `apt` is compromised, the manifest is compromised, the SHAs are compromised, all three layers verify a poisoned package.

Remediation:

- **Pin to `snapshot.debian.org`** URLs with a specific timestamp (`http://snapshot.debian.org/archive/debian/20260301T000000Z/`) — content-addressed, immutable
- **Verify signed Debian `Release` file** with explicit Debian archive signing keys, ground-truth at the timestamp
- **Pin transitive `.deb` URLs** discovered at that timestamp; commit the resulting SHA manifest to your **signed** git repo

The hash of the package must come from a **separately-trusted channel** than the package itself.

---

## Section 3: Reproducible builds

### What it gives you

A reproducible build means: given the same source, the same build environment, and the same build inputs, **any builder produces a byte-for-byte identical output**. This lets you:

- Verify a third-party-built binary against your own rebuild
- Detect compromised CI by comparing CI output to your local rebuild
- Allow others to verify your published artifacts by rebuilding from source

### Suggested defaults

| Use case | Approach |
|---|---|
| Bootstrap installers | NixOS — reproducible by construction; the entire system specification is hash-tracked |
| Container images | Bazel + `rules_oci` OR Nix-built OCI images; pinned base layer with verified digest |
| Linux distro packaging | Reproducible Builds project tooling (`reproducible-builds.org`); `dpkg --reproducible` flag in Debian |
| Cross-platform binaries | Static linking, hermetic build env (Bazel), check `diffoscope` between rebuilds |

### Verification step

```bash
# Local rebuild
bazel build //my:artifact
sha256sum bazel-bin/my/artifact

# Compare to CI-published
sha256sum downloaded/artifact.tar.gz

# If they differ, run diffoscope to see what diverges
diffoscope bazel-bin/my/artifact downloaded/artifact.tar.gz
```

Common reproducibility breakers: timestamps in archives, build-time UUIDs, parallel-build nondeterminism, locale-dependent string sorting. The `reproducible-builds.org` site catalogs known issues per ecosystem.

### When reproducibility isn't worth it

For internal tools with a single source-of-truth build host and signed output, the value is marginal. Reproducibility shines when:

- You publish artifacts users will run (binaries, container images)
- Your CI runs untrusted code (third-party PRs, etc.)
- Your build host might be compromised and you want a way to detect it

---

## Section 4: Build attestation (in-toto, SLSA)

### Suggested default: SLSA Level 3+ attestation for production releases

SLSA (Supply-chain Levels for Software Artifacts) defines compliance levels:

| Level | What it requires | What it tells consumers |
|---|---|---|
| 0 | nothing | "this came from somewhere" |
| 1 | build process documented | "the build is repeatable in principle" |
| 2 | build runs on hosted CI; provenance generated | "we know which CI built it" |
| 3 | build is hermetic, isolated; provenance is signed and tamper-evident | "we can prove the build chain end-to-end" |
| 4 | additional constraints — two-person review, hermetic builds | "highest assurance" |

**Tooling:**

- `cosign` (Sigstore) — signs container images and arbitrary blobs; integrates with Rekor transparency log
- `slsa-github-generator` — produces SLSA L3 provenance from GitHub Actions
- `in-toto` (CMU) — generic supply-chain attestation framework
- `Tekton Chains` — Kubernetes-native build attestation

### Verification on consumer side

```bash
cosign verify --certificate-identity-regexp=...@my-org \
    --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
    ghcr.io/my-org/my-image:1.2.3
```

Pin **specific certificate identities and OIDC issuers**. A bare `cosign verify` can be satisfied by any signature.

---

## Section 5: Hardware / firmware version locking

### Required pattern (review L6)

For systems with hardware-backed cryptographic operations (HSMs, YubiKeys, TPM-equipped hosts), pin to a known-good firmware range. Different firmware versions can have:

- Different cryptographic primitive support (FIDO2 features, attestation behavior)
- Different timing characteristics (side-channel surface)
- Different bug profiles

Example: YubiKey 5 firmware 5.4 vs 5.7 have **different FIDO2 PRF behavior**. Code that worked against 5.4 may fail or behave differently on 5.7.

### Inventory pattern

```yaml
# .aiwg/security-engineering/supply-chain/hardware-pins.yaml
yubikey-5:
  tested-firmware: "5.4.3, 5.7.1"
  acceptable-firmware: ">=5.4.0, <6.0"
  test-vectors: "tests/yubikey-5-prf.txt"
  last-validated: "2026-04-15"

tpm-2.0:
  vendor: "Infineon"
  acceptable-firmware: ">=7.83"
  pcr-baseline: ".aiwg/security-engineering/chain-of-trust/pcr-baseline.yaml"
```

When a new firmware ships, run your test vectors against the new version before allowing it into production.

---

## Section 6: Worked examples

### Review M10 — SHA-256 manifest from poisoned apt source

Original: install-pkgs.sh verifies SHA-256 of each `.deb` file against a manifest produced by `apt-cache` at build time.

What this skill flags:

- Section 2 anti-pattern: verification within same trust domain as packaging
- Layer 2 attack: poisoned mirror produces consistent manifest + packages

Remediation:

- Pin to `snapshot.debian.org/archive/debian/<timestamp>/` URLs in install scripts
- Verify Debian `Release` file with explicit archive signing keys (`/usr/share/keyrings/debian-archive-keyring.gpg`)
- Generate `.deb` SHA manifest from the snapshot, NOT from `apt-cache`
- Commit the resulting manifest to a signed git repo
- Reproducibly rebuild the bootstrap partition; verify rebuild matches published

### Review H3 — `python-fido2` and transitive deps in PRF hot path

Original: bootstrap installs `python-fido2`, `cryptography`, `cffi`, `pyusb` from PyPI at first run.

What this skill flags:

- Layer 2 attack: PyPI compromise of any of 4+ packages affects PRF hot path
- Section 2: deps are not vendored OR hash-locked

Remediation (see also `auth-factor-design`):

- Replace `python-fido2` with `libfido2` C tools — drops Python from hot path
- If Python remains: vendor `python-fido2` + transitive deps with hash-locked wheels in bootstrap blob; verify per-wheel SHA-256 against manifest committed to signed repo; reproducible-build the bootstrap

### Review L6 — firmware version not documented

Original: design assumes "YubiKey 5 with FIDO2 PRF" without specifying firmware range.

What this skill flags:

- Section 5: hardware version not pinned

Remediation:

- Document tested firmware range (e.g., 5.4.0–5.7.x)
- Maintain test vectors in repo; run against any new firmware before adopting
- Operationally: standardize procurement to known-good firmware

---

## Section 7: Trust-boundary inventory

Mandatory exercise — for every external input to your build, document:

| Input | Source | Verification | Trust anchor |
|---|---|---|---|
| Source code (your repo) | git origin | signed commits + signed tags | dev signing keys |
| Source code (deps) | language registry | hash-locked manifest | dev publishes verified |
| Base OS packages | snapshot.debian.org | Debian archive key | embedded in keyring |
| Container base layer | OCI registry | image digest pinned | (none — ASSUMPTION) |
| Build CI | GitHub Actions | OIDC + SLSA L3 attestation | GitHub OIDC issuer |
| Hardware | physical procurement | (assumption: vendor not compromised) | (none — ASSUMPTION) |
| Firmware | (vendor) | version pinned, test vectors run | self-tested |

Rows with "ASSUMPTION" are explicitly accepted risks. Document why each assumption is acceptable.

---

## Section 8: Output format

When invoked as part of a review, produce findings in standard format. When authoring or updating, produce:

- `supply-chain-pins.yaml` — current pins for all layers
- `hardware-pins.yaml` — firmware versions tested
- `trust-boundary.md` — inventory and assumption acceptance

---

## Related

- **Existing**: `sdlc-complete/templates/security/sbom-guidance.md` (SBOM is upstream of this skill)
- **Existing**: `sdlc-complete/templates/security/dependency-policy-template.md` (this skill operationalizes the policy)
- **Companion skill**: `chain-of-trust-design` (Layer 3+4 — boot-time integrity)
- **Companion skill**: `physical-threat-modeling` (Layer 4 — hardware implant scenarios)

## Standards referenced

- SLSA Framework (`slsa.dev`)
- in-toto Specification (CMU)
- Reproducible Builds (`reproducible-builds.org`)
- Sigstore Cosign documentation
- NIST SP 800-204D — Strategies for Securing Software Supply Chains
- CISA Software Supply Chain Risk Management
- Trusted Platform Module 2.0 Library Specification (firmware identity)
