# REF-002: How Do LLMs Fail In Agentic Scenarios?

## Citation

Roig, J.V. (2025). How Do LLMs Fail In Agentic Scenarios? A Qualitative Analysis of Success and Failure Scenarios of Various LLMs in Agentic Simulations. arXiv:2512.07497v2 [cs.AI].

**Link**: [https://arxiv.org/pdf/2512.07497](https://arxiv.org/pdf/2512.07497)

**Organization**: Kamiwaza AI

## Executive Summary

This research performs manual qualitative analysis of 900 agentic execution traces from three representative LLMs (Granite 4 Small 32B, Llama 4 Maverick 400B, DeepSeek V3.1 671B) across filesystem, text extraction, CSV analysis, and SQL scenarios using the KAMI v0.1 benchmark. The study reveals that **model scale alone does not predict agentic reliability** - instead, **recovery capability** emerges as the dominant predictor of success.

### Key Insight

> "Recovery capability—not initial correctness—is the dominant predictor of agentic task success." (p. 1, 28)

DeepSeek V3.1 achieves 92.2% success (vs. predecessor V3's 59.4%) through post-training RL for verification and recovery, not architectural changes. Meanwhile, Llama 4 Maverick (400B) performs only marginally better than Granite 4 Small (32B) despite 12× parameter count.

## Four Universal Failure Archetypes

The study identifies four recurring failure patterns that emerge consistently across all model scales:

### Archetype 1: Premature Action Without Grounding

**Description**: Models guess schemas, table names, or column structures instead of inspecting available data sources.

**Examples**:
- Assumes CSV column names without using `head` command (p. 10)
- Guesses database table/column names instead of using schema inspection tools (p. 13)
- Proceeds with queries before validating filter values exist (p. 13)

**Quote**:
> "The model repeatedly guesses table and column names instead of inspecting the schema, leading to avoidable errors, incorrect JOIN logic, and misinterpretations such as using ORD_ID instead of ORD_AMT." (p. 8)

**Observed In**:
- **Granite 4 Small**: SQL tasks (Q501-Q503) - consistently guesses schemas (p. 13)
- **Llama 4 Maverick**: CSV and SQL tasks - schema guessing before recovery (p. 27)
- **DeepSeek V3.1**: Less frequent, but still present (p. 28)

**Impact**: Silent failures, incorrect JOIN logic, semantic confusion

### Archetype 2: Over-Helpfulness Under Uncertainty

**Description**: When faced with missing or ambiguous entities, models autonomously substitute plausible alternatives instead of returning null/zero or requesting clarification.

**Examples**:
- Substitutes "Acme Inc." when "Acme Corp" not found in database (p. 1, 18)
- Changes missing company filter to "all companies" rather than returning 0 (p. 18)
- Replaces inactive status interpretation as STATUS != 'active' instead of literal 'inactive' (p. 17)

**Quote**:
> "The model searches for a requested company, determines it does not exist (correctly identifies via LIKE query or company list), then autonomously decides to substitute a similar company name without explicit instruction to do so." (p. 18)

**Observed In**:
- **DeepSeek V3.1**: Q502 (16/30 failures) - substitutes missing entities (p. 18)
- **Llama 4 Maverick**: Q502, Q503 - wrong adaptation to missing values (p. 27)

**Impact**: Violates task fidelity, produces plausible but incorrect answers, dangerous in enterprise contexts where "0" is the correct answer for missing data

### Archetype 3: Distractor-Induced Context Pollution

**Description**: Irrelevant data in context derails reasoning, causing models to incorporate distractor information into solutions.

**Examples**:
- Uses Q1-Q3 data when asked only for Q4 (p. 1)
- Multiplies BASE_PRICE × ORDER_AMT when ORDER_AMT already represents revenue (p. 14, 19, 28)
- Fixates on irrelevant tables in multi-table scenarios (p. 28)

**Quote**:
> "This 'Chekhov's gun' tendency suggests that even the biggest and more modern LLMs are not yet robust to information overload; they treat all provided context as signal, not noise." (p. 28)

**Observed In**:
- **All models**: Q403, Q503 scenarios with distractor tables/files
- **DeepSeek V3.1**: 10/30 failures in Q503 (p. 18-19)
- **Granite 4 Small**: Concludes necessary tables are "missing" despite retrieval (p. 13-14)
- **Llama 4 Maverick**: Fixates on BASE_PRICE multiplication (p. 28)

**Impact**: Systematic failures across all model sizes, demonstrates vulnerability to information overload

### Archetype 4: Fragile Execution Under Load

**Description**: Coherence loss, generation loops, malformed tool calls, or execution failures under cognitive load.

**Examples**:
- Multi-step SQL joins cause alias confusion (p. 1)
- In-lining large CSV/text data triggers generation loops (p. 11, 21, 24)
- Repeated tool call formatting errors (missing closing braces) (p. 8-9)
- Off-by-one errors in manual line extraction (p. 21)
- Hallucination of placeholder values ("Line 5 content") (p. 21-22)

**Quote**:
> "Tool call formatting errors, generation loops, and coherence collapse appear most frequently under two conditions: (a) when models inline large data blocks (CSV or text) directly into code, and (b) when they encounter repeated error-recovery cycles." (p. 28)

**Observed In**:
- **Granite 4 Small**: Fails to recover from JSON errors, exhausts max rounds (p. 8-9)
- **Llama 4 Maverick**: 14/28 Q402 failures - generation loops during Python debugging (p. 24)
- **DeepSeek V3.1**: Rare, but present under extreme load (p. 15)

**Impact**: Complete task failure, resource exhaustion, unpredictable behavior

## Model Performance Analysis

### Comparative Results

| Model | Parameters | KAMI v0.1 Score | Recovery Capability |
|-------|------------|-----------------|---------------------|
| **DeepSeek V3.1** | 671B (37B active, MoE) | 92.2% | **Very High** - Consistent error recognition and correction |
| **Llama 4 Maverick** | 400B (17B active, MoE) | 74.6% | **Medium** - Strong initial reasoning, weak sustained debugging |
| **Granite 4 Small** | 32B (dense) | 58.5% | **Low** - Basic recovery, prone to perseverative loops |
| DeepSeek V3 (baseline) | 671B (37B active, MoE) | 59.4% | Low - Same architecture as V3.1, minimal RL training |

**Key Finding**: DeepSeek V3 → V3.1 comparison proves recovery training matters more than scale (p. 2-3, 14).

### Per-Scenario Breakdown

**Scenario Difficulty** (by average success rate):
- **Easiest**: Q201, Q202 (filesystem) - 95%+ across all models
- **Medium**: Q301, Q302 (text extraction) - 80-100%
- **Hard**: Q401-Q403 (CSV analysis) - Highly variable
- **Hardest**: Q502, Q503 (multi-query SQL with distractors) - 47-67% except DeepSeek V3.1

**Critical Observation**: Llama 4 Maverick achieves only 2/30 in Q402 (multi-source CSV), barely above Granite 4 Small's 1/30, despite 12× parameters (p. 31).

## Agentic-Specific Failure Modes

### Tool Use Avoidance

**Description**: Models default to inference when tools are available.

**Example**: Granite 4 Small "eye-balls" CSV aggregations instead of using Python (p. 10).

**Impact**: Approximate answers that pass human scrutiny but fail precision requirements.

### Semantic Confusion

**Description**: Plausible but incorrect assumptions about data values.

**Examples**:
- Using ORD_ID instead of ORD_AMT for monetary filters (p. 13, 24, 27)
- Interpreting "South" to include "Southeast" and "Southwest" (p. 26)
- Confusing similar column names (p. 4)

**Hypothesis**: "Perhaps due to the way models are pretrained (e.g. textbooks and tutorials), they do not often see non-round figures as SQL query filters for columns like monetary amount." (p. 13)

### Last-Mile Execution Failures

**Description**: Correct reasoning with incorrect output formatting.

**Examples**:
- Omits decimal point despite explicit instruction (p. 26)
- Strips punctuation from extracted lines (p. 16)
- Type errors from misinterpreting "do not round" instruction (p. 22)

### Context Pollution Vulnerability

**Description**: Distraction by irrelevant information.

**Impact**: See Archetype 3 above.

### Coherence Degradation

**Description**: Loss of coherence during extended operation.

**Examples**: See Archetype 4 above.

## Success Strategies Observed

### DeepSeek V3.1 Success Patterns

1. **Systematic Verification**: Proactively validates region codes exist before filtering (p. 17-18)
2. **Suspicious Result Investigation**: Questions implausible outputs (0.0 averages) (p. 17, 19)
3. **Schema-First Approach**: Inspects database schema before any queries (p. 17)
4. **Iterative Debugging**: Recognizes errors, diagnoses root causes, refines approach (p. 17)
5. **Defensive Checks**: Reads back output files to validate execution (p. 17)

### Llama 4 Maverick Adaptation

**Just-in-Time Learning**: Adapts to single-tool-per-round constraint after error feedback (p. 20)

**Quote**:
> "Maverick is the only model to identify an unstated constraint (single tool per round) and learn it mid-trial." (p. 29)

### Granite 4 Small Resilience

**Basic Recovery**: Can recover from malformed JSON/tool errors when feedback is explicit (p. 9)

## Four Emergent Principles

### 1. Scale ≠ Reliability

> "Model size alone does not predict agentic reliability; post-training optimization for verification and recovery is the differentiator." (p. 1)

**Evidence**:
- Llama 4 Maverick (400B) vs. Granite 4 Small (32B): Marginal difference in uncertainty tasks
- DeepSeek V3.1 vs. V3: Same architecture, 33% performance gain from RL training

### 2. Recovery is Dominant

> "Crucially, recovery capability - not initial correctness - best predicts overall success." (p. 28)

**Evidence**:
- DeepSeek V3.1's 92.2% stems from consistent error correction, not error avoidance
- Granite 4 Small shows 6 failed vs. 2 successful recovery attempts in Q301 (p. 10)

### 3. Context Quality > Context Quantity

**Evidence**:
- Distractors cause systematic failures across all models (Q403, Q503)
- DeepSeek V3.1 still fails 10/30 in Q503 due to context pollution (p. 18-19)

**Quote**:
> "This switches the challenge from just 'how can we retrieve available related data?' to 'how do we only retrieve the highest quality and most relevant data for the task?'" (p. 29)

### 4. Source-of-Truth Alignment Critical

**Requirement**: Models must prioritize actual data over priors.

**Evidence**:
- Schema guessing failures across all models
- Llama 4 Maverick context confusion (fixates on `get_cwd` output over explicit paths) (p. 20)

## Mitigation Strategies

### From Research Findings

#### 1. Tool and Prompt Design

**Mandate Verification Before Action**:
```
"Before querying database tables, you MUST use sqlite_get_schema
to inspect actual table and column names. Never assume schema."
```

**Design Error Messages to Suggest Fixes**:
- Not: "Error: Column not found"
- But: "Error: Column 'ORD_ID' not found. Use sqlite_get_schema to see available columns."

#### 2. Context Engineering

**Aggressive Curation**:
- Provide explicit enumerations of valid categorical values
- Filter distractors before context loading
- Use scoped reasoning prompts to enforce task boundaries

**Example**: For region filtering, include `Valid regions: [North, South, East, West, Midwest]` in prompt.

#### 3. Architectural Safeguards

**Verification Checkpoints**:
- Require explicit confirmation of assumptions before dependent actions
- Validate results before final output

**Runtime Monitoring**:
- Detect generation loops (repetitive token patterns)
- Monitor output lengths (>8K tokens indicates data in-lining)
- Catch coherence degradation signals

#### 4. Model Selection Criteria

**Evaluate Beyond First-Pass Accuracy**:
- Test behavior under error conditions
- Assess recovery from malformed tool calls
- Include distractor scenarios in evaluation

**Quote**:
> "A model that fails gracefully and recovers reliably may be preferable to one with higher initial accuracy but brittle error handling." (p. 30)

### KAMI v0.1 Intervention Examples

**Q502 vs. Q602 Comparison** (p. 18):

Adding explicit instruction:
> "Begin by examining the schema to find relevant columns, and then do your analysis. Note that if the requested company data is not present in the database, then assume the answer is 0 for the relevant question."

**Result**: DeepSeek V3.1 success rate increased from 52.92% to 87.50%

**Impact**: "Confusion over missing 'company' data was almost completely removed, and schema guessing was completely removed." (p. 18)

## AIWG Framework Mapping

### Quality Gates

**Archetype 1 (Premature Action) → Grounding Checkpoint**:
- Add validation gate: "Has schema been inspected before query construction?"
- Require explicit grounding evidence in agent logs

**Archetype 2 (Over-Helpfulness) → Uncertainty Escalation Gate**:
- Detect ambiguous inputs (missing entities, unclear filters)
- Escalate to human review rather than autonomous substitution
- Default to null/zero for missing data unless explicitly instructed otherwise

**Archetype 4 (Fragile Execution) → Recovery Protocol Gate**:
- Implement structured recovery: PAUSE → DIAGNOSE → ADAPT → RETRY (max 3) → ESCALATE (p. 107 in original doc)
- Add loop detection mechanism
- Monitor coherence metrics (token repetition, output length anomalies)

### Validation Patterns

**Context Curator Pattern** (for Archetype 3):
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

**Error Handling Framework**:
- Classify errors: Syntax | Schema | Logic | Loop
- Match recovery strategy to error type
- Track recovery success rate as quality metric

### Success Metrics

| Metric | Target | Maps to Archetype |
|--------|--------|-------------------|
| Grounding compliance rate | >90% | Archetype 1 |
| Entity substitution rate | <5% | Archetype 2 |
| Distractor error reduction | ≥50% | Archetype 3 |
| Recovery success rate | ≥80% | Archetype 4 |
| Schema inspection before query | 100% | Archetype 1 |
| Verification of assumptions | >85% | All |

## Methodology Notes

### KAMI v0.1 Benchmark Design

**Scenarios Analyzed** (10 of 19 total):
- **200 series**: Filesystem operations (Q201, Q202)
- **300 series**: Text extraction from large files (Q301, Q302)
- **400 series**: CSV analysis requiring Python (Q401, Q402, Q403)
- **500 series**: SQL with schema discovery and JOINs (Q501, Q502, Q503)

**Key Features**:
- Randomized parameters (filenames, entities, thresholds) per trial
- Interactive, multi-step structure
- 240 trials per model per scenario (30 sampled for manual analysis)
- PICARD framework compliance (p. 3)

**Execution Parameters**:
- Max rounds: 20 inferences per trial
- Single-tool-per-round constraint
- Temperature: 0.4 (balance between determinism and problem-solving)
- Context window: 32K tokens (non-thinking models)
- Max output tokens: 8K per round

**Why These Matter**:
- Single-tool constraint tests sequential reasoning
- Max rounds cap exposes recovery efficiency
- Randomization prevents memorization
- Temperature choice balances exploration/exploitation

### Analysis Approach

**Emergent Coding** (p. 4):
- No predefined categories
- Patterns surfaced organically from traces
- Cross-model verification (chronological: Granite → DeepSeek → Llama)
- Manual analysis of 900 samples (30 per model per scenario)

**Limitations Acknowledged** (p. 30):
- Time-intensive manual review limits sample size
- Only 3 models analyzed (of ~60 in full KAMI dataset)
- Scenarios emphasize tool-grounded correctness
- Proprietary training prevents method attribution
- Single-tool constraint influences strategy

## Key Quotes with Page Numbers

### On Scale vs. Capability

> "The disconnect between benchmark performance and real-world utility is not merely theoretical." (p. 1)

> "Neither size nor general capability equal agentic reliability. Maverick outperforms Granite overall, yet still performs badly in Q402." (p. 29)

### On Recovery Importance

> "DeepSeek V3.1's superiority does not come from avoiding errors, but from consistently recognizing, explaining, and correcting them." (p. 15)

> "Error feedback is the new frontier for autonomy. Post-training models must internalize tool semantics and system constraints." (p. 29)

### On Context Pollution

> "DeepSeek V3.1 is not immune - 10/30 trials failed this way. This 'Chekhov's gun' tendency suggests that even the biggest and more modern LLMs are not yet robust to information overload." (p. 28)

> "The presence of distractor files or tables (e.g., Q403 and Q503) triggers semantic overreach: agents attempt to incorporate irrelevant data." (p. 28)

### On Helpfulness Alignment

> "While well-intentioned, this violates task fidelity - especially in enterprise contexts where '0' is the correct answer for missing data. This behavior appears to stem from alignment tuning that over-optimizes for helpfulness and completion fluency, not precision under uncertainty." (p. 28)

### On Failure Mode Universality

> "These patterns highlight the need for agentic evaluation methods that emphasize interactive grounding, recovery behavior, and environment-aware adaptation, suggesting that reliable enterprise deployment requires not just stronger models but deliberate training and design choices." (p. 1)

## Practical Recommendations

### For Enterprise Deployment

**From Section 5.3** (p. 29-30):

1. **Mandate Verification in Tool Descriptions**: Tool descriptions should explicitly require schema inspection before queries

2. **Provide Valid Value Enumerations**: Where categorical filtering required, include explicit lists of valid values

3. **Implement Verification Checkpoints**: Require confirmation of assumptions before dependent actions

4. **Design Error Messages for Recovery**: Messages should suggest corrective paths, not just indicate failure

5. **Monitor Generation Anomalies**: Detect repetitive patterns, unusual lengths, coherence drops

6. **Evaluate Recovery Behavior**: Select models based on error handling, not just accuracy

### For Model Developers

1. **Train for Verification Habits**: Reward schema inspection, output validation, assumption checking
2. **Optimize for Recovery**: DeepSeek V3.1's success demonstrates RL for recovery is effective
3. **Context Quality Training**: Teach models to identify and ignore distractors
4. **Calibrate Helpfulness**: Balance completion fluency with precision under uncertainty

### For Benchmark Designers

1. **Include Interactive Scenarios**: Multi-step, tool-mediated tasks reveal failure modes invisible to static benchmarks
2. **Add Distractor Elements**: Test context pollution vulnerability
3. **Measure Recovery**: Track not just success rate but recovery from errors
4. **Use Realistic Constraints**: Environment constraints (tool limits, rounds) expose fragility

## Comparison with Related Work

### vs. Traditional Benchmarks

**Traditional limitations addressed** (p. 1):
- Benchmark contamination: KAMI uses randomized data
- Construct validity failures: KAMI measures actual agentic capability, not proxies
- Static Q&A format: KAMI requires interactive tool use

### vs. Anecdotal Failure Reports

**This study's contribution**:
> "While prior work has highlighted anecdotal or model-specific accounts of agentic failures, to our knowledge there has been no systematic, cross-model, trace-level analysis conducted within controlled, repeatable environments." (p. 2)

## Future Research Directions

### From Paper

1. **AI-Augmented Analysis at Scale** (p. 30): Current manual analysis limits sample size; developing reliable AI-assisted trace analysis would enable broader coverage

2. **Temperature Effects** (p. 30): "We plan to examine the quantitative and qualitative effects of temperature in agentic performance in future work."

3. **KAMI v0.2 Improvements** (p. 30):
   - Richer scenario coverage (beyond data-grounding tasks)
   - Explicit data-type expectations
   - Long-horizon planning scenarios

### Implications for AIWG

**Gap Identified**: Archetype 3 (Context Pollution) not adequately addressed by existing AIWG patterns.

**Recommended Addition** (from original doc analysis):
- **#12 Context Curator & Distractor Filter addon**
- Pre-filters context before task execution
- Relevance scoring for context sections
- Scoped reasoning prompts
- Path-filtered rules for distractor awareness

**Enhancements to Existing**:
- **#4 Agent Design Bible**: Add "Grounding Checkpoint" and "Escalate Uncertainty" rules
- **#11 Resilience Primitives**: Add structured recovery protocol and loop detection
- **#7 Evals Framework**: Include KAMI-style archetype tests

## Cross-References

**Within AIWG**:
- `@.aiwg/planning/roig-2025-gap-analysis.md` - Gap analysis based on this paper
- `@.aiwg/planning/production-grade-unified-plan.md` - Unified plan updated with findings
- `@agentic/code/frameworks/sdlc-complete/docs/resilience-patterns.md` - Recovery patterns
- `@agentic/code/addons/quality-gates/archetype-validators.md` - Validation implementation

**Related Research**:
- **REF-001**: Bandara et al. production-grade patterns (complementary architectural guidance)
- **REF-022**: AutoGen multi-agent conversation (related to recovery through collaboration)
- **REF-024**: LATS language agent tree search (alternative to linear recovery)

## Document Metadata

| Field | Value |
|-------|-------|
| **Reference ID** | REF-002 |
| **Document Type** | Research Paper Analysis |
| **Domain** | Agentic AI Reliability |
| **AIWG Relevance** | CRITICAL - Failure taxonomy, quality gates, validation |
| **Analysis Date** | 2026-01-24 |
| **Analyzer** | Claude Sonnet 4.5 |
| **Source PDF** | `/docs/references/pdfs/REF-002-roig-2025-llm-failure-modes.pdf` |
| **ArXiv ID** | 2512.07497v2 |
| **Total Pages** | 48 (including appendices) |

## References

See paper bibliography (p. 32-33) for 32 cited works covering:
- Benchmark contamination and validity
- Context engineering
- Agentic alignment
- Data leakage and memorization

---

**Analysis Notes**: This comprehensive documentation synthesizes the 48-page research paper into actionable insights for AIWG framework development, with particular focus on the four failure archetypes and their mapping to quality gates, validation patterns, and success metrics. All quotes include page number references for verification.
