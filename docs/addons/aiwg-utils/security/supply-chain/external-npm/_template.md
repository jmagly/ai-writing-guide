# <package> External NPM Supply-Chain Audit

Generated: <YYYY-MM-DD>

## Scope

| Field | Value |
|---|---|
| Package | `<npm-name>` |
| Canonical upstream repository | <url> |
| Audited version/ref | `<lockfile-version>` / `<tag-or-gitHead>` |
| npm registry signatures | <count or unknown> |
| Dependency source summary | <registry/git/file/link/tarball findings> |
| Provenance record path | `.aiwg/security/supply-chain/external-npm/<slug>.md` |

## AIWG Usage Contexts

| Manifest | Field | Spec | Lockfile Version | Integrity | Install Script | Optional Lock Entry | Tracking |
|---|---|---:|---:|---|---|---|---|
| `package.json` | `dependencies` | `^x.y.z` | `x.y.z` | yes | no | no | #issue |

## Lockfile Tarballs

- <manifest>: <resolved tarball URL or not locked>

## Lifecycle And Native/Binary Review

Document install-time scripts, native builds, prebuild downloads, optional platform packages, executable bins, model/runtime downloads, and consumer-supplied peer behavior.

| Script | Command |
|---|---|
| (none) | (none) |

## Dependency Source Findings

- Record git, GitHub shorthand, file, link, workspace, remote tarball, and private-registry dependency sources.
- Record whether `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures` cover the package.

## Release And Provenance Evidence

- npm metadata snapshot date:
- upstream tag/commit/ref:
- source acquisition command:
- registry signatures / trusted publishing / attestations:
- signed tag verification:

## Findings

- <severity>: <finding or clean-check limitation>

## Clean Checks

- <positive evidence>

## Follow-Up

- AIWG follow-up links:
- Upstream issue/PR draft links:
- Provenance record path:
