# commander External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.423Z

## Scope

| Field | Value |
|---|---|
| Package | `commander` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^12.1.0` |
| Resolved version | `12.1.0` |
| Lockfile tarball | https://registry.npmjs.org/commander/-/commander-12.1.0.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/tj/commander.js.git |
| Audited ref | `v12.1.0` |
| Audited commit | `970ecae402b253de691e6a9066fea22f38fe7431` |
| Local source path | `/tmp/aiwg-npm-audit-1444/commander-12.1.0` |

## Findings

- LOW: signed git tag verification not established locally: tag exists but has no signature.

## Clean Checks

- AIWG lockfile resolves `commander` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v12.1.0` / `970ecae402b253de691e6a9066fea22f38fe7431`.
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

- npm tarball: https://registry.npmjs.org/commander/-/commander-12.1.0.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: tag exists but has no signature
- Workflow files scanned: 2
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'commander@12.1.0' --json
git ls-remote --tags 'https://github.com/tj/commander.js.git'
git clone --depth 1 --branch 'v12.1.0' 'https://github.com/tj/commander.js.git' '/tmp/aiwg-npm-audit-1444/commander-12.1.0'
git -C '/tmp/aiwg-npm-audit-1444/commander-12.1.0' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/commander-12.1.0' tag -v 'v12.1.0'
rg --files '/tmp/aiwg-npm-audit-1444/commander-12.1.0/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
