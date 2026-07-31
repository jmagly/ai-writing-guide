# @hono/node-server External NPM Supply-Chain Audit

Generated: 2026-07-31

## Scope

| Field | Value |
|---|---|
| Package | `@hono/node-server` |
| Canonical upstream repository | https://github.com/honojs/node-server.git |
| Audited version/ref | `2.0.11` / npm registry artifact |
| npm registry signatures | 1 |
| Dependency source summary | (none) |
| Optional dependency summary | (none) |
| Peer dependency summary | `hono` |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/hono__node-server.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `optionalDependencies` | `2.0.11` | `2.0.11` | yes | no | yes | #1973 |
| `packages/cli/package.json` | `optionalDependencies` | `2.0.11` | workspace root lock | yes | no | yes | #1973 |

## Lockfile Tarballs

- package.json: https://registry.npmjs.org/@hono/node-server/-/node-server-2.0.11.tgz
- SHA-512 integrity: `sha512-bjD221KPLoJTWUwso1J6fGKiTXEUFedG/s0visavY4zakFPkeGURMRNly+FhBHs7T8Dz4qHaZIMX9ZoJHSJtKA==`

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| `prerelease` | `bun run build && bun run test` |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Registry metadata and the locked artifact were reviewed on 2026-07-31.
- `2.0.11` was selected instead of four-day-old `2.0.12` because it is the
  newest fixed release satisfying AIWG's seven-day npm release-age gate.
- The v2 package requires Node.js 20 or newer, matching AIWG's declared runtime.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- GHSA-frvp-7c67-39w9 affects versions below `2.0.5`; the locked `2.0.11`
  artifact is outside the vulnerable range.
- LOW: maintainer-side lifecycle scripts exist; verify release custody before relying on upstream release artifacts.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- `npm audit --json` no longer reports `@hono/node-server` or `aiwg` for
  GHSA-frvp-7c67-39w9 after the migration.
- The root, `@aiwg/cli`, feature catalog, and lockfile all resolve `2.0.11`.
- Serve, WebSocket, Cockpit-facing static delivery, and encoded-backslash
  regression tests pass against the v2 adapter surface.

## Follow-Up

- Track this migration and regression evidence in #1973.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
