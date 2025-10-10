# Plan-Act SDLC Script

## Purpose
Equip PLAN → ACT coding agents with a complete, IBM Rational-level SDLC map so they can deliver
usable software from a single idea prompt. Every stage lists the required roles, artifacts, and exit
checks agents must satisfy before advancing.

## Intake & Vision Sprint
- **Trigger**: User provides a short idea or problem statement.
- **Roles**: Product Strategist, Vision Officer, Domain Expert (human or simulated agents).
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

## SDLC Ladder for Agent To-Do Lists
| Stage | Primary Roles | Plan Tasks | Act Deliverables | Exit Criteria |
| --- | --- | --- | --- | --- |
| Requirements | Requirements Analyst, UX, Legal | Groom backlog, write stories, define acceptance tests, map human sign-offs | User stories, acceptance test specs, glossary, risk list | Stakeholder sign-off, traceability matrix seeded |
| Architecture | Solution Architect, Ops Lead | Choose patterns, define modules, interfaces, data flows, non-functional budgets | Architecture decision records, interface contracts, deployment diagram | Feasibility review approval, dependencies catalogued |
| Implementation Planning | Tech Lead, Project Manager | Slice work into single-file or narrow tasks, assign agents, schedule sync checkpoints | Task board, agent RACI, prompt packets per task | Work items reviewed, dependencies queued |
| Build & Iteration | Feature Agents, QA | PLAN → ACT → Evaluate → Debug → Correct loops, pair code with tests, capture decision notes | Code, tests, change logs, evaluation transcripts | Acceptance tests pass, lint clean, reviewer checklist satisfied |
| Verification & Validation | QA Lead, UAT Coordinator | Run suites, exploratory sessions, scenario testing, accessibility sweep | Test evidence, defect log, release readiness report | No Sev-1 defects open, coverage goals met |
| Release & Operations | Release Manager, SRE, Support | Draft rollout, observability, runbooks, communication plan | Deployment playbooks, dashboards, support FAQs | Go/no-go approval, monitoring and rollback validated |
| Lifecycle Feedback | Product Ops, Analytics | Gather telemetry, user feedback, post-release retro | Analytics report, backlog updates, lessons learned | Improvement actions prioritized, roadmap updated |

## Detailed Stage Prompts
1. **Requirements Expansion**
```
You are a requirements analyst collaborating with UX and legal advisors. For each persona, convert
charter outcomes into user stories, acceptance scenarios, data rules, and compliance obligations.
Flag ambiguities and request stakeholder confirmation where needed.
```
2. **Architecture Synthesis**
```
Act as a systems architect with ops awareness. Propose a modular design following SOLID principles,
define interfaces, persistence models, integration contracts, scaling and observability plans. Include
trade-off analysis and migration impact.
```
3. **Task Graph Planning**
```
As the engineering lead, decompose approved stories into single-file or tightly scoped tasks that can be
executed by parallel feature agents. Provide task IDs, prerequisites, recommended agent role, and
Plan → Act prompts each implementer should follow.
```
4. **Feature Delivery Loop**
```
For task <task-id>, run iterations of PLAN → ACT → Evaluate → Debug → Correct until the acceptance
criteria pass. Log every evaluation (tests run, results, fixes). Escalate to human lead after three
unsuccessful correction cycles.
```
5. **Release Preparation**
```
Operate as release manager and SRE pair. Generate deployment steps, verification monitors, rollback
criteria, and support handover notes. Ensure documentation links are updated.
```

## Multi-Agent Collaboration Rules
- Parallelize layers (UI/API/Data/Infra) but enforce synchronization checkpoints after each PLAN
  round to reconcile interfaces.
- Maintain a shared artifact registry under `docs/sdlc/artifacts/` (create per project) so agents can
  resume long-running builds across sessions.
- Require human review for decisions flagged as high risk, regulatory, or strategic trade-offs.

## Quality & Design Guardrails
- Favor SOLID, dependency inversion, and dependency injection to keep edits localized.
- Default to high test coverage with unit, integration, and scenario tests accompanying each feature.
- Capture heuristics and learned fixes in `docs/patterns/` to reduce repeat defects.

## Usage Notes
Feed the relevant stage prompt, plus current artifacts, into the active agent or agent cluster. Plan for
multi-hour or multi-day execution; agents should checkpoint progress after each stage and request
clarifications proactively to avoid drift.
