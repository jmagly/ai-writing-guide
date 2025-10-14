# Project Intake Form

## Metadata

- Project name: <name>
- Requestor/owner: <name/contact>
- Date: <YYYY-MM-DD>
- Stakeholders: <list>

## Problem and Outcomes

- Problem statement: <1–3 sentences>
- Target personas/scenarios: <bullets>
- Success metrics (KPIs): <e.g., activation +20%, p95 < 200ms>

## Scope and Constraints

- In-scope: <bullets>
- Out-of-scope (for now): <bullets>
- Timeframe: <e.g., MVP in 6 weeks>
- Budget guardrails: <e.g., <$X/mo infra>
- Platforms and languages (preferences/constraints): <list>

## Non-Functional Preferences

- Security posture: <Minimal | Baseline | Strong | Enterprise>
- Privacy & compliance: <None | GDPR | HIPAA | PCI | Other>
- Reliability targets: <Availability %, p95/p99, error budget>
- Scale expectations: <initial | 6 months | 2 years>
- Observability: <basic logs | logs+metrics | full tracing+SLOs>
- Maintainability: <low | medium | high>
- Portability: <cloud-locked | portable>

## Data

- Classification: <Public | Internal | Confidential | Restricted>
- PII/PHI present: <yes/no>
- Retention/deletion constraints: <notes>

## Integrations

- External systems/APIs: <list>
- Dependencies and contracts: <list>

## Architecture Preferences (if any)

- Style: <Monolith | Modular | Microservices | Event-driven>
- Cloud/infra: <vendor/regions>
- Languages/frameworks: <list>

## Risk and Trade-offs

- Risk tolerance: <Low | Medium | High>
- Priorities (weights sum 1.0):
  - Delivery speed: <0.0–1.0>
  - Cost efficiency: <0.0–1.0>
  - Quality/security: <0.0–1.0>
- Known risks/unknowns: <bullets>

## Team & Operations

- Team size/skills: <notes>
- Operational support (on-call, SRE): <notes>

## Decision Heuristics (quick reference)

- Prefer simplicity vs power: <S/P>
- Prefer managed services vs control: <M/C>
- Prefer time-to-market vs robustness: <T/R>

## Attachments

- Solution profile: link to `solution-profile-template.md`
- Option matrix: link to `option-matrix-template.md`

## Kickoff Prompt (copy into orchestrator)

```text
Role: Executive Orchestrator
Goal: Initialize project from intake and start Concept → Inception flow
Inputs:
- Project Intake Form (this file)
- Solution Profile
- Option Matrix
Actions:
- Validate scope and NFRs; identify risks and needed spikes
- Select agents for Concept → Inception
- Produce phase plan and decision checkpoints
Output:
- phase-plan-inception.md
- risk-list.md
- initial ADRs for critical choices
```
