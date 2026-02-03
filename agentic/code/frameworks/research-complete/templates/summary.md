# Multi-Level Summary Template

---
template_id: summary
version: 1.0.0
reasoning_required: true
framework: research-complete
---

## Ownership & Collaboration

- Document Owner: Research Analyst
- Contributor Roles: Technical Writer, Domain Expert
- Automation Inputs: Full paper text, literature notes
- Automation Outputs: `summary-REF-XXX.md` with three summary levels

## Phase 1: Core (ESSENTIAL)

### Paper Identification

**Reference ID:** REF-XXX

<!-- EXAMPLE: REF-015 -->

**Title:** [Full paper title]

<!-- EXAMPLE: Self-Refine: Iterative Refinement with Self-Feedback -->

**Authors:** [Author list]

<!-- EXAMPLE: Madaan, A., Tandon, N., Gupta, P., et al. -->

**Year:** YYYY

<!-- EXAMPLE: 2023 -->

**Source:** [Journal/Conference/Preprint]

<!-- EXAMPLE: NeurIPS 2023 -->

## Reasoning

> Complete this section BEFORE writing summaries. Per @.claude/rules/reasoning-sections.md

1. **Audience Identification**: Who will read each summary level?
   > [Define target audience for 1-sentence (executives), 1-paragraph (practitioners), 1-page (researchers)]

<!-- EXAMPLE:
- 1-sentence: Executive leadership, product managers - need impact in 10 seconds
- 1-paragraph: Engineers, agent developers - need practical takeaways in 1 minute
- 1-page: Researchers, architects - need methodology and details in 5 minutes
-->

2. **Key Message Extraction**: What is THE most important insight?
   > [Identify the single insight that must appear at every level]

<!-- EXAMPLE:
THE key message: Feedback quality determines refinement success - 94% of failures stem from bad feedback, not bad refinement capability.
-->

3. **Detail Layering Strategy**: How will we add depth across levels?
   > [Plan what details appear at each level: 1-sentence = result only, 1-paragraph = method + result, 1-page = full methodology]

<!-- EXAMPLE:
- 1-sentence: Result only (20% improvement)
- 1-paragraph: Add method (iterative feedback loop) and key finding (feedback quality critical)
- 1-page: Add methodology details, baselines, implications, limitations
-->

4. **Terminology Calibration**: What terms need definition?
   > [Identify domain-specific terms and determine which level requires explanation]

<!-- EXAMPLE:
- "Self-Refine" - needs brief explanation at paragraph level
- "LLM" - assume knowledge at 1-sentence, expand at 1-page
- "BLEU score" - only mention at 1-page level with context
-->

5. **Action Orientation**: What should readers DO with this?
   > [Specify actionable takeaway appropriate for each level]

<!-- EXAMPLE:
- 1-sentence: Consider iterative refinement patterns
- 1-paragraph: Focus on feedback quality over refinement iterations
- 1-page: Implement structured feedback schema per finding
-->

## 1-Sentence Summary (ESSENTIAL)

> Single sentence (max 30 words) capturing core contribution and impact

<!-- EXAMPLE: Self-Refine improves LLM outputs by ~20% through iterative feedback loops, with 94% of failures traced to poor feedback quality rather than refinement capability. -->

<!-- ANTI-PATTERN: "This paper presents a method for LLM improvement." (Too vague, no specifics) -->

<!-- BETTER: "Self-Refine achieves 20% quality improvement via iterative self-feedback, revealing feedback quality as the critical success factor (94% of failures)." -->

## Phase 2: Extended Summaries (EXPAND WHEN READY)

<details>
<summary>Click to expand paragraph and full-page summaries</summary>

### 1-Paragraph Summary

> 5-7 sentences covering: What problem? What method? What result? What impact?

<!-- EXAMPLE:
Self-Refine (Madaan et al., 2023) addresses the challenge of improving LLM outputs without additional training or external feedback. The method implements an iterative loop where the LLM generates output, provides structured feedback on its own work, and refines the output based on that feedback. Across seven diverse tasks (code optimization, dialogue generation, math reasoning, sentiment control, acronym generation, constrained generation, and review rewriting), Self-Refine achieves average improvements of ~20% over baseline. Critically, the research reveals that 94% of iteration failures stem from poor-quality feedback rather than inadequate refinement capability, making feedback structure the paramount concern. For AIWG, this finding directly informs Ralph loop design: structured, actionable feedback (per @.claude/rules/actionable-feedback.md) is more important than iteration count. The research also introduces best-output-selection (choosing highest-quality iteration rather than final) to handle non-monotonic quality trajectories. Applications include agent self-assessment, iterative artifact refinement, and quality-gate implementation across SDLC phases.
-->

<!-- ANTI-PATTERN: Paragraph that just expands the sentence without adding substance -->

<!-- STRUCTURE GUIDANCE:
Sentence 1: Problem statement
Sentence 2: Method overview
Sentence 3: Quantitative results
Sentence 4-5: Key insights/findings
Sentence 6-7: Implications for AIWG
-->

### 1-Page Summary

> Comprehensive summary covering methodology, findings, implications, limitations (~400-600 words)

<!-- EXAMPLE: -->

#### Problem & Context

Self-Refine tackles a fundamental limitation in LLM application: outputs often require human revision despite model capabilities. Traditional approaches rely on human feedback loops or reinforcement learning from human feedback (RLHF), both expensive and slow. The paper investigates whether LLMs can provide useful feedback on their own outputs and refine iteratively without external supervision.

#### Methodology

The Self-Refine algorithm implements a three-step loop:

1. **Generate**: LLM produces initial output for task
2. **Feedback**: Same LLM critiques its output using structured prompts
3. **Refine**: LLM generates improved version incorporating feedback

The process repeats until stopping criteria (quality threshold, max iterations, or "no changes needed" signal). Critically, feedback is structured with specific categories relevant to each task (e.g., code correctness, execution efficiency, readability for programming tasks).

**Evaluation** spanned seven diverse tasks:
- Code optimization (PIE dataset)
- Dialogue response generation (Persona-Chat)
- Math reasoning (GSM8K)
- Sentiment reversal
- Acronym generation
- Constrained generation (CommonGen)
- Review rewriting (Yelp)

Baselines included GPT-4 direct generation, best-of-k sampling, and CoT prompting.

#### Key Findings

**Quantitative Results:**
- Average improvement ~20% across tasks (range: 5-47% depending on task)
- Code optimization: 10% → 18% pass@1 success rate
- Math reasoning: 15% relative improvement
- Sentiment reversal: 47% improvement in target sentiment achievement

**Qualitative Insights:**

1. **Feedback quality dominates**: Analysis revealed 94% of iteration failures trace to poor feedback (vague, generic, non-actionable) rather than refinement inadequacy. When feedback was specific and actionable, refinement succeeded.

2. **Non-monotonic trajectories**: Quality doesn't always improve with each iteration. Output quality at iteration 2 may exceed iteration 3, necessitating best-output-selection strategies.

3. **Task-specific feedback structure**: Generic "improve this" feedback fails. Effective feedback uses task-specific categories (correctness, efficiency, style for code; coherence, persona-consistency for dialogue).

#### Limitations

- Single-LLM focus: Doesn't explore multi-model feedback (specialist reviewers)
- Iteration depth: Most gains by iteration 2-3, diminishing returns after
- Feedback training: No systematic method for learning better feedback
- Cost: Multiple LLM calls per task (mitigated by smaller models for feedback)

#### AIWG Applications

**Implemented:**
- @.claude/rules/actionable-feedback.md - Structured feedback schema
- @.claude/rules/best-output-selection.md - Non-monotonic quality handling
- @agentic/code/addons/ralph/schemas/actionable-feedback.yaml - Feedback format

**Key Design Decisions Informed:**
1. Ralph loops prioritize feedback quality over iteration count
2. Feedback must include: location, severity, actionable suggestion, rationale
3. Track quality per iteration, select best rather than final
4. Use task-specific feedback aspects (security for code, clarity for docs)

**Future Work:**
- Multi-agent review panels for diverse feedback (@.claude/rules/ensemble-review.md)
- Feedback quality metrics and learning
- Integration with executable feedback (@.claude/rules/executable-feedback.md)

#### Citation

Madaan, A., Tandon, N., Gupta, P., Hallinan, S., Gao, L., Wiegreffe, S., Alon, U., Dziri, N., Prabhumoye, S., Yang, Y., Welleck, S., Majumder, B. P., Gupta, S., Yazdanbakhsh, A., & Clark, P. (2023). Self-Refine: Iterative Refinement with Self-Feedback. *Proceedings of NeurIPS 2023*.

</details>

## Phase 3: Technical Details (ADVANCED)

<details>
<summary>Click to expand technical implementation notes</summary>

### Algorithm Pseudocode

```
function SelfRefine(task, initial_prompt, max_iterations=5):
    output = LLM.generate(initial_prompt)

    for i in 1 to max_iterations:
        feedback = LLM.critique(output, task_specific_rubric)

        if feedback.indicates_no_improvement_needed():
            return output

        if not feedback.is_actionable():
            log_feedback_quality_failure()
            return select_best_from_history()

        refined_output = LLM.refine(output, feedback)

        if quality(refined_output) <= quality(output):
            # Non-monotonic trajectory
            log_quality_degradation()

        output = refined_output

    return select_best_from_history()
```

### Prompt Engineering Notes

**Feedback Prompt Structure:**
```
Review the following [output_type] for [task]:

[OUTPUT]

Provide specific feedback on:
1. [Task-specific aspect 1]
2. [Task-specific aspect 2]
3. [Task-specific aspect 3]

For each issue, specify:
- Exact location
- Problem description
- Concrete suggestion for improvement
```

**Refinement Prompt Structure:**
```
Original output:
[OUTPUT]

Feedback received:
[FEEDBACK]

Generate an improved version that addresses all feedback points.
```

### Performance Metrics

| Task | Baseline | Self-Refine | Improvement |
|------|----------|-------------|-------------|
| Code optimization | 10% pass@1 | 18% pass@1 | +80% relative |
| Math (GSM8K) | 67.3% | 77.4% | +15% relative |
| Sentiment reversal | 45% | 66% | +47% relative |
| Dialogue coherence | 3.2/5 | 3.8/5 | +19% relative |

### Failure Mode Analysis

**94% of failures due to poor feedback:**

| Feedback Issue | Frequency | Example | Fix |
|----------------|-----------|---------|-----|
| Vague location | 38% | "Code has issues" | "Line 42: null check missing" |
| Non-actionable | 31% | "Improve quality" | "Add input validation: if (!x) throw" |
| Missing rationale | 15% | "Change this" | "Change to prevent SQL injection" |
| Wrong severity | 10% | Critical marked as minor | Proper severity classification |

</details>

## Related Research

**Builds on:**
- @.aiwg/research/findings/REF-016-chain-of-thought.md - Reasoning structure
- @.aiwg/research/findings/REF-018-react.md - Iterative agent loops

**Extends:**
- Extends CoT by adding feedback and refinement phases
- Extends basic prompting with iterative improvement

**Cited by:**
- @.aiwg/research/findings/REF-057-agent-laboratory.md - Uses Self-Refine patterns

**Contradicts/Challenges:**
- Challenges assumption that more iterations = better results (non-monotonic)
- Challenges focus on refinement capability vs feedback quality

## References

- @.aiwg/research/sources/[PDF-filename].pdf - Original paper
- @.claude/rules/actionable-feedback.md - AIWG implementation
- @.claude/rules/best-output-selection.md - Non-monotonic handling
- @agentic/code/addons/ralph/schemas/actionable-feedback.yaml - Schema
- @.aiwg/research/findings/REF-015-self-refine.md - Literature note

## Template Usage Notes

**When to create summaries:**
- After completing literature note
- When preparing research briefings
- For research index/catalog entries
- When communicating findings to stakeholders

**Summary writing approach:**
1. Write 1-page summary first (full understanding)
2. Distill to 1-paragraph (core message + implications)
3. Compress to 1-sentence (pure essence)
4. Verify each level is self-contained and actionable

**Quality checks:**
- 1-sentence: Can executive grasp impact in 10 seconds?
- 1-paragraph: Can engineer understand and apply in 1 minute?
- 1-page: Can researcher evaluate methodology in 5 minutes?

**Anti-patterns:**
- 1-paragraph that's just expanded 1-sentence (add substance)
- 1-page that's literature note copy-paste (synthesize, don't duplicate)
- Technical jargon in 1-sentence summary
- Missing actionable takeaway at any level

## Metadata

- **Template Type:** research-summary
- **Framework:** research-complete
- **Primary Agent:** @agentic/code/frameworks/research-complete/agents/discovery-agent.md
- **Related Templates:**
  - @agentic/code/frameworks/research-complete/templates/literature-note.md
  - @agentic/code/frameworks/research-complete/templates/extraction.yaml
- **Version:** 1.0.0
- **Last Updated:** 2026-02-03
