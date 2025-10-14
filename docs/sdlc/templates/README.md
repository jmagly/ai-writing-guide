# Lifecycle Template Suite

## Overview

This directory provides Markdown templates to support PLAN → ACT agent workflows. Each template mirrors a well-established lifecycle artifact, with sections and checklists tailored for collaborative, parallel development.

## Structure

- `business-modeling/` – Vision, supplementary business specification, business use-case specs/realizations, architecture documents, glossaries, rules, and target-organization assessments.
- `requirements/` – Vision (formal/informal), use-case specifications (formal/informal), supplementary specs, SRS variants, requirements management plan, stakeholder requests, glossary, interview scripts.
- `analysis-design/` – Software architecture and use-case realization templates.
- `implementation/` – Integration build planning templates.
- `test/` – Master and iteration test plans, strategy, evaluation summaries, and supporting guidance.
- `deployment/` – Bill of materials, deployment plans, release notes, acceptance artifacts, and support runbooks.
- `management/` – Software development plans, iteration plans (formal/informal), iteration assessments, status assessments, risk management artifacts, measurement plans, business cases, quality assurance, development-organization assessments, and risk lists.
- `configuration/` – Configuration management and problem resolution plans.
- `environments/` – Development case plus discipline-specific guidelines (business modeling, use-case modeling, design, programming, testing).
- `card-metadata-standard.md` – Standard metadata header for all cards (ownership, team, traceability).



## How to Use

1. Copy the relevant template into `docs/sdlc/artifacts/<project>/` (or project-specific location).
2. Replace placeholders, fill sections, and remove any that do not apply—record tailoring decisions in the Development Case.
3. Update cross-references (e.g., risk IDs, use-case IDs) for traceability.
4. Commit the completed artifact alongside supporting evidence (diagrams, scripts, test reports).


## Maintenance

- Align updates with `docs/sdlc/plan-act-sdlc.md` and `docs/sdlc/actors-and-templates.md`.
- When adding new templates, update this README and the actors/roles catalogue.
- Run Markdown linting to ensure formatting consistency.


## Cards

Cards are small, parallelizable work units with clear ownership and traceability. Each card should
include the metadata header defined in `card-metadata-standard.md` and list the related templates
it depends on.
