---
artifact_type: software_architecture_document
study: novice-user-adoption
phase: elaboration
status: BASELINED
version: 1.0
created: 2026-05-14
synthesized_from:
  - working/sad-draft.md
  - working/sad-review-security.md
  - working/sad-review-testability.md
  - working/sad-review-traceability.md
voice: technical-authority
---

# Software Architecture Document — AIWG Novice-User Adoption Study

## 1. Introduction & Purpose

This document describes the architecture of the **AIWG Novice-User Adoption Study** — the design and execution structure of a research-and-design effort, not a product. The study commissions seven workstreams (A–G) tasked with addressing two persistent adoption failures: **project / session isolation failure** and **hookup failure** in novice user populations. Only one workstream (B) produces shipped code. The rest produce decisions, designs, audits, or empirical data points.

The "system" under design is therefore part UX architecture, part research methodology, and part one small piece of TypeScript that ships into `src/cli/handlers/use.ts`. This SAD adapts the standard SAD form to fit: component-level views are reserved for the two workstreams that touch the AIWG codebase (A audits it; B modifies it); the remainder is described at logical-architecture and methodology levels.

This SAD is the architectural baseline for the Lifecycle Architecture (LA) milestone. It exists to:

- Establish that the study's structure satisfies its drivers and mitigates its critical risks
- Trace every use case (UC-NUA-001 through UC-NUA-007) to a workstream and an architectural section
- Identify decisions deferred to ADRs and the open architectural questions that remain
- Inform downstream construction epics on what the study did and did not decide

The study's commissioning epic (`roctinam/aiwg#1334`) requires hard-stopping at the Architecture Baseline Milestone (ABM). Construction-level work is explicitly out of scope, including the wizard implementation, any per-platform hookup remediation epic, and the engagement-surface implementation. Workstream B is the sole construction-level deliverable inside the study window.

## 2. Architectural Drivers

### 2.1 Success-Metric Drivers

The intake form names six success metrics. Each constrains the architecture:

| Metric | Architectural implication |
|--------|--------------------------|
| Hookup confidence per platform | Per-platform field-evidence model; no platform-wide claims; matrix as primary artifact (Workstream A) |
| Project-isolation warning shipped | Single, low-blast-radius TypeScript module in `src/cli/handlers/use.ts`; non-blocking by design; env-var opt-out (Workstream B) |
| Wizard flow design doc | Design-only deliverable; invocation-pattern decision deferred to ADR or design-doc note (Workstream C) |
| Global install decision | ADR-only deliverable; binary first-class / escape-hatch decision (Workstream D) |
| Discovery-agent bolster | Audit-driven; null-finding is an acceptable outcome (Workstream A subproduct) |
| AIWG-engagement surface decision | Design-doc deliverable framed by Lee & See trust calibration; explicit anti-pattern guardrails (Workstream F) |

### 2.2 Design Tensions

The solution profile names three tensions; each becomes an ADR seed:

1. **Discoverability vs. Pollution** — surfacing AIWG engagement supports trust calibration but threatens branding pollution. Resolved by: anti-pattern guardrails in Workstream F design doc; defaults that prefer user-initiated probes over agent-pushed identification.
2. **Wizard vs. Default-Path Friction** — a wizard reduces novice failure rate but can degrade power-user UX. Resolved by: opt-in invocation; default `aiwg use` behavior unchanged; documentation discipline (wizard ≠ default install path).
3. **Global Install Convenience vs. Project Isolation** — global install supports the "AIWG everywhere" UX many users prefer, but undermines the project-scoped context boundary REF-720 evidence supports. Resolved by: ADR decision (Workstream D) plus the non-blocking warning (Workstream B) as the in-product enforcement.

### 2.3 Critical-Risk Drivers

Three critical risks (priority ≥12) shape the study's structure:

- **R-001 (per-platform validation infeasibility, P=16)** — drives the evidence-type taxonomy and the "8 of 10" success threshold instead of universal coverage.
- **R-002 (branding pollution, P=15)** — drives the anti-pattern guardrails baked into Workstream F's design doc and the explicit reference to the existing `no-attribution` rule as an architectural invariant.
- **R-003 (wizard friction, P=12)** — drives the opt-in invocation pattern for Workstream C and the explicit power-user-path Cognitive Walkthrough requirement.

### 2.4 Methodology Drivers

- **No static-analysis-only conclusions.** Workstream A's matrix requires field evidence per cell. The evidence-type taxonomy (§5.2) is the architectural enforcement.
- **No silent skill copying into `.aiwg/`.** Workstream E's remediation guidance respects the standing rule that skills are reached via `aiwg discover` + `aiwg show`, not by copying into per-project directories.

## 3. Stakeholder Map

| Stakeholder | Architectural concern |
|-------------|----------------------|
| AIWG core maintainers | Framework integrity; review every baselined artifact; own ADRs |
| Non-technical AIWG users | Primary beneficiaries; addressed by Workstreams B, C, F |
| Technical AIWG users | No-regression constraint; addressed by Workstream B opt-out, Workstream C opt-in, Workstream D continued-support guarantee |
| Discord/Telegram community | Field-feedback input to Workstreams A and G; comms target for Workstream D ADR rollout |
| Provider platforms (10) | Each requires separate validation in Workstream A; Workstream E audits per-platform read-access |

## 4. Logical Architecture of the Study

The study is a directed acyclic graph of seven workstreams plus cross-cutting concerns. Workstreams differ in deliverable type — designs, ADRs, implementations, audits, or data — and in their dependency relationships.

```mermaid
graph TB
    subgraph Inputs
        Intake[Intake form]
        Risks[Risk screening]
        Profile[Solution profile]
        Research[Research corpus<br/>REF-943-REF-950, REF-720]
    end

    subgraph Pre-Deploy
        C[Workstream C<br/>Wizard design doc]
    end

    subgraph Deploy
        B[Workstream B<br/>Isolation warning<br/>SHIPPED CODE]
        D[Workstream D<br/>Global-install ADR]
    end

    subgraph First-Session
        A[Workstream A<br/>Per-platform hookup<br/>matrix]
        E[Workstream E<br/>Provider read-access<br/>audit]
    end

    subgraph Engaged-Session
        F[Workstream F<br/>Engagement surface<br/>design doc]
    end

    subgraph Cross-Cutting
        G[Workstream G<br/>3 empirical questions]
    end

    Intake --> C & B & D & A & E & F & G
    Research --> C & F & D
    Risks --> A & C & F
    G -.feedback.-> C & B & F
    D -.constrains.-> B
    A --> F
    E --> A

    classDef impl fill:#d4edda,stroke:#28a745
    classDef adr fill:#fff3cd,stroke:#ffc107
    classDef design fill:#cce5ff,stroke:#007bff
    classDef audit fill:#f8d7da,stroke:#dc3545
    classDef data fill:#e2e3e5,stroke:#6c757d

    class B impl
    class D adr
    class C,F design
    class A,E audit
    class G data
```

### 4.1 Workstream Deliverable Taxonomy

| Workstream | Deliverable type | Output location |
|------------|-----------------|-----------------|
| A — Per-platform hookup audit | Field-evidence matrix + follow-up issues | `working/hookup-matrix.md` |
| B — Project-isolation warning | TypeScript implementation + tests | `src/cli/handlers/use.ts` + `src/cli/project-isolation/` |
| C — Wizard design | Design doc + walkthrough record | `working/wizard-design.md` |
| D — Global install decision | ADR | `architecture/adr-global-install.md` |
| E — Provider read access | Per-provider audit report + targeted config fixes | `working/provider-read-audit.md` |
| F — Engagement-surface design | Design doc citing trust-calibration framework | `working/engagement-surface.md` |
| G — Empirical questions | Three documented data points | `working/empirical-G[1-3].md` |

### 4.1.1 Workstream Rationale (C, D, F)

These three workstreams produce design / ADR deliverables rather than implementation. Their architectural anchors:

- **Workstream C — Wizard design.** Minimum content: invocation pattern (one of `aiwg wizard` / `aiwg use --wizard` / `aiwg new --interactive` with rationale); step-by-step flow with provider detection, project-root detection or creation, framework selection, deploy invocation, post-deploy verification probe; Cognitive Walkthrough record for each step (REF-949); explicit power-user opt-out path. NFR-USE-02 ceiling: ≤2 friction points per step.
- **Workstream D — Global install ADR.** Minimum content: status decision (first-class vs. escape-hatch); rationale referencing REF-720 cross-context-bleed evidence; user-facing wording for the chosen status; continued-support guarantee for the non-chosen path through at least one CalVer cycle; Discord/Telegram comms plan to execute before merge.
- **Workstream F — Engagement-surface design.** Minimum content: probe pattern (default: user-initiated `aiwg status` or equivalent); opt-in passive surface (footer); opt-out path; explicit anti-pattern list keyed to `no-attribution` invariant; trust-calibration analysis using Lee & See (`REF-950`) and Co-Audit (`REF-948`); Cognitive Walkthrough validation.

### 4.2 Dependencies

- **B depends on D's direction (weak coupling).** The warning's wording must remain neutral regarding global-install status until D baselines. The wording specified in UC-NUA-002 — *"No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root. Continuing in 3 seconds — press Ctrl-C to cancel."* — is the neutral phrasing. B can ship with this exact wording before D baselines; D may update it post-decision if the chosen status warrants.
- **F depends on A.** The engagement surface design must know which discovery hooks reach the agent on which platform; F cannot specify "show probe via discovery-agent" without A's evidence.
- **A depends on E.** The hookup matrix cannot reach honest conclusions if some platforms lack read access to `$AIWG_ROOT`. Confounding factor must be excluded first.
- **G feeds back** into C, B, and F. G is not on the critical path; outputs refine, not block, downstream design.

### 4.3 Sequencing

The study runs primarily in parallel. Suggested ordering inside the elaboration phase:

1. **Week 1–2** — E (provider read access), B (implementation start), G (poll launch)
2. **Week 2–4** — A (per-platform validation, gated on E completion per platform), C (wizard survey + design draft)
3. **Week 3–5** — D (ADR drafting), F (engagement-surface design)
4. **Week 4** — D ADR comms plan executed in Discord/Telegram (precondition for D merge)
5. **Week 5–6** — B (PR review + merge), all workstreams converging on ABM-equivalent gate review

## 5. Component-Level Views — Implementation-Touching Workstreams

### 5.1 Workstream B — Project-Isolation Warning

The warning is a small, additive module inside the `aiwg use` command path. It runs detection logic at the start of command execution, optionally emits a warning, applies a configurable delay during which the user can cancel, and otherwise allows command execution to proceed unchanged.

#### 5.1.1 Module Placement

```
src/
  cli/
    handlers/
      use.ts                          ← invocation point; calls warning early
    project-isolation/                ← NEW
      detect.ts                       ← signal-walk logic (NFR-PERF-02)
      signals.ts                      ← single-source-of-truth list (NFR-MAINT-01)
      warning.ts                      ← warning emission + delay
      index.ts                        ← public API
```

#### 5.1.2 Detection Flow

```mermaid
flowchart TD
    Start[aiwg use invoked] --> EnvCheck{AIWG_GLOBAL_INSTALL=1?}
    EnvCheck -- yes --> InfoLine[Emit info line<br/>no delay] --> Continue[Continue deployment]
    EnvCheck -- no --> Detect[Walk cwd + 3 parents<br/>for project signals]
    Detect --> Found{Signal found?}
    Found -- yes --> Continue
    Found -- no --> CheckHome{cwd in HOME, /, /tmp?}
    CheckHome -- no --> Continue
    CheckHome -- yes --> Warn[Emit warning + 3s delay]
    Warn --> Cancelled{Ctrl-C?}
    Cancelled -- yes --> Exit[Exit cleanly,<br/>no artifacts written]
    Cancelled -- no --> Log[Log to .aiwg/activity.log<br/>warn:no-project-signal]
    Log --> Continue
```

#### 5.1.3 Project-Signal List

Single array in `signals.ts` (NFR-MAINT-01):

```typescript
export const PROJECT_SIGNALS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'Gemfile',
  'build.gradle',
  // *.csproj globbed separately
] as const;
```

#### 5.1.4 NFR Traceability

| NFR | Architectural choice |
|-----|---------------------|
| NFR-PERF-01 (<50ms detection) | Stat-only checks; no file read; depth-bounded walk |
| NFR-PERF-02 (depth ≤3) | Loop counter in `detect.ts` |
| NFR-REL-01 (non-blocking) | Delay implemented with `setTimeout` + Ctrl-C handler |
| NFR-REL-02 (env-var opt-out) | `process.env.AIWG_GLOBAL_INSTALL` check before any detection work |
| NFR-USE-01 (clarity) | Warning text matches UC-NUA-002 wording verbatim |
| NFR-SEC-01 (no credentials) | Module imports only `node:fs`, `node:path`; no token-related code |
| NFR-MAINT-01 (extensibility) | `signals.ts` exports single `PROJECT_SIGNALS` array |
| NFR-OBS-01 (activity logging) | `warning.ts` calls `appendActivityLog('warn:no-project-signal', ...)` after non-cancelled emission |
| NFR-COMPAT-02 (no regression) | All paths bypass detection when `AIWG_GLOBAL_INSTALL=1` or project signal found |

#### 5.1.5 Test Strategy

- Unit tests in `test/cli/project-isolation/`
- Per-signal positive case (each entry in `PROJECT_SIGNALS`)
- Negative cases: `$HOME`, `/`, `/tmp`, deeply nested directory with no signals
- Walk-depth test: signal at parent[3] is found; signal at parent[4] is not
- Performance test: warm-cached `aiwg use` in a project root completes detection in <50ms (CI-enforced, NFR-PERF-01)
- Env-var test: warning suppressed when `AIWG_GLOBAL_INSTALL=1`
- Backward compatibility: existing `aiwg use sdlc` test suite passes unmodified

### 5.2 Workstream A — Per-Platform Hookup Audit

Workstream A produces a matrix, not code. Its architecture is the matrix structure plus the evidence-type taxonomy that prevents R-006 (static-audit recurrence).

#### 5.2.1 Matrix Structure

```
              | Rule hook | AIWG.md hook | Quickref hook | Discovery-agent hook | Read access (E) |
--------------|-----------|--------------|---------------|----------------------|-----------------|
Claude Code   | scripted+ | scripted+    | scripted+     | scripted+            | scripted+       |
Codex         | scripted+ | scripted+    | scripted+     | scripted+            | scripted+       |
Copilot       | ?         | ?            | ?             | ?                    | ?               |
Cursor        | ?         | ?            | ?             | ?                    | ?               |
Factory       | ?         | ?            | ?             | ?                    | ?               |
OpenCode      | ?         | ?            | ?             | ?                    | ?               |
Warp          | ?         | ?            | ?             | ?                    | ?               |
Windsurf      | ?         | ?            | ?             | ?                    | ?               |
Hermes        | ?         | ?            | ?             | ?                    | ?               |
OpenClaw      | ?         | ?            | ?             | ?                    | ?               |
```

Each cell records a hook-firing claim plus the evidence type backing it. **Regression-check requirement:** before declaring the matrix complete, Claude Code and Codex are re-validated with the same scripted task used for the other platforms — they remain field-evidence rows, not assumptions.

#### 5.2.2 Evidence-Type Taxonomy

| Evidence type | Required artifact | Validity weight | Use |
|---------------|------------------|-----------------|-----|
| **scripted** | Committed test script + CI run log | High | Repeatable scripted task on the platform; preferred |
| **manual** | Session transcript + study-runner identity + provider account used | Medium-High | Hand-walked task by study runner with documented log |
| **field-feedback** | User report (Discord/GitHub identity) + reproduction notes | Medium | Direct user report with provider + scenario captured |
| **telemetry** | Anonymized event count + time range + platform tag | Medium | Anonymous opt-in invocation log; corroborating, not standalone |
| **static-flagged** | File path + line reference | Candidate-only | Static analysis used only to flag candidates for field validation; never a conclusion |

The architectural rule: **no cell concludes with `static-flagged` alone.** Static analysis identifies what to test; field evidence determines what is true. Required-artifact column enables matrix audit — any cell can be checked against its artifact type.

#### 5.2.3 Discovery Hooks Across Providers

The four discovery hooks reach the agent through different mechanisms. The matrix's column structure encodes that variation:

```mermaid
graph LR
    User[User question] --> Session[AI Session on Provider X]
    Session --> H1[Rule hook<br/>auto-loaded rule file]
    Session --> H2[AIWG.md hook<br/>primary context file]
    Session --> H3[Quickref hook<br/>kernel-loaded skill]
    Session --> H4[Discovery-agent hook<br/>subagent dispatch]
    H1 & H2 & H3 & H4 --> Agent[Agent decides<br/>to call discover]
    Agent --> Discover[aiwg discover]
    Discover --> Show[aiwg show]
    Show --> Apply[Apply skill]
```

Provider-specific notes (working hypotheses, not findings):

- **Claude Code / Cursor / OpenClaw** — rule files auto-load; H1 expected to dominate
- **Codex / Warp / Windsurf** — primary context file is the loading mechanism; H2 dominates; H1 reaches via the context file
- **Copilot / Factory / OpenCode** — exact loading order varies; field evidence required
- **Hermes** — MCP sidecar architecture; rule and skill access path differs; field evidence required

The matrix produces findings.

#### 5.2.4 Discovery-Agent Bolster Sub-Audit

The fourth column gets a dedicated sub-audit (project-owner flag). The sub-audit asks:

- Does `aiwg-finder` (or the platform's subagent-dispatch equivalent) get invoked when an AIWG-relevant question is asked?
- Is the invocation rate higher than the agent independently calling `aiwg discover`?
- If the dispatch path doesn't fire, is the cause provider-side (no subagent support) or AIWG-side (instructions unclear)?

Acceptable outcomes include "no improvement warranted" (per R-004 mitigation). The deliverable is a recommendation, possibly null. If the decision is non-trivial, it produces an optional ADR annotated `ADR-equivalent: discovery-agent-bolster` in the audit report; if null, the rationale is recorded in the matrix appendix.

#### 5.2.5 Workstream E Read-Access Scope Boundary

The Workstream E audit (whose column is integrated into the matrix as "Read access (E)") bounds read-access requests to `$AIWG_ROOT/agentic/code/` — the artifact corpus that `aiwg discover` and `aiwg show` need to reach. Read access to other AIWG-install paths (`$AIWG_ROOT/src/`, `$AIWG_ROOT/test/`, `$AIWG_ROOT/.git/`) is **not** required and not requested. Workstream E's audit must include a path-traversal-resistance check verifying agents cannot use the granted read access to escape the corpus path.

## 6. Cross-Cutting Concerns

### 6.1 Trust-Calibration Framing

Workstream F builds explicitly on **Lee & See (2004) — "Trust in Automation: Designing for Appropriate Reliance"** (REF-950). Three calibration outcomes:

- **Appropriate reliance** — user trusts the system when warranted and ignores it when not
- **Over-trust / over-reliance** — user accepts incorrect output uncritically
- **Disuse / under-reliance** — user disregards correct output

The engagement-surface design must support appropriate reliance: users who can recognize when AIWG is engaged develop calibrated expectations. The design must not push users toward over-reliance (the branding-pollution risk) or disuse (the invisibility risk).

Pair this with **Co-Audit (Gordon et al. 2024; REF-948)** for the on-demand probe pattern: explicit user inquiry is the recommended primary surface; passive footers are an opt-in alternative; pushy attribution is the anti-pattern.

**Cognitive Walkthrough method** (Wharton et al. 1994; REF-949) is the pre-deployment evaluation method for any walk-up flow including the wizard (Workstream C) and engagement surface (Workstream F). The walkthrough record is the pre-deployment test artifact; downstream user-test records are a separate artifact class, deferred to the implementation epic.

### 6.2 Anti-Pollution Invariant

The existing `.claude/rules/no-attribution.md` rule is treated as an **architectural invariant** for this study. No deliverable — including the Workstream C wizard output, the Workstream F engagement surface, or any artifact the wizard generates on the user's behalf — may introduce:

- AIWG identification in commit messages
- AIWG identification in code comments of user-generated files
- AIWG identification in file headers of user-generated artifacts
- AIWG identification in generated documentation content (excepting the study's own deliverables)

NFR-USE-03 enforces this at design-review time. Both the Workstream C wizard design doc AND the Workstream F engagement-surface design doc must include explicit anti-pattern checklists, verified against the existing rule.

### 6.3 Voice & Authenticity

All baselined study deliverables use the `technical-authority` voice profile per the project voice-framework rule. Deliverables run through `/writing-validator` before baselining (R-009 mitigation). Voice drift across agents and sessions is the primary quality risk; profile pinning is the primary control.

### 6.4 Citation Discipline

Eight research papers used for grounding have finalized as REF-943-REF-950. This citation-validate sweep updated the study artifacts to finalized REF-NNN references and removed the old induction-issue/provisional-REF dual-citation pattern. No artifact baselines with unresolved induction issue citations (R-010 mitigation).

Existing REF citations (REF-720, REF-877, REF-878, REF-879) follow the standard citation-policy rule unchanged.

### 6.5 Workstream C Credential Surface (Security Envelope)

The Workstream C wizard design doc must declare its credential surface architecturally — one of `none` / `env` / `prompt` / `file` — so the implementation epic inherits a defined security envelope. NFR-SEC-02 (deferred until implementation) constrains any credential handling to follow the existing `token-security` rule.

### 6.6 Workstream G Telemetry Privacy

Activity-log entries are committed to git (per the `activity-log` rule). Workstream G telemetry must therefore either: (a) NOT route through `.aiwg/activity.log` if the events could identify users, or (b) be aggregated/anonymized before logging. The design decision is part of Workstream G's deliverable.

## 7. Deployment View

### 7.1 Namespace

All study artifacts live under `.aiwg/studies/novice-user-adoption/`:

```
.aiwg/studies/novice-user-adoption/
├── intake/              ← problem statement, solution profile, risks
├── requirements/        ← UCs, user stories, NFR register
├── architecture/        ← SAD, ADRs (D, F, others as needed)
├── working/             ← drafts, walkthroughs, surveys, empirical data
├── testing/             ← test strategy + plans
└── reports/             ← gate reports (LOM done, ABM pending)
```

### 7.2 Baselining

- **Already baselined:** intake-form, solution-profile, risk-screening, all UCs, user-stories, nfr-register, LOM gate report
- **This SAD:** baselined via Primary Author → 3 parallel reviewers → Synthesizer cycle. **Synthesis decision rule:** APPROVED items pass unchanged; APPROVED-WITH-SUGGESTIONS items are folded into the final SAD where the suggestion is concrete; CONDITIONAL items require resolution before baseline; REJECTED items either fix the underlying issue or document the disagreement in deferred-questions. This SAD reflects all three reviewers' APPROVED-WITH-SUGGESTIONS verdicts; 15 suggestions folded in.
- **ADRs:** baselined per Workstream D (global install) and Workstream F (engagement surface) as mandatory; Workstream C (wizard invocation) and Workstream A (discovery-agent bolster) may produce optional ADRs annotated `ADR-equivalent:` in their design docs.

### 7.3 Relationship to AIWG Repo

The study runs inside the AIWG repository as a dogfooding instance of AIWG's SDLC framework applied to AIWG itself. Workstream B's implementation lands in `src/cli/handlers/use.ts` (and the new `src/cli/project-isolation/` directory) via standard PR process. All other workstream outputs live under `.aiwg/studies/novice-user-adoption/` and do not require code changes.

Workstream B is the only workstream that produces deployment-relevant changes during the study window. It ships via standard CalVer release once merged; no special release coordination is required.

## 8. Use Case Traceability

| Use case | Workstream | Primary SAD section | Notes |
|----------|-----------|---------------------|-------|
| UC-NUA-001 — Installs and uses AIWG | All (parent UC) | §4 Logical Architecture | Aggregating use case |
| UC-NUA-002 — Runs `aiwg use` first time | B | §5.1 Component view + §4.2 wording trace | Direct implementation trace |
| UC-NUA-003 — Onboards via wizard | C | §4.1.1 Workstream rationale | Design-doc deliverable |
| UC-NUA-004 — Installs globally | D | §2.2 Tension 3 + §4.1.1 + ADR | ADR deliverable |
| UC-NUA-005 — Agent invokes discover | A, E | §5.2 Component view + §5.2.5 E scope | Direct audit trace |
| UC-NUA-006 — Recognizes AIWG engaged | F | §6.1 Trust calibration + §6.2 Anti-pollution invariant + §4.1.1 | Design-doc deliverable |
| UC-NUA-007 — Study runner audits platform | A, G | §5.2.2 Evidence taxonomy + §5.2.4 Sub-audit | Methodology constraint |

All seven UCs trace. No UC is unaddressed.

## 9. Risk–Architecture Mapping

| Critical risk | Architectural mitigation | Effective priority after mitigation |
|---------------|-------------------------|-------------------------------------|
| **R-001** — Per-platform validation infeasibility (P=16) | Evidence-type taxonomy admits scripted/manual/field-feedback/telemetry; success threshold 8 of 10; per-platform prioritization by user volume | ~8 |
| **R-002** — Branding pollution (P=15) | Anti-pollution invariant treats `no-attribution` rule as architectural; trust-calibration framing prefers user-initiated probes; NFR-USE-03 enforces at design review; Workstream C wizard output also bound | ~5 |
| **R-003** — Wizard friction (P=12) | Opt-in invocation is hard architectural constraint; design-only deliverable in study window; default `aiwg use` unchanged | ~4 |

All three drop below critical (P<12) after architectural mitigation. Non-critical risks (R-004 null finding, R-005 ADR conflict, R-006 static audit, R-010 citation drift) are addressed by §5.2.4, §7.3, §5.2.2, and §6.4 respectively.

## 10. Open Architectural Questions (Deferred to ADRs)

| Question | Owner | Deferred to | Status |
|----------|-------|-------------|--------|
| Is global install a first-class supported flow or a discouraged escape hatch? | Workstream D | `adr-global-install.md` | MANDATORY |
| Should the engagement surface default be on-demand probe, opt-in footer, or no surface? | Workstream F | `adr-engagement-surface.md` | MANDATORY |
| Is the wizard invoked as `aiwg wizard`, `aiwg new --interactive`, or `aiwg use --wizard`? | Workstream C | Wizard design doc with `ADR-equivalent: wizard-invocation` annotation | OPTIONAL |
| Does the discovery-agent hook need bolstering, or is the current implementation adequate? | Workstream A | Matrix appendix with `ADR-equivalent: discovery-agent-bolster` annotation | OPTIONAL |
| Does Workstream G's opt-in telemetry get implemented during the study, or deferred entirely? | Workstream G | Scope note in Workstream G output | OPTIONAL |

The mandatory ADRs are D and F. The three optional records use the `ADR-equivalent:` annotation pattern in their design docs so future readers can locate the decision via grep.

## 11. ABM Gate Criteria

This SAD plus its three reviewer-cycle outputs (security, test, requirements analyst) plus the mandatory ADRs (D, F) plus the master test strategy constitute the artifact set for the **Architecture Baseline Milestone (ABM)** gate. Additional gate requirement: **citation-validate sweep** — after research-papers inductions finalize as REF-NNN, run a sweep across study artifacts updating REF references and removing the dual-citation pattern. The sweep is complete for REF-943-REF-950.

The commissioning epic requires hard-stopping at ABM; no construction-prep work follows.

Construction-level work the study enables but does not perform:

- Wizard implementation (Workstream C produces design only)
- Engagement-surface implementation (Workstream F produces design only)
- Per-platform hookup remediation epics (Workstream A produces findings + follow-up issues only)
- Provider read-access fixes beyond targeted remediation already in Workstream E scope

## 12. References

- Intake form, solution profile, risk screening, LOM gate report (this study)
- All UCs (UC-NUA-001 through UC-NUA-007) and user stories
- NFR register
- Research corpus:
  - REF-720 (Lost in Multi-Turn Conversation, MSR/Salesforce 2025)
  - REF-877/878/879 (tool-routing precision)
  - `REF-943` (Krug)
  - `REF-944` (Nielsen heuristics)
  - `REF-945` (Norman)
  - `REF-946` (W3C cognitive accessibility)
  - `REF-947` (Zamfirescu-Pereira)
  - `REF-948` (Co-Audit)
  - `REF-949` (Cognitive Walkthrough)
  - `REF-950` (Lee & See)
- Existing AIWG rules:
  - `.claude/rules/no-attribution.md`
  - `.claude/rules/voice-framework.md`
  - `.claude/rules/activity-log.md`
  - `.claude/rules/citation-policy.md`
  - `.claude/rules/token-security.md`
- Saved memory rules: `feedback_no_platform_generalization`, `feedback_aiwg_branding_restraint`, `feedback_no_skill_copying`, `feedback_discovery_multi_hook`
- Reviews (working): `working/sad-review-security.md`, `working/sad-review-testability.md`, `working/sad-review-traceability.md`
- Commissioning epic: `roctinam/aiwg#1334`
