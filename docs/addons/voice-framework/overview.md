# Voice Framework Overview

The voice framework addon provides a profile-based approach to writing consistency. Instead of maintaining a list of banned patterns, you define the voice you want and apply it to content. Four built-in profiles cover the most common technical writing registers; you can create custom profiles or blend existing ones with weighted ratios.

## Why Profile-Based Instead of Pattern-Avoidance

Pattern-avoidance approaches (ban "leverage," avoid "utilize," don't write "seamlessly") are reactive. They tell you what to stop doing but not what to do instead. The result is content that avoids the listed patterns while still lacking consistent voice.

Voice profiles are positive definitions. They specify tone dimensions, vocabulary preferences, structural patterns, and authenticity markers. The result is content that sounds like something, not just content that avoids sounding like something else.

This addon replaces the earlier `banned-patterns.md` and `ai-pattern-detection` skill, which are now deprecated.

## The Four Built-in Profiles

Located in `@$AIWG_ROOT/agentic/code/addons/voice-framework/voices/templates/`.

### technical-authority

Direct, precise, confident. Appropriate for API documentation, architecture decision records, engineering specifications, and any content where the audience expects expertise and precision.

Characteristics: high confidence (0.9), moderate formality (0.7), low warmth (0.3). Favors specific examples, acknowledges tradeoffs, uses "specifically," "in practice," "the key constraint here is."

### friendly-explainer

Approachable, encouraging, patient. Appropriate for tutorials, onboarding guides, educational content, and situations where reducing friction matters more than demonstrating expertise.

Characteristics: high warmth, lower confidence (to invite engagement rather than declare authority), favors conversational sentence structure and progressive disclosure.

### executive-brief

Concise, outcome-focused. Appropriate for business cases, stakeholder communications, executive summaries, and any content where time-to-decision is the primary concern.

Characteristics: minimal hedging, leads with conclusions, uses specific metrics, avoids technical detail unless directly relevant to decisions.

### casual-conversational

Relaxed, personal, opinion-forward. Appropriate for blog posts, social media, newsletters, and community content where authenticity matters more than formality.

Characteristics: first-person perspective, opinions stated directly (not hedged), shorter paragraphs, conversational connectives.

## The Four Skills

### voice-apply

Transform existing content or generate new content in a specified voice.

Natural language triggers: "Write this in technical voice," "Make it more casual," "Use the executive-brief voice," "Transform this to match [example text]."

### voice-create

Generate new voice profiles from descriptions or example text.

Natural language triggers: "Create a voice for API documentation," "Make a voice profile from this sample," "Define a new voice that's precise but friendly."

New profiles are saved to `.aiwg/voices/` (project-scoped) or `~/.config/aiwg/voices/` (user-scoped).

### voice-blend

Combine multiple profiles with weighted ratios.

Natural language triggers: "Blend 70% technical with 30% friendly," "Mix executive and casual voices," "Combine these two profiles."

### voice-analyze

Analyze the current voice characteristics of existing content.

Natural language triggers: "What voice is this written in?," "Analyze the tone of this document," "How formal is this content?"

Output is a structured analysis mapping the content against the profile schema dimensions (formality, confidence, warmth, energy, vocabulary patterns, structural patterns).

## Profile Resolution Order

For runtime-selectable cross-kind composition, see
`@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-modes.md`.

When a skill looks for a voice profile by name, it checks:

1. `.aiwg/voices/` — Project-specific profiles
2. `~/.config/aiwg/voices/` — User-wide profiles
3. `@$AIWG_ROOT/agentic/code/addons/voice-framework/voices/templates/` — Built-in profiles

Project profiles override user profiles, which override built-ins. This means you can create a project-local `technical-authority.yaml` that overrides the built-in with project-specific vocabulary preferences.

## Voice Profile Schema

Profiles are YAML files defining tone dimensions, vocabulary preferences, structural patterns, and perspective settings. The schema is validated by `@$AIWG_ROOT/agentic/code/addons/voice-framework/schemas/voice-profile.schema.json`.

Key fields:
- `tone.formality` (0–1): 0 = casual, 1 = formal
- `tone.confidence` (0–1): 0 = tentative, 1 = assertive
- `tone.warmth` (0–1): 0 = clinical, 1 = personable
- `vocabulary.prefer` / `vocabulary.avoid` / `vocabulary.signature_phrases`
- `structure.sentence_length`, `structure.use_lists`, `structure.include_examples`
- `perspective.person` (first/second/third), `perspective.opinion_level`
- `authenticity.acknowledge_tradeoffs`, `authenticity.use_specific_numbers`

## Installation

```bash
# Deploy with writing quality
aiwg use writing

# Or with all frameworks
aiwg use all
```

## References

- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/quickstart.md` — Apply your first voice profile
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/voices/templates/` — Built-in profile files
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/schemas/voice-profile.schema.json` — Profile schema
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/schemas/output-mode-profile.schema.json` — Output-mode profile schema
