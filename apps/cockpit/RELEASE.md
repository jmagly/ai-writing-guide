# AIWG Cockpit — Release Pattern

`@aiwg/cockpit` is **opt-in and separately published** — it is NOT part of the
base `aiwg` npm package (guarded by `test/smoke/cockpit-base-footprint.test.js`).
This document formalizes how the cockpit release leg works alongside the base
AIWG release pipeline. It is the cockpit-specific companion to the base release
checklist in the repo root `CLAUDE.md`.

> Tracking: roctinam/aiwg#1637 (this doc + gate) · #1586 (release validation).

## Channels

Cockpit follows the same CalVer (`YYYY.M.PATCH`, no leading zeros) channel
pipeline as the base package:

`dev → nightly → alpha → beta → rc → stable`

Pre-release tags are internal pipeline checkpoints — no CHANGELOG/announcement
per pre-release. `apps/cockpit/package.json` `version` tracks the base version in
lockstep.

## Publish leg

The base tag flow (`tools/release/cut-tag.sh <X.Y.Z>` → signed tag → Gitea/GitHub
release) also drives the cockpit publish. `@aiwg/cockpit` publishes via its own
npm leg with `publishConfig.access: public`. GitHub Actions publishes through
the package's npm trusted-publisher binding; no long-lived npm publish token is
required.

Dry-run the cockpit package before tagging:

```bash
npm --prefix apps/cockpit run pack:dry      # tarball contents (files allowlist)
npm --prefix apps/cockpit run publish:dry   # publish dry-run, public access
```

`prepack` performs a clean production web build in an isolated temporary
workspace with its own npm cache. The builder clears npm lifecycle flags such as
the `npm_config_dry_run` value inherited from `npm pack --dry-run`; otherwise a
nested `npm ci` can report success without installing the build dependencies.
It also pins that isolated dependency install to npmjs.org instead of inheriting
the outer publish registry; the Gitea package registry is not a public npm
proxy.
It then stages the completed `web/dist` generation under a cross-process lock,
so concurrent package checks cannot mutate `web/node_modules` or capture a
partial UI build. The packed artifact must contain `LICENSE`,
`web/dist/index.html`, and its hashed production assets; the CLI entry point
must start correctly when npm links it through a global `node_modules/.bin`
symlink.

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
   yields a connected Bridge against a real executor. Use the one-command
   bring-up (`npm run cockpit:up`, #1634) and confirm the UI binds inventory.

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
- [ ] `pack:dry` / `publish:dry` reviewed; LICENSE and compiled `web/dist` present.
- [ ] installed npm bin starts through a symlink and serves `/healthz` plus the compiled UI.
- [ ] default dev bring-up verified (README "Ports" defaults).
- [ ] host-tier live smoke green (or recorded blocker).
- [ ] npm trusted publisher is bound to `.github/workflows/npm-publish.yml`.
- [ ] release evidence linked from #1586.

## See also

- Base release pipeline + `cut-tag.sh`: repo root `CLAUDE.md` → "Release Checklist".
- Real-integration UAT runbook: `.aiwg/testing/cockpit-real-integration-uat-runbook.md`.
- README "Run (dev/test…)" + "Ports" for the launch defaults this gate verifies.
