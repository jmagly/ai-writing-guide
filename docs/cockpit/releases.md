# Cockpit Releases

`@aiwg/cockpit` is opt-in and separately published. It is **not** part of the
base `aiwg` npm package — a base-footprint smoke test in CI proves the base
tarball ships no Cockpit files — and its version tracks the base AIWG CalVer
version in lockstep.

## Channels

Cockpit follows the same CalVer (`YYYY.M.PATCH`, no leading zeros) channel
pipeline as the base package:

```text
dev → nightly → alpha → beta → rc → stable
```

Pre-release tags are internal pipeline checkpoints — no CHANGELOG entry or
announcement per pre-release; the stable release documents everything that
accumulated.

## Publish leg

The base signed-tag flow (`tools/release/cut-tag.sh`) drives the Cockpit
publish as its own npm leg with public access. Dry-run the package before any
tag:

```bash
npm --prefix apps/cockpit run pack:dry      # tarball contents (files allowlist)
npm --prefix apps/cockpit run publish:dry   # publish dry-run
```

The published package ships the Bridge, contributions, runtime docs,
shell-core, the built web app, and the shells as source (the VS Code
extension and Tauri desktop are not separate npm packages). The mock executor
is never published.

## Pre-tag gate

"Configs are sane defaults that are tested and working" is enforced, not
assumed. Before a Cockpit release tag:

1. **Build + unit/integration/PoC green** —
   `npm --prefix apps/cockpit run check`, the Bridge integration contract
   test, and the base-footprint guard.
2. **Default bring-up verified** — the documented defaults (Bridge on 8140,
   executor on canonical 8122) yield a connected Bridge against a real
   executor via the one-command bring-up
   ([Development](./development.md#one-command-bring-up)).
3. **Host-tier live smoke** — `AIWG_COCKPIT_LIVE_REQUIRED=1
   npm run uat:cockpit-live` against a reachable real agentic-sandbox.
4. The full host/docker/VM **release matrix**
   ([Development → Verification tiers](./development.md#verification-tiers))
   backs the release evidence.

## Canonical checklist

The authoritative, maintained checklist and tracking references live with the
code:
[`apps/cockpit/RELEASE.md`](https://github.com/jmagly/aiwg/blob/main/apps/cockpit/RELEASE.md).
The base release pipeline it plugs into is documented in the repo root
`CLAUDE.md` → "Release Checklist".
