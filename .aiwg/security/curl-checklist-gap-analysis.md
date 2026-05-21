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
| Full | 10 | 3, 4, 5, 7, 9, 10, 12, 18, 19, 24 |
| Partial | 11 | 1, 2, 14, 15, 16, 17, 20, 22, 23, 27, 28 |
| Missing | 7 | 6, 8, 11, 13, 21, 25, 26 |
| Adjacent | 0 | — |
| N/A | 0 | — |
| **Total** | **28** | |

Headline read: **AIWG has demonstrable, citable coverage for roughly 60% of curl's checklist** (Full + Partial), with the strongest concentration in CI/supply-chain hardening (security-engineering framework) and SDLC governance (HITL gates, delivery policy, complexity gates, doc-sync, test strategy). The eleven Missing entries cluster around three themes:

1. **Build-time correctness** — banned functions, strict toolchain settings, sanitizers, fuzzing, no-binary-blobs.
2. **Supply-chain transparency** — git mirror redundancy, signed-commits-required, 2FA for committers.
3. **Disclosure & advisory tooling** — private security reporting (SECURITY.md), CVE advisory format, API/ABI stability contracts, Unicode safety.

These are the highest-value targets for follow-up issues; see [Recommended Follow-Up Issues](#recommended-follow-up-issues) below.

## The 28-Row Audit

### Row 1 — Code Quality & Review

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 1 | Code style | Partial | `agentic/code/frameworks/sdlc-complete/extensions/javascript/skills/eslint-checker/SKILL.md`; `agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md` | ESLint covers JS/TS; `agent-friendly-code` defines structural thresholds language-agnostically. No multi-language style orchestrator for C/C++/Python/Rust/Go. |
| 2 | Banned functions | **Partial** | `agentic/code/frameworks/security-engineering/rules/banned-apis.md` + `skills/banned-api-audit/SKILL.md` (cycle-1 scaffold per #1418); starter banlists for C, Python, Node | Rule + skill scaffold landed with starter banlists. Cycle 2 wires the ripgrep-based audit implementation, banlist YAML schema validator, and SARIF output. Crypto rules remain CRITICAL specializations. |
| 3 | Complexity checks | **Full** | `agentic/code/frameworks/sdlc-complete/skills/complexity-gate/SKILL.md`; `agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md` | `complexity-gate` is a CI-friendly pass/fail gate; `agent-friendly-code` sets cyclomatic ≤10 warning / ≤15 error, nesting depth, function length thresholds. |
| 4 | Human reviews | **Full** | `agentic/code/frameworks/sdlc-complete/rules/hitl-gates.md`; `agentic/code/addons/aiwg-utils/rules/human-authorization.md`; `agentic/code/frameworks/sdlc-complete/rules/human-gate-display.md` | HITL gates mandatory at SDLC phase transitions. `human-authorization` requires explicit human approval for high-stakes/irreversible actions. Default `delivery.mode: pr-required` enforces review at the PR boundary. |
| 5 | Review bots | **Full** | `agentic/code/frameworks/sdlc-complete/extensions/github/skills/pr-reviewer/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md` | Dedicated PR reviewer skill (GitHub) and `code-reviewer` agent provide automated review for quality, security, and best practices. Gitea/GitLab parallels would be additive. |
| 6 | No binary blobs | **Missing** | — | No rule prohibits committing binary blobs. `dependency-source-policy` rejects non-registry tarball deps but not committed binaries. |
| 7 | No git force push | **Full** | `agentic/code/addons/aiwg-utils/rules/delivery-policy.md` | `force_push_policy: never \| main-only-blocked \| allowed` declared per-project. Current AIWG project: `never`. Agents are required to honor the declared policy. |

### Row 2 — Code Safety & Testing

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 8 | No confusable Unicode | **Missing** | — | No skill or rule for Unicode safety, confusable characters, or homoglyph detection. Adjacent to supply-chain trust but not covered. |
| 9 | Document everything | **Full** | `agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md` | `doc-sync` detects stale/missing docs and reconciles bidirectionally. SDLC framework requires documentation artifacts at each phase gate. |
| 10 | Many tests | **Full** | `agentic/code/frameworks/sdlc-complete/skills/test-coverage/SKILL.md`; `agentic/code/frameworks/sdlc-complete/skills/flow-test-strategy-execution/SKILL.md` | Coverage analysis with gap identification, plus full test-strategy execution flow. |
| 11 | Torture tests | **Missing** | — | No stress, chaos, endurance, or torture testing skill. `flow-test-strategy-execution` covers unit/integration/regression — adversarial endurance testing is absent. |
| 12 | CI like crazy | **Full** | `agentic/code/extensions/dev/rules/dev-pipeline-safety.md`; `agentic/code/extensions/dev/rules/dev-ci-self-contained.md`; `agentic/code/frameworks/sdlc-complete/skills/regression-cicd-hooks/SKILL.md` | `dev-pipeline-safety` (CRITICAL) forbids suppressing CI signals; `dev-ci-self-contained` requires reproducible builders; regression hooks integrate into CI. |
| 13 | All picky compiler options and `-Werror` | **Missing** | — | No rule mandates strict compiler/toolchain options. `dev-pipeline-safety` enforces "don't suppress signals" but doesn't define the floor for strict-toolchain settings. Reframed for AIWG's domain: a generic "strict toolchain CI floor" rule is missing. |
| 14 | Valgrind and sanitizers | **Partial** | `agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/SKILL.md` (cycle-1 scaffold per #1420); shared `lib/toolchain-detect.sh` | Skill scaffold with starter CI recipes for C/C++ (ASan/UBSan/MSan/TSan), Rust (cargo + miri), Go (race detector), Python (faulthandler + dev mode). Cycle 2 generates actual recipe files via implementation; operator guide and suppressions template included. |

### Row 3 — Analysis & Build Integrity

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 15 | AI + static code analyzers | Partial | `agentic/code/frameworks/sdlc-complete/extensions/javascript/skills/eslint-checker/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/code-reviewer.md` | AI-driven review via `code-reviewer` is strong. Tool-driven SAST is JS/TS-only; no Semgrep/CodeQL/SonarQube orchestration. |
| 16 | Fuzzing, in CI and non-stop | **Partial** | `agentic/code/frameworks/security-engineering/skills/fuzzing-in-ci/SKILL.md` (cycle-1 scaffold per #1420) | Skill scaffold with starter harnesses for C (libFuzzer), Rust (cargo-fuzz), Python (atheris + Hypothesis), Node (jazzer.js + fast-check). OSS-Fuzz integration guide included. PR-gating recipes bounded to 2 min/target. Cycle 2 wires AFL++ recipes, coverage reporting, corpus minimization. |
| 17 | Read-only CI jobs | Partial | `agentic/code/extensions/dev/rules/dev-secret-hygiene.md` | `dev-secret-hygiene` restricts secret exposure in CI; underlying principle is present but no explicit `permissions: read-all` workflow-level enforcement rule. |
| 18 | zizmor the CI jobs | **Full** | `agentic/code/frameworks/security-engineering/skills/ci-workflow-audit/SKILL.md`; `agentic/code/frameworks/security-engineering/rules/ci-action-pinning.md` | `ci-workflow-audit` audits unpinned actions, secret exposure in PR jobs, curl-pipe-shell installers, bare `:latest` tags — directly equivalent to zizmor's scope. `ci-action-pinning` (HIGH) mandates SHA-pinned actions. Strong. |
| 19 | Reproducible releases | **Full** | `agentic/code/frameworks/security-engineering/skills/supply-chain-trust/SKILL.md`; `agentic/code/extensions/dev/rules/dev-idempotent-builds.md`; `agentic/code/frameworks/sdlc-complete/rules/reproducibility.md` | `supply-chain-trust` addresses reproducible builds; `dev-idempotent-builds` mandates idempotent build steps; SDLC `reproducibility` rule (MEDIUM) enforces reproducibility for critical workflows. |
| 20 | Signed releases, commits, tags | Partial | `agentic/code/frameworks/security-engineering/skills/supply-chain-hardening-quickstart/SKILL.md`; `agentic/code/frameworks/security-engineering/skills/npm-supply-chain-audit/SKILL.md` | Skills audit for signed-release practice in the npm ecosystem; AIWG's own release process uses signed tags (per `CLAUDE.md` Release Checklist). No universal "signed-commits-required" rule for arbitrary projects. |
| 21 | Git backup on Codeberg | **Missing** | — | No rule mandates redundant git mirroring. AIWG dual-pushes to Gitea + GitHub by convention (per `CLAUDE.md`), but no enforcement artifact exists. Could be expressed as a `delivery-policy` extension (`remotes.secondary[].purpose: backup-mirror`). |

### Row 4 — Vulnerability & Access Management

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 22 | Vulnerabilities fixed in next release | Partial | `agentic/code/frameworks/sdlc-complete/skills/flow-security-review-cycle/SKILL.md`; `agentic/code/frameworks/sdlc-complete/agents/security-auditor.soul.md` | Security review flow orchestrates vulnerability management. No rule mandates a time-bound SLA ("fix in next release"). Security auditor persona has the disposition; enforcement is policy-driven. |
| 23 | Document vulnerabilities thoroughly | Partial | `agentic/code/frameworks/sdlc-complete/skills/flow-security-review-cycle/SKILL.md`; `agentic/code/frameworks/sdlc-complete/skills/security-assessment/SKILL.md` | Security review/assessment flows produce findings reports. No template/skill specifically for CVE-style public advisories with affected versions, mitigations, credits, CVSS scoring. |
| 24 | Code audits | **Full** | `agentic/code/frameworks/sdlc-complete/agents/security-auditor.soul.md`; `agentic/code/frameworks/sdlc-complete/skills/security-assessment/SKILL.md`; `agentic/code/frameworks/research-complete/skills/best-practices-audit/SKILL.md` | Dedicated security-auditor agent (with persona/soul), security-assessment skill (STRIDE/OWASP/SAST/DAST framing), and research-grounded best-practices audit. Multiple complementary paths. |
| 25 | (Strong) 2FA for all committers | **Missing** | — | No rule addresses committer 2FA/MFA enforcement. The security-engineering framework's `auth-factor-design` skill covers application auth, not source-control governance. Practice is enforced at the platform layer (Gitea/GitHub admin settings) but no AIWG rule documents the requirement or audits compliance. |
| 26 | API and ABI stability | **Missing** | — | No skill or rule addresses API/ABI stability, deprecation policy, or backwards-compatibility guarantees. `flow-change-control` handles change requests but doesn't enforce stability contracts. Important for any library/SDK AIWG helps build. |
| 27 | Private security reporting | **Partial** | `agentic/code/frameworks/security-engineering/templates/SECURITY.md` + `skills/security-report/SKILL.md` (cycle-1 scaffold per #1419) | Template with operator-fillable placeholders (contact, PGP, scope, SLA, disclosure timeline, hall of fame, CVE assignment). Private-intake skill with hard refusals against public channels and chain-of-custody record. Cycle 2 wires `aiwg doctor` SECURITY.md presence check, `aiwg new` scaffolding emit, and closure-loop tracking skill. |

### Foundation

| # | Practice | Coverage | Provided By | Notes |
|---|---|---|---|---|
| 28 | Everything done in the open | Partial | `agentic/code/frameworks/sdlc-complete/rules/provenance-tracking.md`; `agentic/code/addons/aiwg-utils/rules/activity-log.md`; `agentic/code/frameworks/sdlc-complete/rules/no-attribution.md` | AIWG enforces transparency at the **artifact** level: provenance tracking (W3C PROV-compliant), activity log, no-attribution (so commits remain the user's record). No rule defines an "open governance" stance for projects *using* AIWG. AIWG itself is open per the public repo and `CLAUDE.md`. |

## Why curl's checklist matters for AIWG users

curl's practices are not just a security framework — they are a **definition of what "ready for delivery at scale" looks like**. Projects that adopt AIWG should be able to reach a similar bar with AIWG's help. The Full and Partial rows above show where that's already true. The Missing rows show where adopters currently have to assemble the practice themselves.

The gap pattern is informative:

- **AIWG is strong at SDLC governance, CI hardening, supply-chain audit, and AI-assisted code review.** These reflect AIWG's core thesis: deploying agents and rules into AI-coding environments to shift quality work left.
- **AIWG is weak at runtime correctness tooling (sanitizers, fuzzing, banned-function enforcement) and at disclosure/governance tooling (SECURITY.md, 2FA mandates, API stability contracts).** The pattern: practices that require deep language/toolchain integration or platform-level policy (Git host admin settings) aren't yet expressed as AIWG rules.

This is a useful map. The fixes are local, well-scoped, and most are appropriate as new rules in `aiwg-utils` or `security-engineering` rather than new frameworks.

## Recommended Follow-Up Issues

Highest-value Missing/Partial gaps, ordered by expected impact-per-effort:

1. **`security-engineering`: banned-functions / forbidden-APIs rule** — close gap #2. Generalize the applied-cryptography pattern (`no-unauthenticated-encryption`, `no-adhoc-kdf`) into a configurable banlist mechanism that projects can opt into per language. Highest-value: directly transferable from curl's actual practice and most security-bearing.
2. **`security-engineering`: SECURITY.md + private-disclosure intake skill** — close gap #27. Template plus a `security-report` intake skill (private channel: encrypted email / Gitea private issue / GitHub Security Advisory). Important for any AIWG-using project that ships software publicly.
3. **`aiwg-utils`: no-binary-blobs rule + check** — close gap #6. Pre-commit and CI check that flags committed binaries above a configurable size threshold (or any non-allowlisted MIME class). Cheap to implement, broadly useful.
4. **`security-engineering`: sanitizer-and-fuzzing integration skills** — close gaps #14 and #16. Two skills (one for sanitizers in CI, one for fuzzing in CI) that detect language/toolchain and wire in ASan/UBSan/MSan or libFuzzer/AFL/property-based testing. Higher implementation cost but closes two practices.
5. **`aiwg-utils` or `security-engineering`: API/ABI stability rule + change-impact gate** — close gap #26. Layer on top of `flow-change-control` to enforce semver discipline, deprecation windows, and ABI breakage detection for libraries/SDKs.
6. **`aiwg-utils`: 2FA-for-committers documentation rule** — close gap #25. AIWG can't enforce platform-level 2FA, but it can document the requirement, audit (via the Gitea/GitHub API where available), and surface non-compliance in `aiwg doctor`.
7. **`aiwg-utils`: git-mirror-redundancy declaration in delivery-policy** — close gap #21. Extend `delivery-policy.remotes.secondary[]` with a `purpose: backup-mirror` value and have `aiwg doctor` verify the mirror is reachable.

Lower priority but worth tracking:

8. Strict-toolchain CI rule (gap #13).
9. Unicode-safety rule (gap #8).
10. Torture/chaos testing skill (gap #11).
11. CVE-advisory template (gap #23, follows from #27).
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
