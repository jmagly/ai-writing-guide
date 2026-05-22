# zod External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.452Z

## Scope

| Field | Value |
|---|---|
| Package | `zod` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^3.25.0` |
| Resolved version | `3.25.76` |
| Lockfile tarball | https://registry.npmjs.org/zod/-/zod-3.25.76.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/colinhacks/zod.git |
| Audited ref | `v3.25.76` |
| Audited commit | `463f03eb8183dcdcdf735b180f2bf40883e66220` |
| Local source path | `/tmp/aiwg-npm-audit-1444/zod-3.25.76` |

## Findings

- MEDIUM: maintainer-side release/build lifecycle hooks exist (prepublishOnly, prepare). Not a consumer install blocker, but release-path audit should verify publisher custody and build provenance.
- LOW: signed git tag verification not established locally: clone checkout succeeded but tag object was not available in shallow clone.

## Clean Checks

- AIWG lockfile resolves `zod` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v3.25.76` / `463f03eb8183dcdcdf735b180f2bf40883e66220`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| `prepublishOnly` | `pnpm run test && pnpm run build` |
| `prepare` | `husky` |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/zod/-/zod-3.25.76.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: clone checkout succeeded but tag object was not available in shallow clone
- Workflow files scanned: 2
- Workflow risk markers observed: `id-token: write`, `NPM_TOKEN`

## Commands Run

```bash
npm view 'zod@3.25.76' --json
git ls-remote --tags 'https://github.com/colinhacks/zod.git'
git clone --depth 1 --branch 'v3.25.76' 'https://github.com/colinhacks/zod.git' '/tmp/aiwg-npm-audit-1444/zod-3.25.76'
git -C '/tmp/aiwg-npm-audit-1444/zod-3.25.76' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/zod-3.25.76' tag -v 'v3.25.76'
rg --files '/tmp/aiwg-npm-audit-1444/zod-3.25.76/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- During any deeper upstream audit, inspect release workflow/publisher controls for the maintainer-side lifecycle hook(s).
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
