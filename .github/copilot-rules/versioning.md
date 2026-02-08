# Versioning Rules

**Enforcement Level**: CRITICAL
**Scope**: All version bumps, releases, and changelog updates
**Version**: 1.0.0

## Overview

These rules enforce correct CalVer versioning format to prevent npm publishing failures.

## Mandatory Rules

### Rule 1: No Leading Zeros in Version Numbers

**FORBIDDEN**:
```json
"version": "2026.01.5"   // Leading zero in month
"version": "2026.1.05"   // Leading zero in patch
"version": "2026.01.05"  // Leading zeros in both
```

**REQUIRED**:
```json
"version": "2026.1.5"    // Correct format
"version": "2026.12.0"   // December is fine (not a leading zero)
```

### Rule 2: Version Format Must Be YYYY.M.PATCH

**Format**: `YYYY.M.PATCH`

| Component | Valid | Invalid |
|-----------|-------|---------|
| Year | `2026` | `26`, `202` |
| Month | `1`, `12` | `01`, `012` |
| Patch | `0`, `5`, `15` | `00`, `05` |

### Rule 3: Tag Format Must Match Version

**REQUIRED**:
```bash
# package.json: "version": "2026.1.5"
git tag -a v2026.1.5 -m "v2026.1.5 - Release Name"
```

**FORBIDDEN**:
```bash
# Mismatched formats
git tag -a v2026.01.5 ...  # Wrong: leading zero
git tag -a 2026.1.5 ...    # Wrong: missing 'v' prefix
```

### Rule 4: CHANGELOG Must Use Same Format

**REQUIRED**:
```markdown
## [2026.1.5] - 2026-01-14 – "Release Name"
```

**FORBIDDEN**:
```markdown
## [2026.01.5] - 2026-01-14 – "Release Name"
```

## Validation Before Release

Before ANY version bump or release, validate:

```bash
# Check package.json
grep '"version"' package.json

# Verify no leading zeros (should output nothing)
grep '"version"' package.json | grep -E '\.[0-9]{2}\.'
```

If the second command produces output, there's a leading zero that must be fixed.

## Why This Matters

npm's semver parser **rejects leading zeros**:

```bash
$ npm -g update aiwg
npm error Invalid Version: 2026.01.4  # FAILS

$ npm -g install aiwg
# Works but update is broken
```

Users can install but cannot update, causing confusion and support burden.

## When Bumping Versions

1. Identify current version: `grep '"version"' package.json`
2. Determine new version (increment PATCH, or reset for new month)
3. **Verify no leading zeros** in the new version
4. Update package.json
5. Update CHANGELOG.md with matching version
6. Commit, tag, push

## Examples by Month

| Month | Correct | Incorrect |
|-------|---------|-----------|
| January | `2026.1.0` | `2026.01.0` |
| February | `2026.2.0` | `2026.02.0` |
| September | `2026.9.0` | `2026.09.0` |
| October | `2026.10.0` | (already correct) |
| December | `2026.12.0` | (already correct) |

## References

- @docs/contributing/versioning.md - Full versioning documentation
- @CLAUDE.md - Release Documentation Requirements
- [Semantic Versioning](https://semver.org/) - No leading zeros rule

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-14
