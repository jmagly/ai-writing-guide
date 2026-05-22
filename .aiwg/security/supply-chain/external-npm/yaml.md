# yaml External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.447Z

## Scope

| Field | Value |
|---|---|
| Package | `yaml` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^2.8.1` |
| Resolved version | `2.8.2` |
| Lockfile tarball | https://registry.npmjs.org/yaml/-/yaml-2.8.2.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/eemeli/yaml.git |
| Audited ref | `v2.8.2` |
| Audited commit | `086fa6b5bae325da18734750cddee231ce578930` |
| Local source path | `/tmp/aiwg-npm-audit-1444/yaml-2.8.2` |

## Findings

- MEDIUM: maintainer-side release/build lifecycle hooks exist (prepublishOnly). Not a consumer install blocker, but release-path audit should verify publisher custody and build provenance.
- LOW: signed git tag verification not established locally: release ref is a lightweight tag or direct commit; no signed tag object verified.

## Clean Checks

- AIWG lockfile resolves `yaml` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v2.8.2` / `086fa6b5bae325da18734750cddee231ce578930`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| `prepublishOnly` | `npm run clean && npm test && npm run build` |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/yaml/-/yaml-2.8.2.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: release ref is a lightweight tag or direct commit; no signed tag object verified
- Workflow files scanned: 6
- Workflow risk markers observed: `id-token: write`

## Commands Run

```bash
npm view 'yaml@2.8.2' --json
git ls-remote --tags 'https://github.com/eemeli/yaml.git'
git clone --depth 1 --branch 'v2.8.2' 'https://github.com/eemeli/yaml.git' '/tmp/aiwg-npm-audit-1444/yaml-2.8.2'
git -C '/tmp/aiwg-npm-audit-1444/yaml-2.8.2' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/yaml-2.8.2' tag -v 'v2.8.2'
rg --files '/tmp/aiwg-npm-audit-1444/yaml-2.8.2/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- During any deeper upstream audit, inspect release workflow/publisher controls for the maintainer-side lifecycle hook(s).
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
