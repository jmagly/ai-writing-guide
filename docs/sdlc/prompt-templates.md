# SDLC Prompt Library

Use these copy-ready prompts to drive PLAN → ACT agent workflows from idea intake to post-release
feedback. Each block assumes the agent has access to the latest artifacts from `docs/sdlc/artifacts/`
or equivalent context.

## 1. Idea Amplifier
```
Role: Product strategist, vision officer, domain expert trio.
Goal: Expand <idea> into a product charter.
Instructions:
- state the core problem, users, and jobs-to-be-done
- list success metrics, regulatory or domain constraints
- draft north-star narrative and positioning
- enumerate unknowns to validate with stakeholders
Output: charter.md, metrics.yaml, questions.md
```

## 2. Requirements Deep-Dive
```
Role: Requirements analyst with UX researcher and compliance partner.
Goal: Translate charter into granular requirements.
Instructions:
- generate user stories with GIVEN/WHEN/THEN acceptance tests
- note domain vocabulary and data dictionaries
- capture non-functional requirements and compliance obligations
- flag open questions requiring human decision
Output: backlog.csv, acceptance-tests.md, glossary.md, risk-register.md
```

## 3. Architecture Blueprint
```
Role: Solution architect with operations liaison.
Goal: Design SOLID, modular system architecture.
Instructions:
- define modules, boundaries, interfaces, and data flows
- map technology stack choices with justification
- describe deployment topology, observability, and scaling strategy
- identify integration points and failure modes
Output: architecture.md, adr/*.md, interface-contracts/*.md, ops-topology.drawio.json
```

## 4. Implementation Task Graph
```
Role: Engineering lead and project manager pair.
Goal: Produce executable task plan for feature agents.
Instructions:
- break requirements into single-file or focused tasks
- assign agent role, dependencies, and test expectations
- include ready-to-run PLAN prompt per task
- schedule sync checkpoints for cross-layer coordination
Output: tasks-board.csv, sync-calendar.md, prompts/*.md
```

## 5. Feature Delivery Loop
```
Role: Feature implementation agent with QA partner.
Goal: Deliver one task through PLAN → ACT → Evaluate → Debug → Correct cycles.
Instructions:
- outline planned approach and test strategy before coding
- implement changes with traceable commits or patches
- run automated tests, linters, and scenario scripts; log results
- loop until acceptance criteria fully pass
- escalate after three failed cycles with diagnostic bundle
Output: change-summary.md, test-report.json, escalation.md (if applicable)
```

## 6. Verification & Validation Sweep
```
Role: QA lead, UAT coordinator, accessibility reviewer.
Goal: Confirm release readiness.
Instructions:
- execute regression, integration, and scenario suites
- perform exploratory testing and accessibility checks
- compile defect log with severity and reproduction paths
- recommend go/no-go status and remediation plan
Output: validation-report.md, defects.csv, go-no-go.yaml
```

## 7. Release & Operations Handoff
```
Role: Release manager and SRE.
Goal: Prepare deployment and support.
Instructions:
- script rollout steps, feature flags, rollback strategy
- define monitoring dashboards, alerts, and SLOs
- draft support FAQ and incident response playbook
- verify documentation links and ownership
Output: release-playbook.md, dashboards.json, support-faq.md, incident-runbook.md
```

## 8. Lifecycle Feedback Loop
```
Role: Product ops and analytics team.
Goal: Feed learnings back into roadmap.
Instructions:
- analyze telemetry against success metrics
- summarize user feedback and support trends
- capture lessons learned, improvement backlog, and follow-up experiments
- refresh roadmap priorities and archive artifacts
Output: analytics.md, retrospective.md, roadmap-updates.yaml, archive-index.md
```
