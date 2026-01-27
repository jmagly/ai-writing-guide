# SOP Encoding Guide: MetaGPT-Inspired Flow Commands

## Purpose

This guide explains how to encode human Standard Operating Procedures (SOPs) into AI-readable flow commands, based on MetaGPT's validated approach of using structured workflows to reduce hallucinations and improve quality.

## Key Principles

### 1. Structured Communication Over Free-Form Dialogue

**Problem**: Natural language dialogue between AI agents leads to information distortion, similar to the "telephone game" effect.

**Solution**: Encode SOPs as numbered step sequences with structured output schemas, ensuring all necessary information is captured and validated.

**Evidence**: MetaGPT achieved 2x token efficiency (124.3 vs 248.9 tokens/line) and 85% fewer human corrections compared to chat-based approaches.

### 2. Granular Task Decomposition

**Problem**: Broad, vague task definitions allow LLMs to hallucinate or drift off-track.

**Solution**: Break complex workflows into specialized sub-tasks with narrow focus areas, each handled by domain-expert agents.

**Pattern**:
```
Complex Task → Product Manager (requirements analysis)
             → Architect (technical design)
             → Project Manager (task breakdown)
             → Engineer (implementation)
             → QA Engineer (verification)
```

Each role has:
- **Narrow scope**: Single responsibility (no mixing concerns)
- **Domain expertise**: Specialized knowledge and tools
- **Structured output**: Predefined schema for deliverables
- **Clear handoff**: Explicit subscription to upstream artifacts

### 3. Assembly-Line Workflow

**Concept**: Agents work sequentially through a production pipeline, not through discussion.

**Benefits**:
- Prevents "idle chatter" that introduces errors
- Maintains information consistency across handoffs
- Enables validation at each stage
- Reduces cognitive load per agent

### 4. Subscription-Based Information Flow

**Problem**: Sharing all information with every agent causes information overload.

**Solution**: Each agent subscribes only to artifacts relevant to their role.

**Example Subscriptions**:
```markdown
Technical Designer subscribes to:
- .aiwg/requirements/use-cases/*.md
- .aiwg/requirements/nfr-modules/*.md
- .aiwg/intake/solution-profile.md

Technical Designer ignores:
- .aiwg/implementation/** (not relevant yet)
- .aiwg/testing/** (not their responsibility)
- .aiwg/working/** (temporary files)
```

## SOP Encoding Format

### Step-by-Step Procedure

Every flow command SOP section should follow this structure:

```markdown
## Standard Operating Procedure

### Prerequisites (Blocking)
- [ ] Artifact X exists and is validated
- [ ] Phase gate Y approved
- [ ] Stakeholder Z signed off

### Workflow Steps

**Step 1: [Agent Role] - [Task Name]**
- **Input**: @.aiwg/path/to/prerequisite-artifact.md
- **Action**: [Specific task description with numbered sub-steps]
  1. Analyze input artifact for [specific concern]
  2. Generate [specific output element]
  3. Validate against [specific criteria]
- **Output**: @.aiwg/path/to/generated-artifact.md (follows [schema-name])
- **Tools**: [List of available tools: web search, code execution, etc.]
- **Constraints**:
  - MUST NOT [boundary violation]
  - MUST include [required element]

**Step 2: [Next Agent Role] - [Next Task]**
- **Input**: Output from Step 1 + @.aiwg/other/context.md
- **Trigger**: Receives message type [output-schema-name] from Step 1
- **Action**: ...
- **Output**: ...

[Continue for each step in sequential order]

### Exit Criteria (Gate Approval)
- [ ] All outputs follow specified schemas
- [ ] Validation checks pass
- [ ] Traceability established
- [ ] Quality metrics met
```

### Output Schema Specification

Every agent's output must have a defined, validatable schema:

```markdown
## Output Schema: [Schema Name]

**Format**: Markdown with required sections

**Required Sections**:
1. **[Section Name]** - [Purpose]
   - Type: [list | text | table | diagram]
   - Validation: [Specific criteria]
   - Example: [Brief example]

2. **[Next Section]** - [Purpose]
   ...

**Quality Gates**:
- [ ] All required sections present
- [ ] No "anything_unclear" fields populated
- [ ] Traceability links valid
- [ ] Meets [domain-specific criterion]

**References Section**:
- MUST include @-mentions to:
  - Source requirements
  - Related architecture
  - Downstream artifacts (if known)
  - Relevant NFRs
```

### Subscription Rules

Define which agents activate in response to which artifacts:

```markdown
## Subscription Rules

**[Agent Name] activates when**:
- Receives: [artifact-type-1], [artifact-type-2]
- From: [upstream-agent-role]
- Location: @.aiwg/[directory]/*.md
- Condition: All prerequisites met

**[Agent Name] publishes**:
- Artifact Type: [output-schema-name]
- Location: @.aiwg/[directory]/[filename-pattern].md
- Notifies: [downstream-agent-1], [downstream-agent-2]

**[Agent Name] ignores**:
- .aiwg/working/** - Temporary files
- .aiwg/[irrelevant-phase]/** - Out of scope
```

## Token Efficiency Principles

### 1. Use Structured Schemas to Reduce Redundancy

**Anti-pattern**: Verbose natural language explanations
```
The product manager should carefully consider the competitive landscape
by researching similar products and documenting their strengths and
weaknesses in detail...
```

**Pattern**: Schema-driven output with clear fields
```markdown
## Competitive Analysis (Schema)
- Competitor: [name]
- Strengths: [list]
- Weaknesses: [list]
- Our Advantage: [differentiator]
```

**Benefit**: 50% token reduction while maintaining completeness.

### 2. Reference, Don't Repeat

**Anti-pattern**: Copying entire requirements into design document

**Pattern**: Use @-mentions for traceability
```markdown
## Requirements Context

This design addresses:
- @.aiwg/requirements/use-cases/UC-001-user-login.md
- @.aiwg/requirements/nfr-modules/security.md#authentication
```

**Benefit**: AI loads context from references, no duplication needed.

### 3. Use Numbered Steps, Not Prose

**Anti-pattern**:
```
The architect should review the requirements and then think about
the best technology stack, considering factors like scalability,
maintainability, and team expertise before documenting their choices.
```

**Pattern**:
```markdown
**Step 1: Technology Stack Selection**
1. Review @.aiwg/requirements/nfr-modules/scalability.md
2. Evaluate options against criteria:
   - Team expertise level
   - Long-term maintainability
   - Performance requirements
3. Document rationale in ADR
4. Output: @.aiwg/architecture/adrs/ADR-001-tech-stack.md
```

**Benefit**: Clear, actionable instructions use fewer tokens.

## Reducing Hallucinations

### Technique 1: Narrow Agent Scope

**Problem**: Agents with broad responsibilities mix concerns and hallucinate outside expertise.

**Solution**: Define strict boundaries.

```markdown
## Requirements Specialist Agent

### IN SCOPE
- Business requirement analysis
- Use case documentation
- User story creation
- NFR identification

### OUT OF SCOPE
- Technical architecture decisions → defer to Technical Designer
- Implementation details → defer to Developer
- Test strategy → defer to Test Architect
- Deployment planning → defer to DevOps Specialist

### Constraints
- MUST NOT specify technology choices
- MUST NOT write code or pseudocode
- MUST hand off to Technical Designer after requirements baseline
```

### Technique 2: Structured Handoff Validation

**Pattern**: Before accepting handoff, validate prerequisites.

```markdown
**Step 2: Technical Designer Receives PRD**

**Pre-Acceptance Validation**:
1. Check PRD schema compliance:
   - [ ] Product goals defined (3-5 items)
   - [ ] User stories present (minimum 5)
   - [ ] NFRs identified by category
   - [ ] "anything_unclear" field is empty
2. If validation fails:
   - Publish issue back to Requirements Specialist
   - Block design work until resolved
3. If validation passes:
   - Proceed to architecture generation
```

### Technique 3: Executable Feedback Loops

**Pattern**: Test outputs immediately, use failures as debugging context.

```markdown
**Step 4: Engineer Generates Code**

**Iterative Workflow** (max 3 attempts):
1. Generate code based on:
   - @.aiwg/architecture/software-architecture-doc.md
   - @.aiwg/planning/task-list.md
2. Execute code + unit tests
3. Capture results:
   - Success → Proceed to next task
   - Failure → Debug with context:
     - Error message + traceback
     - Comparison against requirements
     - Review of prior attempts
     - Architectural constraints
4. Regenerate improved code
5. Retry execution (step 2)

**Escalation**: After 3 failures, hand off to senior engineer or human.
```

## Example: Requirements Analysis SOP

See: @agentic/code/frameworks/sdlc-complete/templates/flow-patterns/requirements-sop-example.md

This concrete example demonstrates:
- Full numbered SOP steps
- Output schema definition (PRD structure)
- Subscription rules (who activates when)
- Validation gates
- Handoff checklist

## Integration with AIWG

### Mapping to Existing Agents

| MetaGPT Role | AIWG Agent | Template Location |
|--------------|------------|-------------------|
| Product Manager | Requirements Specialist | @agentic/code/frameworks/sdlc-complete/agents/requirements-specialist.md |
| Architect | Technical Designer | @agentic/code/frameworks/sdlc-complete/agents/technical-designer.md |
| Project Manager | SDLC Orchestrator | @agentic/code/frameworks/sdlc-complete/agents/sdlc-orchestrator.md |
| Engineer | Developer | @agentic/code/frameworks/sdlc-complete/agents/developer.md |
| QA Engineer | Test Engineer | @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md |

### Artifact Directory as Message Pool

The `.aiwg/` directory serves as MetaGPT's "shared message pool":

```
.aiwg/
├── requirements/        # Published by Requirements Specialist
│   ├── use-cases/
│   └── nfr-modules/
├── architecture/        # Published by Technical Designer
│   ├── software-architecture-doc.md
│   └── adrs/
├── planning/           # Published by SDLC Orchestrator
│   └── phase-plans/
├── implementation/     # Published by Developer
│   └── code-artifacts/
└── testing/           # Published by Test Engineer
    └── test-plans/
```

Each directory is a "channel" that downstream agents subscribe to.

## Quality Metrics

Track these metrics to validate SOP effectiveness:

| Metric | Target | MetaGPT Baseline |
|--------|--------|------------------|
| **Token Efficiency** | < 150 tokens/line | 124.3 tokens/line |
| **Executability** | 3.5+ / 4.0 | 3.75 / 4.0 |
| **Human Corrections** | < 1.5 per artifact | 0.83 per artifact |
| **Schema Compliance** | 95%+ | (not measured in paper) |
| **Phase Gate Rework** | < 10% | (not measured in paper) |

## References

- @docs/references/REF-013-metagpt-multi-agent-framework.md - Full MetaGPT research documentation
- @agentic/code/frameworks/sdlc-complete/agents/manifest.json - AIWG agent catalog
- @agentic/code/frameworks/sdlc-complete/templates/flow-patterns/sop-template.md - Template for encoding SOPs
- @agentic/code/frameworks/sdlc-complete/templates/flow-patterns/requirements-sop-example.md - Concrete example

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Implementation Agent (#99) | Initial guide based on MetaGPT REF-013 |

---

**Document Status**: Complete
**Issue**: #99 - MetaGPT SOP Templates
**Research Basis**: REF-013 MetaGPT (ICLR 2024)
