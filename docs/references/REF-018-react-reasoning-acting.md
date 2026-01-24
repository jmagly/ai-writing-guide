# REF-018: ReAct - Synergizing Reasoning and Acting in Language Models

**Citation**: Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. *International Conference on Learning Representations (ICLR)*.

**arXiv**: 2210.03629v3 [cs.CL]
**Project**: https://react-lm.github.io/

**Relevance**: CRITICAL for AIWG agent tool use - establishes the Thought→Action→Observation paradigm

**Tier**: 2 (Modern Agentic AI - published 2023)

---

## Executive Summary

ReAct introduces a paradigm for combining reasoning traces and task-specific actions in an interleaved manner within large language models. By generating both thoughts (reasoning) and actions in a unified framework, ReAct enables models to create, maintain, and adjust plans while interacting with external environments. The approach achieves substantial improvements over reasoning-only (Chain-of-Thought) and action-only methods across diverse tasks including question answering, fact verification, and interactive decision making.

**Key Innovation**: Interleaving explicit reasoning traces with environment actions creates synergy where reasoning guides acting (reason to act) and actions inform reasoning (act to reason).

**Critical Results**:
- HotpotQA: 27.4% EM with ReAct vs 29.4% CoT alone; Combined ReAct+CoT-SC achieves 35.1%
- Fever: 60.9% accuracy with ReAct vs 56.3% CoT (p. 5)
- ALFWorld: 71% success rate vs 45% action-only and 37% imitation learning baseline (p. 8)
- WebShop: 40% success rate vs 30.1% action-only and 28.7% IL+RL (p. 8)

---

## The ReAct Framework

### Core Concept

ReAct augments the agent's action space to **Â = A ∪ L**, where:
- **A** = domain-specific actions (e.g., search, navigate, manipulate)
- **L** = language space (thoughts/reasoning traces)

A thought **ât ∈ L** does not affect the external environment but composes useful information by reasoning over the current context **ct** to support future reasoning or acting (p. 3).

### Thought→Action→Observation Cycle

The fundamental pattern (p. 2):

```
Thought 1: [Decompose goal, plan approach]
Action 1: [Execute environment action]
Observation 1: [Receive environment feedback]
Thought 2: [Reason about observation, adjust plan]
Action 2: [Execute next action]
Observation 2: [Receive feedback]
...
```

### Types of Thoughts

ReAct thoughts serve multiple purposes (p. 3):

1. **Goal decomposition**: "I need to search x, find y, then find z"
2. **Progress tracking**: "Now I have completed step 1, next I need to..."
3. **Information extraction**: "The paragraph says x was started in 1844"
4. **Commonsense reasoning**: "x is not y, so z must instead be..."
5. **Arithmetic reasoning**: "1844 < 1989"
6. **Search reformulation**: "Maybe I can search/look up x instead"
7. **Exception handling**: "The search failed, I should try a different approach"
8. **Answer synthesis**: "Based on the information gathered, the answer is x"

---

## Benchmark Results

### Knowledge-Intensive Reasoning (Section 3)

#### HotpotQA (Multi-hop Question Answering)

**Setup**: Question-only (no support paragraphs), Wikipedia API with 3 actions: search[entity], lookup[string], finish[answer]

**Prompting Results (PaLM-540B)** (Table 1, p. 5):

| Method | HotpotQA EM |
|--------|-------------|
| Standard | 28.7 |
| CoT | 29.4 |
| CoT-SC (21 samples) | 33.4 |
| Act | 25.7 |
| ReAct | 27.4 |
| **CoT-SC → ReAct** | **34.2** |
| **ReAct → CoT-SC** | **35.1** |

**Key Finding**: "ReAct outperforms Act consistently... The best approach overall is a combination of ReAct and CoT that allows for the use of both internal knowledge and externally obtained information during reasoning" (p. 3, p. 5).

**Finetuning Results** (Figure 3, p. 7):
- PaLM-8B finetuned ReAct outperforms all PaLM-62B prompting methods
- PaLM-62B finetuned ReAct outperforms all 540B prompting methods
- ReAct finetuning generalizes better than Standard or CoT finetuning

#### FEVER (Fact Verification)

**Setup**: Verify claims as SUPPORTS, REFUTES, or NOT ENOUGH INFO using Wikipedia API

**Prompting Results (PaLM-540B)** (Table 1, p. 5):

| Method | Fever Accuracy |
|--------|----------------|
| Standard | 57.1 |
| CoT | 56.3 |
| CoT-SC (21 samples) | 60.4 |
| Act | 58.9 |
| ReAct | 60.9 |
| **CoT-SC → ReAct** | **64.6** |
| ReAct → CoT-SC | 62.0 |

**Analysis**: "Fever claims for SUPPORTS/REFUTES might only differ by a slight amount... so acting to retrieve accurate and up-to-date knowledge is vital" (p. 6).

### Success and Failure Mode Analysis (Table 2, p. 6)

Manual analysis of 50 correct and 50 incorrect trajectories each:

**Success Modes**:
- **ReAct True Positive**: 94% correct reasoning and facts vs 86% for CoT
- **ReAct False Positive**: 6% hallucinated facts vs 14% for CoT

**Failure Modes**:

| Failure Type | ReAct | CoT |
|--------------|-------|-----|
| Reasoning error | 47% | 16% |
| Search result error | 23% | - |
| Hallucination | 0% | **56%** |
| Label ambiguity | 29% | 28% |

**Critical Insight**: "Hallucination is a serious problem for CoT, resulting in much higher false positive rate than ReAct (14% vs. 6%) in success mode, and make up its major failure mode (56%)" (p. 6).

"The problem solving trajectory of ReAct is more grounded, fact-driven, and trustworthy, thanks to the access of an external knowledge base" (p. 6).

### Interactive Decision Making (Section 4)

#### ALFWorld (Text-based Embodied Tasks)

**Setup**: 6 task types (pick, clean, heat, cool, look, pick 2) in simulated household, 134 evaluation games

**Results (Table 3, p. 8)**:

| Method | Pick | Clean | Heat | Cool | Look | Pick 2 | **All** |
|--------|------|-------|------|------|------|--------|---------|
| Act (best) | 88 | 42 | 74 | 67 | 72 | 41 | **45** |
| ReAct (avg) | 65 | 39 | 83 | 76 | 55 | 24 | **57** |
| **ReAct (best)** | **92** | **58** | **96** | **86** | **78** | **41** | **71** |
| ReAct-IM (best) | 62 | 68 | 87 | 57 | 39 | 33 | 53 |
| BUTLER (best) | 46 | 39 | 74 | 100 | 22 | 24 | 37 |

**Key Results**:
- ReAct best trial: **71% success** (34% absolute improvement over Act, 34% over BUTLER)
- Even worst ReAct trial (48%) beats best Act and BUTLER
- Consistent advantage across 6 controlled trials: 33-90% relative gain, averaging **62%**
- Trained with only **1-2 in-context examples** vs 10^5 expert trajectories for BUTLER

**Qualitative Analysis**: "Without any thoughts at all, Act fails to correctly decompose goals into smaller subgoals, or loses track of the current state of the environment" (p. 8).

#### WebShop (Real-world Product Search)

**Setup**: 1.18M real products, 12k user instructions, 500 test instructions

**Results (Table 4, p. 8)**:

| Method | Score | Success Rate |
|--------|-------|--------------|
| Act | 62.3 | 30.1 |
| **ReAct** | **66.6** | **40.0** |
| IL (1,012 trajectories) | 59.9 | 29.1 |
| IL+RL (10,587 instructions) | 62.4 | 28.7 |
| Human Expert | 82.1 | 59.6 |

**Key Finding**: "One-shot Act prompting already performs on par with IL and IL+RL methods. With additional sparse reasoning, ReAct achieves significantly better performance, with an absolute 10% improvement over the previous best success rate" (p. 8).

#### ReAct vs Inner Monologue (ReAct-IM)

**Design**: ReAct-IM uses dense external feedback thoughts limited to:
1. Decomposing current goal
2. Current subgoal that needs completion

**Lacks**:
1. Determining when subgoals are completed
2. Determining what the next subgoal should be
3. Commonsense reasoning about item locations

**Results**: ReAct substantially outperforms IM-style prompting (71% vs 53% overall success rate on ALFWorld, p. 8).

---

## Key Insights and Quotes

### On Synergy of Reasoning and Acting

> "A unique feature of human intelligence is the ability to seamlessly combine task-oriented actions with verbal reasoning (or inner speech), which has been theorized to play an important role in human cognition for enabling self-regulation or strategization and maintaining a working memory" (p. 1).

> "This tight synergy between 'acting' and 'reasoning' allows humans to learn new tasks quickly and perform robust decision making or reasoning, even under previously unseen circumstances or facing information uncertainties" (p. 1).

### On Hallucination vs Groundedness

> "This 'chain-of-thought' reasoning is a static black box, in that the model uses its own internal representations to generate thoughts and is not grounded in the external world, which limits its ability to reason reactively or update its knowledge. This can lead to issues like fact hallucination and error propagation over the reasoning process" (p. 2).

> "While interleaving reasoning, action and observation steps improves ReAct's groundedness and trustworthiness, such a structural constraint also reduces its flexibility in formulating reasoning steps, leading to more reasoning error rate than CoT" (p. 6).

### On Combining Internal and External Knowledge

> "The problem solving process demonstrated by ReAct is more factual and grounded, whereas CoT is more accurate in formulating reasoning structure but can easily suffer from hallucinated facts or thoughts" (p. 5).

> "These results indicate the value of properly combining model internal knowledge and external knowledge for reasoning tasks" (p. 6).

### On Few-Shot Learning Power

> "Two or even one-shot ReAct prompting is able to outperform imitation or reinforcement learning methods trained with 10^3 ~ 10^5 task instances, with an absolute improvement of 34% and 10% in success rates respectively" (p. 3).

### On Interpretability and Control

> "ReAct promises an interpretable sequential decision making and reasoning process where humans can easily inspect reasoning and factual correctness. Moreover, humans can also control or correct the agent behavior on the go by thought editing" (p. 4).

---

## AIWG Agent Tool Use Mapping

### Direct Applications to AIWG Agents

#### 1. Tool Use Pattern (Test Engineer, API Designer, Security Auditor)

**ReAct Mapping**:
```
Thought: I need to run tests to verify the authentication logic
Action: execute_command["npm test auth.test.ts"]
Observation: 3/5 tests passing, 2 failures in token validation
Thought: Token validation is failing, I should examine the error details
Action: read_file["test/auth.test.ts"]
Observation: [file contents showing test expectations]
Thought: Tests expect JWT expiry of 3600s but code uses 1800s
Action: edit_file["src/auth/token.ts", line 45, "3600"]
Observation: File updated successfully
```

#### 2. Information Gathering Pattern (Project Analyst, Research Agent)

**ReAct Mapping**:
```
Thought: I need to find the project's security requirements
Action: search_files["security requirement"]
Observation: Found in .aiwg/requirements/nfr-modules/security.md
Thought: Now I need to check if current implementation meets these
Action: read_file[".aiwg/requirements/nfr-modules/security.md"]
Observation: [requirements content]
Thought: Requirement SEC-001 mandates HTTPS, I should verify the config
Action: read_file["config/server.ts"]
Observation: [server configuration]
```

#### 3. Planning and Execution Pattern (Orchestrator, DevOps Engineer)

**ReAct Mapping**:
```
Thought: To deploy, I need to: 1) run tests, 2) build, 3) push to registry
Action: execute_command["npm test"]
Observation: All tests passing
Thought: Tests passed, now I can build the Docker image
Action: execute_command["docker build -t app:v1.2.0 ."]
Observation: Build successful, image created
Thought: Build complete, now push to registry
Action: execute_command["docker push registry.example.com/app:v1.2.0"]
```

### Implementation in AIWG Framework

**Agent Definition Structure** (based on REF-018):

```markdown
## Reasoning Capabilities

This agent uses ReAct-style reasoning with the following thought types:

1. **Goal Decomposition**: Break complex tasks into steps
2. **Progress Tracking**: Monitor completion of subtasks
3. **Information Extraction**: Parse and summarize tool outputs
4. **Error Handling**: Diagnose failures and adjust strategy
5. **Validation**: Verify outputs meet requirements

## Action Space

Available tools:
- search_files[pattern]
- read_file[path]
- edit_file[path, changes]
- execute_command[command]
- create_artifact[type, path, content]

## Thought→Action→Observation Loop

[Example trajectories showing interleaved thoughts and actions]
```

### Lessons for AIWG Tool Design

**From ReAct Success Factors**:

1. **Sparse Thoughts**: Not every action needs a thought (p. 3-4)
   - AIWG: Allow agents to execute routine actions without mandatory reasoning

2. **Flexible Thought Types**: Different tasks need different reasoning patterns (p. 4-5)
   - AIWG: Define thought categories per agent role (e.g., Test Engineer focuses on validation reasoning)

3. **Action Feedback Quality**: Observations must be informative (p. 4)
   - AIWG: Tool outputs should be structured, parseable, and contain actionable information

4. **External Grounding**: Actions retrieve real information to combat hallucination (p. 6)
   - AIWG: Agents should always verify claims against actual files/outputs, not rely on memory

**From ReAct Failure Analysis**:

1. **Search Quality Matters**: 23% of ReAct failures due to uninformative search results (Table 2, p. 6)
   - AIWG: Improve file search, code search, and grep tools to return relevant context

2. **Reasoning Loops**: ReAct can get stuck repeating actions (p. 6, footnote 4)
   - AIWG: Implement loop detection and recovery mechanisms in orchestrator

3. **Thought Editing**: Human-in-the-loop correction improves outcomes (Figure 5, p. 14-15)
   - AIWG: Support interactive thought correction in agent trajectories

---

## Methodology Details

### Prompting Setup

**In-Context Examples**:
- HotpotQA: 6 manually composed trajectories (p. 4)
- Fever: 3 manually composed trajectories (p. 4)
- ALFWorld: 3 trajectories per task type, 2 used per prompt (6 permutations for robustness) (p. 7)
- WebShop: 1-shot prompting (Table 6, p. 22)

**Model**: PaLM-540B (primary), GPT-3 text-davinci-002 (comparison in Appendix A.1, p. 14)

**Decoding**: Greedy decoding (deterministic)

### Action Spaces

**HotpotQA/Fever Wikipedia API** (p. 4):
- `search[entity]`: Returns first 5 sentences or suggests top-5 similar entities
- `lookup[string]`: Returns next sentence containing string (Ctrl+F simulation)
- `finish[answer]`: Completes task with answer

**ALFWorld** (p. 7):
- Navigation: `go to [location]`
- Manipulation: `take [object] from [location]`, `put [object] in/on [location]`
- Interaction: `open [container]`, `clean [object] with [tool]`, `use [appliance]`

**WebShop** (p. 7-8):
- `search[query]`: Search for products
- `click[element]`: Select product or option
- `buy`: Purchase current product configuration

### Baseline Comparisons

**Knowledge Tasks**:
- Standard prompting: No thoughts, actions, or observations
- CoT: Thoughts only, no environment interaction
- CoT-SC: Self-consistency with 21 CoT samples, majority vote
- Act: Actions and observations only, no thoughts

**Decision Making**:
- BUTLER: Imitation learning on 10^5 expert trajectories per task type (p. 7)
- IL: Imitation learning on 1,012 human trajectories (WebShop)
- IL+RL: IL + reinforcement learning on 10,587 instructions (WebShop)

### Finetuning Approach (Appendix B.1, p. 15)

**Data**: 3,000 trajectories with correct answers generated by ReAct

**Models**: PaLM-8B, PaLM-62B

**Method**: Bootstrap approach similar to STaR (Zelikman et al., 2022)
- Train model to decode full trajectories (thoughts, actions, observations) conditioned on input
- Batch size: 64
- Steps: 4,000 for ReAct/Act; 2,000 for Standard/CoT (PaLM-8B), 1,000 for Standard/CoT (PaLM-62B)

---

## Limitations and Future Directions

### Acknowledged Limitations (p. 9-10)

1. **Context Length**: "Complex tasks with large action spaces require more demonstrations to learn well, which unfortunately can easily go beyond the input length limit of in-context learning"

2. **Reasoning Loops**: Greedy decoding can cause repetitive thought-action sequences (p. 6, footnote 4)
   - Suggested fix: Beam search or better decoding strategies

3. **Annotation Cost**: "The challenge of manually annotating reasoning traces and actions at scale" (p. 5)
   - Addressed via bootstrapping finetuning approach

4. **Performance Gap**: Still far from supervised state-of-the-art (HotpotQA: 35.1 vs 67.5; Fever: 64.6 vs 89.5, p. 5)

### Proposed Future Work (p. 10)

1. **Multi-task Training**: "Scaling up ReAct with multi-task training"

2. **Reinforcement Learning**: "Combining it with complementary paradigms like reinforcement learning could result in stronger agents"

3. **More Annotations**: "Learning from more high-quality human annotations will be the desiderata to further improve the performance" (p. 10)

4. **Broader Applications**: Extend beyond QA and simple embodied tasks to more complex domains

---

## Related Work Context

### Positioning in Literature

**Reasoning Methods**:
- Chain-of-Thought (CoT): Wei et al., 2022 - Reasoning only, no environment interaction
- Self-Consistency: Wang et al., 2022 - Sample multiple CoT traces, take majority
- Least-to-Most: Zhou et al., 2022 - Decompose problems into subproblems
- Selection-Inference: Creswell et al., 2022 - Separate selection and inference steps
- STaR: Zelikman et al., 2022 - Bootstrap reasoning via finetuning on correct rationales

**Decision Making Methods**:
- WebGPT: Nakano et al., 2021 - Web browsing with RL from human feedback
- SayCan: Ahn et al., 2022 - LLM action planning reranked by affordance model
- Inner Monologue: Huang et al., 2022 - Limited to environment state observations
- Embodied agents: Huang et al., 2022; Li et al., 2022; Abramson et al., 2020

**ReAct's Unique Contribution**: "To our knowledge, ReAct is the first demonstration of combined reasoning and action using an LLM applied to an interactive environment within a closed-loop system" (p. 8).

---

## Implementation Resources

**Code**: https://react-lm.github.io/ (official)

**Anonymous Review Code**: https://anonymous.4open.science/r/ReAct-2268/ (GPT-3 experiments)

**Prompts Available**: Full prompts for all tasks in Appendix C (p. 16-25):
- HotpotQA: Original, Act, CoT, ReAct (p. 16-19)
- Fever: Original, Act, CoT, ReAct (p. 20-21)
- WebShop: Act, ReAct (p. 22)
- ALFWorld: Act, ReAct, ReAct-IM (p. 23-25)

---

## Cross-References

**Related AIWG References**:
- @docs/references/REF-016-chain-of-thought.md - Foundational reasoning technique that ReAct extends
- @docs/references/REF-019-toolformer.md - Tool learning approach
- @docs/references/REF-015-self-refine.md - Iteration patterns

**AIWG Implementation**:
- @agentic/code/frameworks/sdlc-complete/agents/test-engineer.md - Uses ReAct pattern for test execution
- @agentic/code/frameworks/sdlc-complete/agents/api-designer.md - Uses ReAct for API exploration
- @agentic/code/frameworks/sdlc-complete/docs/tool-use-patterns.md - Documents ReAct implementation

**AIWG Architecture**:
- @.aiwg/architecture/software-architecture-doc.md - Agent orchestration incorporates ReAct loops
- @docs/ralph-guide.md - Ralph extends ReAct with structured recovery

---

## Metadata

**Document Status**: Complete
**Last Updated**: 2026-01-24
**Tier**: 2 (Modern Agentic AI)
**AIWG Priority**: CRITICAL
**Implementation Status**: Active (used in SDLC agent tool calling)

**Tags**: #reasoning #tool-use #agent-architecture #thought-action-observation #grounding #hallucination #interactive-agents #few-shot-learning

**Benchmark Coverage**:
- Knowledge: HotpotQA, FEVER
- Decision Making: ALFWorld, WebShop
- Models: PaLM-540B, GPT-3 (text-davinci-002)

---

**End of Document**
