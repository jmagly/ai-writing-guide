# Informal Use-Case Specification Template

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
