# LLM Failure Archetype Mitigations

> Based on REF-002: Systematizing Failures in LLMs
> Issue: #242

## Overview

This document maps LLM failure archetypes identified in research to AIWG mitigation strategies. LLM failures fall into 5 categories with 17 archetypes.

## Category 1: Prompt Sensitivity

### A1. Format Sensitivity

**Symptom**: Agent output varies with minor prompt formatting changes

**Mitigation**:
- Use canonical prompt templates in `agentic/code/frameworks/sdlc-complete/agents/*/instructions.md`
- Validate agent outputs with structured parsers
- Store validated prompts in version control

**AIWG Implementation**:
```yaml
# Agent template validation
validation:
  prompt_templates:
    enforce_canonical: true
    template_path: "agentic/code/frameworks/sdlc-complete/agents/{role}/instructions.md"
    deviation_tolerance: 0.1  # 10% maximum deviation
```

### A2. Instruction Ambiguity

**Symptom**: Vague instructions lead to inconsistent agent behavior

**Mitigation**:
- Use `## Task` sections with explicit acceptance criteria
- Provide examples in agent instructions
- Reference concrete artifacts via @-mentions

**AIWG Implementation**:
```markdown
## Task

**Objective**: [Clear, measurable goal]

**Acceptance Criteria**:
- [ ] Criterion 1 with specific metric
- [ ] Criterion 2 with verifiable outcome

**Context**: @.aiwg/requirements/UC-001.md

**Examples**:
- Input: [sample input]
- Expected Output: [sample output]
```

### A3. Prompt Injection Vulnerability

**Symptom**: Malicious input hijacks agent behavior

**Mitigation**:
- Sanitize user inputs before agent processing
- Use structured input schemas
- Implement output validation

**AIWG Implementation**:
```yaml
# Input sanitization rules
input_validation:
  sanitize_user_content: true
  blocked_patterns:
    - "ignore previous instructions"
    - "system prompt:"
    - "you are now"
  max_input_length: 10000
```

---

## Category 2: Task Challenges

### B1. Complexity Overload

**Symptom**: Agent fails on multi-step reasoning tasks

**Mitigation**:
- Break tasks into atomic subtasks (Ralph loop decomposition)
- Use chain-of-thought prompting
- Implement task-level checkpoints

**AIWG Implementation**:
```yaml
# Ralph task decomposition
task_decomposition:
  complexity_threshold: 5  # Max complexity score
  decomposition_strategy: recursive
  checkpoint_on_subtask: true

# Agent instruction pattern
reasoning_pattern: |
  ## Reasoning Process

  Before taking action, think step by step:
  1. What is the specific goal?
  2. What information do I need?
  3. What are the dependencies?
  4. What could go wrong?
```

### B2. Reasoning Chain Breaks

**Symptom**: Agent loses track of multi-step reasoning

**Mitigation**:
- Explicit state tracking in prompts
- Periodic summarization of progress
- Working memory persistence

**AIWG Implementation**:
```yaml
# Working memory management
working_memory:
  persist_between_turns: true
  summarize_every: 5  # turns
  state_template: |
    ## Current State
    - Phase: {phase}
    - Completed: {completed_tasks}
    - Remaining: {remaining_tasks}
    - Blockers: {blockers}
```

### B3. Planning Failures

**Symptom**: Agent makes suboptimal or infeasible plans

**Mitigation**:
- Structured planning templates
- Plan validation before execution
- Iterative plan refinement

**AIWG Implementation**:
```yaml
# Plan validation
planning:
  require_validation: true
  validation_checks:
    - feasibility
    - dependency_ordering
    - resource_availability
  allow_plan_revision: true
  max_revisions: 3
```

---

## Category 3: Context Handling

### C1. Context Length Limitations

**Symptom**: Agent performance degrades with large context windows

**Mitigation**:
- Summarize historical context in Ralph loop
- Use semantic chunking for large artifacts
- Reference artifacts via @-mentions instead of inline content

**AIWG Implementation**:
```yaml
# Context budget management (per rag-context-management.yaml)
context_budget:
  max_tokens: 100000
  allocation:
    primary_context: 50%
    supporting_context: 30%
    reference_context: 15%
    history_context: 5%
  overflow_strategy: summarize
```

### C2. Context Priority Inversion

**Symptom**: Agent focuses on recent context over critical information

**Mitigation**:
- Use `## CRITICAL CONTEXT` sections in prompts
- Pin key artifacts at top of agent instructions
- Implement attention-weighted context loading

**AIWG Implementation**:
```yaml
# Context prioritization
context_priority:
  pinned_sections:
    - "## CRITICAL CONTEXT"
    - "## Constraints"
    - "## Security Requirements"
  priority_weights:
    pinned: 1.0
    recent: 0.8
    historical: 0.5
```

### C3. Lost-in-the-Middle

**Symptom**: Agent ignores information in middle of long contexts

**Mitigation**:
- Place critical information at beginning and end
- Use structured sections with clear headers
- Repeat key constraints in multiple locations

**AIWG Implementation**:
```yaml
# Context structure pattern
context_structure:
  opening:
    - critical_constraints
    - task_objective
  middle:
    - supporting_context
    - examples
  closing:
    - reminder_of_constraints
    - acceptance_criteria
```

---

## Category 4: Performance Trade-offs

### D1. Speed vs Accuracy

**Symptom**: Fast responses lack depth, thorough responses timeout

**Mitigation**:
- Use tiered agent models: Opus for complex, Sonnet for routine
- Implement time budgets with fallback to cached responses
- Prefetch common agent responses

**AIWG Implementation**:
```yaml
# Model tiering
model_selection:
  complexity_routing:
    high: claude-opus-4
    medium: claude-sonnet-4
    low: claude-haiku
  time_budget:
    default: 120s
    complex_task: 300s
  fallback:
    on_timeout: cached_response
```

### D2. Cost vs Quality

**Symptom**: Cost optimization degrades output quality

**Mitigation**:
- Token efficiency tracking (per agent-efficiency.yaml)
- Quality gates before accepting outputs
- Budget allocation per task priority

**AIWG Implementation**:
```yaml
# Cost-quality balance
cost_management:
  track_tokens_per_task: true
  quality_gates:
    - validation_pass
    - coverage_threshold
  budget_by_priority:
    critical: unlimited
    high: 50000_tokens
    medium: 20000_tokens
    low: 5000_tokens
```

---

## Category 5: Model Limitations

### E1. Knowledge Cutoff

**Symptom**: Agent lacks awareness of recent technologies

**Mitigation**:
- Provide context via @-mentions to up-to-date documentation
- Use RAG for technical documentation
- Maintain knowledge base in `.aiwg/knowledge/`

**AIWG Implementation**:
```yaml
# Knowledge augmentation
knowledge_augmentation:
  rag_enabled: true
  knowledge_sources:
    - ".aiwg/research/corpus/"
    - ".aiwg/knowledge/"
    - "docs/"
  update_frequency: weekly
```

### E2. Arithmetic Errors

**Symptom**: Agent makes calculation mistakes

**Mitigation**:
- Delegate calculations to tools (jq, bc, calculator MCP)
- Validate numeric outputs with assertions
- Use structured data formats (JSON schema validation)

**AIWG Implementation**:
```yaml
# Calculation delegation
calculations:
  delegate_to_tools: true
  available_tools:
    - jq
    - bc
    - calculator-mcp
  validate_outputs: true
```

### E3. Hallucination

**Symptom**: Agent generates false or fabricated information

**Mitigation**:
- Retrieval-first citation policy (per citation-integrity.yaml)
- Corpus whitelist enforcement
- Grounding agent validation

**AIWG Implementation**:
```yaml
# Hallucination prevention
hallucination_prevention:
  citation_policy: retrieval_first
  corpus_whitelist: ".aiwg/research/corpus/"
  grounding_validation: true
  on_unsupported_claim: mark_citation_needed
```

### E4. Sycophancy

**Symptom**: Agent agrees with user even when incorrect

**Mitigation**:
- Explicit disagreement prompting
- Require evidence for claims
- Independent validation passes

**AIWG Implementation**:
```yaml
# Anti-sycophancy measures
objectivity:
  require_evidence: true
  allow_disagreement: true
  validation_prompt: |
    Before agreeing, verify:
    1. Is this claim supported by evidence?
    2. Are there counterarguments?
    3. What assumptions are being made?
```

### E5. Inconsistent Outputs

**Symptom**: Same input produces different outputs

**Mitigation**:
- Temperature control (lower for determinism)
- Structured output schemas
- Seed values for reproducibility

**AIWG Implementation**:
```yaml
# Output consistency
consistency:
  temperature:
    deterministic_tasks: 0.0
    creative_tasks: 0.7
  use_structured_outputs: true
  seed: reproducible  # Use consistent seed when available
```

---

## Mitigation Summary Matrix

| Archetype | AIWG Feature | Schema Reference |
|-----------|--------------|------------------|
| A1. Format Sensitivity | Canonical templates | agent-efficiency.yaml |
| A2. Instruction Ambiguity | Structured task sections | SDLC templates |
| A3. Prompt Injection | Input validation | quality-assurance.yaml |
| B1. Complexity Overload | Ralph decomposition | reliability-patterns.yaml |
| B2. Reasoning Chain Breaks | Working memory | agent-efficiency.yaml |
| B3. Planning Failures | Plan validation | SDLC flows |
| C1. Context Length | Budget management | rag-context-management.yaml |
| C2. Priority Inversion | Context pinning | rag-context-management.yaml |
| C3. Lost-in-the-Middle | Structured sections | rag-context-management.yaml |
| D1. Speed vs Accuracy | Model tiering | agent-efficiency.yaml |
| D2. Cost vs Quality | Token tracking | agent-efficiency.yaml |
| E1. Knowledge Cutoff | RAG augmentation | rag-context-management.yaml |
| E2. Arithmetic Errors | Tool delegation | MCP tools |
| E3. Hallucination | Retrieval-first | citation-integrity.yaml |
| E4. Sycophancy | Evidence requirements | quality-assurance.yaml |
| E5. Inconsistency | Temperature control | agent-efficiency.yaml |

---

## Validation Command

```bash
# Check LLM reliability mitigations
aiwg doctor --llm-reliability

# Output:
# ✓ Canonical templates configured
# ✓ Context budget management enabled
# ✓ Citation integrity enforced
# ✓ Token tracking active
# ⚠ Model tiering not configured (optional)
```

---

## References

- @.aiwg/research/findings/REF-002-llm-failures.md - Failure taxonomy
- @.aiwg/research/findings/REF-001-agentic-ai-production.md - Production patterns
- @.aiwg/flows/schemas/quality-assurance.yaml - Quality framework
- @.aiwg/flows/schemas/citation-integrity.yaml - Citation integrity
- @.aiwg/flows/schemas/rag-context-management.yaml - Context management
- @.aiwg/flows/schemas/agent-efficiency.yaml - Agent efficiency
