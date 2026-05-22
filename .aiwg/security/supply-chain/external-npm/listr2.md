# listr2 External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.446Z

## Scope

| Field | Value |
|---|---|
| Package | `listr2` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^8.2.5` |
| Resolved version | `8.3.3` |
| Lockfile tarball | https://registry.npmjs.org/listr2/-/listr2-8.3.3.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/listr2/listr2.git |
| Audited ref | `listr2@8.3.3` |
| Audited commit | `8d3f508cf6ca9e8f39c31c4a2cebb3d2159fca23` |
| Local source path | `/tmp/aiwg-npm-audit-1444/listr2-8.3.3` |

## Findings

- LOW: signed git tag verification not established locally: release ref is a lightweight tag or direct commit; no signed tag object verified.

## Clean Checks

- AIWG lockfile resolves `listr2` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `listr2@8.3.3` / `8d3f508cf6ca9e8f39c31c4a2cebb3d2159fca23`.
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

- npm tarball: https://registry.npmjs.org/listr2/-/listr2-8.3.3.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: release ref is a lightweight tag or direct commit; no signed tag object verified
- Workflow files scanned: 0
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'listr2@8.3.3' --json
git ls-remote --tags 'https://github.com/listr2/listr2.git'
git clone --depth 1 --branch 'listr2@8.3.3' 'https://github.com/listr2/listr2.git' '/tmp/aiwg-npm-audit-1444/listr2-8.3.3'
git -C '/tmp/aiwg-npm-audit-1444/listr2-8.3.3' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/listr2-8.3.3' tag -v 'listr2@8.3.3'
rg --files '/tmp/aiwg-npm-audit-1444/listr2-8.3.3/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
