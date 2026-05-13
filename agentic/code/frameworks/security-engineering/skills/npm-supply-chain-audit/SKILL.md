---
namespace: aiwg
name: npm-supply-chain-audit
platforms: [all]
description: "Audit npm projects for Shai-Hulud-class supply-chain exposure: lifecycle scripts, Git dependency prepare hooks, release-age gaps, publish-token exposure, trusted publishing, signed releases, and verifier docs."
---

# npm-supply-chain-audit

Use this skill when reviewing a JavaScript or TypeScript repository for
install-time malware exposure, compromised npm maintainer risk, or CI
publish-path abuse.

## Triggers

- "npm supply chain audit"
- "Shai-Hulud"
- "malicious npm package"
- "trusted publishing review"
- "publish token exposure"
- "Git dependency prepare script"
- "router_init.js" / "tanstack_runner.js"

## Audit sequence

### 1. Dependency source scan

Search manifests and lockfiles for exotic sources:

```bash
rg -n '"(git\\+|git://|github:|file:|link:)|https?://[^"]+\\.(tgz|tar\\.gz)' package.json package-lock.json
```

Findings to escalate:

- `github:` or `git+` dependencies, especially in
  `optionalDependencies`.
- Direct tarballs from non-registry hosts.
- `file:` or `link:` sources outside deliberate local workspace
  development.

### 2. Lifecycle-script review

Inspect root package scripts and nested package manifests:

```bash
rg -n '"(preinstall|install|postinstall|prepare)"' package.json package-lock.json .
```

Treat install-time scripts as code execution on every developer machine
and CI runner. Remove them unless the package cannot function without
them. If one must remain, document the exact reason and what it can
access.

### 3. Release-age gate

Check for `.npmrc`:

```ini
min-release-age=7
```

Confirm contributors and lockfile-changing CI jobs use npm 11.5+. Use
10 days or higher for release-prep dependency churn and security-
sensitive branches.

### 4. Publish-path hardening

Review release workflows for:

- npm trusted publishing or another OIDC publish path.
- No long-lived npmjs.org publish token once trusted publishing is
  active.
- `permissions: id-token: write` scoped only to the job that publishes.
- Signed tag verification before build, pack, publish, or asset upload.
- SHA-pinned actions and digest-pinned containers in release jobs.
- No publish step on fork pull requests or untrusted PR triggers.

### 5. Evidence and user verification

For packages users install from a registry, require:

- npm provenance attestation where supported,
- signed git tag,
- signed release tarball or equivalent artifact signature,
- SBOM,
- user-facing verification docs.

The verifier docs should avoid commands that run lifecycle scripts while
checking an artifact. Prefer `npm install --package-lock-only
--ignore-scripts <pkg>@<version>` followed by `npm audit signatures`.

## Incident-response trigger

If a known malicious version was installed or a suspicious lifecycle
script ran, assume secrets reachable from that environment are exposed.
Rotate npm tokens, GitHub/Gitea tokens, cloud credentials, Kubernetes
service account tokens, Vault tokens, and deployment secrets. Then audit
recent publishes and workflow runs.

## Output format

Lead with findings, ordered by severity:

```markdown
## Findings

- CRITICAL: <file:line> <risk> <fix>
- HIGH: <file:line> <risk> <fix>

## Clean Checks

- No Git dependency sources found.
- No install lifecycle scripts found.

## Follow-up Issues

- <title>, <acceptance criteria>
```

## References

- npm trusted publishing: <https://docs.npmjs.com/trusted-publishers>
- npm audit signatures: <https://docs.npmjs.com/cli/v11/commands/npm-audit#audit-signatures>
- npm `min-release-age`: <https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age>
