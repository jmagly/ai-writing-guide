# graceful-fs External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.430Z

## Scope

| Field | Value |
|---|---|
| Package | `graceful-fs` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^4.2.11` |
| Resolved version | `4.2.11` |
| Lockfile tarball | https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/isaacs/node-graceful-fs.git |
| Audited ref | `v4.2.11` |
| Audited commit | `514861c372899df14beb7aaecca4cdbb498d7d11` |
| Local source path | `/tmp/aiwg-npm-audit-1444/graceful-fs-4.2.11` |

## Findings

- LOW: signed git tag verification not established locally: signed tag object present, but local GPG trust verification did not complete.

## Clean Checks

- AIWG lockfile resolves `graceful-fs` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v4.2.11` / `514861c372899df14beb7aaecca4cdbb498d7d11`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| (none) | (none) |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: signed tag object present, but local GPG trust verification did not complete
- Workflow files scanned: 5
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'graceful-fs@4.2.11' --json
git ls-remote --tags 'https://github.com/isaacs/node-graceful-fs.git'
git clone --depth 1 --branch 'v4.2.11' 'https://github.com/isaacs/node-graceful-fs.git' '/tmp/aiwg-npm-audit-1444/graceful-fs-4.2.11'
git -C '/tmp/aiwg-npm-audit-1444/graceful-fs-4.2.11' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/graceful-fs-4.2.11' tag -v 'v4.2.11'
rg --files '/tmp/aiwg-npm-audit-1444/graceful-fs-4.2.11/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
