# better-sqlite3 External NPM Supply-Chain Audit

Generated: 2026-05-23

## Scope

| Field | Value |
|---|---|
| Package | `better-sqlite3` |
| Canonical upstream repository | https://github.com/WiseLibs/better-sqlite3.git |
| Audited version/ref | `12.8.0` / `fe774f578dde9e40d160fe7d4fa9f4148da8ffc8` |
| npm registry signatures | 1 |
| Dependency source summary | `bindings`, `prebuild-install` |
| Optional dependency summary | (none) |
| Peer dependency summary | (none) |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/better-sqlite3.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `peerDependencies` | `^12.8.0` | `(not locked)` | no | no | no | #1445 |

## Lockfile Tarballs

- package.json: (not locked)

## Lifecycle And Native/Binary Review

Optional peer; AIWG does not lock or install it by default. Consumer install downloads/uses prebuilds or compiles a SQLite native addon.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| `install` | `prebuild-install \|\| node-gyp rebuild --release` |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Release And Provenance Evidence

- Registry metadata reviewed on 2026-05-23; npm dist signature count: 1.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- MEDIUM: install-time lifecycle/native behavior requires controlled optional or maintainer install path.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- No immediate AIWG dependency change is required from this package alone.

## Follow-Up

- Track as review evidence for #1445, #1446, and/or #1447 according to the usage-context table.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
