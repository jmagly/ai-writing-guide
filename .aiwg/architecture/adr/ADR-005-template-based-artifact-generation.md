# ADR-005: Template-Based Artifact Generation

**Date**: 2024-10-17
**Status**: ACCEPTED (Non-Negotiable)
**Author**: Architecture Designer
**Category**: Core Architecture

## Context

AI coding assistants typically operate through conversational interfaces, generating code and documentation within chat threads. This creates significant challenges for enterprise SDLC workflows:

- **Audit trail gaps**: Chat logs are unstructured, hard to review, not version-controlled
- **Compliance issues**: Regulated industries need traceable, structured artifacts
- **Knowledge loss**: Valuable decisions buried in chat history
- **Inconsistent quality**: Free-form generation varies wildly
- **Integration problems**: Chat output doesn't fit CI/CD pipelines
- **Review difficulty**: No standard format for peer review

The framework must bridge the gap between conversational AI and enterprise documentation requirements.

## Decision

Implement **template-based structured artifact generation** as the core value proposition:

**Architecture**:
```text
User Request → Agent Orchestration → Template Selection →
Structured Generation → Multi-Agent Review → Markdown Artifact →
File System Storage → Version Control
```

**Key components**:
- **156 templates** covering all SDLC phases
- **Structured markdown output** (not chat logs)
- **File system persistence** (`.aiwg/` directory)
- **Version control ready** (diff-able, mergeable)
- **Compliance-friendly** (traceable, auditable)

**Template categories**:
- Requirements (15 templates): Vision, use cases, user stories, NFRs
- Architecture (12 templates): SAD, ADRs, component design, API contracts
- Testing (18 templates): Test plans, test cases, test results
- Security (14 templates): Threat models, security requirements, pen test reports
- Deployment (11 templates): Runbooks, rollback plans, deployment guides
- Governance (10 templates): Change requests, reviews, handoffs
- Management (16 templates): Risk registers, RACI, retrospectives

## Consequences

### Positive
- **Superior audit trails**: Every decision documented in structured format
- **Compliance ready**: Meets regulatory documentation requirements
- **Knowledge preservation**: Decisions captured, not lost in chat
- **Consistent quality**: Templates enforce structure and completeness
- **CI/CD integration**: Artifacts can trigger pipelines, gates
- **Version control**: Full diff history, branching, merging
- **Peer review**: Standard formats enable systematic review

### Negative
- **Template maintenance**: 156 templates to maintain and evolve
- **Less flexibility**: Structure constrains free-form creativity
- **Learning curve**: Users must understand template system
- **Storage overhead**: Many files vs single chat log
- **Synchronization**: Templates might drift from best practices

### Neutral
- Fundamental shift from chat-first to artifact-first
- Success depends on template quality and coverage
- Users must adapt to file-based workflow

## Alternatives Considered

### 1. Chat-Only Interface
**Rejected**: No audit trail, poor compliance, knowledge lost

### 2. Hybrid (Chat + Select Artifacts)
**Rejected**: Inconsistent experience, partial audit trail

### 3. Database Storage
**Rejected**: Less accessible, harder version control, complex setup

### 4. AI-Generated Templates
**Rejected**: Inconsistent structure, quality issues

### 5. External Documentation Tools
**Rejected**: Additional dependencies, integration complexity

## Implementation Status

✅ 156 templates created and organized
✅ `.aiwg/` directory structure defined
✅ Template references in all flows
✅ Markdown format standardized
✅ Version control guidance provided

## Template Design Principles

1. **Completeness**: Every section has purpose and guidance
2. **Flexibility**: Optional sections for different contexts
3. **Traceability**: Links between related artifacts
4. **Compliance**: Includes regulatory sections where relevant
5. **Practicality**: Based on real-world SDLC practices

## Example Template Structure

```markdown
# [Artifact Name]

## Metadata
- Date: {auto-generated}
- Author: {agent-name}
- Version: {version}
- Status: DRAFT|REVIEW|APPROVED

## Executive Summary
{Brief overview for stakeholders}

## Core Content
{Template-specific sections}

## Traceability
- Requirements: {links}
- Related Artifacts: {links}

## Review History
{Multi-agent review trail}

## Approval
{Sign-offs and gates}
```

## Quality Assurance

Templates validated for:
- [ ] Industry standard compliance (IEEE, ISO, PMI)
- [ ] Regulatory requirements (SOX, HIPAA, GDPR)
- [ ] Practical usability (not overly academic)
- [ ] Multi-agent workflow compatibility
- [ ] Version control friendliness

## Evolution Strategy

Templates evolve through:
1. User feedback (GitHub issues)
2. Regulatory updates
3. Industry best practice changes
4. Community contributions
5. Real-world usage patterns

## Related Decisions

- ADR-002: Multi-Agent Pattern (agents use templates)
- Directory structure (`.aiwg/` organization)
- Version control strategy

## References

- Template Library: `agentic/code/frameworks/sdlc-complete/templates/`
- Template Standards: `templates/card-metadata-standard.md`
- Directory Structure: `.aiwg/` hierarchy
- Compliance Frameworks: SOX, HIPAA, GDPR, PCI-DSS