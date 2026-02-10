# Failure Mode Mitigation

**Document Type**: Research-Backed Design Rationale
**Created**: 2026-01-25
**Status**: Active
**Audience**: Framework developers, technical evaluators

---

## Overview

The AIWG framework incorporates specific mitigations for the four universal failure archetypes identified in LLM agentic research. These archetypes were catalogued through qualitative analysis of 900 agentic execution traces across multiple model sizes (32B to 671B parameters), demonstrating that **failure patterns are universal across scale** and require deliberate design countermeasures (REF-002, Roig 2025).

This document maps each archetype to AIWG's mitigation mechanisms, providing configuration examples and verification approaches.

---

## Research Foundation

### Source Study

**REF-002**: Roig, J.V. (2025). How Do LLMs Fail In Agentic Scenarios? A Qualitative Analysis of Success and Failure Scenarios of Various LLMs in Agentic Simulations. arXiv:2512.07497v2.

**Key Finding**: Recovery capability—not initial correctness—is the dominant predictor of agentic task success. DeepSeek V3.1 achieves 92.2% success through post-training reinforcement learning for verification and recovery, not architectural changes.

**Benchmark**: KAMI v0.1 - Interactive, multi-step tasks with randomized parameters across filesystem, text extraction, CSV analysis, and SQL scenarios.

### Four Universal Failure Archetypes

| Archetype | Description | Prevalence |
|-----------|-------------|------------|
| **1. Premature Action Without Grounding** | Guesses schemas/values instead of inspecting data sources | All models |
| **2. Over-Helpfulness Under Uncertainty** | Substitutes plausible alternatives when data missing | All models |
| **3. Distractor-Induced Context Pollution** | Incorporates irrelevant context into reasoning | All models |
| **4. Fragile Execution Under Load** | Coherence loss, loops, malformed outputs under complexity | All models |

---

## Archetype 1: Premature Action Without Grounding

### Problem Description

Models proceed with actions based on assumed information rather than verifying actual data sources. This manifests as:

- Guessing database table/column names instead of schema inspection
- Assuming CSV column headers without using `head` command
- Proceeding with queries before validating filter values exist

**Research Evidence** (REF-002, p. 8):
> "The model repeatedly guesses table and column names instead of inspecting the schema, leading to avoidable errors, incorrect JOIN logic, and misinterpretations such as using ORD_ID instead of ORD_AMT."

**Impact**: Silent failures, semantic confusion, cascading errors from incorrect assumptions.

### AIWG Mitigations

#### 1.1 Structured Prompts with Verification Requirements

Agent definitions include explicit grounding requirements in their prompts:

```markdown
## Operational Rules

Before querying any data source:
1. **Verify schema** - Use inspection tools (sqlite_get_schema, head, describe)
2. **Validate assumptions** - Confirm filter values exist in data
3. **Document evidence** - Record schema/structure in reasoning

You MUST NOT proceed based on assumed schemas. If schema inspection fails, STOP and report.
```

**Location**: `@agentic/code/frameworks/sdlc-complete/agents/*/README.md`

#### 1.2 Phase Boundaries with Grounding Gates

SDLC phase transitions include explicit grounding validation:

```yaml
# Phase gate: Elaboration → Construction
gate_criteria:
  - name: "Architecture grounded"
    check: "SAD references actual codebase structure"
    evidence: "System context diagram matches `src/` layout"
  - name: "Requirements validated"
    check: "Use cases reference actual APIs/data models"
    evidence: "UC-XXX cites existing interfaces"
```

**Location**: `@.aiwg/flows/*/gate-checks/*.md`

#### 1.3 Focused Agents with Bounded Context

Each of AIWG's 53 specialized agents operates within a defined scope, reducing the likelihood of operating on assumed external data:

| Agent Type | Scope Boundary | Grounding Source |
|------------|----------------|------------------|
| Architecture Designer | `.aiwg/architecture/` | Existing codebase |
| Test Engineer | `test/` directory | Source code under test |
| API Designer | API specification files | Schema definitions |
| Security Auditor | Threat model + code | OWASP references |

**Location**: `@agentic/code/frameworks/sdlc-complete/agents/manifest.json`

### Configuration Example

```yaml
# Agent configuration with grounding requirements
agent:
  name: "data-analyst"
  grounding_requirements:
    mandatory_inspection:
      - tool: "schema_get"
        before: "any database query"
      - tool: "head"
        before: "CSV column references"
    verification_prompt: |
      Before proceeding, confirm you have:
      [ ] Inspected actual data source schema
      [ ] Verified column names match data
      [ ] Validated filter values exist
```

### Verification Approach

**Metric**: Grounding compliance rate
**Target**: >90%
**Measurement**: Audit agent traces for schema inspection before queries

```bash
# Check agent trace for grounding evidence
grep -E "schema_get|sqlite_get_schema|head -n" .aiwg/working/agent-trace.log | wc -l
```

---

## Archetype 2: Premature Conclusion

### Problem Description

Models stop before completing tasks, either by:
- Returning plausible but incomplete answers
- Substituting alternatives when expected data is missing
- Declaring success without verifying completion criteria

**Research Evidence** (REF-002, p. 18):
> "The model searches for a requested company, determines it does not exist (correctly identifies via LIKE query or company list), then autonomously decides to substitute a similar company name without explicit instruction to do so."

**Additional Research** (REF-002, p. 28):
> "This behavior appears to stem from alignment tuning that over-optimizes for helpfulness and completion fluency, not precision under uncertainty."

**Impact**: Violates task fidelity, produces plausible but incorrect outputs, dangerous in enterprise contexts where "0" is the correct answer for missing data.

### AIWG Mitigations

#### 2.1 Explicit Completion Criteria (Ralph Loop)

The Ralph iterative execution loop requires explicit success criteria before starting:

```bash
# Ralph command with completion criteria
aiwg ralph "Fix all failing tests" --completion "npm test passes"
```

**Iteration Pattern**:
1. Analyze current state
2. Plan next step
3. Execute step
4. **Verify progress against criteria**
5. **Check completion criteria**
6. Repeat or finish

**Location**: `@docs/cli-reference.md#ralph-commands`

#### 2.2 Verification Loops

Ralph implements structured verification after each action:

```yaml
# Ralph loop configuration
ralph_loop:
  task: "Implement user authentication"
  completion_criteria: "Auth tests pass"
  max_iterations: 10

  verification:
    after_each_step:
      - "Did this step make progress toward completion?"
      - "Are there remaining blockers?"
      - "Should we continue or escalate?"

    completion_check:
      - "Run completion criteria command"
      - "If pass: terminate loop, report success"
      - "If fail: analyze, plan next step"
```

**Location**: `@.aiwg/ralph/current-loop.json`

#### 2.3 Uncertainty Escalation Protocol

When data is missing or ambiguous, agents escalate rather than substitute:

```markdown
## Uncertainty Handling Rules

When requested data is not present:
1. **Verify absence** - Search, list available options
2. **Return explicit null/zero** - Do NOT substitute similar alternatives
3. **Document gap** - "Data not found: [entity]. Available options: [A, B, C]"
4. **Escalate if unclear** - Request human clarification before proceeding

Default behavior: Return null/zero for missing data unless explicitly instructed otherwise.
```

**Location**: Agent definition templates

#### 2.4 Phase Gate Validation

SDLC phase transitions require explicit completion validation:

```markdown
# Gate Check: Elaboration Phase Completion

## Gate Criteria Checklist

| # | Criterion | Status | Evidence | Notes |
|---|-----------|--------|----------|-------|
| 1 | Use cases specified (UC-RF-*) | ✅ PASS | 10 use cases | UC-RF-001 through UC-RF-010 |
| 2 | NFRs defined (NFR-RF-*) | ✅ PASS | 45 NFRs | 9 categories |
| 3 | Architecture documented (SAD) | ✅ PASS | 4 views | C4 diagrams |
...

## Gate Decision

| Decision | Rationale |
|----------|-----------|
| **✅ PASS** | All 10 elaboration criteria met. 56 artifacts created. |
```

**Location**: `@.aiwg/flows/*/gate-checks/*.md`

### Configuration Example

```yaml
# Completion-aware task configuration
task:
  description: "Generate test suite for auth module"
  completion_criteria:
    - test_count: ">= 15"
    - coverage: ">= 80%"
    - all_tests_pass: true

  on_missing_data:
    behavior: "escalate"  # Not "substitute" or "skip"
    escalation_message: "Missing: {entity}. Please provide or confirm skip."

  on_partial_completion:
    behavior: "report_progress"
    require_explicit_stop: true
```

### Verification Approach

**Metrics**:
- Entity substitution rate: <5%
- Completion criteria validation rate: 100%
- Premature termination rate: <10%

**Measurement**: Track Ralph loop outcomes

```bash
# Check Ralph completion statistics
cat .aiwg/ralph/history/*.json | jq '.outcome' | sort | uniq -c
```

---

## Archetype 3: Wrong Tool Selection

### Problem Description

Models incorporate irrelevant context ("distractors") into reasoning, or select inappropriate tools for tasks. This manifests as:

- Using Q1-Q3 data when asked only for Q4
- Multiplying values when data already represents the target metric
- Fixating on irrelevant tables/files in multi-source scenarios

**Research Evidence** (REF-002, p. 28):
> "This 'Chekhov's gun' tendency suggests that even the biggest and more modern LLMs are not yet robust to information overload; they treat all provided context as signal, not noise."

**Research Evidence** (REF-002, p. 28):
> "The presence of distractor files or tables (e.g., Q403 and Q503) triggers semantic overreach: agents attempt to incorporate irrelevant data."

**Impact**: Systematic errors across all model sizes, demonstrates fundamental vulnerability to information overload.

### AIWG Mitigations

#### 3.1 Capability-Based Dispatch

AIWG uses semantic capability indexing to route tasks to appropriate agents/tools:

```typescript
// Capability-based extension discovery
const index = new CapabilityIndex();
index.index(myExtension);

// Find extensions by capability match
const formatters = index.query({
  all: ['format:markdown'],        // MUST have
  not: ['lint:markdown']           // MUST NOT have
});

// Query returns only relevant extensions
// Distractors filtered by capability mismatch
```

**Location**: `@src/extensions/capability-index.ts`

#### 3.2 Tool Schemas with Input Validation

Each tool declares explicit input/output schemas:

```yaml
# Tool definition with schema
tool:
  name: "generate-tests"
  capabilities: ["test:generate", "test:unit"]

  inputs:
    source_file:
      type: "string"
      required: true
      pattern: "^src/.*\\.ts$"
    test_framework:
      type: "enum"
      values: ["vitest", "jest", "mocha"]

  outputs:
    test_file:
      type: "string"
      pattern: "^test/.*\\.test\\.ts$"

  # Explicit scope prevents using this tool for integration tests
  scope:
    include: ["src/**/*.ts"]
    exclude: ["test/**/*", "*.config.*"]
```

**Location**: `@src/extensions/types.ts`

#### 3.3 Context Curator Pattern

Agents filter context before task execution:

```markdown
## Context Processing Rules

1. **Identify explicit task scope** - Time range, entity, operation type
2. **Score context sections**:
   - **RELEVANT**: Directly supports task
   - **PERIPHERAL**: May be useful for edge cases
   - **DISTRACTOR**: Similar but out of scope
3. **Process order**: RELEVANT first, PERIPHERAL only if needed
4. **Never incorporate DISTRACTOR into reasoning**

Example:
- Task: "Calculate Q4 revenue"
- RELEVANT: Q4 data, revenue columns
- PERIPHERAL: Annual summaries, Q3 carryover
- DISTRACTOR: Q1-Q3 detailed data, unrelated products
```

**Location**: Proposed addon `@agentic/code/addons/context-curator/`

#### 3.4 Single-Responsibility Agents

AIWG's 53 agents follow strict role boundaries:

| Agent | Tools Allowed | Tools Forbidden |
|-------|---------------|-----------------|
| Code Reviewer | Read, Grep | Write, Bash |
| Test Engineer | Read, Write, Bash | Deploy tools |
| Security Auditor | Read, Grep, security scanners | Write (no changes) |
| API Designer | Read, Write (specs only) | Implementation tools |

**Location**: `@agentic/code/frameworks/sdlc-complete/agents/`

### Configuration Example

```yaml
# Distractor-aware agent configuration
agent:
  name: "quarterly-report-analyst"

  context_filtering:
    scope_detection:
      - extract: "time_range"
        from: "task description"
      - extract: "entity_filter"
        from: "task description"

    relevance_scoring:
      relevant:
        - matches: "time_range"
        - matches: "entity_filter"
      distractor:
        - outside: "time_range"
        - unrelated: "entity_filter"

    processing_order: ["relevant", "peripheral"]
    distractor_handling: "exclude_from_context"

  tool_access:
    allowed: ["read_data", "aggregate", "format_output"]
    forbidden: ["write_data", "delete", "modify_schema"]
```

### Verification Approach

**Metrics**:
- Distractor error rate: reduce by >=50%
- Tool selection accuracy: >95%
- Context relevance score: >0.8

**Measurement**: Audit task traces for irrelevant data incorporation

```bash
# Check for distractor mentions in output
grep -E "Q[1-3]|unrelated" .aiwg/working/output.md
# Should return empty for Q4-only task
```

---

## Archetype 4: Fragile Execution Under Load

### Problem Description

Models experience coherence loss, generation loops, or malformed outputs when handling complex multi-step tasks. Symptoms include:

- Multi-step SQL joins causing alias confusion
- In-lining large data blocks triggering generation loops
- Repeated tool call formatting errors
- Hallucination of placeholder values

**Research Evidence** (REF-002, p. 28):
> "Tool call formatting errors, generation loops, and coherence collapse appear most frequently under two conditions: (a) when models inline large data blocks (CSV or text) directly into code, and (b) when they encounter repeated error-recovery cycles."

**Model Performance** (REF-002):
- Llama 4 Maverick: 14/28 Q402 failures from generation loops during Python debugging
- Granite 4 Small: Exhausts max rounds without recovery from JSON errors

**Impact**: Complete task failure, resource exhaustion, unpredictable behavior.

### AIWG Mitigations

#### 4.1 7±2 Decomposition (Miller's Law)

Complex tasks are decomposed to respect cognitive limits:

```yaml
# SDLC phase structure respects 7±2
sdlc_phases:
  count: 4  # Well within 7±2
  inception:
    artifacts: [intake, solution-profile, initial-requirements]  # 3 items
  elaboration:
    artifacts: [use-cases, architecture, test-strategy, risks]    # 4 items
  construction:
    artifacts: [implementation, tests, integration]               # 3 items
  transition:
    artifacts: [deployment, documentation, release]               # 3 items
```

**Research Basis** (REF-005, Miller 1956):
> "The span of absolute judgment and the span of immediate memory impose severe limitations on the amount of information that we are able to receive, process, and remember."

**Location**: `@docs/research/research-background.md`

#### 4.2 Ralph Recovery Protocol

Structured recovery pattern for failed iterations:

```markdown
## Ralph Recovery Protocol

When an iteration fails:

1. **PAUSE** - Stop making changes immediately
2. **DIAGNOSE** - Analyze error message and root cause
   - Classify: Syntax | Schema | Logic | Loop
3. **ADAPT** - Design single, targeted fix
   - Match strategy to error type
4. **RETRY** - Apply fix and verify (max 3 attempts per error type)
5. **ESCALATE** - If still failing, request human intervention

Detection Mechanisms:
- Loop detection: Repetitive token patterns
- Output length monitoring: >8K tokens indicates data in-lining
- Coherence metrics: Unusual patterns trigger review
```

**Location**: `@.aiwg/ralph/recovery-protocol.md`

#### 4.3 Checkpoint and Resume

State is persisted for crash recovery:

```yaml
# Ralph checkpoint structure
checkpoint:
  loop_id: "ralph-rf-2026-01-25"
  iteration: 5
  state: "in_progress"

  task:
    description: "Implement research framework"
    completion_criteria: "All tests pass"

  progress:
    completed_steps:
      - "Foundation infrastructure"
      - "Discovery agent"
      - "Acquisition agent"
    current_step: "Documentation agent"
    remaining_steps:
      - "Citation agent"
      - "Quality agent"

  artifacts_created:
    - ".aiwg/flows/research-framework/elaboration/agents/discovery.md"
    - ".aiwg/flows/research-framework/elaboration/agents/acquisition.md"

  recovery_info:
    last_error: null
    retry_count: 0
    checkpoint_hash: "sha256:abc123..."
```

**Location**: `@.aiwg/ralph/iterations/iteration-NNN-checkpoint.md`

#### 4.4 Coherence Monitoring

Runtime detection of degradation signals:

```yaml
# Coherence monitoring configuration
monitoring:
  loop_detection:
    threshold: 3  # Same pattern repeated 3+ times
    action: "pause_and_diagnose"

  output_length:
    warning: 4000  # tokens
    critical: 8000 # tokens
    action: "prevent_data_inlining"

  coherence_checks:
    - "tool_call_format_valid"
    - "output_structure_intact"
    - "no_placeholder_hallucination"

  on_degradation:
    - "checkpoint_current_state"
    - "reduce_task_complexity"
    - "escalate_if_persistent"
```

#### 4.5 R-LAM Reproducibility Constraints

Deterministic execution modes prevent cascading failures:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Strict** | Same inputs → same outputs | Production workflows |
| **Seeded** | Randomness from fixed seed | Testing, debugging |
| **Logged** | Non-deterministic but fully logged | Exploratory work |
| **Cached** | Results cached for replay | Development |

**Research Basis** (REF-058, Sureshkumar 2026):
- 47% of workflows without constraints produce different outputs
- R-LAM achieves 98% output consistency vs 53% baseline

**Location**: `@.aiwg/research/paper-analysis/REF-058-aiwg-analysis.md`

### Configuration Example

```yaml
# Complexity-aware task configuration
task:
  description: "Implement multi-table analytics"

  complexity_management:
    max_steps_per_iteration: 5
    max_context_size: 16000  # tokens
    prevent_data_inlining: true

  recovery:
    checkpoint_frequency: "every_step"
    max_retries_per_error: 3
    escalation_threshold: 2  # errors in same category

  execution:
    mode: "strict"
    timeout_per_step: 300  # seconds
    coherence_monitoring: true

  decomposition:
    strategy: "hierarchical"
    max_items_per_level: 7
```

### Verification Approach

**Metrics**:
- Recovery success rate: >=80%
- Loop occurrence rate: <5%
- Coherence collapse rate: <2%
- Checkpoint restore success: >99%

**Measurement**: Track Ralph loop execution patterns

```bash
# Check recovery statistics
cat .aiwg/ralph/history/*.json | jq '{
  total: length,
  recoveries: [.[] | select(.had_recovery)] | length,
  loops: [.[] | select(.detected_loop)] | length
}'
```

---

## Cross-Archetype Mitigations

### Multi-Agent Review Panels

Self-consistency through diverse perspectives (REF-017, Wang 2023):

```markdown
Architecture Review Panel:
  - Security Auditor (threat perspective)
  - Performance Architect (scalability perspective)
  - Maintainability Reviewer (evolution perspective)
  → Synthesizer aggregates consensus findings
```

**Benchmark Result**: 17.9% improvement with multi-path review on GSM8K.

### Tree of Thoughts for Planning

Deliberate search over options (REF-020, Yao 2023):

```markdown
ADR Template (ToT-inspired):
  1. Options Considered (3-5 alternatives)
  2. Evaluation Criteria (specific, measurable)
  3. Trade-off Analysis (each option vs criteria)
  4. Decision & Rationale (selected + reasoning)
  5. Backup Strategy (if primary fails)
```

**Benchmark Result**: 18.5x improvement on planning tasks (Game of 24).

### ReAct Pattern for Grounding

Interleaved reasoning and tool use (REF-018, Yao 2023):

```markdown
Agent Loop:
  Thought → Action → Observation → Thought → ...

Example:
  Thought: "Need to verify table schema before query"
  Action: sqlite_get_schema("orders")
  Observation: "columns: [id, customer_id, amount, date]"
  Thought: "Amount column exists, can proceed with aggregation"
```

**Benchmark Result**: 0% hallucination vs 56% for CoT-only on fact-based tasks.

---

## Success Metrics Summary

| Metric | Target | Maps to Archetype |
|--------|--------|-------------------|
| Grounding compliance rate | >90% | Archetype 1 |
| Schema inspection before query | 100% | Archetype 1 |
| Entity substitution rate | <5% | Archetype 2 |
| Completion criteria validation | 100% | Archetype 2 |
| Distractor error reduction | >=50% | Archetype 3 |
| Tool selection accuracy | >95% | Archetype 3 |
| Recovery success rate | >=80% | Archetype 4 |
| Loop occurrence rate | <5% | Archetype 4 |
| Verification of assumptions | >85% | All |

---

## Implementation Status

| Mitigation | Status | Location |
|------------|--------|----------|
| Structured prompts | Implemented | Agent definitions |
| Phase boundaries | Implemented | `.aiwg/flows/*/gate-checks/` |
| Focused agents | Implemented | 53 agents in catalog |
| Ralph verification loops | Implemented | `aiwg ralph` command |
| Uncertainty escalation | Partial | Agent prompts |
| Capability-based dispatch | Implemented | `src/extensions/capability-index.ts` |
| Tool schemas | Implemented | `src/extensions/types.ts` |
| Context curator | Proposed | Planned addon |
| 7±2 decomposition | Implemented | SDLC structure |
| Checkpoint/resume | Implemented | `.aiwg/ralph/` |
| Coherence monitoring | Partial | Ralph loop |
| R-LAM execution modes | Partial | Temperature settings |

---

## References

- @docs/references/REF-002-llm-failure-modes-agentic.md - Source study on failure archetypes
- @.aiwg/research/paper-analysis/REF-002-aiwg-analysis.md - AIWG-specific analysis
- @docs/research/research-background.md - Full research foundation
- @docs/references/REF-017-self-consistency-reasoning.md - Multi-path review
- @docs/references/REF-018-react-reasoning-acting.md - ReAct pattern
- @docs/references/REF-020-tree-of-thoughts-planning.md - Planning with search
- @docs/references/REF-058-rlam-reproducibility.md - Reproducibility constraints
- @docs/references/REF-005-millers-law-cognitive-limits.md - 7±2 principle
- @src/extensions/capability-index.ts - Capability-based dispatch implementation
- @docs/cli-reference.md#ralph-commands - Ralph command reference

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-25 | Initial document covering four archetypes | Technical Writer |

---

## Document Profile

| Attribute | Value |
|-----------|-------|
| Document Type | Research-Backed Design Rationale |
| Intended Audience | Framework developers, technical evaluators |
| Formality | High (academic/technical) |
| Citation Style | Inline with REF-XXX identifiers |
| Review Status | Draft |
