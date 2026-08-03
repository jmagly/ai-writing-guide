# @modelcontextprotocol/sdk External NPM Supply-Chain Audit

Updated: 2026-08-03

## Scope

| Field | Value |
|---|---|
| Package | `@modelcontextprotocol/sdk` |
| Canonical upstream repository | https://github.com/modelcontextprotocol/typescript-sdk.git |
| Audited version/ref | `1.30.0` / npm registry release |
| npm registry signatures | 1 |
| Dependency source summary | `ajv`, `cors`, `cross-spawn`, `express`, `jose`, `raw-body`, `zod`, `@hono/node-server` |
| Optional dependency summary | (none) |
| Peer dependency summary | (none) |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/modelcontextprotocol__sdk.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `dependencies` | `^1.30.0` | `1.30.0` | yes | no | no | #1444, #1973 |
| `packages/cli/package.json` | `dependencies` | `^1.30.0` | `1.30.0` | yes | no | no | #1973 |
| `agentic/code/addons/droid-bridge/package.json` | `dependencies` | `^1.0.0` | `1.25.2` | yes | no | no | #1447 |

## Lockfile Tarballs

- package.json and packages/cli/package.json: https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.30.0.tgz
- agentic/code/addons/droid-bridge/package.json: https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.25.2.tgz

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| `prepack` | `npm run build:esm && npm run build:cjs` |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Uses npm registry signatures; release workflow uses npm publish/id-token markers in upstream metadata review.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- LOW: maintainer-side lifecycle scripts exist; verify release custody before relying on upstream release artifacts.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- Version 1.30.0 permits `@hono/node-server` v2, removing the Windows
  serve-static advisory route retained by the 1.29.0 dependency range.

## Follow-Up

- Track as review evidence for #1445, #1446, and/or #1447 according to the usage-context table.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
