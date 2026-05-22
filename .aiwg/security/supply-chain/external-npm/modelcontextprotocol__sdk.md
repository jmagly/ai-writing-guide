# @modelcontextprotocol/sdk External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.405Z

## Scope

| Field | Value |
|---|---|
| Package | `@modelcontextprotocol/sdk` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^1.24.0` |
| Resolved version | `1.24.3` |
| Lockfile tarball | https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.24.3.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/modelcontextprotocol/typescript-sdk.git |
| Audited ref | `1.24.3` |
| Audited commit | `724fe6eefeeb7f71328bc43c223fc9abd3df491e` |
| Local source path | `/tmp/aiwg-npm-audit-1444/modelcontextprotocol__sdk-1.24.3` |

## Findings

- MEDIUM: maintainer-side release/build lifecycle hooks exist (prepack). Not a consumer install blocker, but release-path audit should verify publisher custody and build provenance.
- LOW: signed git tag verification not established locally: release ref is a lightweight tag or direct commit; no signed tag object verified.

## Clean Checks

- AIWG lockfile resolves `@modelcontextprotocol/sdk` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `1.24.3` / `724fe6eefeeb7f71328bc43c223fc9abd3df491e`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| `prepack` | `npm run build:esm && npm run build:cjs` |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.24.3.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: release ref is a lightweight tag or direct commit; no signed tag object verified
- Workflow files scanned: 3
- Workflow risk markers observed: `id-token: write`, `NPM_TOKEN`, `npm publish`

## Commands Run

```bash
npm view '@modelcontextprotocol/sdk@1.24.3' --json
git ls-remote --tags 'https://github.com/modelcontextprotocol/typescript-sdk.git'
git clone --depth 1 --branch '1.24.3' 'https://github.com/modelcontextprotocol/typescript-sdk.git' '/tmp/aiwg-npm-audit-1444/modelcontextprotocol__sdk-1.24.3'
git -C '/tmp/aiwg-npm-audit-1444/modelcontextprotocol__sdk-1.24.3' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/modelcontextprotocol__sdk-1.24.3' tag -v '1.24.3'
rg --files '/tmp/aiwg-npm-audit-1444/modelcontextprotocol__sdk-1.24.3/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- During any deeper upstream audit, inspect release workflow/publisher controls for the maintainer-side lifecycle hook(s).
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
