# REF-025: Constitutional AI - Harmlessness from AI Feedback

## Citation

Bai, Y., Kadavath, S., Kundu, S., Askell, A., Kernion, J., Jones, A., Chen, A., Goldie, A., Mirhoseini, A., McKinnon, C., Chen, C., Olsson, C., Olah, C., Hernandez, D., Drain, D., Ganguli, D., Li, D., Tran-Johnson, E., Perez, E., Kerr, J., Mueller, J., Ladish, J., Landau, J., Ndousse, K., Lukosuite, K., Lovitt, L., Sellitto, M., Elhage, N., Schiefer, N., Mercado, N., DasSarma, N., Lasenby, R., Larson, R., Ringer, S., Johnston, S., Kravec, S., El Showk, S., Fort, S., Lanham, T., Telleen-Lawton, T., Conerly, T., Henighan, T., Hume, T., Bowman, S. R., Hatfield-Dodds, Z., Mann, B., Amodei, D., Joseph, N., McCandlish, S., Brown, T., & Kaplan, J. (2022). Constitutional AI: Harmlessness from AI Feedback. *arXiv preprint arXiv:2212.08073*.

**arXiv**: https://arxiv.org/abs/2212.08073
**PDF**: `docs/references/pdfs/REF-025-bai-2022-constitutional.pdf`
**Anthropic Research**: https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback

## Document Profile

| Attribute | Value |
|-----------|-------|
| Pages | 34 |
| Year | 2022 |
| Venue | arXiv preprint (Anthropic) |
| Type | Empirical research paper |
| AIWG Relevance | **Critical** - Foundational for self-critique, principles-based alignment, automated review patterns, and constitutional governance of AI systems |
| Model Scale | 52B parameters (primary experiments) |
| GitHub | https://github.com/anthropics/ConstitutionalHarmlessnessPaper |

## Executive Summary

Constitutional AI (CAI) represents a paradigm shift in AI alignment by training harmless AI assistants through self-improvement rather than human labeling of harmful outputs. The method uses a "constitution" - a set of human-written principles in natural language - to guide an AI system to critique and revise its own responses, then learn from AI-generated feedback rather than human feedback.

The approach has two phases: (1) Supervised Learning where the model critiques and revises harmful responses according to constitutional principles, producing a dataset for finetuning (SL-CAI), and (2) Reinforcement Learning from AI Feedback (RLAIF) where the model generates preference labels based on the constitution to train a preference model. Results show CAI models achieve Pareto improvements over RLHF baselines - they are both more helpful AND more harmless, while being less evasive and more transparent about their reasoning.

This work is foundational for AIWG because it demonstrates how explicit principles can govern AI behavior, how models can self-critique against standards, and how to reduce human labeling burden while improving alignment - all central to AIWG's gate-based review and multi-agent validation patterns.

## Key Concepts

### 1. Constitutional AI (CAI)
A method for training AI systems using a "constitution" - a set of principles written in natural language that govern desired behavior. Human supervision comes entirely from these principles rather than labels on individual outputs.

### 2. Two-Phase Training Process

**Phase 1: Supervised Learning (SL-CAI)**
- Generate harmful responses from helpful-only model
- Critique responses against constitutional principles
- Revise responses based on critiques
- Fine-tune on revised responses
- Purpose: Get model "on-distribution" for RL phase

**Phase 2: Reinforcement Learning from AI Feedback (RLAIF)**
- Generate pairs of responses
- Use AI to evaluate which is more harmless per constitution
- Train preference model on AI preferences
- Perform RL with preference model as reward
- Purpose: Significantly improve performance and reliability

### 3. Constitution Principles
A set of ~16 principles that guide behavior, such as:
- "Choose the response that is most helpful, honest, and harmless"
- "Choose the response that is least likely to encourage illegal activity"
- "Choose the response that is most respectful of privacy"
- "Choose the response that sounds most similar to what a peaceful, ethical, and wise person like Martin Luther King Jr. or Mahatma Gandhi might say"

### 4. Critique and Revision Loop
Iterative process where:
1. Model generates potentially harmful response
2. Model critiques response against principle
3. Model revises response based on critique
4. Can be repeated multiple times (typically 1-4 revisions)

### 5. RLAIF (RL from AI Feedback)
Replaces human preference labels with AI-generated labels based on constitutional principles. Uses multiple-choice format with chain-of-thought reasoning to generate calibrated preference labels.

### 6. Harmlessness vs. Evasiveness
CAI aims to be harmless without being evasive. Models should:
- Refuse harmful requests transparently
- Explain objections to harmful queries
- Engage thoughtfully rather than shut down discussions
- Avoid canned "I can't answer that" responses

### 7. Chain-of-Thought Constitutional Reasoning
Using "Let's think step-by-step" prompting to generate explicit reasoning about which response better follows constitutional principles, improving both performance and transparency.

### 8. Scaling Supervision
Using AI to help humans supervise AI more efficiently, focusing human effort on high-quality principle specification rather than massive labeling.

## Key Findings

### 1. Pareto Improvement Over RLHF (Figure 2, p. 3)
**Finding**: RL-CAI models learn to be less harmful at a given level of helpfulness compared to standard RLHF models. This represents a Pareto improvement - better on both dimensions.

**Evidence**: At equivalent helpfulness Elo scores (~100), RL-CAI achieves harmlessness Elo of ~150 vs ~0 for standard RLHF. Constitutional RL with chain-of-thought shows even better performance.

**Implication**: The helpfulness-harmlessness tradeoff can be reduced through constitutional methods.

### 2. Progressive Improvement Through Revisions (Figure 5, p. 9)
**Finding**: Harmlessness preference model scores improve monotonically with number of critique-revision iterations (0→1→2→3→4 revisions).

**Evidence**: 52B model shows harmlessness PM score progression: -1.0 (initial) → 1.0 (1 rev) → 1.5 (2 rev) → 2.0 (3 rev) → 2.2 (4 rev). First revision provides largest improvement.

**Implication**: Iterative self-improvement through multiple critique-revision cycles is effective, though gains diminish after first revision.

### 3. Critiques Improve Results for Smaller Models (Figure 7, p. 10)
**Finding**: For smaller models (<10B parameters), critiqued revisions achieve higher harmlessness scores than direct revisions. For larger models (52B), both perform similarly with critiques slightly better.

**Evidence**: At 2.7B parameters, critiqued revisions score ~1.0 higher on harmlessness PM than direct revisions. Gap narrows at 13B and essentially disappears at 52B.

**Implication**: Explicit reasoning (critique step) is more important for smaller models, suggesting it scaffolds learning.

### 4. AI Evaluation Capability Scales with Model Size (Figure 4, p. 6)
**Finding**: Larger language models approach human-level performance at identifying helpful, honest, harmless responses. Chain-of-thought reasoning significantly improves this capability.

**Evidence**: On 438 HHH comparison questions:
- 52B pretrained LM: 50% (chance)
- 52B with chain-of-thought: 73%
- 52B ensembled CoT: 75%
- Human feedback PM: 78%

**Implication**: Models large enough can reliably evaluate their own outputs, enabling AI feedback to replace human feedback.

### 5. Reduced Evasiveness Without Sacrificing Harmlessness (Section 4.4, p. 13)
**Finding**: RL-CAI models are "virtually never evasive" and give nuanced, thoughtful responses to sensitive topics while remaining harmless. HH RLHF models often give canned evasive responses.

**Evidence**: Sample comparisons show RL-CAI engaging substantively with questions like "Why are prisons full of Black and Brown people?" while HH RLHF responds "Sorry, I cannot respond to this content."

**Implication**: Harmlessness and helpfulness can be reconciled through non-evasive engagement.

### 6. Number of Principles Has Limited Impact on Harmlessness (Figure 6, p. 9)
**Finding**: Varying the number of constitutional principles (N=1,2,4,8,16) does not significantly affect harmlessness PM scores, but diversity likely improves exploration.

**Evidence**: All configurations (N=1 to N=16) converge to similar harmlessness scores (~1.0) after 4 revisions.

**Implication**: Principle diversity matters more for exploration during RL than for supervised revision quality.

### 7. Both SL and RL Phases Contribute Substantially (Figure 8, p. 12)
**Finding**: SL-CAI provides significant improvement over pretrained baseline, and RL-CAI further improves substantially over SL-CAI.

**Evidence**:
- Pretrained: Harmlessness Elo -100, Helpfulness Elo 0
- SL-CAI: Harmlessness Elo 0, Helpfulness Elo 50
- RL-CAI: Harmlessness Elo 150, Helpfulness Elo 100

**Implication**: Both phases are valuable - SL gets model "on-distribution" and RL significantly refines performance.

### 8. Soft Preference Labels Outperform Hard Labels (Section 4.3, p. 13)
**Finding**: Using normalized log-probabilities (soft labels) from the feedback model works better than binary 0/1 labels (hard labels). For CoT, clamping probabilities to 40-60% works best.

**Evidence**: Authors found soft labels "led to much better results than hard labels" and CoT probability clamping at 40-60% "improved results further" compared to 20-80% or no clamping.

**Implication**: Calibrated uncertainty in preference labels improves learning.

## Benchmark and Experimental Results

### Evaluation Datasets
- **Red Team Prompts**: 42,496 human-written + 140,335 model-generated prompts designed to elicit harmful behavior
- **Helpfulness Prompts**: 135,296 human-written prompts
- **HHH Evaluation**: 438 binary comparison questions (221 from prior work + 217 new challenging ones)
- **PALMS**: Sensitive questions from Process for Adapting Language Models to Society
- **LaMDA & InstructGPT Prompts**: Sample comparisons

### Model Sizes Tested
- 810M, 2.7B, 6B, 13B, 22B, 52B parameters
- Primary results focus on 52B models
- Pretraining follows prior Anthropic work

### Crowdworker Comparison Tests
- **10,274 helpfulness comparisons** across 24 model snapshots
- **8,135 harmlessness comparisons** across 24 model snapshots
- Workers from Surge AI (different from training data collection)
- Instructed to prefer thoughtful non-evasive responses over evasive ones when both harmless

### Key Results Summary

| Model | Helpfulness Elo | Harmlessness Elo | Notes |
|-------|-----------------|------------------|-------|
| Pretrained Base | -50 | -100 | Starting point |
| Helpful RLHF | 150 | -50 | Helpful but harmful |
| HH RLHF | 100 | 0 | Balanced but evasive |
| SL-CAI | 50 | 0 | Supervised constitutional |
| RL-CAI | 100 | 150 | **Best overall** |
| RL-CAI w/ CoT | 100 | 200 | **Best harmlessness** |

### Absolute Harmlessness Scores (Figure 10, p. 14)
Scale 0-4 (higher = more harmful):
- Helpful RLHF: 3.5 → 3.6 (gets worse with training)
- HH RLHF: 1.7 → 0.7 (improves significantly)
- RL-CAI: 1.7 → 0.7 (matches HH RLHF)
- RL-CAI w/ CoT: 1.7 → 0.6 (best performance)

### PM Score Calibration (Figure 9, p. 12)
RL-CAI labels on HHH evaluation show reasonable calibration - the diagonal calibration plot shows predicted probabilities align reasonably well with actual outcomes, though some deviation at extremes.

## Key Quotes for Citation

> "We experiment with methods for training a harmless AI assistant through self-improvement, without any human labels identifying harmful outputs. The only human oversight is provided through a list of rules or principles, and so we refer to the method as 'Constitutional AI'." (p. 1)

> "Constitutional RL models trained with AI feedback learn to be less harmful at a given level of helpfulness—a Pareto improvement." (p. 3, Abstract)

> "As AI systems become more capable, we would like to enlist their help to supervise other AIs." (p. 1)

> "By removing human feedback labels for harmlessness, we have moved further away from reliance on human supervision, and closer to the possibility of a self-supervised approach to alignment." (p. 15)

> "We find that RL-CAI is virtually never evasive, and often gives nuanced and harmless responses to most red team prompts." (p. 13)

> "We chose the term 'constitutional' because we are able to train less harmful systems entirely through the specification of a short list of principles or instructions, i.e. a constitution. But we are also employing this terminology to emphasize that when developing and deploying a general AI system, we cannot avoid choosing some set of principles to govern it, even if they remain hidden or implicit." (p. 2)

> "In a certain sense, work on reinforcement learning from human feedback has already taken a step in the direction of scaled supervision, since the reward signal in RL actually comes from an AI preference model (PM) rather than from immediate human oversight. However, RLHF typically uses tens of thousands of human preference labels. Here, we will test methods that reduce human input to an extreme, in order to study their viability. We will finetune AI models to be harmless using only of order ten simple principles, stated in natural language." (p. 3)

> "The label space and the distribution of the input text specified by the demonstrations are both important—regardless of whether the labels are correct for individual inputs." (p. 7, discussing Min et al. findings)

## AIWG Implementation Mapping

| Paper Element | AIWG Implementation | Location |
|---------------|---------------------|----------|
| **Constitution (Principles)** | Quality criteria, gate check requirements, review standards | `agentic/code/frameworks/sdlc-complete/gates/*/criteria.md` |
| **Self-Critique** | Multi-agent review process, agent critiques against standards | `agentic/code/frameworks/sdlc-complete/agents/reviewers/` |
| **Self-Revision** | Iteration based on feedback, artifact refinement loops | Orchestrator retry/refinement patterns |
| **RLAIF (AI Feedback)** | Synthesizer agent integration, automated quality assessment | `agentic/code/frameworks/sdlc-complete/agents/synthesizer.md` |
| **Critique Templates** | Structured review prompts, gate check templates | Gate prompt templates |
| **Revision Templates** | Structured remediation prompts | Agent revision instructions |
| **Multiple Principles** | Multi-criteria gate checks (security, quality, architecture) | Multiple gate types per phase |
| **Chain-of-Thought** | Explicit reasoning in review comments | Agent system prompt patterns |
| **Non-Evasiveness** | Thoughtful engagement vs. rejection, explanation of issues | Agent communication style |
| **Harmlessness Metrics** | Gate pass/fail criteria, quality scoring | Gate evaluation functions |

### Direct AIWG Applications

**1. Gate Check Constitutional Pattern**
```markdown
# Security Gate (Constitutional CAI Pattern)

## Constitution (Security Principles)
1. No credentials in code or logs
2. All external input validated
3. Principle of least privilege
4. Audit logging for sensitive operations

## Critique Process
Security Auditor agent:
1. Reviews artifact against each principle
2. States compliance or violation
3. Cites specific issues with line numbers
4. Assesses severity of violations

## Revision Process
Software Implementer agent:
1. Receives critique with violations
2. Revises artifact to address each issue
3. Maintains functionality while fixing
4. Resubmits for re-evaluation

## Multiple Iterations
- Gate allows up to 3 critique-revision cycles
- Each cycle focuses on remaining issues
- Progressive improvement toward compliance
```

**2. Multi-Principle Review**
AIWG gates can encode multiple principles just as CAI uses 16 constitutional principles:
- **Security Gate**: 10+ security principles
- **Architecture Gate**: Design principles (SOLID, DRY, etc.)
- **Quality Gate**: Code quality standards
- **Testing Gate**: Test coverage and quality principles

**3. Self-Improvement Workflows**
CAI's critique-revision loop maps directly to AIWG's iterative refinement:
1. Agent produces artifact
2. Reviewer agent critiques against principles
3. Original agent revises
4. Re-review until criteria met or max iterations

**4. Reduced Human Burden**
Like CAI replacing human harmfulness labels with AI feedback, AIWG reduces human review burden by encoding expert knowledge as principles that agents evaluate against.

**5. Transparency Through Principles**
Explicit constitutional principles = explicit gate criteria. Both provide interpretable governance of AI behavior.

## Cross-References

| Paper | Relationship | Relevance to CAI |
|-------|--------------|------------------|
| **REF-015 (Self-Refine)** | Iterative improvement | Similar revision loop but CAI adds explicit principles |
| **REF-021 (Reflexion)** | Verbal reinforcement learning | Both use self-generated feedback, Reflexion focuses on episodic memory |
| **REF-016 (Chain-of-Thought)** | CoT reasoning | CAI uses CoT for evaluation and critique generation |
| **REF-017 (Self-Consistency)** | Multiple samples | CAI's ensembled CoT uses similar principle |
| **REF-026 (ICL Survey)** | In-context learning | CAI uses ICL for critique and revision prompting |
| **Anthropic Red Teaming** | Ganguli et al. 2022 | Provides red team prompts used in CAI evaluation |
| **RLHF Baseline** | Bai et al. 2022 | Prior work that CAI improves upon |
| **HHH Alignment** | Askell et al. 2021 | Defines helpful, honest, harmless criteria |

### Integration with AIWG References
- **REF-016 (CoT)**: CAI uses CoT for constitutional reasoning
- **REF-026 (ICL)**: CAI's few-shot prompting for critiques and revisions
- **REF-015 (Self-Refine)**: Similar iterative improvement paradigm

## Quick Reference Locations

| Topic | Section | Page |
|-------|---------|------|
| **Method Overview** | Introduction | 1-2 |
| **Two-Phase Training** | Constitutional AI Approach | 5 |
| **Constitution Examples** | Appendix C | 20-22 |
| **Critique-Revision Loop** | Section 3.1 | 7-8 |
| **RLAIF Details** | Section 4.1 | 10-11 |
| **Chain-of-Thought Prompting** | Section 4.1, Appendix E.2 | 11, 31-34 |
| **Pareto Improvement Results** | Figure 2, Section 3.3 | 3, 8 |
| **Harmlessness vs. Evasiveness** | Section 4.4 | 13-14 |
| **Sample Conversations** | Appendix D | 23-28 |
| **Few-Shot Prompts** | Appendix E | 29-34 |
| **Scaling Trends** | Section 3.4, Figures 5-7 | 9-10 |
| **Absolute Harmlessness** | Section 4.5, Figure 10 | 14 |
| **Related Work** | Section 5 | 14-15 |
| **Future Directions** | Section 6 | 15-16 |

## Limitations and Future Work

### Acknowledged Limitations

**1. Ad Hoc Principle Selection** (footnote 2, p. 3)
- Principles chosen in "fairly ad hoc and iterative way for research purposes"
- Future work should involve larger set of stakeholders
- Principles should be adapted based on intended usage and deployment location

**2. Simplified Evaluation Context**
- Most evaluation on English language tasks
- Limited cultural context consideration
- Crowdworker demographics not fully explored

**3. Dual Use Concerns** (Section 6.2, p. 16)
- Methods can be used to train systems with any constitution, including harmful ones
- Lowers barrier to training pernicious systems
- Reduced human oversight could lead to unforeseen failure modes

**4. Critique Quality** (Section 3.5, p. 10)
- Critiques "sometimes reasonable, but often made inaccurate or overstated criticisms"
- Revisions still improved harmlessness despite imperfect critiques
- Suggests robustness but also room for improvement

**5. Over-Training Risk** (Section 4.3, p. 12)
- RL-CAI models can be over-trained, leading to "Goodharting behavior"
- May become "overly harsh" or include boilerplate language
- Example: repetitive "you are valid, valued, and cared for" responses

### Future Research Directions

**1. Scaling Supervision Further**
- Integrate human and AI feedback for collaborative supervision
- Train models to imitate human natural language explanations
- Develop methods for AI to uncover subtle harms through reasoning

**2. Robustness Improvements**
- Scale up automated red teaming with non-evasive models
- Perform iterated "online" training with AI supervision
- Make models "essentially immune to red-team attacks"

**3. Behavioral Control and Generalization**
- Apply constitutional methods to alter writing style, tone, personality
- Study how different AI behaviors generalize and interfere
- Experiment with dozens of behavioral axes simultaneously

**4. Beyond Harmlessness**
- Apply to helpfulness training (removing human labels there too)
- Extend to honesty and other alignment dimensions
- Develop fully self-supervised alignment approaches

**5. Transparency and Interpretability**
- Leverage chain-of-thought for better transparency
- Use models to reason through hidden risks
- Make decision-making more legible to humans

## Methodological Details

### Training Datasets

**Red Team Prompts**:
- 42,496 human-written prompts (from red teaming experiments)
- 140,335 model-generated prompts (via few-shot prompting)
- Total: 182,831 red team prompts
- 4 critique-revision pairs sampled per prompt

**Helpfulness Prompts**:
- 135,296 human-written prompts
- 2 responses sampled per prompt from helpful RLHF model
- No model-generated examples used

**SL-CAI Training**:
- Fine-tune on all revisions (from all revision steps) + helpfulness samples
- 1 epoch, constant learning rate 0.5× pretraining rate
- Batch size: 1024 sequences
- Temperature T=1 for all sampling

**RL-CAI Training**:
- PM data: 135,296 HF helpfulness + 182,831 constitutional harmlessness comparisons
- RL prompts: All HF + model-generated (491,142 red team + 474,300 helpfulness)
- Same hyperparameters as prior Anthropic RLHF work

### Constitutional Principles

**16 principles for SL-CAI** covering:
- General harmfulness (harmful, unethical, racist, sexist, toxic, dangerous, illegal content)
- Specific harms (privacy, dangerous advice, illegal activity, age-appropriate content)
- Bias and discrimination (racism, sexism, social bias)
- Subtle nuance (distinguishing harmful assumptions, addressing evasiveness)

**16 principles for RL-CAI** phrased as comparisons:
- "Choose the response that is most helpful, honest, and harmless"
- "Choose the response that sounds most similar to what a peaceful, ethical, and wise person like Martin Luther King Jr. or Mahatma Gandhi might say"
- "Choose the assistant response that is as harmless and ethical as possible"

### Few-Shot Prompting

**SL-CAI**: 4-5 diverse few-shot examples for critiques and revisions
- Examples cover different harm types
- Formatted consistently with task structure
- Prevent model confusion about what to generate

**RL-CAI**: 5 few-shot examples per evaluation
- Each with independent constitutional principle
- Show full prompt-response pairs with reasoning
- For CoT: hand-written chain-of-thought reasoning examples

### Evaluation Methodology

**Elo Scoring**:
- Pairwise comparisons between model outputs
- Crowdworkers choose preferred response
- Elo calculated from comparison results
- Only Elo *differences* meaningful, absolute values arbitrary

**Calibration Testing**:
- Binary comparison questions with ground truth
- Model assigns probability to each option
- Compare predicted probabilities to actual correctness
- Assess via calibration curves

**Absolute Harmfulness**:
- 0-4 scale with crowdworker ratings
- Fine-tuned language model predicts scores
- Evaluated on held-out red team conversations
- Averaged over 256 samples per prompt

## Technical Implementation Notes

### Why Both SL and RL Phases?

**SL-CAI Purpose**:
1. Get model "on-distribution" for RL (reduce exploration needed)
2. Provide some initial control over behavior
3. Bootstrap the process with cleaner data
4. Shorter training time than RL from scratch

**RL-CAI Purpose**:
1. Significantly improve performance beyond SL
2. Handle distribution shift as policy improves
3. Learn more nuanced preference landscape
4. Achieve final Pareto improvement

### Soft vs. Hard Preference Labels

**Hard Labels**: Binary 0/1 based on which response chosen
**Soft Labels**: Normalized log-probabilities from feedback model
**Finding**: Soft labels work much better for non-CoT evaluation

**CoT Labels**: Near 0 or 1 (model commits to answer in reasoning)
**Solution**: Clamp to 40-60% range for better calibration
**Finding**: Clamping prevents overly extreme RL behavior

### Principle Ensembling

**Why**: Using same principle for all labels → less robust PM
**Solution**: Randomly sample from 16 principles per comparison
**Result**: "Notably more robust PM behavior"

### Model Architecture

- Pretrained decoder-only Transformers (GPT-style)
- No architectural modifications for CAI
- Same architecture as prior Anthropic RLHF work
- Sizes: 810M to 52B parameters

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Comprehensive update from full paper review |
