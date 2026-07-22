# Roadmap: Web-Backed AIWG Resource Distribution

**Status**: Draft
**Date**: 2026-07-21

## Delivery Shape

Ship this as an opt-in major feature in phases. The first implementation proves local/web parity and reproducibility. A later gate may decide whether web-backed resources become the default.

## Phase 0: Planning Artifacts

- Land ADRs:
  - `.aiwg/architecture/adr-web-backed-resource-addressing.md`
  - `.aiwg/architecture/adr-aiwg-resource-version-resolution.md`
  - `.aiwg/architecture/adr-aiwg-resource-cache-and-lockfile.md`
  - `.aiwg/architecture/adr-aiwg-io-resource-publication-trust.md`
- Land requirements and test strategy.
- File implementation and research issues.
- Keep monetization-sensitive release-host operations and private `.aiwg` corpus migration artifacts in the private release-operations repo.

## Phase 1: Resolver MVP

- Add a CLI-owned resource resolver with `local`, `web`, and `auto` modes.
- Keep existing local behavior as default.
- Add shared command context parsing for resource flags.
- Add tests that prevent command handlers from bypassing the resolver for AIWG-owned resources.
- Preserve the documented `AIWG_ARTIFACTS_PATH` behavior so local maintainers can point project artifacts at the private corpus checkout.

## Phase 2: Version Browsing and Per-Call Selection

- Add `aiwg versions list/show/resolve`.
- Support exact versions, SemVer ranges, tags, and digest pins.
- Emit resolved version and digest in command telemetry.
- Ensure per-call flags do not mutate project config.

## Phase 3: Cache and Lockfile

- Add verified cache reads/writes.
- Add `.aiwg/resources.lock.json` for mutating commands.
- Add offline behavior and `aiwg doctor` diagnostics.
- Add lock-aware cache cleanup.

## Phase 4: Release Host Publication Pipeline

- Build immutable release resource bundles.
- Provision the dedicated release-artifact subdomain, planned as `releases.aiwg.io`, separately from the public `aiwg.io` site.
- Publish release manifests, signatures, bundle digests, and channel manifests.
- Add release verification job that downloads and resolves a published bundle in a clean workspace.
- Retain immutable releases indefinitely.
- Keep the host boundary compatible with future private or paid access controls.

## Phase 5: Trust Hardening and Default Decision

- Add TUF-style or equivalent signed snapshot/timestamp metadata.
- Add rollback, freeze, and mix-and-match tests.
- Run local-vs-web parity across supported provider deployments.
- Decide whether to prompt in wizard, keep opt-in, or make web mode the default for new installs.

## Issue Map

Issue links are populated after tracker filing.

| Work item | Tracker |
|---|---|
| Epic: web-backed resource distribution | #1847 |
| Resolver abstraction | #1848 |
| Version browse and per-call selection | #1849 |
| Cache and lockfile | #1850 |
| Release host publication pipeline | #1851 |
| Supply-chain trust hardening | #1852 |
| Parity/offline test suite | #1853 |
| Operator documentation | #1854 |
| Research induction | #1855 |
| Project artifact root relocation regression | #1856 |
| Remaining project artifact hardcoded path audit | #1857 |
