# Flow, Gate, and SDLC Accelerate

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

AIWG has three layers for managing how a software project moves through its lifecycle. Understanding how they fit together changes how you work with the framework.

---

## The three layers

**Intake** — defines what you're building and why. All project context lives here.

**Flow commands** — orchestrate phase work. Each flow coordinates multiple agents to produce the artifacts for a phase, runs them in parallel where possible, and synthesizes the results.

**Gate commands** — validate phase completion. Before you move forward, the gate checks that what was supposed to happen actually happened.

**sdlc-accelerate** — the meta command that runs the entire pipeline. It calls intake, flows, and gates in sequence so you don't have to orchestrate manually.

---

## Intake: the foundation

Everything starts with intake. It's not paperwork — it's the project's working memory. Every subsequent command reads from it.

### Starting from an idea

```
/intake-wizard "A task management API for small teams with Slack integration"
```

The intake wizard generates three documents:

- **project-intake.md** — Problem statement, goals, constraints, stakeholders, initial risks
- **solution-profile.md** — Technical approach, architecture direction, build vs. buy decisions, compliance requirements
- **option-matrix.md** — Alternative approaches with trade-off analysis

With `--interactive`, it asks up to 10 clarifying questions before generating these. Without it, it infers from what you gave it and fills gaps with best-practice defaults.

### Starting from an existing codebase

```
/intake-from-codebase . --interactive
```

When you already have code, intake-from-codebase reverse-engineers the project context. It scans:

- Code structure and architecture patterns
- Dependencies and their implied constraints
- Infrastructure configuration
- Existing tests and what they cover
- README and any existing documentation

It produces the same three intake documents, but populated from evidence rather than description. Use `--guidance` to focus the analysis:

```
/intake-from-codebase . --guidance "We're preparing for a SOC2 audit, focus on security controls and data handling"
```

### What intake enables

Once intake exists, the entire AIWG system has context. Agents know:

- What the system does and why
- Who the stakeholders are
- What the risk profile looks like
- What compliance requirements apply
- What constraints bound the solution

Without intake, agents answer in the abstract. With intake, they answer for your specific project.

---

## Flow commands: doing phase work

Flow commands orchestrate multi-agent workflows for each phase and each continuous activity. They're not scripts — they're orchestration templates that coordinate agents, assign roles, run reviews in parallel, and synthesize output.

### Phase transition flows

These are run once, at the transition between phases:

```bash
/flow-concept-to-inception          # Kick off Inception from intake
/flow-inception-to-elaboration      # Move into Elaboration
/flow-elaboration-to-construction   # Move into Construction
/flow-construction-to-transition    # Move into Transition
/flow-deploy-to-production          # Production deployment
```

Each one generates the artifacts for its phase. For example, `/flow-inception-to-elaboration` produces:

- Software Architecture Document (SAD) — primary author plus parallel review from security, test, and requirements perspectives
- Architecture Decision Records (3–5 ADRs) — key decisions documented with context, options considered, and rationale
- Master Test Plan — test strategy, coverage targets, automation approach
- Elaboration Phase Plan — what happens in Elaboration, with scope and milestone definition

### Continuous activity flows

These run throughout the lifecycle, not just at transitions:

```bash
/flow-security-review-cycle         # Security audit and threat modeling
/flow-risk-management-cycle         # Risk identification and mitigation updates
/flow-requirements-evolution        # Living requirements refinement
/flow-architecture-evolution        # Architecture change management
/flow-test-strategy-execution       # Test suite execution and validation
/flow-performance-optimization      # Performance baseline and optimization
/flow-retrospective-cycle           # Retrospective facilitation
```

Run these when relevant, not on a rigid schedule. If you're about to change the authentication model, run `/flow-security-review-cycle` first. If performance is degrading, run `/flow-performance-optimization`. They're tools, not ceremonies.

### How flows orchestrate agents

Every flow follows the same pattern internally:

```
Primary Author → Parallel Reviewers → Synthesizer → Archive
```

For a document like the SAD:
1. The `architecture-designer` agent creates the initial draft
2. Simultaneously: `security-architect`, `test-architect`, `requirements-analyst`, and `technical-writer` each review it from their perspective
3. The `documentation-synthesizer` merges all feedback into the final document
4. The result is saved to `.aiwg/architecture/`

You don't manage this sequence — the flow command does. You just see progress indicators and the final output.

### Guidance and interactive mode

Every flow command accepts `--guidance` and `--interactive`:

```bash
/flow-security-review-cycle --guidance "HIPAA compliance is the primary concern, focus on PHI data flows"

/flow-inception-to-elaboration --interactive
```

`--guidance` shapes what the agents focus on without requiring a conversation. Give it upfront — it's more effective than redirecting agents after they've already drafted something.

`--interactive` triggers strategic questions before the flow executes. The orchestrator asks 3–5 questions about your priorities, constraints, and concerns, then uses those answers to tailor the entire run.

---

## Gate commands: validating phase completion

Gates are validation checkpoints. Before you advance to the next phase, the gate verifies that the criteria for the current phase are actually met — not approximately, but specifically.

### Running a gate check

```bash
/flow-gate-check inception          # Lifecycle Objective Milestone (LOM)
/flow-gate-check elaboration        # Architecture Baseline Milestone (ABM)
/flow-gate-check construction       # Initial Operational Capability (IOC)
/flow-gate-check transition         # Product Release (PR)
```

Or in natural language:

```
Can we transition to Elaboration?
Are we ready for production?
Check gate criteria for Construction
```

### What gets checked

Each phase gate verifies specific criteria:

**Inception (LOM):**
- Vision document exists and has stakeholder approval
- Business case documented and funded
- Risk list baselined (minimum 5 risks, top 3 have mitigation plans)
- Data classification complete
- Executive sponsor approval obtained

**Elaboration (ABM):**
- Software Architecture Document baselined and peer-reviewed
- 3–5 ADRs documenting major decisions
- 70%+ of identified risks retired or mitigated
- Requirements baseline established
- Master Test Plan approved
- Development case tailored

**Construction (IOC):**
- All use cases implemented
- Unit test coverage ≥ 80%
- Integration tests 100% passing
- No High or Critical vulnerabilities unmitigated
- Performance within SLOs
- Release notes complete
- Runbooks documented

**Transition (PR):**
- Operational Readiness Review complete
- Production deployment validated
- User acceptance testing complete
- Support team trained
- Monitoring and alerting configured
- Rollback procedures validated and tested

### Gate results

Gates return one of three results:

**PASS — GO**: Proceed to the next phase. The orchestrator tells you what comes next.

**CONDITIONAL — GO with conditions**: Most criteria met, but specific gaps remain. The gate tells you exactly what's missing and gives you three options:
1. Address the gap now (often the gate can generate the missing artifact automatically)
2. Proceed with a documented waiver
3. Abort and fix first

**FAIL — NO-GO**: Critical criteria not met. The gate provides a prioritized remediation plan — specific actions, suggested owners, and effort estimates.

### Workflow gates

Gates aren't just for phase milestones. You can validate specific concerns at any time:

```bash
/flow-gate-check security           # No High/Critical vulnerabilities
/flow-gate-check test-coverage      # Coverage thresholds met
/flow-gate-check documentation      # All user-facing docs complete
/flow-gate-check traceability       # Requirements → code → tests verified
/flow-gate-check reliability        # SLOs met
/flow-gate-check pre-deploy         # All pre-deployment gates combined
```

These are the same gates that CI runs — use them before committing to catch issues early.

---

## sdlc-accelerate: the full pipeline

`/sdlc-accelerate` runs the entire pipeline from idea to construction-ready in a single command. It chains intake → LOM gate → Inception-to-Elaboration flow → ABM gate → Elaboration-to-Construction flow, asking focused questions at each gate instead of requiring manual orchestration.

### From an idea

```
/sdlc-accelerate "A task management API for small teams with Slack integration"
```

The pipeline:

1. **Intake** — runs intake-wizard, generates all intake documents, presents a summary for confirmation
2. **LOM gate** — validates Inception readiness. If PASS, continues. If CONDITIONAL, asks 2–3 focused questions about the gap.
3. **Inception → Elaboration flow** — generates SAD, ADRs, Master Test Plan, Elaboration Phase Plan
4. **ABM gate** — validates Elaboration readiness. Same focused question pattern.
5. **Elaboration → Construction flow** — Construction planning, iteration structure, sprint setup
6. **Construction Ready Brief** — final deliverable summarizing everything produced and what to do next

You get the same output as running each command manually. The difference is you answer focused gate questions instead of manually checking and re-running commands.

### From an existing codebase

```
/sdlc-accelerate --from-codebase . --guidance "Preparing for SOC2 audit"
```

Starts with `intake-from-codebase` instead of the intake wizard. Everything else is the same.

### Resume an interrupted pipeline

```
/sdlc-accelerate --resume
```

Detects where the pipeline stopped (via `.aiwg/` artifacts) and picks up from the next incomplete phase. If Inception artifacts exist but Elaboration doesn't, it starts from the ABM gate.

### Auto mode

```
/sdlc-accelerate "description" --auto
```

Auto-proceeds on CONDITIONAL gates without asking questions. Waiver is documented automatically. Use for quick experimentation or when you're comfortable with the defaults.

### Preview without executing

```
/sdlc-accelerate "description" --dry-run
```

Shows the full pipeline plan — which phases will run, what artifacts will be generated, which gates will be checked — without executing anything.

### Jump to a specific phase

```
/sdlc-accelerate --skip-to elaboration
```

Validates that prerequisite artifacts exist, then starts from the specified phase. Useful when you've done earlier phases manually and want the accelerator to handle the rest.

---

## How they connect in practice

A typical project flow:

```
/intake-wizard "description"
  ↓
project-intake.md, solution-profile.md, option-matrix.md created

/flow-concept-to-inception
  ↓
Inception artifacts generated, phase starts

(work happens)

/flow-gate-check inception
  ↓
LOM criteria verified, gaps identified

/flow-inception-to-elaboration
  ↓
SAD, ADRs, test plan generated

(architecture work happens)

/flow-gate-check elaboration
  ↓
ABM verified, architecture baselined

/flow-elaboration-to-construction
  ↓
Construction ready, iterations planned
```

Or the same thing with sdlc-accelerate:

```
/sdlc-accelerate "description"
  ↓
All of the above, automatically
```

---

## The `.aiwg/` directory as living context

Every flow and gate writes artifacts to `.aiwg/`. This directory is the project's memory — not just documentation but the actual working context that every subsequent session reads.

When you run `/flow-gate-check elaboration`, it reads from `.aiwg/architecture/software-architecture-doc.md`, `.aiwg/requirements/`, `.aiwg/risks/`, and the gate criteria. It doesn't ask you to explain what was decided — it reads what was recorded.

This is why committing `.aiwg/` to git matters. Any session, by any teammate, on any machine, starts with full project context. A new engineer can open the project and ask:

```
What architecture decisions have been made and why?
```

The answer is already there.

---

## Quick reference

| Task | Command |
|------|---------|
| Start from idea | `/intake-wizard "description"` |
| Start from existing code | `/intake-from-codebase .` |
| Full pipeline, hands-off | `/sdlc-accelerate "description"` |
| Resume interrupted pipeline | `/sdlc-accelerate --resume` |
| Kick off Inception | `/flow-concept-to-inception` |
| Advance to Elaboration | `/flow-inception-to-elaboration` |
| Advance to Construction | `/flow-elaboration-to-construction` |
| Check current phase gate | `/flow-gate-check <phase>` |
| Security gate only | `/flow-gate-check security` |
| Pre-deploy checklist | `/flow-gate-check pre-deploy` |
| Where are we? | `/project-status` |
| Can we move forward? | `Can we transition to Elaboration?` |
