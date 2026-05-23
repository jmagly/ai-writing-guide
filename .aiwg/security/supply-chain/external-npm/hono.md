# hono External NPM Supply-Chain Audit

Generated: 2026-05-23

## Scope

| Field | Value |
|---|---|
| Package | `hono` |
| Canonical upstream repository | https://github.com/honojs/hono.git |
| Audited version/ref | `4.12.18` / `f10dee89ced5956b73c1cdc416d6bc0fd54d63b7` |
| npm registry signatures | 1 |
| Dependency source summary | (none) |
| Optional dependency summary | (none) |
| Peer dependency summary | (none) |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/hono.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `optionalDependencies` | `^4.12.18` | `4.12.18` | yes | no | yes | #1445 |

## Lockfile Tarballs

- package.json: https://registry.npmjs.org/hono/-/hono-4.12.18.tgz

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| `prerelease` | `bun test:deno && bun run build` |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Registry metadata reviewed on 2026-05-23; npm dist signature count: 1.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- LOW: maintainer-side lifecycle scripts exist; verify release custody before relying on upstream release artifacts.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- No immediate AIWG dependency change is required from this package alone.

## Follow-Up

- Track as review evidence for #1445, #1446, and/or #1447 according to the usage-context table.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
