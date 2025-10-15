# Use-Case Realization Template

## Purpose

Bridge requirements and design by detailing how a use case is realized within the architecture, including collaborations
among components and classes.

## Ownership & Collaboration

- Document Owner: Software Architect
- Contributor Roles: Designer, Implementer
- Automation Inputs: Detailed use-case specification, architecture guidelines
- Automation Outputs: `use-case-realization-<id>.md` with flows and responsibilities

## Completion Checklist

- Collaborations align with architectural constraints
- Sequence and collaboration diagrams (or textual equivalents) provided
- Design responsibilities mapped to components and classes

## Document Sections

1. **Use-Case Reference**
   - Identify associated use-case ID and title.
2. **Realization Scope**
   - Define boundaries, subsystems involved, and assumptions.
3. **Participating Actors and Components**
   - List actors, subsystems, classes, and interfaces involved.
4. **Design Overview**
   - Summarize the design approach and rationale.
5. **Flow Realization**
   - Detail step-by-step how the main success scenario is realized.
   - Highlight control flow, data flow, and component interactions.
6. **Alternate and Exception Realizations**
   - Describe how alternate paths are handled, noting deviations.
7. **Class Responsibilities**
   - Map responsibilities to classes with design patterns or tactics applied.
8. **State and Activity Considerations**
   - Note state machines, lifecycle constraints, or workflow details.
9. **Non-Functional Considerations**
   - Explain how performance, security, availability requirements are addressed.
10. **Open Issues and TODOs**
    - Record pending design questions or technical spikes.

## Agent Notes

- Reference sequence or collaboration diagrams stored in the repository; include links or filenames.
- Ensure realization aligns with Software Architecture Document decisions.
- Coordinate with implementation agents to confirm feasibility and identify code impacts.
- Verify the Automation Outputs entry is satisfied before signaling completion.
- Cross-reference each step with component responsibilities and interfaces.
- Capture non-functional considerations to inform testing and implementation.
