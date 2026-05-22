# chalk External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.411Z

## Scope

| Field | Value |
|---|---|
| Package | `chalk` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^4.1.2` |
| Resolved version | `4.1.2` |
| Lockfile tarball | https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/chalk/chalk.git |
| Audited ref | `v4.1.2` |
| Audited commit | `95d74cbe8d3df3674dec1445a4608d3288d8b73c` |
| Local source path | `/tmp/aiwg-npm-audit-1444/chalk-4.1.2` |

## Findings

- LOW: signed git tag verification not established locally: release ref is a lightweight tag or direct commit; no signed tag object verified.

## Clean Checks

- AIWG lockfile resolves `chalk` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v4.1.2` / `95d74cbe8d3df3674dec1445a4608d3288d8b73c`.
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

- npm tarball: https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: release ref is a lightweight tag or direct commit; no signed tag object verified
- Workflow files scanned: 0
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'chalk@4.1.2' --json
git ls-remote --tags 'https://github.com/chalk/chalk.git'
git clone --depth 1 --branch 'v4.1.2' 'https://github.com/chalk/chalk.git' '/tmp/aiwg-npm-audit-1444/chalk-4.1.2'
git -C '/tmp/aiwg-npm-audit-1444/chalk-4.1.2' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/chalk-4.1.2' tag -v 'v4.1.2'
rg --files '/tmp/aiwg-npm-audit-1444/chalk-4.1.2/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
