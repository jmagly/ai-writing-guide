# Concept → Inception Flow

## Objective

Validate the problem, scope, risks, and success metrics before implementation.

## Workflow

| Step | Activity | Agent/Role | Templates | Gate Criteria |
|------|----------|------------|-----------|---------------|
| 1 | Idea intake and vision brief | Business Process Analyst, Vision Owner | `intake/project-intake-template.md`<br>`requirements/vision-informal-template.md` | Problem statement clear, personas identified, constraints documented |
| 2 | Business value and persona alignment | Product Strategist, System Analyst | `requirements/use-case-brief-template.md`<br>`requirements/context-free-interview-template.md` | 3-5 business use cases identified, stakeholder interviews conducted |
| 3 | Top risks identified | Project Manager, Software Architect | `management/risk-list-template.md`<br>`management/risk-card.md` | 5-10 risks documented, top 3 have mitigation plans |
| 4 | Security and privacy screening | Security Architect, Legal Liaison | `security/data-classification-template.md`<br>`security/privacy-impact-assessment-template.md` | Data classes identified, no Show Stopper security concerns |
| 5 | Architecture sketch | Software Architect | `analysis-design/software-architecture-doc-template.md` (initial outline) | Component boundaries sketched, integration points identified, tech stack proposed |
| 6 | Decision checkpoints | Software Architect | `analysis-design/architecture-decision-record-template.md` | Critical architectural decisions documented |
| 7 | Funding and scope guardrails | Product Strategist, Project Manager | `management/business-case-informal-template.md`<br>`intake/option-matrix-template.md` (if applicable) | ROM cost estimate, business case approved, funding for Elaboration secured |

## Exit Criteria (Lifecycle Objective Milestone)

### Required Artifacts
- [ ] Vision document APPROVED (vision-informal-template.md or vision-template.md)
- [ ] Project intake COMPLETE (project-intake-template.md)
- [ ] Business case APPROVED (business-case-informal-template.md)
- [ ] Risk list BASELINED (risk-list-template.md, top 3 risks with mitigation)
- [ ] Data classification COMPLETE (data-classification-template.md)
- [ ] Initial architecture scan documented (component boundaries, tech stack)
- [ ] Stakeholder requests logged (stakeholder-requests-template.md)

### Quality Gates
- [ ] Vision Owner signoff on vision
- [ ] Executive Sponsor signoff on business case
- [ ] At least 75% of key stakeholders approve vision
- [ ] No Show Stopper risks without mitigation plans
- [ ] Funding approved for at least Elaboration phase
- [ ] Security Architect confirms no Show Stopper security concerns

### Decision Point
- [ ] **Go/No-Go to Elaboration** decision recorded in ADR
- [ ] If GO: Elaboration phase kickoff scheduled (within 1 week)
- [ ] If NO-GO: Gaps documented, return to intake or cancel project

## Agent Assignments

- **Intake Coordination**: Business Process Analyst (lead)
- **Vision Development**: Vision Owner, Product Strategist
- **Risk Assessment**: Project Manager, Software Architect
- **Security Screening**: Security Architect
- **Architecture Scan**: Software Architect
- **Business Case**: Product Strategist
- **Milestone Review**: Executive Sponsor (decision authority)

## Handoff Preparation

At end of Inception, prepare for Elaboration handoff:
- Baseline all artifacts (git tag: `inception-baseline-YYYY-MM-DD`)
- Package vision, business case, risks, architecture scan
- Schedule Elaboration planning session
- Assign Elaboration team (architect, requirements analyst, test architect)

## Common Failure Modes

**Unclear Vision**: Stakeholders cannot articulate problem or success metrics
- **Remediation**: Return to intake, conduct more stakeholder interviews

**Scope Creep Already Visible**: Scope is vague, "everything is in scope"
- **Remediation**: Scope refinement workshop, MoSCoW prioritization

**Unfunded Mandate**: Vision approved but no budget allocated
- **Remediation**: Strengthen business case, executive escalation

**Hidden Risks**: Major risks discovered in Elaboration that should have been caught
- **Remediation**: Improve risk identification process, bring in domain experts

## References

- Full milestone definition: See `gate-criteria-by-phase.md` (Lifecycle Objective Milestone)
- Phase handoff checklist: See `handoff-checklist-template.md`
- Template directory: `docs/sdlc/templates/`
