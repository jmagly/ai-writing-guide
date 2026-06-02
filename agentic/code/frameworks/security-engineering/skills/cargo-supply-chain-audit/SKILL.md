---
namespace: aiwg
name: cargo-supply-chain-audit
platforms: [all]
description: "Audit Rust/Cargo crates for supply-chain exposure: crates.io metadata + checksum verification against Cargo.lock, .crate tarball hash and .cargo_vcs_info.json provenance, previous-vs-patched .crate source diff, Cargo.toml dependency + build-script review, cargo audit / cargo deny / cargo vet trust policy, and publisher / trusted-publishing / yank / release-anomaly checks."
---

# cargo-supply-chain-audit

Use this skill when reviewing a **Rust / Cargo** project or a specific
**crates.io** crate for supply-chain exposure: compromised crate maintainer
risk, malicious `build.rs` or `proc-macro` execution at build time, dependency
or checksum tampering, or a yank/release anomaly. This is the Cargo/Rust
counterpart to `npm-supply-chain-audit` — reach for it whenever the artifact
under review is a crate, not an npm package.

## Triggers

- "cargo crate supply chain audit"
- "crates.io supply chain"
- "rust dependency audit"
- "malicious crate" / "compromised crate"
- "cargo audit" / "cargo deny" / "cargo vet"
- "build.rs review" / "proc-macro supply chain"
- "Cargo.lock checksum verification"
- ".crate tarball provenance"

## Audit sequence

### 1. Dependency + checksum verification (against `Cargo.lock`)

`Cargo.lock` pins each dependency to a version **and** a registry checksum.
Verify the lockfile is present, committed, and internally consistent:

```bash
# Lockfile must exist and be committed (binaries always; libraries when pinning matters)
test -f Cargo.lock || echo "MISSING Cargo.lock — no checksum pinning"

# Re-verify every dependency against its recorded checksum without building
cargo verify-project
cargo fetch --locked            # fails if Cargo.lock would change (drift / tampering)

# Inspect the pinned source + checksum for a specific crate
grep -A3 'name = "<crate>"' Cargo.lock
```

Escalate:

- `Cargo.lock` missing or not committed for a binary/deployable.
- `cargo fetch --locked` reports the lockfile would change (unpinned drift).
- A dependency `source` is a **git** URL or `path` override instead of
  `registry+https://github.com/rust-lang/crates.io-index` — git/path deps
  bypass the registry checksum + yank machinery (the Cargo analog of npm's
  `git+`/`file:` exotic sources).

### 2. `.crate` tarball hash + provenance (`.cargo_vcs_info.json`)

A published `.crate` is a gzipped tarball. Verify its hash matches what
`Cargo.lock` / crates.io records, and inspect the embedded VCS provenance:

```bash
# Download the exact published artifact
curl -sSL -o <crate>-<ver>.crate \
  "https://crates.io/api/v1/crates/<crate>/<ver>/download"

# SHA-256 must match the checksum recorded in Cargo.lock for this version
sha256sum <crate>-<ver>.crate

# Inspect commit provenance baked in at publish time
tar -xzf <crate>-<ver>.crate
cat <crate>-<ver>/.cargo_vcs_info.json    # { "git": { "sha1": "<commit>" }, "path_in_vcs": "" }
```

Escalate:

- `.crate` SHA-256 does not match the `Cargo.lock` checksum (artifact tampering).
- Missing or mismatched `.cargo_vcs_info.json` — the published source can't be
  tied back to a repository commit.
- The recorded `sha1` does not exist in the upstream repo, or the repo tag for
  this version was force-moved.

### 3. Previous-vs-patched source diff

For a version bump (especially a patch release of a transitive dependency),
diff the actual published sources — not just the repo — because crates.io
publishes a snapshot that can differ from the tagged commit:

```bash
# Extract both versions' .crate sources and diff
tar -xzf <crate>-<old>.crate && tar -xzf <crate>-<new>.crate
diff -ru <crate>-<old>/ <crate>-<new>/ | less

# Focus on the high-risk surfaces first
diff -ru <crate>-<old>/build.rs <crate>-<new>/build.rs 2>/dev/null
diff -ru <crate>-<old>/Cargo.toml <crate>-<new>/Cargo.toml
```

Escalate any diff that adds: network calls, process spawns, filesystem writes
outside `OUT_DIR`, new `build.rs`, new `proc-macro` crates, base64/hex blobs, or
obfuscated string assembly.

### 4. `Cargo.toml` dependency + build-script review

`build.rs` and procedural macros execute **arbitrary code at build time** —
the Cargo analog of npm lifecycle scripts and the primary install-time
execution vector:

```bash
# Does the crate run a build script or ship proc-macros?
grep -nE '^build\s*=|\[build-dependencies\]|proc-macro\s*=\s*true' Cargo.toml
find . -name build.rs -not -path './target/*'

# Read every build.rs in the dependency tree, not just the top crate
cargo tree -e build,normal --prefix depth | grep -i build
```

Escalate:

- A `build.rs` that does anything beyond codegen / linking into `OUT_DIR`
  (network, exec, writing outside `OUT_DIR`, reading secrets/env beyond
  documented `CARGO_*`/`OUT_DIR`).
- New `[build-dependencies]` or `proc-macro = true` crates introduced in a
  patch release.
- Feature unification pulling an unexpected crate into the build.

### 5. Trust-policy tooling: `cargo audit` / `cargo deny` / `cargo vet`

```bash
# Known-vulnerability scan against RustSec advisory DB
cargo audit                      # fails on advisories; `cargo audit fix` for patches

# Policy gate: licenses, bans, advisories, exotic sources, duplicate versions
cargo deny check                 # bans, advisories, licenses, sources

# Supply-chain trust: require human/org review of each crate+version
cargo vet                        # fails on un-vetted crates; `cargo vet certify` to record review
```

Escalate:

- `cargo audit` advisories (especially `code-execution`/`memory-corruption`).
- `cargo deny` `sources` violations (non-crates.io registries, unexpected git).
- `cargo vet` reports a new un-vetted crate/version in a project that maintains
  a vet trust policy (`supply-chain/config.toml`).

### 6. Publisher / trusted-publishing / yank / release-anomaly checks

```bash
# Crate + version metadata: owners, publish time, yank state
curl -sSL "https://crates.io/api/v1/crates/<crate>" | jq '{owners: .crate.id, versions: [.versions[] | {num, yanked, created_at, published_by: .published_by.login}]}'
```

Escalate:

- Version published by an account that is **not** an established owner
  (compromised-maintainer signal — the crates.io analog of npm trusted
  publishing review).
- A previously-yanked version un-yanked, or a rapid patch following a yank.
- Publish timestamp anomaly (off-hours burst, version published far ahead of
  the corresponding repo tag).

## Incident-response trigger

If any escalation in steps 2–6 confirms tampering or malicious build-time code,
treat it as an active supply-chain incident: pin/yank-avoid the affected
version in `Cargo.lock`, run `cargo deny`/`cargo audit` across the whole
workspace, and route to the forensics framework for evidence handling. See
`supply-chain-trust` for the cross-ecosystem hardening model.

## Output format

Produce a findings report with: crate + version under review, each step's
verdict (pass / escalate), the exact command output backing each verdict, and a
go / no-go recommendation for adopting the version.

## References

- `npm-supply-chain-audit` — the npm counterpart (same threat model, JS ecosystem)
- `supply-chain-trust` — cross-ecosystem reproducible-build + dependency-pinning model
- `dependency-source-policy` rule — exotic-source prohibition (git/path bypass registry checksums)
- RustSec advisory DB: <https://rustsec.org/>; `cargo vet`: <https://mozilla.github.io/cargo-vet/>
