# Roig (2025) Gap Analysis: LLM Failure Modes vs AIWG Mitigations

Analysis of arxiv 2512.07497v2 "How Do LLMs Fail In Agentic Scenarios?" against AIWG's planned production-grade improvements.

## Executive Summary

Roig (2025) provides empirical evidence from 900 execution traces identifying four failure archetypes in LLM-based agents. This analysis maps each archetype to AIWG's existing and planned mitigations, identifies gaps, and recommends adjustments to the unified implementation plan.

**Key Finding**: AIWG's planned features address 3 of 4 archetypes well, but **Archetype 3 (Distractor-Induced Context Pollution)** requires a new mitigation not currently in the plan.

## Research Summary

### Study Parameters

- **Benchmark**: KAMI v0.1 (900 execution traces)
- **Domains**: Filesystem navigation, text extraction, CSV manipulation, SQL queries
- **Models Tested**: Granite 4 Small (32B), Llama 4 Maverick (400B), DeepSeek V3.1 (671B)
- **Key Metric**: Recovery capability (not initial correctness) is dominant predictor of success

### Model Performance

| Model | Success Rate | Recovery Rate | Key Behavior |
|-------|--------------|---------------|--------------|
| DeepSeek V3.1 | 92.2% | High | Verification-before-action, structured recovery |
| Llama 4 Maverick | 67.8% | Medium | Verbose reasoning, inconsistent grounding |
| Granite 4 Small | 64.4% | Low | Efficient but brittle, poor recovery |

**Critical Insight**: DeepSeek V3.1's performance comes from post-training RL for verification/recovery, not model scale. Llama 4 Maverick (400B) barely outperforms Granite 4 Small (32B).

## Failure Archetype Analysis

### Archetype 1: Premature Action Without Grounding

**Description**: Models guess schemas, assume file structures, or execute operations without first inspecting the actual state of target systems.

**Example from Paper**: Model assumes `products.csv` has columns `name, price, category` without running `head products.csv` first. When actual columns differ, cascading failures occur.

**AIWG Existing Mitigations**:
- ✅ Agent Design Bible (planned #4): Rule 6 "Verify Before Acting" - establishes grounding requirement
- ✅ Responsibility Linter (#10): Can validate agents include verification steps
- ⚠️ Partial: SDLC agents have implicit verification (e.g., Code Reviewer reads before commenting)

**AIWG Planned Mitigations**:
- ✅ Decompose Helper (#1): Explicit "grounding subtask" in decomposition templates
- ✅ Trace Collector (#6): Post-hoc analysis identifies skipped verification steps

**Gap Assessment**: **ADEQUATE** - Agent Design Bible + Linter + Decompose templates cover this archetype. Add explicit "grounding checkpoint" to decomposition templates.

**Recommendation**: Add to `prompts/reliability/decomposition.md`:
```markdown
## Grounding Checkpoint (Required for External Operations)
Before any operation touching external state (files, APIs, databases):
1. List available inspection tools (ls, head, schema, describe)
2. Execute minimum inspection to confirm assumptions
3. Document confirmed state in working memory
4. Only then proceed with modification operation
```

---

### Archetype 2: Over-Helpfulness Under Uncertainty

**Description**: Models substitute missing or ambiguous data with plausible-sounding alternatives rather than requesting clarification or reporting inability to proceed.

**Example from Paper**: Task requires entity "Acme Corp" but CSV contains "Acme Corporation" and "Acme Inc." - model silently substitutes one, producing incorrect results without flagging uncertainty.

**AIWG Existing Mitigations**:
- ✅ Multi-Agent Pattern: Reviewer agents catch substitutions
- ✅ Requirements Analyst agent: Explicit uncertainty flagging in requirements phase
- ⚠️ Partial: No runtime "uncertainty threshold" mechanism

**AIWG Planned Mitigations**:
- ✅ Consortium Lite (#8): Multi-model consensus catches individual model substitutions
- ✅ Agent Design Bible (#4): Rule 9 "Escalate Uncertainty" - explicit guidance
- ⚠️ Partial: Evals Framework (#7) can test for substitution behavior

**Gap Assessment**: **MOSTLY ADEQUATE** - Consortium + multi-agent review addresses this. Add explicit "substitution detection" prompt to Agent Design Bible.

**Recommendation**: Add to `prompts/agents/design-rules.md`:
```markdown
## Rule 9: Escalate Uncertainty (Extended)

When encountering entity mismatches or ambiguous references:
1. NEVER silently substitute similar-sounding alternatives
2. List all potential matches with confidence scores
3. If no exact match and task requires specific entity:
   - STOP execution
   - Report: "Entity 'X' not found. Similar candidates: [list]"
   - Request clarification before proceeding
4. Document any assumptions in trace output
```

---

### Archetype 3: Distractor-Induced Context Pollution

**Description**: Irrelevant but superficially relevant information derails reasoning. The "Chekhov's gun" effect - if data is in context, models assume it must be relevant.

**Example from Paper**: Task is "Find total revenue for Q4" but context includes Q1-Q3 data. Model incorporates irrelevant quarters, produces incorrect aggregations, despite clear task scope.

**AIWG Existing Mitigations**:
- ⚠️ Weak: Memory system leverage helps but doesn't filter distractors
- ⚠️ Weak: Path-filtered rules reduce context but don't actively curate
- ❌ None: No active distractor filtering mechanism

**AIWG Planned Mitigations**:
- ❌ Not addressed by any planned feature
- ⚠️ Partial: Decompose Helper (#1) scopes subtasks, reducing distractor exposure
- ⚠️ Partial: Parallel-Hints (#2) isolates agent contexts

**Gap Assessment**: **SIGNIFICANT GAP** - This is the archetype least addressed by current plans.

**Recommendation**: Accept consultant's proposed #12 (Context Curator & Distractor Filter):

```markdown
## #12 Context Curator & Distractor Filter (NEW)

**Type**: Addon
**Location**: `addons/context-curator/`
**Priority**: P1 (move from consultant's suggestion)

**Deliverables**:
1. `context-curator` agent: Pre-filters context before task execution
   - Input: Raw context + task description
   - Output: Relevance-scored context with irrelevant sections marked
   - Technique: Task-context alignment scoring

2. `.claude/rules/distractor-filter.md`:
   ```markdown
   # Distractor Filtering

   Before processing large context blocks:
   1. Identify explicit task scope (time ranges, entity filters, operation type)
   2. Mark context sections as:
      - RELEVANT: Directly supports task
      - PERIPHERAL: May be useful for edge cases
      - DISTRACTOR: Superficially similar but out of scope
   3. Process RELEVANT first, PERIPHERAL only if needed
   4. NEVER incorporate DISTRACTOR content into reasoning
   ```

3. Prompts for scoped reasoning:
   - `prompts/reliability/scoped-reasoning.md`
   - Task-boundary enforcement templates

**Success Metric**: Reduce distractor-induced errors by ≥50% on KAMI-style benchmarks
```

---

### Archetype 4: Fragile Execution Under Load

**Description**: As task complexity increases, models exhibit coherence loss, generation loops, malformed tool calls, and abandonment of structured reasoning.

**Example from Paper**: Multi-step SQL joins cause model to forget earlier table aliases, produce syntactically invalid queries, or enter retry loops without adapting approach.

**AIWG Existing Mitigations**:
- ✅ Multi-agent orchestration: Distributes load across agents
- ✅ Task tool: Subagent isolation prevents context pollution
- ⚠️ Partial: No explicit recovery from malformed outputs

**AIWG Planned Mitigations**:
- ✅ Decompose Helper (#1): Keeps subtasks within cognitive load limits (≤7)
- ✅ Parallel-Hints (#2): Prevents sequential context accumulation
- ✅ Resilience Primitives (#11): Retry, backoff, circuit-breaker
- ⚠️ Partial: No structured self-debug capability

**Gap Assessment**: **MOSTLY ADEQUATE** - Decomposition + resilience addresses this. However, the paper shows **recovery capability** is the dominant success predictor. Current #11 (Resilience) focuses on retry mechanics, not structured self-debugging.

**Recommendation**: Extend #11 or accept consultant's proposed #13 (Recovery & Self-Debug Agent):

```markdown
## #13 Recovery & Self-Debug Agent (NEW or Extend #11)

**Type**: Extension to #11 Resilience Primitives
**Location**: `addons/resilience/` (extend existing)
**Priority**: P2 (as planned, but with enhanced scope)

**Deliverables**:
1. Structured recovery protocol:
   ```markdown
   ## Recovery Protocol (After Tool Failure)

   1. PAUSE: Stop execution, preserve state
   2. DIAGNOSE: Analyze error message and execution trace
      - Syntax error? → Fix formatting
      - Schema mismatch? → Re-inspect target
      - Logic error? → Decompose into smaller steps
      - Loop detected? → Change approach entirely
   3. ADAPT: Choose recovery strategy based on diagnosis
   4. RETRY: With adapted approach (max 3 attempts)
   5. ESCALATE: If 3 adapted retries fail, request human intervention
   ```

2. `self-debug` agent (haiku tier for efficiency):
   - Input: Failed execution trace + error message
   - Output: Diagnosis + recommended recovery action
   - Technique: Error pattern matching + trace analysis

3. Loop detection:
   - Track last N tool calls
   - Detect repetitive patterns
   - Force approach change on loop detection

**Success Metric**: Recovery success rate ≥80% (matching DeepSeek V3.1's behavior)
```

---

## Gap Summary Matrix

| Archetype | Current Coverage | Planned Coverage | Gap Status | Action Required |
|-----------|------------------|------------------|------------|-----------------|
| 1. Premature Action | Partial | Adequate | ✅ Adequate | Add grounding checkpoint to decomposition |
| 2. Over-Helpfulness | Partial | Adequate | ✅ Adequate | Extend Rule 9 in Agent Design Bible |
| 3. Distractor Pollution | Weak | Weak | ❌ **GAP** | Add #12 Context Curator (P1) |
| 4. Fragile Execution | Partial | Adequate | ⚠️ Enhance | Extend #11 with self-debug protocol |

## Consultant Proposal Assessment

### #12 Context Curator & Distractor Filter

**Consultant Proposal**: New addon for context relevance scoring and distractor filtering.

**Assessment**: **ACCEPT** - Empirical evidence strongly supports this. Archetype 3 is the least addressed failure mode in current plans. The paper shows even high-performing models (DeepSeek V3.1) struggle with distractor-heavy contexts.

**Implementation Notes**:
- Move to P1 priority (Core Patterns phase)
- Integrate with memory system leverage (path-filtered rules)
- Create `.claude/rules/distractor-filter.md` for runtime guidance
- Build `context-curator` agent for pre-processing

### #13 Recovery & Self-Debug Agent

**Consultant Proposal**: Dedicated agent for structured error recovery and self-debugging.

**Assessment**: **ACCEPT AS EXTENSION** - Rather than a separate agent, extend #11 Resilience Primitives with structured recovery protocol. This aligns with the paper's finding that recovery capability (not a separate agent) is what distinguishes DeepSeek V3.1.

**Implementation Notes**:
- Keep in P3 (Advanced Patterns) as planned
- Add structured recovery protocol to #11
- Include loop detection mechanism
- Add `self-debug` agent at haiku tier for efficiency

### Tweaks to Existing Items

**#4 Agent Design Bible**:
- Add Rule 6b: "Grounding Checkpoint" for external operations
- Extend Rule 9: "Escalate Uncertainty" with substitution detection
- Add Rule 11: "Recovery-First Design" - agents should include recovery hooks

**#7 Evals Framework**:
- Include KAMI-style failure mode tests
- Test for each of the 4 archetypes specifically
- Measure recovery rate, not just success rate

**#8 Consortium Lite**:
- Paper validates multi-model consensus for catching substitutions (Archetype 2)
- Keep priority and scope as planned
- Add note: Consortium most valuable for uncertainty detection

## Revised Priority Matrix

### P0: Foundation (Week 1-2) - Unchanged
| # | Item | Adjustment |
|---|------|------------|
| 4 | Agent Design Bible | Add grounding checkpoint, extend Rule 9 |
| 10 | Responsibility Linter | Add archetype detection rules |

### P1: Core Patterns (Week 3-5) - **ADD #12**
| # | Item | Adjustment |
|---|------|------------|
| 1 | Decompose Helper | Add grounding subtask to templates |
| 2 | Parallel-Hint System | Unchanged |
| 6 | Trace Collector | Add recovery attempt logging |
| **12** | **Context Curator** | **NEW: Distractor filter addon** |

### P2: Production Enablers (Week 6-8) - Unchanged
| # | Item | Adjustment |
|---|------|------------|
| 3 | External Prompt Registry | Unchanged |
| 5 | API Adapter Layer | Unchanged |
| 9 | Deploy Generators | Unchanged |

### P3: Advanced Patterns (Week 9-12) - Extend #11
| # | Item | Adjustment |
|---|------|------------|
| 8 | Consortium Lite | Add note on uncertainty detection value |
| 7 | Evals Framework | Include KAMI-style archetype tests |
| 11 | Resilience Primitives | **Extend with structured recovery protocol** |

## Updated Success Metrics

| Metric | Original Target | Revised Target | Rationale |
|--------|-----------------|----------------|-----------|
| Agent lint pass | 100% | 100% | Unchanged |
| Intake auto-split | 80% ≤7 subtasks | 80% ≤7 subtasks | Unchanged |
| Parallel utilization | >60% | >60% | Unchanged |
| Trace generation | <3 seconds | <3 seconds | Unchanged |
| **Grounding compliance** | N/A | **>90%** | New: Archetype 1 |
| **Substitution rate** | N/A | **<5%** | New: Archetype 2 |
| **Distractor errors** | N/A | **≥50% reduction** | New: Archetype 3 |
| **Recovery success** | N/A | **≥80%** | New: Archetype 4 |

## Implementation Recommendations

### Immediate Actions (Before Building)

1. **Update Agent Design Bible draft** with:
   - Rule 6b: Grounding Checkpoint
   - Rule 9 extension: Substitution Detection
   - Rule 11: Recovery-First Design

2. **Add #12 Context Curator to unified plan** at P1 priority

3. **Extend #11 Resilience scope** to include structured recovery protocol

4. **Add archetype-specific tests to #7 Evals Framework spec**

### Validation Approach

Before declaring each item complete, validate against relevant archetypes:

| Item | Must Address |
|------|--------------|
| #4 Agent Design Bible | Archetypes 1, 2 |
| #1 Decompose Helper | Archetypes 1, 4 |
| #12 Context Curator | Archetype 3 |
| #11 Resilience | Archetype 4 |
| #8 Consortium Lite | Archetype 2 |
| #7 Evals | All 4 archetypes |

## REF-002 Reference Entry

For `docs/references/`:

```markdown
# REF-002: How Do LLMs Fail In Agentic Scenarios?

**Citation**: Roig, F. (2025). How Do LLMs Fail In Agentic Scenarios? A Behavioral Analysis Across Model Scales. arXiv:2512.07497v2.

**Summary**: Empirical analysis of 900 execution traces from KAMI v0.1 benchmark across three model scales. Identifies four failure archetypes (Premature Action, Over-Helpfulness, Distractor Pollution, Fragile Execution) and demonstrates that recovery capability, not model scale, is the dominant predictor of agentic task success.

**AIWG Alignment**:
- Multi-agent orchestration distributes cognitive load (Archetype 4)
- Decomposition patterns limit subtask complexity (Archetypes 1, 4)
- Consortium pattern validates uncertain outputs (Archetype 2)

**Improvement Opportunities**:
- Add Context Curator for distractor filtering (Archetype 3)
- Extend Resilience primitives with structured recovery (Archetype 4)
- Include archetype-specific tests in Evals Framework

**Implementation Notes**:
- Validated consultant's #12 (Context Curator) proposal
- Extended #11 (Resilience) scope based on recovery findings
- Added archetype metrics to success criteria
```

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial gap analysis from Roig (2025) |

