# @matric/eval-client External NPM Supply-Chain Audit

Generated: 2026-05-23

## Scope

| Field | Value |
|---|---|
| Package | `@matric/eval-client` |
| Canonical upstream repository | private Gitea npm package metadata omits repository URL |
| Audited version/ref | `0.1.0` / `0.1.0` |
| npm registry signatures | 0 |
| Dependency source summary | (none) |
| Optional dependency summary | (none) |
| Peer dependency summary | `typescript >=5.0.0` |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/matric__eval-client.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `tools/eval/package.json` | `dependencies` | `^0.1.0` | `0.1.0` | yes | no | no | #1447 |

## Lockfile Tarballs

- tools/eval/package.json: https://git.integrolabs.net/api/packages/roctinam/npm/%40matric%2Feval-client/-/0.1.0/eval-client-0.1.0.tgz

## Lifecycle And Native/Binary Review

No lockfile install-script flag for the AIWG usage context reviewed.

Consumer install-time lifecycle scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than AIWG consumer install execution by default.

| Script | Command |
|---|---|
| (none) | (none) |

## Dependency Source Findings

- Package dependency specs reviewed from lockfile and npm metadata; no git, GitHub shorthand, file, link, or remote tarball dependency specs were identified for the direct package metadata summarized here.
- Transitive dependencies remain governed by `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.
- Private registry exception: `@matric/eval-client` resolves from the internal Gitea npm registry and must be trusted through AIWG organization package controls and lockfile integrity.

## Release And Provenance Evidence

- Resolved from https://git.integrolabs.net/api/packages/roctinam/npm/ private registry with lockfile integrity. Registry metadata does not expose signatures or gitHead.
- Audited ref uses npm `gitHead` where exposed; otherwise this report records the exact lockfile version and repository metadata.
- Trusted publishing/attestation evidence was not independently verified beyond npm registry signature metadata in this pass.
- Signed git tag verification was not established locally for this batch; deeper upstream review should verify tags only where upstream documents signed release tags.

## Findings

- LOW: registry signature/gitHead evidence was not exposed by npm metadata reviewed for this package.

## Clean Checks

- AIWG usage context is documented with manifest path, dependency field, requested spec, and lockfile version where present.
- Lockfile integrity is present for locked AIWG package entries.
- Native, binary, optional, and lifecycle behavior is explicitly recorded for applicable package classes.
- No immediate AIWG dependency change is required from this package alone.

## Follow-Up

- Track as review evidence for #1445, #1446, and/or #1447 according to the usage-context table.
- Open an AIWG child issue only if future verification finds a failing lockfile signature, unexpected lifecycle script, non-registry dependency source, or unverifiable private package provenance.
- Upstream issue/PR draft: use `_upstream-issue-template.md` if requesting signed release tags, provenance documentation, or clearer lifecycle-script disclosure from the upstream maintainer.
