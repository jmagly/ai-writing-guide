---
namespace: aiwg
name: diversity-tuning
description: Interactive tuning of Verbalized Sampling diversity parameters with preset management and A/B comparison
version: 1.0.0
platforms: [all]

---

# Diversity Tuning Skill

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "mode collapse" → RLHF pattern mitigation via diversity tuning
- "RLHF collapse" → same
- "VS parameters" → Verbalized Sampling parameter adjustment shorthand

## Purpose

Interactively tune Verbalized Sampling parameters to find the right diversity level for a given task.

## Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| k | 5 | 3-20 | Number of responses to generate |
| threshold | 0.1 | 0.01-1.0 | Probability filter threshold |
| variant | standard | standard/cot/multi | VS prompt variant |

## Presets

| Preset | k | threshold | variant | Use Case |
|--------|---|-----------|---------|----------|
| conservative | 3 | 1.0 | standard | Minimal diversity, high confidence |
| moderate | 5 | 0.1 | standard | Balanced (default) |
| creative | 8 | 0.05 | cot | High diversity for ideation |
| maximum | 12 | 0.01 | multi | Maximum exploration |

## Usage

```
# Apply a preset
"tune diversity to creative"

# Custom parameters
"set diversity k=8 threshold=0.05"

# A/B comparison
"compare diversity: moderate vs creative for tagline generation"
```

## A/B Comparison Mode

When comparing presets:
1. Generate outputs using preset A
2. Generate outputs using preset B
3. Show side-by-side comparison
4. Measure diversity metrics:
   - Unique n-gram ratio
   - Average pairwise edit distance
   - Semantic cluster count
5. Recommend the better preset for the task

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable diversity thresholds and tuning criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Parsing tuning parameters accurately
- @$AIWG_ROOT/docs/extensions/overview.md — Extension system architecture
- @$AIWG_ROOT/agentic/code/addons/voice-framework/README.md — Voice framework for style diversity context
