# Literature Note Template

---
template_id: literature-note
version: 1.0.0
reasoning_required: true
framework: research-complete
---

## Ownership & Collaboration

- Document Owner: Research Analyst
- Contributor Roles: Domain Expert, Technical Researcher
- Automation Inputs: PDF extraction, citation metadata
- Automation Outputs: `literature-note-REF-XXX.md` capturing key insights

## Phase 1: Core (ESSENTIAL)

### Paper Identification

**Reference ID:** REF-XXX

<!-- EXAMPLE: REF-018 -->

**Title:** [Full paper title]

<!-- EXAMPLE: ReAct: Synergizing Reasoning and Acting in Language Models -->

**Authors:** [Author list]

<!-- EXAMPLE: Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., Cao, Y. -->

**Year:** YYYY

<!-- EXAMPLE: 2022 -->

**Source:** [Journal/Conference/Preprint]

<!-- EXAMPLE: ICLR 2023 (International Conference on Learning Representations) -->

### One-Sentence Summary

> [Single sentence capturing the core contribution]

<!-- EXAMPLE: ReAct improves LLM performance by 34% through interleaving reasoning traces with tool actions, reducing hallucinations to near-zero. -->

## Reasoning

> Complete this section BEFORE detailed note-taking. Per @.claude/rules/reasoning-sections.md

1. **Relevance Analysis**: Why is this paper important for AIWG?
   > [Explain how this research connects to AIWG's mission, which components it affects, and priority level]

<!-- EXAMPLE:
ReAct is critical for AIWG because it provides the foundational pattern for agent reasoning loops (Thought→Action→Observation). This directly impacts:
- All SDLC agents that use tools (Read, Write, Bash, etc.)
- Ralph loop implementation (iteration structure)
- Agent debugging and transparency

Priority: HIGH - Core pattern used throughout framework
-->

2. **Key Insight Extraction**: What are the 2-3 most important findings?
   > [Identify the findings that matter most for our use case, not necessarily what the authors emphasized]

<!-- EXAMPLE:
1. TAO loop structure reduces hallucinations dramatically (56% → 0% with tool grounding)
2. Explicit reasoning traces enable better human oversight and debugging
3. 34% performance improvement on HotpotQA demonstrates real-world value
-->

3. **Application Planning**: How will we apply these insights?
   > [Concrete plans for integrating this research into AIWG]

<!-- EXAMPLE:
- Standardize all agents to use TAO loop (@.claude/rules/tao-loop.md)
- Add thought protocol with 6 thought types (@.claude/rules/thought-protocol.md)
- Implement tool grounding in Ralph loop
- Add TAO logging for agent debugging
-->

4. **Limitation Assessment**: What are the boundaries of applicability?
   > [What this research doesn't cover, or contexts where it may not apply]

<!-- EXAMPLE:
- ReAct tested on question-answering tasks, not full SDLC workflows
- Single-agent focus; multi-agent coordination not addressed
- No discussion of human-in-the-loop patterns
- Performance on code generation tasks not evaluated
-->

5. **Gap Identification**: What follow-up research is needed?
   > [Questions this paper leaves unanswered that we should investigate]

<!-- EXAMPLE:
- How does ReAct scale to long-running agent sessions? (Ralph loops run 10+ iterations)
- Can reasoning quality be measured automatically?
- How do multiple agents coordinate with ReAct patterns?
-->

## Phase 2: Detailed Analysis (EXPAND WHEN READY)

<details>
<summary>Click to expand detailed findings and analysis</summary>

### Research Question

> What problem is the paper solving?

<!-- EXAMPLE:
How can we improve LLM reasoning on tasks requiring both internal knowledge and external tool use, while reducing hallucinations?
-->

### Methodology

**Study Type:** [Experimental, Survey, Case Study, Systematic Review, etc.]

<!-- EXAMPLE: Experimental - comparative evaluation across multiple benchmarks -->

**Approach:**
- [Key methods used]
- [Experimental design]
- [Evaluation metrics]

<!-- EXAMPLE:
- Prompting methodology: Interleave reasoning thoughts with tool actions
- Baselines: Standard prompting, Chain-of-Thought, Act-only
- Benchmarks: HotpotQA, FEVER, ALFWorld, WebShop
- Metrics: Success rate, fact accuracy, trajectory efficiency
-->

**Sample Size/Scope:** [N=?, datasets, domains]

<!-- EXAMPLE:
- HotpotQA: 500 multi-hop questions
- FEVER: 500 fact verification claims
- ALFWorld: 134 household tasks
- WebShop: 251 online shopping tasks
-->

### Key Findings (Detailed)

#### Finding 1: [Specific finding]

**Result:** [Quantitative or qualitative result]

<!-- EXAMPLE:
**Result:** ReAct achieves 34% relative improvement over Act-only baseline on HotpotQA (49% → 66% success rate)
-->

**Significance:** [Why this matters]

<!-- EXAMPLE:
**Significance:** Demonstrates that explicit reasoning traces improve performance beyond pure action execution. The reasoning→action→observation loop enables error detection and course correction.
-->

**Evidence Quality:** [HIGH/MODERATE/LOW per GRADE]

<!-- EXAMPLE:
**Evidence Quality:** HIGH - Controlled experiment with clear baselines, multiple tasks, reproducible methodology
-->

**Application to AIWG:**

<!-- EXAMPLE:
**Application to AIWG:**
- Implement TAO loop in all tool-using agents
- Track thought types (goal, progress, extraction, reasoning, exception, synthesis)
- Enable iteration-level debugging via thought logs
-->

#### Finding 2: [Specific finding]

[Repeat structure from Finding 1]

<!-- EXAMPLE:
**Result:** ReAct reduces hallucinations to 0% on FEVER (vs 56% for baseline), with tool grounding
**Significance:** External tool use provides factual grounding that prevents fabrication
**Evidence Quality:** HIGH - Clear metrics, multiple evaluations
**Application to AIWG:** Require agents to ground claims in tool observations (Read, Grep results)
-->

#### Finding 3: [Specific finding]

[Repeat structure from Finding 1]

### Supporting Evidence

| Claim | Evidence | Page/Section | Quality |
|-------|----------|--------------|---------|
| [Claim 1] | [Data/quote] | p. X, Fig Y | HIGH |
| [Claim 2] | [Data/quote] | p. X, Table Y | MODERATE |

<!-- EXAMPLE:
| Claim | Evidence | Page/Section | Quality |
| ReAct reduces errors | 34% improvement on HotpotQA | p. 4, Table 1 | HIGH |
| Tool grounding prevents hallucinations | 0% vs 56% hallucination rate | p. 6, Figure 3 | HIGH |
| Works across domains | Consistent gains on 4 benchmarks | p. 7, Table 2 | HIGH |
-->

### Limitations & Caveats

- [Limitation 1: What the research doesn't prove or cover]
- [Limitation 2: Methodological constraints]
- [Limitation 3: Generalizability concerns]

<!-- EXAMPLE:
- Task focus: QA and simple interactive tasks, not complex SDLC workflows
- Single-agent: No multi-agent coordination patterns
- Context length: Not tested on long-running sessions (Ralph loops run 10+ iterations)
- Human oversight: Doesn't address HITL gate patterns
-->

### Related Work

**Builds on:**
- [Prior work 1 with @reference]
- [Prior work 2 with @reference]

<!-- EXAMPLE:
**Builds on:**
- @.aiwg/research/findings/REF-016-chain-of-thought.md - CoT reasoning baseline
- @.aiwg/research/findings/REF-019-toolformer.md - Tool use in LLMs
-->

**Extends/Contradicts:**
- [Related work 3 with relationship]

<!-- EXAMPLE:
**Extends:**
- Extends CoT by adding action execution and observation feedback
- Extends Toolformer by adding explicit reasoning traces
-->

**Cited by:** [If known, list key papers citing this work]

</details>

## Phase 3: Implementation Details (ADVANCED)

<details>
<summary>Click to expand implementation notes and technical details</summary>

### Technical Implementation

**Algorithm/Method:**

```
[Pseudocode or detailed description of core method]
```

<!-- EXAMPLE:
```
ReAct Loop:
1. THOUGHT: Generate reasoning about current state and next action
2. ACTION: Execute tool call with parameters
3. OBSERVATION: Capture tool output
4. Repeat until task complete or max iterations
```
-->

**Key Parameters:**
- [Parameter 1: Value or range]
- [Parameter 2: Value or range]

<!-- EXAMPLE:
**Key Parameters:**
- Max iterations: 5-10 depending on task complexity
- Temperature: 0.7 for reasoning, 0 for action generation
- Prompt format: "Thought: ... Action: ... Observation: ..."
-->

### Code/Artifacts

**Available Resources:**
- Repository: [URL if available]
- Demo: [URL if available]
- Datasets: [URL if available]

<!-- EXAMPLE:
**Available Resources:**
- Repository: https://github.com/ysymyth/ReAct
- Demo: https://react-lm.github.io/
- Datasets: HotpotQA, FEVER (public)
-->

### Reproducibility Notes

- [Note 1: What's needed to reproduce]
- [Note 2: Known challenges in replication]

<!-- EXAMPLE:
- Requires OpenAI API access (GPT-3.5 or GPT-4)
- Prompt engineering critical - exact wording matters
- Tool implementations must be reliable (search, calculator, etc.)
-->

### Integration Points

**AIWG Components Affected:**
- [Component 1 with @reference]
- [Component 2 with @reference]

<!-- EXAMPLE:
**AIWG Components Affected:**
- @.claude/rules/tao-loop.md - Core loop structure
- @.claude/rules/thought-protocol.md - Thought type taxonomy
- @agentic/code/addons/ralph/schemas/iteration-analytics.yaml - Logging format
- All tool-using agents in @agentic/code/frameworks/sdlc-complete/agents/
-->

**Implementation Status:**
- [ ] Rule defined (@.claude/rules/)
- [ ] Schema created (if applicable)
- [ ] Agents updated
- [ ] Tests written
- [ ] Documentation complete

</details>

## Connections & Links

### Upstream (Papers this builds on)

- @.aiwg/research/findings/REF-XXX.md - [Relationship]
- @.aiwg/research/findings/REF-YYY.md - [Relationship]

<!-- EXAMPLE:
- @.aiwg/research/findings/REF-016-chain-of-thought.md - Foundational reasoning pattern
- @.aiwg/research/findings/REF-019-toolformer.md - Tool augmentation pattern
-->

### Downstream (Papers citing this)

- @.aiwg/research/findings/REF-XXX.md - [Relationship]

<!-- EXAMPLE:
- @.aiwg/research/findings/REF-022-autogen.md - Multi-agent extension
-->

### Lateral (Related topics)

- @.aiwg/research/findings/REF-XXX.md - [Relationship]

<!-- EXAMPLE:
- @.aiwg/research/synthesis/topic-04-tool-grounding.md - Tool use patterns
- @.aiwg/research/synthesis/topic-03-cognitive-scaffolding.md - Reasoning structure
-->

### AIWG Implementation

- @.claude/rules/tao-loop.md - [Implementation of this research]
- @.aiwg/requirements/use-cases/UC-XXX.md - [Use case driven by this research]

<!-- EXAMPLE:
- @.claude/rules/tao-loop.md - TAO loop standardization
- @.claude/rules/thought-protocol.md - Six thought types
- @.aiwg/requirements/use-cases/UC-AP-002-track-reasoning.md - Reasoning transparency
-->

## Personal Notes & Insights

> Space for open-ended observations, questions, and connections

<!-- EXAMPLE:
This paper is the foundation for agent transparency. The TAO loop makes agent thinking visible, which is critical for debugging and trust.

Question: Can we extend TAO to multi-agent conversations? Each agent maintains TAO, but how do they coordinate?

Insight: The thought types in @.claude/rules/thought-protocol.md map well to different TAO phases:
- Goal/Progress thoughts → Pre-action planning
- Extraction/Reasoning thoughts → Post-observation analysis
- Exception thoughts → Error detection in observation
- Synthesis thoughts → Task completion assessment

Need to investigate: How does TAO scale to 10+ iteration loops in Ralph? Does reasoning quality degrade?
-->

## References

- @.aiwg/research/sources/[PDF-filename].pdf - Original paper
- @.aiwg/research/fixity-manifest.json - PDF checksum record
- @.aiwg/research/provenance/records/REF-XXX.prov.yaml - Provenance record
- @agentic/code/frameworks/research-complete/schemas/frontmatter-schema.yaml - Metadata schema

## Template Usage Notes

**When to create a literature note:**
- When adding a new paper to research corpus
- During deep reading of existing papers
- When synthesizing findings across papers

**Note-taking approach:**
- Read paper first, then populate ESSENTIAL section immediately
- Complete Reasoning section while paper is fresh in mind
- Expand EXPAND WHEN READY section during synthesis phase
- Fill ADVANCED section when implementing findings

**Anti-patterns to avoid:**
- Copying abstract verbatim (synthesize in your own words)
- Including findings not relevant to AIWG
- Skipping limitations section (critical for proper application)
- Not tracking implementation status

## Metadata

- **Template Type:** research-literature-note
- **Framework:** research-complete
- **Primary Agent:** @agentic/code/frameworks/research-complete/agents/discovery-agent.md
- **Related Templates:**
  - @agentic/code/frameworks/research-complete/templates/summary.md
  - @agentic/code/frameworks/research-complete/templates/extraction.yaml
- **Version:** 1.0.0
- **Last Updated:** 2026-02-03
