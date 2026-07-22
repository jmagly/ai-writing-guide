# ADR: AIWG Resource Cache and Lockfile

**Status**: Proposed
**Date**: 2026-07-21
**Related**: #1847, #1850, `.aiwg/architecture/adr-aiwg-resource-version-resolution.md`

## Context

Web-backed resources create two operational requirements that local-only installs did not have:

1. A command must be reproducible after a mutable selector such as `stable` or `^2026.7.0` resolves.
2. Offline and degraded-network behavior must be deliberate rather than accidental.

AIWG already has installed-package and marketplace cache concepts. Web-backed first-party resources should reuse that operational model but keep a distinct lock because project reproducibility depends on which AIWG resource graph was used, not only which package was installed.

## Decision

Add a resource cache and project lockfile:

```text
<aiwg-user-cache>/resources/
  releases/<version>/
    manifest.json
    manifest.sig
    bundles/
  tags/
    stable.json
    latest.json
    canary.json
    main.json

.aiwg/resources.lock.json
```

The lockfile records resolved immutable state:

```json
{
  "version": "1",
  "generatedAt": "2026-07-21T00:00:00Z",
  "resources": {
    "aiwg-core": {
      "selector": "stable",
      "resolvedVersion": "2026.7.15",
      "source": "web",
      "manifestUrl": "https://aiwg.io/resources/2026.7.15/manifest.json",
      "manifestDigest": "sha256:...",
      "bundleDigests": {
        "frameworks/sdlc": "sha256:..."
      }
    }
  }
}
```

Rules:

- Read-only commands may resolve without updating the project lock unless explicitly requested.
- Mutating commands that deploy or regenerate provider artifacts update the lock with the exact resource graph used.
- `--offline` allows only already-cached resources whose digests match the lock or the exact digest selector.
- Cache hits are valid only when the cached bytes match the locked or manifest-published digest.
- Cache cleanup must not delete a locked version unless the operator explicitly passes a force option.

## Consequences

### Positive

- Deployment/regeneration can be reproduced from exact resource versions.
- Offline mode becomes testable and predictable.
- Mutable channel convenience does not erase auditability.

### Negative

- The project has one more generated metadata file.
- Lockfile drift must be diagnosed by `aiwg doctor`.
- Cache cleanup needs lock awareness.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Lockfile becomes a second source of desired policy | Treat it as resolved state only; desired selectors remain in flags/config. |
| Cache poisoning | Verify every cache read against digest metadata before use. |
| Old locked resource removed from aiwg.io | Immutable release URLs must remain available; cache can provide fallback, but publication policy must prohibit deletion. |

## References

- `.aiwg/architecture/adr-unified-registry-shape.md`
- `docs/providers/marketplace-consumer.md`
- `https://docs.npmjs.com/cli/v8/commands/npm-install`
- `https://specs.opencontainers.org/image-spec/`
