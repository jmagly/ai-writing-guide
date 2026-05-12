# AIWG Supply-Chain Hardening Plan

**Document ID**: PLAN-001-SUPPLY-CHAIN
**Version**: 0.1 (DRAFT)
**Created**: 2026-05-12
**Trigger**: Aikido report — Mini Shai-Hulud npm worm, May 2026 (Silva, 2026-05-12). 169 packages / 373 versions compromised across TanStack, Mistral, UiPath, et al.
**Status**: Planning — no code changes; awaiting review before implementation.

## Companion Documents

- @.aiwg/security/working/threat-model-supply-chain.md — STRIDE + 10 Shai-Hulud-class scenarios + 19-control matrix
- @.aiwg/security/working/publish-pipeline-audit.md — 15 findings against AIWG's actual workflows (file:line precision)
- @.aiwg/research/working/supply-chain-defenses-brief.md — 22-control defensive catalog + Gitea Actions caveats + AIWG applicability matrix

## Why This Plan Exists

AIWG is a high-blast-radius npm package. It deploys context to 10 AI coding platforms — every `aiwg use` writes hundreds of files into directories the user's AI assistant reads as system-prompt content. A compromised AIWG release becomes a worm-grade amplifier: lifecycle script runs on user UID, deployed agent definitions can encode token-exfiltration logic the AI executes against the user's project, and the dual-registry distribution (npmjs.org + self-hosted Gitea) gives an attacker two parallel publish paths.

AIWG is **not currently compromised**. AIWG **structurally resembles** the packages that Mini Shai-Hulud has been compromising: lifecycle script + long-lived publish tokens + tag-pinned builder image + no provenance + no signing + small maintainer team. The plan below closes that gap.

## Two Tracks

| Track | Audience | Output |
|-------|----------|--------|
| **Track A — AIWG-self hardening** | AIWG maintainers | Code/workflow/process changes to harden AIWG's own publish pipeline. Driven by audit findings F1-F15. |
| **Track B — User-facing framework capabilities** | AIWG users (any project that ships software) | New skills, rules, agents, templates that let users adopt the same controls in their own pipelines. Driven by the C16-C18 / C13 / C7-C8 / C21 controls flagged "B" or "C" in the applicability matrix. |

Both tracks are filed as a single Gitea epic with sub-issues per capability. Track A is priority:critical, Track B is priority:high.

## Track A — Phased Roadmap (AIWG-self)

### Phase 1 — Next Release (target: 2026.6.x series)

Cost-benefit calibrated for "ship before the next exposure window."

| # | Control | Audit Finding | Effort | Owner | Acceptance |
|---|---------|---------------|--------|-------|-----------|
| A1 | Remove `postinstall` lifecycle script | F1 | S | sdlc | `package.json` no longer has `scripts.postinstall`; PATH guidance migrated to `aiwg doctor` first-run output; CHANGELOG entry; ADR documenting the removal |
| A2 | Remove `continue-on-error: true` from stable-publish test step | F4 | S | sdlc | `npm-publish.yml:222` no longer has `continue-on-error`; any tests surfaced as failing are either fixed or quarantined explicitly per `dev-pipeline-safety` |
| A3 | Digest-pin workflow containers, with a release-path decision for Node 22 | F3 | M | sdlc | Non-publish workflows declare `node:20@sha256:<hex>` or an explicitly approved replacement; npmjs.org trusted-publishing path uses Node 22.14.0+ if adopted; `ci/digests.txt` tracks digest + intentional-update process |
| A4 | SHA-pin all `uses: actions/...@v*` references | F5 | M | sdlc | Every `uses:` references a 40-char SHA with a trailing version comment; Dependabot (or equivalent) configured for intentional bumps |
| A5 | Adopt npm trusted publishing/provenance on a supported provider, or document token fallback | F2 | M-L | sdlc | npmjs.org publish path is moved to a supported cloud-hosted provider (currently GitHub Actions/GitLab/CircleCI per npm docs) with Node 22.14.0+ and npm 11.5.1+, OR an ADR documents why AIWG keeps a constrained token temporarily; `NPMJS_TOKEN` removed only after trusted publishing is verified |
| A6 | Fix `GT_ACCESS_TOKEN`-in-URL antipattern (`docsite-build.yml`, `docsite-deploy.yml`) | F11 | S | sdlc | Token no longer interpolated into git URL; uses `GIT_ASKPASS` or credential helper; token scope verified minimal |
| A7 | Add `SECURITY.md` with private vulnerability reporting | F12 | S | sdlc | `SECURITY.md` at repo root; documented PGP/age key; documented response SLA; cross-linked from README |

**Phase 1 exit criteria**: All 7 above merged, CHANGELOG entry, 2026.6.0 stable release tagged with provenance attestation visible on npmjs.org, `npm view aiwg@latest --json` includes a non-null `dist.attestations` field.

### Phase 2 — Q3 2026

| # | Control | Audit Finding | Effort | Owner | Acceptance |
|---|---------|---------------|--------|-------|-----------|
| A8 | Sigstore-sign release tarballs + per-release signed manifest | F8 | M-L | sdlc + security-eng | `cosign sign-blob` on every published tarball; signed manifest (SHA-256 + version + tag SHA) attached to Gitea + GitHub release; verification command documented in `docs/releases/verifying.md` |
| A9 | Sign git tags (GPG or SSH-signing) | F8 | S | sdlc | `git tag -v <vN>` returns valid signature; CI verifies tag signature before publish |
| A10 | Replace Gitea environment-scoped-secret assumption with supported release-gate controls | F6 | M | sdlc | Current Gitea docs say `jobs.<job_id>.environment` is ignored; implement compensating controls: signed tags, protected tag/release workflow, dedicated publish runner, manual release approval record, and scoped/rotated tokens until native Gitea environment protection exists |
| A11 | Tarball content audit step | F9 | S | sdlc | CI step diffs `npm pack --dry-run` against `ci/expected-tarball-contents.txt`; fails on unexpected additions; expected manifest updated only via explicit commit |
| A12 | `npm audit signatures` gate in publish CI | F13 | S | sdlc | Pre-publish step runs `npm audit signatures`; fails on unsigned or invalid package |
| A13 | SBOM generation attached to releases | F14 | S-M | sdlc | CycloneDX SBOM (`@cyclonedx/cyclonedx-npm`) emitted alongside tarball; attached to Gitea + GitHub release |
| A14 | PR-trigger workflow audit and hardening | F7 | M | sdlc | Each of the 5 PR-triggered workflows reviewed; fork-PR secret exposure mitigated per workflow; Gitea fork-PR default behavior documented |
| A15 | Release-age gate enabled for AIWG CI installs | (new — covers C16) | S | sdlc | 7-day baseline enforced for installs; pnpm target config is `minimumReleaseAge: 10080` in `pnpm-workspace.yaml`; npm fallback is `.npmrc` `min-release-age=7`; lockfile regeneration workflow is documented so the gate applies before newly published versions enter the lockfile |
| A20 | Lockfile/package-manifest policy rejects unexpected git/tarball/exotic dependencies | (new — covers C22) | S-M | sdlc | CI fails if `package.json` or `package-lock.json` contains unexpected `git+`, `github:`, direct tarball URL, or `file:` dependency sources; allowlist is explicit and reviewed |
| A21 | Spike and implement pnpm workspace migration for AIWG installs/builds/tests | (new — supports C15/C16/C22) | M-L | sdlc | Root, `apps/web`, `tools/eval`, and addon package installs evaluated for one pnpm workspace + `pnpm-lock.yaml`; workflows use `pnpm install --frozen-lockfile`; npm remains only where required for npmjs.org publishing |

**Phase 2 exit criteria**: All above merged; AIWG passes OpenSSF Scorecard at score >= 7/10 (verify exact threshold); two-person rule enforced on all publish workflows.

### Phase 3 — Longer term (Q4 2026 / 2027)

| # | Control | Audit Finding | Effort | Notes |
|---|---------|---------------|--------|-------|
| A16 | Audit and minimize optional native-binding deps (`better-sqlite3`, `node-pty`, `hnswlib-node`, etc.) | F10 | M-L | May involve architectural shift — some deps move from `optionalDependencies` to runtime-loaded peer deps |
| A17 | Egress filter on publish-runner | (operational, no finding) | L | Restrict outbound to npmjs.org, Gitea, GitHub mirror only |
| A18 | Dedicated publish-only runner separate from CI runner | (operational) | M-L | Isolates publish secrets from broader CI surface |
| A19 | Disclosure runbook + tabletop incident exercise | F12 follow-up | M | Practice the incident response that `SECURITY.md` documents |

## Track B — User-Facing Framework Capabilities

These are new framework artifacts (skills, rules, agents, templates) that ship via `aiwg use` so that AIWG users can adopt the same controls in their own projects. Track B is priority:high but not priority:critical — it doesn't gate AIWG-self hardening.

| # | Capability | Type | Maps to control(s) | Effort | Notes |
|---|-----------|------|--------------------|--------|-------|
| B1 | `supply-chain-audit` skill | skill | C7, C8, C9, C13, C18 | M | One-shot audit of a user's repo: surfaces tag-pinned actions, unpinned containers, unfiltered PR-triggered workflows with secrets, lifecycle scripts, missing `npm audit signatures` gate |
| B2 | `release-age-gate` skill | skill | C16 | S | Scaffolds npm `.npmrc`, pnpm `pnpm-workspace.yaml`/global config, `.yarnrc.yml`, `.bunfig.toml`, and CI config for a 7-day default / 10-day high-sensitivity age gate; verifies package-manager versions; documents Corepack-pin gotcha |
| B3 | `ci-action-pinning` rule | rule | C7, C8 | S | Lint rule that flags `uses:` references not SHA-pinned and `container:` references not digest-pinned. Companion to existing `dev-idempotent-builds.md` |
| B4 | `lifecycle-script-policy` rule | rule | C13 | S | Rule + guidance on auditing `pre/post-install`, `prepare`, `prepublishOnly` hooks in own package and in dep graph |
| B5 | `release-signing` skill | skill | C3, C4 | M | Scaffolds Sigstore/cosign signing and GPG/SSH tag signing into a user's release workflow |
| B6 | `trusted-publishing` skill | skill | C1, C2 | M | Guides a user through migrating from static npm tokens to OIDC trusted publishing on npmjs.org; checks provider OIDC support |
| B7 | `security-md-template` template | template | C21 | S | `SECURITY.md` template with placeholders for private channel, PGP key, response SLA |
| B8 | `tarball-audit` skill | skill | C18 | S | Scaffolds the `npm pack --dry-run` vs expected manifest check |
| B9 | `sbom-emit` skill | skill | C12 | S-M | Scaffolds CycloneDX SBOM generation into user release workflow |
| B10 | `workflow-injection-audit` skill | skill | C9, C10 | M | Audits user's CI workflows for PR-triggered + secret-referencing combinations; flags exposure |
| B11 | Supply-chain incident-response runbook | template + flow | n/a | M | Template for what to do when you discover you shipped (or installed) a compromised package |
| B12 | `dep-risk-register` skill | skill | (new — operational hygiene) | S | Scaffolds a `ci/dep-risk-register.yaml` tracking each runtime + optional dep, maintainer set, signing status, last-audit date |
| B13 | `dependency-source-policy` rule/skill | rule + skill | C22 | S-M | Blocks unexpected git, GitHub shorthand, direct tarball URL, and `file:` dependencies in manifests/lockfiles; includes pnpm `blockExoticSubdeps` guidance and lockfile lints for npm/Yarn/Bun |
| B14 | `pnpm-supply-chain-baseline` skill | skill | C15, C16, C22 | M | Helps projects migrate from npm/yarn/bun install workflows to pnpm workspace + frozen lockfile + release-age gate + exotic-dependency blocking where feasible |

## Gitea Epic + Sub-Issues — Filing Plan

One parent epic with Track A and Track B child issues. Initial filing covered A1-A15 plus Track B wave 1; verification cleanup added A20/A21 and B13/B14 follow-ups. Each child issue includes:

- `Blocks:` / `Blocked-by:` per ops-cross-repo rule
- Acceptance criteria
- Effort estimate
- Audit-finding cross-reference where applicable
- File:line refs into the audit doc

Labels:
- All issues: `area: security`, `area: supply-chain`
- Track A issues: `priority: critical`
- Track B issues: `priority: high`
- Phase 1 issues: `release/2026.6` milestone tag
- Phase 2 issues: `release/2026.q3` milestone tag

## Decisions Resolved (2026-05-12)

Operator decisions on the 7 outstanding questions surfaced by the audit pass:

1. **npmjs.org publish path**: Move npmjs.org publishing to **GitHub Actions** (via the existing GitHub mirror) for trusted publishing + provenance. Gitea Actions retains the Gitea-registry publish on a constrained, IP-allowlisted, quarterly-rotated `NPM_TOKEN`. Two parallel publish jobs with explicitly different threat models. Update A5 (#1283), A3 (#1281 — Node 22 image required for the GitHub-side runner).
2. **pnpm migration scope (A21 spike)**: Spike covers **root + `apps/web` + `tools/eval`**. addon packages and `vscode-extension` are deferred to a Phase 3 follow-up after the spike's lessons land. Update A21.
3. **Release-age gate**: **7 days everywhere; 10 days on publish workflows.** Slightly more conservative than Aikido's 5-day baseline. Update A15 (#1290) and B2 (#1292).
4. **Gitea release approval (A10 compensating controls)**: **Signed tags as the HARD gate** (CI verifies signature, fails publish if unsigned) plus a manual approval record in the release notes. Closes S2/S8 robustly without depending on Gitea environment support that doesn't exist. Update A10 (#1286) and A9 (#1287 — A9 becomes load-bearing rather than supplementary).
5. **Postinstall removal (A1)**: PATH guidance migrates to **`aiwg doctor`** (primary) **plus a README first-run section** (lowest-overhead documentation). No first-failed-command interceptor; no `--help` clutter. Update A1 (#1279).
6. **Optional native deps (A16)**: **Stay Phase 3.** No promotion. Publish-pipeline controls in Phase 1+2 are higher leverage; native deps are real but not acute risk and none appears on May 2026 target lists.
7. **Track B priority**: **B2 (release-age-gate skill) ships first** after AIWG-self Phase 1 starts. Smallest effort, highest value-per-token, dogfoods cleanly off A15. B1 (supply-chain-audit) and B13 (dep-source-policy) follow.

These decisions are authoritative for implementation. Issue bodies and acceptance criteria should be re-read against this section before work begins.

## Completion Sequence (Locked 2026-05-12)

After the decision-resolution round, the implementation order is fixed at nine waves. Each wave's exit is the next wave's entry. Within a wave, issues are parallel unless explicitly ordered.

| Wave | Issues | Effort | Risk closed |
|------|--------|--------|-------------|
| **1 — Free wins** (four separate commits) | #1279 (A1), #1280 (A2), #1284 (A6), #1285 (A7) | 4× S | S3 (worm amplifier removed); three active rule-violation fixes |
| **2 — Workflow hardening** (per-workflow PRs) | #1281 (A3), #1282 (A4), #1300 (A20 — dep-source policy) | M + M + S-M | S5 (builder hijack); injection vector |
| **3 — Tag signing** | #1299 (A9 — split from #1287) | S | Establishes the cryptographic gate for waves 4-5 |
| **4 — Compensating controls + trusted publishing** | #1286 (A10), #1283 (A5) | M + M-L | S1 (NPMJS_TOKEN eliminated on the npmjs.org leg); S2 substantially mitigated |
| **5 — Tarball signing** | #1287 (A8 only — A9 split out to #1299) | M | S6 (mirror desync), S9 partial |
| **6 — Publish-time evidence** | #1288 (A11+A12+A13) | S + S + S-M | Mini-Shai-Hulud tarball injection detected at publish time |
| **7 — pnpm + age gate** (A21 before A15) | #1301 (A21 — pnpm spike), #1290 (A15) | M-L + S | S7 (typo squat / cooldown window) |
| **8 — PR-trigger audit** | #1289 (A14) | M | S2 fully closed |
| **9 — Track B wave 1** | #1292 (B2 — ships first), #1294 (B7), #1293 (B3), #1291 (B1) | S, S, S, M | User-facing capabilities; AIWG-self adoption dogfoods each |
| **Phase 3 — after Track B wave 1** | A16, A17, A18, A19, B13, B14 | varies | Native-deps audit, egress filter, dedicated publish runner, disclosure runbook, dep-source Track B mirror, pnpm baseline Track B mirror |

### Wave-Specific Notes

- **Wave 1**: four separate commits, not bundled. Cleaner audit trail; cheaper to revert one without the others.
- **Wave 2**: per-workflow PRs for A3+A4 (one PR per workflow file). A20 ships as its own PR; lockfile + manifest policy is independent of the per-workflow digest/SHA pins.
- **Wave 3**: A9 (#1299) is the cryptographic gate everything in wave 4+ depends on. Single S-effort issue but load-bearing.
- **Wave 4**: A10 and A5 ship as one coordinated change. A10's signed-tag verify step lands in all three publish workflows (Gitea + Gitea-release + new GitHub Actions). A5 adds the GitHub Actions workflow and uses A10's verify step.
- **Wave 5**: A8 (tarball signing) requires the OIDC identity established in wave 4 for keyless cosign. Land it after A5.
- **Wave 7**: A21 spike resolves the workspace question before A15 commits to an implementation shape. A15 lands once in its final form (either pnpm-workspace.yaml or .npmrc fallback per spike outcome). Avoids implementing the 7/10-day gate twice.
- **Wave 8**: A14 narrower in scope after A10 (publish secrets already environment-equivalent-scoped via signed-tag gate). PR-trigger audit covers the non-publish secrets (GT_ACCESS_TOKEN, AIWG_IO_DISPATCH_TOKEN).
- **Wave 9**: B2 ships first (smallest, dogfoods off A15). B7 and B3 ride alongside (cheap, dogfood off A7 and A4). B1 ships last (uses AIWG's own audit as the reference output, so AIWG-self Phase 1+2 needs to be substantially complete).

### Risk-Reduction Milestones

| After wave | Scenarios closed | Cumulative |
|-----------|------------------|-----------|
| Wave 1 | S3 | 1 / 10 |
| Wave 2 | S5, partial S5 (dep injection) | 2 / 10 |
| Wave 3 | (gate prep, no direct closure) | 2 / 10 |
| Wave 4 | S1, substantial S2, partial S8 | 5 / 10 |
| Wave 5 | S6, partial S9 | 6 / 10 |
| Wave 6 | tarball-injection detection (cross-cuts S1/S2/S5) | 7 / 10 |
| Wave 7 | S7 | 8 / 10 |
| Wave 8 | full S2 | 9 / 10 |
| Wave 9 + Phase 3 | residual S8, S10 (out of epic scope; covered by separate AI-runtime threat model) | — |

## Out of Scope (this plan)

- Detailed Shai-Hulud incident analysis beyond what's needed to scope defenses (covered in the defenses brief).
- Penetration testing of the Gitea instance itself.
- Audit of `agentic/code/` deployed artifact integrity at user runtime (separate threat model — covers the AI-runtime trust boundary; planned as a follow-on).
- Marketing / community-communications about hardening adoption (separate; should follow Phase 1 completion).

## Sequencing Constraints

- **A2 must complete before A11** — tarball assertion depends on tests actually gating the publish, otherwise the assertion runs against a tarball produced from broken tests.
- **A5 should complete before A8** — OIDC adoption gives you the OIDC identity to sign with; cosign keyless signing uses the same OIDC.
- **A10 should complete with or before A5** — Gitea release-gate compensating controls are the partner to OIDC/token fallback decisions; doing trusted publishing while leaving broad legacy token paths in place preserves too much blast radius.
- **A7 should be Phase 1 not Phase 2** — `SECURITY.md` is free and the lack of a disclosure channel today is itself an operational gap.
- **A3 and A4 can be parallel** but should land in one PR per workflow to minimize churn.
- **B2 (release-age gate) is the cheapest user-facing win** — ship it early in Track B; default to 7 days, with a 10-day profile for release workflows.
- **A21 should precede full A15 enforcement if pnpm is adopted** — otherwise A15 must land as an npm fallback first, then be converted to pnpm workspace config.

## Risk Register Tracking

This plan inherits the risk register from `threat-model-supply-chain.md`. Each Phase 1 completion reduces residual risk on specific scenarios:

| Risk scenario (from threat model) | Closed/reduced by |
|----------------------------------|-------------------|
| S1 (token theft → malicious publish) | A5 (trusted publishing or constrained-token fallback) + A10 (release-gate controls) |
| S2 (workflow injection) | A4 (SHA-pinning) + A10 (release-gate controls) + A14 (PR-trigger audit) |
| S3 (lifecycle script abuse on user machines) | A1 (remove postinstall) |
| S5 (builder image hijack) | A3 (digest pin) + A4 (action SHA pin) |
| S6 (GitHub mirror desync) | A8 (Sigstore signing) + A9 (signed tags) |
| S7 (dependency confusion / typo squat) | A15 (release-age gate for AIWG-self) + A21 (pnpm migration) + B2 (ship to users) |
| S8 (maintainer account takeover) | A10 (release-gate controls) + operational (hardware 2FA — out of plan scope) |
| S9 (compromised AIWG-deployed artifact) | A8 (signing) + B5 (user-facing signing capability) |
| S10 (AI prompt-injection in deployed content) | partially A8 (integrity); fuller mitigation in follow-on threat model on AI-runtime boundary |

Phase 1 closes / substantially reduces 5 of 10 scenarios. Phase 2 closes another 3.

## Open Questions / Verification Required Before Implementation

These should resolve in Phase 1 planning, before changes land:

1. **npm trusted-publishing release path** — npm docs currently support GitHub Actions/GitLab/CircleCI cloud-hosted runners, not Gitea Actions or self-hosted runners. Decide whether npmjs.org publishing moves to the GitHub mirror workflow or whether AIWG keeps a constrained npm token until support changes.
2. **Node/npm version for trusted publishing** — npm trusted publishing currently requires npm CLI 11.5.1+ and Node 22.14.0+. Decide whether the release container moves to Node 22 for publish jobs while preserving Node `>=20` runtime support.
3. **Gitea Actions environments** — current Gitea docs say `jobs.<job_id>.environment` is ignored. Define compensating controls instead of assuming environment-scoped release secrets.
4. **Gitea fork-PR secret default** — does Gitea Actions expose secrets to fork-PR workflow runs by default? (Verify.)
5. **Gitea workflow-keyword compatibility** — current docs also call out ignored `concurrency`, `timeout-minutes`, and some permission semantics depending on version. Audit the workflow syntax against the exact deployed Gitea version.
6. **Native-binding optional deps build hooks** — what happens to AIWG users on a `--ignore-scripts` org policy if they have `better-sqlite3` in `optionalDependencies`? (Test before A16 architectural change.)
7. **pnpm migration blast radius** — what breaks when root, `apps/web`, `tools/eval`, and addon package installs move from npm lockfiles to pnpm workspace? Verify build, publish, tests, optional native deps, and package contents before replacing npm commands across workflows.

Each open question should become a `type: spike` issue under the epic if it requires investigation effort.

---

**Status**: Draft plan, awaiting review. Implementation begins after epic + sub-issues are filed and an operator approves the Phase 1 sequence.

**Next step**: File Gitea epic + Phase 1 + Phase 2 + Track B Wave 1 sub-issues (see "Gitea Epic + Sub-Issues — Filing Plan" above).
