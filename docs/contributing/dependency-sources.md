# Dependency Source Policy

AIWG runs a CI lint that scans `package.json` and `package-lock.json` for
dependency sources that match a known supply-chain injection pattern. If
your CI build fails with a `Dependency source policy violation` message,
this doc explains what happened and how to fix it.

The policy lives in `.aiwg/architecture/adr-dep-source-policy.md`. This
doc is the contributor-facing companion.

## What the policy forbids

The lint rejects six dep-source patterns:

| Pattern | Example | Why it's flagged |
|---|---|---|
| `git+*` scheme | `git+https://github.com/foo/bar.git` | npm clones the repo and runs its `prepare` script — arbitrary code execution at install time |
| `git://` scheme | `git://github.com/foo/bar.git` | Same as above |
| `github:` shorthand | `github:foo/bar` | npm clones the repo and runs its `prepare` script |
| Non-registry tarball | `https://example.com/foo-1.0.0.tgz` | The tarball can contain any payload and lifecycle scripts |
| `file:` path | `file:./vendor/foo` | Local-path deps bypass dep-resolution review |
| `link:` symlink | `link:./packages/foo` | Same — and follows the symlink target wherever it points |

Registry-hosted tarballs (`registry.npmjs.org/.../foo.tgz`,
`registry.yarnpkg.com/...`, `npm.pkg.github.com/...`) are **fine** —
those are the normal `resolved` URL format that `npm install` emits for
every registry dep. The lint only flags tarballs from non-registry hosts.

## Why this policy exists

Mini Shai-Hulud (March 2026) and several other recent supply-chain
attacks have used dep-source injection as their primary propagation
vector. The pattern:

1. Attacker gains write access to a project (compromised maintainer
   account, malicious PR, social engineering).
2. Attacker adds a single dep — usually as `optionalDependencies` to
   reduce visibility — whose source is `git+https://...attacker-repo`.
3. Every `npm install` clones the attacker repo and runs its `prepare`
   script, which contains the payload.
4. Payload steals secrets from the install environment (CI tokens,
   dev workstation env vars, `.npmrc` credentials).

A normal-looking `package.json` review easily misses this because the
attention goes to the *names* of new deps, not the *source URLs*. The
lint forces every exotic source to be either swapped out or explicitly
allowlisted — every exception becomes a discrete, reviewed decision.

The companion lockfile-integrity policy (Wave 1, #1283) handles a
related but distinct attack: tampering with `package-lock.json` after
the fact. The two controls together close the dep-injection vector
from manifest to lockfile.

## Reading the failure output

A failing run looks like:

```
✗ Dependency source policy violation: 1 issue

  /path/to/package.json > optionalDependencies > "some-pkg"
    source: git+https://github.com/example/some-pkg.git
    pattern: git+* (git+ scheme prefix)
    fix: swap to a registry version, or allowlist it in
         ci/dep-source-allowlist.yaml with name, source-pattern,
         rationale, last-reviewed-date

See docs/contributing/dependency-sources.md for the policy rationale.
Allowlist file: ci/dep-source-allowlist.yaml
```

Three things to look at:

1. **Where** — the bucket (`dependencies`, `devDependencies`,
   `optionalDependencies`, `peerDependencies`) and the dep name. Or for
   transitive violations, the lockfile path
   (`package-lock.json > node_modules/foo/node_modules/bar`).
2. **Source** — the exact string that triggered the rule.
3. **Pattern** — which of the six rules matched.

## How to fix a violation

### First choice: swap to a registry version

99% of legitimate use cases have a registry equivalent. If you added a
git dep because you needed an unreleased bugfix, check whether the fix
is in a newer registry version. If you forked an upstream package, ask
whether the fork can be published to npmjs.org under a scoped name.

### Second choice: allowlist the dep

If the registry doesn't have what you need (rare, but legitimate cases
exist — e.g., an internal package hosted on a private git server that
isn't an npm registry), add an entry to `ci/dep-source-allowlist.yaml`:

```yaml
allowlist:
  - name: my-internal-pkg
    source-pattern: git+ssh://git@internal-host/team/my-internal-pkg.git
    rationale: |
      Internal-only package. The team's git server is not an npm
      registry. Sister project also uses this dep with the same
      source pattern.
    last-reviewed-date: 2026-05-12
    reviewer: jmagly
```

### Schema requirements

Every allowlist entry needs:

- **`name`** — exact package name match (no globs).
- **`source-pattern`** — either an exact string match or a regex in
  the form `/regex/flags`. Exact-string is preferred; regex is for
  cases where the URL contains a version number that rotates.
- **`rationale`** — why this is acceptable. "Required for build" is
  not enough — say *why* a registry version isn't available, and
  what the source you're trusting actually is.
- **`last-reviewed-date`** — when the rationale was last sanity-checked.
- **`reviewer`** — optional but recommended; helps the next person who
  reviews the file know whom to ask.

### When **not** to allowlist

- **You added the dep because the registry version was outdated.** Get a
  newer registry version published instead; allowlist entries become
  permanent technical debt.
- **You're not sure what the dep does.** Find out first. An exotic-source
  dep is exactly the place where "we'll figure it out later" turns into
  a supply-chain incident.
- **The source URL points to a personal GitHub fork.** Almost always a
  red flag. Fork ownership rotates; the trust relationship doesn't
  survive an account transfer.

## Running the check locally

```bash
npm run lint:dep-sources
```

The check is fast (parses two JSON files and walks the entries). Run it
before pushing to avoid CI round-trips. The script:

- Exits 0 if no violations.
- Exits 1 on any violation, with a detailed report.
- Exits 2 on a fatal error (allowlist parse failure, missing file, etc.).

Useful flags:

```bash
node tools/lint/dep-source.mjs --help              # show options
node tools/lint/dep-source.mjs --quiet             # silent on success
node tools/lint/dep-source.mjs --allowlist <path>  # use a different allowlist
```

## Review cadence

Allowlist entries should be re-reviewed quarterly, or whenever:

- The dep's upstream ownership changes (a maintainer leaves, the project
  is transferred, the repo is renamed).
- The dep's source URL changes (host migration, branch rename).
- The dep accumulates known vulnerabilities — at which point the
  rationale needs to be updated to acknowledge the new risk surface.

If an entry's `last-reviewed-date` is older than 90 days, that's
technical debt; consider whether the dep can be swapped to a registry
version or removed entirely.

## Related

- **ADR**: `.aiwg/architecture/adr-dep-source-policy.md` — full policy
  rationale and alternatives considered.
- **Allowlist file**: `ci/dep-source-allowlist.yaml`.
- **Lint script**: `tools/lint/dep-source.mjs`.
- **Companion controls**: lockfile integrity (#1283), pinned containers
  and actions (#1281, #1282), postinstall hook removal (#1279).
- **Threat model**: control C22 in `docs/security/supply-chain-hardening-plan.md`.
