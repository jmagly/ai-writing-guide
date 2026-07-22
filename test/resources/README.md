# Web-resource regression suite

## Test Context

- **Code to test**: `src/resources/web-release.ts`, the web-backed paths in
  `src/artifacts/query-engine.ts`, and `src/artifacts/cli.ts`.
- **Testing framework**: Vitest on Node.js 20+.
- **Coverage target**: at least 80% lines/statements, 75% branches, and 90%
  functions for the resolver; signature, digest, rollback, offline, and
  atomic-cache paths are critical.
- **Test types**: resolver unit tests and artifact CLI integration tests.
- **External dependencies mocked or isolated**: the release host is a
  deterministic in-process loopback HTTP server; offline fetch is replaced with
  a throwing spy; CLI tests configure the source CLI through the same
  `AIWG_RESOURCE_*` environment settings used by the real application.
- **Edge cases**: malformed selectors and URLs, wrong trust root,
  release/nested/index schema and digest failures, unsafe raw paths,
  rollback/equivocation, FIFO and symlink races, cold/corrupt offline caches,
  tampered downloads, and local-fallback exclusion.

## Test data, fixtures, and mocks

`test/fixtures/web-resource-release.ts` generates a fresh Ed25519 keypair and
signs exact-release and channel metadata. It serves the production layout under
`/resources/<version>/...` and `/resources/channels/...`. Its Fortemi payload is
a minimal `aiwg.fortemi.index.export.v2` containing one complete `aiwg.skill`
record and deliberately contains no discovery/search chunks.

The loopback server is the HTTP fixture and external-service stub. Tests inject
its public key as the trust root and opt into the explicit insecure-loopback
escape hatch; they do not change global TLS behavior. Throwing fetch spies prove
that every offline path makes zero requests.

## Scenarios

- Exact and channel signature verification, including injected-key mismatch.
- Release manifest, nested Fortemi manifest, and Fortemi export digest/schema
  validation.
- Selector, base URL, and raw-path safety boundaries.
- Channel rollback and same-sequence equivocation rejection.
- Complete-generation markers, failed-stage cleanup, and preservation of a
  prior valid generation.
- Warm, cold, and corrupt offline behavior with zero fetches.
- Artifact CLI `discover --resource-source web --aiwg-version <exact> --json`
  using the downloaded precomputed index and reporting signed-release
  provenance.
- Artifact CLI `show` returning byte-identical signed raw content, then
  returning the same body warm/offline while a conflicting local file exists.

## Running

```sh
npx vitest run --config config/vitest.config.js \
  test/unit/resources/web-release.test.ts \
  test/integration/artifacts/web-resource-cli.test.ts
```

For focused resolver coverage, add `--coverage` and include
`src/resources/web-release.ts` in the coverage report.
