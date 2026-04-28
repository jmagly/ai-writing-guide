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

```bash
# Create signed release commit (if not already committed)
git commit -S -m "release: v2026.1.5 \"Release Name\""

# Create annotated tag
git tag -s v2026.1.5 -m "v2026.1.5 - Release Name"

# Push to Gitea (triggers automatic Gitea release + publish workflows)
git push origin main --tags

# Optional: mirror tag/commit to GitHub
git push github main --tags

# GitHub release remains manual
gh release create v2026.1.5 --repo jmagly/aiwg --title "v2026.1.5 - Release Name" --generate-notes
```

**Sandboxed agent note**: If release operations run inside a filesystem/network sandbox, request **escalated execution** for signed `git commit`/`git tag` commands so GPG can access `~/.gnupg` and the local gpg-agent socket.

### 4. Verify Published Version

After CI/CD completes:

```bash
npm view aiwg version
# Should show: 2026.1.5
```

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
