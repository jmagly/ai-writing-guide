# SDLC Prompt Library

Use these copy-ready prompts to drive PLAN → ACT agent workflows across the Rational Unified Process phases. Each block assumes the agent has access to the latest artifacts in `docs/sdlc/artifacts/` or equivalent context. When a prompt references an artifact, seed the agent with the matching template from `docs/sdlc/templates/`.

## 0. Idea Amplifier
```
Role: Product strategist, vision owner, domain expert trio.
Goal: Expand <idea> into an inception-ready charter.
Instructions:
- articulate problem statement, target personas, value hypotheses
- list success metrics, regulatory or domain constraints, funding assumptions
- identify critical use cases and stakeholder map
- capture unresolved questions for follow-up
Output: vision.md, stakeholder-map.md, success-metrics.yaml, questions.md
```

## 1. Inception Charter Sprint
```
Role: Business analyst with project manager.
Goal: Baseline scope and business case for Inception.
Instructions:
- synthesize business context, objectives, and constraints
- inventory candidate use cases and prioritize MVP scope
- outline high-level release plan and budget guardrails
- document initial risk list and mitigation hypotheses
Output: business-case.md, mvp-scope.csv, phase-plan-inception.md, risk-list.md
```

## 2. Requirements & Stakeholder Workshops
```
Role: Requirements analyst, UX researcher, legal liaison.
Goal: Elaborate critical requirements and traceability.
Instructions:
- craft use-case specifications with GIVEN/WHEN/THEN acceptance criteria
- author supplementary requirements (non-functional, compliance, data)
- populate glossary and stakeholder request log
- flag ambiguities requiring stakeholder clarification
Output: use-cases/, supplementary-spec.md, glossary.md, stakeholder-requests.csv
```

## 3. Elaboration Architecture Laboratory
```
Role: Software architect with operations liaison.
Goal: Produce architectural baseline for Elaboration.
Instructions:
- define system decomposition, component responsibilities, interface contracts
- sketch deployment topology, scaling plan, and observability hooks
- identify architecturally significant use cases and prototype plan
- capture architectural decisions and trade-offs
Output: software-architecture.md, interface-contracts/, adr/, prototype-plan.md
```

## 4. Elaboration Iteration Planning
```
Role: Project manager and configuration manager.
Goal: Tailor development case and iteration schedule.
Instructions:
- create iteration plans aligned to risk retirement and priority use cases
- specify configuration management strategy and baselines
- assemble development case tailoring guidelines and tool configurations
- define measurement plan and reporting cadence
Output: iteration-plan-elaboration.csv, cm-plan.md, development-case.md, measurement-plan.md
```

## 5. Construction Feature Loop
```
Role: Feature squad (designer, developer, tester).
Goal: Deliver a prioritized use case during Construction.
Instructions:
- PLAN approach, dependencies, and test strategy before coding
- ACT to implement code and tests with traceable commits or patches
- Evaluate via automated suites, exploratory scripts, and peer review
- Debug and Correct until acceptance criteria and Definition of Done are satisfied
- Update iteration assessment and traceability
Output: change-summary.md, test-report.json, iteration-assessment.md, traceability-update.csv
```

## 6. Construction Integration & Quality Gate
```
Role: Build engineer and QA lead.
Goal: Maintain integration stability and quality benchmarks.
Instructions:
- refresh integration build plan and smoke test checklist
- execute regression suites, capture defect trends, enforce severity gates
- coordinate fixes across teams and baseline configuration snapshots
- prepare status assessment for steering review
Output: integration-build-plan.md, regression-log.csv, defect-report.xlsx, status-assessment.md
```

## 7. Transition Deployment Playbook
```
Role: Deployment manager, support lead, training coordinator.
Goal: Ready product for release during Transition.
Instructions:
- script deployment/rollback, infrastructure prerequisites, and validation probes
- assemble release notes, bill of materials, licensing info, and training package
- document support workflows, SLAs, incident response runbooks
- schedule pilot/beta feedback loop and go/no-go review
Output: deployment-plan.md, release-notes.md, support-runbook.md, training-kit.zip, go-no-go-checklist.md
```

## 8. Transition Feedback & Roadmap Refresh
```
Role: Product operations and analytics team.
Goal: Capture lessons and feed backlog post-release.
Instructions:
- analyze telemetry versus success metrics and SLAs
- synthesize user feedback, adoption data, and operational incidents
- conduct postmortem/retrospective, extract improvement backlog items
- update roadmap priorities and archive iteration artifacts
Output: analytics-report.md, retrospective.md, improvement-backlog.csv, roadmap-update.yaml, archive-index.md
```
