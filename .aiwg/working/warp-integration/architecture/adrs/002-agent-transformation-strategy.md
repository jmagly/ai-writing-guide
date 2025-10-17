# ADR-002: Agent to Warp Rule Transformation Strategy

## Status
**Proposed** (Pending implementation validation)

## Context

AIWG agents are structured markdown files with YAML frontmatter containing metadata and markdown body containing detailed instructions, processes, and guidelines. These need to be transformed into Warp AI's "rules" format.

### Current Agent Structure (AIWG)

```markdown
---
role: Architecture Designer
model: opus
temperature: 0.7
---

You are an Architecture Designer specializing in designing scalable,
maintainable system architectures. You design system architectures
from requirements, choose appropriate technology stacks, define
microservice boundaries...

## Your Process

When tasked with designing system architecture:

**CONTEXT ANALYSIS:**
- Project type: [web app/mobile/API/etc]
- Requirements: [functional and non-functional]
...

**DELIVERABLES:**
## Architecture Overview
[High-level description and diagram in ASCII/Mermaid]
...
```

### Target Warp Rule Structure

Warp AI uses a more free-form markdown structure without YAML frontmatter, expecting rules to be human-readable instructions that guide AI behavior.

### Transformation Challenges

1. **Metadata Loss**: Warp doesn't support frontmatter metadata
2. **Model Specifications**: Warp manages models internally
3. **Temperature Settings**: Not exposed in Warp configuration
4. **Structure Differences**: AIWG uses sections; Warp uses narrative rules
5. **Command Integration**: How to represent slash commands in rules
6. **Process Preservation**: Complex multi-step processes need restructuring

## Decision

**Transform agents using semantic mapping that preserves intent while adapting to Warp's narrative format.**

### Transformation Rules

#### 1. Frontmatter → Rule Header

```yaml
role: Architecture Designer
model: opus
temperature: 0.7
```

Becomes:

```markdown
### Architecture Designer
**Specialization**: Architecture design and system modeling
**Expertise Level**: Expert (originally configured for reasoning-optimized model)
```

#### 2. Role Description → Rule Introduction

```markdown
You are an Architecture Designer specializing in...
```

Becomes:

```markdown
**Role**: Act as an Architecture Designer specializing in designing scalable,
maintainable system architectures. Focus on architectural decisions,
technology selection, and system design patterns.
```

#### 3. Process Sections → Guidelines

```markdown
## Your Process
When tasked with designing system architecture:
1. Analyze requirements
2. Design architecture
3. Document decisions
```

Becomes:

```markdown
**Guidelines**:
- When designing architecture, always start with requirements analysis
- Create comprehensive architectural views (logical, deployment, data)
- Document all decisions with rationale using ADR format
- Validate designs against non-functional requirements
```

#### 4. Deliverables → Expected Outputs

```markdown
**DELIVERABLES:**
## Architecture Overview
## Components
## Technology Stack
```

Becomes:

```markdown
**Expected Outputs**:
- Architecture Overview with high-level diagrams
- Component specifications with interfaces
- Technology Stack recommendations with justifications
- Deployment architecture and scaling strategies
```

#### 5. Complex Structures → Structured Instructions

Multi-step processes with nested structure:

```markdown
**Process Workflow**:

Phase 1: Analysis
- Gather requirements from `.aiwg/requirements/`
- Identify architectural drivers
- Assess constraints and risks

Phase 2: Design
- Create architectural views
- Define component boundaries
- Plan integration points

Phase 3: Documentation
- Generate Software Architecture Document
- Create ADRs for key decisions
- Document deployment strategies
```

### Complete Transformation Example

**Input** (AIWG Agent):
```markdown
---
role: Security Architect
model: opus
temperature: 0.6
---

You are a Security Architect specializing in application security...

## Your Process
1. Threat modeling
2. Security architecture design
3. Compliance validation
```

**Output** (Warp Rule):
```markdown
### Security Architect

**Specialization**: Application security and threat modeling
**Expertise Level**: Expert (high-precision reasoning required)

**Role**: Act as a Security Architect specializing in application security,
threat modeling, and security architecture design. Focus on identifying
vulnerabilities, designing secure systems, and ensuring compliance.

**Guidelines**:
- Conduct comprehensive threat modeling using STRIDE methodology
- Design defense-in-depth security architectures
- Validate all designs against compliance requirements (SOC2, GDPR, etc.)
- Document security decisions with clear risk assessments

**Expected Outputs**:
- Threat model documentation with identified risks
- Security architecture diagrams and specifications
- Compliance validation checklists
- Security implementation guidelines

**Key Principles**:
- Security by design, not as an afterthought
- Least privilege access control
- Zero trust architecture where applicable
- Continuous security validation
```

## Consequences

### Positive Consequences

1. **Semantic Preservation**: Core meaning and intent maintained
2. **Readability**: Warp rules are human-readable and reviewable
3. **Flexibility**: Narrative format allows natural expression
4. **Completeness**: All essential information preserved
5. **Reversibility**: Could potentially reverse-transform if needed
6. **Clarity**: Structured sections improve understanding

### Negative Consequences

1. **Metadata Loss**: Model and temperature settings lost
2. **Format Expansion**: Rules typically 20-30% larger than agents
3. **Structure Change**: Different organization may confuse users
4. **Precision Loss**: Some technical details may be simplified
5. **Validation Difficulty**: Harder to validate transformation correctness

### Mitigation Strategies

1. **Metadata Preservation**:
   - Include metadata as comments: `<!-- original-model: opus -->`
   - Add "Expertise Level" to indicate model requirements
   - Document precision requirements in guidelines

2. **Size Management**:
   - Use concise language while preserving meaning
   - Implement optional compression modes
   - Allow filtering of less critical sections

3. **Validation**:
   - Create transformation test suite
   - Implement round-trip testing where possible
   - Manual review of critical agents

## Alternatives Considered

### Alternative 1: Direct Copy with Minimal Changes

Simply copy agent content as-is with minor formatting:

```markdown
### Architecture Designer

[Entire agent content copied directly]
```

**Rejected because**:
- Frontmatter would be invalid in WARP.md
- Structure doesn't match Warp conventions
- Poor user experience

### Alternative 2: Lossy Simplification

Reduce agents to simple one-paragraph rules:

```markdown
### Architecture Designer
Design system architectures with focus on scalability and maintainability.
```

**Rejected because**:
- Loses critical process information
- Insufficient guidance for complex tasks
- Defeats purpose of detailed agents

### Alternative 3: JSON Embedding

Embed agent as JSON in markdown:

```markdown
### Architecture Designer
```json
{
  "role": "Architecture Designer",
  "process": [...],
  "deliverables": [...]
}
```

**Rejected because**:
- Not human-readable
- Warp AI may not parse JSON blocks
- Poor integration with markdown format

### Alternative 4: Template-Based Transformation

Use rigid templates for all agents:

```markdown
### [ROLE]
Instructions: [DESCRIPTION]
Steps: [PROCESS]
Output: [DELIVERABLES]
```

**Rejected because**:
- Too rigid for diverse agent types
- Loses nuance and context
- May not fit all agent patterns

## Implementation Notes

### Transformation Pipeline

```javascript
function transformAgentToRule(agentContent) {
  const { frontmatter, body } = parseFrontmatter(agentContent);

  const rule = {
    title: deriveTitle(frontmatter.role),
    specialization: extractSpecialization(body),
    expertise: mapModelToExpertise(frontmatter.model),
    role: extractRoleDescription(body),
    guidelines: transformProcessToGuidelines(body),
    outputs: extractDeliverables(body),
    principles: extractKeyPrinciples(body)
  };

  return formatAsWarpRule(rule);
}
```

### Mapping Tables

#### Model to Expertise Level

| AIWG Model | Expertise Level | Reasoning |
|------------|----------------|-----------|
| opus | Expert (reasoning-optimized) | Complex reasoning tasks |
| sonnet | Professional (balanced) | General coding/writing |
| haiku | Efficient (speed-optimized) | Simple, fast tasks |

#### Section Mappings

| AIWG Section | Warp Section | Transformation |
|-------------|--------------|---------------|
| Your Process | Guidelines | Convert steps to guidelines |
| Deliverables | Expected Outputs | List key outputs |
| Limitations | Constraints | Include as guidelines |
| Context | Role Description | Merge with role |

### Special Cases

1. **Multi-Role Agents**: Split into multiple rules
2. **Command-Heavy Agents**: Create separate command section
3. **Template Agents**: Transform to instruction templates
4. **Meta Agents**: Preserve as configuration rules

## Related Decisions

- **ADR-001**: WARP.md File Structure (where transformed rules live)
- **ADR-003**: Command Representation (how commands integrate)
- **ADR-004**: Model Mapping Approach (handling model specifications)

## Validation Criteria

1. **Semantic Preservation**: Original intent maintained
2. **Readability**: Rules clear to human readers
3. **Completeness**: No critical information lost
4. **Consistency**: Similar agents transform similarly
5. **Effectiveness**: Warp AI responds appropriately to rules

## References

- [AIWG Agent Structure](../../agents/agent-template.md)
- [Warp AI Rule Examples](https://warp.ai/docs/rules)
- [Transformation Test Cases](../../tests/warp-transform.test.js)

## Review History

- 2024-12-20: Initial draft created
- Pending: Implementation prototype
- Pending: Warp team feedback
- Pending: User testing

---

**Document Version**: 1.0.0
**Decision Date**: 2024-12-20
**Decision Makers**: AIWG Architecture Team
**Review Status**: Awaiting Implementation