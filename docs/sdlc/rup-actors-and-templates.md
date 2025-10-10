# RUP Actors & Template Suite

## Purpose
Provide PLAN → ACT agents with a ready catalogue of Rational Unified Process roles and artifact templates. Use this document to assign responsibilities, seed prompts, and ensure every discipline produces the expected work products.

## Core Workers and Responsibilities
| RUP Worker | Key Responsibilities | Primary Artifacts | Repository Template |
| --- | --- | --- | --- |
| Business Process Analyst | Capture business context, processes, and actors | Business vision, business use-case model, business glossary | `docs/sdlc/templates/business-modeling/business-vision-template.md`, `docs/sdlc/templates/business-modeling/business-use-case-spec-template.md`, `docs/sdlc/templates/business-modeling/business-glossary-template.md` |
| System Analyst | Elaborate system use cases, maintain requirements traceability | Use-case specs, supplementary specification, stakeholder requests | `docs/sdlc/templates/requirements/use-case-spec-template.md`, `docs/sdlc/templates/requirements/supplementary-spec-template.md`, `docs/sdlc/templates/requirements/stakeholder-requests-template.md` |
| Requirements Reviewer | Validate coverage and prioritize scope with stakeholders | Vision, risk list, requirements management plan | `docs/sdlc/templates/requirements/vision-template.md`, `docs/sdlc/templates/management/risk-list-template.md`, `docs/sdlc/templates/management/iteration-plan-template.md` |
| Software Architect | Define architecture, non-functional strategies, system decomposition | Software architecture document, architecture decisions, interface contracts | `docs/sdlc/templates/analysis-design/software-architecture-doc-template.md`, `docs/sdlc/templates/analysis-design/use-case-realization-template.md` |
| Designer | Refine component design, update models, prepare for implementation | Detailed design models, component specs | `docs/sdlc/templates/analysis-design/use-case-realization-template.md`, `docs/sdlc/templates/environments/guideline-template.md` |
| Implementer | Build components, unit tests, integrate builds | Source code, integration build plan, coding standards adherence | `docs/sdlc/templates/implementation/integration-build-plan-template.md`, `docs/sdlc/templates/environments/guideline-template.md` |
| Integrator | Manage builds, resolve integration issues, package releases | Continuous integration scripts, baseline builds | `docs/sdlc/templates/implementation/integration-build-plan-template.md` |
| Test Architect | Define test strategy, plan suites, ensure coverage | Master test plan, test strategy, measurement plan | `docs/sdlc/templates/test/master-test-plan-template.md`, `docs/sdlc/templates/test/test-strategy-template.md`, `docs/sdlc/templates/management/measurement-plan-template.md` |
| Test Engineer | Design and execute test cases, log defects | Iteration test plan, test evaluation summary, defect log | `docs/sdlc/templates/test/iteration-test-plan-template.md`, `docs/sdlc/templates/test/test-evaluation-summary-template.md` |
| Deployment Manager | Coordinate release activities, rollout, and training | Deployment plan, release notes, support materials | `docs/sdlc/templates/deployment/deployment-plan-template.md`, `docs/sdlc/templates/deployment/release-notes-template.md`, `docs/sdlc/templates/deployment/support-runbook-template.md`, `docs/sdlc/templates/deployment/product-acceptance-plan-template.md` |
| Configuration Manager | Baseline artifacts, manage change requests, automate builds | Configuration management plan, change logs | `docs/sdlc/templates/configuration/configuration-management-plan-template.md`, `docs/sdlc/templates/configuration/problem-resolution-plan-template.md` |
| Project Manager | Plan iterations, track metrics, manage risks | Software development plan, iteration plans, status assessments | `docs/sdlc/templates/management/software-development-plan-template.md`, `docs/sdlc/templates/management/iteration-plan-template.md`, `docs/sdlc/templates/management/status-assessment-template.md`, `docs/sdlc/templates/management/risk-list-template.md` |
| Environment Engineer | Tailor process assets, guidelines, toolchain | Development case, discipline guidelines | `docs/sdlc/templates/environments/development-case-template.md`, `docs/sdlc/templates/environments/guideline-template.md` |

## Template Index by Discipline
- **Business Modeling**: `docs/sdlc/templates/business-modeling/business-vision-template.md`, `docs/sdlc/templates/business-modeling/business-use-case-spec-template.md`, `docs/sdlc/templates/business-modeling/business-glossary-template.md`, `docs/sdlc/templates/business-modeling/business-architecture-doc-template.md`.
- **Requirements**: `docs/sdlc/templates/requirements/vision-template.md`, `docs/sdlc/templates/requirements/use-case-spec-template.md`, `docs/sdlc/templates/requirements/supplementary-spec-template.md`, `docs/sdlc/templates/requirements/stakeholder-requests-template.md`.
- **Architecture & Design**: `docs/sdlc/templates/analysis-design/software-architecture-doc-template.md`, `docs/sdlc/templates/analysis-design/use-case-realization-template.md`.
- **Implementation**: `docs/sdlc/templates/implementation/integration-build-plan-template.md`.
- **Test**: `docs/sdlc/templates/test/master-test-plan-template.md`, `docs/sdlc/templates/test/iteration-test-plan-template.md`, `docs/sdlc/templates/test/test-strategy-template.md`, `docs/sdlc/templates/test/test-evaluation-summary-template.md`.
- **Deployment (Production)**: `docs/sdlc/templates/deployment/deployment-plan-template.md`, `docs/sdlc/templates/deployment/release-notes-template.md`, `docs/sdlc/templates/deployment/product-acceptance-plan-template.md`, `docs/sdlc/templates/deployment/support-runbook-template.md`.
- **Management & Measurement**: `docs/sdlc/templates/management/software-development-plan-template.md`, `docs/sdlc/templates/management/iteration-plan-template.md`, `docs/sdlc/templates/management/status-assessment-template.md`, `docs/sdlc/templates/management/risk-list-template.md`, `docs/sdlc/templates/management/measurement-plan-template.md`.
- **Configuration & Change Management**: `docs/sdlc/templates/configuration/configuration-management-plan-template.md`, `docs/sdlc/templates/configuration/problem-resolution-plan-template.md`.
- **Environment & Process Assets**: `docs/sdlc/templates/environments/development-case-template.md`, `docs/sdlc/templates/environments/guideline-template.md`.

## Usage Guidance
1. **Assign Roles**: Map each active agent to one or more workers above. Maintain a responsibility matrix (`docs/sdlc/artifacts/raci.md`).
2. **Pick Templates**: For every planned artifact, start from the listed template name. When the original format is required (Word, FrameMaker, SoDA), capture the content structure in Markdown to keep this repository portable.
3. **Tailor Per Phase**:
   - Inception emphasizes Business Modeling, Requirements, Project Management templates.
   - Elaboration adds Architecture, Configuration, Environment templates to lock the baseline.
   - Construction cycles through Implementation, Test, Management templates each iteration.
   - Transition activates Deployment and Support templates alongside closing Test evidence.
4. **Traceability**: Link each template instance to use cases and risks in the traceability matrix to maintain coverage across disciplines.

## Prompt Starters
- **Worker Briefing**: “As the `<worker>`, use the `<template>` structure to produce the artifact for `<use case or feature>`. Confirm dependencies from the latest iteration plan before drafting.”
- **Template Tailoring**: “Review the standard sections in `<template>`. Indicate which sections are not applicable and justify omissions. Add project-specific sections where risks or compliance requirements demand it.”
- **Quality Gate**: “Validate that the `<template>` delivered for `<phase>` satisfies the exit criteria listed in the Plan-Act RUP Script. Flag gaps and propose corrective tasks.”

Keep this catalogue synchronized with updates to `docs/sdlc/plan-act-sdlc.md` and expand it whenever new templates or roles are introduced.
