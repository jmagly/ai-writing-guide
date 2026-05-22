# ora External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.446Z

## Scope

| Field | Value |
|---|---|
| Package | `ora` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^5.4.1` |
| Resolved version | `5.4.1` |
| Lockfile tarball | https://registry.npmjs.org/ora/-/ora-5.4.1.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/sindresorhus/ora.git |
| Audited ref | `v5.4.1` |
| Audited commit | `476935f318868265303d148992fc268639a0d573` |
| Local source path | `/tmp/aiwg-npm-audit-1444/ora-5.4.1` |

## Findings

- LOW: signed git tag verification not established locally: tag exists but has no signature.

## Clean Checks

- AIWG lockfile resolves `ora` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v5.4.1` / `476935f318868265303d148992fc268639a0d573`.
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

- npm tarball: https://registry.npmjs.org/ora/-/ora-5.4.1.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: tag exists but has no signature
- Workflow files scanned: 1
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'ora@5.4.1' --json
git ls-remote --tags 'https://github.com/sindresorhus/ora.git'
git clone --depth 1 --branch 'v5.4.1' 'https://github.com/sindresorhus/ora.git' '/tmp/aiwg-npm-audit-1444/ora-5.4.1'
git -C '/tmp/aiwg-npm-audit-1444/ora-5.4.1' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/ora-5.4.1' tag -v 'v5.4.1'
rg --files '/tmp/aiwg-npm-audit-1444/ora-5.4.1/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
