# Test Strategy: Web-Backed AIWG Resource Distribution

**Status**: Draft
**Date**: 2026-07-21
**Related**: #1847, #1853

## Scope

Validate that web-backed AIWG resources are functionally equivalent to local resources, reproducible by lockfile/digest, and safe under network, cache, and integrity failure modes.

## Unit Tests

- Version parser accepts exact versions, SemVer ranges, channel tags, and digest pins.
- Version precedence is per-call flag > environment > project config > user config > default.
- Channel tags that parse as SemVer are rejected.
- Resolver source mode dispatches correctly for `local`, `web`, and `auto`.
- Digest verification rejects mismatched manifests and bundles.
- Lockfile writer records selector, resolved version, source, manifest URL, and digests.
- Cache cleanup refuses locked versions without force.

## Integration Tests

- `aiwg discover` returns equivalent ranked records in local and web modes for representative framework/addon/core queries.
- `aiwg show` streams identical resource bodies by logical ID in local and web modes.
- `aiwg use sdlc --resource-source web --aiwg-version <exact>` deploys the same provider artifacts as local mode for a pinned release fixture.
- `aiwg regenerate` uses the locked resource version after a mutating command.
- `aiwg versions resolve stable` returns an immutable version and digest.
- Warm-cache `--offline` passes without network access.
- Cold-cache `--offline` fails with an actionable diagnostic and no partial writes.
- Incompatible CLI/resource schema fails before deployment.

## Security and Failure Tests

- Tampered bundle with correct URL and wrong digest fails closed.
- Tampered manifest signature fails before bundle download when signature verification is required.
- Channel rollback is detected when the client has already seen a newer monotonic channel state.
- Mix-and-match release metadata is rejected once TUF-style snapshot/timestamp metadata lands.
- Cache poisoning by replacing cached bytes is detected by digest re-check.

## Acceptance Gate

Web mode can leave experimental status only when:

- All tests above pass in CI.
- At least one real release is published to aiwg.io and consumed by a clean test workspace.
- Local mode remains the default and all existing local-resource tests pass unchanged.
- `aiwg doctor` reports clear state for local, web, auto, locked, offline, and degraded modes.
