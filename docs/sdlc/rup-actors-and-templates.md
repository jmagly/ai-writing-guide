# RUP Actors & Template Suite

## Purpose
Provide PLAN → ACT agents with a ready catalogue of Rational Unified Process roles and artifact templates. Use this document to assign responsibilities, seed prompts, and ensure every discipline produces the expected work products.

## Core Workers and Responsibilities
| RUP Worker | Key Responsibilities | Primary Artifacts | Reference Templates |
| --- | --- | --- | --- |
| Business Process Analyst | Capture business context, processes, and actors | Business vision, business use-case model, business glossary | `Business Vision`, `Business Use-Case Specification`, `Business Glossary`, `Target-Organization Assessment` |
| System Analyst | Elaborate system use cases, maintain requirements traceability | Use-case specs, supplementary specification, stakeholder requests | `Use-Case Specification`, `Supplementary Specification`, `Stakeholder Requests`, `Context-Free Interview Script` |
| Requirements Reviewer | Validate coverage and prioritize scope with stakeholders | Vision, risk list, requirements management plan | `Vision`, `Vision (Informal)`, `Risk List`, `Requirements Management Plan` |
| Software Architect | Define architecture, non-functional strategies, system decomposition | Software architecture document, architecture decisions, interface contracts | `Software Architecture Document`, `Use-Case Realization Specification`, `Design Guidelines` |
| Designer | Refine component design, update models, prepare for implementation | Detailed design models, component specs | `Use-Case Realization Specification`, `Programming Guidelines` |
| Implementer | Build components, unit tests, integrate builds | Source code, integration build plan, coding standards adherence | `Integration Build Plan`, `Programming Guidelines` |
| Integrator | Manage builds, resolve integration issues, package releases | Continuous integration scripts, baseline builds | `Integration Build Plan`, `Bill of Materials` |
| Test Architect | Define test strategy, plan suites, ensure coverage | Master test plan, test strategy, measurement plan | `Master Test Plan`, `Test Strategy`, `Measurement Plan` |
| Test Engineer | Design and execute test cases, log defects | Iteration test plan, test evaluation summary, defect log | `Iteration Test Plan`, `Test Evaluation Summary` |
| Deployment Manager | Coordinate release activities, rollout, and training | Deployment plan, release notes, support materials | `Deployment Plan`, `Release Notes`, `Product Acceptance Plan`, `Support FAQ` |
| Configuration Manager | Baseline artifacts, manage change requests, automate builds | Configuration management plan, change logs | `Configuration Management Plan`, `Problem Resolution Plan` |
| Project Manager | Plan iterations, track metrics, manage risks | Software development plan, iteration plans, status assessments | `Software Development Plan`, `Iteration Plan`, `Status Assessment`, `Measurement Plan` |
| Environment Engineer | Tailor process assets, guidelines, toolchain | Development case, modeling/programming/test guidelines | `Development Case`, `Business Modeling Guidelines`, `Use-Case Modeling Guidelines`, `Test Guidelines` |

## Template Index by Discipline
- **Business Modeling**: `Business Use-Case Specification`, `Supplementary Business Specification`, `Business Use-Case Realization Specification`, `Business Architecture Document`, `Business Vision`, `Business Glossary`, `Target-Organization Assessment`, `Business Rules Document`.
- **Requirements**: `Supplementary Specification`, `Use-Case Specification`, `Use-Case Specification (Informal)`, `Requirements Management Plan`, `Vision`, `Vision (Informal)`, `Glossary`, `Stakeholder Requests`, `Context-Free Interview Script`, `SRS traditional`, `SRS w/ Use-Cases`.
- **Architecture & Design**: `Software Architecture Document`, `Software Architecture Document (Informal)`, `Use-Case Realization Specification`, `Design Guidelines`.
- **Implementation**: `Integration Build Plan`, `Programming Guidelines`.
- **Test**: `Iteration Test Plan`, `Master Test Plan`, `Test Strategy`, `Test Evaluation Summary`, `Test Evaluation Summary (Informal)`, `Test Guidelines`.
- **Deployment (Production)**: `Bill of Materials`, `Release Notes`, `Deployment Plan`, `Product Acceptance Plan`, `Support FAQ`.
- **Management & Measurement**: `Iteration Assessment`, `Status Assessment`, `Software Development Plan`, `Software Development Plan (Informal)`, `Iteration Plan`, `Iteration Plan (Informal)`, `Problem Resolution Plan`, `Measurement Plan`, `Risk Management Plan`, `Quality Assurance Plan`, `Risk List`, `Business Case`, `Business Case (Informal)`.
- **Configuration & Change Management**: `Configuration Management Plan`, `Integration Build Plan`, change request forms (derive from `Problem Resolution Plan`).
- **Environment & Process Assets**: `Development Case`, `Development Case (Informal)`, `Business Modeling Guidelines`, `Use-Case Modeling Guidelines`, `Design Guidelines`, `Programming Guidelines`, `Test Guidelines`.

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
