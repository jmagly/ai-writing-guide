---
namespace: aiwg
name: bun-release-age-gate
platforms: [all]
description: Configure Bun's install.minimumReleaseAge gate (7-day default, 10-day high-sensitivity) for JavaScript projects on Bun. Includes Corepack-equivalent version detection and lockfile-caveat warning.
---

# bun-release-age-gate

Use this skill when a user has chosen Bun as their JavaScript runtime
and package manager and wants release-age-gate hardening parallel to
what `npm-release-age-gate`, `pnpm-release-age-gate`, and
`yarn-release-age-gate` provide for their respective ecosystems.

## Triggers

- "bun release age gate"
- "bun minimumReleaseAge"
- "bun supply chain hardening"
- "bun install hardening"

## Prerequisites

- Bun v1.1.30+ installed (`bun --version`)
- `package.json` exists at repo root
- `bunfig.toml` exists (or will be created) — Bun's config file

If Bun is below v1.1.30, the skill should refuse to proceed:
`install.minimumReleaseAge` was introduced in v1.1.30 and earlier
versions silently ignore it.

## Configuration

Add the gate to `bunfig.toml` at repo root:

```toml
[install]
# Refuse dependency versions published less than 7 days ago.
# Bun interprets the value in SECONDS. 604800 = 7 days; 864000 = 10 days.
# Defends against newly-published malicious versions.
minimumReleaseAge = 604800

# Optional: reject git+ and tarball-URL sources during install
# (Bun's equivalent of pnpm's blockExoticSubdeps — check current
# version's docs for the exact key name; the API is evolving)
# safeRegistry = true
```

## Unit conversion reference

Bun uses **seconds** for `install.minimumReleaseAge`:

| Days | Seconds value |
|---|---|
| 1 | `86400` |
| 7 (recommended default) | `604800` |
| 10 (high-sensitivity profile) | `864000` |
| 14 | `1209600` |
| 30 | `2592000` |

This differs from npm (**days**), pnpm (**minutes**), and Yarn
(**duration string** like `7d`). Document the unit inline when
committing the config so future readers don't misread it.

## Lockfile caveat

The gate is checked at resolution time. If `bun.lockb` was generated
without the gate, the gate applies on the NEXT resolution pass — not
retroactively against the existing lockfile.

To apply the gate retroactively:

```bash
# Force re-resolution
rm bun.lockb
bun install
```

This is destructive to existing pins. Coordinate before running.

## Version detection (Corepack-equivalent)

Bun is not currently in the Corepack supported set, but version
pinning is still important. The `packageManager` field in
`package.json` can pin Bun:

```bash
node -p "require('./package.json').packageManager"
```

If the value is `bun@<version>`, that's the pinned version (CI
should use this). If empty, recommend setting it:

```json
{
  "packageManager": "bun@1.1.30"
}
```

The skill should:

1. Confirm pinned version is ≥ v1.1.30 (else flag — gate is silently ignored)
2. Document the pinned version
3. If unpinned, suggest pinning before applying the gate

## Override policy

Genuine emergency overrides:

```bash
# Bypass the gate for a single install (rare)
bun add <pkg> --minimum-release-age=0
```

Document every override with reason + sunset date.

## CI integration

Add a verification step to the publish/build workflow:

```yaml
- name: Verify Bun gate active
  run: |
    set -euo pipefail
    GATE=$(grep -E '^\s*minimumReleaseAge\s*=' bunfig.toml | awk -F'=' '{print $2}' | tr -d ' ')
    if [ -z "$GATE" ] || [ "$GATE" -lt 604800 ]; then
      echo "✗ Bun install.minimumReleaseAge not configured to baseline (≥604800 = 7 days)"
      exit 1
    fi
    echo "✓ Bun install.minimumReleaseAge = $GATE seconds"
```

## What to inspect during review

- `bunfig.toml` for `[install] minimumReleaseAge`
- `package.json` `packageManager` field for Bun version pin
- CI workflow has the verification step above
- `bun.lockb` was generated AFTER the gate was committed (timestamp check)

## Output format

When auditing an existing Bun project, produce a structured report
at `.aiwg/security/working/bun-release-age-audit.md`:

```markdown
# Bun Release-Age Gate Audit

**Bun version**: <version>  (Pinned in package.json: yes/no)
**Gate active**: yes (604800s) / yes (864000s) / yes (custom: <value>) / no

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

## Bun-specific notes

Bun's install API is younger than npm/pnpm/Yarn — settings names have
changed across versions. The skill should:

- Check the installed Bun version's docs for the canonical setting name
- If `install.minimumReleaseAge` isn't recognized by the installed
  version, fall back to checking for older keys (`minReleaseAge`,
  `releaseAge`) and recommend upgrade

When in doubt, run `bun pm --help` and `bun install --help` to
discover the current supported flags.

## See Also

- [`npm-release-age-gate` skill](../npm-release-age-gate/SKILL.md) — npm equivalent
- [`pnpm-release-age-gate` skill](../pnpm-release-age-gate/SKILL.md) — pnpm equivalent
- [`yarn-release-age-gate` skill](../yarn-release-age-gate/SKILL.md) — Yarn equivalent
- [`npm-supply-chain-audit` skill](../npm-supply-chain-audit/SKILL.md) — companion audit
- [`supply-chain-hardening-quickstart` skill](../supply-chain-hardening-quickstart/SKILL.md) — orchestrator

## References

- Bun install settings: <https://bun.com/docs/runtime/bunfig#install>
- Bun `bunfig.toml` reference: <https://bun.com/docs/runtime/bunfig>
- Bun release notes for `minimumReleaseAge` introduction: check Bun changelog for v1.1.30
