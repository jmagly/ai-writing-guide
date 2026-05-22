# chokidar External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.418Z

## Scope

| Field | Value |
|---|---|
| Package | `chokidar` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^3.6.0` |
| Resolved version | `3.6.0` |
| Lockfile tarball | https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/paulmillr/chokidar.git |
| Audited ref | `3.6.0` |
| Audited commit | `7c50e25d10a497ce4409f6e52eb630f0d7647b97` |
| Local source path | `/tmp/aiwg-npm-audit-1444/chokidar-3.6.0` |

## Findings

- LOW: signed git tag verification not established locally: signed tag object present, but local GPG trust verification did not complete.

## Clean Checks

- AIWG lockfile resolves `chokidar` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `3.6.0` / `7c50e25d10a497ce4409f6e52eb630f0d7647b97`.
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

- npm tarball: https://registry.npmjs.org/chokidar/-/chokidar-3.6.0.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: signed tag object present, but local GPG trust verification did not complete
- Workflow files scanned: 3
- Workflow risk markers observed: `id-token: write`, `npm publish`

## Commands Run

```bash
npm view 'chokidar@3.6.0' --json
git ls-remote --tags 'https://github.com/paulmillr/chokidar.git'
git clone --depth 1 --branch '3.6.0' 'https://github.com/paulmillr/chokidar.git' '/tmp/aiwg-npm-audit-1444/chokidar-3.6.0'
git -C '/tmp/aiwg-npm-audit-1444/chokidar-3.6.0' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/chokidar-3.6.0' tag -v '3.6.0'
rg --files '/tmp/aiwg-npm-audit-1444/chokidar-3.6.0/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
