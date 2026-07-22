# Architecture Impact Analysis: Web-Backed AIWG Resource Distribution

**Date**: 2026-07-21
**Status**: Proposed
**Change type**: Component addition with security-sensitive release/distribution behavior
**Risk level**: High until trust/rollback gates land; Medium for opt-in MVP

## Change Summary

AIWG will add a resolver that can load first-party resources from local package paths or versioned web bundles on `aiwg.io`. Operators can keep local resources, opt into web resources, or run hybrid `auto` mode. Per-call version selectors allow a single command to run against a specific AIWG resource version without reinstalling the CLI.

## Affected Components

| Component | Impact | Required work |
|---|---|---|
| CLI router/handler context | Add shared resource-source/version/offline options | Parser/context plumbing and tests |
| Discovery/show/index paths | Resolve resources through CLI resolver | Replace direct package-root path reads |
| `use`/regenerate/deploy paths | Lock resolved resource graph on mutation | Lockfile writes and parity tests |
| Package/marketplace cache | Reuse cache behavior for first-party resources | Cache layout, cleanup, lock awareness |
| Release pipeline | Publish resource manifests/bundles to aiwg.io | Build, sign, upload, and verify |
| Docs site | Serve immutable release resources and channel manifests | Static artifact layout and retention |
| Security docs/tests | Define chain of trust and failure modes | Trust-boundary docs, digest tests |

## API and Compatibility Impact

- New CLI flags: `--aiwg-version`, `--resource-source`, `--offline`.
- New command group: `aiwg versions`.
- New optional project file: `.aiwg/resources.lock.json`.
- Existing commands continue to default to local resources.
- Provider-facing bootstrap should keep using CLI calls and logical resource references.

## Data and Persistence Impact

- AIWG user cache stores immutable release bundles and channel manifests.
- Project lockfile records resolved resource versions and digests for mutating commands.
- Existing `.aiwg/aiwg.config` remains the place for desired default source/version policy.

## Security Impact

The web resource path is a supply-chain boundary. Required mitigations:

- HTTPS-only fetches.
- Digest verification on every manifest and bundle.
- Signed manifests before broad opt-in.
- TUF-style or equivalent snapshot/timestamp metadata before web mode can become default.
- Explicit failure for digest mismatch, unsigned required metadata, stale lock, yanked version, or offline cache miss.

## Migration Plan

1. **Planning and architecture**: land ADRs, requirements, research brief, and issue backlog.
2. **Resolver MVP**: add local/web/auto resolver behind opt-in flags.
3. **Version browse/resolve**: add `aiwg versions` commands and per-call selectors.
4. **Cache/lock**: add verified cache reads and `.aiwg/resources.lock.json`.
5. **Publication pipeline**: emit immutable resource bundles and channel manifests to aiwg.io.
6. **Parity hardening**: run local-vs-web discovery/show/use/regenerate tests.
7. **Default decision**: only revisit default web mode after trust and offline gates pass.

## Rollback Strategy

- Keep local resources as the default and fallback through at least one release after web mode ships.
- Allow `--resource-source local` and project config to force local-only behavior.
- Cache cleanup must preserve locked versions unless forced.
- If a published channel manifest is bad, revert the channel manifest to the previous known-good version; immutable release URLs are not rewritten.

## Acceptance Gate

- All local-vs-web parity tests pass.
- Offline mode passes against a warm cache and fails clearly against a cold cache.
- Digest mismatch tests fail closed.
- Docs explain CLI binary version vs resource bundle version.
- `aiwg doctor` reports source mode, selected version, cache status, and lock drift.
