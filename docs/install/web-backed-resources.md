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

| Mode    | Behavior                                                                                        |
| ------- | ----------------------------------------------------------------------------------------------- |
| `local` | Use installed/project-local resources only. This is the default for the full `aiwg` package.    |
| `web`   | Resolve resources from versioned, signed release-host bundles with cache and integrity checks.  |
| `auto`  | Prefer local resources when present; otherwise fall back to web-backed resources.               |

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

`aiwg versions` resolves the same signed resource selectors without querying
or printing resource bodies:

```bash
aiwg versions list --json
aiwg versions list --channels stable,latest --json
aiwg versions resolve stable --json
aiwg versions resolve stable --write-lock
aiwg versions show 2026.7.18 --json --pretty
aiwg versions resolve stable --offline
```

Per-call overrides do not mutate project defaults.

### Selector Examples and Status

The current implementation accepts exact AIWG CalVer releases and signed
channel names:

```bash
aiwg discover "architecture evolution" --resource-source web --aiwg-version 2026.7.18
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg discover "architecture evolution" --resource-source web --aiwg-version latest
aiwg discover "architecture evolution" --resource-source web --aiwg-version canary
aiwg discover "architecture evolution" --resource-source web --aiwg-version main
```

The channel name selects a signed channel manifest; the release manifest still
resolves to an immutable version and manifest digest before the CLI reads any
resource bytes.

SemVer ranges and digest selectors are part of the larger resource-version
contract, but are intentionally not accepted by this beta slice:

```bash
# Planned, currently rejected with "Unsupported AIWG resource selector"
aiwg discover "architecture evolution" --resource-source web --aiwg-version '>=2026.7.18 <2026.8.0'
aiwg discover "architecture evolution" --resource-source web --aiwg-version sha256:...
aiwg versions resolve '>=2026.7.18 <2026.8.0'
aiwg versions resolve sha256:...
```

Use an exact CalVer or channel for `discover`, `show`, and `versions` until
range and digest selection are implemented.

## Web-Backed `versions`

- `versions list` resolves configured signed channels. By default it probes
  `stable`, `latest`, `canary`, and `main`; `--channels stable,latest` narrows
  the channel set.
- `versions resolve <selector>` prints the immutable version, manifest digest,
  release URL, cache directory, and Fortemi Core descriptor digests for an exact
  CalVer or channel selector.
- `versions show <selector>` resolves the selector and adds the verified
  manifest summary, including schema, compatibility metadata, bundle count, and
  file count.
- `--json`, `--pretty`, and `--offline` are supported.
- `resolve` and `show` can write `.aiwg/resources.lock.json` with
  `--write-lock`.
- The command uses the same trust root, cache root, release host, channel
  rollback protections, and manifest-signature verification as `discover` and
  `show`.

## Project Resource Lockfile

`aiwg versions resolve <selector> --write-lock` and
`aiwg versions show <selector> --write-lock` write the resolved immutable web
resource state to `.aiwg/resources.lock.json`. The path honors
`AIWG_ARTIFACTS_PATH` and `.aiwg-location`, so projects with a relocated AIWG
artifact root keep the lockfile beside `aiwg.config`.

The lockfile schema is `aiwg.resources-lock/v1`:

```json
{
  "schemaVersion": "aiwg.resources-lock/v1",
  "generatedAt": "2026-07-24T12:00:00.000Z",
  "resources": {
    "framework": {
      "source": "web",
      "selector": "stable",
      "selectorKind": "channel",
      "version": "2026.7.18",
      "manifestUrl": "https://releases.aiwg.io/resources/2026.7.18/manifest.json",
      "baseUrl": "https://releases.aiwg.io",
      "manifestSha256": "ef5a7112c593d5df90f7940c315a3d4a3d6d6e2a3bd9c063d87de1e811ad80c1",
      "channelSequence": 1,
      "fortemiCore": {
        "manifestSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        "manifestSize": 512,
        "exportSha256": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        "exportSize": 123456
      },
      "descriptorCount": 8067,
      "lockedAt": "2026-07-24T12:00:00.000Z"
    }
  }
}
```

This first lockfile slice records reproducible release identity. Cache cleanup
and doctor drift diagnostics are still planned in this epic.

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
- Release manifests are fetched from
  `https://releases.aiwg.io/resources/<version>/manifest.json` and verified
  against the adjacent detached signature before use.
- Channel manifests under `https://releases.aiwg.io/resources/channels/` bind a
  channel name and monotonic sequence to an exact release-manifest digest.
- Manifest descriptors commit every bundle, prebuilt index, and raw resource by
  byte size and SHA-256 digest; cache reads re-check those descriptors.
- `aiwg.resource-manifest/v2` compatibility metadata is required when a v2
  manifest is published, including the minimum compatible CLI version and known
  incompatible CLI ranges.
- Signed test and private hosts can be used with:
  - `AIWG_RESOURCE_BASE_URL`
  - `AIWG_RESOURCE_CACHE_ROOT`
  - `AIWG_RESOURCE_TRUST_ROOT_FILE`
  - `AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP=1`
- `AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP=1` is loopback-only and must only
  be used for local testing.
- Signature verification cannot be disabled.

## Troubleshooting

| Symptom | Meaning | Recovery |
| ------- | ------- | -------- |
| `fetch failed`, timeout, or HTTP error | The release host or network path was unavailable during an online web lookup. | Retry the command, use `--offline` only after a successful warm-cache run, or switch to `--resource-source local`. |
| `Unsupported AIWG resource selector` | The selector is not an exact CalVer release or channel name in this beta. | Use an exact version such as `2026.7.18` or a channel such as `stable`, `latest`, `canary`, or `main`. |
| `payload digest does not match`, `signature verification failed`, or descriptor digest errors | Signed metadata or resource bytes do not match the configured trust root and manifest commitments. | Treat as fail-closed. Do not bypass verification; retry with a fresh cache or use local mode while investigating. |
| `offline mode fails closed` or cold-cache errors | The requested release, index, or raw resource is missing from the verified cache, or cached bytes are corrupt. | Run the same command once online without `--offline` to warm the cache, then repeat offline. |
| `compatibility metadata is invalid` or unsupported manifest schema errors | The release manifest is malformed or requires a newer CLI/resource schema contract. | Upgrade the CLI package, then retry. Use local mode if the project must continue before the release-host issue is corrected. |

## Public Contract References

This page is the public operator contract for the web-backed resource beta. The
current source and test coverage live in:

- `src/resources/web-release.ts`
- `test/unit/resources/web-release.test.ts`
- `test/integration/artifacts/web-resource-cli.test.ts`
- `test/integration/cli-package-webmode.test.ts`
- `docs/releases/v2026.7.18-announcement.md`
- `docs/releases/v2026.7.19-announcement.md`

The broader SDLC ADRs and test strategy remain in the project artifact corpus;
public release notes summarize the supported rollout status and default-local
behavior.

## Planned in this Epic but Not Yet Implemented

- SemVer range version selectors.
- Web behavior for `aiwg use`/`aiwg regenerate`.
- Lock-aware cache cleanup and doctor lock drift diagnostics.
- Web parity for project/codebase graph operations.
