# Plan-Act RUP Script

## Purpose
Equip PLAN → ACT coding agents with a complete Rational Unified Process (RUP) playbook so they can deliver usable software from a single idea prompt. Each activity lists the roles, artifacts, disciplines, and exit checks agents must satisfy before advancing.

## Intake & Vision Sprint
- **Trigger**: User provides a short idea or problem statement.
- **Roles**: Product Strategist, Vision Owner, Domain Expert (human or simulated agents).
- **Prompt**:
```
Act as a product triad. Expand <idea> into:
- problem statement and motivating context
- target personas and scenarios
- business and user success metrics
- competitive or regulatory constraints
Return an initial charter plus top unknowns for stakeholder review.
```
- **Outputs**: Charter summary, success metrics, open questions log, stakeholder contacts.

## RUP Phases and Major Milestones
| Phase | Lifecycle Objectives | Primary Disciplines | Lifecycle Milestone | Exit Criteria |
| --- | --- | --- | --- | --- |
| **Inception** | Establish business case, project scope, critical use cases | Business Modeling, Requirements, Project Management | Lifecycle Objective Milestone | Stakeholder agreement on vision, scope, and funding guardrails |
| **Elaboration** | Stabilize architecture, baseline requirements, retire highest risks | Requirements, Analysis & Design, Configuration Mgmt, Environment | Lifecycle Architecture Milestone | Executable architectural prototype, baseline architecture document, prioritized risk list closed |
| **Construction** | Build product increments, achieve component completeness | Analysis & Design, Implementation, Test, Project Management | Initial Operational Capability Milestone | Feature set meets acceptance tests, deployment pipeline proven, defects triaged |
| **Transition** | Deploy, train, and validate with end users | Deployment, Support, Change Management, Test | Product Release Milestone | Users trained, release criteria met, support handover accepted |

## Discipline Backlog for Agent To-Do Lists
| Discipline | Key Roles | PLAN Focus | ACT Deliverables | Cross-Checks |
| --- | --- | --- | --- | --- |
| Business Modeling | Business Analyst, Domain Expert | Model business processes, identify actors, align strategy | Business vision, business use-case specs, glossary | Business stakeholders sign off |
| Requirements | System Analyst, UX Lead, Legal Liaison | Elaborate use cases, supplementary requirements, traceability | Use-case specs, supplementary spec, stakeholder requests log | Traceability matrix seeded, prioritization recorded |
| Analysis & Design | Software Architect, Designer, Operations Liaison | Refine architecture, design components, plan deployment topology | Software architecture document, design models, interface contracts | Architectural review completed, risks mitigated |
| Implementation | Component Owner, Build Engineer | Plan build iterations, map tasks to agents, define coding standards | Source changes, integration build plan, coding guidelines updates | Code reviews complete, tests accompany code |
| Test | Test Architect, QA Engineer, UAT Coordinator | Define test strategy, design suites, schedule test resources | Master/iteration test plans, test cases, defect reports | Coverage targets met, severity gate enforced |
| Deployment | Deployment Manager, Support Lead | Prepare rollout, environment readiness, training materials | Deployment plan, release notes, support FAQ, runbooks | Go/no-go checklist signed, rollback verified |
| Configuration & Change Mgmt | Configuration Manager, Toolsmith | Baseline artifacts, manage change requests, automate build/test | Configuration management plan, change logs, automated build scripts | Baselines auditable, change approvals tracked |
| Project Management | Project Manager, Metrics Analyst | Track progress, risks, estimates, resource allocation | Iteration plans, status assessments, risk list, measurement plan | Plans current, risks mitigated or escalated |
| Environment | Process Engineer, Toolsmith | Tailor development case, maintain guidelines, enable tooling | Development case, modeling/programming/test guidelines | Process assets published, tooling validated |

## Detailed Phase Prompts
1. **Inception Kickoff**
```
Role: Business analyst + vision owner + project manager.
Goal: Shape the inception baseline.
Instructions:
- validate business case, scope, success metrics, funding assumptions
- enumerate critical use cases and stakeholders
- outline initial risk list and phase plan
Deliver: vision.md, business-case.md, risk-list.md, phase-plan-inception.md
```
2. **Elaboration Planning**
```
Role: Software architect with requirements lead and configuration manager.
Goal: Produce architectural baseline and iteration plans.
Instructions:
- stabilize architecturally significant use cases and supplementary requirements
- create executable architectural prototype outline
- define iteration plan with risk-driven objectives
- record configuration management approach and environment tailoring
Deliver: software-architecture.md, iteration-plan-elaboration.csv, cm-plan.md, development-case.md
```
3. **Construction Execution Loop**
```
Role: Feature squad (design + implementation + test agents).
Goal: Implement prioritized use cases.
Instructions:
- for each iteration, PLAN task slices, ACT on implementation, Evaluate with automated suites, Debug, Correct
- update traceability, configuration baselines, and iteration assessment
- coordinate with deployment owner on integration build readiness
Deliver: code changes, test evidence, iteration-assessment.md, integration-build-plan.md
```
4. **Transition Preparation**
```
Role: Deployment manager, support lead, product owner.
Goal: Ready the software for operational use.
Instructions:
- prepare deployment and training materials
- organize pilot/beta feedback loops and final acceptance tests
- finalize release notes, support structures, rollback strategy
Deliver: deployment-plan.md, release-notes.md, training-pack.md, product-acceptance-plan.md
```

## Multi-Agent Collaboration Rules
- Parallelize work by discipline while synchronizing at iteration boundaries; each iteration concludes with an assessment referencing RUP milestones.
- Maintain a shared artifact registry under `docs/sdlc/artifacts/` (create per project) so agents can resume long-running builds across sessions.
- Escalate decisions flagged as regulatory, budgetary, or strategic to human stakeholders before baselining.

## Quality & Design Guardrails
- Apply RUP best practices: iterate, manage requirements, maintain component-based architecture, visually model, verify quality continuously, and manage change.
- Favor SOLID, dependency inversion, and dependency injection to keep edits localized.
- Default to high test coverage with unit, integration, scenario, and regression suites accompanying each major use case.
- Capture heuristics and learned fixes in `docs/patterns/` to reduce repeat defects.

## Usage Notes
Feed the relevant phase prompt and discipline backlog, plus current artifacts, into the active agent or agent cluster. Plan for multi-hour or multi-day execution; agents should checkpoint progress after each iteration, tag baselines, and request clarifications proactively to avoid drift.
