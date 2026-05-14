---
artifact_type: master_test_strategy
study: novice-user-adoption
phase: elaboration
status: BASELINED
created: 2026-05-14
voice: technical-authority
---

# Master Test Strategy — AIWG Novice-User Adoption Study

## 1. Purpose

This strategy defines the test artifacts and methods required for the study's seven workstreams. Because the study produces decisions and designs in addition to one implementation, the "test" surface includes both software tests (Workstream B) and pre-deployment evaluation methods (Cognitive Walkthrough for Workstreams C and F) and methodology audits (Workstream A's evidence-type taxonomy as a test-result-validity mechanism).

The strategy aligns with NFR-PERF, NFR-REL, NFR-USE, NFR-SEC, NFR-MAINT, NFR-COMPAT, NFR-OBS, and NFR-ACCESS from the NFR register, and with the seven UCs.

## 2. Test Artifact Classes

The study recognizes four test artifact classes, each appropriate to a different deliverable type:

| Class | Used for | Format | Example |
|-------|----------|--------|---------|
| **Software tests** | Workstream B implementation | Vitest / Jest unit + integration suites | `test/cli/project-isolation/detect.test.ts` |
| **Cognitive Walkthrough records** | Workstream C, F design docs (pre-deployment) | Markdown record with 4 CW questions × N steps | `working/wizard-cognitive-walkthrough.md` |
| **Audit reports** | Workstream A matrix, Workstream E read-access audit | Matrix with evidence-type column + per-cell artifact reference | `working/hookup-matrix.md` |
| **Field-evidence records** | Workstream A cells classified as field-feedback / telemetry / manual | Discord/GitHub link or session transcript | Referenced from matrix cells |

User-test records (post-deployment empirical validation) are **out of scope** for this study — they are deferred to downstream implementation epics for Workstreams C and F.

## 3. Workstream B — Software Test Strategy

### 3.1 Test Layers

| Layer | Coverage | NFR mapping |
|-------|----------|-------------|
| Unit (`detect.ts`, `signals.ts`) | Project-signal detection per signal type; walk-depth; edge cases | NFR-PERF-02, NFR-MAINT-01 |
| Unit (`warning.ts`) | Warning emission, delay timing, Ctrl-C cancellation, env-var suppression, activity-log integration | NFR-USE-01, NFR-REL-01, NFR-REL-02, NFR-OBS-01 |
| Integration (`use.ts` invocation path) | End-to-end flow: deploy in project root (no warning), deploy in `$HOME` (warning fires), deploy with `AIWG_GLOBAL_INSTALL=1` (no delay) | UC-NUA-002 acceptance criteria |
| Performance (CI-enforced) | Detection completes in <50ms in project root; bounded by walk depth even in pathological cases | NFR-PERF-01 |
| Backward compatibility (regression) | Existing `aiwg use sdlc` test suite passes unmodified | NFR-COMPAT-02 |

### 3.2 Required Test Cases (UC-NUA-002 Acceptance Map)

| AC | Test case | Layer |
|----|-----------|-------|
| Warning fires in `$HOME`, `/`, `/tmp` with no signals | Unit + integration | `detect.test.ts` for detection logic; `warning.test.ts` for emission |
| Warning NOT in project (any signal present) | Unit per signal in `PROJECT_SIGNALS` | `detect.test.ts` |
| 3-second delay with Ctrl-C cancellation | Unit with fake-timer | `warning.test.ts` |
| Env-var `AIWG_GLOBAL_INSTALL=1` suppresses warning | Unit | `warning.test.ts` |
| Warning text matches UC-NUA-002 wording | Unit (string equality) | `warning.test.ts` |
| Cognitive Walkthrough on warning text | CW record | `working/warning-text-cognitive-walkthrough.md` |

### 3.3 Test Infrastructure

- **Test runner:** Vitest (matches AIWG project convention; verify in `package.json` before implementation epic starts)
- **Fake timers:** for delay testing — confirm Vitest's `vi.useFakeTimers()` semantics support the Ctrl-C cancellation flow
- **Process env stubbing:** for env-var tests, use Vitest's `vi.stubEnv`
- **Filesystem stubbing:** for project-signal detection — prefer `memfs` over actual filesystem to ensure isolated, parallel tests
- **CI integration:** GitHub Actions workflow added to existing `.github/workflows/` (Gitea Actions equivalent on internal mirror) — performance test fails build on regression above 50ms

### 3.4 Coverage Target

- Unit coverage on `src/cli/project-isolation/` module: ≥90% line, ≥85% branch
- No special coverage target for `use.ts` modification — covered by existing test suite

## 4. Workstream A — Audit Methodology

Workstream A's "test" is the matrix audit itself. Validity is enforced by the evidence-type taxonomy (SAD §5.2.2). The matrix-as-test pattern:

### 4.1 Matrix Audit Method

For each cell in the 10 platforms × 5 hooks matrix:

1. **Identify evidence type** — assign one of: scripted / manual / field-feedback / telemetry / static-flagged
2. **Produce the required artifact** — committed test script (scripted), session transcript (manual), user-report link (field-feedback), aggregated-event record (telemetry), or file:line reference (static-flagged)
3. **Verify cross-evidence** — at least one cell per platform must use evidence other than `static-flagged`
4. **Regression-check** — re-run scripted task on Claude Code and Codex with the same protocol used for other platforms; ensure they remain evidence-bearing rows

### 4.2 Matrix Pass Criteria

| Criterion | Threshold |
|-----------|-----------|
| Total cells with non-static-flagged evidence | ≥40 out of 50 (80%) |
| Platforms with field-validated evidence (any non-static cell) | ≥8 of 10 |
| Discovery-agent column completeness | All 10 platforms have a verdict (validated or null-finding-noted) |
| Read-access column (Workstream E) | All 10 platforms audited; path-traversal-resistance check executed |

### 4.3 Matrix Fail Modes

A FAIL outcome is acceptable as a study finding — it identifies follow-up epics. The matrix MUST conclude with one of:

- **PASS** (all four criteria met)
- **PARTIAL-PASS** (matrix complete but threshold(s) not met — follow-up issues filed)
- **DEFERRED** (some platforms unreachable; documented with reason; follow-up sprint planned)

## 5. Workstream C and F — Cognitive Walkthrough as Test

For each design doc deliverable from Workstreams C (wizard) and F (engagement surface):

### 5.1 Walkthrough Protocol

Per Wharton et al. (1994) — `research-papers #613` / pending REF-158:

For each step in the user flow, answer four questions:

1. **Will the user try to achieve the right effect?** (Is the goal mapped onto an action they can identify?)
2. **Will the user notice that the correct action is available?** (Is the control visible at the right time?)
3. **Will the user associate the correct action with the desired effect?** (Does the control's signifier match the action's outcome?)
4. **If the correct action is performed, will the user see that progress is being made toward solving the task?** (Does the system provide feedback?)

Each step's answer is YES / NO / UNCERTAIN with one-paragraph rationale.

### 5.2 Walkthrough Pass Criteria

| Criterion | Threshold |
|-----------|-----------|
| Friction points per step | ≤2 (NFR-USE-02) |
| YES rate across all CW questions | ≥75% |
| UNCERTAIN responses | Each must have a concrete plan to resolve (research, prototype, follow-on user-test) |
| NO responses | Each must trigger a design revision before walkthrough concludes |

### 5.3 Required Walkthroughs

- Workstream C wizard: walkthrough for primary flow + power-user opt-out path
- Workstream F engagement surface: walkthrough for default invisible state, probe invocation, opt-in footer, opt-out config

## 6. Workstream D — ADR Review as Test

ADR-NUA-001 (global install) and ADR-NUA-002 (engagement surface) move from PROPOSED to ACCEPTED via core-maintainer review and the Discord/Telegram comms plan (for D specifically). The "test" of an ADR is whether:

| Criterion | How verified |
|-----------|--------------|
| Decision is unambiguous | Reviewer can summarize it in one sentence |
| Consequences are honest | Reviewer can name at least one named consequence (positive AND negative) |
| Alternatives were considered | Reviewer can identify the rejected options and their rationale |
| Anti-pattern checklist (F only) | Reviewer verifies against `no-attribution` rule |
| Comms plan executed (D only) | Discord/Telegram artifacts linked in ADR |

## 7. Workstream E — Read-Access Audit

Per-provider audit of read access to `$AIWG_ROOT/agentic/code/`:

1. **Scope verification** — agent on each provider attempts to read a known file under `$AIWG_ROOT/agentic/code/` (e.g., a kernel quickref); records SUCCESS or FAILURE with evidence type
2. **Path-traversal-resistance check** — agent attempts to read a file outside `$AIWG_ROOT/agentic/code/` (e.g., `$AIWG_ROOT/src/cli/handlers/use.ts`); records ALLOWED or BLOCKED. ALLOWED is a finding requiring remediation guidance.
3. **Remediation guidance** — for each FAILURE or ALLOWED finding, the audit produces a per-provider config recommendation. Must NOT include copying skills into `.aiwg/` (forbidden per saved memory rule and SAD §2.4).

## 8. Workstream G — Empirical Question Validation

Each of the three empirical questions produces a data point. The "test" is:

| Question | Validity criterion |
|----------|-------------------|
| Where do users run first `aiwg use`? | At least one direction-suggesting data point with documented confidence level (informal poll acceptable) |
| Where do users open AI sessions? | Same as above |
| Do users recognize AIWG engagement? | Same as above |

A NULL outcome (data inconclusive) is acceptable — must be documented with the reason and a proposed follow-up method.

## 9. Voice and Citation Verification

For every baselined study artifact:

- **Voice check** — run `/writing-validator` against artifact; fix any flagged AI-pattern markers before baselining (R-009)
- **Citation check** — verify dual-citation pattern (issue number + provisional REF) for any `research-papers #6XX` reference; fix any mismatch (R-010)

This is a baseline-gate, not a separate test artifact, but the gate decision must be recorded in the artifact's frontmatter or commit message.

## 10. Test Environment

| Environment | Purpose | Owner |
|-------------|---------|-------|
| Local dev | Workstream B unit/integration tests | Workstream B engineer |
| CI (Gitea Actions / GitHub Actions mirror) | Workstream B perf + regression tests; voice + citation validation | CI |
| Per-provider sandbox | Workstream A scripted tests | Study runner |
| Discord/Telegram | Workstream G data collection; Workstream D comms | Comms lead |

## 11. Test Exit Criteria (ABM Gate Inputs)

The ABM gate (separately evaluated in `reports/abm-gate-report.md`) checks the following test-related items:

- [ ] Workstream B test plan documented (this strategy)
- [ ] Cognitive Walkthrough method specified for C and F
- [ ] Matrix audit method specified for A with evidence-type taxonomy
- [ ] ADR review criteria specified for D and F
- [ ] Read-access audit method specified for E
- [ ] Empirical validity criteria specified for G

This strategy provides all six items. The Workstream-level test execution is downstream.

## 12. References

- SAD §5.1.5 (Workstream B test strategy), §5.2.2 (evidence-type taxonomy), §6.3 (voice control)
- All UCs, user stories, NFR register
- ADRs: ADR-NUA-001, ADR-NUA-002
- Research: `research-papers #613` / pending REF-158 (Cognitive Walkthrough Method)
- Existing rules: `.claude/rules/voice-framework.md`, `.claude/rules/citation-policy.md`, `.claude/rules/activity-log.md`
