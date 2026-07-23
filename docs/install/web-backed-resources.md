# Web-Backed AIWG Resources

**Status**: Beta / framework discovery and lookup

AIWG has a beta implementation for web-backed resource loading. The
full `aiwg` distribution continues to default to its bundled local corpus. The
lightweight `@aiwg/cli` distribution defaults to the signed `stable` web
channel because it intentionally does not bundle that corpus.

Operator workflows remain command-driven and unchanged. Source selection is
automatic for the normal package choice and can be overridden per call.

Release artifacts are hosted at `releases.aiwg.io` (not `aiwg.io/resources`),
and the public AIWG website remains separate.

## Lightweight CLI Distribution

Web-backed use does not require the full npm corpus package. Install the
CalVer-locked CLI package instead:

```bash
npm install --global @aiwg/cli@latest
aiwg discover "architecture evolution"
aiwg show skill architecture-evolution
```

`@aiwg/cli` and `aiwg` always publish with the exact same AIWG CalVer. The npm
package version selects CLI behavior; `--aiwg-version` independently selects
the signed resource release for a call. The CLI package contains executable
and API code only. It does not contain the default framework/addon corpus. Both
the installed executable and the package's exported CLI API apply the same
default, without project configuration.

## Relocating Project AIWG Artifacts

AIWG project artifacts do not have to live at `./.aiwg`. Maintainer checkouts
can point AIWG at a renamed or external artifact directory:

```bash
export AIWG_ARTIFACTS_PATH=../aiwg-web-release-ops/corpus/.aiwg
aiwg config show --project
```

This is the local bridge for AIWG's own private SDLC corpus. See
[Private AIWG Corpus](../development/private-aiwg-corpus.md) for maintainer
setup.

## Source Modes

| Mode    | Behavior                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------- |
| `local` | Use installed/project-local resources only. This is the default for the full `aiwg` package.    |
| `web`   | Resolve resources from versioned, signed release-host bundles with cache and integrity checks. |
| `auto`  | Prefer local resources when present; otherwise fall back to web-backed resources.              |

For `discover` and `show`, `@aiwg/cli` selects `web` and the signed `stable`
channel when no source/version flags are supplied. Explicit
`--resource-source local|web|auto` and `--aiwg-version` values always win.

## Current Implemented Commands and Flags

`aiwg discover` and `aiwg show` currently support:

- `--resource-source local|web|auto`
- `--aiwg-version <exact-version-or-channel>`
- `--offline`

Examples:

```bash
aiwg discover "architecture evolution"
aiwg discover "architecture evolution" --resource-source local
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg discover "architecture evolution" --resource-source auto --aiwg-version 2026.7.18
aiwg discover "architecture evolution" --resource-source web --offline

aiwg show skill architecture-evolution
aiwg show skill architecture-evolution --resource-source web --aiwg-version 2026.7.18
aiwg show framework sdlc --resource-source web --aiwg-version candidate
aiwg show framework sdlc --resource-source web --offline
```

Per-call overrides do not mutate project defaults.

### Current query constraints

Web-backed `discover` and `show` currently operate on the `framework` graph and
use the `fortemi-core` backend. Combining `--resource-source web` with another
graph or with `--backend local` fails explicitly. `auto` may use installed
local resources first, but its web fallback has the same constraints.

These restrictions keep web search behavior aligned with the signed,
precomputed Fortemi Core framework export. Project and codebase graphs remain
local because they describe the operator's workspace rather than the published
AIWG corpus.

## Web-Backed `discover`

- `discover` currently uses `--resource-source web|auto` in this slice.
- The web path supports only `--graph framework` and `--backend fortemi-core`.
- Channel and exact version values are both supported; SemVer ranges are planned
  but not yet implemented.
- The CLI downloads the signed release raw/prebuilt artifacts
  (`prebuilt/fortemi-core/framework/manifest.json` and
  `prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json`) and verifies
  signatures before use.
- Cache entries are keyed by exact version plus manifest digest.
- Discovery queries are executed through `@fortemi/core` using cached v2 export data.
- Chunk summaries returned by browser/chat discovery are for navigation only and
  are not a source-of-truth content stream.

## Web-Backed `show`

- `show` for web mode fetches a signed, manifest-committed raw resource.
- The web path supports only the framework graph through the Fortemi Core
  backend.
- The downloaded payload body is verified and cached as bytes.
- Offline runs read only the verified cached body bytes.

## Trust and Local Override

- The trust root is bundled with the CLI and signature verification is mandatory.
- Signed test and private hosts can be used with:
  - `AIWG_RESOURCE_BASE_URL`
  - `AIWG_RESOURCE_CACHE_ROOT`
  - `AIWG_RESOURCE_TRUST_ROOT_FILE`
  - `AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP=1`
- `AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP=1` is loopback-only and must only
  be used for local testing.
- Signature verification cannot be disabled.

## Planned in this Epic but Not Yet Implemented

- SemVer range version selectors.
- `aiwg versions` command family.
- Web behavior for `aiwg use`/`aiwg regenerate`.
- Lockfile persistence for resolved web versions.
- Web parity for project/codebase graph operations.
