# Informal Use-Case Specification Template

---
template_id: use-case-spec-informal
version: 2.0.0
reasoning_required: true
---

## Ownership & Collaboration

- Document Owner: System Analyst
- Contributor Roles: Business Process Analyst, Test Architect
- Automation Inputs: Ideation session notes, actor summaries
- Automation Outputs: `use-case-<id>-informal.md` capturing brief flows

## Use-Case Header

- `Use-Case:`Use-Case Name``
- `<Project>` identifier

## Brief Description

> Provide a concise summary of the user goal and value.

## Reasoning

> Complete this section BEFORE writing the detailed content. Per @.claude/rules/reasoning-sections.md

1. **Actor Analysis**: Who are the stakeholders and what are their goals?
   > [Describe primary and secondary actors, their objectives, and why they need this capability]

2. **Scope Definition**: What is in/out of scope for this use case?
   > [Clearly delineate boundaries - what this use case covers and explicitly does not cover]

3. **Flow Identification**: What is the primary success path?
   > [Outline the "happy path" that achieves the actor's goal]

4. **Exception Handling**: What can go wrong and how should we handle it?
   > [Identify error conditions, edge cases, and their recovery strategies]

5. **Dependency Analysis**: What other use cases or systems are involved?
   > [List dependencies on other use cases, external systems, or preconditions]

## Actor Brief Descriptions

> List participating actors with a sentence describing their objectives or responsibilities.

## Preconditions

- ``Precondition 1``
- ``Precondition 2``

## Basic Flow of Events

1. ``Primary step``
2. `…`
3. `The use case ends.`

## Alternative Flows

- ``Alternative flow name``
  - Describe trigger, path, and completion.

## Subflows

- ``Subflow name``
  - Provide reusable step sequences referenced from the basic or alternative flows.

## Key Scenarios

- ``Scenario name`` – Outline narrative or storyboard for critical scenarios.

## Postconditions

- ``Postcondition 1``
- ``Postcondition 2``

## Extension Points

- ``Extension point name`` – Identify where other use cases can extend this flow.

## Special Requirements

> Capture supplementary or non-functional requirements specific to this use case (performance, UX constraints, business
> rules).

## Additional Information

> Record notes, open issues, references, or links to supporting artifacts.

## Agent Notes

- Align step numbering with the eventual formal specification for traceability.
- Capture actor goals explicitly so automation can cross-link to personas.
- Verify the Automation Outputs entry is satisfied before signaling completion.
