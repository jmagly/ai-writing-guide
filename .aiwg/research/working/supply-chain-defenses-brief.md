# npm Supply-Chain Defenses Brief (2025-2026)

**Document ID**: RESEARCH-SUPPLY-CHAIN-DEFENSES-001
**Version**: 0.1 (DRAFT)
**Created**: 2026-05-12
**Purpose**: Defensive control catalog for npm-distributed projects, scoped to the threat class demonstrated by the September 2025 Shai-Hulud worm and the April/May 2026 Mini Shai-Hulud campaign. Source of recommendations for AIWG hardening and for new AIWG user-facing capabilities.
**Trigger**: Aikido Security report — Mini Shai-Hulud, May 2026 (Silva, 2026-05-12).
**Companion documents**:
- @.aiwg/security/working/threat-model-supply-chain.md
- @.aiwg/security/working/publish-pipeline-audit.md

---

## Scope and Method

This brief surveys defensive controls available to npm-distributed projects in mid-2026. Sources are limited to publicly-published guidance (npm docs, GitHub docs, Sigstore docs, SLSA spec, OSSF, CISA advisories, Aikido's incident report). Every claim is GRADE-marked per `.claude/rules/citation-policy.md`. Vendor reports are MODERATE; community/blog/forum content is LOW; speculation is VERY LOW.

The brief is **defensive**. It does not catalog attacker tooling, exploit kits, or operational TTPs beyond what's needed to recognize the control surface the defenses apply to.

## 1. Threat-Landscape Summary (Defender's View)

Three published incidents from late 2025 through May 2026 define the threat class:

| Incident | Date | Mechanism (defender-relevant) | Defenses that would have blocked |
|----------|------|-------------------------------|----------------------------------|
| Shai-Hulud (original) | Sept 2025 | Compromised maintainer accounts → worm propagation via install scripts → credential theft → cascade publish. Affected hundreds of npm packages. (GRADE: LOW — public reports, exact figure varies by source.) | npm 2FA + automation tokens with IP allowlists; `--ignore-scripts` at org policy level; provenance + signature verification on install. |
| nx package compromise | Sept 2025 | Maintainer account compromise; malicious version published; install script attempted env exfiltration. (GRADE: LOW — public incident, requires WebSearch verification for exact details.) | Two-person publish rule; account hardware-key 2FA; environment-scoped secrets. |
| Mini Shai-Hulud SAP wave | April 2026 | SAP-namespace packages compromised. `preinstall` runs `setup.mjs` → Bun-executed `execution.js` payload steals secrets. (GRADE: MODERATE — Aikido vendor report.) | Disable install scripts in CI; egress filtering on CI runners; secret scoping. |
| Mini Shai-Hulud TanStack wave | May 2026 | TanStack et al. compromised (169 names / 373 versions). Optional dependency `@tanstack/setup` points to attacker-controlled GitHub ref. npm runs `prepare` script on git deps during install → executes `tanstack_runner.js` → `&& exit 1` makes the optional install appear to fail. Attacker also abused **GitHub Actions OIDC trusted publishing inside the compromised workflow** to mint short-lived npm publish tokens, then published more malicious packages with valid provenance attestations. (GRADE: MODERATE — Aikido vendor report.) | (1) Disallow git-URL deps in lockfiles; (2) require all `optionalDependencies` to be registry-published with provenance; (3) treat provenance as evidence-of-build-origin only, not safety; (4) require human approval on environment-scoped publish secrets even when OIDC mints them; (5) tarball content audit against expected manifest. |

**Defender's takeaway**: provenance proves *where* a package was built. It does not prove the build was *safe*. The attacker who controls the build pipeline produces valid provenance for malicious artifacts. The defenses must layer: prevent compromise of the pipeline, prevent unintentional execution of attacker code at install, detect tampering between publish and consumption.

## 2. Defensive Control Catalog

Each control is rated for **maturity** (mainstream / emerging / experimental), **cost to adopt** (S / M / L), and **what it defends against**.

### 2.1 Publish-side controls

#### C1. npm provenance (`npm publish --provenance`)

- **What**: Cryptographic attestation that the tarball was built by a specific workflow in a specific source repo. Requires OIDC at publish time.
- **Defends**: Direct token theft → publish (S1 class) — the attacker without OIDC access cannot mint provenance.
- **Maturity**: Mainstream (npm 9.5+, supported by GitHub Actions OIDC, increasing provider support).
- **Cost**: S-M (requires OIDC adoption first).
- **GRADE**: MODERATE — npm docs are authoritative but the feature is still evolving (verify current spec at npm docs before commit).
- **Caveats**: Provenance is *necessary but insufficient*. Mini Shai-Hulud demonstrated provenance can be produced by an attacker-controlled workflow.

#### C2. OIDC trusted publishing (npmjs.org)

- **What**: Replaces long-lived static npm tokens with short-lived OIDC-minted tokens issued per-workflow-run.
- **Defends**: Long-lived token exfiltration (S1). Reduces blast radius if a runner is briefly compromised.
- **Maturity**: Mainstream on npmjs.org with GitHub Actions; **partial** on other providers including Gitea Actions (verify current Gitea OIDC support at docs.gitea.com).
- **Cost**: M.
- **GRADE**: MODERATE — npm + GitHub docs authoritative; Gitea parity status needs verification.

#### C3. Sigstore / cosign artifact signing

- **What**: Sign release tarballs and per-release manifests via Sigstore (keyless via OIDC) or cosign (key-based). Downstream consumers verify before install.
- **Defends**: Registry compromise (attacker substitutes tarball); mirror desync; man-in-the-middle on registry fetch.
- **Maturity**: Mainstream for container images; emerging for npm tarballs.
- **Cost**: M.
- **GRADE**: MODERATE — sigstore.dev docs authoritative.

#### C4. Signed git tags (GPG or SSH)

- **What**: `git tag -s` or SSH-signed tags. CI verifies the signature before publishing.
- **Defends**: Compromised maintainer workstation tagging a malicious release; compromised mirror push (the mirror would push an unsigned tag).
- **Maturity**: Mainstream.
- **Cost**: S.
- **GRADE**: HIGH — git documentation, standard practice.

#### C5. Two-person rule on release / environment protection

- **What**: GitHub environments with deployment protection require an explicit second-person approval before secrets are released to the job. Gitea Actions environment feature parity needs verification.
- **Defends**: Single-account compromise → silent publish; insider risk.
- **Maturity**: Mainstream on GitHub Actions; verify on Gitea.
- **Cost**: M.
- **GRADE**: MODERATE — GitHub docs authoritative; Gitea parity status needs verification.

#### C6. npm 2FA + automation tokens with IP allowlists

- **What**: Mandatory 2FA on the npm account; automation tokens with `--scope=read:packages,publish:packages` and source-IP allowlist matching the CI runner egress range.
- **Defends**: Account takeover; token reuse from arbitrary network locations.
- **Maturity**: Mainstream (npm 2FA mandatory for high-impact packages as of 2023).
- **Cost**: S.
- **GRADE**: HIGH — npm docs authoritative.

### 2.2 Build-side controls

#### C7. Container image digest pinning

- **What**: `container: node:20@sha256:<hex>` instead of `container: node:20`.
- **Defends**: Upstream image hijack; tag-repointing attacks; build non-reproducibility.
- **Maturity**: Mainstream (best practice for years; under-adopted).
- **Cost**: S (per workflow) + process overhead for digest updates.
- **GRADE**: HIGH — OCI spec + general consensus.

#### C8. Action SHA pinning

- **What**: `uses: actions/checkout@<40-char-sha> # v4.1.7` instead of `@v4`.
- **Defends**: Compromised action repo silently replaces action body via mutable tag.
- **Maturity**: Mainstream best practice; OSSF Scorecard checks for it.
- **Cost**: M (broad workflow changes) + Dependabot/equivalent for updates.
- **GRADE**: HIGH — OSSF Scorecard documents this; multiple GitHub blog posts.

#### C9. Workflow-injection hardening (PR-triggered workflows)

- **What**: PR-triggered workflows that need secrets must use `pull_request_target` carefully or use a two-stage pattern: trusted workflow runs after PR is merged to a staging branch reviewed by a maintainer.
- **Defends**: Malicious PR alters workflow → executes with secrets in scope.
- **Maturity**: Mainstream guidance; commonly misimplemented.
- **Cost**: M.
- **GRADE**: HIGH — GitHub security lab has published extensively on this.

#### C10. Secret scope minimization (environment-level, not repo-level)

- **What**: Publish secrets live in a deploy-specific environment, accessible only to publish workflows, not to PR-triggered or CI workflows.
- **Defends**: Workflow injection (C9); accidental secret reference.
- **Maturity**: Mainstream.
- **Cost**: S.
- **GRADE**: HIGH — GitHub docs.

#### C11. Egress filtering on CI runners

- **What**: Restrict the CI runner's outbound network to a known-good allowlist (registry endpoints, build mirror, telemetry sinks). Block ad-hoc curl to attacker domains.
- **Defends**: Lifecycle-script credential exfiltration during build; ad-hoc payload download.
- **Maturity**: Emerging — feasible on self-hosted runners, harder on managed.
- **Cost**: L.
- **GRADE**: MODERATE — feasibility depends on runner topology.

#### C12. SBOM generation (CycloneDX / SPDX)

- **What**: Emit a Software Bill of Materials per release alongside the artifact.
- **Defends**: Indirectly — gives downstream consumers the data to detect when a transitive dep is compromised.
- **Maturity**: Mainstream (`syft`, `@cyclonedx/cyclonedx-npm`).
- **Cost**: S.
- **GRADE**: HIGH — CycloneDX is an ECMA standard; SPDX is ISO/IEC 5962.

### 2.3 Install-time / consumption-side controls

#### C13. `--ignore-scripts` at install

- **What**: `npm install --ignore-scripts`. Skips all lifecycle scripts. Can be set as `.npmrc` default.
- **Defends**: The entire install-time RCE class (Shai-Hulud / Mini Shai-Hulud propagation primitive).
- **Maturity**: Mainstream npm flag; under-adopted.
- **Cost**: S to enable, **M-L to deal with the consequences** — many legitimate packages need build hooks (native bindings, code generation). Org-level adoption typically requires either accepting some packages won't install or maintaining an allowlist.
- **GRADE**: HIGH — npm docs authoritative.

#### C14. `npm audit signatures`

- **What**: Verifies the registry-side signature on every package in the lockfile.
- **Defends**: Registry-side tampering (between publish and your install).
- **Maturity**: Mainstream (npm 9+).
- **Cost**: S.
- **GRADE**: HIGH — npm docs.

#### C15. Lockfile pinning + integrity verification

- **What**: Commit `package-lock.json`. Use `npm ci` (not `npm install`) in CI to enforce the lockfile. The lockfile's `integrity` field (sha512-base64) is checked on each install.
- **Defends**: Mid-install tarball substitution; transitive dep version drift.
- **Maturity**: Mainstream.
- **Cost**: S.
- **GRADE**: HIGH.

#### C16. Dependency-age / cooldown policies (release-age gate)

- **What**: Don't install package versions until they have existed long enough for the community to report, remove, or patch malicious releases. Recommended baseline: **5 days minimum age**. The four major JavaScript package managers each implemented native support for this in 2025-2026 — no external tool required.
- **Defends**: Newly-published malicious versions in the Shai-Hulud / Mini Shai-Hulud propagation window (typically detected and removed within 24-72 hours). Typo squat speed-of-attack. Worm-cascade releases where attackers publish dozens of versions per hour.
- **Maturity**: Mainstream as of late 2025 / early 2026 — native config in all four major package managers. Also available via external tools (Socket, Snyk, Aikido Safe Chain).
- **Cost**: S — config-file only, no infrastructure.
- **GRADE**: HIGH — official package-manager documentation cited below.
- **Caveats**:
  - Protects new dependency resolution only. Already-resolved lockfile entries are not affected until next update.
  - Pinned old package-manager versions are the biggest footgun: pnpm <10.16, Yarn <4.12, and older npm releases do not honor the new keys. Corepack pinning in `packageManager` field of `package.json` can override the user's global version.
  - The gate is per-version, not per-package. A long-established package's *latest* version is still subject to the age gate.

**Concrete configuration (5-day baseline)**:

| Manager | Config file | Key | 5-day value |
|---------|-------------|-----|-------------|
| npm 11.14.1+ | `~/.npmrc` | `min-release-age` | `5 days` |
| pnpm 10.16.0+ | `~/.npmrc` | `minimum-release-age` | `7200` (minutes) |
| Yarn 4.12+ | `~/.yarnrc.yml` | `npmMinimalAgeGate` | `5d` |
| Bun 1.3.12+ | `~/.bunfig.toml` | `install.minimumReleaseAge` | `432000` (seconds) |

`~/.npmrc` covers both npm and Corepack-pinned pnpm projects when both keys are set (npm will warn about the pnpm-specific `minimum-release-age` key but still honor its own `min-release-age`):

```ini
# npm uses days; pnpm uses minutes.
min-release-age=5
minimum-release-age=7200
```

Yarn:

```sh
yarn config set npmMinimalAgeGate 5d -H
```

Bun:

```toml
[install]
minimumReleaseAge = 432000
```

**Verification commands**:

```sh
npm config get min-release-age            # → 5
pnpm config get minimum-release-age       # → 7200
yarn config get npmMinimalAgeGate         # → 7200 or 5d depending on display format
cat ~/.bunfig.toml                        # → minimumReleaseAge = 432000
```

**Source docs** (verify URLs at adoption time per citation-policy):
- npm config: https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age
- pnpm setting: https://pnpm.io/settings#minimumreleaseage
- Yarn security age gate: https://yarnpkg.com/features/security#age-gate
- Bun config: https://bun.com/docs/runtime/bunfig#installminimumreleaseage

**AIWG applicability**:
- **AIWG-self CI**: adopt for the `npm ci` step in publish workflows. Note that `npm ci` reads `package-lock.json` and the age gate enforces on resolution — for `npm ci` to benefit, the gate must have been in effect when the lockfile was *last regenerated* (i.e., `npm install` regenerated, then committed). Document this in the developer workflow.
- **User-facing**: ship a skill (`/security-adopt-age-gate` or similar) that scaffolds the `~/.npmrc`, `~/.yarnrc.yml`, `~/.bunfig.toml` entries plus a `.npmrc` at project root for CI runners. Pair with a rule that prefers `npm ci` over `npm install` for reproducibility.

#### C17. Install-time intercept tools (Socket / Snyk / Aikido Safe Chain)

- **What**: Tools that sit in front of `npm install` and check the dependency graph against threat-intelligence feeds before installation proceeds. Aikido Safe Chain is open source and intercepts `npm`, `npx`, `yarn`, `pnpm`, `pnpx`.
- **Defends**: Known-bad packages, suspicious lifecycle scripts, network-side indicators.
- **Maturity**: Emerging — multiple vendor implementations.
- **Cost**: S-M depending on integration.
- **GRADE**: LOW (vendor blog content is not authoritative on efficacy — independent comparative studies are sparse).

#### C18. Tarball content audit / expected-manifest assertion

- **What**: CI step that runs `npm pack --dry-run` and compares the file list against a checked-in expected manifest. Fails if new files appear without explicit allowlist update.
- **Defends**: Mini Shai-Hulud's `router_init.js` injection pattern — an extra file in the tarball root would have been flagged.
- **Maturity**: Emerging — easy to implement, under-adopted.
- **Cost**: S.
- **GRADE**: MODERATE.

### 2.4 Account / human-layer controls

#### C19. Hardware-backed 2FA for maintainer accounts

- **What**: WebAuthn (YubiKey, Titan, etc.) on npmjs.org, GitHub, Gitea, and any registry account.
- **Defends**: Phishing-based account takeover.
- **Maturity**: Mainstream.
- **Cost**: S.
- **GRADE**: HIGH.

#### C20. Maintainer access scope minimization

- **What**: One maintainer per package wherever feasible. Use scoped permissions on registries (publish-only, no admin) for automation accounts.
- **Defends**: Lateral movement after one account compromise.
- **Maturity**: Mainstream guidance, under-adopted in OSS.
- **Cost**: S.
- **GRADE**: HIGH.

#### C21. Vulnerability disclosure policy (`SECURITY.md`)

- **What**: Documented private reporting channel + PGP/age key + response SLA.
- **Defends**: Increases time-to-disclosure efficiency when a researcher finds a flaw; reduces likelihood of premature public disclosure.
- **Maturity**: Mainstream.
- **Cost**: S.
- **GRADE**: HIGH.

## 3. Lifecycle-Script Policy

The Mini Shai-Hulud propagation primitive is the `prepare` script of an optional git-URL dependency. Defenders have three layers of response:

1. **For your own package**: remove lifecycle scripts (`preinstall`, `install`, `postinstall`, `prepare`, `prepublishOnly`) if they are non-essential. Move first-run setup to first-CLI-invocation rather than install-time. If a hook is essential (native binding compile), document why and audit it.
2. **For your build**: set `ignore-scripts=true` in `.npmrc` for CI builds; explicitly opt back in for packages you trust.
3. **For your org**: maintain an allowlist of packages whose install scripts you've audited. The trade-off: high friction at first, decays toward routine over time as the allowlist stabilizes.

A note on optional native dependencies: `better-sqlite3`, `node-pty`, `node-canvas`, etc. have legitimate build hooks. Banning install scripts wholesale forces users to compile from source another way. Most orgs handle this by maintaining a per-package allowlist with audit dates. (GRADE: MODERATE — practitioner discussion + vendor blog content; no single authoritative spec.)

## 4. Gitea Actions Specifics

(GRADE: VERY LOW for any specific feature claim below until verified against docs.gitea.com at implementation time. This section is a starting point for verification, not a feature inventory.)

- **OIDC trusted publishing**: Gitea Actions added OIDC token issuance in a recent version; npm trusted publishing requires specific OIDC provider configuration. Verify support and current limitations before adoption.
- **Environments and deployment protection rules**: Gitea Actions added environment support after GitHub Actions; feature parity needs verification.
- **Branch protection + required reviewers**: Gitea has branch protection; required-reviewers configurability varies by Gitea version.
- **Secret scoping**: Gitea Actions supports repo-level secrets reliably. Organization-level and environment-level secret behavior should be verified per-version.
- **Fork PR behavior**: Verify whether Gitea Actions exposes secrets to fork-PR workflow runs. Default behavior may differ from GitHub.
- **Runner isolation**: Self-hosted runners' security posture is entirely operator's responsibility. Ephemeral runners and dedicated VMs per job substantially reduce blast radius compared to long-lived shared runners.

**For AIWG specifically**: the Gitea-side controls need verification against the operator's actual deployment version. The AIWG runner (`gitea-runner-host`, per workflow comments) is shared across all workflows — a per-publish-job dedicated runner would substantially reduce risk.

## 5. AIWG Applicability Matrix

Classification: **A** = adopt in AIWG's own pipeline; **B** = ship as user-facing AIWG capability; **C** = both; **D** = neither / out of scope.

| Control | Classification | Notes |
|---------|---------------|-------|
| C1. npm provenance | A | AIWG should emit provenance on every release |
| C2. OIDC trusted publishing | A | AIWG-self; user-facing tooling for this is generic and not AIWG's lane |
| C3. Sigstore / cosign signing | C | Adopt for AIWG; ship a signing skill + rule for users |
| C4. Signed git tags | C | Adopt; document as best practice in AIWG's SDLC framework |
| C5. Two-person rule / environment protection | A | Adopt; document in `flow-release` skill |
| C6. npm 2FA + automation tokens | A | Operator practice, not framework-shippable |
| C7. Container image digest pinning | C | Adopt across all 11 workflows; ship as `dev-idempotent-builds.md` enhancement + lint rule |
| C8. Action SHA pinning | C | Adopt; ship a lint check for user workflows |
| C9. Workflow-injection hardening | C | Adopt; ship a skill that audits user workflows for PR-trigger + secrets combos |
| C10. Secret scope minimization | C | Adopt; document in `dev-secret-hygiene.md` |
| C11. Egress filtering on runners | A | Adopt selectively (operator concern, low feasibility on managed runners) |
| C12. SBOM generation | C | Adopt; ship a skill that scaffolds SBOM generation in user workflows |
| C13. `--ignore-scripts` | B | AIWG-self has only a benign postinstall; ship guidance and a skill |
| C14. `npm audit signatures` | C | Adopt in CI; ship as user-facing skill |
| C15. Lockfile pinning | C | Already adopted in AIWG (`npm ci`); document for users |
| C16. Dependency-age / cooldown | B | Not yet adopted by AIWG; ship guidance |
| C17. Install-time intercept tools | B | Document Aikido Safe Chain, Socket, Snyk as user options |
| C18. Tarball content audit | C | Adopt for AIWG; ship as skill |
| C19. Hardware-backed 2FA | A | Operator practice |
| C20. Maintainer access minimization | A | Operator practice |
| C21. `SECURITY.md` | C | Adopt for AIWG; ship as template for user projects |

**Summary**: 8 controls are A-only (AIWG-self adoption), 5 are B-only (ship as user capability), 11 are C (both).

## 6. Phased Roadmap for AIWG-Self

### Phase 1 — Next release window (target: 2026.6 series)

1. **Remove `postinstall` lifecycle script** (effort: S). Migrate PATH guidance to `aiwg doctor` / `aiwg help` first-run.
2. **Remove `continue-on-error: true` from stable publish test step** (effort: S). Fix or quarantine any flaky tests surfaced.
3. **Digest-pin `container: node:20` across all 11 workflows** (effort: M). Create `ci/digests.txt` for tracked digests.
4. **SHA-pin all `uses: actions/...@v*` references** (effort: M). Add Dependabot or equivalent for intentional updates.
5. **Adopt OIDC trusted publishing on npmjs.org with `npm publish --provenance`** (effort: M). Verify Gitea Actions OIDC support before committing.
6. **Add `SECURITY.md` with private reporting channel** (effort: S).
7. **Fix `GT_ACCESS_TOKEN`-in-URL pattern in `docsite-*.yml`** (effort: S).

### Phase 2 — Q3 2026

1. **Sigstore-sign release tarballs + per-release manifest** (effort: M-L).
2. **Sign git tags (GPG or SSH-signing)** (effort: S — depends on maintainer setup).
3. **Move publish secrets to environment-scoped with deployment protection rule** (effort: M).
4. **Tarball content audit step (`npm pack --dry-run` vs expected manifest)** (effort: S).
5. **`npm audit signatures` gate in publish CI** (effort: S).
6. **SBOM generation (`@cyclonedx/cyclonedx-npm`) attached to releases** (effort: S-M).
7. **Audit `pull_request`-triggered workflows for secret exposure; harden or split** (effort: M).

### Phase 3 — Longer term

1. **Audit and minimize the 7 optional native-binding dependencies** (effort: M-L). Move some to peer-dep status.
2. **Egress filter Gitea Actions runners** (effort: L — depends on runner topology).
3. **Dedicated publish-only runner separate from CI runner** (effort: M-L).
4. **Disclosure runbook + tabletop incident exercise** (effort: M).

## 7. Surprising / Contradictory Findings

- **Provenance is not safety.** The most counterintuitive lesson from Mini Shai-Hulud is that attacker-controlled OIDC workflows produce *valid* provenance for *malicious* packages. Provenance answers "where was this built", not "is this safe". Defenders should not treat provenance as a sufficient signal.
- **Optional deps with `prepare` scripts are a sleeper attack surface.** Most lifecycle-script discussion focuses on `postinstall`. Mini Shai-Hulud used `prepare` on an *optional* dep with a `&& exit 1` to make the install look like a normal "optional dep failed" message. The script ran fully before the deliberate failure.
- **Aikido Safe Chain and similar intercepts are LOW-grade-evidenced.** Vendor blogs report high block rates; independent comparative studies are sparse. Useful as defense-in-depth, not as primary control.
- **`--ignore-scripts` is high-cost-to-adopt for orgs with diverse Node toolchains.** Native bindings (better-sqlite3, node-pty, node-canvas, sharp) genuinely need install hooks. Per-package allowlist maintenance is the typical compromise.

## 8. References

- Silva, R., "Mini Shai-Hulud Is Back: npm Worm Hits over 160 Packages, including Mistral and Tanstack." Aikido Security, 2026-05-12. (GRADE: MODERATE — primary trigger source, vendor incident report.)
- npm docs, "Generating provenance statements." (GRADE: MODERATE — verify current URL at publish time.)
- Sigstore project, "sigstore.dev." (GRADE: HIGH — project documentation.)
- SLSA framework, "slsa.dev." (GRADE: HIGH.)
- OpenSSF Scorecard, "github.com/ossf/scorecard." (GRADE: HIGH — open-source security health checks.)
- CycloneDX spec, "cyclonedx.org." (GRADE: HIGH — ECMA standard.)
- npm CLI documentation, `npm audit signatures`, `npm publish --provenance`, `npm ci`. (GRADE: HIGH.)
- Existing AIWG rules: `dev-pipeline-safety.md`, `dev-secret-hygiene.md`, `dev-idempotent-builds.md`, `dev-ci-self-contained.md`, `token-security.md`, `anti-laziness.md`. (GRADE: HIGH — project authority.)
- Companion threat model: `.aiwg/security/working/threat-model-supply-chain.md`. (GRADE: HIGH — paired analysis.)

**Verification gaps to close before treating recommendations as production-ready**:
- Current state of Gitea Actions OIDC trusted publishing support (docs.gitea.com).
- Current npm trusted-publishing provider matrix (npmjs.org docs).
- Gitea environments + deployment protection feature parity vs GitHub Actions.
- Gitea fork-PR secret exposure default behavior.

These need explicit WebFetch verification when each control is adopted, not at brief-authoring time.

---

**Status**: Draft. Pairs with `.aiwg/security/working/threat-model-supply-chain.md` and `.aiwg/security/working/publish-pipeline-audit.md`. Synthesis target: `.aiwg/planning/supply-chain-hardening-plan.md`.
