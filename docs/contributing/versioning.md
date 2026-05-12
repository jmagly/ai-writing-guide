# Versioning Guide

**Version:** 1.0
**Last Updated:** 2026-01-14
**Target Audience:** All contributors and AI agents

## Overview

AIWG uses **Calendar Versioning (CalVer)** with npm-compatible format. This document explains the versioning scheme and critical rules to avoid npm publishing failures.

## Version Format

```
YYYY.M.PATCH
```

| Component | Description | Example |
|-----------|-------------|---------|
| `YYYY` | Four-digit year | `2026` |
| `M` | Month (1-12, **NO leading zeros**) | `1`, `12` |
| `PATCH` | Patch number within month (resets each month) | `0`, `1`, `5` |

### Examples

| Correct | Incorrect | Why |
|---------|-----------|-----|
| `2026.1.0` | `2026.01.0` | Leading zero in month |
| `2026.1.5` | `2026.01.05` | Leading zeros in month and patch |
| `2026.12.0` | `2026.12.00` | Leading zero in patch |

## Critical Rule: No Leading Zeros

**npm's semver parser rejects leading zeros.** This is per the [Semantic Versioning spec](https://semver.org/):

> A normal version number MUST take the form X.Y.Z where X, Y, and Z are non-negative integers, and **MUST NOT contain leading zeroes**.

### What Happens With Leading Zeros

```bash
# This FAILS
$ npm -g update aiwg
npm error Invalid Version: 2026.01.4

# This WORKS (same package, different command)
$ npm -g install aiwg
# Installs successfully but update is broken
```

The `npm install` command is more lenient than `npm update`. Users will be able to install but not update, causing confusion and support issues.

## Tag Format

Git tags should match the version with a `v` prefix:

```bash
# Correct
git tag -a v2026.1.5 -m "v2026.1.5 - Feature Name"

# Incorrect
git tag -a v2026.01.5 -m "v2026.01.5 - Feature Name"
```

## Release Workflow

### 1. Update package.json

```json
{
  "version": "2026.1.5"
}
```

**Validation**: Run this to check for leading zeros:

```bash
grep '"version"' package.json | grep -E '\.[0-9]{2}\.' && echo "ERROR: Leading zero detected!" || echo "OK: No leading zeros"
```

### 2. Update CHANGELOG.md

```markdown
## [2026.1.5] - 2026-01-14 – "Release Name"
```

### 3. Create and Push Tag

**Tag signing is mandatory** as of #1299 (A9). CI rejects any release tag whose signature does not verify against a maintainer public key in `.gitea/keys/maintainers.asc` (GPG) or `.gitea/allowed_signers` (SSH). The verify step lives in `.gitea/workflows/npm-publish.yml` and `.gitea/workflows/gitea-release.yml` and is implemented by [`tools/ci/verify-signed-tag.sh`](../../tools/ci/verify-signed-tag.sh).

```bash
# Create signed release commit (if not already committed)
git commit -S -m "release: v2026.1.5 \"Release Name\""

# Create signed annotated tag (the -s is non-optional)
git tag -s v2026.1.5 -m "v2026.1.5 - Release Name"

# Verify locally before push — fast feedback if signing isn't configured
git tag -v v2026.1.5

# Push to Gitea (triggers automatic Gitea release + publish workflows;
# CI verify-signed-tag step will reject if signature doesn't match a
# published maintainer key)
git push origin main --tags

# Optional: mirror tag/commit to GitHub
git push github main --tags

# GitHub release remains manual
gh release create v2026.1.5 --repo jmagly/aiwg --title "v2026.1.5 - Release Name" --generate-notes
```

**Sandboxed agent note**: If release operations run inside a filesystem/network sandbox, request **escalated execution** for signed `git commit`/`git tag` commands so GPG can access `~/.gnupg` and the local gpg-agent socket.

#### Signing your release tag — first-time setup

The CI verify gate requires (a) a maintainer signing key, (b) that key's public component committed under `.gitea/keys/` or `.gitea/allowed_signers`, and (c) tags created with `git tag -s`. Pick one of GPG or SSH and follow the matching procedure.

**Option A — GPG signing (preferred for long-lived release keys):**

```bash
# 1. Generate a project-scoped key (NOT your personal key)
gpg --quick-generate-key 'AIWG Release Signing <release@aiwg.io>' ed25519 sign 5y

# 2. Find the key id
gpg --list-secret-keys --keyid-format=long
#   sec   ed25519/ABCD1234EFGH5678 2026-05-12 [SC] [expires: 2031-05-12]
#         <fingerprint>

# 3. Configure git to sign tags by default with this key
git config --global user.signingkey ABCD1234EFGH5678
git config --global tag.gpgSign true

# 4. Publish the public key to the repo
gpg --armor --export ABCD1234EFGH5678 >> .gitea/keys/maintainers.asc
git add .gitea/keys/maintainers.asc
git commit -m "security: add maintainer release signing key (refs #1299)"
git push origin main

# 5. Update SECURITY.md "Maintainer Signing Keys" section with the
#    fingerprint, then commit + push.

# 6. Make a test signed tag to verify end-to-end:
git tag -s vYYYY.M.PATCH-rc.0 -m "vYYYY.M.PATCH-rc.0 - signing-setup verification"
git push origin vYYYY.M.PATCH-rc.0
#    Watch the resulting workflow run. The "Verify signed tag" step should
#    print "✓ Tag <name> verified successfully."
```

**Option B — SSH signing (works with YubiKey / hardware-backed keys):**

```bash
# 1. Generate a project-scoped SSH key (NOT your personal key). Use a
#    hardware-backed sk-ed25519 variant if you have a YubiKey or similar.
ssh-keygen -t ed25519 -f ~/.ssh/aiwg-release-signing -C 'aiwg-release-signing'
#    (or: ssh-keygen -t ed25519-sk -f ~/.ssh/aiwg-release-signing-sk)

# 2. Configure git to sign tags with SSH
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/aiwg-release-signing.pub
git config --global tag.gpgSign true

# 3. Publish the public key in OpenSSH allowed-signers format
echo "release@aiwg.io $(cat ~/.ssh/aiwg-release-signing.pub)" >> .gitea/allowed_signers
git add .gitea/allowed_signers
git commit -m "security: add maintainer release signing key (refs #1299)"
git push origin main

# 4. Update SECURITY.md, test-tag, etc. — same as GPG steps 5-6.
```

#### Rotation and revocation

Rotate maintainer signing keys on a known cadence (suggested: every 2 years) and immediately on any suspected compromise of the maintainer's workstation. To rotate:

1. Generate the new key per the setup procedure above.
2. Add its public component to the same `.gitea/keys/maintainers.asc` or `.gitea/allowed_signers` file (do not remove the old key yet — it's still trusted for past releases).
3. Switch local git config to sign with the new key.
4. After at least one release with the new key has been verified end-to-end, remove the old key from the public-key file in a documented commit and update SECURITY.md.

#### Historical tags

Release tags created before #1299 landed (`v2026.5.2` and earlier) are **not retroactively signed**. The CI gate fires only on tag pushes (`on: push: tags: [v*]`), so old releases keep their existing un-signed annotations. The gate is forward-going only.

### 4. Verify Published Version

After CI/CD completes:

```bash
npm view aiwg version
# Should show: 2026.1.5
```

### 5. Mirror signed release assets to the Gitea release

Once `.github/workflows/npm-publish.yml` finishes on the GitHub mirror, the GitHub release for the new tag carries four signed assets:

- `aiwg-X.Y.Z.tgz` (the published tarball)
- `aiwg-X.Y.Z.tgz.sigstore` (cosign keyless signature bundle)
- `release-manifest.json` (audit manifest — SHA-256, version, tag, commit, workflow run URL)
- `release-manifest.json.sigstore` (cosign keyless signature bundle for the manifest)

The Gitea-side release does NOT auto-mirror these — to avoid expanding the Gitea write-token surface that Wave 4 reduced (#1283, #1286), the mirror is a single explicit operator command after the GitHub workflow lands the assets. Run:

```bash
gh workflow run upload-release-sigs.yml \
  --repo roctinam/aiwg \
  -f tag=vYYYY.M.PATCH
```

…or trigger it from the Gitea Actions UI (Actions → "Mirror signed release assets to Gitea release" → Run workflow → enter the tag).

The workflow downloads the four assets from the public GitHub mirror and uploads them to the Gitea release via the existing `NPM_TOKEN` (no new token required). Re-runs are idempotent — duplicate-name uploads are detected (HTTP 409) and the existing asset is deleted then re-uploaded.

Verify both releases have the four sig assets attached:

| Release | URL |
|---|---|
| GitHub | <https://github.com/jmagly/aiwg/releases/tag/vYYYY.M.PATCH> |
| Gitea  | <https://git.integrolabs.net/roctinam/aiwg/releases/tag/vYYYY.M.PATCH> |

Consumer verification commands (cosign-based, registry-independent) are documented in [`docs/releases/verifying.md`](../releases/verifying.md). See [`#1287`](https://git.integrolabs.net/roctinam/aiwg/issues/1287) and [the A8 ADR](../../.aiwg/architecture/adr-tarball-cosign-signing.md) for the full rationale.

## Release Gates

In addition to the four steps above, the following CI workflows act as **release gates** — a failure on any of these blocks the release.

| Gate | Workflow | Trigger | What it proves |
|------|----------|---------|----------------|
| Unit + integration tests | `.gitea/workflows/ci.yml` | push to main, tag, PR | Code changes did not regress the suite |
| Executor-contract conformance (fixture mode) | `.gitea/workflows/ci.yml` (`test:conformance` step) | every CI run | Static fixture replay still matches the contract schema |
| **A2A conformance against agentic-sandbox v2** | `.gitea/workflows/conformance.yml` | version tags, manual, opt-in PR label | AIWG's A2A client interoperates with a live sandbox v2 instance — proves end-to-end interop, not just contract shape (#1258). Skips automatically while upstream sandbox v2 is pre-release. |
| Build verification | `.gitea/workflows/ci.yml` (`build` job) | every CI run | `npm run build` produces deployable artifacts |
| **Dependency source policy** | `.gitea/workflows/ci.yml` (`Lint dependency sources` step) | every CI run | No `git+`, `github:`, tarball, `file:`, or `link:` dep sources outside the allowlist (#1300 / A20) |
| **Signed-tag verify** | `.gitea/workflows/npm-publish.yml` + `gitea-release.yml` + `.github/workflows/npm-publish.yml` (`Verify signed tag` step) | tag push | Release tag is cryptographically signed by a maintainer key published in `.gitea/keys/` or `.gitea/allowed_signers` (#1299 / A9) |
| **Cosign tarball signature** | `.github/workflows/npm-publish.yml` (`Generate tarball + cosign sign + manifest` step) | tag push | Published tarball + release manifest are signed via Sigstore keyless OIDC, attached to the GitHub release, mirrored to the Gitea release by `.gitea/workflows/upload-release-sigs.yml` (#1287 / A8) |

### A2A Conformance Gate Details

The `A2A Conformance` workflow provisions a reference agentic-sandbox v2 instance via Docker Compose, builds the `roctinam/agentic-sandbox-conformance` Go harness, and runs the suite end-to-end. Failure blocks the release.

- **What to do on green**: proceed with tagging.
- **What to do on red**: open the run, download the `conformance-reports-*` artifact (`report.md` + `report.junit.xml`), and diagnose. Common categories of failure are listed in the harness's own `report.md`. Do **not** force a stable tag past a red conformance run without explicit issue documentation and a follow-up tracking issue — that's how interop regressions ship.
- **Workflow inputs**: the manual-dispatch form accepts `sandbox_ref` and `conformance_ref` for pinned-ref retries (e.g., to verify a fix against a specific sandbox commit before the release engineer is back online).

## Pre-release Tags (alpha/beta)

Pre-release tags are **internal pipeline checkpoints** — not public releases.

```bash
# Nightly — automated or ad-hoc; date-stamped
git tag -m "v2026.1.5-nightly.20260324" v2026.1.5-nightly.20260324
git push origin v2026.1.5-nightly.20260324
# CI publishes to npm --tag nightly → npm install aiwg@nightly

# Alpha — early feature testing
git tag -m "v2026.1.5-alpha.1" v2026.1.5-alpha.1
git push origin v2026.1.5-alpha.1
# CI publishes to npm --tag next → npm install aiwg@next

# Beta — feature-complete, broader testing
git tag -m "v2026.1.5-beta.1" v2026.1.5-beta.1
git push origin v2026.1.5-beta.1
# CI publishes to npm --tag next → npm install aiwg@next

# RC — release candidate (note: lowercase, dot-separated — matches npm semver)
git tag -m "v2026.1.5-rc.1" v2026.1.5-rc.1
git push origin v2026.1.5-rc.1
# CI publishes to npm --tag next → npm install aiwg@next

# Stable
git tag -m "v2026.1.5" v2026.1.5
git push origin v2026.1.5
# CI publishes to npm --tag latest (default install)
```

### Release Pipeline

This is a standard multi-stage release pipeline used by many npm packages:

```
dev (local) → nightly → alpha → beta → RC → stable
```

### Naming Convention

| Stage | Format | Example | npm dist-tag | Meaning |
|-------|--------|---------|---------|---------|
| Dev | (local source install, no tag) | — | — | Active development on this machine |
| Nightly | `vYYYY.M.PATCH-nightly.YYYYMMDD` | `v2026.1.5-nightly.20260324` | `nightly` | Automated or ad-hoc snapshot |
| Alpha | `vYYYY.M.PATCH-alpha.N` | `v2026.1.5-alpha.1` | `next` | Early testing, pipeline validation |
| Beta | `vYYYY.M.PATCH-beta.N` | `v2026.1.5-beta.1` | `next` | Feature-complete, broader testing |
| RC | `vYYYY.M.PATCH-rc.N` | `v2026.1.5-rc.1` | `next` | Release candidate, final pre-stable |
| Stable | `vYYYY.M.PATCH` | `v2026.1.5` | `latest` | Public release |

Alpha, beta, and RC all publish to the `next` dist-tag. The latest of these is always what `npm install -g aiwg@next` installs.

**Install by channel:**

```bash
npm install -g aiwg                  # stable (latest dist-tag, default)
npm install -g aiwg@next             # latest alpha/beta/RC
npm install -g aiwg@nightly          # latest nightly snapshot
npm install -g aiwg@2026.1.5-rc.3    # specific RC by exact version
aiwg refresh --channel next          # switch installed version to next channel
aiwg refresh --channel latest        # switch back to stable
```

### What pre-release means

- Used to validate the publish pipeline and let a small group test before the stable tag
- Nightly builds are automated snapshots; alphas/betas are intentional testing milestones
- **No release announcement** — pre-releases are not public releases
- **No new CHANGELOG entry** — the stable release CHANGELOG covers everything
- **No Gitea/GitHub release** — only the stable tag gets a release page
- CHANGELOG and `docs/releases/` docs are written once, for the stable tag, and cover everything that accumulated across all pre-releases

### Pre-release → Stable flow

```
nightly → nightly → alpha.1 → fix → alpha.2 → beta.1 → test → stable tag
                                                                     ↓
                                                          CHANGELOG + announcement
                                                          written once here
```

## Version Progression Examples

### Within a Month

```
2026.1.0  → First release in January 2026
2026.1.1  → Bug fix
2026.1.2  → Another fix
2026.1.3  → Feature addition
```

### Month Transitions

```
2026.1.5  → Last release in January
2026.2.0  → First release in February (PATCH resets)
2026.2.1  → Next release in February
```

### Year Transitions

```
2026.12.3 → December release
2027.1.0  → January of next year
```

## Automated Validation

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
VERSION=$(grep '"version"' package.json | head -1)
if echo "$VERSION" | grep -qE '\.[0-9]{2}\.'; then
  echo "ERROR: package.json version has leading zeros!"
  echo "Found: $VERSION"
  echo "Fix: Remove leading zeros (e.g., 2026.01.5 → 2026.1.5)"
  exit 1
fi
```

### CI Validation

The npm publish workflow will fail if the version has leading zeros, but it's better to catch this before pushing.

## Common Mistakes

### Mistake 1: Copy-Paste from Dates

```bash
# Today is January 5, 2026
# WRONG: Using date format
2026.01.05

# RIGHT: Using CalVer format
2026.1.5
```

### Mistake 2: Assuming Two-Digit Month

```bash
# WRONG: Padding single-digit months
2026.01.0, 2026.02.0, ..., 2026.09.0

# RIGHT: No padding
2026.1.0, 2026.2.0, ..., 2026.9.0
```

### Mistake 3: Incrementing Without Checking Format

When bumping versions, always verify the format:

```bash
# Before: 2026.1.4
# Bumping patch...

# WRONG (if you typed it manually)
"version": "2026.01.5"

# RIGHT
"version": "2026.1.5"
```

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Calendar Versioning](https://calver.org/)
- [npm semver](https://docs.npmjs.com/cli/v6/using-npm/semver)
- @CLAUDE.md - Release Documentation Requirements
- @docs/contributing/ci-cd-secrets.md - CI/CD configuration
