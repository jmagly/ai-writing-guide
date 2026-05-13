# npm Supply-Chain Hardening Guide

Use this guide when you maintain an npm package or a JavaScript project
that could be affected by install-time malware, compromised package
maintainers, or abused CI publishing workflows.

AIWG added these controls after the May 2026 Mini Shai-Hulud npm worm
wave demonstrated three high-risk patterns: lifecycle-script execution
during install, Git dependency `prepare` hooks, and stolen CI/release
credentials being used to publish follow-on malicious versions.

## Minimum baseline

| Control | Recommended default | Why |
|---|---|---|
| Runtime version | Node 20+ for users; Node 24 for release workflows | Node 24 carries a current npm 11.x and matches npm's trusted-publishing examples |
| npm CLI | npm 11.5+ before dependency updates | Required for `min-release-age` |
| Release-age gate | `min-release-age=7` in repo `.npmrc` | Blocks versions published less than 7 days ago from entering the lockfile |
| High-sensitivity gate | `--min-release-age=10` for major bumps or release-prep lockfile churn | Adds review time before sensitive publishes |
| Lifecycle scripts | Remove package-level `postinstall`/`preinstall` unless truly required | Install hooks are a direct code-execution surface |
| Exotic dep sources | Reject `git+`, `github:`, non-registry tarballs, `file:`, and `link:` by default | Git deps run `prepare`; non-registry tarballs bypass normal registry review |
| Release auth | Prefer npm trusted publishing over long-lived npm tokens | OIDC publish tokens are short-lived and workflow-bound |
| Release evidence | Signed tags, provenance, signed tarball, SBOM | Gives users independent checks for source, builder, bytes, and contents |

## Project setup

Create a repo-root `.npmrc`:

```ini
# Refuse dependency versions published less than 7 days ago.
min-release-age=7
```

Require npm 11.5+ wherever lockfiles can change:

```bash
npm install -g npm@^11.5
npm --version
```

For release workflows, use Node 24 unless you have a hard compatibility
reason not to. npm trusted publishing requires npm 11.5.1+ and Node
22.14.0+; Node 24 satisfies both and reduces manual npm upgrades in CI.

## Dependency-source review

Audit `package.json` and lockfiles for dependency sources outside the
registry path:

```bash
rg -n '"(git\\+|git://|github:|file:|link:)|https?://[^"]+\\.(tgz|tar\\.gz)' package.json package-lock.json
```

Treat findings as security-relevant. If an exotic source is truly
required, put it behind an allowlist entry with a reviewer, rationale,
and review date. Avoid personal forks and branch-tracking Git specs in
production dependency graphs.

## Release workflow review

Check release workflows for these properties:

- `permissions: id-token: write` only on the publish job that needs OIDC.
- `npm publish --provenance` or a trusted-publishing equivalent.
- No long-lived npm publish token for npmjs.org once trusted publishing
  is active.
- Signed tag verification before build, pack, publish, or release-asset
  upload.
- Pinned action SHAs and digest-pinned containers for release jobs.
- `npm audit signatures` against the installed dependency tree before
  publish.
- A tarball allowlist check before publish, so new root-level payload
  files fail the release.
- Signed release assets: tarball signature, manifest signature, and SBOM.

## Incident response trigger

If a compromised package version ran on a workstation or CI runner,
treat every secret reachable from that environment as exposed. Rotate
npm tokens, GitHub/Gitea tokens, cloud credentials, Kubernetes service
account tokens, Vault tokens, deployment secrets, and any package
publishing permissions. Then audit recent package publishes and workflow
runs before resuming releases.

## AIWG skills

After deploying the security-engineering framework, use:

```bash
aiwg use security-engineering
aiwg discover "npm supply-chain audit"
aiwg discover "npm release-age gate"
```

The focused skills help an AI assistant perform this same audit against
your repository without needing to know AIWG's internal planning issue
numbers.

## References

- npm trusted publishing: <https://docs.npmjs.com/trusted-publishers>
- npm `min-release-age`: <https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age>
- npm audit signatures: <https://docs.npmjs.com/cli/v11/commands/npm-audit#audit-signatures>
- Node.js releases: <https://nodejs.org/en/about/previous-releases>
