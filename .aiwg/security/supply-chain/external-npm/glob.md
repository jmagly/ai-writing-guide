# glob External NPM Supply-Chain Audit

Generated: 2026-05-22T00:26:50.424Z

## Scope

| Field | Value |
|---|---|
| Package | `glob` |
| AIWG manifest | `package.json` |
| AIWG dependency field | `dependencies` |
| AIWG spec | `^13.0.1` |
| Resolved version | `13.0.1` |
| Lockfile tarball | https://registry.npmjs.org/glob/-/glob-13.0.1.tgz |
| Lockfile integrity present | yes |
| Lockfile install script flag | no |
| npm registry signatures | 1 |
| Upstream repo | https://github.com/isaacs/node-glob.git |
| Audited ref | `v13.0.1` |
| Audited commit | `c759f03302b7b2ab76747cfe2cadf4a51b113082` |
| Local source path | `/tmp/aiwg-npm-audit-1444/glob-13.0.1` |

## Findings

- MEDIUM: maintainer-side release/build lifecycle hooks exist (prepublishOnly, prepare). Not a consumer install blocker, but release-path audit should verify publisher custody and build provenance.
- LOW: signed git tag verification not established locally: signed tag object present, but local GPG trust verification did not complete.

## Clean Checks

- AIWG lockfile resolves `glob` to a registry.npmjs.org tarball with an integrity hash.
- AIWG lockfile does not mark this package with `hasInstallScript`.
- Exact-version npm metadata includes 1 registry signature(s).
- Upstream root manifest scan found 0 exotic dependency source(s).
- Repository was cloned and inspected at `v13.0.1` / `c759f03302b7b2ab76747cfe2cadf4a51b113082`.
- Repo-wide lockfile checks passed: `npm run lint:dep-sources`, `npm run lint:affected-packages`, and `npm audit signatures`.

## Lifecycle Scripts

Install-time scripts are `preinstall`, `install`, and `postinstall`. Maintainer-side scripts such as `prepare`, `prepack`, and `prepublishOnly` are release-path risks rather than consumer install execution by default.

| Script | Command |
|---|---|
| `prepublishOnly` | `npm run benchclean; git push origin --follow-tags` |
| `prepare` | `tshy` |

## Dependency Source Scan

| Field | Package | Spec |
|---|---|---|
| (none) | (none) | (none) |

## Release And Provenance Evidence

- npm tarball: https://registry.npmjs.org/glob/-/glob-13.0.1.tgz
- npm integrity present: yes
- npm registry signatures in metadata: 1
- Local tag verification status: signed tag object present, but local GPG trust verification did not complete
- Workflow files scanned: 2
- Workflow risk markers observed: `id-token: write`, `pull_request_target`

## Commands Run

```bash
npm view 'glob@13.0.1' --json
git ls-remote --tags 'https://github.com/isaacs/node-glob.git'
git clone --depth 1 --branch 'v13.0.1' 'https://github.com/isaacs/node-glob.git' '/tmp/aiwg-npm-audit-1444/glob-13.0.1'
git -C '/tmp/aiwg-npm-audit-1444/glob-13.0.1' rev-parse HEAD
git -C '/tmp/aiwg-npm-audit-1444/glob-13.0.1' tag -v 'v13.0.1'
rg --files '/tmp/aiwg-npm-audit-1444/glob-13.0.1/.github/workflows'
npm run lint:dep-sources
npm run lint:affected-packages
npm audit signatures
```

## Follow-Up

- Track as review evidence in #1444; no immediate AIWG dependency change is required from this package alone.
- During any deeper upstream audit, inspect release workflow/publisher controls for the maintainer-side lifecycle hook(s).
- Consider upstream issue/PR draft only if the project claims signed release tags or provenance that is not present/verifiable.
