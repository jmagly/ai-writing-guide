# ADR: Do not operate a public model catalog feed yet

Status: accepted  
Date: 2026-07-20  
Decision owners: AIWG maintainers  
Related: #1813, #1815, #1816

## Context

AIWG can optionally read a remote `model-catalog.v1.json`, but runtime model
routing does not require one. It already has three stronger local properties:

1. provider inventory prevents probes against merely configured providers;
2. native discovery reports account/runtime-local models where a stable
   provider interface exists;
3. a committed, schema-reviewed catalog is the deterministic offline fallback.

A nightly public feed would be useful only if it had authoritative,
entitlement-neutral upstream data for providers without native enumeration.
No such common source exists. Provider marketing/model pages do not prove CLI
availability, and local account observations must not be generalized.

## Decision

Do not publish or schedule `docs.aiwg.io/data/model-catalog.v1.json` at this
time. Keep remote-feed support operator-configured through `--url` or
`AIWG_MODEL_CATALOG_URL`; AIWG has no built-in production feed URL.

The authoritative sources remain:

- provider-native discovery for local account/runtime observations;
- provider primary documentation for reviewed committed mappings;
- `agentic/code/providers/model-catalog.v1.json` as the release-controlled
  fallback.

Account-scoped or local-runtime discovery output is prohibited from public
catalog publication. It may exist only in the user cache and drift report.

## Operational consequences

- Ordinary `aiwg show`, deployment, and `aiwg models sources` remain offline.
- `aiwg models refresh` performs native discovery and contacts a remote feed
  only when the operator explicitly configures one.
- Missing, invalid, unauthenticated, rate-limited, or unavailable feeds fall
  back to the committed catalog and record the remote error.
- There is no nightly job, feed monitor, rollback procedure, or production URL
  to own while the decision is “do not operate.”
- Catalog changes continue through normal review, schema validation, tests,
  signed commits, and release CI.

## Conditions for reversal

Enabling a feed requires a new reviewed change that provides all of:

1. authoritative upstream sources for every published row;
2. a schema version and per-row provenance/freshness metadata;
3. an explicit filter rejecting `local-account` and `local-runtime` records;
4. generated drift for human review rather than silent canonical mutation;
5. atomic publication, last-known-good rollback, freshness monitoring, and a
   named operational owner;
6. tests proving feed failure cannot change offline deployment behavior.

Until those gates are met, a hosted feed would add operational and
supply-chain risk without improving the truth of account-specific routing.
