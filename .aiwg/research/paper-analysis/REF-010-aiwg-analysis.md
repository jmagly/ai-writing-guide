# REF-010 AIWG Analysis: Stage-Gate Systems

> **Source Paper**: [Stage-Gate Systems: A New Tool for Managing New Products](../../../docs/references/REF-010-stage-gate-systems.md)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Author**: Cooper, R. G. (1990)
> **Venue**: Business Horizons, 33(3), 44-54

## Direct Implementation: SDLC Phase Gates

AIWG's Software Development Lifecycle is a **direct Stage-Gate implementation**:

| Cooper Stage-Gate | AIWG SDLC Phase | Gate Checkpoint | Key Deliverables |
|-------------------|-----------------|-----------------|------------------|
| **Stage 0: Discovery** | Intake | n/a | Intake Form, Solution Profile |
| **Gate 1: Initial Screen** | → | **Lifecycle Objective (LO)** | Feasibility confirmed |
| **Stage 1: Scoping** | Inception | Vision, preliminary scope | Vision Doc, Use Cases, Risk Register |
| **Gate 2: Second Screen** | → | **Lifecycle Architecture (LA)** | Architecture baselined |
| **Stage 2: Build Business Case** | Elaboration | Architecture, feasibility | SAD, ADRs, Test Strategy, NFRs |
| **Gate 3: Go to Development** | → | **Initial Operational Capability (IOC)** | System ready for release |
| **Stage 3: Development** | Construction | Implementation, testing | Code, Unit Tests, Integration Tests |
| **Gate 4: Go to Testing** | → | **Product Release (PR)** | Production-ready |
| **Stage 4: Testing/Validation** | Transition | Deployment, validation | Deployment Plan, Monitoring |
| **Gate 5: Go to Launch** | → | **Production Handoff** | Operational |
| **Stage 5: Launch** | Production | Operations, support | Runbooks, Incident Response |

**Location**:
- Phase definitions: `agentic/code/frameworks/sdlc-complete/docs/phases/`
- Gate checklists: `.aiwg/planning/gate-checklists/`

## Gate Criteria Implementation

AIWG implements Cooper's gate criteria structure with explicit deliverables, criteria, and outputs.

### Example: Lifecycle Architecture (LA) Gate

```markdown
# Gate: Elaboration → Construction (LA Gate)

## Mandatory Criteria (Must-Meet)
- [ ] Software Architecture Document (SAD) baselined
- [ ] 3-5 Architecture Decision Records (ADRs) approved
- [ ] Master Test Plan defined with coverage targets
- [ ] Risk register updated with mitigation strategies
- [ ] NFR modules completed (Security, Performance, Reliability)

## Desirable Criteria (Should-Meet)
- [ ] Prototype or proof-of-concept validated
- [ ] Key technical risks retired
- [ ] Development environment configured
- [ ] CI/CD pipeline outlined

## Gatekeepers (Multi-Agent Review)
- **Architecture Designer**: Technical soundness, scalability
- **Security Auditor**: Security requirements, threat model
- **Test Engineer**: Testability, coverage strategy
- **Project Manager**: Schedule feasibility, resource allocation
- **Product Owner**: Business value alignment

## Decision Options
- **GO**: All mandatory criteria met, proceed to Construction
- **HOLD**: Minor gaps, 1-2 week remediation, re-gate
- **RECYCLE**: Significant issues, return to Elaboration with feedback
- **KILL**: Project not viable (technical, business, or resource constraints)
```

**Cooper's Structure** (p. 48-49):
1. Deliverables (what to present)
2. Criteria (how to judge)
3. Outputs (go/kill/hold/recycle)

**AIWG Direct Mapping**: Mandatory/Desirable Criteria + Gatekeepers + Decision Options

**Location**: `.aiwg/planning/gate-checklists/gate-la.md`

## Parallel Processing Within Phases

Cooper's "third-generation" Stage-Gate allows concurrent activities within stages (p. 50). AIWG implements this:

### Elaboration Phase - Concurrent Activities

| Agent | Activity | Output |
|-------|----------|--------|
| Architecture Designer | Architecture design | SAD, diagrams |
| Security Auditor | Security threat modeling | Threat models, security NFRs |
| Test Engineer | Test strategy development | Master Test Plan |
| Requirements Analyst | NFR definition | NFR modules |
| Risk Manager | Risk identification | Risk register |

**All activities run in parallel**, converging at LA gate.

### Construction Phase - Concurrent Activities

| Agent | Activity | Output |
|-------|----------|--------|
| Feature Developer (×N) | Feature development | Code, unit tests |
| Test Engineer | Test creation | Integration tests, test suites |
| Code Reviewer | Code review | Approval, feedback |
| Security Auditor | Security scanning | Vulnerability reports |
| Technical Writer | Documentation | API docs, user guides |

**Pattern**: Multi-agent parallelism within phase → serial gate checkpoints between phases.

**Location**: Phase plans in `.aiwg/planning/phase-plan-*.md`

## Cross-Functional Gatekeepers = Multi-Agent Reviews

Cooper's cross-functional gatekeeper teams (p. 49) map directly to AIWG's multi-agent gate reviews:

| Business Function | AIWG Agent | Gate Responsibility |
|------------------|------------|---------------------|
| **Product Management** | Product Owner | Business value, user needs |
| **Engineering** | Architecture Designer | Technical feasibility |
| **Quality** | Test Engineer | Testability, quality assurance |
| **Security** | Security Auditor | Security requirements |
| **Operations** | DevOps Engineer | Deployability, operability |
| **Project Management** | Project Manager | Schedule, resources |

**Cooper's Principle** (p. 49): "A single functional perspective is not enough. Gates demand an integrated, holistic view."

**AIWG Implementation**: Each gate requires **unanimous approval** from relevant agents—no single functional perspective can override concerns.

**Location**:
- Agent manifests: `agentic/code/frameworks/sdlc-complete/agents/`
- Gate definitions: `.aiwg/planning/gate-checklists/`

## Quality of Execution Enforcement

Cooper's #1 success factor—quality of execution (p. 47)—is enforced through multiple mechanisms:

### 1. Template-First Approach

**Cooper's Finding**: Winners spent 3× more on preliminary market assessment than failures.

**AIWG Implementation**: Every deliverable has a template:
- Use Case Template → ensures complete requirements analysis
- SAD Template → ensures comprehensive architecture
- Test Plan Template → ensures thorough test strategy

**Mechanism**: Templates eliminate "cursory execution" by enforcing structure.

**Location**: `agentic/code/frameworks/sdlc-complete/templates/`

**Related**: REF-006 (Cognitive Load Theory) - Worked example effect

### 2. Agent Tools Enforce Quality

**Cooper's Problem**: Poor execution quality (Figure 2, p. 47 - scores of 3.0-4.0 for failures vs 6.5-7.0 for successes).

**AIWG Solution**: Agents have specialized tools that enforce thoroughness:
- `architecture-designer-agent.md` has tools: `diagram-tool`, `adr-generator`
- `test-engineer-agent.md` has tools: `coverage-analyzer`, `test-generator`
- `security-auditor-agent.md` has tools: `threat-modeler`, `vulnerability-scanner`

**Mechanism**: Agents cannot approve gates without using quality tools.

**Location**: Agent definitions with embedded tool lists

### 3. Artifact Validation

**Cooper's Gate Function**: "Quality-control checkpoints" (p. 48).

**AIWG Validation Checks**:
- Completeness: All template sections filled
- Traceability: Cross-references verified (@-mentions valid)
- Testability: Acceptance criteria defined and measurable
- Consistency: No conflicting requirements/architectural decisions

**Mechanism**: Automated validation prevents incomplete deliverables.

**Location**: Validation logic in MCP server, Ralph loops

## Preventing Poor Execution (Cooper's Core Problem)

Cooper found 63% of managers disappointed with success rates due to poor execution (p. 47). AIWG addresses each failure mode:

| Cooper's Problem | AIWG Solution | Implementation |
|-----------------|---------------|----------------|
| **"Skipping steps"** | Gates block progression without deliverables | Phase transition commands check gate criteria |
| **"Cursory execution"** | Templates + agent tools enforce thoroughness | Template validation, tool usage requirements |
| **"Single-function perspective"** | Multi-agent reviews required | Gate checklists specify multiple approvers |
| **"No go/kill discipline"** | Explicit gate criteria, decision tracking | Gate decision logs, rationale required |
| **"Poor upfront homework"** | Inception/Elaboration cannot be skipped | Phase ordering enforced, no jumping ahead |

**Location**:
- Phase transition commands: `.claude/commands/flow-*-to-*.md`
- Validation: Ralph loop completion criteria

## Key Experimental Evidence Applied to AIWG

### 1. Quality of Execution Is #1 Success Factor

**Cooper's Finding**: "The number one success factor is quality of execution of key activities—doing the activities and doing them well" (p. 47).

**AIWG Implementation**: Every quality enforcement mechanism (templates, tools, validation) directly addresses this finding.

**Validation Opportunity**: Measure correlation between:
- Template completeness → artifact quality
- Gate approval rate → project success
- Agent tool usage → deliverable thoroughness

### 2. 3× Spending on Preliminary Investigation

**Cooper's Data**: Successful products spent 3× more on preliminary market assessment (Stage 1).

**AIWG Parallel**: Inception phase should not be rushed:
- Vision document requires thorough analysis
- Use case exploration comprehensive
- Risk identification exhaustive

**Design Decision**: Inception templates are detailed, encouraging thoroughness.

**Location**: Inception phase templates in `templates/inception/`

### 3. 6× Spending on Launch Activities

**Cooper's Data**: Successful products spent 6× more on market launch (Stage 5).

**AIWG Parallel**: Transition/Production phases deserve significant investment:
- Deployment plans detailed
- Monitoring comprehensive
- Runbooks thorough

**Design Decision**: Transition phase has equal template depth to Construction.

**Location**: Transition phase templates in `templates/transition/`

### 4. Largest Quality Gap: Detailed Market Study

**Cooper's Finding**: Stage 2 (Build Business Case) had largest execution quality gap between successes (6.5/10) and failures (3.0/10).

**AIWG Parallel**: Elaboration phase (equivalent to Stage 2) is most critical:
- Software Architecture Document (SAD)
- Architecture Decision Records (ADRs)
- Non-Functional Requirements (NFRs)

**Design Decision**: Elaboration has most detailed templates, strictest gate criteria (LA gate).

**Location**: Elaboration templates, LA gate checklist

## Cross-References to Other AIWG Components

### Related Papers

- **REF-006** (Cognitive Load Theory): Template-first approach reduces cognitive load during stages
- **REF-007** (Mixture of Experts): Multi-agent architecture enables cross-functional gate reviews
- **REF-011** (Requirements Traceability): Traceability ensures deliverables connect across stages/gates

### AIWG Implementation Files

- **Phase Definitions**: `agentic/code/frameworks/sdlc-complete/docs/phases/`
- **Phase Transition Commands**: `.claude/commands/flow-*-to-*.md` (execute gate checks)
- **Gate Checklists**: `.aiwg/planning/gate-checklists/` (criteria for each gate)
- **SDLC Framework**: `agentic/code/frameworks/sdlc-complete/` (orchestrator logic)
- **Agent Manifests**: `agentic/code/frameworks/sdlc-complete/agents/` (gatekeeper agents)
- **Templates**: `agentic/code/frameworks/sdlc-complete/templates/` (deliverable structures)

## Improvement Opportunities for AIWG

### 1. Quantify Gate Effectiveness

**Cooper's Evidence**: Winners had higher execution quality scores (6.5-7.0 vs 3.0-4.5).

**AIWG Opportunity**: Measure gate effectiveness:
- Artifact quality before vs after gate review
- Defect rates by phase (did gates catch issues?)
- Rework percentage (how often do artifacts cycle back?)

**Implementation**:
- Quality scoring per artifact
- Gate decision tracking with metrics
- Longitudinal project analysis

### 2. Dynamic Gate Criteria

**Current State**: Fixed gate criteria per phase.

**Opportunity**: Adapt criteria based on:
- Project size (small projects: simplified gates)
- Risk level (high-risk: stricter criteria)
- Team maturity (experienced teams: lighter gates)

**Implementation**:
- Parameterized gate templates
- Risk-based criteria weighting
- Auto-adjust based on project metadata

### 3. Gate Timing Optimization

**Cooper's Insight**: 30-50% cycle time reduction through parallel processing (p. 50).

**AIWG Opportunity**: Analyze gate timing:
- How long do artifacts spend in each phase?
- Where are bottlenecks (which gates cause delays)?
- Can some gate criteria be evaluated asynchronously?

**Implementation**:
- Phase duration tracking
- Bottleneck identification
- Async gate review for non-blocking criteria

### 4. Go/Kill Decision Analytics

**Cooper's Function**: "Go/kill decision points" (p. 48).

**AIWG Opportunity**: Track decision patterns:
- What percentage GO vs HOLD vs RECYCLE vs KILL?
- Which gate has highest RECYCLE rate (quality gap indicator)?
- What criteria most often cause HOLD decisions?

**Implementation**:
- Decision logging with rationale
- Criteria-level tracking (which criteria failed?)
- Pattern analysis across projects

### 5. Gatekeeper Composition Optimization

**Cooper's Team**: Cross-functional group (p. 49).

**AIWG Opportunity**: Optimize agent panel composition:
- Which agents add most value at each gate?
- Are there redundant perspectives?
- Are any perspectives consistently missing?

**Implementation**:
- Agent contribution scoring
- Panel composition experiments (vary agents, measure outcomes)
- Correlation analysis (agent presence → artifact quality)

### 6. Stage Activity Recommendations

**Cooper's Data**: 3× spending on Stage 1, 6× on Stage 5 for winners.

**AIWG Opportunity**: Provide effort allocation guidance:
- "Inception should take X% of project time"
- "Elaboration investment correlates with success"
- Surface when phases are under-invested

**Implementation**:
- Phase effort tracking
- Benchmarking against successful projects
- Alerts for under-investment in critical phases

## Critical Insights for AIWG Development

### 1. Gates Are Not Bureaucracy—They're Quality Enforcement

**Cooper's Quote**: "The gates provide the teeth that make the process work. Too many managers pay lip service to the idea of a disciplined new product process, but fail to provide the discipline. Gates are where the discipline happens" (p. 49).

**AIWG Implication**: Do not make gates optional or easily bypassed. They are the primary quality mechanism.

**Design Decision**: Phase transition commands MUST check gate criteria. No escape hatches.

### 2. Upfront Work Prevents Downstream Rework

**Cooper's Quote**: "One of the most important principles is this: The quality of execution at Stage 1—the preliminary investigation—is often as important as the quality of execution at Stage 3, the Development stage" (p. 47).

**AIWG Implication**: Inception and Elaboration templates should be as detailed as Construction templates. Early investment prevents late-stage failures.

**Design Decision**: Maintain rich Inception/Elaboration templates. Do not simplify them to "accelerate" projects.

### 3. Multi-Perspective Review Is Essential

**Cooper's Finding**: Single-function perspective insufficient (p. 49).

**AIWG Implication**: Gate reviews MUST include multiple agents (architecture + security + test + operations).

**Design Decision**: Require minimum 3-5 agent approvals per gate. No single-agent approval paths.

### 4. Parallel Processing ≠ Skipping Stages

**Cooper's Clarification**: "Stage-Gate is not a functional, sequential process. Activities within stages are undertaken concurrently and by people from different functional areas working together as a team" (p. 50).

**AIWG Implication**: Parallel work within phases is good (multiple agents, concurrent artifacts). Skipping phases is bad.

**Design Decision**: Enable multi-agent parallelism within phases. Prevent phase skipping.

### 5. Quality Gaps Compound Across Stages

**Cooper's Evidence**: Poor Stage 1 execution → poor Stage 2 execution → project failure.

**AIWG Implication**: Gate failures cascade. Allowing incomplete Inception deliverables poisons Elaboration, which poisons Construction.

**Design Decision**: Strict gate enforcement in early phases (LO, LA gates) prevents cascading failures.

## Key Quotes Relevant to AIWG

> "Quality of execution is the number one success factor in new product development. The most important driver of success and profitability is doing the activities and doing them well." (p. 47)

**AIWG Application**: Templates, tools, and validation enforce quality execution.

> "Each gate consists of: 1) deliverables (what the project leader and team must bring to the decision point), 2) criteria (questions or metrics on which the project is judged), and 3) outputs (a decision: go/kill/hold/recycle)." (p. 48-49)

**AIWG Application**: Gate checklists implement exactly this structure.

> "The gates serve as quality-control checkpoints, go/kill decision points, and prioritization points." (p. 48)

**AIWG Application**: SDLC gates serve all three functions.

## Summary

Stage-Gate Systems provides the process framework for AIWG's SDLC implementation:

1. **5 SDLC phases** (stages) separated by **4 gates** (checkpoints)
2. **Deliverables** defined per phase (templates specify structure)
3. **Gate criteria** enforce quality (mandatory + desirable checklists)
4. **Multi-agent reviews** (cross-functional gatekeepers)
5. **Parallel work within phases** (concurrent agent activities)
6. **Serial progression between phases** (gates prevent skipping)

Cooper's experimental evidence validates AIWG's design:
- **Quality of execution** #1 success factor → templates enforce quality
- **3× investment in Stage 1** → rich Inception templates
- **6× investment in Stage 5** → thorough Transition phase
- **Largest gap in Stage 2** → strictest LA gate criteria

**Critical Takeaway**: Gates are not optional. They are the primary mechanism preventing poor execution, which is the #1 cause of project failure.

**Next Steps**:
- Quantify gate effectiveness (quality metrics)
- Optimize gatekeeper composition (agent panel analysis)
- Track go/kill decision patterns
- Validate phase investment recommendations
- Maintain strict gate discipline—resist pressure to bypass
