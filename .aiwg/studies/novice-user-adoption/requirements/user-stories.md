---
artifact_type: user_stories
study: novice-user-adoption
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# User Stories: AIWG Novice-User Adoption Study

User stories are scoped to the study's deliverables: the tactical implementation (Workstream B), the design docs (C, D, F), the field audits (A, E), and the empirical questions (G). Stories are 2-week-iteration sized where they map to implementation; design and audit stories may span longer.

## Tactical implementation (Workstream B)

### US-NUA-B-01 — Project-isolation warning fires on $HOME

**As a** novice user running `aiwg use sdlc` for the first time
**I want to** receive a clear warning when I run it in `$HOME` or a non-project directory
**So that** I understand AIWG should typically be scoped to a project root

**Acceptance criteria:**
- [ ] Warning fires when `cwd` is `$HOME`, `/`, `/tmp`, or has no project signals
- [ ] Warning includes which directory AIWG would deploy to
- [ ] Warning includes a 3-second delay during which the user can Ctrl-C
- [ ] Warning text matches the wording in UC-NUA-002

**Maps to:** UC-NUA-002, Workstream B

### US-NUA-B-02 — Warning suppressible for intentional global install

**As an** advanced user who intentionally wants global install
**I want to** suppress the project-isolation warning
**So that** my scripted setup is not interrupted

**Acceptance criteria:**
- [ ] `AIWG_GLOBAL_INSTALL=1` (or equivalent) suppresses the warning
- [ ] Suppressed warning still emits an informational line (one-line, no delay)
- [ ] The opt-in mechanism is documented in CLI reference

**Maps to:** UC-NUA-002 (alternative flow A1), Workstream B

### US-NUA-B-03 — Project-signal detection logic

**As an** AIWG developer
**I want to** detect project-signal files reliably across language ecosystems
**So that** the warning only fires when truly outside a project

**Acceptance criteria:**
- [ ] Detection checks: `.git/`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `Gemfile`, `build.gradle`, `*.csproj`
- [ ] Detection walks up to 3 parent directories before declaring "no project"
- [ ] Detection unit-tested for each signal type and for `$HOME` / `/` / `/tmp`

**Maps to:** UC-NUA-002, Workstream B

## Design documents (Workstreams C, D, F)

### US-NUA-C-01 — Wizard flow surveyed against agentic-tool patterns

**As a** Workstream C lead
**I want to** survey wizard patterns in Cursor, Continue, Claude Desktop, and similar agentic tools
**So that** the AIWG wizard design builds on validated patterns

**Acceptance criteria:**
- [ ] At least 4 agentic-tool wizards surveyed
- [ ] Survey output identifies common patterns and AIWG-specific gaps
- [ ] Survey published to `.aiwg/studies/novice-user-adoption/working/wizard-survey.md`

**Maps to:** UC-NUA-003, Workstream C

### US-NUA-C-02 — Wizard design doc baselined

**As a** Workstream C lead
**I want to** produce a baselined wizard design doc evaluated by Cognitive Walkthrough
**So that** implementation can proceed in a separate epic with high confidence

**Acceptance criteria:**
- [ ] Design doc covers all UC-NUA-003 acceptance criteria
- [ ] Cognitive Walkthrough record exists with ≤2 friction points per step in the final design
- [ ] Design doc identifies invocation pattern: `aiwg wizard`, `aiwg new --interactive`, or `aiwg use --wizard`

**Maps to:** UC-NUA-003, Workstream C

### US-NUA-D-01 — Global install ADR baselined

**As a** Workstream D lead
**I want to** produce a baselined ADR on global-install status (first-class vs. escape-hatch)
**So that** documentation and code can align on the chosen path

**Acceptance criteria:**
- [ ] ADR follows the AIWG ADR template
- [ ] ADR documents both options with tradeoffs, references REF-720 for context-bleed evidence
- [ ] ADR includes a one-CalVer-cycle continued-support guarantee for the non-chosen path
- [ ] Discord/Telegram comms plan executed before ADR merges

**Maps to:** UC-NUA-004, Workstream D

### US-NUA-F-01 — Engagement-surface design doc baselined

**As a** Workstream F lead
**I want to** produce a baselined design doc on how to surface AIWG engagement
**So that** trust calibration is enabled without branding pollution

**Acceptance criteria:**
- [ ] Design doc references REF-948 (Co-Audit) and REF-950 (Lee & See)
- [ ] Design doc explicitly forbids AIWG attribution in user content (commits, code comments, generated artifacts)
- [ ] Design doc proposes on-demand probe as default, opt-in footer as alternative, no-surface as opt-out
- [ ] Cognitive Walkthrough confirms users distinguish "engaged" from "intrusive"

**Maps to:** UC-NUA-006, Workstream F

## Field audits (Workstreams A, E)

### US-NUA-A-01 — Per-platform hookup matrix produced

**As a** Workstream A lead
**I want to** field-validate hookup on each of the 10 providers
**So that** the project owner has evidence-based answers rather than static-audit speculation

**Acceptance criteria:**
- [ ] Matrix covers all 10 providers
- [ ] At least 8 providers have field-validated evidence
- [ ] No cell uses "static analysis" as sole evidence
- [ ] Discovery-agent hook has dedicated column
- [ ] Follow-up issues filed for each "no hook fires" finding

**Maps to:** UC-NUA-005, UC-NUA-007, Workstream A

### US-NUA-E-01 — Provider read-access to $AIWG_ROOT verified

**As a** Workstream E lead
**I want to** verify each provider's deployed config grants the agent read access to `$AIWG_ROOT`
**So that** `aiwg show` outputs are followable by the agent

**Acceptance criteria:**
- [ ] Per-provider configuration audit completes
- [ ] Audit produces remediation guidance for any provider where read-access is missing or insufficient
- [ ] Remediation does not include copying skills into `.aiwg/` (forbidden per saved memory rule)

**Maps to:** UC-NUA-005, Workstream E

## Empirical questions (Workstream G)

### US-NUA-G-01 — Where do users run first `aiwg use`?

**As a** Workstream G lead
**I want to** collect at least one directional data point on where novice users run their first `aiwg use`
**So that** Workstream B prioritization is grounded in usage data

**Acceptance criteria:**
- [ ] Discord/Telegram poll OR opt-in telemetry collected
- [ ] At least one direction-suggesting data point obtained (informal acceptable)
- [ ] Result documented with confidence level

**Maps to:** UC-NUA-001, UC-NUA-002, Workstream G

### US-NUA-G-02 — Where do users open AI sessions?

**As a** Workstream G lead
**I want to** collect a data point on whether users open sessions at project root or in subdirectories
**So that** rule-file scanning behavior can be assessed correctly

**Acceptance criteria:**
- [ ] Data point collected via poll or qualitative interview
- [ ] Documented with confidence level

**Maps to:** UC-NUA-005, Workstream G

### US-NUA-G-03 — Do users recognize the AIWG moment?

**As a** Workstream G lead
**I want to** collect a data point on whether users can identify when AIWG is engaged
**So that** Workstream F design choices are validated against actual user perception

**Acceptance criteria:**
- [ ] Data point collected via post-interaction questionnaire or qualitative interview
- [ ] Documented with confidence level

**Maps to:** UC-NUA-006, Workstream G

## References

- All use cases: `.aiwg/studies/novice-user-adoption/requirements/UC-NUA-*.md`
- Intake form, solution profile, risk screening
