# AIWG Cockpit — Release Pattern

`@aiwg/cockpit` is **opt-in and separately published** — it is NOT part of the
base `aiwg` npm package (guarded by `test/smoke/cockpit-base-footprint.test.js`).
This document formalizes how the cockpit release leg works alongside the base
AIWG release pipeline. It is the cockpit-specific companion to the base release
checklist in the repo root `CLAUDE.md`.

> Tracking: roctinam/aiwg#1637 (this doc + gate) · #1586 (release validation) ·
> #1628 (cockpit npm publish token).

## Channels

Cockpit follows the same CalVer (`YYYY.M.PATCH`, no leading zeros) channel
pipeline as the base package:

`dev → nightly → alpha → beta → rc → stable`

Pre-release tags are internal pipeline checkpoints — no CHANGELOG/announcement
per pre-release. `apps/cockpit/package.json` `version` tracks the base version in
lockstep (currently `2026.6.2`).

## Publish leg

The base tag flow (`tools/release/cut-tag.sh <X.Y.Z>` → signed tag → Gitea/GitHub
release) also drives the cockpit publish. `@aiwg/cockpit` publishes via its own
npm leg with `publishConfig.access: public`. The npm-token gap that blocked this
leg is tracked in **#1628** and MUST be resolved (token with publish scope for
the `@aiwg` org) before a cockpit stable tag is cut.

Dry-run the cockpit package before tagging:

```bash
npm --prefix apps/cockpit run pack:dry      # tarball contents (files allowlist)
npm --prefix apps/cockpit run publish:dry   # publish dry-run, public access
```

## Pre-tag gate (config-defaults are tested, #1634)

"Configs are sane defaults that are tested and working" is enforced, not assumed.
Before a cockpit release tag:

1. **Build + unit/integration/PoC** — must be green:

   ```bash
   npm --prefix apps/cockpit run check   # build:web + typecheck + render tests + smokes + PoCs
   npx vitest run test/integration/cockpit-bridge.test.js
   npx vitest run test/smoke/cockpit-base-footprint.test.js   # base-npm guard
   ```

2. **Default dev bring-up works** — the documented default invocation (Bridge on
   its off-range default `8140`, executor on canonical `8122`; see README "Ports")
   yields a connected Bridge against a real executor. The one-command bring-up
   script is tracked in #1634; until it lands, run the documented two-step launch
   from the README and confirm the UI binds inventory.

3. **Host-tier live smoke** — against a reachable real `agentic-sandbox`:

   ```bash
   AIWG_COCKPIT_EXECUTOR_URL=http://127.0.0.1:8122 \
   AIWG_COCKPIT_LIVE_REQUIRED=1 \
   npm run uat:cockpit-live
   ```

   Skips cleanly with a clear reason when no live sandbox is reachable, so it is
   safe in ordinary CI; required (`AIWG_COCKPIT_LIVE_REQUIRED=1`) for release
   validation. The full host/docker/VM matrix gate is #1621.

## Checklist (cockpit leg)

- [ ] `apps/cockpit/package.json` version in lockstep with base CalVer.
- [ ] `npm --prefix apps/cockpit run check` green.
- [ ] base-footprint guard green (cockpit absent from base `aiwg` tarball).
- [ ] `pack:dry` / `publish:dry` reviewed.
- [ ] default dev bring-up verified (README "Ports" defaults).
- [ ] host-tier live smoke green (or recorded blocker).
- [ ] #1628 publish-token resolved before stable publish.
- [ ] release evidence linked from #1586.

## See also

- Base release pipeline + `cut-tag.sh`: repo root `CLAUDE.md` → "Release Checklist".
- Real-integration UAT runbook: `.aiwg/testing/cockpit-real-integration-uat-runbook.md`.
- README "Run (dev/test…)" + "Ports" for the launch defaults this gate verifies.
