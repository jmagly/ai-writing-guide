# REF-016 AIWG Analysis: Chain-of-Thought Prompting

**Source**: @/tmp/research-papers/documentation/references/REF-016-chain-of-thought-prompting.md

**Paper**: Wei, J., Wang, X., Schuurmans, D., Bosma, M., Ichter, B., Xia, F., Chi, E., Le, Q., & Zhou, D. (2022). Chain-of-Thought Prompting Elicits Reasoning in Large Language Models. *NeurIPS 2022*.

**AIWG Relevance**: CRITICAL - foundational for structured reasoning

---

## AIWG Implementation Mapping

| CoT Element | AIWG Implementation |
|-------------|---------------------|
| Exemplar steps | Template structure with numbered procedures |
| Intermediate outputs | Phase artifacts (requirements → design → code) |
| Explicit reasoning | Agent system prompts with reasoning patterns |
| Decomposition | Task breakdown in orchestration flows |

### Why AIWG Benefits

1. **Template Design**: Structured templates encode CoT-style step-by-step thinking
2. **Flow Commands**: `/flow-*` commands encode multi-step procedures as exemplars
3. **Artifact Progression**: Each phase output is an "intermediate step"
4. **Review Prompts**: Request explicit reasoning in agent feedback

### Integration Pattern

```markdown
# AIWG Template with CoT Structure

## Step 1: Understand Context
- What are the inputs?
- What constraints exist?

## Step 2: Analyze Requirements
- Break down user request
- Identify implicit needs

## Step 3: Design Approach
- Consider alternatives
- Select best option with rationale

## Step 4: Implement
- Execute selected approach
- Document decisions
```

---

## Key Findings Relevant to AIWG

### Emergent Ability of Scale

| Model Size | CoT Effect |
|------------|-----------|
| <10B | **Hurts** performance |
| 10B-100B | Marginal/inconsistent |
| >100B | **Significant improvement** |

**Implication for AIWG**: Chain-of-thought prompting is an emergent ability - works only with models >100B parameters.

### Benchmark Results (PaLM 540B)

| Task | Standard | + CoT | Improvement |
|------|----------|-------|-------------|
| GSM8K (math) | 17.9% | 56.9% | **+39.0%** |
| StrategyQA | 68.6% | 77.8% | +9.2% |
| Date Understanding | 49.0% | 65.3% | +16.3% |

**Key Insight**: CoT has larger performance gains for more-complicated problems.

### Four Properties of Chain-of-Thought

1. **Decomposition**: Allows breaking multi-step problems into intermediate steps
2. **Interpretability**: Provides window into model behavior
3. **Generality**: Applicable to any task humans solve via language
4. **Simplicity**: No training required - works with off-the-shelf models

---

## AIWG Application Areas

### Template Design

AIWG templates should encode CoT-style reasoning:
- Numbered steps guiding thought process
- Intermediate decision points
- Explicit rationale documentation
- Progressive artifact building

### Agent System Prompts

Agent definitions should include:
- Step-by-step reasoning patterns
- Thought decomposition examples
- Explicit decision-making criteria
- Intermediate validation checkpoints

### Orchestration Flows

Flow commands (`/flow-*`) implement CoT at workflow level:
- Phase-by-phase progression
- Artifact dependencies as reasoning steps
- Gate checks as validation points
- Iterative refinement loops

### Review and Validation

Multi-agent review patterns benefit from CoT:
- Reviewers explain reasoning in structured steps
- Explicit criteria evaluation
- Documented thought process
- Traceable decision chains

---

## Cross-References to Other AIWG Papers

| Paper | Relationship |
|-------|-------------|
| **REF-017** | Self-Consistency extends CoT with multi-path sampling |
| **REF-020** | Tree of Thoughts adds branching/backtracking to CoT |
| **REF-018** | ReAct interleaves CoT with tool use |

---

## Implementation Recommendations

### For Agent Definitions

Include reasoning patterns in agent system prompts:

```markdown
## Reasoning Pattern

When analyzing requirements, follow this thought process:

1. **Understand Context**: What problem are we solving?
2. **Identify Constraints**: What limitations exist?
3. **Consider Alternatives**: What approaches are available?
4. **Evaluate Trade-offs**: What are pros/cons of each?
5. **Select Approach**: Which option best fits constraints?
6. **Document Rationale**: Why was this choice made?
```

### For Templates

Structure templates with explicit reasoning steps:

```markdown
## Decision Document Template

### Step 1: Problem Statement
[Describe the decision to be made]

### Step 2: Options Considered
- Option A: [Description + rationale]
- Option B: [Description + rationale]

### Step 3: Evaluation Criteria
[List decision factors]

### Step 4: Analysis
[Evaluate each option against criteria]

### Step 5: Decision
[Selected option with reasoning]
```

### For Flow Commands

Encode multi-step workflows:

```bash
# /flow-inception-to-elaboration

# Step 1: Review intake documents
# (thought: understand project scope)

# Step 2: Generate initial architecture
# (thought: consider system decomposition)

# Step 3: Validate against NFRs
# (thought: check constraints)

# Step 4: Refine based on feedback
# (thought: iterate toward quality gates)
```

---

## Metrics and Validation

### When CoT Helps Most

Three conditions predict maximum benefit:

1. **Task is challenging** - requires multi-step reasoning
2. **Large model** - >100B parameters
3. **Flat scaling curve** - standard prompting doesn't improve with scale

### AIWG Use Cases Where CoT Applies

- Architecture design decisions (complex, multi-step)
- Risk assessment and mitigation planning (requires reasoning)
- Test strategy design (systematic thinking)
- Security threat modeling (deliberate analysis)
- API design (interface trade-offs)

---

## Key Quotes

> "Chain-of-thought prompting is an emergent ability of model scale—it does not positively impact performance until used with a model of sufficient scale." (p. 4)

> "Chain of thought, in principle, allows models to decompose multi-step problems into intermediate steps, which means that additional computation can be allocated to problems that require more reasoning steps." (p. 3)

> "There appears to be utility from expressing intermediate steps via natural language." (p. 6)

---

## Document Status

**Created**: 2026-01-24
**Source Paper**: REF-016
**AIWG Priority**: CRITICAL
**Implementation Status**: Active in templates and flow commands
