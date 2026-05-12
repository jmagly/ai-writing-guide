# ADR: Dependency Source Policy

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: #1300 (parent epic #1278, control C22, Wave 2)
**Companion**: #1301 (A21 — pnpm spike, may supersede part of this implementation)

## Context

The May 2026 supply-chain hardening audit (Mini Shai-Hulud response, see
`docs/security/supply-chain-hardening-plan.md`) identified
**dependency-source injection** as a high-severity attack class that AIWG's
existing controls did not address. The vector:

1. An attacker compromises a project's dep graph by adding a single entry —
   often as `optionalDependencies` to evade visibility — whose source is
   `git+https://...`, `git://...`, `github:owner/repo`, a direct tarball
   URL, or a `file:`/`link:` path.
2. `npm install` resolves the dep by cloning the source repo or fetching the
   tarball, then runs the dep's lifecycle scripts (`preinstall`, `install`,
   `prepare`, `postinstall`) — exotic-source deps almost always have a
   `prepare` script, because that's how git-installed deps build themselves.
3. The `prepare` script executes attacker-controlled code in the install
   environment, with the same privileges as the install process. In a CI
   context that means access to CI secrets; on a developer workstation that
   means access to dev environment.

This is the same primitive that the Shai-Hulud worm used in March 2026 and
the mechanism by which several recent npm-ecosystem compromises propagated.
The audit (finding referenced as control C22; threat-model scenario S5
dep-injection variant) called for a project-level lint that gates on these
sources independent of the lockfile-pinning controls that landed in Wave 1
(#1283 / A8 — npm install policy and lockfile integrity).

Lockfile pinning alone is insufficient because:

- A maintainer who runs `npm install some-pkg --save-optional` updates both
  `package.json` and `package-lock.json` in one commit; pinning catches drift
  *between* commits, not within them.
- Transitive deps can have exotic `resolved` URLs even when the direct dep
  is a normal registry entry — a malicious sub-dep injected via the dep
  graph is invisible to a direct-deps-only review.
- `npm install --omit=optional` reduces exposure but does not eliminate it;
  any normal-looking dep can pull an exotic dep transitively.

## Decision

Implement a CI lint that scans both `package.json` (direct + dev + optional +
peer deps) and `package-lock.json` (transitive `resolved` URLs) and **fails
the build** on any source matching one of six forbidden patterns, unless
the source is on an explicit, committed allowlist at
`ci/dep-source-allowlist.yaml`.

The forbidden patterns are:

| Pattern | Form | Why it's flagged |
|---|---|---|
| `git+*` | Any `git+...` scheme prefix | Triggers `prepare` script execution |
| `git://` | Raw git scheme | Same as above |
| `github:owner/repo` | GitHub shorthand | npm clones the repo and runs `prepare` |
| Direct tarball | `https?://.../*.tgz` or `*.tar.gz` from a non-registry host | Tarball can contain any payload + lifecycle scripts |
| `file:` | Local filesystem path | Bypasses dep-resolution review |
| `link:` | Workspace symlink | Same — and follows the symlink target |

Registry-hosted tarballs (`registry.npmjs.org/.../foo.tgz`,
`registry.yarnpkg.com/...`, `npm.pkg.github.com/...`) are **not** flagged —
those are the normal `resolved` URL format and represent the trust boundary
the lint is protecting.

### Failure mode: hard fail

CI fails the build on violation. **Not** comment-on-PR or warning-only.
Rationale: every other Wave 1 and Wave 2 supply-chain control in this
campaign (postinstall removal #1279, lockfile integrity #1283,
container/action pinning #1281/#1282, GT_ACCESS_TOKEN URL fix #1284) is
a hard gate. A soft gate here would create a single weakest link.

### Implementation: standalone Node script

`tools/lint/dep-source.mjs` is a single-file Node ESM script with one
dependency (`js-yaml`, already a direct devDep of AIWG for unrelated YAML
parsing). No third-party validator framework. Rationale:

- The control's purpose is **reducing dep surface**. Adding a dep-tree-walker
  npm package to implement a dep-tree-walking lint would be paradoxical.
- The logic is ~250 lines and stable. The forbidden-pattern set is unlikely
  to grow rapidly.
- A small in-tree script is auditable by any contributor without
  understanding a third-party tool's config language.

### Workflow integration point: `ci.yml` (every push/PR)

The lint runs in `.gitea/workflows/ci.yml` after `npm ci` (the lint needs
`node_modules/js-yaml`) and before `typecheck`. Placed in the existing
`test` job — does not warrant a separate job since it adds ~50ms to a job
that already runs for 10+ minutes.

`ci.yml` was chosen over `metadata-validation.yml` because the dep-source
check is universal across paths — every push/PR should run it, regardless
of which files changed. `metadata-validation.yml` is the wrong shape; it
has path filters for AIWG framework artifacts.

The new step uses the digest-pinned `node:20@sha256:8f693eaa...` container
that landed via A3 (#1281) — no unpinned references introduced.

### Allowlist semantics

Each allowlist entry permits a single dep with an otherwise-policy-violating
source. Schema enforced by the lint:

```yaml
allowlist:
  - name: <package-name>            # required, exact match
    source-pattern: <string-or-regex> # required; "foo" or "/regex/flags"
    rationale: <text>                # required
    last-reviewed-date: YYYY-MM-DD   # required
    reviewer: <name-or-handle>       # optional
```

Initial allowlist is **empty** (`allowlist: []`). The survey performed at
implementation time (2026-05-12) confirmed AIWG has zero exotic dep sources
in either `package.json` or `package-lock.json`. Future allowlist entries
must be reviewed as security-relevant changes.

## Consequences

### Positive

- Closes the dep-injection vector from threat-model scenario S5 (variant)
  and control C22. The hardening campaign now has a defense-in-depth layer
  specific to exotic-source attacks, complementing lockfile integrity
  (#1283) and pinning (#1281, #1282).
- The allowlist file makes every exception **explicit, dated, and reviewed**.
  Future audits can scan one file to enumerate every accepted risk.
- A standalone in-tree script means no new install-time dep, no
  transitive-tree growth, and no third-party tool maintenance burden.

### Negative

- Every legitimate exotic dep — they do exist; some projects need a forked
  upstream — now requires an allowlist entry and a maintainer's signoff.
  This is by design but creates friction for contributors who don't know
  about the policy. Mitigated by the clear failure output (which tells the
  contributor exactly what to do) and the contributor doc at
  `docs/contributing/dependency-sources.md`.
- The lint is AIWG-specific. Downstream projects that consume AIWG don't
  automatically gain the protection. **B13** in Track B (mirror to consumer
  projects, see `.aiwg/security/A20-tracker-issue.md` once filed) addresses
  this gap.
- If/when AIWG migrates to pnpm (pending #1301 / A21 spike), the
  `package-lock.json` scan re-points at `pnpm-lock.yaml`. The
  `package.json` scan continues to apply unchanged. pnpm's own
  `blockExoticSubdeps` option would supersede part of this lint; the lint
  stays in place as a defense-in-depth backstop regardless.

## Alternatives Considered

### pnpm `blockExoticSubdeps`

Rejected for now. pnpm has a native config option that does similar
filtering, but #1301 (A21) is still a spike — the decision to migrate to
pnpm hasn't been made, and even if it lands, pnpm's policy applies only
to *transitive* sources. A separate manifest-level check would still be
needed for direct-dep additions. The standalone lint covers both
manifest and lockfile and survives any package-manager migration.

If A21 chooses pnpm, this lint stays in place as defense-in-depth and
the pnpm config gives a second layer.

### Comment-on-PR mode instead of hard fail

Rejected. Supply-chain controls are gates, not advisories. A maintainer
who sees a "warning" on a PR that's otherwise green will frequently
merge with the warning unresolved — that's the well-documented
failure mode of warning-only static analysis. Hard fail forces the
decision (swap to registry version, allowlist, or revert) into the PR
review itself.

### Third-party tool (dependency-check, snyk, audit-ci)

Rejected. These tools are useful for vulnerability scanning (CVE
databases, advisory matching) but not the right shape for *source-pattern*
gating. The control we need is a six-pattern allow/deny check on a
small allowlist — a 250-line script is the right tool. Adding a
multi-megabyte CVE-scanner to implement this would inflate the install
surface in service of reducing the install surface.

### Static check in `package.json` (e.g. via npm config)

npm doesn't expose a source-pattern policy hook at the manifest level.
The closest is `npm config set ignore-scripts true`, which is too blunt
(disables all install scripts, breaks builds) and orthogonal (doesn't
prevent the dep from being installed in the first place).

## References

- #1300 (this implementation), #1278 (parent epic), #1301 (A21 — pnpm spike)
- Control C22 in `docs/security/supply-chain-hardening-plan.md`
- Threat scenario S5 (dep-injection variant) in the same document
- Companion ADRs: `adr-postinstall-removal.md` (#1279),
  `adr-lockfile-integrity.md` (#1283 if present)
- Rule: `.claude/rules/dev-pipeline-safety.md` — gate-not-warning enforcement
- Companion docs: `docs/contributing/dependency-sources.md` (contributor guide)
- Pin manifest: `ci/digests.txt` — container pinning that the CI step inherits
