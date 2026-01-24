# REF-019 AIWG Analysis: Toolformer - Self-Taught Tool Use

**Source**: @/tmp/research-papers/documentation/references/REF-019-toolformer-self-taught-tools.md

**Paper**: Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). Toolformer: Language Models Can Teach Themselves to Use Tools. Meta AI Research.

**AIWG Relevance**: HIGH - Provides foundational patterns for self-supervised tool orchestration and autonomous API selection

---

## AIWG Mapping: Tool Orchestration Patterns

### 1. Self-Supervised Tool Discovery

**Pattern**: Models can learn tool utility through self-feedback rather than human annotation.

**AIWG Application**:
- **Agent Training**: Agents can evaluate their own tool usage effectiveness
- **Skill Discovery**: Autonomous identification of when commands/skills are helpful
- **Quality Metrics**: Perplexity reduction as proxy for utility

**Implementation**:
```python
# Pseudo-code for AIWG agent skill evaluation
def evaluate_skill_utility(agent, skill, context, future_context):
    """Evaluate if skill invocation improves future predictions"""

    # Baseline: predict future without skill
    loss_without = agent.predict_loss(context, future_context)

    # With skill: execute and predict with result
    skill_result = skill.execute(context)
    augmented_context = context + skill_result
    loss_with = agent.predict_loss(augmented_context, future_context)

    # Keep skill if it reduces loss by threshold
    utility = loss_without - loss_with
    return utility >= UTILITY_THRESHOLD
```

### 2. Perplexity-Based Filtering

**Pattern**: Use language model perplexity on future tokens as signal for tool usefulness.

**AIWG Application**:
- **Artifact Quality**: Filter generated requirements/architecture docs by coherence
- **Command Selection**: Choose commands that improve downstream task success
- **Template Ranking**: Select templates that lead to better completions

**Weighted Loss Function (p. 3)**:
```
wt = w̃t / Σs w̃s where w̃t = max(0, 1 - 0.2·t)
```
This ensures API calls happen close to where information is useful.

### 3. Prompt-Based API Generation

**Pattern**: Few-shot prompts can elicit API call generation from language models.

**AIWG Application**:
- **Agent Onboarding**: Few examples sufficient to teach new tool usage
- **Extension Discovery**: Agents learn new extensions from minimal demonstrations
- **Cross-Platform**: Same pattern works across different agent platforms

**Example Prompt Structure (from p. 15-16)**:
```
Your task is to add calls to a [TOOL] API to a piece of text.
You can call the API by writing "[TOOL(input)]"
Here are some examples of API calls:

Input: [Example 1 input]
Output: [Example 1 with API calls]

Input: [Example 2 input]
Output: [Example 2 with API calls]

Input: [User text]
Output:
```

### 4. Multi-Tool Orchestration

**Pattern**: Single model autonomously selects from multiple tools based on context.

**AIWG Application**:
- **SDLC Orchestrator**: Select appropriate specialist agent (Test Engineer, Architect, etc.)
- **Command Router**: Choose between /mention-wire, /validate, /generate-tests
- **Framework Selection**: Pick SDLC vs Marketing framework based on task

**Tool Selection Frequencies (from results)**:
- LAMA: 98.1% QA, 0.7% other, 1.2% none
- Math: 97.9% Calculator
- QA: 99.3% WikiSearch
- DATESET: 54.8% Calendar

### 5. Zero-Shot Tool Transfer

**Pattern**: Tools learned on training data transfer to zero-shot downstream tasks.

**AIWG Application**:
- **Domain Transfer**: Skills learned on code generation transfer to documentation
- **Task Transfer**: Requirements analysis skills apply to architecture design
- **Context Transfer**: Same agent works across different project types

### 6. Inference-Time API Execution

**Pattern**: Interrupt generation when API marker detected, execute, continue.

**AIWG Application**:
- **Lazy Evaluation**: Only execute tools when model decides they're needed
- **Dynamic Orchestration**: Runtime tool selection rather than pre-planned workflows
- **Streaming Generation**: Insert tool results mid-generation

**Inference Algorithm (p. 4)**:
```
1. Generate tokens normally
2. If "→" token appears:
   a. Pause generation
   b. Execute API call
   c. Insert response + </API>
   d. Resume generation
```

### 7. Modified Decoding for Tool Bias

**Pattern**: Adjust top-k to increase tool usage propensity without retraining.

**AIWG Application**:
- **Agent Tuning**: Adjust agent "eagerness" to call specialized sub-agents
- **Exploration vs Exploitation**: Higher k = more tool exploration
- **Task Adaptation**: Tune k per task type (factual QA needs higher k than creative writing)

**Impact (p. 9, Table 9)**:
- k=1: Low tool usage, high precision
- k=10: High tool usage, balanced performance

### 8. Dataset Augmentation Preservation

**Pattern**: Augment training data with tool calls while preserving original distribution.

**AIWG Application**:
- **Incremental Learning**: Add new capabilities without forgetting old ones
- **Skill Injection**: Insert specialized knowledge (voice profiles, domain expertise) without retraining from scratch
- **Safe Finetuning**: Validate that core capabilities are preserved

**Key Principle (p. 4)**:
> "Apart from inserted API calls the augmented dataset C* contains the exact same texts as C"

### 9. Heuristic Pre-Filtering

**Pattern**: Use cheap heuristics to select candidate examples before expensive processing.

**AIWG Application**:
- **Selective Agent Invocation**: Only invoke Security Auditor on security-relevant code
- **Targeted Analysis**: Run Test Engineer only on files with test gaps
- **Efficient Processing**: Filter documents before expensive LLM calls

**Examples (p. 4, Appendix A)**:
- Calculator: Only texts with ≥3 numbers
- Translation: Only mixed-language paragraphs
- Calendar: Only if URL contains date

### 10. Emergent Scale Effects

**Pattern**: Tool-use capabilities emerge at specific model scale thresholds.

**AIWG Application**:
- **Model Selection**: Choose model size based on required capabilities
- **Capability Planning**: Understand which features need larger models
- **Cost Optimization**: Use smallest model that exhibits desired emergent behaviors

**Threshold Finding (p. 8)**:
> "The ability to leverage the provided tools only emerges at around 775M parameters"

---

## Core Methodology: Three-Step Self-Supervised Learning

Toolformer's approach consists of three main phases (p. 2-4):

### 1. Sampling API Calls

**Prompt-Based Generation**:
- Create prompt P(x) with few-shot examples of API usage for each tool
- Compute probability pi = pM(<API> | P(x), x1:i-1) for each position i
- Keep positions where pi > τs (sampling threshold, default 0.05)
- Sample up to m API calls per position (default m=5)

**API Call Representation**:
```
e(c) = <API> api_name(input) </API>
e(c, r) = <API> api_name(input) → result </API>
```

### 2. Executing API Calls

- Execute all sampled API calls to obtain responses ri
- Implementation varies by tool (neural network, Python script, retrieval system)
- All responses must be representable as text sequences

### 3. Filtering API Calls

**Perplexity-Based Filtering**:

Define weighted cross-entropy loss:
```
Li(z) = -Σ(j=i to n) wj-i · log pM(xj | z, x1:j-1)
```

where weights wt = w̃t / Σs w̃s with w̃t = max(0, 1 - 0.2·t)

Compare two losses:
- L+i = Li(e(ci, ri)) - loss with API call and result
- L-i = min(Li(ε), Li(e(ci, ε))) - loss without call or without result

**Filtering Criterion**:
Keep API call if: **L-i - L+i ≥ τf**

This ensures the API call reduces loss by at least τf (default 1.0) compared to not making the call (p. 3).

---

## Experimental Results

### Performance on Downstream Tasks

All results are **zero-shot** with no task-specific fine-tuning (p. 5).

#### LAMA Benchmark - Factual Completion (p. 6, Table 3)

| Model | SQuAD | Google-RE | T-REx |
|-------|-------|-----------|-------|
| GPT-J | 17.8 | 4.9 | 31.9 |
| **Toolformer** | **33.8** | **11.5** | **53.5** |
| GPT-3 (175B) | 26.8 | 7.0 | 39.8 |

**Key Finding**: Toolformer outperforms GPT-3 (175B) despite being 26× smaller, using QA tool for 98.1% of examples.

#### Math Reasoning (p. 6, Table 4)

| Model | ASDiv | SVAMP | MAWPS |
|-------|-------|-------|-------|
| GPT-J | 7.5 | 5.2 | 9.9 |
| **Toolformer** | **40.4** | **29.4** | **44.0** |
| GPT-3 (175B) | 14.0 | 10.0 | 19.8 |

**Key Finding**: More than doubles baseline performance, uses calculator for 97.9% of examples.

#### Question Answering (p. 6-7, Table 5)

| Model | WebQS | NQ | TriviaQA |
|-------|-------|-----|----------|
| GPT-J | 18.5 | 12.8 | 43.9 |
| **Toolformer** | **26.3** | **17.7** | **48.8** |
| GPT-3 (175B) | 29.0 | 22.6 | 65.9 |

**Key Finding**: Uses Wikipedia search for 99.3% of examples.

### Language Modeling Preservation (p. 8, Table 8)

| Model | WikiText PPL | CCNet PPL |
|-------|--------------|-----------|
| GPT-J | 9.9 | 10.6 |
| Toolformer (disabled) | 10.3 | 10.5 |

**Key Finding**: "Adding API calls comes without a cost in terms of perplexity for language modeling without any API calls" (p. 8).

### Scaling Laws (p. 8, Figure 4)

Tested on GPT-2 models: 124M, 355M, 775M, 1.6B, and GPT-J 6.7B parameters.

**Key Finding**: "The ability to leverage the provided tools only emerges at around 775M parameters: smaller models achieve similar performance both with and without tools" (p. 8).

---

## Tools Implemented

Toolformer was tested with five distinct tools (p. 4, Table 1):

### 1. Question Answering
- **Implementation**: Atlas finetuned on Natural Questions
- **Input**: Factoid question
- **Output**: Short answer
- **Example**: QA("Who is the publisher of NEJM?") → Massachusetts Medical Society

### 2. Calculator
- **Implementation**: Python script with +, -, *, / operators
- **Input**: Mathematical expression
- **Output**: Result rounded to 2 decimal places
- **Example**: Calculator(400 / 1400) → 0.29

### 3. Wikipedia Search
- **Implementation**: BM25 retriever over KILT Wikipedia dump
- **Input**: Search term
- **Output**: Short text snippets
- **Example**: WikiSearch("Brown Act") → "The Ralph M. Brown Act is an act of the California State Legislature..."

### 4. Machine Translation
- **Implementation**: NLLB 600M parameter model
- **Input**: Text in any of 200 languages
- **Output**: English translation
- **Example**: MT("tortuga") → turtle

### 5. Calendar
- **Implementation**: Returns current date
- **Input**: None (empty)
- **Output**: Current date string
- **Example**: Calendar() → Today is Monday, January 30, 2023

---

## Implications for AI Writing Guide

### 1. Self-Improving Agents

Toolformer demonstrates agents can evaluate their own tool usage through outcome metrics (perplexity reduction). AIWG agents could:

- **Self-Calibrate**: Learn which commands improve downstream artifacts
- **Autonomous Skill Discovery**: Identify helpful extension combinations
- **Feedback-Driven**: Use artifact quality metrics to refine tool selection

### 2. Minimal Supervision Requirements

Only 2-3 examples per tool needed to teach usage patterns. AIWG implications:

- **Rapid Onboarding**: New agents/extensions with minimal examples
- **Low Barrier**: Users can create custom agents without extensive training data
- **Quick Adaptation**: Agents adapt to new tools from few demonstrations

### 3. Utility-Based Orchestration

Perplexity-based filtering provides objective tool utility metric. AIWG could:

- **Quality Gates**: Filter generated artifacts by coherence/usefulness
- **Command Selection**: Rank available commands by expected utility
- **Agent Routing**: Select specialist agents based on predicted improvement

### 4. Preserved Generality

Toolformer maintains language modeling abilities while gaining tool use. AIWG should:

- **Conservative Augmentation**: Add capabilities without losing existing ones
- **Validation Testing**: Ensure core agent abilities preserved after updates
- **Incremental Enhancement**: Layer new skills on stable foundation

### 5. Scale Thresholds

775M parameter threshold for emergent tool use. AIWG considerations:

- **Model Selection**: Choose appropriately-sized models for required capabilities
- **Capability Planning**: Understand which features need larger models
- **Cost-Performance**: Balance model size with task requirements

---

## Limitations and Future Directions

The authors identify several limitations (p. 11):

### 1. No Tool Chaining
> "One such limitation is the inability of Toolformer to use tools in a chain (i.e., using the output of one tool as an input for another tool). This is due to the fact that API calls for each tool are generated independently." (p. 11)

**AIWG Opportunity**: Multi-agent workflows where one agent's output triggers another.

### 2. No Interactive Tool Use
> "Our current approach also does not allow the LM to use a tool in an interactive way – especially for tools such as search engines... enabling a LM to browse through these results or to refine its query... can be crucial for certain applications." (p. 11)

**AIWG Opportunity**: Agents that engage in back-and-forth with tools/users.

### 3. Prompt Sensitivity
> "We found models trained with Toolformer to often be sensitive to the exact wording of their input when deciding whether or not to call an API; this is perhaps unsurprising given that LMs are known to be very sensitive to the prompt." (p. 11)

**AIWG Opportunity**: More reliable agent behavior across different user inputs.

### 4. Sample Inefficiency
> "Depending on the tool, our method is also very sample-inefficient; for example, processing more than a million documents results in only a few thousand examples of useful calls to the calculator API." (p. 11)

**AIWG Opportunity**: Faster agent adaptation to new domains/tools.

### 5. No Cost Awareness
> "When deciding whether or not to make an API call, Toolformer currently does not take into account the tool-dependent, computational cost incurred from making an API call." (p. 11)

**AIWG Opportunity**: Budget-aware agent orchestration for production systems.

---

## Key Quotes

### On Self-Supervised Learning

> "LMs can teach themselves to use external tools via simple APIs and achieve the best of both worlds... This is done in a self-supervised way, requiring nothing more than a handful of demonstrations for each API." (p. 1)

### On Autonomous Tool Selection

> "The LM should not lose any of its generality and should be able to decide for itself when and how to use which tool. In contrast to existing approaches, this enables a much more comprehensive use of tools that is not tied to specific tasks." (p. 2)

### On Filtering Mechanism

> "Intuitively, an API call is helpful to M if providing it with both the input and the output of this call makes it easier for the model to predict future tokens, compared to not receiving the API call at all, or receiving only its input." (p. 3)

### On Dataset Preservation

> "Crucially, apart from inserted API calls the augmented dataset C* contains the exact same texts as C, the original dataset. As a consequence, finetuning M on C* exposes it to the same content as finetuning on C." (p. 4)

### On Calibration

> "Interestingly, for k=1 the model is calibrated to some extent: It decides to call APIs for examples that it would perform particularly badly on without making API calls." (p. 9)

---

## Implementation Checklist for AIWG

Based on Toolformer methodology:

- [ ] **Perplexity-Based Filtering**: Implement utility scoring for agent/command selection
- [ ] **Few-Shot Agent Prompts**: Design 2-3 example prompts for each agent type
- [ ] **Self-Supervised Evaluation**: Let agents score their own output quality
- [ ] **Modified Decoding**: Implement top-k agent selection (vs always-greedy)
- [ ] **Heuristic Pre-Filtering**: Add cheap filters before expensive LLM calls
- [ ] **Tool Call Linearization**: Standardize agent invocation syntax across platforms
- [ ] **Weighted Loss Functions**: Prioritize nearby context in utility calculation
- [ ] **Dataset Augmentation**: Preserve core capabilities when adding new skills
- [ ] **Zero-Shot Transfer**: Test agent skills on unseen task types
- [ ] **Scale Validation**: Verify capabilities emerge at appropriate model sizes

---

## Cross-References to Other AIWG Papers

**Related AIWG References**:
- @REF-016 - Chain-of-Thought: Multi-step reasoning
- @REF-018 - ReAct: Reasoning + acting synergy
- @REF-022 - AutoGen: Multi-agent orchestration
- @REF-007 - Mixture of Experts: Conditional expert activation
- @REF-008 - Retrieval-Augmented Generation: External knowledge integration

---

## Document Status

**Created**: 2026-01-24
**Source Paper**: REF-019
**AIWG Priority**: HIGH
**Implementation Status**: Patterns applicable to agent orchestration
**Key Insight**: Self-supervised tool learning with perplexity-based filtering
