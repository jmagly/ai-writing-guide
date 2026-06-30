---
enforcement: high
---

# Dependency Source Policy

**Enforcement Level**: HIGH
**Scope**: `package.json` and lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`) — direct AND transitive entries
**Issue**: #1297

## Principle

Non-registry dependency sources (`git+`, `github:`, raw tarball URLs, `file:`, `link:`) bypass registry signature verification AND can execute arbitrary code during install via lifecycle scripts (especially `prepare`). The May 2026 Mini Shai-Hulud campaign's primary propagation vector was an `optionalDependencies` entry sourced from `git+https://...attacker-repo` whose `prepare` script ran during every `npm install` of any project that pulled in the affected package.

Registry-hosted tarballs (`registry.npmjs.org/.../foo.tgz`, `registry.yarnpkg.com/...`, `npm.pkg.github.com/...`) are fine — they're the normal `resolved` URL format `npm install` emits for every registry-published dep. The policy only flags non-registry sources.

Companion to [`ci-action-pinning`](ci-action-pinning.md) (CI execution-environment trust) and the per-package-manager release-age-gate skills (which gate freshly-published registry versions). Together they cover the three primary supply-chain attack vectors: CI environment poisoning, registry-version poisoning, and direct dep-source injection.

## Mandatory Rules

### Rule 1: Six dep-source patterns are forbidden by default

Every dep in `package.json` AND every entry in the lockfile (including transitive) MUST be a registry-published version reference. The following patterns are blocked:

| Pattern | Example | Reason |
|---|---|---|
| `git+*` scheme | `"foo": "git+https://github.com/owner/foo.git"` | npm clones the repo and runs its `prepare` script — arbitrary code execution at install time |
| `git://` scheme | `"foo": "git://github.com/owner/foo.git"` | Same as above |
| `github:` shorthand | `"foo": "github:owner/foo"` | Same as above; npm expands to git+ |
| Non-registry tarball | `"foo": "https://example.com/foo-1.0.0.tgz"` | Tarball can contain any payload and lifecycle scripts; bypasses registry signature verification |
| `file:` path | `"foo": "file:./vendor/foo"` | Local-path deps bypass dep-resolution review and lockfile signature checks |
| `link:` symlink | `"foo": "link:./packages/foo"` | Follows the symlink target wherever it points; same gaps as `file:` |

Registry-hosted patterns that are ALWAYS acceptable:

- `"foo": "^1.2.3"` — registry semver range
- `"foo": "1.2.3"` — exact registry version
- `"foo": "npm:@scope/foo@^1.2.3"` — aliased registry dep
- Lockfile `"resolved": "https://registry.npmjs.org/..."` — registry-served tarball

### Rule 2: Exceptions require an allowlist entry

If a legitimate non-registry source exists (e.g., temporary fork pending upstream merge, monorepo-internal `file:` link with a known security boundary), it MUST be allowlisted with:

- **Owner** — who took the risk-acceptance decision
- **Reason** — why a registry version isn't viable today
- **Expiry / review date** — when this exception must be re-evaluated (max 1 year)
- **Risk acceptance** — explicit statement that the operator accepts the dep-source bypass

Allowlist file format (committed at `.aiwg/security/dep-source-allowlist.yaml` or equivalent):

```yaml
allowlist:
  - dep: "foo"
    source: "git+https://github.com/owner/foo.git#sha-or-tag"
    owner: "alice@example.org"
    reason: "Upstream PR #123 not yet merged; we need fix from main for issue X"
    review_date: "2026-08-01"
    risk_acceptance: "Source pinned to commit SHA; reviewed prepare script line-by-line; no shell exec in install path"
  - dep: "@internal/shared"
    source: "file:./packages/shared"
    owner: "bob@example.org"
    reason: "Monorepo-internal package; not published to registry"
    review_date: "2027-01-01"
    risk_acceptance: "Source within same security boundary as host package; no external code path"
```

Allowlist entries beyond their `review_date` are treated as policy violations.

### Rule 3: Lockfile entries are policy targets

Direct deps in `package.json` are easy to spot. Transitive entries in the lockfile are the actual attack surface — Mini Shai-Hulud propagated via transitive `optionalDependencies` with exotic sources. The CI lint MUST scan the lockfile for the same patterns, including:

- `"resolved": "git+..."` in `package-lock.json`
- `tarball: ...` URLs in `pnpm-lock.yaml` that don't match a registry origin
- `resolution: ` blocks in `yarn.lock`
- Binary lockfile (`bun.lockb`) — extract via `bun pm ls --all` and pattern-match the output

### Rule 4: pnpm workspaces enable `blockExoticSubdeps`

When pnpm is the package manager, the workspace MUST set `blockExoticSubdeps: true` (in `pnpm-workspace.yaml`) or the per-repo equivalent in `.npmrc`:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
blockExoticSubdeps: true
```

This is the pnpm advantage over npm: workspace-scope enforcement that npm has no equivalent for. The `pnpm-release-age-gate` skill documents the wiring.

### Rule 5: Failure messages point to remediation

When CI rejects a violation, the failure message MUST:

1. State which dep and which source pattern matched
2. Reference the operator's choices: switch to a registry version, request an allowlist entry, or accept install-time compromise risk
3. Link to this rule (or the project's adaptation of it) so the receiving developer can read the policy

Reference failure-message format (from AIWG's own `tools/lint/dep-source.mjs`):

```
✗ Dependency source policy violation

  foo (in package.json)
    source: git+https://github.com/owner/foo.git
    pattern: git+ scheme

  This dependency source bypasses registry signature verification and
  executes arbitrary code at install time via the prepare script.

  Options:
    1. Switch to a registry-published version: npm install foo@<version>
    2. Add an allowlist entry: see .aiwg/security/dep-source-allowlist.yaml
    3. Read the policy: docs/contributing/dependency-sources.md
```

## Detection Patterns

```bash
# package.json — direct deps with exotic sources
node -p "
  const p = require('./package.json');
  const all = {...p.dependencies, ...p.devDependencies, ...p.optionalDependencies, ...p.peerDependencies};
  for (const [name, source] of Object.entries(all || {})) {
    if (/^(git\+|git:|github:|file:|link:)/.test(source) ||
        (/^https?:\/\//.test(source) && /\.tgz/.test(source))) {
      console.log(name, '=', source);
    }
  }
"

# package-lock.json — transitive entries with exotic resolved URLs
node -p "
  const lock = require('./package-lock.json');
  function walk(pkgs, prefix = '') {
    for (const [path, entry] of Object.entries(pkgs || {})) {
      if (entry.resolved && /^(git\+|git:)/.test(entry.resolved)) {
        console.log(prefix + path, '=', entry.resolved);
      }
    }
  }
  walk(lock.packages);
"

# pnpm-lock.yaml — exotic resolution blocks
grep -E 'resolution:\s*\{(git|tarball:.*[^.]https?://[^/]+/[^.]*\.tgz)' pnpm-lock.yaml 2>/dev/null

# yarn.lock — exotic resolved entries
grep -E '"?resolved"?\s*"?:?\s*"?(git\+|git:)' yarn.lock 2>/dev/null
```

Reference implementation: AIWG's own [`tools/lint/dep-source.mjs`](https://git.integrolabs.net/roctinam/aiwg/src/branch/main/tools/lint/dep-source.mjs) — runs `npm run lint:dep-sources` and exits non-zero on any violation.

## Acceptable Exceptions

Three exception categories beyond explicit allowlist entries:

1. **Monorepo workspace links** — `file:` or `link:` deps between packages in the same `pnpm-workspace.yaml` / `lerna.json` / `nx.json` / `package.json workspaces` configuration. These are within the same security boundary; flag as INFO only.
2. **Lockfile resolved-URL prefixes that look exotic but ARE registry URLs** — e.g., `https://registry.npmjs.org/...` matches `^https://` but is a registry origin. The detection logic above already excludes these correctly by checking the host.
3. **Dev-only deps for build tooling that consume only `package.json`-declared scripts** — debatable; recommend treating as standard policy violations and using allowlist entries for the temporary cases.

## Rationale

Mini Shai-Hulud demonstrated that a single transitive `optionalDependencies` entry from a compromised maintainer can propagate a `prepare`-script payload to every downstream `npm install`. The registry's "this version was published by an authenticated maintainer" guarantee is the foundation of `npm audit signatures`; non-registry sources bypass that guarantee entirely.

Cost of compliance is low (most deps are already registry-published). Cost of a single exotic-source incident is high (full secret-rotation cycle, downstream user trust loss, potential CVE assignment). The asymmetry justifies the rule.

## References

- [`ci-action-pinning`](ci-action-pinning.md) — CI execution-environment trust (companion rule)
- AIWG's lint implementation: [`tools/lint/dep-source.mjs`](https://git.integrolabs.net/roctinam/aiwg/src/branch/main/tools/lint/dep-source.mjs)
- AIWG's contributor doc: [`docs/contributing/dependency-sources.md`](https://git.integrolabs.net/roctinam/aiwg/src/branch/main/docs/contributing/dependency-sources.md)
- ADR: `.aiwg/architecture/adr-dep-source-policy.md` (in AIWG's own repo)
- pnpm `blockExoticSubdeps`: <https://pnpm.io/settings#blockexoticsubdeps>
- Mini Shai-Hulud post-mortem references

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-13
