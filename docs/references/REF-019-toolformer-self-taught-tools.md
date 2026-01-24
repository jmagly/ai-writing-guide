# REF-019: Toolformer - Language Models Can Teach Themselves to Use Tools

**Title:** Toolformer: Language Models Can Teach Themselves to Use Tools
**Authors:** Timo Schick, Jane Dwivedi-Yu, Roberto Dessì, Roberta Raileanu, Maria Lomeli, Luke Zettlemoyer, Nicola Cancedda, Thomas Scialom
**Affiliation:** Meta AI Research, Universitat Pompeu Fabra
**Year:** 2023
**arXiv:** 2302.04761v1 [cs.CL]
**PDF Location:** `/mnt/dev-inbox/jmagly/ai-writing-guide/docs/references/pdfs/REF-019-schick-2023-toolformer.pdf`

---

## Executive Summary

Toolformer demonstrates that language models can learn to use external tools (APIs) in a **self-supervised** manner, requiring only a handful of demonstrations per tool. The model autonomously decides which tools to call, when to call them, what arguments to pass, and how to incorporate results into future token prediction. This approach enables a 6.7B parameter GPT-J model to outperform much larger models (GPT-3 175B) on various tasks without sacrificing core language modeling abilities.

**Key Innovation:** Self-supervised tool learning through in-context API call generation, filtering based on perplexity reduction, and model finetuning on its own useful tool invocations.

**AIWG Relevance:** **High** - Provides foundational patterns for self-supervised tool orchestration, autonomous API selection, and utility-based filtering that directly apply to multi-agent systems and agentic workflows.

---

## Core Methodology

### Three-Step Self-Supervised Learning

Toolformer's approach consists of three main phases (p. 2-4):

1. **Sampling API Calls** - Use in-context learning to generate candidate API calls
2. **Executing API Calls** - Execute all candidates and obtain responses
3. **Filtering API Calls** - Keep only calls that reduce perplexity on future tokens

### 1. Sampling API Calls (p. 3)

**Prompt-Based Generation:**
- Create prompt P(x) with few-shot examples of API usage for each tool
- Compute probability pi = pM(<API> | P(x), x1:i-1) for each position i
- Keep positions where pi > τs (sampling threshold, default 0.05)
- Sample up to m API calls per position (default m=5)

**API Call Representation:**
```
e(c) = <API> api_name(input) </API>
e(c, r) = <API> api_name(input) → result </API>
```

Example prompt structure (p. 3, Figure 3):
```
Your task is to add calls to a Question Answering API to a
piece of text. You can call the API by writing "[QA(question)]"

Input: Joe Biden was born in Scranton, Pennsylvania.
Output: Joe Biden was born in [QA("Where was Joe Biden born?")]
Scranton, [QA("In which state is Scranton?")] Pennsylvania.
```

### 2. Executing API Calls (p. 3)

- Execute all sampled API calls to obtain responses ri
- Implementation varies by tool (neural network, Python script, retrieval system)
- All responses must be representable as text sequences

### 3. Filtering API Calls (p. 3)

**Perplexity-Based Filtering:**

Define weighted cross-entropy loss:
```
Li(z) = -Σ(j=i to n) wj-i · log pM(xj | z, x1:j-1)
```

where weights wt = w̃t / Σs w̃s with w̃t = max(0, 1 - 0.2·t)

Compare two losses:
- L+i = Li(e(ci, ri)) - loss with API call and result
- L-i = min(Li(ε), Li(e(ci, ε))) - loss without call or without result

**Filtering Criterion:**
Keep API call if: **L-i - L+i ≥ τf**

This ensures the API call reduces loss by at least τf (default 1.0) compared to not making the call (p. 3).

### 4. Model Finetuning (p. 3-4)

- Merge filtered API calls with original text
- Construct augmented dataset C* from original dataset C
- Finetune language model M on C* using standard language modeling objective
- **Crucial:** C* contains same texts as C, only with inserted API calls
- This preserves generality and prevents distribution shift

### Inference (p. 4)

- Perform regular decoding until "→" token appears
- Interrupt decoding, execute API, insert response
- Continue decoding after inserting response and </API> token
- **Modified decoding:** Generate <API> if it's one of top-k tokens (k=10), not just most likely

---

## Tools Implemented

Toolformer was tested with five distinct tools (p. 4, Table 1):

### 1. Question Answering
- **Implementation:** Atlas (Izacard et al., 2022) finetuned on Natural Questions
- **Input:** Factoid question
- **Output:** Short answer
- **Example:** QA("Who is the publisher of NEJM?") → Massachusetts Medical Society

### 2. Calculator
- **Implementation:** Python script with +, -, *, / operators
- **Input:** Mathematical expression
- **Output:** Result rounded to 2 decimal places
- **Example:** Calculator(400 / 1400) → 0.29

### 3. Wikipedia Search
- **Implementation:** BM25 retriever over KILT Wikipedia dump
- **Input:** Search term
- **Output:** Short text snippets
- **Example:** WikiSearch("Brown Act") → "The Ralph M. Brown Act is an act of the California State Legislature..."

### 4. Machine Translation
- **Implementation:** NLLB 600M parameter model (Costa-jussà et al., 2022)
- **Input:** Text in any of 200 languages
- **Output:** English translation
- **Example:** MT("tortuga") → turtle

### 5. Calendar
- **Implementation:** Returns current date
- **Input:** None (empty)
- **Output:** Current date string
- **Example:** Calendar() → Today is Monday, January 30, 2023

---

## Experimental Results

### Dataset Generation (p. 4-5)

- **Base Dataset:** CCNet (Wenzek et al., 2020) subset
- **Base Model:** GPT-J 6.7B parameters (Wang and Komatsuzaki, 2021)
- **Heuristic Filtering:** Used task-specific heuristics to select likely-useful examples
  - Calculator: Only texts with ≥3 numbers
  - Translation: Only mixed-language paragraphs
- **Training:** Batch size 128, learning rate 1e-5, linear warmup for 10%

**Examples Generated (p. 5, Table 2) with τf = 1.0:**
- Question Answering: 18,526 examples
- Wikipedia Search: 60,974 examples
- Calculator: 994 examples
- Calendar: 20,587 examples
- Machine Translation: 1,034 examples

### Performance on Downstream Tasks

All results are **zero-shot** with no task-specific fine-tuning or examples (p. 5).

#### LAMA Benchmark - Factual Completion (p. 6, Table 3)

| Model | SQuAD | Google-RE | T-REx |
|-------|-------|-----------|-------|
| GPT-J | 17.8 | 4.9 | 31.9 |
| GPT-J + CC | 19.2 | 5.6 | 33.2 |
| Toolformer (disabled) | 22.1 | 6.3 | 34.9 |
| **Toolformer** | **33.8** | **11.5** | **53.5** |
| OPT (66B) | 21.6 | 2.9 | 30.1 |
| GPT-3 (175B) | 26.8 | 7.0 | 39.8 |

**Key Finding:** Toolformer outperforms GPT-3 (175B) despite being 26× smaller, using QA tool for 98.1% of examples (p. 6).

#### Math Reasoning (p. 6, Table 4)

| Model | ASDiv | SVAMP | MAWPS |
|-------|-------|-------|-------|
| GPT-J | 7.5 | 5.2 | 9.9 |
| GPT-J + CC | 9.6 | 5.0 | 9.3 |
| Toolformer (disabled) | 14.8 | 6.3 | 15.0 |
| **Toolformer** | **40.4** | **29.4** | **44.0** |
| OPT (66B) | 6.0 | 4.9 | 7.9 |
| GPT-3 (175B) | 14.0 | 10.0 | 19.8 |

**Key Finding:** More than doubles baseline performance, uses calculator for 97.9% of examples (p. 6).

#### Question Answering (p. 6-7, Table 5)

| Model | WebQS | NQ | TriviaQA |
|-------|-------|-----|----------|
| GPT-J | 18.5 | 12.8 | 43.9 |
| **Toolformer** | **26.3** | **17.7** | **48.8** |
| GPT-3 (175B) | 29.0 | 22.6 | 65.9 |

**Key Finding:** Uses Wikipedia search for 99.3% of examples, outperforms same-size models but lags GPT-3 due to simple retrieval system (p. 7).

#### Temporal Reasoning (p. 7-8, Table 7)

| Model | TEMPLAMA | DATESET |
|-------|----------|---------|
| GPT-J | 13.7 | 3.9 |
| **Toolformer** | **16.3** | **27.3** |
| GPT-3 (175B) | 15.5 | 0.8 |

**Key Finding:** For DATESET (requires knowing current date), uses Calendar for 54.8% of examples. For TEMPLAMA, primarily uses WikiSearch/QA instead of Calendar (p. 8).

### Language Modeling Preservation (p. 8, Table 8)

| Model | WikiText PPL | CCNet PPL |
|-------|--------------|-----------|
| GPT-J | 9.9 | 10.6 |
| GPT-J + CC | 10.3 | 10.5 |
| Toolformer (disabled) | 10.3 | 10.5 |

**Key Finding:** "Adding API calls comes without a cost in terms of perplexity for language modeling without any API calls" (p. 8).

### Scaling Laws (p. 8, Figure 4)

Tested on GPT-2 models: 124M, 355M, 775M, 1.6B, and GPT-J 6.7B parameters.

**Key Finding:** "The ability to leverage the provided tools only emerges at around 775M parameters: smaller models achieve similar performance both with and without tools" (p. 8).

---

## Analysis and Insights

### Decoding Strategy Impact (p. 8-9, Table 9)

Testing different values of k (top-k for <API> token generation):

**T-REx Results:**
- k=1 (greedy): 47.8% accuracy, 40.3% make API calls
- k=3: 52.9% accuracy, 82.8% make API calls
- k=10: 53.5% accuracy, 98.1% make API calls

**WebQS Results:**
- k=1: 19.3% accuracy, 8.5% make API calls
- k=10: 26.3% accuracy, 100% make API calls

**Calibration Finding:** "For k=1 the model is calibrated to some extent: It decides to call APIs for examples that it would perform particularly badly on without making API calls" (p. 9).

### Data Quality Analysis (p. 9, Table 10)

Qualitative analysis shows high L-i - L+i scores correspond to useful API calls:

**High-Quality Example (Score: 5.49):**
```
The Flodden Window... is said to be the oldest war memorial
in the United Kingdom. [WikiSearch("War memorial Flodden")
→ Battle of Flodden > Commemoration > The stained-glass
Flodden Window in Middleton Parish Church...] Sir Richard
Assheton of Middleton (who built St Leonard) was granted
knighthood...
```

**Low-Quality Example (Score: -1.23):**
```
The last time I was with [QA("Who was last time I was with?")
→ The Last Time] him I asked what he likes about me...
```

---

## Key Quotes with Page Numbers

### On Self-Supervised Learning

> "LMs can teach themselves to use external tools via simple APIs and achieve the best of both worlds... This is done in a self-supervised way, requiring nothing more than a handful of demonstrations for each API." (p. 1)

### On Autonomous Tool Selection

> "The LM should not lose any of its generality and should be able to decide for itself when and how to use which tool. In contrast to existing approaches, this enables a much more comprehensive use of tools that is not tied to specific tasks." (p. 2)

### On Filtering Mechanism

> "Intuitively, an API call is helpful to M if providing it with both the input and the output of this call makes it easier for the model to predict future tokens, compared to not receiving the API call at all, or receiving only its input." (p. 3)

### On Dataset Preservation

> "Crucially, apart from inserted API calls the augmented dataset C* contains the exact same texts as C, the original dataset. As a consequence, finetuning M on C* exposes it to the same content as finetuning on C." (p. 4)

### On Emergent Abilities

> "The ability to leverage the provided tools only emerges at around 775M parameters: smaller models achieve similar performance both with and without tools." (p. 8)

### On Language Modeling

> "Most importantly, however, training on C* (our dataset annotated with API calls) does not lead to an increase in perplexity compared to training on C when API calls are disabled at inference time." (p. 8)

### On Calibration

> "Interestingly, for k=1 the model is calibrated to some extent: It decides to call APIs for examples that it would perform particularly badly on without making API calls." (p. 9)

---

## Limitations

The authors identify several limitations (p. 11):

### 1. No Tool Chaining
> "One such limitation is the inability of Toolformer to use tools in a chain (i.e., using the output of one tool as an input for another tool). This is due to the fact that API calls for each tool are generated independently." (p. 11)

### 2. No Interactive Tool Use
> "Our current approach also does not allow the LM to use a tool in an interactive way – especially for tools such as search engines... enabling a LM to browse through these results or to refine its query... can be crucial for certain applications." (p. 11)

### 3. Prompt Sensitivity
> "We found models trained with Toolformer to often be sensitive to the exact wording of their input when deciding whether or not to call an API; this is perhaps unsurprising given that LMs are known to be very sensitive to the prompt." (p. 11)

### 4. Sample Inefficiency
> "Depending on the tool, our method is also very sample-inefficient; for example, processing more than a million documents results in only a few thousand examples of useful calls to the calculator API." (p. 11)

### 5. No Cost Awareness
> "When deciding whether or not to make an API call, Toolformer currently does not take into account the tool-dependent, computational cost incurred from making an API call." (p. 11)

---

## AIWG Mapping: Tool Orchestration Patterns

### 1. Self-Supervised Tool Discovery

**Pattern:** Models can learn tool utility through self-feedback rather than human annotation.

**AIWG Application:**
- **Agent Training:** Agents can evaluate their own tool usage effectiveness
- **Skill Discovery:** Autonomous identification of when commands/skills are helpful
- **Quality Metrics:** Perplexity reduction as proxy for utility

**Implementation:**
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

**Pattern:** Use language model perplexity on future tokens as signal for tool usefulness.

**AIWG Application:**
- **Artifact Quality:** Filter generated requirements/architecture docs by coherence
- **Command Selection:** Choose commands that improve downstream task success
- **Template Ranking:** Select templates that lead to better completions

**Weighted Loss Function (p. 3):**
```
wt = w̃t / Σs w̃s where w̃t = max(0, 1 - 0.2·t)
```
This ensures API calls happen close to where information is useful.

### 3. Prompt-Based API Generation

**Pattern:** Few-shot prompts can elicit API call generation from language models.

**AIWG Application:**
- **Agent Onboarding:** Few examples sufficient to teach new tool usage
- **Extension Discovery:** Agents learn new extensions from minimal demonstrations
- **Cross-Platform:** Same pattern works across different agent platforms

**Example Prompt Structure (from p. 15-16):**
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

**Pattern:** Single model autonomously selects from multiple tools based on context.

**AIWG Application:**
- **SDLC Orchestrator:** Select appropriate specialist agent (Test Engineer, Architect, etc.)
- **Command Router:** Choose between /mention-wire, /validate, /generate-tests
- **Framework Selection:** Pick SDLC vs Marketing framework based on task

**Tool Selection Frequencies (from results):**
- LAMA: 98.1% QA, 0.7% other, 1.2% none
- Math: 97.9% Calculator
- QA: 99.3% WikiSearch
- DATESET: 54.8% Calendar

### 5. Zero-Shot Tool Transfer

**Pattern:** Tools learned on training data transfer to zero-shot downstream tasks.

**AIWG Application:**
- **Domain Transfer:** Skills learned on code generation transfer to documentation
- **Task Transfer:** Requirements analysis skills apply to architecture design
- **Context Transfer:** Same agent works across different project types

### 6. Inference-Time API Execution

**Pattern:** Interrupt generation when API marker detected, execute, continue.

**AIWG Application:**
- **Lazy Evaluation:** Only execute tools when model decides they're needed
- **Dynamic Orchestration:** Runtime tool selection rather than pre-planned workflows
- **Streaming Generation:** Insert tool results mid-generation

**Inference Algorithm (p. 4):**
```
1. Generate tokens normally
2. If "→" token appears:
   a. Pause generation
   b. Execute API call
   c. Insert response + </API>
   d. Resume generation
```

### 7. Modified Decoding for Tool Bias

**Pattern:** Adjust top-k to increase tool usage propensity without retraining.

**AIWG Application:**
- **Agent Tuning:** Adjust agent "eagerness" to call specialized sub-agents
- **Exploration vs Exploitation:** Higher k = more tool exploration
- **Task Adaptation:** Tune k per task type (factual QA needs higher k than creative writing)

**Impact (p. 9, Table 9):**
- k=1: Low tool usage, high precision
- k=10: High tool usage, balanced performance

### 8. Dataset Augmentation Preservation

**Pattern:** Augment training data with tool calls while preserving original distribution.

**AIWG Application:**
- **Incremental Learning:** Add new capabilities without forgetting old ones
- **Skill Injection:** Insert specialized knowledge (voice profiles, domain expertise) without retraining from scratch
- **Safe Finetuning:** Validate that core capabilities are preserved

**Key Principle (p. 4):**
> "Apart from inserted API calls the augmented dataset C* contains the exact same texts as C"

### 9. Heuristic Pre-Filtering

**Pattern:** Use cheap heuristics to select candidate examples before expensive processing.

**AIWG Application:**
- **Selective Agent Invocation:** Only invoke Security Auditor on security-relevant code
- **Targeted Analysis:** Run Test Engineer only on files with test gaps
- **Efficient Processing:** Filter documents before expensive LLM calls

**Examples (p. 4, Appendix A):**
- Calculator: Only texts with ≥3 numbers
- Translation: Only mixed-language paragraphs
- Calendar: Only if URL contains date

### 10. Emergent Scale Effects

**Pattern:** Tool-use capabilities emerge at specific model scale thresholds.

**AIWG Application:**
- **Model Selection:** Choose model size based on required capabilities
- **Capability Planning:** Understand which features need larger models
- **Cost Optimization:** Use smallest model that exhibits desired emergent behaviors

**Threshold Finding (p. 8):**
> "The ability to leverage the provided tools only emerges at around 775M parameters"

---

## Comparison with Related Work

### vs. Human-Supervised Approaches

**Traditional (Komeili et al., 2022; Thoppilan et al., 2022):**
- Large amounts of human annotations
- Task-specific tool usage patterns
- Limited generalization

**Toolformer:**
- Self-supervised with minimal examples
- Autonomous tool selection
- General-purpose tool use

### vs. Few-Shot Prompting (Gao et al., 2022; Parisi et al., 2022)

**Few-Shot Prompting:**
- Requires task-specific examples at inference
- Pre-specified which tools to use
- Limited to seen patterns

**Toolformer:**
- Zero-shot downstream performance
- Autonomous tool selection
- Learns from own feedback

### vs. Retrieval-Augmented LMs (Guu et al., 2020; Borgeaud et al., 2021)

**Retrieval-Augmented:**
- Always retrieve, whether helpful or not
- Single tool (retrieval)
- No autonomous decision-making

**Toolformer:**
- Decides when to use tools
- Multiple diverse tools
- Self-determines utility

---

## Technical Implementation Details

### API Call Format (p. 2)

**Without Result:**
```
<API> api_name(input) </API>
```

**With Result:**
```
<API> api_name(input) → result </API>
```

**Actual Token Sequences (p. 2 footnote):**
- "<API>" = " ["
- "</API>" = "]"
- "→" = "->"

This avoids modifying the model's vocabulary.

### Training Hyperparameters (p. 5, Appendix B)

- **Examples per API:** Up to 25,000
- **Max Sequence Length:** 1,024 tokens
- **Batch Size:** 128 (effective)
- **Learning Rate:** 1e-5 with linear warmup (10%)
- **Hardware:** 8 NVIDIA A100 40GB GPUs
- **Precision:** BF16
- **Framework:** DeepSpeed ZeRO-3
- **Training Steps:** Up to 2,000
- **Evaluation:** Every 500 steps on 1,000-example dev set

### Sampling Parameters (p. 15, Appendix A)

**Default:**
- τs (sampling threshold): 0.05
- τf (filtering threshold): 1.0
- k (top positions): 5
- m (samples per position): 5

**Calculator/Translation (due to fewer examples):**
- τs: 0.0
- τf: 0.5
- k: 20
- m: 10

---

## Implications for AI Writing Guide

### 1. Self-Improving Agents

Toolformer demonstrates agents can evaluate their own tool usage through outcome metrics (perplexity reduction). AIWG agents could:

- **Self-Calibrate:** Learn which commands improve downstream artifacts
- **Autonomous Skill Discovery:** Identify helpful extension combinations
- **Feedback-Driven:** Use artifact quality metrics to refine tool selection

### 2. Minimal Supervision Requirements

Only 2-3 examples per tool needed to teach usage patterns. AIWG implications:

- **Rapid Onboarding:** New agents/extensions with minimal examples
- **Low Barrier:** Users can create custom agents without extensive training data
- **Quick Adaptation:** Agents adapt to new tools from few demonstrations

### 3. Utility-Based Orchestration

Perplexity-based filtering provides objective tool utility metric. AIWG could:

- **Quality Gates:** Filter generated artifacts by coherence/usefulness
- **Command Selection:** Rank available commands by expected utility
- **Agent Routing:** Select specialist agents based on predicted improvement

### 4. Preserved Generality

Toolformer maintains language modeling abilities while gaining tool use. AIWG should:

- **Conservative Augmentation:** Add capabilities without losing existing ones
- **Validation Testing:** Ensure core agent abilities preserved after updates
- **Incremental Enhancement:** Layer new skills on stable foundation

### 5. Scale Thresholds

775M parameter threshold for emergent tool use. AIWG considerations:

- **Model Selection:** Choose appropriately-sized models for required capabilities
- **Capability Planning:** Understand which features need larger models
- **Cost-Performance:** Balance model size with task requirements

---

## Future Research Directions

From paper limitations and discussion (p. 11):

### 1. Tool Chaining
Enable sequential tool use where output of one tool becomes input to another.

**AIWG Opportunity:** Multi-agent workflows where one agent's output triggers another.

### 2. Interactive Tool Use
Allow models to browse results, refine queries, iterate on tool usage.

**AIWG Opportunity:** Agents that engage in back-and-forth with tools/users.

### 3. Reduced Prompt Sensitivity
Make tool invocation more robust to input phrasing variations.

**AIWG Opportunity:** More reliable agent behavior across different user inputs.

### 4. Sample Efficiency
Improve learning from fewer examples, possibly through iterative application.

**AIWG Opportunity:** Faster agent adaptation to new domains/tools.

### 5. Cost-Aware Decision Making
Factor in computational cost when deciding to invoke tools.

**AIWG Opportunity:** Budget-aware agent orchestration for production systems.

---

## References

### Key Citations

- Brown et al. (2020) - GPT-3 and few-shot learning
- Schick & Schütze (2021a,b) - Dataset generation from LMs, bootstrapping
- Gao et al. (2022) - PAL (Program-Aided Language Models)
- Parisi et al. (2022) - TALM (Tool-Augmented Language Models)
- Nakano et al. (2021) - WebGPT browser-assisted QA
- Komeili et al. (2022) - Internet-augmented dialogue

### Related AIWG References

- @docs/references/REF-016-chain-of-thought-prompting.md - Multi-step reasoning
- @docs/references/REF-018-react-reasoning-acting.md - Reasoning + acting synergy
- @docs/references/REF-022-autogen-multi-agent-conversation.md - Multi-agent orchestration
- @docs/references/REF-007-mixture-of-experts.md - Conditional expert activation
- @docs/references/REF-008-retrieval-augmented-generation.md - External knowledge integration

---

## Implementation Checklist for AIWG

Based on Toolformer methodology:

- [ ] **Perplexity-Based Filtering:** Implement utility scoring for agent/command selection
- [ ] **Few-Shot Agent Prompts:** Design 2-3 example prompts for each agent type
- [ ] **Self-Supervised Evaluation:** Let agents score their own output quality
- [ ] **Modified Decoding:** Implement top-k agent selection (vs always-greedy)
- [ ] **Heuristic Pre-Filtering:** Add cheap filters before expensive LLM calls
- [ ] **Tool Call Linearization:** Standardize agent invocation syntax across platforms
- [ ] **Weighted Loss Functions:** Prioritize nearby context in utility calculation
- [ ] **Dataset Augmentation:** Preserve core capabilities when adding new skills
- [ ] **Zero-Shot Transfer:** Test agent skills on unseen task types
- [ ] **Scale Validation:** Verify capabilities emerge at appropriate model sizes

---

**Document Status:** Complete
**Last Updated:** 2026-01-24
**Related Issue:** Research documentation for professionalization
**AIWG Tier:** Tier 2 (Modern Agentic AI - Tool Use)
