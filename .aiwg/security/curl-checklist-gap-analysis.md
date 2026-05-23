---
title: AIWG Coverage vs Daniel Stenberg's "Securing curl" 28-Practice Checklist
date: 2026-05-21
status: initial-audit
issue: https://git.integrolabs.net/roctinam/aiwg/issues/1417
audit_method: aiwg-discover-and-show + manual rule/skill review
hedging: GRADE-style (Full / Partial / Adjacent / Missing / N/A)
---

# AIWG Coverage vs "Securing curl" 28-Practice Checklist

## Why this audit exists

curl is widely regarded as a gold-standard for OSS security hygiene at scale: billions of deployments, a small core team, extensive third-party audits, a near-spotless CVE-handling record. Daniel Stenberg's "Securing curl" slide enumerates 28 practices that produce that outcome.

AIWG ships frameworks for SDLC, security-engineering, forensics, ops, and research, plus the `aiwg-utils` addon and per-language extensions. The question this audit answers: **for each of curl's 28 practices, does AIWG already make the practice reachable through a deployed agent, skill, or rule? Where are the genuine gaps?**

This is the evidence base for prioritizing follow-up work.

## Methodology

1. Each of the 28 practices was framed as a discovery query (e.g., "code style enforcement linting" for #1).
2. `aiwg discover` ran against the installed corpus to surface candidate artifacts.
3. Highest-scoring candidates were verified via `aiwg show` or direct file reads.
4. Each row was assigned one of five gap levels:
   - **Full** — A first-class AIWG capability delivers this practice end-to-end.
   - **Partial** — Supporting pieces exist but the practice is not fully realized.
   - **Adjacent** — AIWG covers a related concern, not the practice itself.
   - **Missing** — No AIWG capability addresses this practice.
   - **N/A** — The practice is curl-specific in a way that does not translate to AIWG's domain.
5. Citations point to concrete artifact paths verified to exist at audit time. Per `citation-policy` (CRITICAL), no inventions — every cited path was read.

Hedging follows AIWG's citation-policy GRADE convention: "demonstrates" only when a specific artifact enforces the practice; "suggests" or "partial" otherwise.

## Summary

| Coverage | Count | Practices |
|---|---|---|
| Full | 21 | 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 19, 21, 24, 25, 26, 27 |
| Partial | 7 | 1, 15, 17, 20, 22, 23, 28 |
| Missing | 0 | — |
| Adjacent | 0 | — |
| N/A | 0 | — |
| **Total** | **28** | |

Headline read: **AIWG has demonstrable, citable coverage for roughly 96% of curl's checklist** (Full + Partial), with the strongest concentration in CI/supply-chain hardening (security-engineering framework) and SDLC governance (HITL gates, delivery policy, complexity gates, doc-sync, test strategy). The former Missing entries now have concrete framework or aiwg-utils artifacts:

1. **Build-time correctness** — banned functions, strict toolchain settings, sanitizers, fuzzing, no-binary-blobs.
2. **Supply-chain transparency** — git mirror redundancy, signed-commits-required, 2FA for committers.
3. **Disclosure & advisory tooling** — private security reporting (SECURITY.md), CVE advisory format,API/ABI stability contracts, Unicode safety.

Follow-up targets now focus on deeper implementations and reference-project validation rather than missing first-class artifacts.

## The 28-Row Audit

### Row 1 — Code Quality & Review

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 1 | Code style | Partial | `agentic/code/frameworks/sdlc-complete/extensions/javascript/skills/eslint-checker/SKILL.md`; `agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md` | ESLint covers JS/TS; `agent-friendly-code` defines structural thresholds language-agnostically. No multi-language style orchestrator for C/C++/Python/Rust/Go. |
| 2 | Banned functions | **Full** | `agentic/code/frameworks/security-engineering/rules/banned-apis.md` + `skills/banned-api-audit/SKILL.md`; starter banlists for C, C++, Python, Node, Go, Rust; `scripts/audit.sh`; SARIF output | Rule, executable ripgrep audit, schema, starter banlists, JSON/text/SARIF reports, and CI exit codes are present. Crypto rules remain CRITICAL specializations. |
| 3 | Complexity checks | **Full** | `agentic/code/frameworks/sdlc-complete/skills/complexity-gate/SKILL.md`; `agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md` | `complexity-gate` is a CI-friendly pass/fail gate; `agent-friendly-code` sets cyclomatic ≤10 warning / ≤15 error, nesting depth, function length thresholds. |
| 4 | Human reviews | **Full** | `agentic/code/frameworks/sdlc-complete/rules/hitl-gates.md`; `agentic/code/addons/aiwg-utils/rules/human-authorization.md`; `agentic/code/frameworks/sdlc-complete/rules/human-gate-display.md` | HITL gates mandatory at SDLC phase transitions. `human-authorization` requires explicit human approval for high-stakes/irreversible actions. Default `delivery.mode: pr-required` enforces review at the PR boundary. |
| 5 | Review bots | **Full** | `agentic/code/frameworks/sdlc-complete/extensions/github/skills/pr-reviewer/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md` | Dedicated PR reviewer skill (GitHub) and `code-reviewer` agent provide automated review for quality, security, and best practices. Gitea/GitLab parallels would be additive. |
| 6 | No binary blobs | **Full** | `agentic/code/frameworks/security-engineering/rules/no-binary-blobs.md`; `skills/binary-blob-audit/SKILL.md` | Rule and companion audit skill define detection, exception classes, provenance, size caps, and CI gating path. |
| 7 | No git force push | **Full** | `agentic/code/addons/aiwg-utils/rules/delivery-policy.md` | `force_push_policy: never \| main-only-blocked \| allowed` declared per-project. Current AIWG project: `never`. Agents are required to honor the declared policy. |

### Row 2 — Code Safety & Testing

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 8 | No confusable Unicode | **Full** | `agentic/code/frameworks/security-engineering/rules/no-confusable-unicode.md`; `skills/confusable-unicode-audit/SKILL.md` | Detects bidi controls, zero-width chars, mixed-script identifiers, homoglyph dependency names, and allowlisted exceptions. |
| 9 | Document everything | **Full** | `agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md` | `doc-sync` detects stale/missing docs and reconciles bidirectionally. SDLC framework requires documentation artifacts at each phase gate. |
| 10 | Many tests | **Full** | `agentic/code/frameworks/sdlc-complete/skills/test-coverage/SKILL.md`; `agentic/code/frameworks/sdlc-complete/skills/flow-test-strategy-execution/SKILL.md` | Coverage analysis with gap identification, plus full test-strategy execution flow. |
| 11 | Torture tests | **Full** | `agentic/code/frameworks/sdlc-complete/skills/torture-test/SKILL.md` | Skill covers endurance, stress, adversarial input, nightly CI recipes, and pass/fail criteria for degradation behavior. |
| 12 | CI like crazy | **Full** | `agentic/code/extensions/dev/rules/dev-pipeline-safety.md`; `agentic/code/extensions/dev/rules/dev-ci-self-contained.md`; `agentic/code/frameworks/sdlc-complete/skills/regression-cicd-hooks/SKILL.md` | `dev-pipeline-safety` (CRITICAL) forbids suppressing CI signals; `dev-ci-self-contained` requires reproducible builders; regression hooks integrate into CI. |
| 13 | All picky compiler options and `-Werror` | **Full** | `agentic/code/frameworks/security-engineering/rules/strict-toolchain.md`; `skills/strict-toolchain-audit/SKILL.md` | Defines per-language strictness floors and audit path for compiler/linter/typecheck CI enforcement. |
| 14 | Valgrind and sanitizers | **Full** | `agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/SKILL.md`; `skills/sanitizer-in-ci/scripts/emit.sh`; shared `lib/toolchain-detect.sh` | Skill documents sanitizer strategy and now includes a reference emitter for per-language CI recipe files and suppressions. |

### Row 3 — Analysis & Build Integrity

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 15 | AI + static code analyzers | Partial | `agentic/code/frameworks/sdlc-complete/extensions/javascript/skills/eslint-checker/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md` | AI-driven review via `code-reviewer` is strong. Tool-driven SAST is JS/TS-only; no Semgrep/CodeQL/SonarQube orchestration. |
| 16 | Fuzzing, in CI and non-stop | **Full** | `agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/SKILL.md`; `skills/fuzzing-in-ci/scripts/emit.sh` | Skill documents harness patterns and now emits starter harnesses, PR-gating recipes, OSS-Fuzz notes, and corpus helper placeholder. |
| 17 | Read-only CI jobs | Partial | `agentic/code/extensions/dev/rules/dev-secret-hygiene.md` | `dev-secret-hygiene` restricts secret exposure in CI; underlying principle is present but no explicit `permissions: read-all` workflow-level enforcement rule. |
| 18 | zizmor the CI jobs | **Full** | `agentic/code/frameworks/security-engineering/skills/ci-workflow-audit/SKILL.md`; `agentic/code/frameworks/security-engineering/rules/ci-action-pinning.md` | `ci-workflow-audit` audits unpinned actions, secret exposure in PR jobs, curl-pipe-shell installers, bare `:latest` tags — directly equivalent to zizmor's scope. `ci-action-pinning` (HIGH) mandates SHA-pinned actions. Strong. |
| 19 | Reproducible releases | **Full** | `agentic/code/frameworks/security-engineering/skills/supply-chain-trust/SKILL.md`; `agentic/code/extensions/dev/rules/dev-idempotent-builds.md`; `agentic/code/frameworks/sdlc-complete/rules/reproducibility.md` | `supply-chain-trust` addresses reproducible builds; `dev-idempotent-builds` mandates idempotent build steps; SDLC `reproducibility` rule (MEDIUM) enforces reproducibility for critical workflows. |
| 20 | Signed releases, commits, tags | Partial | `agentic/code/frameworks/security-engineering/skills/supply-chain-hardening-quickstart/SKILL.md`; `agentic/code/frameworks/security-engineering/skills/npm-supply-chain-audit/SKILL.md` | Skills audit for signed-release practice in the npm ecosystem; AIWG's own release process uses signed tags (per `CLAUDE.md` Release Checklist). No universal "signed-commits-required" rule for arbitrary projects. |
| 21 | Git backup on Codeberg | **Full** | `agentic/code/addons/aiwg-utils/rules/delivery-policy.md`; `agentic/code/addons/aiwg-utils/skills/git-mirror-audit/SKILL.md`; `.aiwg/aiwg.config` `remotes.secondary[]` | Delivery policy now documents backup-mirror semantics and `push_on_release`; audit skill detects missing mirrors and drift. AIWG dogfoods this with a configured GitHub secondary remote. |

### Row 4 — Vulnerability & Access Management

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 22 | Vulnerabilities fixed in next release | Partial | `agentic/code/frameworks/sdlc-complete/skills/flow-security-review-cycle/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/security-auditor.soul.md` | Security review flow orchestrates vulnerability management. No rule mandates a time-bound SLA ("fix in next release"). Security auditor persona has the disposition; enforcement is policy-driven. |
| 23 | Document vulnerabilities thoroughly | Partial | `agentic/code/frameworks/sdlc-complete/skills/flow-security-review-cycle/SKILL.md`; `agentic/code/frameworks/sdlc-complete/skills/security-assessment/SKILL.md` | Security review/assessment flows produce findings reports. No template/skill specifically for CVE-style public advisories with affected versions, mitigations, credits, CVSS scoring. |
| 24 | Code audits | **Full** | `agentic/code/frameworks/sdlc-complete/agents/security-auditor.soul.md`; `agentic/code/frameworks/sdlc-complete/skills/security-assessment/SKILL.md`; `agentic/code/frameworks/research-complete/skills/best-practices-audit/SKILL.md` | Dedicated security-auditor agent (with persona/soul), security-assessment skill (STRIDE/OWASP/SAST/DAST framing), and research-grounded best-practices audit. Multiple complementary paths. |
| 25 | (Strong) 2FA for all committers | **Full** | `agentic/code/frameworks/security-engineering/rules/committer-2fa-required.md`; `skills/committer-2fa-audit/SKILL.md` | Rule documents source-control 2FA requirement; audit skill covers GitHub and best-effort Gitea visibility with token-security constraints. |
| 26 | API and ABI stability | **Full** | `agentic/code/frameworks/security-engineering/rules/api-abi-stability.md`; `skills/deprecation-policy/SKILL.md` | Rule and skill cover stable/experimental surfaces, SemVer/ABI semantics, ref comparison, and changelog/deprecation notes. |
| 27 | Private security reporting | **Full** | `agentic/code/frameworks/security-engineering/templates/SECURITY.md`; `skills/security-report/SKILL.md`; `skills/security-disclosure-track/SKILL.md`; `tools/install/new-project.mjs`; `tools/cli/doctor.mjs` | Template and intake skill are joined by disclosure lifecycle tracking, new-project SECURITY.md scaffolding, doctor warning, and gitignored custody directory. |

### Foundation

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 28 | Everything done in the open | Partial | `agentic/code/frameworks/sdlc-complete/rules/provenance-tracking.md`; `agentic/code/addons/aiwg-utils/rules/activity-log.md`; `agentic/code/frameworks/sdlc-complete/rules/no-attribution.md` | AIWG enforces transparency at the **artifact** level: provenance tracking (W3C PROV-compliant), activity log, no-attribution (so commits remain the user's record). No rule defines an "open governance" stance for projects *using* AIWG. AIWG itself is open per the public repo and `CLAUDE.md`. |

## Why curl's checklist matters for AIWG users

curl's practices are not just a security framework — they are a **definition of what "ready for delivery at scale" looks like**. Projects that adopt AIWG should be able to reach a similar bar with AIWG's help. The Full and Partial rows above show where that is now true, and the remaining Partial rows identify places where a stronger dedicated rule or multi-language implementation would improve confidence.

The residual pattern is informative:

- **AIWG is strong at SDLC governance, CI hardening, supply-chain audit, and AI-assisted code review.** These reflect AIWG's core thesis: deploying agents and rules into AI-coding environments to shift quality work left.
- **The former runtime-correctness and disclosure/governance gaps now have first-class artifacts.** Sanitizers, fuzzing, banned APIs, disclosure tracking, 2FA policy,API/ABI stability, Unicode safety, binary blob review, and mirror audit are represented as rules, skills, scripts, or scaffolding.
- **The remaining work is depth, not reachability.** Partial rows mostly need stronger multi-language orchestration, host-platform enforcement, or reference-project validation.

This is now a useful regression map for curl-practice parity. New hardening work should extend these artifacts rather than create parallel duplicate frameworks.

## Recommended Follow-Up Issues

Highest-value follow-up hardening work, ordered by expected impact-per-effort:

1. **`security-engineering`: banned-functions / forbidden-APIs rule** — deepen reference validation for #2. Generalize the applied-cryptography pattern (`no-unauthenticated-encryption`, `no-adhoc-kdf`) into a configurable banlist mechanism that projects can opt into per language. Highest-value: directly transferable from curl's actual practice and most security-bearing.
2. **`security-engineering`: SECURITY.md + private-disclosure intake skill** — deepen lifecycle scaffolding for #27. Template plus a `security-report` intake skill (private channel: encrypted email / Gitea private issue / GitHub Security Advisory). Important for any AIWG-using project that ships software publicly.
3. **`aiwg-utils`: no-binary-blobs rule + check** — deepen audit implementation for #6. Pre-commit and CI check that flags committed binaries above a configurable size threshold (or any non-allowlisted MIME class). Cheap to implement, broadly useful.
4. **`security-engineering`: sanitizer-and-fuzzing integration skills** — deepen reference emitters for #14 and #16. Two skills (one for sanitizers in CI, one for fuzzing in CI) that detect language/toolchain and wire in ASan/UBSan/MSan or libFuzzer/AFL/property-based testing. Higher implementation cost but closes two practices.
5. **`aiwg-utils` or `security-engineering`:API/ABI stability rule + change-impact gate** — deepen change-impact gating for #26. Layer on top of `flow-change-control` to enforce semver discipline, deprecation windows, and ABI breakage detection for libraries/SDKs.
6. **`aiwg-utils`: 2FA-for-committers documentation rule** — deepen host-platform audit for #25. AIWG can't enforce platform-level 2FA, but it can document the requirement, audit (via the Gitea/GitHub API where available), and surface non-compliance in `aiwg doctor`.
7. **`aiwg-utils`: git-mirror-redundancy declaration in delivery-policy** — deepen mirror reachability validation for #21. Extend `delivery-policy.remotes.secondary[]` with a `purpose: backup-mirror` value and have `aiwg doctor` verify the mirror is reachable.

Lower priority but worth tracking:

8. Reference-project strict-toolchain CI validation (#13).
9. Reference-project Unicode-safety validation (#8).
10. Reference-project torture/chaos testing validation (#11).
11. CVE-advisory template (#23, follows from #27).
12. Vulnerability-SLA rule (gap #22, follows from #27).
13. Multi-language SAST orchestrator (gap #15 promote to Full).
14. Read-only-CI-jobs explicit rule (gap #17 promote to Full).
15. Signed-commits-required universal rule (gap #20 promote to Full).
16. Open-governance rule (gap #28 promote to Full).

## Confidence

- **HIGH** confidence on Full/Missing classifications — directly verified via `aiwg show` and file reads.
- **MODERATE** confidence on Partial classifications — judgment call about whether existing artifacts realize enough of the practice. Reasonable people could re-class some Partials up or down by one notch.
- **N/A used: 0** — every curl practice translates to AIWG's domain when reframed at the right level of abstraction. The "-Werror" gap, for example, generalizes cleanly to "strict toolchain settings enforced in CI" which is meaningful for any AIWG-using project.

## How this audit could be wrong

- Discovery is corpus-driven. If a relevant artifact lacks the keywords used in the query, it can be missed. Mitigation: each Missing classification was double-checked by inspecting the relevant framework's directory listing.
- Coverage is binary in the output but graded in reality. A "Partial" can range from "almost Full" to "barely Adjacent." Where it matters, the Notes column says what's missing.
- Future AIWG releases will close some of these gaps as new rules and skills land. This document is timestamped (2026-05-21) and should be re-run at each minor release.

## Re-running this audit

```bash
# From repo root
aiwg discover "<practice keywords>"           # for each gap
aiwg show <type> <name>                        # to verify candidate
# Re-classify; update this file; commit
```

A future enhancement would be to embed this audit as a checked-in skill (e.g., `security-checklist-audit`) so any project using AIWG can run it against the curl checklist (or others — OWASP ASVS, NIST SSDF) without re-deriving methodology.

## References

- Source: Daniel Stenberg, "Securing curl" presentation slide (28 practices).
- Public curl security documentation: https://curl.se/docs/security.html
- Issue: roctinam/aiwg#1417
- AIWG rules cited above (verified to exist at audit time).
