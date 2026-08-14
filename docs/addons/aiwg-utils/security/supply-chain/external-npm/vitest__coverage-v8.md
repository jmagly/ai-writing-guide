# @vitest/coverage-v8 External NPM Supply-Chain Audit

Generated: 2026-08-14

## Scope

| Field | Value |
|---|---|
| Package | `@vitest/coverage-v8` |
| Canonical upstream repository | https://github.com/vitest-dev/vitest.git (packages/coverage-v8) |
| Audited version/ref | `4.1.10` / `4.1.10` |
| npm registry signatures | 1 |
| Dependency source summary | `@bcoe/v8-coverage`, `ast-v8-to-istanbul`, `istanbul-lib-*`, `magicast` |
| Optional dependency summary | (none) |
| Peer dependency summary | `vitest`, `@vitest/browser (optional)` |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/vitest__coverage-v8.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `devDependencies` | `^4.1.10` | `4.1.10` | yes | no | no | #2055 |

## Lockfile Tarballs

- package.json: https://registry.npmjs.org/@vitest/coverage-v8/-/coverage-v8-4.1.10.tgz

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| `build` | `premove dist && rollup -c` |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Registry metadata reviewed on 2026-08-14; npm dist signature count: 1 and SLSA provenance attestation metadata is present.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- The registry exposes an npm attestation URL with an SLSA provenance v1 predicate; this pass did not independently validate the attestation statement.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- LOW: maintainer-side lifecycle scripts exist; verify release custody before relying on upstream release artifacts.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- No immediate AIWG dependency change is required from this package alone.

## Follow-Up

- Track as review evidence for #2055.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
