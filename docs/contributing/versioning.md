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

| Component | Description                                   | Example       |
| --------- | --------------------------------------------- | ------------- |
| `YYYY`    | Four-digit year                               | `2026`        |
| `M`       | Month (1-12, **NO leading zeros**)            | `1`, `12`     |
| `PATCH`   | Patch number within month (resets each month) | `0`, `1`, `5` |

### Examples

| Correct     | Incorrect    | Why                              |
| ----------- | ------------ | -------------------------------- |
| `2026.1.0`  | `2026.01.0`  | Leading zero in month            |
| `2026.1.5`  | `2026.01.05` | Leading zeros in month and patch |
| `2026.12.0` | `2026.12.00` | Leading zero in patch            |

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

`tools/release/cut-tag.sh` sources the release-signing key from vault itself
(no manual keyring hydration): it fetches the key + machine passphrase into an
ephemeral `GNUPGHOME`, signs the tag with loopback pinentry, verifies, and
removes the temporary keyring on exit. The operator only supplies the
reader-AppRole credentials.

```bash
# Commit the release prep (personal key — GitHub Verified)
git commit -S -m "docs(release): prepare 2026.X.Y artifacts"

# Export the ci-aiwg reader bootstrap from the TPM-backed credential handoff.
# The concrete release-key routes come from the operator's private routing
# environment or protected forge variables; never commit them here.
source /path/to/private/vault-runtime.env
export VAULT_CI_ROLE_ID="$(_vault_cred ci-aiwg role-id)"
export VAULT_CI_SECRET_ID="$(_vault_cred ci-aiwg secret-id)"
source /path/to/private/aiwg-release-routing.env

# Cut the signed tag — fetches the vault key, signs with the release-only key,
# supplies its passphrase through batch loopback pinentry (no dialog), and runs
# the local verify gate. Never call `git tag` by hand.
tools/release/cut-tag.sh 2026.X.Y

# Push to Gitea (triggers gitea-release + npm-publish; the CI verify-signed-tag
# gate validates the signature against .gitea/keys/maintainers.asc)
git push origin main --tags

# Mirror the signed tag to GitHub (push it yourself — the mirror workflow
# peels annotated tags; github-mirror.yml then creates the GitHub release)
git push github main --tags

unset VAULT_CI_ROLE_ID VAULT_CI_SECRET_ID
unset RELEASE_SIGNING_KEY_VAULT_PATH RELEASE_SIGNING_KEY_VAULT_FIELD
unset RELEASE_SIGNING_PASSPHRASE_VAULT_PATH RELEASE_SIGNING_PASSPHRASE_VAULT_FIELD
```

**Signing-key custody note**: the active release-signing key is
`401584AAA3376B898FB34427839584D0E25E5126` (`AIWG Release Signing`). Its private
material and passphrase live vault-only; the concrete route is supplied by the
private routing environment, not checked-in docs. The separate
`9292EFCBB0EA41BECEEFDAFA9C1B8CE0E0E09C33` key signed `v2026.7.12` and remains
published for historical verification, but it is not the active release key.
CI only pulls repository contents and verifies tags against committed public
keys — it does not need private-key access for verification.

The encrypted recovery copy governed by the private itops runbook contains the
`ci-aiwg` AppRole bootstrap pair only. It does not contain the release key or
passphrase. Never restore those bootstrap values into project configuration or
commit the recovery-medium path or manifest here.

Vault source of truth:

- SOP: private itops secret-management runbook.
- Release key route: `RELEASE_SIGNING_KEY_VAULT_PATH` and
  `RELEASE_SIGNING_KEY_VAULT_FIELD`.
- Release passphrase route: `RELEASE_SIGNING_PASSPHRASE_VAULT_PATH` and
  `RELEASE_SIGNING_PASSPHRASE_VAULT_FIELD`.
- Reader AppRole: `ci-aiwg`, provided to CI as `VAULT_CI_ROLE_ID` and
  `VAULT_CI_SECRET_ID`.
- Commit signing route: private maintainer vault routing, not stored in this
  repository.

Fork / offline signing: set `AIWG_RELEASE_SIGN_FROM_VAULT=0` to sign with a key
already in the local GPG keyring, and `AIWG_RELEASE_KEY_FINGERPRINT=<fpr>` to
override the key.

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

# 5. Induct the PRIVATE key into vault, then delete the working export.
#    Follow /home/roctinam/dev/itops/docs/security/secret-management-sop.md
#    and use /home/roctinam/dev/itops/scripts/secret-induct.sh so the key is
#    streamed from a file and never printed.

# 6. Update SECURITY.md "Maintainer Signing Keys" section with the
#    fingerprint, then commit + push.

# 7. Make a test signed tag to verify end-to-end:
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

#### Two-key model — what to use when

Per the convention established in commit `a13dabc5` ("two-key model — personal key signs commits, release key signs tags"), AIWG maintainers use **two keys with two separate purposes**:

| Purpose                   | Key                                                                     | UID                                                                                                                       |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Commit signing**        | project-dedicated AIWG commit key from the maintainer vault route       | `AIWG Commit Signing <1159087+jmagly@users.noreply.github.com>`                                                           |
| **Tag signing (release)** | project-dedicated AIWG release key from the release signing vault route | `AIWG Release Signing <1159087+jmagly@users.noreply.github.com>` (fingerprint `401584AAA3376B898FB34427839584D0E25E5126`) |

This has one operational gotcha: a typical maintainer git config has `tag.gpgsign=true` AND `user.signingkey=<personal-key>` so commits sign correctly. But `git tag -s` (and even `git tag -a` with `tag.gpgsign=true`) then signs the **tag** with the **personal key** — wrong key for the supply-chain gate.

**Always cut tags via the wrapper:**

```bash
tools/release/cut-tag.sh 2026.X.Y
```

The wrapper forces `-u <release-key-fingerprint>` via `git tag -s -u …` so the right key signs the tag regardless of the global `user.signingkey`. It also verifies CalVer and package lockstep (including `@aiwg/cli`), release documentation, signing-key availability, and the resulting tag before reporting the push command, so common drift bugs fail locally rather than in CI.

If the wrapper says the release key is missing, hydrate a temporary GPG home from
the configured vault route first:

```bash
set +x
umask 077
export GNUPGHOME="${XDG_RUNTIME_DIR:-/dev/shm}/aiwg-gpg-release.$$"
mkdir -p "$GNUPGHOME"
GITHUB_ENV="$(mktemp)" ci/vault-fetch.sh --spec ci/vault-fetch.release-signing.spec
. "$GITHUB_ENV"
gpg --batch --import "$GPG_SIGNING_KEY_FILE"
gpg --list-secret-keys --keyid-format LONG
```

When the command sees `AIWG Release Signing <release@aiwg.io>`, rerun
`cut-tag.sh` in the same shell so it uses that temporary `GNUPGHOME`.

**v2026.5.5 incident** (2026-05-14) — for posterity: an agent ran `git tag -a v2026.5.5 -m "…"` directly, which signed with the personal commit-signing key. The supply-chain gate caught it across **three workflows** (Gitea `npm-publish`, Gitea `gitea-release`, GitHub mirror release) and refused to publish any artifacts. No bad release left the gate. Recovery was `git tag -d` + `git push origin :refs/tags/<tag>` + push to remote, then `tools/release/cut-tag.sh <version>`. The wrapper script was added in the same fix commit so the next release ceremony won't repeat the mistake.

#### Rotation and revocation

Rotate maintainer signing keys on a known cadence (suggested: every 2 years) and
immediately on any suspected compromise of the maintainer's workstation or
vault secret path. To rotate:

1. Generate the new key per the setup procedure above.
2. Add its public component to the same `.gitea/keys/maintainers.asc` or `.gitea/allowed_signers` file (do not remove the old key yet — it's still trusted for past releases).
3. Induct the new private key into the relevant vault path and update its KV metadata.
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

| Release | URL                                                                    |
| ------- | ---------------------------------------------------------------------- |
| GitHub  | <https://github.com/jmagly/aiwg/releases/tag/vYYYY.M.PATCH>            |
| Gitea   | <https://git.integrolabs.net/roctinam/aiwg/releases/tag/vYYYY.M.PATCH> |

Consumer verification commands (cosign-based, registry-independent) are documented in [`docs/releases/verifying.md`](../releases/verifying.md). See [`#1287`](https://git.integrolabs.net/roctinam/aiwg/issues/1287) and [the A8 ADR](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-tarball-cosign-signing.md) for the full rationale.

## Release Gates

In addition to the four steps above, the following CI workflows act as **release gates** — a failure on any of these blocks the release.

| Gate                                           | Workflow                                                                                                                  | Trigger                               | What it proves                                                                                                                                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit + integration tests                       | `.gitea/workflows/ci.yml`                                                                                                 | push to main, tag, PR                 | Code changes did not regress the suite                                                                                                                                                              |
| Executor-contract conformance (fixture mode)   | `.gitea/workflows/ci.yml` (`test:conformance` step)                                                                       | every CI run                          | Static fixture replay still matches the contract schema                                                                                                                                             |
| **A2A conformance against agentic-sandbox v2** | `.gitea/workflows/conformance.yml`                                                                                        | version tags, manual, opt-in PR label | AIWG's A2A client interoperates with a live sandbox v2 instance — proves end-to-end interop, not just contract shape (#1258). Skips automatically while upstream sandbox v2 is pre-release.         |
| Build verification                             | `.gitea/workflows/ci.yml` (`build` job)                                                                                   | every CI run                          | `npm run build` produces deployable artifacts                                                                                                                                                       |
| **Dependency source policy**                   | `.gitea/workflows/ci.yml` (`Lint dependency sources` step)                                                                | every CI run                          | No `git+`, `github:`, tarball, `file:`, or `link:` dep sources outside the allowlist (#1300 / A20)                                                                                                  |
| **Signed-tag verify**                          | `.gitea/workflows/npm-publish.yml` + `gitea-release.yml` + `.github/workflows/npm-publish.yml` (`Verify signed tag` step) | tag push                              | Release tag is cryptographically signed by a maintainer key published in `.gitea/keys/` or `.gitea/allowed_signers` (#1299 / A9)                                                                    |
| **Cosign tarball signature**                   | `.github/workflows/npm-publish.yml` (`Generate tarball + cosign sign + manifest` step)                                    | tag push                              | Published tarball + release manifest are signed via Sigstore keyless OIDC, attached to the GitHub release, mirrored to the Gitea release by `.gitea/workflows/upload-release-sigs.yml` (#1287 / A8) |

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

| Stage   | Format                           | Example                      | npm dist-tag | Meaning                             |
| ------- | -------------------------------- | ---------------------------- | ------------ | ----------------------------------- |
| Dev     | (local source install, no tag)   | —                            | —            | Active development on this machine  |
| Nightly | `vYYYY.M.PATCH-nightly.YYYYMMDD` | `v2026.1.5-nightly.20260324` | `nightly`    | Automated or ad-hoc snapshot        |
| Alpha   | `vYYYY.M.PATCH-alpha.N`          | `v2026.1.5-alpha.1`          | `next`       | Early testing, pipeline validation  |
| Beta    | `vYYYY.M.PATCH-beta.N`           | `v2026.1.5-beta.1`           | `next`       | Feature-complete, broader testing   |
| RC      | `vYYYY.M.PATCH-rc.N`             | `v2026.1.5-rc.1`             | `next`       | Release candidate, final pre-stable |
| Stable  | `vYYYY.M.PATCH`                  | `v2026.1.5`                  | `latest`     | Public release                      |

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

## Release-age policy (Wave 7 — A15, #1290)

AIWG enforces a **release-age gate** on the dep graph: a newly published
version of any dependency must have been on the public registry for at
least 7 days before it can enter the lockfile. This is configured in the
repo-root `.npmrc` via `min-release-age=7`.

The gate exists to neutralize the "brand-new-malicious-publish-window"
attack — the same supply-chain technique used in the Mini Shai-Hulud
incidents that motivated the rest of Wave 7. If a package is compromised
at publish time, the gate bounds the window during which AIWG can be
exposed to the malicious version: a contributor running `npm install <new-dep>`
or `npm update` against a freshly published malicious version will see
npm refuse to resolve it until the gate window has elapsed and someone
(npm, the maintainer, the security community) has had time to notice
and yank.

### Requirements

- **npm 11.5+** is required for the `min-release-age` config to be
  honored. Earlier versions silently ignore the config (no error — but
  no gate either).
- Node 20.20.2 / 22.x base images ship npm 10.x by default. CI workflows
  and contributor machines must install npm@^11.5 before lockfile-
  affecting operations for the gate to be active.

```bash
# One-time on a contributor machine (or pin in your shell rc)
npm install -g npm@^11.5

# In CI (publish workflows specifically) — defense in depth
# Run before any `npm ci` or `npm install` step:
npm install -g npm@latest
```

### Default vs high-sensitivity profile

| Profile                                               | Window   | When to use                                                                                                                    |
| ----------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Default** (`min-release-age=7`)                     | 7 days   | All contributor workflows + standard CI                                                                                        |
| **High-sensitivity** (`min-release-age=10` or higher) | 10+ days | Publish workflows touching release artifacts; major version bumps; manual lockfile regeneration on a security-sensitive branch |

The high-sensitivity profile is opt-in via the
`AIWG_MIN_RELEASE_AGE_HIGH` environment variable, recognized by AIWG
internal tooling and the publish workflows:

```bash
# Contributor regenerating the lockfile with the high-sensitivity profile
AIWG_MIN_RELEASE_AGE_HIGH=10 npm install --userconfig $PWD/.npmrc \
  --min-release-age "${AIWG_MIN_RELEASE_AGE_HIGH:-7}"

# Or just override the config on the CLI for a single command
npm install --min-release-age=10
```

When CI workflows enter "publish" phase, the gate is invoked with the
high-sensitivity value to add belt-and-suspenders coverage during the
most security-sensitive moments.

### What happens if the gate fires

`npm install` (or `npm update`) errors with `No matching version found`
when the only resolutions for a dep request are inside the gate window.
This is the desired behavior — it prevents the new version from entering
the lockfile silently.

To proceed:

1. **Preferred**: wait. The gate window is short. A version published
   today will be installable in 7 days.
2. **If the dep is truly urgent**: bypass the gate **deliberately** with
   `npm install --min-release-age=0 <pkg>`. This is a manual,
   commit-message-justified override. The override must be documented
   in the lockfile commit, and the security team should be tagged.
3. **If a malicious version is suspected**: yank from npm if it's
   AIWG-owned, file an incident issue, contact npm security, and update
   the dep-source allowlist to pin the previous known-good version.

### Interaction with other gates

- **A11 tarball audit** (`tools/lint/tarball-audit.mjs`) — independent
  control. Runs at publish time, checks the AIWG tarball's top-level
  contents. Not affected by the release-age gate.
- **A12 audit signatures** (`tools/lint/audit-signatures.mjs`) — runs
  `npm audit signatures` against published deps. Independent of the
  gate, but the gate prevents new unsigned attestations from entering
  the tree faster than they can be verified.
- **A20 dep-source policy** — scans the lockfile for forbidden source
  patterns (git+, file:, etc.). Independent of the gate; both run.

### Why not pnpm

A21 (#1301) spike evaluated migrating to pnpm so the gate could ship in
`pnpm-workspace.yaml minimumReleaseAge` shape, which is slightly cleaner.
The spike outcome was to stay on npm — see
`.aiwg/architecture/adr-pnpm-workspace-migration.md` for the full
reasoning. Short version: the migration cost in Wave 7 scope outweighs
the benefit; the threat-model effect of either shape is equivalent.

## Package ownership & npm registries

AIWG ships **three** npm packages with **different ownership models** — this split
is intentional; don't try to "unify" them.

| Package         | Scope / owner                                      | Public install                 | Notes                                                                                           |
| --------------- | -------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `aiwg`          | **unscoped**, owned by the user account `roctinam` | `npm install -g aiwg`          | Full CLI plus the default local corpus; retained for compatibility.                              |
| `@aiwg/cli`     | **scoped**, under the `@aiwg` org                  | `npm install -g @aiwg/cli`     | Lightweight CLI/API runtime without the corpus; its version is exactly lockstep with `aiwg`.     |
| `@aiwg/cockpit` | **scoped**, under the `@aiwg` org                  | `npm install -g @aiwg/cockpit` | Opt-in Cockpit package.                                                                         |

### Where each registry is published from

- **npmjs.org (public) — GitHub Actions only.** `.github/workflows/npm-publish.yml`
  publishes all three packages via **OIDC trusted publishing + provenance** on tag push.
  No npm token is involved (OIDC). GitHub Actions is the authority for npmjs.org
  supply-chain distribution and verification.
- **Gitea npm registry (mirror) — Gitea Actions only.** `.gitea/workflows/npm-publish.yml`
  publishes all three packages to Gitea's bundled registry for local package management.
  Uses the `NPM_TOKEN` secret — a **Gitea API token (`gta_…`)** with `package:write`
  (despite the name, it is NOT an npmjs.org token).
- **Releases:** Gitea release = `.gitea/workflows/gitea-release.yml`; GitHub release
  - mirror push = `.gitea/workflows/github-mirror.yml`.

### OIDC trusted publishers are per-package

Each package needs its **own** OIDC trusted publisher configured on npmjs.org,
pointed at `jmagly/aiwg`'s `.github/workflows/npm-publish.yml`. Configure the
same publisher tuple separately for `aiwg`, `@aiwg/cli`, and `@aiwg/cockpit`.
The `@aiwg/cli@0.0.0-bootstrap.0` reservation is not an AIWG release; real
publishes begin at the next shared AIWG CalVer.

### Gotchas (learned the hard way — #1648)

- **Publish a sub-package with the folder spec, never `--prefix`.** Cockpit is
  published from `./apps/cockpit`; the generated CLI staging package is
  published from `./dist/packages/cli`. Use `npm publish ./apps/cockpit …` or
  `npm publish ./dist/packages/cli …` as appropriate. `npm --prefix
  apps/cockpit publish` does **not** target the subdir — it republishes the root
  `aiwg` package, hits `409`, and the error handler swallows it as success, so the
  sub-package silently never publishes. Note the leading `./` — `npm publish
apps/cockpit` (no `./`) is read as a git spec and fails.
- **A brand-new scoped package may need a one-time manual bootstrap.** npm trusted
  publishing historically requires the package to exist before its per-package
  trusted publisher can be configured. Bootstrap once with
  `npm publish ./apps/<pkg> --access public --registry=https://registry.npmjs.org/ --otp=<code>`
  (no `--provenance` locally — that only works from CI OIDC), then OIDC takes over
  for subsequent releases.

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Calendar Versioning](https://calver.org/)
- [npm semver](https://docs.npmjs.com/cli/v6/using-npm/semver)
- [npm config: min-release-age](https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age)
- @CLAUDE.md - Release Documentation Requirements
- @docs/contributing/ci-cd-secrets.md - CI/CD configuration
- @docs/contributing/dependency-sources.md - Dependency source policy (A20)
- @.npmrc - Repo-root npm config (release-age gate lives here)
- @.aiwg/architecture/adr-pnpm-workspace-migration.md - Why npm not pnpm
- Issue #1290 — A15 release-age gate
- Issue #1278 — Wave 7 (Mini Shai-Hulud supply-chain hardening) epic
- Issue #1648 — cockpit publish targeting bug (`--prefix` vs folder spec)
- @.github/workflows/npm-publish.yml - npmjs.org publish (OIDC + provenance)
- @.gitea/workflows/npm-publish.yml - Gitea npm registry mirror
