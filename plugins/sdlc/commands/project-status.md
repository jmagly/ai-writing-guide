---
description: Analyze project state from .aiwg/ artifacts and provide contextual status with recommended next steps
category: sdlc-management
argument-hint: [project-directory=. --interactive --guidance "text"]
allowed-tools: Read, Glob, Grep, Bash
model: sonnet
---

# Project Status

## Task

Analyze `.aiwg/` artifacts to determine project state and provide actionable status report with phase-appropriate next commands.

When invoked with `/project-status [project-directory]`:

1. **Scan** `.aiwg/` directory for artifacts
2. **Detect** current SDLC phase and workflow state
3. **Analyze** completion of phase milestones
4. **Identify** blockers and gaps
5. **Recommend** next commands based on current state

## Parameters

- **`[project-directory]`** (optional): Path to project root (default: current directory `.`)

## Inputs

Scans `.aiwg/` directory for:
- **Intake**: `intake/project-intake.md`, `solution-profile.md`, `option-matrix.md`
- **Planning**: `planning/phase-plan-*.md`, `planning/iteration-plan-*.md`
- **Requirements**: `requirements/*.md`
- **Architecture**: `architecture/SAD.md`, `architecture/ADR-*.md`
- **Risks**: `risks/risk-list.md`
- **Testing**: `testing/test-*.md`
- **Security**: `security/threat-model.md`, `security/security-*.md`
- **Quality**: `quality/code-review-*.md`, `quality/retrospective-*.md`
- **Deployment**: `deployment/deployment-plan.md`
- **Gates**: `gates/gate-*.md`
- **Handoffs**: `handoffs/handoff-*.md`
- **Decisions**: `decisions/change-*.md`
- **Team**: `team/team-profile.yaml`, `team/agent-assignments.md`

## Outputs

**Console output**: Formatted status report with phase detection, milestone progress, blockers, and recommended next steps.

## Workflow

### Step 1: Discover .aiwg/ Structure

```bash
# Check if .aiwg/ exists
ls .aiwg/ 2>/dev/null

# If not found, check for legacy intake/ directory
ls intake/ 2>/dev/null
```

**Decision**:
- If `.aiwg/` exists → proceed with analysis
- If only `intake/` exists → warn about legacy location, proceed with limited analysis
- If neither exists → report "No SDLC artifacts found. Run `/intake-wizard` to start."

### Step 2: Detect Current Phase

**Phase Detection Logic** (priority order):

1. **Pre-Inception** (No intake):
   - Condition: No `.aiwg/intake/` directory OR intake files missing
   - Status: "Project not started"
   - Next: Choose ONE intake method:
     - `/intake-wizard` (interactive generation)
     - `/intake-from-codebase` (analyze existing code)
     - `/intake-start` (enhance user-provided intake files)

2. **Inception** (Intake complete, no phase plan):
   - Condition: Intake files present + NO `planning/phase-plan-inception.md`
   - Status: "Intake complete, ready for Inception"
   - Next: `/flow-concept-to-inception`

3. **Inception Active** (Phase plan exists, not complete):
   - Condition: `planning/phase-plan-inception.md` exists + NO `gates/gate-inception.md` OR gate status ≠ PASSED
   - Status: "Inception phase active"
   - Next: Continue Inception activities, complete gate check

4. **Elaboration** (Inception gate passed, elaboration active):
   - Condition: `gates/gate-inception.md` PASSED + `planning/phase-plan-elaboration.md` exists
   - Status: "Elaboration phase active"
   - Next: Architecture baseline, risk retirement, iteration planning

5. **Construction** (Elaboration gate passed, construction active):
   - Condition: `gates/gate-elaboration.md` PASSED + `planning/iteration-plan-*.csv` exists
   - Status: "Construction phase active (Iteration N)"
   - Next: Feature delivery, testing, iteration assessments

6. **Transition** (Construction complete, deployment prep):
   - Condition: `gates/gate-construction.md` PASSED + `deployment/deployment-plan.md` exists
   - Status: "Transition phase active"
   - Next: Deployment, training, hypercare monitoring

7. **Production** (Deployed):
   - Condition: `deployment/production-deployment-*.md` exists with "Status: Deployed"
   - Status: "In production"
   - Next: Monitoring, incident response, continuous improvement

### Step 3: Analyze Phase Completeness

For detected phase, check milestone artifacts:

#### Inception Milestone Artifacts

**Required**:
- [ ] `intake/project-intake.md` - Project vision and scope
- [ ] `intake/solution-profile.md` - Profile and improvement roadmap
- [ ] `intake/option-matrix.md` - Priorities and framework application
- [ ] `planning/phase-plan-inception.md` - Inception activities
- [ ] `risks/risk-list.md` - Initial risk register
- [ ] `team/agent-assignments.md` - Agent assignments

**Optional but Recommended**:
- [ ] `architecture/ADR-001-*.md` - Initial architecture decisions
- [ ] `requirements/vision.md` - Business case and vision
- [ ] `requirements/business-case.md` - Funding and ROI

**Gate Criteria** (for `gates/gate-inception.md`):
- [ ] Stakeholder agreement on vision, scope, funding
- [ ] Critical use cases identified
- [ ] Initial risk list baselined
- [ ] Architecture direction proposed

#### Elaboration Milestone Artifacts

**Required**:
- [ ] `planning/phase-plan-elaboration.md` - Elaboration activities
- [ ] `architecture/SAD.md` - Software Architecture Document
- [ ] `architecture/executable-prototype.md` - Architectural baseline
- [ ] `requirements/use-case-*.md` - Use case specifications (3+ architecturally significant)
- [ ] `requirements/supplementary-requirements.md` - NFRs
- [ ] `planning/iteration-plan-elaboration.csv` - Iteration plan
- [ ] `risks/risk-list.md` - Updated with retired HIGH risks

**Optional but Recommended**:
- [ ] `architecture/ADR-*.md` - Multiple ADRs (5-10)
- [ ] `testing/test-strategy.md` - Test approach
- [ ] `security/threat-model.md` - Security analysis
- [ ] `deployment/cm-plan.md` - Configuration management
- [ ] `team/development-case.md` - Process tailoring

**Gate Criteria** (for `gates/gate-elaboration.md`):
- [ ] Executable architectural prototype validated
- [ ] Baseline architecture document approved
- [ ] Top 3-5 HIGH risks retired or mitigated
- [ ] Iteration plan for Construction baselined

#### Construction Milestone Artifacts

**Required**:
- [ ] `planning/iteration-plan-*.csv` - Iteration plans (multiple)
- [ ] `quality/iteration-assessment-*.md` - Iteration assessments
- [ ] `testing/test-results-*.md` - Test evidence (unit, integration, E2E)
- [ ] `requirements/use-case-*.md` - All use cases implemented
- [ ] `deployment/integration-build-plan.md` - CI/CD pipeline

**Optional but Recommended**:
- [ ] `quality/code-review-*.md` - Code review reports
- [ ] `testing/test-coverage-report.md` - Coverage metrics
- [ ] `quality/retrospective-*.md` - Sprint retrospectives
- [ ] `architecture/ADR-*.md` - Additional ADRs for design decisions
- [ ] `security/security-review-*.md` - Security validations

**Gate Criteria** (for `gates/gate-construction.md`):
- [ ] Feature set meets acceptance tests
- [ ] Test coverage targets met (60-80%+)
- [ ] Defects triaged (no open HIGH/CRITICAL)
- [ ] Deployment pipeline proven
- [ ] Performance targets validated

#### Transition Milestone Artifacts

**Required**:
- [ ] `deployment/deployment-plan.md` - Rollout plan
- [ ] `deployment/release-notes.md` - User-facing documentation
- [ ] `team/training-pack.md` - Training materials
- [ ] `deployment/support-handover.md` - Support readiness
- [ ] `testing/product-acceptance-plan.md` - Final acceptance tests
- [ ] `deployment/rollback-plan.md` - Rollback procedures

**Optional but Recommended**:
- [ ] `deployment/runbook.md` - Operational procedures
- [ ] `security/security-sign-off.md` - Security approval
- [ ] `quality/orr-checklist.md` - Operational Readiness Review
- [ ] `team/knowledge-transfer-*.md` - Knowledge handoff
- [ ] `deployment/hypercare-plan.md` - Post-launch monitoring

**Gate Criteria** (for `gates/gate-transition.md`):
- [ ] Users trained
- [ ] Release criteria met
- [ ] Support handover accepted
- [ ] Production deployment successful
- [ ] Hypercare monitoring active

### Step 4: Identify Blockers and Gaps

**Critical Blockers** (stop progress):
- Missing required artifacts for current phase
- Failed gate checks (status: FAILED or BLOCKED)
- Open HIGH/CRITICAL risks with no mitigation
- Critical decisions pending resolution
- Test coverage below threshold for profile

**Important Gaps** (slow progress):
- Optional artifacts missing (ADRs, test strategy)
- Moderate risks without mitigation plans
- Incomplete iteration assessments
- Missing retrospectives (learning opportunities)
- Security reviews overdue

**Minor Gaps** (nice to have):
- Documentation gaps (runbooks, training materials)
- Metrics not tracked
- Process improvements not documented

### Step 5: Recommend Next Commands

Based on phase and state, recommend **3-5 most relevant commands**:

#### Pre-Inception → Intake Complete

```markdown
**Recommended Next Steps**:

Choose ONE intake method:

1. **Generate intake interactively** (recommended for new projects):
   - `/intake-wizard "your project description"`
   - Or complete partial intake: `/intake-wizard --complete --interactive`

2. **Generate intake from codebase** (for existing projects):
   - `/intake-from-codebase .`

3. **Enhance user-provided intake files** (if you manually created intake docs):
   - `/intake-start .aiwg/intake/`
```

#### Intake Complete → Inception Active

```markdown
**Recommended Next Steps**:

1. **Begin Concept → Inception flow**:
   - `/flow-concept-to-inception`
   - Natural language: "Start Inception" or "Let's begin Inception phase"

2. **Initiate risk management**:
   - `/flow-risk-management-cycle`

3. **Document architecture decisions** (if not done):
   - Manually create `architecture/ADR-001-<decision>.md`
```

#### Inception Active → Elaboration

```markdown
**Recommended Next Steps**:

1. **Check Inception gate readiness**:
   - `/flow-gate-check inception`

2. **If gate passed, transition to Elaboration**:
   - `/flow-inception-to-elaboration .aiwg/`

3. **Blockers** (if gate not ready):
   - {list missing artifacts}
   - {list open HIGH risks}
   - {list pending decisions}
```

#### Elaboration Active → Construction

```markdown
**Recommended Next Steps**:

1. **Build architectural baseline**:
   - `/build-poc <feature-or-risk>` (for risky architecture)
   - Manually create `architecture/SAD.md` and `architecture/executable-prototype.md`

2. **Evolve architecture**:
   - `/flow-architecture-evolution <trigger>`

3. **Retire risks**:
   - `/flow-risk-management-cycle .aiwg/`

4. **Define test strategy**:
   - `/flow-test-strategy-execution <test-level>`

5. **Check Elaboration gate readiness**:
   - `/flow-gate-check elaboration`

6. **If gate passed, transition to Construction**:
   - `/flow-elaboration-to-construction .aiwg/`
```

#### Construction Active (Iterations)

```markdown
**Recommended Next Steps**:

1. **Run dual-track iteration** (recommended):
   - `/flow-iteration-dual-track <iteration-number>`

2. **Or separate Discovery and Delivery**:
   - `/flow-discovery-track <iteration-number+1>` (plan ahead)
   - `/flow-delivery-track <iteration-number>` (deliver current)

3. **Execute test strategy**:
   - `/flow-test-strategy-execution <test-level> <component>`

4. **Manage evolving requirements**:
   - `/flow-requirements-evolution .aiwg/ --iteration <N>`

5. **Review security**:
   - `/flow-security-review-cycle .aiwg/ --iteration <N>`

6. **Conduct retrospective** (end of iteration):
   - `/flow-retrospective-cycle iteration <iteration-number>`

7. **Check Construction gate readiness** (when feature complete):
   - `/flow-gate-check construction`
```

#### Construction → Transition

```markdown
**Recommended Next Steps**:

1. **Validate Construction gate**:
   - `/flow-gate-check construction`

2. **If gate passed, transition to Transition**:
   - `/flow-construction-to-transition .aiwg/`

3. **Blockers** (if gate not ready):
   - {list failing tests}
   - {list coverage gaps}
   - {list open defects}
```

#### Transition Active → Production

```markdown
**Recommended Next Steps**:

1. **Deploy to production**:
   - `/flow-deploy-to-production <blue-green|canary> <version>`

2. **Validate handoffs**:
   - `/flow-handoff-checklist Construction Transition`

3. **Initiate hypercare monitoring**:
   - `/flow-hypercare-monitoring <duration-days>`

4. **Check Transition gate readiness**:
   - `/flow-gate-check transition`
```

#### Production (Ongoing)

```markdown
**Recommended Next Steps**:

1. **Monitor health**:
   - `/project-health-check`

2. **Respond to incidents** (if issues):
   - `/flow-incident-response <incident-id> <severity>`

3. **Optimize performance** (if degradation):
   - `/flow-performance-optimization <trigger> <component>`

4. **Validate compliance** (periodic):
   - `/flow-compliance-validation <framework>`

5. **Onboard new team members** (if team growing):
   - `/flow-team-onboarding <name> <role>`

6. **Conduct retrospective** (periodic):
   - `/flow-retrospective-cycle release <version>`
```

### Step 6: Generate Status Report

**Output Format**:

```markdown
# Project Status Report

**Generated**: {current date and time}
**Project**: {from intake/project-intake.md metadata, or "Unknown"}
**Profile**: {from intake/solution-profile.md, or "Not Set"}
**Priority**: {from intake/option-matrix.md Step 3 top weight, or "Not Set"}

---

## Current Phase

**Phase**: {Pre-Inception | Inception | Elaboration | Construction | Transition | Production}
**Status**: {Not Started | Active | Blocked | Complete}
**Duration**: {calculated from phase-plan dates, if available}

{Brief description of phase focus}

---

## Milestone Progress

### {Current Phase} Milestone

**Required Artifacts**: {X/Y complete}
- [x] {completed artifact 1}
- [x] {completed artifact 2}
- [ ] {missing artifact 1} ← **REQUIRED**
- [ ] {missing artifact 2} ← **REQUIRED**

**Optional Artifacts**: {X/Y complete}
- [x] {completed optional 1}
- [ ] {missing optional 1}

**Gate Criteria**: {X/Y met}
- [x] {met criterion 1}
- [ ] {unmet criterion 1} ← **BLOCKER**

---

## Risks and Blockers

### Critical Blockers (Stop Progress)
{If none: "✅ No critical blockers"}

1. **{Blocker 1}**
   - Impact: {description}
   - Resolution: {recommended action}
   - Owner: {agent or team member}

2. **{Blocker 2}**
   - Impact: {description}
   - Resolution: {recommended action}
   - Owner: {agent or team member}

### Important Gaps (Slow Progress)
{If none: "✅ No important gaps"}

- {Gap 1}: {description and recommendation}
- {Gap 2}: {description and recommendation}

### Active Risks
{Read from risks/risk-list.md, show top 3-5 HIGH/MEDIUM risks}

**Risk #{n}**: {risk name}
- Status: {Identified | Mitigating | Monitoring}
- Impact: {HIGH | MEDIUM}
- Mitigation: {summary of strategies}

---

## Team and Velocity

**Team Size**: {from intake/project-intake.md or team/team-profile.yaml}
**Current Iteration**: {from planning/iteration-plan-*.csv, if in Construction}
**Active Agents**: {from team/agent-assignments.md, if exists}

{If iteration data available:}
**Velocity**: {completed story points / planned story points}
**Test Coverage**: {from testing/test-coverage-report.md, if exists}
**Open Defects**: {from quality/ or testing/, if tracked}

---

## Recommended Next Steps

{Based on phase and state, show 3-5 most relevant commands}

### Immediate Actions

1. **{Command 1}**
   ```bash
   /{command-name} {args}
   ```
   {Why: brief explanation}

2. **{Command 2}**
   ```bash
   /{command-name} {args}
   ```
   {Why: brief explanation}

### Follow-Up Actions

3. **{Command 3}**
   ```bash
   /{command-name} {args}
   ```
   {Why: brief explanation}

4. **{Command 4}**
   ```bash
   /{command-name} {args}
   ```
   {Why: brief explanation}

---

## Quick Reference

**All Available Commands**:

**Intake Methods** (choose ONE):
- `/intake-wizard` - Generate intake interactively
- `/intake-from-codebase` - Generate intake by analyzing codebase
- `/intake-start` - Enhance user-provided intake files

**Phase Workflows**:
- `/flow-concept-to-inception` - Execute Inception phase
- `/flow-inception-to-elaboration` - Transition to Elaboration
- `/flow-elaboration-to-construction` - Transition to Construction
- `/flow-construction-to-transition` - Transition to Transition
- `/flow-iteration-dual-track` - Run Discovery + Delivery iteration
- `/flow-gate-check <phase>` - Validate phase gate criteria
- `/flow-risk-management-cycle` - Manage project risks
- `/flow-test-strategy-execution` - Execute test strategy
- `/flow-security-review-cycle` - Security validation
- `/flow-architecture-evolution` - Evolve architecture
- `/flow-deploy-to-production` - Deploy to production
- `/flow-hypercare-monitoring` - Post-launch monitoring
- `/project-health-check` - Overall project health
- `/project-status` - This report (refresh status)

For complete command list, see `.claude/commands/` directory.

---

**Natural Language Support**: You can use natural language instead of slash commands:
- Instead of `/project-status`, say "Where are we?" or "What's next?"
- Instead of `/flow-inception-to-elaboration`, say "Transition to Elaboration" or "Start Elaboration"
- See `.aiwg/docs/simple-language-translations.md` for complete translation table

**Tip**: Run `/project-status` (or say "Where are we?") anytime to refresh this report and see updated recommendations.
```

## Phase Progression Reference

**Master Workflow** (happy path):

```
Pre-Inception
    ↓
  Choose ONE intake method:
  - intake-wizard (interactive)
  - intake-from-codebase (analyze code)
  - intake-start (enhance user files)
    ↓
Intake Complete
    ↓
  flow-concept-to-inception
    ↓
Inception (Active)
    ↓
  [Architecture decisions, risk management, team alignment]
    ↓
  flow-gate-check inception → PASSED
    ↓
  flow-inception-to-elaboration
    ↓
Elaboration (Active)
    ↓
  [Architectural baseline, risk retirement, use case elaboration]
  build-poc (if needed)
  flow-architecture-evolution
  flow-risk-management-cycle
    ↓
  flow-gate-check elaboration → PASSED
    ↓
  flow-elaboration-to-construction
    ↓
Construction (Active)
    ↓
  [Iterative development]
  flow-iteration-dual-track (repeated)
  OR flow-discovery-track + flow-delivery-track
  flow-test-strategy-execution
  flow-requirements-evolution
  flow-security-review-cycle
  flow-retrospective-cycle
    ↓
  flow-gate-check construction → PASSED
    ↓
  flow-construction-to-transition
    ↓
Transition (Active)
    ↓
  [Deployment preparation]
  flow-handoff-checklist
  flow-deploy-to-production
  flow-hypercare-monitoring
    ↓
  flow-gate-check transition → PASSED
    ↓
Production
    ↓
  [Ongoing operations]
  project-health-check
  flow-incident-response (as needed)
  flow-performance-optimization (as needed)
  flow-compliance-validation (periodic)
  flow-retrospective-cycle (periodic)
```

**Continuous Flows** (run throughout lifecycle):
- `flow-risk-management-cycle` - Ongoing risk tracking
- `flow-requirements-evolution` - Living requirements management
- `flow-architecture-evolution` - Architecture refinement
- `flow-security-review-cycle` - Security validation
- `flow-change-control` - Change management
- `flow-retrospective-cycle` - Continuous improvement

**Ad-Hoc Flows** (trigger-based):
- `flow-team-onboarding` - When new team members join
- `flow-knowledge-transfer` - When expertise handoff needed
- `flow-cross-team-sync` - When coordination needed
- `flow-incident-response` - When production issues occur
- `flow-performance-optimization` - When performance degrades
- `flow-compliance-validation` - When compliance audit required
- `build-poc` - When technical risk needs validation

## Error Handling

### No .aiwg/ Directory

```markdown
# Project Status Report

**Status**: ❌ No SDLC artifacts found

The `.aiwg/` directory does not exist in this project.

**Recommended Next Steps**:

1. **Start a new SDLC project**:
   ```bash
   /intake-wizard "your project description"
   ```

2. **Analyze existing codebase**:
   ```bash
   /intake-from-codebase .
   ```

3. **Learn more**:
   - See SDLC framework documentation: `agentic/code/frameworks/sdlc-complete/README.md`
   - See phase workflows: `agentic/code/frameworks/sdlc-complete/plan-act-sdlc.md`
```

### Corrupted or Incomplete Artifacts

If artifacts exist but are malformed:
- **WARN**: "Found {artifact} but could not parse. May be incomplete or corrupted."
- **Recommendation**: "Review {artifact} manually or regenerate using {command}."

### Conflicting State

If artifacts indicate conflicting states (e.g., Elaboration gate PASSED but no Construction artifacts):
- **WARN**: "Conflicting state detected. Gate passed but next phase not started."
- **Recommendation**: "Run `/flow-{phase}-to-{next-phase}` to transition."

## Best Practices

1. **Run frequently**: Use `/project-status` at start of each work session to orient
2. **After major milestones**: Check status after completing gate checks or phase transitions
3. **When stuck**: If unsure what to do next, check status for recommendations
4. **Team coordination**: Share status report with team to align on current state
5. **Progress tracking**: Compare status reports over time to measure velocity

## Success Criteria

This command succeeds when:
- [ ] `.aiwg/` directory scanned successfully
- [ ] Current phase detected accurately
- [ ] Milestone progress calculated
- [ ] Blockers identified (if any)
- [ ] Next steps recommended (3-5 relevant commands)
- [ ] Status report formatted and output to console
