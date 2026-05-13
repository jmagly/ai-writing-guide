---
namespace: aiwg
name: pnpm-release-age-gate
platforms: [all]
description: Configure pnpm's minimumReleaseAge gate (7-day default, 10-day high-sensitivity) plus blockExoticSubdeps for workspace-scope dep-source enforcement. Includes Corepack detection and lockfile-caveat warning.
---

# pnpm-release-age-gate

Use this skill when a user has chosen pnpm as their package manager
and wants to apply the same release-age-gate hardening that
`npm-release-age-gate` provides for npm. pnpm is often the **preferred
baseline** for new projects because `minimumReleaseAge` AND
`blockExoticSubdeps` can be enforced at the workspace level — npm
has no equivalent for the latter.

## Triggers

- "pnpm release age gate"
- "pnpm minimumReleaseAge"
- "pnpm blockExoticSubdeps"
- "pnpm supply chain hardening"
- "configure pnpm 7 day gate"

## Prerequisites

- pnpm v9.0+ installed (`pnpm --version`)
- `package.json` exists at repo root

If pnpm is below v9.0, the skill should refuse to proceed and direct
the user to upgrade — `minimumReleaseAge` was introduced in v9.0 and
older versions silently ignore it.

## Configuration paths — pick one based on workspace shape

### Option A — Single-package repo (most common)

Add the gate to `.npmrc` at repo root:

```ini
# Refuse dependency versions published less than 7 days ago.
# pnpm interprets the value in MINUTES. 10080 = 7 days; 14400 = 10 days.
# Defends against newly-published malicious versions.
minimum-release-age=10080

# Reject git+, tarball-URL, file:, link: sources — these bypass
# registry signature verification (companion to npm-supply-chain-audit
# dep-source policy).
block-exotic-subdeps=true
```

### Option B — Multi-package workspace

Add the gate to `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'

# Workspace-scope release-age enforcement.
# Value is in MINUTES. 10080 = 7 days; 14400 = 10 days.
minimumReleaseAge: 10080

# Reject non-registry dep sources fleet-wide.
blockExoticSubdeps: true
```

Workspace-scope is the pnpm advantage over npm — every nested package
inherits the gate without per-package config.

### Option C — Operator-wide via pnpm global config

```bash
pnpm config set minimum-release-age 10080  # minutes — 7 days
pnpm config set block-exotic-subdeps true
```

Use this only when the entire dev machine should apply the gate
across all projects. Per-repo config (Option A or B) is preferred —
it travels with the repo and works in CI without machine setup.

## Unit conversion reference

pnpm uses **minutes** for `minimumReleaseAge`:

| Days | Minutes value |
|---|---|
| 1 | `1440` |
| 7 (recommended default) | `10080` |
| 10 (high-sensitivity profile) | `14400` |
| 14 | `20160` |
| 30 | `43200` |

This differs from npm (`min-release-age` in **days**) and Bun
(`install.minimumReleaseAge` in **seconds**). Document the unit
inline when committing the config so future readers don't misread it.

## Lockfile caveat

The gate must be active **before** `pnpm install` or `pnpm update`
resolves dependencies. If the existing `pnpm-lock.yaml` was generated
without the gate, the gate is checked on the NEXT resolution pass —
not retroactively against the lockfile.

To apply the gate retroactively:

```bash
# Force re-resolution with the gate active
rm pnpm-lock.yaml
pnpm install
```

This is destructive to existing pins and may pull in newer
intermediate versions. Coordinate with the team before running.

## Corepack detection

Check whether the project pins a pnpm version via Corepack:

```bash
node -p "require('./package.json').packageManager"
```

Output like `pnpm@9.15.0` means Corepack will use that exact version
in CI. The skill should:

1. Confirm the pinned version is ≥ v9.0 (else flag — gate is silently ignored)
2. Document the pinned version in the audit output
3. Suggest a Corepack pin if the project doesn't have one yet:
   ```bash
   corepack use pnpm@latest
   # writes packageManager to package.json
   ```

## Override policy

Genuine emergency overrides:

```bash
# One-off install bypassing the gate
pnpm install <pkg>@<version> --ignore-min-release-age

# Permanently allow a specific package (rare; record rationale in
# a SECURITY-OVERRIDE.md or equivalent)
```

Document every override with reason + sunset date. Overrides should
be reviewed quarterly.

## CI integration

Add a verification step to the publish/build workflow:

```yaml
- name: Verify pnpm gate active
  run: |
    set -euo pipefail
    AGE=$(pnpm config get minimum-release-age 2>/dev/null || echo "0")
    EXOTIC=$(pnpm config get block-exotic-subdeps 2>/dev/null || echo "false")
    if [ "$AGE" -lt 10080 ] || [ "$EXOTIC" != "true" ]; then
      echo "✗ pnpm gate not configured to baseline (minimumReleaseAge≥10080, blockExoticSubdeps=true)"
      exit 1
    fi
    echo "✓ pnpm gate active: $AGE minutes, blockExoticSubdeps=$EXOTIC"
```

## What to inspect during review

- `.npmrc` OR `pnpm-workspace.yaml` for `minimumReleaseAge` and `blockExoticSubdeps`
- `package.json` `packageManager` field for Corepack pin
- CI workflow has the verification step above
- `pnpm-lock.yaml` was generated AFTER the gate was committed (timestamp check)

## Output format

When auditing an existing pnpm project, produce a structured report
at `.aiwg/security/working/pnpm-release-age-audit.md`:

```markdown
# pnpm Release-Age Gate Audit

**pnpm version**: <version>  (Corepack pinned: yes/no)
**Workspace shape**: single-package / multi-package
**Gate active**: yes (10080 min) / yes (custom: <value>) / no
**blockExoticSubdeps**: true / false / unset

## Findings

### <severity> — <description>

- File: <path>
- Issue: <what's wrong>
- Fix: <exact change>

## Clean Checks

- ...

## Recommendations

- ...
```

## See Also

- [`npm-release-age-gate` skill](../npm-release-age-gate/SKILL.md) — npm equivalent
- [`yarn-release-age-gate` skill](../yarn-release-age-gate/SKILL.md) — Yarn equivalent
- [`bun-release-age-gate` skill](../bun-release-age-gate/SKILL.md) — Bun equivalent
- [`npm-supply-chain-audit` skill](../npm-supply-chain-audit/SKILL.md) — companion audit
- [`supply-chain-hardening-quickstart` skill](../supply-chain-hardening-quickstart/SKILL.md) — orchestrator

## References

- pnpm `minimumReleaseAge`: <https://pnpm.io/settings#minimumreleaseage>
- pnpm `blockExoticSubdeps`: <https://pnpm.io/settings#blockexoticsubdeps>
- pnpm workspace settings: <https://pnpm.io/pnpm-workspace_yaml>
- Corepack: <https://github.com/nodejs/corepack>
