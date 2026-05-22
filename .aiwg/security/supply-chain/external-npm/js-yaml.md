# js-yaml External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.431Z

## Scope

| Field | Value |
|---|---|
| Package | `js-yaml` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^4.1.0` |
| Resolved version | `4.1.1` |
| Lockfile tarball | https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/nodeca/js-yaml.git |
| Audited ref | `4.1.1` |
| Audited commit | `cc482e775913e6625137572a3712d2826170e53a` |
| Local source path | `/tmp/aiwg-npm-audit-1444/js-yaml-4.1.1` |

## Findings

- MEDIUM: maintainer-side release/build lifecycle hooks exist (prepublishOnly). Not a consumer install blocker, but release-path audit should verify publisher custody and build provenance.
- LOW: signed git tag verification not established locally: release ref is a lightweight tag or direct commit; no signed tag object verified.

## Clean Checks

- AIWG lockfile resolves `js-yaml` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `4.1.1` / `cc482e775913e6625137572a3712d2826170e53a`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| `prepublishOnly` | `npm run gh-demo` |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/js-yaml/-/js-yaml-4.1.1.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: release ref is a lightweight tag or direct commit; no signed tag object verified
- Workflow files scanned: 1
- Workflow risk markers observed: (none from coarse scan)

## Commands Run

```bash
npm view 'js-yaml@4.1.1' --json
git ls-remote --tags 'https://github.com/nodeca/js-yaml.git'
git clone --depth 1 --branch '4.1.1' 'https://github.com/nodeca/js-yaml.git' '/tmp/aiwg-npm-audit-1444/js-yaml-4.1.1'
git -C '/tmp/aiwg-npm-audit-1444/js-yaml-4.1.1' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/js-yaml-4.1.1' tag -v '4.1.1'
rg --files '/tmp/aiwg-npm-audit-1444/js-yaml-4.1.1/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- During any deeper upstream audit, inspect release workflow/publisher controls for the maintainer-side lifecycle hook(s).
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
