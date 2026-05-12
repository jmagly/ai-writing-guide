# AIWG Publish Pipeline & Lifecycle Audit

**Document ID**: AUDIT-001-PUBLISH-PIPELINE
**Version**: 0.1 (DRAFT)
**Created**: 2026-05-12
**Scope**: `.gitea/workflows/*.yml`, `bin/postinstall.mjs`, `package.json` (lifecycle/files/optional deps), `.npmignore`
**Trigger**: Aikido Security report — Mini Shai-Hulud npm worm, May 2026 (Silva, 2026-05-12)
**Companion documents**:
- @.aiwg/security/working/threat-model-supply-chain.md — STRIDE + scenarios
- @.aiwg/research/working/supply-chain-defenses-brief.md — control catalog

---

## Executive Summary

This audit reviews AIWG's release surface against the controls implicated by the Mini Shai-Hulud incident class. The review is read-only and produces remediation recommendations, not code changes.

- **Findings**: 15 (3 CRITICAL, 5 HIGH, 5 MEDIUM, 2 LOW)
- **Rule violations**: 4 existing AIWG rules are actively violated by current workflows (`dev-pipeline-safety`, `dev-secret-hygiene`, `dev-idempotent-builds`, `dev-ci-self-contained`)
- **Highest-priority fixes**: (1) digest-pin containers and SHA-pin all Actions across all 11 workflows; (2) choose a supported npmjs.org trusted-publishing/provenance path or document token fallback controls; (3) remove or sandbox `postinstall` hook; (4) replace Gitea environment-secret assumptions with supported release-gate controls; (5) remove `continue-on-error: true` from the stable-publish test step; (6) reject unexpected git/tarball/exotic dependency sources
- **Surface size**: 11 Gitea Actions workflows, 5+ distinct secret types (NPM_TOKEN, NPMJS_TOKEN, GT_ACCESS_TOKEN, GH_TOKEN, AIWG_IO_DISPATCH_TOKEN, DEPLOY_*), 1 lifecycle script, 7 optional native-binding dependencies

## Workflow × Control Inventory

| Workflow | Triggers | Container | Actions pinning | Has secrets? | PR-triggered? | OIDC? | Provenance? |
|----------|----------|-----------|-----------------|--------------|---------------|-------|-------------|
| `npm-publish.yml` | tag `v*`, workflow_dispatch | `node:20` (tag) | `actions/checkout@v4` (tag) | NPM_TOKEN, NPMJS_TOKEN | No | No | No |
| `gitea-release.yml` | tag | `node:20` (tag) | `actions/checkout@v4` (tag) | NPM_TOKEN | No | No | n/a |
| `github-mirror.yml` | tag | `node:20` (tag) | `actions/checkout@v4` (tag) | GH_TOKEN | No | No | n/a |
| `build-plugins.yml` | workflow_dispatch + push | `node:20` (tag) | `actions/checkout@v4` (tag) | None | No | No | n/a |
| `ci.yml` | push, pull_request | `node:20` (tag) | `actions/checkout@v4` (tag) | None visible | **Yes** | No | n/a |
| `conformance.yml` | push, pull_request (label-gated) | container block | `actions/checkout@v4` (tag) | None visible | **Yes** (gated) | No | n/a |
| `docsite-build.yml` | push, pull_request | `node:20` (tag) | `actions/checkout@v4` (tag) | GT_ACCESS_TOKEN | **Yes** | No | n/a |
| `docsite-deploy.yml` | push | `node:20` (tag) | `actions/checkout@v4` (tag) | GT_ACCESS_TOKEN, DEPLOY_SSH_KEY, DEPLOY_PORT, DEPLOY_USER, DEPLOY_HOST, DEPLOY_PATH | No | No | n/a |
| `metadata-validation.yml` | push, pull_request | `node:20` (tag) | `actions/checkout@v4` (tag) | None visible | **Yes** | No | n/a |
| `notify-site.yml` | (manual/release) | ubuntu-latest | n/a | AIWG_IO_DISPATCH_TOKEN | No | No | n/a |
| `skill-lint-pr.yml` | pull_request | `node:20` (tag) | `actions/checkout@v4` (tag) | GITHUB_TOKEN (Gitea-issued) | **Yes** | No | n/a |

Five workflows fire on `pull_request`. Of those, three (`docsite-build.yml`, `metadata-validation.yml`, `skill-lint-pr.yml`) reference secrets. This is the highest-leverage area for the "malicious PR alters workflow" attack class.

## Findings

### CRITICAL

#### F1. Lifecycle script `postinstall` runs on every user install (no opt-out gate)

**Location**: `package.json:scripts.postinstall` → `bin/postinstall.mjs`
**Current state**: `postinstall` is benign — runs `aiwg --version` via `execSync` with `stdio: 'ignore'`, prints PATH guidance. No network, no file writes outside stdout, no env enumeration.
**Risk**: The script body is fine; the *capability* is the worm propagation primitive. If a future malicious version of `aiwg` ships, every `npm install -g aiwg` and every CI runner installing aiwg as a dep runs attacker code under user UID. This is the exact mechanism Mini Shai-Hulud abuses (`router_init.js`, `tanstack_runner.js`).
**Recommended fix**: Remove `scripts.postinstall` from `package.json`. Move the PATH guidance to first-run output of `aiwg help` or `aiwg doctor`. Document the removal in CHANGELOG and the related ADR.
**Effort**: S
**Rule**: Not currently codified; propose new rule `no-install-scripts.md` under aiwg-utils.
**References**: Aikido report (Silva, 2026-05-12, GRADE: MODERATE — vendor incident report); threat model S3.

#### F2. No OIDC trusted publishing — long-lived `NPMJS_TOKEN` stored as repo secret

**Location**: `npm-publish.yml:112,142,164,197,284,361,398,433` (all references to `secrets.NPMJS_TOKEN` and `secrets.NPM_TOKEN`)
**Current state**: Two long-lived tokens persist as Gitea Actions repo secrets. `NPMJS_TOKEN` is documented as bypassing 2FA for CI. Either token, if exfiltrated, lets an attacker publish a malicious version under the legitimate package name with no second factor.
**Risk**: Direct match to Shai-Hulud S1 (token theft → malicious publish). Mini Shai-Hulud (May 2026 wave) demonstrated attackers using stolen tokens to publish 169+ packages within hours.
**Recommended fix**: Do not plan this as an in-place Gitea Actions edit. Current npm trusted-publishing docs require npm CLI 11.5.1+ and Node 22.14.0+, support only selected cloud-hosted providers (GitHub Actions, GitLab CI/CD, CircleCI), and do not list Gitea Actions or self-hosted runners. Decide whether npmjs.org publishing moves to a GitHub-hosted mirror workflow, or whether AIWG keeps a constrained npm token with compensating controls until provider support changes. For Gitea's npm registry, continue treating a scoped token as required unless/until Gitea package publishing supports an equivalent trusted path.
**Effort**: M-L (release-path migration and token fallback decision)
**Rule**: New rule `release-trusted-publishing.md` under security-engineering or sdlc.
**References**: npm trusted-publishing docs (`https://docs.npmjs.com/trusted-publishers`, verified 2026-05-12); npm provenance docs (`https://docs.npmjs.com/generating-provenance-statements`); threat model S1, C-A.

#### F3. Builder image `node:20` is tag-pinned, not digest-pinned (all 11 workflows)

**Location**: every workflow file declares `container: node:20`
**Current state**: `node:20` is a mutable tag. The Docker Hub maintainer team could re-point it; a compromised upstream could replace it with a malicious image whose `npm` binary is trojanized. Build runs would fetch the malicious image and execute it with all secrets in scope.
**Risk**: Direct supply-chain attack vector. Even without active compromise, the build is non-reproducible because `node:20` changes contents over time (`dev-idempotent-builds.md` rule violation).
**Recommended fix**: Pin every `container:` reference to immutable digest form, but split release-publish requirements from runtime support. Existing workflows use `node:20`, while npm trusted publishing currently requires Node 22.14.0+ and npm 11.5.1+. Non-publish jobs can stay on digest-pinned Node 20 if that remains the support baseline; npmjs.org trusted-publishing jobs need a Node 22+ release image if A5 moves forward.
**Effort**: S per workflow, M for all 11 + digest-update process
**Rule**: `dev-idempotent-builds.md` (rule 2 already requires this)
**References**: threat model S5, C-E.

### HIGH

#### F4. `continue-on-error: true` on test step in stable publish

**Location**: `npm-publish.yml:222` — `Run tests` step in `build-and-publish` job
**Current state**: Stable publish path runs `npm test -- --run` with `continue-on-error: true`. Test failures do not block publish.
**Risk**: A regression that fails tests still ships to npmjs.org. More relevant to this audit: a malicious dependency that breaks tests would still publish. This is the classic CI-signal-suppression pattern.
**Recommended fix**: Remove `continue-on-error: true`. If specific tests are flaky in the container environment, identify and either fix or quarantine them explicitly (per `dev-pipeline-safety.md` rule 3).
**Effort**: S (likely surfaces some flake to fix)
**Rule**: `dev-pipeline-safety.md` rule 2 (active violation), `anti-laziness.md` rule 8 (CI signal suppression).
**References**: threat model C-G.

#### F5. All `uses: actions/...@v4` references are major-tag-pinned, not SHA-pinned

**Location**: every workflow uses `actions/checkout@v4`; `notify-site.yml`, `github-mirror.yml` use additional Actions
**Current state**: A compromised maintainer or namespace squat on `actions/checkout` would silently replace the action body via the mutable tag. Every workflow run then executes the malicious replacement.
**Risk**: Supply-chain compromise of any Action used in a publish workflow yields RCE in CI with all secrets in scope.
**Recommended fix**: SHA-pin every `uses:` reference (`actions/checkout@<40-char-sha> # v4.1.7`). Use Dependabot or equivalent to bump intentionally. Document the pinning policy in `.gitea/workflows/README.md` or similar.
**Effort**: M (11 workflows × N actions each)
**Rule**: `dev-idempotent-builds.md` rule 4 (active violation).
**References**: threat model S5, C-F.

#### F6. Publish secrets are repo-scoped, no environment + deployment-protection gate

**Location**: All publish workflows reference `secrets.NPM_TOKEN` / `secrets.NPMJS_TOKEN` directly without an `environment:` block
**Current state**: Secrets are accessible to any workflow run on protected branches/tags. There is no two-person review gate before the publish job sees the secret. A single compromised contributor (or compromised maintainer machine pushing a tag) bypasses any human review.
**Risk**: Shai-Hulud S2 (workflow injection): a malicious change merged to main and tagged could run with publish secrets in scope.
**Recommended fix**: Do not assume GitHub-style `environment:` gates work on Gitea. Current Gitea Actions comparison docs state `jobs.<job_id>.environment` is ignored. Use compensating controls now: protected tags, signed tags, a dedicated publish runner, scoped/rotated tokens, a manual release-approval record, and a release-path ADR. If AIWG moves npmjs.org publishing to GitHub-hosted Actions for trusted publishing, use GitHub environments there; keep Gitea registry publishing on its own constrained path.
**Effort**: M
**Rule**: `dev-secret-hygiene.md` rule 2 (active violation).
**References**: Gitea Actions comparison docs (`https://docs.gitea.com/usage/actions/comparison`, verified 2026-05-12); threat model S2, C-H.

#### F7. Five workflows trigger on `pull_request`; three reference secrets

**Location**:
- `ci.yml:11` — `pull_request` (no secrets visible in survey, but `npm ci` could be attacked via lockfile from fork)
- `conformance.yml:41` — `pull_request` (label-gated, OK)
- `docsite-build.yml:12` — `pull_request` AND uses `secrets.GT_ACCESS_TOKEN` (line 33) — **risk**
- `metadata-validation.yml:19` — `pull_request` (no secrets visible in survey)
- `skill-lint-pr.yml:13` — `pull_request` AND uses `secrets.GITHUB_TOKEN` for posting comments (line 106) — **risk**

**Current state**: PR-triggered workflows from forks (if forks are enabled) can execute arbitrary code with the secrets the workflow references. `docsite-build.yml` clones a separate Gitea repo using `GT_ACCESS_TOKEN` interpolated into the URL — if this runs from a fork PR, the token is exposed. `skill-lint-pr.yml` posts comments using a Gitea-issued `GITHUB_TOKEN` — typically issued per-run with limited scope, but should be confirmed.
**Risk**: Shai-Hulud S2 variant. Gitea forks may behave differently than GitHub here; verify whether Gitea Actions secrets are exposed to fork PRs by default.
**Recommended fix**: For each PR-triggered workflow with secrets: (a) verify whether forks can trigger it (Gitea-specific behavior — confirm via docs.gitea.com); (b) move secret-using steps out of PR triggers OR add an explicit `if:` guard checking `github.event.pull_request.head.repo.full_name == github.repository`; (c) for `docsite-build.yml`, the token interpolation in the git URL is the classic exposure pattern — move to credential helper or split into a separate non-PR job.
**Effort**: M
**Rule**: `dev-secret-hygiene.md` rules 1-2 (active violation in `docsite-build.yml`).
**References**: threat model S2.

#### F8. No release artifact signing (Sigstore / cosign / gpg) and no signed git tags

**Location**: No signing step anywhere in `npm-publish.yml`, `gitea-release.yml`, `github-mirror.yml`. Git tags are unsigned (visible via `git tag -v v2026.5.2` returning "no signature").
**Current state**: A downstream consumer who fetches the npm tarball, the Gitea release archive, or the GitHub release archive has no cryptographic way to verify origin. Any compromised mirror or registry can substitute content silently.
**Risk**: Shai-Hulud S6 (GitHub mirror desync). Lower likelihood but high impact if it occurs.
**Recommended fix**: Sign git tags with GPG (or SSH-signing). Sign npm tarball with Sigstore via `cosign sign-blob` and publish the signature alongside the Gitea release. Publish per-release SHA-256 manifest (signed) for downstream consumers. Long term: emit npm provenance attestations (depends on F2).
**Effort**: M-L
**Rule**: New rule `release-artifact-signing.md` under security-engineering.
**References**: threat model C-C, C-D.

### MEDIUM

#### F9. `package.json` `files` and `.npmignore` conflict (`dist/` listed in both)

**Location**: `package.json:files` includes `dist/`; `.npmignore` line containing `dist/`
**Current state**: When `files` is present, it wins over `.npmignore`, so `dist/` does ship. The conflict signals confusion in repo intent and creates risk that a future contributor edits `.npmignore` expecting it to govern, but the actual tarball is governed by `files`.
**Risk**: Low direct risk; meaningful as a hygiene issue. The deeper concern is the absence of a tarball-content CI assertion (no step that diffs `npm pack --dry-run` output against an expected manifest). Mini Shai-Hulud added `router_init.js` to the tarball root — a CI assertion would have caught it.
**Recommended fix**: (a) Remove `dist/` and other `files`-allowlisted entries from `.npmignore` to eliminate the conflict; rely on `files` as the single source of truth. (b) Add a CI step that runs `npm pack --dry-run` and compares the file list against `ci/expected-tarball-contents.txt`. Fail if new files appear without explicit allowlist update.
**Effort**: S
**Rule**: New rule or extension to `dev-idempotent-builds.md`.
**References**: threat model C-J.

#### F10. 7 optional dependencies include native-binding packages with build hooks

**Location**: `package.json:optionalDependencies` — `node-pty`, `better-sqlite3`, `hnswlib-node`, `@xenova/transformers`, `hono`, `@hono/node-server`, `ws`
**Current state**: `node-pty`, `better-sqlite3`, `hnswlib-node` are native modules that run `node-gyp` or prebuild scripts at install time. If any of them is ever compromised, the malicious build script runs under user UID at every aiwg install (when the optional dep is installable on the user's platform).
**Risk**: Transitive lifecycle-hook exposure. Indirectly amplifies F1 (even if AIWG removes its own postinstall, optional native deps re-introduce the install-time execution surface).
**Recommended fix**: (a) Audit each optional dep — is it truly needed at install? Can `@xenova/transformers` and `better-sqlite3` move to runtime-loaded peer deps that the user opts into? (b) Document the install-time risk in the SECURITY.md (to be added — see F14). (c) Track each dep's maintainer set, signing status, and last-audit date in `ci/dep-risk-register.yaml`.
**Effort**: M (audit) + L (architectural shift if some deps move to peer)
**Rule**: New rule `optional-dep-policy.md`.
**References**: threat model C-K, S5 variant.

#### F11. Token in URL — `docsite-build.yml`/`docsite-deploy.yml` interpolate `GT_ACCESS_TOKEN` into git clone URL

**Location**: `docsite-build.yml:33`, `docsite-deploy.yml:31` — `git clone https://token:${{ secrets.GT_ACCESS_TOKEN }}@git.integrolabs.net/roctinam/dbbuilder.git /tmp/dbbuilder`
**Current state**: Token appears in the clone URL. Even with `set +x`/no echo, the URL is in process arguments and can appear in error output, core dumps, or `ps` snapshots taken during the clone.
**Risk**: Token exposure if the workflow fails partway. Lower severity because GT_ACCESS_TOKEN is scoped to dbbuilder access, not to npm publishing, but token reuse / scope-creep is a common antipattern.
**Recommended fix**: Use `git credential helper` or `GIT_ASKPASS` with the token in an env var only, not in the URL. Verify GT_ACCESS_TOKEN scope is minimal (read-only on dbbuilder repo only). Document rotation cadence.
**Effort**: S
**Rule**: `token-security.md` rule 2 (active violation — token passed as command argument).
**References**: threat model adjacent.

#### F12. No `SECURITY.md` / vulnerability disclosure policy

**Location**: Repo root — file absent
**Current state**: AIWG has no published vulnerability disclosure channel. A researcher who finds a Shai-Hulud-class flaw has no documented private reporting path.
**Risk**: Increases time-to-disclosure if a vulnerability is found. Increases likelihood of public disclosure before fix.
**Recommended fix**: Add `SECURITY.md` at repo root. Document: (a) private reporting channel (encrypted email or Gitea security advisory if Gitea supports), (b) PGP/age key, (c) expected response SLA, (d) coordinated disclosure timeline. Cross-link from README.
**Effort**: S
**Rule**: New rule `security-disclosure-policy.md`.

#### F15. No dependency-source policy for git / tarball / exotic package references

**Location**: `package.json`, `package-lock.json`, CI install steps
**Current state**: The audit covers lifecycle scripts and optional deps, but does not separately gate dependency source protocols. Mini Shai-Hulud's newer path used an optional dependency that resolved from GitHub (`github:tanstack/router#...`) and executed its `prepare` script during install.
**Risk**: A future direct or transitive dependency can introduce a git, GitHub shorthand, direct tarball URL, or `file:` reference that bypasses normal registry trust/signature expectations and reintroduces install-time code execution through `prepare`.
**Recommended fix**: Add a CI lint that rejects unexpected non-registry dependency sources in `package.json` and lockfiles, with an explicit allowlist if any are ever required. If AIWG migrates installs/builds/tests to pnpm, enforce this through `pnpm-workspace.yaml` with `blockExoticSubdeps: true` plus lockfile linting. Track user-facing guidance as a dependency-source policy capability; npm/Yarn/Bun projects need equivalent lockfile/package manifest linting.
**Effort**: S-M
**Rule**: New rule `dependency-source-policy.md`.
**References**: Aikido Mini Shai-Hulud report (GitHub-hosted optional dependency marker); pnpm `blockExoticSubdeps` docs (`https://pnpm.io/settings#blockexoticsubdeps`).

### LOW

#### F13. No `npm audit` or `npm audit signatures` step in CI

**Location**: `ci.yml`, `npm-publish.yml` — no audit step before build/publish
**Current state**: Builds proceed without checking the dependency graph for known vulnerabilities or signature integrity.
**Risk**: Known-vulnerable transitive deps could ship; tampered registry responses could be installed without detection.
**Recommended fix**: Add `npm audit --audit-level=high` to CI gate. Add `npm audit signatures` to verify registry signatures for all installed packages. Allow exceptions via documented per-CVE waivers.
**Effort**: S
**Rule**: New rule `release-dependency-audit.md`.

#### F14. No Software Bill of Materials (SBOM) generation

**Location**: Build process — no SBOM emission
**Current state**: No CycloneDX / SPDX SBOM emitted alongside releases.
**Risk**: Downstream consumers (security-conscious orgs, SLSA Level 3+ consumers) cannot programmatically assess AIWG's dependency graph.
**Recommended fix**: Add SBOM generation step (`syft`, `npm-sbom`, or `@cyclonedx/cyclonedx-npm`) and attach the SBOM to each Gitea + GitHub release.
**Effort**: S-M
**Rule**: New rule `release-sbom.md`.

## Rule Violation Cross-Reference

| Existing rule | Violations in this audit | Fix tied to finding |
|---------------|-------------------------|---------------------|
| `dev-pipeline-safety.md` rule 2 | `continue-on-error: true` on stable publish tests | F4 |
| `dev-pipeline-safety.md` rule 3 | (compliant — no `--no-verify`, no failing-check deletion) | n/a |
| `dev-secret-hygiene.md` rule 1 | (compliant — no secrets in `pull_request` from forks confirmed-trigger; `docsite-build.yml` is borderline) | F7 |
| `dev-secret-hygiene.md` rule 2 | publish secrets repo-scoped, no environment + deployment-protection | F6 |
| `dev-idempotent-builds.md` rule 2 | `node:20` tag, not digest-pinned (all 11 workflows) | F3 |
| `dev-idempotent-builds.md` rule 4 | `actions/checkout@v4` major-tag-pinned, not SHA-pinned | F5 |
| `dev-ci-self-contained.md` rule 2 | `docsite-build.yml`/`docsite-deploy.yml` clone external `dbbuilder` repo during build | F11 (related) |
| `token-security.md` rule 2 | `GT_ACCESS_TOKEN` passed in git URL | F11 |
| `anti-laziness.md` rule 8 | CI signal suppression on stable publish tests | F4 |

Nine distinct active rule violations across six rules. The rules exist; the workflows predate full enforcement.

## Prioritized Remediation Order

1. **F1 + F4 + F11** (effort S each) — remove postinstall, remove `continue-on-error`, fix token-in-URL. Quick wins, no infra dependencies.
2. **F3 + F5** (effort M total) — digest-pin builder image, SHA-pin Actions. Establish digest-update process.
3. **F2 + F6 + F7** (effort M-L) — supported trusted-publishing/token-fallback decision + Gitea release-gate compensating controls + PR-trigger audit.
4. **F8** (effort M-L) — release signing (Sigstore + signed tags).
5. **F9 + F13 + F14 + F15** (effort S-M) — tarball assertion, dependency audit/signature gate, SBOM, dependency-source lint. Bundle as release-quality-gate.
6. **F12** (effort S) — `SECURITY.md`.
7. **F10** (effort M for audit, L if optional-deps move to peer) — optional native-binding deps audit.

## Out of Scope (this audit)

- Full dependency-graph SBOM analysis (deferred to F14 implementation)
- Audit of `agentic/code/` deployed artifact integrity (separate audit — covers the AI-runtime trust boundary)
- Penetration testing of the Gitea instance itself
- Disclosure/incident-response runbook for an actual AIWG compromise (separate document; should be authored before remediation phase 1 completes)

---

**Status**: Draft. To be reviewed against `.aiwg/security/working/threat-model-supply-chain.md` and folded into the master remediation plan at `.aiwg/planning/supply-chain-hardening-plan.md`.
