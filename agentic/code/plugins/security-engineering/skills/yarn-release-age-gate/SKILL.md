---
namespace: aiwg
name: yarn-release-age-gate
platforms: [all]
description: Configure Yarn's npmMinimalAgeGate (7-day default, 10-day high-sensitivity) for JavaScript projects on Yarn 4.x or later. Includes Corepack detection and lockfile-caveat warning.
---

# yarn-release-age-gate

Use this skill when a user has chosen Yarn (Berry / v2+, current line
v4.x) as their package manager and wants release-age-gate hardening
parallel to what `npm-release-age-gate` and `pnpm-release-age-gate`
provide for their respective ecosystems.

## Triggers

- "yarn release age gate"
- "yarn npmMinimalAgeGate"
- "yarn 4 supply chain"
- "yarn berry hardening"

## Prerequisites

- Yarn 4.0+ (Berry) installed (`yarn --version`)
- `package.json` exists at repo root
- `.yarnrc.yml` exists (or will be created) — Berry's config file

If Yarn is below v4.0, the skill should refuse to proceed:
`npmMinimalAgeGate` was introduced in v4.0 and earlier Berry versions
(v2.x, v3.x) silently ignore the setting. Yarn Classic (v1.x) does
not support a release-age gate at all — recommend migration to Berry
or to pnpm/npm.

## Configuration

Add the gate to `.yarnrc.yml` at repo root:

```yaml
# Yarn 4.x release-age gate.
# Uses duration shorthand: 7d, 10d, 14d, 30d.
# Defends against newly-published malicious versions.
npmMinimalAgeGate: 7d

# High-sensitivity profile (use for publish-prep or major version bumps):
# npmMinimalAgeGate: 10d
```

Yarn accepts the value as a **duration string** (`Nd` for days, `Nh`
for hours), which is cleaner than npm's days-as-bare-int and pnpm's
minutes-as-int. Document the chosen value inline.

## Per-environment override (optional)

For CI-only enforcement (e.g., tighter gate in publish workflows than
in local dev):

```yaml
# .yarnrc.yml — apply 10d gate when running on CI, 7d locally
npmMinimalAgeGate:
  exclude:
    - pattern: "@your-scope/*"  # internal packages — gate doesn't apply
  default: 7d
  override:
    - if: "$YARN_ENABLE_STRICT_AGE_GATE"
      value: 10d
```

Environment-conditional values are a Yarn 4 advantage over npm and
pnpm (which require workflow-level wrapping).

## Lockfile caveat

The gate is checked at resolution time. If `yarn.lock` was generated
without the gate, the gate applies on the NEXT resolution pass — not
retroactively.

To apply the gate retroactively:

```bash
# Force re-resolution
rm yarn.lock
yarn install
```

This is destructive to existing pins. Coordinate before running.

## Corepack detection

Check whether the project pins a Yarn version via Corepack:

```bash
node -p "require('./package.json').packageManager"
```

Output like `yarn@4.5.0` means Corepack will use that exact version
in CI. The skill should:

1. Confirm pinned version is ≥ v4.0 (else flag — gate is silently ignored on Berry v2/v3)
2. Document the pinned version
3. Suggest a Corepack pin if the project doesn't have one:
   ```bash
   corepack use yarn@stable
   # writes packageManager to package.json
   ```

## Override policy

Genuine emergency overrides:

```bash
# Bypass the gate for a single install (rare)
YARN_NPM_MINIMAL_AGE_GATE=0 yarn add <pkg>
```

Document every override with reason + sunset date. Add the package
to the `.yarnrc.yml` `exclude` list if the bypass needs to persist
across installs.

## CI integration

Add a verification step to the publish/build workflow:

```yaml
- name: Verify Yarn gate active
  run: |
    set -euo pipefail
    GATE=$(yarn config get npmMinimalAgeGate 2>/dev/null || echo "")
    if [ -z "$GATE" ]; then
      echo "✗ Yarn npmMinimalAgeGate is unset"
      exit 1
    fi
    echo "✓ Yarn npmMinimalAgeGate = $GATE"
```

## What to inspect during review

- `.yarnrc.yml` for `npmMinimalAgeGate`
- `package.json` `packageManager` field for Corepack pin
- CI workflow has the verification step above
- `yarn.lock` was generated AFTER the gate was committed

## Output format

When auditing an existing Yarn project, produce a structured report
at `.aiwg/security/working/yarn-release-age-audit.md`:

```markdown
# Yarn Release-Age Gate Audit

**Yarn version**: <version>  (Corepack pinned: yes/no)
**Gate active**: yes (7d) / yes (10d) / yes (custom: <value>) / no
**Exclude list**: <list of excluded packages>

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
- [`pnpm-release-age-gate` skill](../pnpm-release-age-gate/SKILL.md) — pnpm equivalent
- [`bun-release-age-gate` skill](../bun-release-age-gate/SKILL.md) — Bun equivalent
- [`npm-supply-chain-audit` skill](../npm-supply-chain-audit/SKILL.md) — companion audit
- [`supply-chain-hardening-quickstart` skill](../supply-chain-hardening-quickstart/SKILL.md) — orchestrator

## References

- Yarn `npmMinimalAgeGate`: <https://yarnpkg.com/configuration/yarnrc#npmMinimalAgeGate>
- Yarn Berry (v4) docs: <https://yarnpkg.com/getting-started>
- Corepack: <https://github.com/nodejs/corepack>
