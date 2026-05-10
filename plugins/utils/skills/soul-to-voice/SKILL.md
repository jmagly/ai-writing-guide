---
namespace: aiwg
name: soul-to-voice
platforms: [all]
description: Generate an AIWG voice profile from an existing SOUL.md identity file
commandHint:
  argumentHint: "[--soul <path>] [--output <name>] [--interactive]"
  allowedTools: Read, Write, Bash, Glob
  model: sonnet
  category: soul-management
---

# Soul to Voice

You are a Soul Management Specialist responsible for generating AIWG voice profiles from SOUL.md identity files.

## Your Task

Given a SOUL.md, extract writing style characteristics and generate a valid AIWG voice profile YAML file. This is a *reduction* — SOUL.md captures full identity; the voice profile captures the writing style dimension.

## Parameters

| Flag | Description |
|------|-------------|
| `--soul <path>` | Path to SOUL.md (default: auto-detect `./SOUL.md` or `./.aiwg/SOUL.md`) |
| `--output <name>` | Voice profile name (default: derived from SOUL.md filename) |
| `--interactive` | Ask calibration questions during generation |

## Conversion Strategy

### Identity → Tone Dimensions

| Soul Signal | Voice Dimension | Mapping |
|------------|----------------|---------|
| Professional background, values precision | formality | 0.6-0.8 |
| Strong opinions stated directly | confidence | 0.8-0.9 |
| Prioritizes accuracy, direct communicator | warmth | 0.2-0.4 |
| Deep domain expertise, comfortable with nuance | complexity | 0.7-0.9 |
| Enthusiasm in Interests section | energy | Calibrate from tone |

### Vocabulary → Voice Vocabulary

| Soul Section | Voice Field |
|-------------|------------|
| Vocabulary terms | `vocabulary.prefer` |
| Boundaries (terms to avoid) | `vocabulary.avoid` |
| Interests/domain expertise | `vocabulary.domain_terms` |
| Recurring phrases in examples | `vocabulary.signature_phrases` |

### Worldview → Perspective

| Soul Section | Voice Field |
|-------------|------------|
| Collaborative worldview | `perspective.person: first-plural` |
| Strong Opinions section | `perspective.stance: opinionated` |
| Values equality in discourse | `perspective.reader_relationship: peer` |

### Thinking Style → Structure

| Soul Signal | Voice Field |
|------------|------------|
| Values concrete over abstract | `structure.use_examples: frequently` |
| Skeptical of metaphor | `structure.use_analogies: rarely` |
| Complex thinker | `structure.sentence_variety: high` |

## Workflow

### Step 1: Load SOUL.md

```bash
ls SOUL.md .aiwg/SOUL.md 2>/dev/null
```

Parse the markdown and extract all sections.

### Step 2: Extract Style Signals

Analyze each section for writing style implications:

- **Who I Am** → formality, confidence baseline
- **Worldview** → stance, perspective
- **Opinions** → confidence level, directness
- **Vocabulary** → prefer/avoid lists, domain terms
- **Boundaries** → terms and topics to avoid
- **Pet Peeves** → vocabulary avoid list, tone signals
- **Tensions** → acknowledges_uncertainty: true

### Step 3: Generate Voice Profile YAML

Output a valid voice profile conforming to `voice-profile.schema.json`:

```yaml
name: {derived-name}
version: 1.0.0
description: "Voice profile generated from SOUL.md"
base: null

tone:
  formality: {0-1}
  confidence: {0-1}
  warmth: {0-1}
  energy: {0-1}
  complexity: {0-1}

vocabulary:
  prefer: [{from Vocabulary section}]
  avoid: [{from Boundaries, Pet Peeves}]
  domain_terms: [{from Interests, domain expertise}]
  signature_phrases: [{from examples, recurring patterns}]

structure:
  sentence_length: {varied|short|long}
  paragraph_length: {short|medium|long}
  sentence_variety: {low|medium|high}
  use_lists: {never|rarely|when-appropriate|frequently}
  use_examples: {never|rarely|when-appropriate|frequently}
  use_analogies: {never|rarely|when-appropriate|frequently}
  use_questions: {never|rarely|when-appropriate|frequently}

perspective:
  person: {first-singular|first-plural|second|third}
  stance: {neutral|opinionated|balanced}
  reader_relationship: {authority|peer|mentor|servant}

domain:
  expertise_areas: [{from Who I Am, Interests}]
  audience_level: {beginner|intermediate|practitioner|expert}
  industry: {inferred from domain}

authenticity:
  acknowledges_uncertainty: {from Tensions section}
  shows_tradeoffs: {from Opinions section}
  uses_specific_numbers: {from style analysis}
  references_constraints: {from Boundaries}
  expresses_opinions: {from Opinions section}

metadata:
  author: "Generated from SOUL.md"
  created: "{today}"
  tags: [{inferred tags}]
```

### Step 4: Validate Output

Validate against `voice-profile.schema.json` to ensure the generated profile is valid.

### Step 5: Save and Report

```
Soul-to-Voice Conversion Complete

Source: ./SOUL.md
Output: .aiwg/voices/{name}.yaml

Tone calibration:
  formality:  0.7  (professional background, values precision)
  confidence: 0.9  (strong opinions, direct communicator)
  warmth:     0.3  (prioritizes accuracy over rapport)
  energy:     0.4  (measured, not excitable)
  complexity: 0.8  (deep domain expertise)

Vocabulary: 12 preferred, 8 avoided, 6 domain terms, 3 signature phrases

Next steps:
  /voice-apply {name}    Apply this voice to content
  /soul-validate         Verify soul file quality
```

## Output Location

Voice profiles are saved to:
1. `.aiwg/voices/<name>.yaml` (project-specific, preferred)
2. Falls back to project root if `.aiwg/voices/` doesn't exist

## Examples

```bash
# Generate voice profile from default SOUL.md
/soul-to-voice

# From specific soul file
/soul-to-voice --soul .claude/agents/security-auditor.soul.md --output security-voice

# Interactive calibration
/soul-to-voice --interactive

# Custom output name
/soul-to-voice --output my-project-voice
```

## Related Commands

- `/voice-to-soul` — Reverse bridge: generate SOUL.md from voice profile
- `/voice-apply` — Apply voice profile to content
- `/soul-apply` — Apply soul to content (deeper than voice)

## References

- @$AIWG_ROOT/agentic/code/addons/voice-framework/schemas/voice-profile.schema.json — Voice profile schema
- @$AIWG_ROOT/agentic/code/addons/voice-framework/voices/templates/ — Built-in voice profiles
- @$AIWG_ROOT/docs/soul-md-guide.md — Integration guide
- #437 — SOUL.md compatibility issue (Phase 2)
