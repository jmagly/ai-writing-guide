# Software Architecture Document Template

---
template_id: software-architecture-doc
version: 2.0.0
reasoning_required: true
---

## Purpose

Describe the architectural baseline, including views, decisions, and rationale that guide implementation and evolution.

## Reasoning

> Complete this section BEFORE writing the detailed document. Per @.claude/rules/reasoning-sections.md

1. **Problem Analysis**: What is the core architectural challenge?
   > [Describe the system context, scale, complexity factors driving architecture decisions]

2. **Constraint Identification**: What are the key constraints?
   > [Technical: performance, compatibility; Business: timeline, budget; Organizational: team skills]

3. **Alternative Consideration**: What architectural approaches were evaluated?
   > [List major patterns considered: microservices vs monolith, event-driven vs request-response]

4. **Decision Rationale**: Why this architecture?
   > [Explain why chosen approach best balances constraints and requirements]

5. **Risk Assessment**: What architectural risks exist?
   > [Identify scalability, security, maintainability risks and planned mitigations]

## Ownership & Collaboration

- Document Owner: Software Architect
- Contributor Roles: System Analyst, Designer, Test Architect
- Automation Inputs: Approved requirements set, non-functional drivers, platform constraints
- Automation Outputs: `software-architecture.md` including views and decisions

## Completion Checklist

- Architectural drivers (requirements, constraints, risks) captured
- Views cover logical, process, deployment, and data perspectives as needed
- Architectural decisions documented with rationale and status

## Document Sections

1. **Introduction**
   - Purpose, scope, and intended audience.
   - Summary of architectural drivers and constraints.
2. **Architectural Overview**
   - High-level description of the system, major components, and interactions.
   - Reference diagrams or models.
3. **Architecturally Significant Requirements**
   - List key functional and non-functional requirements influencing architecture.
4. **Architectural Views**
   - **Logical View**: Components, responsibilities, interfaces.
   - **Process View**: Runtime processes, concurrency, threading, communication.
   - **Development View**: Module structure, layers, reuse strategies.
   - **Physical/Deployment View**: Nodes, network topology, infrastructure considerations.
   - **Data View** (optional): Persistent schemas, data flow, storage strategies.
5. **Runtime Scenarios**
   - Walk through critical use cases illustrating component interactions.
6. **Design Decisions and Rationale**
   - Record decisions, alternatives considered, and justification.
   - Track status (Proposed, Accepted, Deprecated).
7. **Technology Stack**
   - Enumerate platforms, frameworks, libraries, and version constraints.
8. **Quality Attribute Tactics**
   - Explain how architecture addresses performance, security, reliability, etc.
9. **Risks and Mitigations**
   - Identify architectural risks and planned mitigations or proof points.
10. **Implementation Guidelines**
    - Reference coding standards, patterns, and integration expectations.
11. **Outstanding Issues**
    - Document open questions, experiments, or pending validations.
12. **Appendices**
    - Include diagrams, ADR references, glossary terms.

## Agent Notes

- Keep diagrams consistent with repository naming conventions; store source files alongside exports.
- Synchronize with Supplementary Specification to ensure quality attributes stay aligned.
- Update runtime scenarios when new critical use cases are introduced.
- Verify the Automation Outputs entry is satisfied before signaling completion.
- Document architectural drivers so downstream design work remains aligned.
- Record decision rationale in Section 6 to support audits and future changes.
