# Use-Case Specification Template

## Purpose

Detail the interactions between actors and the system to fulfill specific goals. Use this template to inform analysis,
design, testing, and traceability matrices.

## Ownership & Collaboration

- Document Owner: System Analyst
- Contributor Roles: Business Process Analyst, Test Architect, Designer
- Automation Inputs: Approved personas, business use-case spec, stakeholder walkthroughs
- Automation Outputs: `use-case-<id>.md` with main and alternate flows

## Completion Checklist

- All flows (main and alternate) enumerated with pre/postconditions
- Non-functional requirements and business rules linked
- Open issues and assumptions clearly documented

## Document Sections

1. **Use-Case Identifier and Name**
   - Assign a unique ID (`UC-###`) and descriptive name.
2. **Scope and Level**
   - Define system scope covered and level (user goal, subfunction, etc.).
3. **Primary Actor(s)**
   - List actors initiating the use case and their goals.
4. **Stakeholders and Interests**
   - Summarize stakeholder expectations impacted by the use case.
5. **Preconditions**
   - State conditions that must be true prior to execution.
6. **Postconditions**
   - Describe outcomes on successful completion.
7. **Trigger**
   - Specify event or condition that starts the use case.
8. **Main Success Scenario**
   - Provide numbered steps detailing the primary interaction path.
9. **Alternate Flows**
   - Outline alternative paths, including branching conditions and outcomes.
10. **Exception Flows**
    - Describe error handling, rollback, and escalation procedures.
11. **Special Requirements**
    - Include non-functional requirements specific to the use case (performance, security, etc.).
12. **Related Business Rules**
    - Reference rules or policies that govern behavior.
13. **Data Requirements**
    - List inputs, outputs, and data validation requirements.
14. **Open Issues and TODOs**
    - Track unresolved questions, decisions, or dependencies.
15. **References**
    - Link to supporting documents (vision, supplementary spec, designs).

## Agent Notes

- Use consistent numbering for steps; include actor names to clarify responsibility.
- Keep language testable—statements should translate to acceptance criteria.
- Sync updates with QA to ensure tests reflect the latest flows.
- Verify the Automation Outputs entry is satisfied before signaling completion.
