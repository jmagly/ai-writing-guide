# Web-Backed AIWG Resources

**Status**: Experimental / partially implemented

AIWG has an experimental implementation for web-backed resource loading. The
`local` source remains the default and continues to work as the stable path.

Operator workflows should remain command-driven and unchanged; source selection is controlled by per-call flags.

Release artifacts are hosted at `releases.aiwg.io` (not `aiwg.io/resources`),
and the public AIWG website remains separate.

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

| Mode | Behavior |
| --- | --- |
| `local` | Use installed/project-local resources only. This is the default for all commands. |
| `web` | Resolve resources from versioned, signed release-host bundles with cache and integrity checks. |
| `auto` | Prefer local resources when present; otherwise fall back to web-backed resources. |

## Current Implemented Commands and Flags

`aiwg discover` and `aiwg show` currently support:

- `--resource-source local|web|auto`
- `--aiwg-version <exact-version-or-channel>`
- `--offline`

Examples:

```bash
aiwg discover "architecture evolution" --resource-source local --aiwg-version 2026.7.16
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg discover "architecture evolution" --resource-source auto --aiwg-version 2026.7.16
aiwg discover "architecture evolution" --resource-source web --offline

aiwg show skill architecture-evolution --resource-source web --aiwg-version 2026.7.16
aiwg show framework sdlc --resource-source web --aiwg-version candidate
aiwg show framework sdlc --resource-source web --offline
```

Per-call overrides do not mutate project defaults.

## Web-Backed `discover`

- `discover` currently uses `--resource-source web|auto` in this slice.
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
- Repository-wide default-web mode decisions.
