# Research Report: Verbalized Sampling Impact on AIWG

**Issue:** #15
**Paper:** 2510.01171v3 - "Verbalized Sampling: How to Mitigate Mode Collapse and Unlock LLM Diversity"
**Authors:** Zhang, Yu, Chong, Sicilia, Tomz, Manning, Shi (Northeastern, Stanford, WVU)
**Date:** January 2026

---

## Executive Summary

Verbalized Sampling (VS) is a training-free prompting strategy that significantly improves output diversity in aligned LLMs by asking models to generate probability distributions over responses rather than single outputs. The paper demonstrates 1.6-2.1x diversity improvements across creative writing tasks while maintaining quality and safety.

**Recommendation: Create an AIWG addon** that packages VS prompts as a diversity-enhancement module. This complements (rather than replaces) existing voice framework and writing principles.

**Key Findings:**
- VS addresses mode collapse caused by RLHF alignment, not writing quality per se
- Highly applicable to creative generation, synthetic data, and scenarios requiring varied outputs
- Less applicable to voice consistency and authenticity patterns (AIWG's core focus)
- The two approaches are complementary, not competitive

---

## Technical Analysis

### What is Verbalized Sampling?

Verbalized Sampling reformulates prompts to explicitly request a distribution of responses with corresponding probabilities, rather than a single response.

**Traditional Prompt:**
```
Tell me a joke about coffee.
```

**Verbalized Sampling Prompt:**
```
Generate 5 responses to the input prompt. Return in JSON format with:
- text: the response string only
- probability: estimated probability from 0.0 to 1.0 of this response
  given the input prompt (relative to the full distribution)
```

### Why It Works: The Typicality Bias Problem

The paper identifies a fundamental cause of mode collapse: **typicality bias** in human preference data. Annotators systematically prefer familiar, fluent, conventional text due to cognitive biases (mere-exposure effect, processing fluency, schema congruity).

This creates a feedback loop:
1. Human raters prefer typical/conventional responses
2. RLHF amplifies this preference
3. Models collapse to stereotypical outputs
4. Diversity is lost even though base models retain it

Mathematical formulation shows that positive typicality bias (α > 0) strictly sharpens output distributions:

```
π*(y|x) ∝ πref(y|x)^γ * exp(rtrue(x,y)/β)
where γ = 1 + α/β > 1 when α > 0
```

### VS Variants

| Method | Description | Best For |
|--------|-------------|----------|
| VS-Standard | Request k responses with probabilities | General use |
| VS-CoT | Add chain-of-thought reasoning before generation | Higher quality |
| VS-Multi | Multi-turn with confidence scores | Maximum diversity |

### Key Results

**Creative Writing (Poems, Stories, Jokes):**
- 1.6-2.1x diversity improvement over direct prompting
- 25.7% improvement in human evaluation scores
- Recovers 66.8% of base model diversity after alignment
- Quality maintained or improved (Pareto optimal trade-off)

**Emergent Scaling:**
- Larger models benefit more from VS
- GPT-4.1 shows 2x gains vs GPT-4.1-mini
- Reasoning models (DeepSeek-R1, o3) show strongest improvements

**Safety and Accuracy:**
- No degradation in factual accuracy (SimpleQA benchmarks)
- Safety maintained (StrongReject benchmarks)

---

## AIWG Applicability Assessment

### Where VS Aligns with AIWG Goals

| AIWG Principle | VS Impact | Assessment |
|----------------|-----------|------------|
| Voice Consistency | Neutral | VS generates diverse content; voice framework applies to each output |
| Authenticity Markers | Positive | More diverse = less "AI-typical" stereotypes |
| Avoiding AI Patterns | Positive | Breaks repetitive phrasing from mode collapse |
| Structural Variation | Positive | Naturally produces varied sentence structures |
| Specificity | Neutral | VS controls diversity, not specificity |

### Where VS Differs from AIWG Goals

**AIWG Focus:** Make AI-generated text sound authentic, human-like, and voice-consistent.

**VS Focus:** Generate diverse outputs that cover the full probability distribution, breaking mode collapse.

These are orthogonal concerns:
- AIWG: "How do we make *each* output authentic?"
- VS: "How do we get *different* outputs across generations?"

### Practical Integration Points

**1. Creative Content Generation**
VS is directly applicable when generating multiple variations:
- Blog post ideation
- Marketing copy alternatives
- Story/narrative brainstorming
- Example generation for documentation

**2. Synthetic Data Generation**
The paper shows VS improves downstream model training:
- Training data diversity
- Example variety for prompts
- Test case generation

**3. Survey/Persona Simulation**
VS produces more human-like distributions:
- User research simulation
- Audience modeling
- A/B test hypothesis generation

### Where VS is NOT Applicable

**1. Voice Profile Application**
When applying a specific voice (executive-brief, technical-authority), diversity across the voice dimension is counterproductive. The voice framework should constrain, not diversify.

**2. Single-Output Quality**
For tasks requiring one polished output, VS adds overhead without benefit. AIWG's revision and authenticity principles apply directly.

**3. Factual/Technical Content**
Documentation, technical specifications, and factual content don't benefit from diversity - they need accuracy and consistency.

---

## Implementation Recommendation

### Create: `voice-framework-diversity` Addon

Package VS prompts as an optional diversity module within the existing voice framework addon structure.

**Proposed Structure:**
```
agentic/code/addons/voice-framework-diversity/
├── manifest.json
├── README.md
├── prompts/
│   ├── vs-standard.md
│   ├── vs-cot.md
│   └── vs-multi.md
├── agents/
│   └── content-diversifier.md     # Agent using VS for bulk generation
└── skills/
    └── diversity-tuning.md        # Probability threshold control
```

**Integration with Existing Framework:**
```
User Request: "Generate 5 marketing tagline alternatives"
    ↓
Apply VS-Standard prompt (diversity addon)
    ↓
For each output, apply Voice Profile (voice framework)
    ↓
Final: 5 diverse, voice-consistent alternatives
```

### Ready-to-Use VS Prompts (from paper)

**VS-Standard:**
```
Generate {k} responses to the input prompt. Each response should be
approximately {target_words} words.

Return the responses in JSON format with the key: "responses" (list of dicts).
Each dictionary must include:
- text: the response string only (no explanation or extra text)
- probability: the estimated probability from 0.0 to 1.0 of this response
  given the input prompt (relative to the full distribution)

Give ONLY the JSON object, with no explanations or extra text.
```

**VS with Diversity Tuning:**
```
[Same as above, plus:]
Randomly sample the responses from the distribution, with the probability
of each response must be below {threshold}.
```

Recommended thresholds:
- High diversity: 0.01 (tail of distribution)
- Moderate diversity: 0.1 (balanced)
- Conservative: 1.0 (full distribution)

### What NOT to Change

**Do not modify:**
- Core writing principles (authenticity, voice, specificity)
- Voice profile templates
- Pattern detection and avoidance guidance
- Single-output quality recommendations

These remain AIWG's primary value proposition and are unaffected by VS.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| VS increases token usage (5x for k=5) | High | Medium | Document use cases; recommend for ideation only |
| Users conflate diversity with quality | Medium | Medium | Clear documentation separating concerns |
| Voice consistency diluted | Low | Medium | Layer voice after VS, not instead |
| Prompt complexity increases | Medium | Low | Provide copy-paste templates |

---

## Conclusion

Verbalized Sampling is a valuable technique for specific use cases (ideation, synthetic data, multi-output generation) but does not fundamentally change AIWG's approach to writing quality. The techniques are complementary:

- **AIWG**: Makes individual outputs authentic and voice-consistent
- **VS**: Ensures multiple outputs cover diverse territory

**Final Recommendation:**
Create a lightweight addon packaging VS prompts for the ideation/generation phase, while keeping AIWG's core focus on output quality and authenticity.

**Implementation Priority:** Medium
**Effort Estimate:** 1-2 days
**Dependencies:** None (pure prompt additions)

---

## References

- Zhang et al. (2025). "Verbalized Sampling: How to Mitigate Mode Collapse and Unlock LLM Diversity." arXiv:2510.01171v3
- Paper website: (referenced in paper)
- Code: (referenced in paper)

---

*Report prepared in response to Issue #15*
