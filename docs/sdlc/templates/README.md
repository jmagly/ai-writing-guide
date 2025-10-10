# RUP Template Suite

## Overview
This directory provides Markdown templates adapted from the Rational Unified Process to support PLAN → ACT agent workflows. Each template mirrors a classic RUP artifact, with sections and checklists tailored for collaborative, parallel development.

## Structure
- `business-modeling/` – Vision, business use-case, glossary, and architecture templates.
- `requirements/` – Vision, use-case, supplementary, and stakeholder request templates.
- `analysis-design/` – Software architecture and use-case realization templates.
- `implementation/` – Integration build planning templates.
- `test/` – Master and iteration test plans, strategy, evaluation summaries.
- `deployment/` – Deployment playbooks, release notes, acceptance, and support runbooks.
- `management/` – Software development plan, iteration plan, status assessment, risk list, measurement plan.
- `configuration/` – Configuration management and problem resolution plans.
- `environments/` – Development case and guideline scaffolds for discipline standards.

## How to Use
1. Copy the relevant template into `docs/sdlc/artifacts/<project>/` (or project-specific location).
2. Replace placeholders, fill sections, and remove any that do not apply—record tailoring decisions in the Development Case.
3. Update cross-references (e.g., risk IDs, use-case IDs) for traceability.
4. Commit the completed artifact alongside supporting evidence (diagrams, scripts, test reports).

## Maintenance
- Align updates with `docs/sdlc/plan-act-sdlc.md` and `docs/sdlc/rup-actors-and-templates.md`.
- When adding new templates, update this README and the actors/roles catalogue.
- Run Markdown linting to ensure formatting consistency.
