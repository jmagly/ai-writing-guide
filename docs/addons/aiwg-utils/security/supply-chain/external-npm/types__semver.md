# @types/semver External NPM Supply-Chain Audit

Generated: 2026-05-23

## Scope

| Field | Value |
|---|---|
| Package | `@types/semver` |
| Canonical upstream repository | https://github.com/DefinitelyTyped/DefinitelyTyped.git (types/semver) |
| Audited version/ref | `7.7.1` / `7.7.1` |
| npm registry signatures | 1 |
| Dependency source summary | (none) |
| Optional dependency summary | (none) |
| Peer dependency summary | (none) |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/types__semver.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `devDependencies` | `^7.7.1` | `7.7.1` | yes | no | no | #1446 |

## Lockfile Tarballs

- package.json: https://registry.npmjs.org/@types/semver/-/semver-7.7.1.tgz

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| (none) | (none) |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Registry metadata reviewed on 2026-05-23; npm dist signature count: 1.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- LOW: signed git tag verification was not established in this local audit; rely on npm registry signatures plus lockfile integrity until a deeper upstream tag audit is performed.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- No immediate AIWG dependency change is required from this package alone.

## Follow-Up

- Track as review evidence for #1445, #1446, and/or #1447 according to the usage-context table.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
