# REF-002 AIWG Analysis

> **Source Paper**: [How Do LLMs Fail In Agentic Scenarios?](https://arxiv.org/pdf/2512.07497)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: 2026-01-24

## Overview

This paper identifies four universal failure archetypes in LLM agentic performance through qualitative analysis of 900 execution traces. The analysis demonstrates that **recovery capability—not initial correctness—is the dominant predictor of success**. This document extracts all AIWG-specific insights for framework enhancement.

## Four Universal Failure Archetypes

### Archetype 1: Premature Action Without Grounding

**Description**: Models guess schemas, table names, or column structures instead of inspecting available data sources.

**Examples**:
- Assumes CSV column names without using `head` command
- Guesses database table/column names instead of using schema inspection tools
- Proceeds with queries before validating filter values exist

**AIWG Application**: Add grounding checkpoint validation gate.

### Archetype 2: Over-Helpfulness Under Uncertainty

**Description**: When faced with missing or ambiguous entities, models autonomously substitute plausible alternatives instead of returning null/zero or requesting clarification.

**Examples**:
- Substitutes "Acme Inc." when "Acme Corp" not found in database
- Changes missing company filter to "all companies" rather than returning 0
- Replaces inactive status interpretation as STATUS != 'active' instead of literal 'inactive'

**AIWG Application**: Add uncertainty escalation gate—default to null/zero for missing data unless explicitly instructed otherwise.

### Archetype 3: Distractor-Induced Context Pollution

**Description**: Irrelevant data in context derails reasoning, causing models to incorporate distractor information into solutions.

**Examples**:
- Uses Q1-Q3 data when asked only for Q4
- Multiplies BASE_PRICE × ORDER_AMT when ORDER_AMT already represents revenue
- Fixates on irrelevant tables in multi-table scenarios

**AIWG Application**: Implement context curator pattern to filter distractors before task execution.

### Archetype 4: Fragile Execution Under Load

**Description**: Coherence loss, generation loops, malformed tool calls, or execution failures under cognitive load.

**Examples**:
- Multi-step SQL joins cause alias confusion
- In-lining large CSV/text data triggers generation loops
- Repeated tool call formatting errors (missing closing braces)
- Off-by-one errors in manual line extraction

**AIWG Application**: Implement recovery protocol gate with structured PAUSE → DIAGNOSE → ADAPT → RETRY → ESCALATE pattern.

## AIWG Framework Mapping

### Quality Gates

#### Grounding Checkpoint (Archetype 1)

**Implementation**:
- Add validation gate: "Has schema been inspected before query construction?"
- Require explicit grounding evidence in agent logs
- Mandate verification before action in tool descriptions

**Location**: `agentic/code/addons/quality-gates/grounding-checkpoint.md`

#### Uncertainty Escalation Gate (Archetype 2)

**Implementation**:
- Detect ambiguous inputs (missing entities, unclear filters)
- Escalate to human review rather than autonomous substitution
- Default to null/zero for missing data unless explicitly instructed otherwise

**Example Prompt Addition**:
```
When requested data is not present:
1. Verify absence (search, list available options)
2. Return explicit null/zero/empty result
3. DO NOT substitute similar alternatives without confirmation
4. If unclear, escalate with: "Data not found. Options: [A, B, C]. Please clarify."
```

**Location**: `agentic/code/addons/quality-gates/uncertainty-escalation.md`

#### Recovery Protocol Gate (Archetype 4)

**Implementation**:
```
PAUSE    → Stop making changes immediately
DIAGNOSE → Analyze error message and root cause
ADAPT    → Design single, targeted fix
RETRY    → Apply fix and verify (max 3 attempts)
ESCALATE → If still failing, request human intervention
```

**Detection Mechanisms**:
- Loop detection (repetitive token patterns)
- Output length monitoring (>8K tokens indicates data in-lining)
- Coherence metrics (unusual patterns)

**Location**: `agentic/code/addons/quality-gates/recovery-protocol.md`

### Context Curator Pattern (Archetype 3)

**Implementation**:
```
1. Identify explicit task scope (time, entity, operation)
2. Score context sections:
   - RELEVANT: Directly supports task
   - PERIPHERAL: May be useful for edge cases
   - DISTRACTOR: Similar but out of scope
3. Process RELEVANT first
4. Access PERIPHERAL only if needed
5. Never incorporate DISTRACTOR into reasoning
```

**Example Validation**:
- Task: "Calculate Q4 revenue"
- RELEVANT: Q4 data, revenue columns
- PERIPHERAL: Annual summaries, Q3 carryover
- DISTRACTOR: Q1-Q3 detailed data, unrelated products

**Location**: `agentic/code/addons/context-curator/filter-distractors.md`

## Validation Patterns

### Error Handling Framework

**Classification**:
- **Syntax**: Malformed tool calls, JSON errors
- **Schema**: Wrong column names, missing tables
- **Logic**: Semantic errors, wrong operations
- **Loop**: Repetitive patterns, coherence collapse

**Recovery Strategy Mapping**:
- Syntax → Provide explicit format example
- Schema → Mandate schema inspection
- Logic → Request explicit reasoning chain
- Loop → Pause, summarize state, suggest fresh approach

**Location**: `agentic/code/addons/resilience/error-handling-framework.md`

## Success Metrics

| Metric | Target | Maps to Archetype |
|--------|--------|-------------------|
| Grounding compliance rate | >90% | Archetype 1 |
| Entity substitution rate | <5% | Archetype 2 |
| Distractor error reduction | ≥50% | Archetype 3 |
| Recovery success rate | ≥80% | Archetype 4 |
| Schema inspection before query | 100% | Archetype 1 |
| Verification of assumptions | >85% | All |

**Implementation**: Add metrics collection to observability addon.

**Location**: `agentic/code/frameworks/sdlc-complete/metrics/archetype-validation.json`

## Model Performance Insights

### Key Finding: Recovery > Scale

| Model | Parameters | KAMI Score | Recovery Capability |
|-------|------------|------------|---------------------|
| DeepSeek V3.1 | 671B | 92.2% | **Very High** |
| Llama 4 Maverick | 400B | 74.6% | **Medium** |
| Granite 4 Small | 32B | 58.5% | **Low** |

**Implication for AIWG**: Model selection should prioritize recovery behavior over raw scale or benchmark scores.

**Quote**: "Recovery capability—not initial correctness—is the dominant predictor of agentic task success."

## Improvement Opportunities for AIWG

### Gap Identified: Archetype 3 Not Adequately Addressed

**Current AIWG**: No explicit distractor filtering mechanism.

**Recommended Addition**:
- **Context Curator & Distractor Filter addon**
- Pre-filters context before task execution
- Relevance scoring for context sections
- Scoped reasoning prompts
- Path-filtered rules for distractor awareness

### Enhancements to Existing Components

#### Agent Design Bible
- Add "Grounding Checkpoint" rule
- Add "Escalate Uncertainty" rule
- Reference archetypes in agent design guidance

#### Resilience Primitives
- Add structured recovery protocol
- Implement loop detection
- Add coherence monitoring

#### Evals Framework
- Include KAMI-style archetype tests
- Measure recovery behavior
- Track context pollution vulnerability

## Mitigation Strategies

### 1. Tool and Prompt Design

**Mandate Verification Before Action**:
```
Before querying database tables, you MUST use sqlite_get_schema
to inspect actual table and column names. Never assume schema.
```

**Design Error Messages to Suggest Fixes**:
- Not: "Error: Column not found"
- But: "Error: Column 'ORD_ID' not found. Use sqlite_get_schema to see available columns."

### 2. Context Engineering

**Aggressive Curation**:
- Provide explicit enumerations of valid categorical values
- Filter distractors before context loading
- Use scoped reasoning prompts to enforce task boundaries

**Example**: For region filtering, include `Valid regions: [North, South, East, West, Midwest]` in prompt.

### 3. Architectural Safeguards

**Verification Checkpoints**:
- Require explicit confirmation of assumptions before dependent actions
- Validate results before final output

**Runtime Monitoring**:
- Detect generation loops (repetitive token patterns)
- Monitor output lengths (>8K tokens indicates data in-lining)
- Catch coherence degradation signals

### 4. Model Selection Criteria

**Evaluate Beyond First-Pass Accuracy**:
- Test behavior under error conditions
- Assess recovery from malformed tool calls
- Include distractor scenarios in evaluation

**Quote**: "A model that fails gracefully and recovers reliably may be preferable to one with higher initial accuracy but brittle error handling."

## KAMI v0.1 Intervention Examples

**Q502 vs. Q602 Comparison**:

Adding explicit instruction:
> "Begin by examining the schema to find relevant columns, and then do your analysis. Note that if the requested company data is not present in the database, then assume the answer is 0 for the relevant question."

**Result**: DeepSeek V3.1 success rate increased from 52.92% to 87.50%

**Impact**: "Confusion over missing 'company' data was almost completely removed, and schema guessing was completely removed."

## Four Emergent Principles

### 1. Scale ≠ Reliability

> "Model size alone does not predict agentic reliability; post-training optimization for verification and recovery is the differentiator."

**Evidence**: Llama 4 Maverick (400B) vs. Granite 4 Small (32B) showed marginal difference in uncertainty tasks.

### 2. Recovery is Dominant

> "Crucially, recovery capability - not initial correctness - best predicts overall success."

**Evidence**: DeepSeek V3.1's 92.2% stems from consistent error correction, not error avoidance.

### 3. Context Quality > Context Quantity

**Evidence**: Distractors cause systematic failures across all models. Even DeepSeek V3.1 fails 10/30 in Q503 due to context pollution.

**Quote**: "This switches the challenge from just 'how can we retrieve available related data?' to 'how do we only retrieve the highest quality and most relevant data for the task?'"

### 4. Source-of-Truth Alignment Critical

**Requirement**: Models must prioritize actual data over priors.

**Evidence**: Schema guessing failures across all models; Llama 4 Maverick context confusion.

## Implementation Checklist

### Quality Gates

- [ ] **Grounding Checkpoint** - Validate schema inspection before queries
- [ ] **Uncertainty Escalation** - Detect ambiguous inputs, default to null/zero
- [ ] **Recovery Protocol** - Structured PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE
- [ ] **Context Curator** - Filter distractors, score relevance

### Validation Patterns

- [ ] **Error Classification** - Syntax | Schema | Logic | Loop
- [ ] **Recovery Strategy Mapping** - Match strategy to error type
- [ ] **Success Metrics** - Track grounding compliance, entity substitution, recovery rate

### Agent Enhancements

- [ ] **Grounding Rules** - Mandatory inspection before action
- [ ] **Uncertainty Handling** - Escalation protocol for missing data
- [ ] **Recovery Training** - Structured error response patterns
- [ ] **Context Filtering** - Distractor awareness prompts

### Monitoring

- [ ] **Loop Detection** - Repetitive pattern alerts
- [ ] **Output Length** - >8K token warnings
- [ ] **Coherence Metrics** - Degradation signals
- [ ] **Recovery Success** - Track per archetype

## Related AIWG Components

| Component | Relevance |
|-----------|-----------|
| `@agentic/code/addons/quality-gates/` | Implementation location for archetype validators |
| `@agentic/code/addons/resilience/` | Recovery patterns and error handling |
| `@agentic/code/addons/context-curator/` | Distractor filtering (new) |
| `@agentic/code/frameworks/sdlc-complete/docs/resilience-patterns.md` | Recovery protocol documentation |
| `@.aiwg/planning/roig-2025-gap-analysis.md` | Detailed gap analysis |

## Key Quotes

### On Recovery Importance

> "DeepSeek V3.1's superiority does not come from avoiding errors, but from consistently recognizing, explaining, and correcting them."

> "Error feedback is the new frontier for autonomy. Post-training models must internalize tool semantics and system constraints."

### On Context Pollution

> "DeepSeek V3.1 is not immune - 10/30 trials failed this way. This 'Chekhov's gun' tendency suggests that even the biggest and more modern LLMs are not yet robust to information overload."

> "The presence of distractor files or tables triggers semantic overreach: agents attempt to incorporate irrelevant data."

### On Helpfulness Alignment

> "While well-intentioned, this violates task fidelity - especially in enterprise contexts where '0' is the correct answer for missing data. This behavior appears to stem from alignment tuning that over-optimizes for helpfulness and completion fluency, not precision under uncertainty."

### On Failure Mode Universality

> "These patterns highlight the need for agentic evaluation methods that emphasize interactive grounding, recovery behavior, and environment-aware adaptation."

## Practical Recommendations

### For Enterprise Deployment

1. **Mandate Verification in Tool Descriptions**: Tool descriptions should explicitly require schema inspection before queries
2. **Provide Valid Value Enumerations**: Where categorical filtering required, include explicit lists of valid values
3. **Implement Verification Checkpoints**: Require confirmation of assumptions before dependent actions
4. **Design Error Messages for Recovery**: Messages should suggest corrective paths, not just indicate failure
5. **Monitor Generation Anomalies**: Detect repetitive patterns, unusual lengths, coherence drops
6. **Evaluate Recovery Behavior**: Select models based on error handling, not just accuracy

### For AIWG Framework

1. **Add Grounding Checkpoint addon** - Validate before action
2. **Add Uncertainty Escalation addon** - Handle missing data correctly
3. **Add Context Curator addon** - Filter distractors
4. **Enhance Resilience addon** - Structured recovery protocol
5. **Add Archetype Validators** - Test for all four failure patterns
6. **Update Agent Design Bible** - Reference archetypes and mitigations

## References

- **Source Paper**: Roig, J.V. (2025). [How Do LLMs Fail In Agentic Scenarios?](https://arxiv.org/pdf/2512.07497). arXiv:2512.07497v2
- **AIWG Gap Analysis**: `.aiwg/planning/roig-2025-gap-analysis.md`
- **AIWG Unified Plan**: `.aiwg/planning/production-grade-unified-plan.md`
- **Related Papers**: REF-001 (Production patterns), REF-022 (AutoGen), REF-024 (LATS)
