# Voice Framework Addon

Voice profile system for crafting and applying consistent writing voices. Define custom voices, apply them to content, and create new voices on demand.

## Overview

The Voice Framework replaces pattern-avoidance approaches (like banned-patterns lists) with positive voice definition. Instead of listing what to avoid, define the voice you want and let the framework apply it consistently.

## Installation

```bash
# Deploy with Writing Quality addon
aiwg use writing

# Or deploy with all frameworks
aiwg use all
```

## Built-in Voice Profiles

Located in `voices/templates/`:

| Profile | Description | Best For |
|---------|-------------|----------|
| `technical-authority` | Direct, precise, confident | API docs, architecture, engineering specs |
| `friendly-explainer` | Approachable, encouraging | Tutorials, onboarding guides, education |
| `executive-brief` | Concise, outcome-focused | Business cases, stakeholder communications |
| `casual-conversational` | Relaxed, personal | Blog posts, social media, newsletters |

## Skills

The Voice Framework provides 4 skills (auto-applied based on context):

### voice-apply

Transform content to match a specified voice profile.

**Triggers:**
- "Write this in technical voice"
- "Make it more casual"
- "Use the executive-brief voice"
- "Transform this to match [example]"

### voice-create

Generate new voice profiles from descriptions or examples.

**Triggers:**
- "Create a voice for API documentation"
- "Make a voice profile from this sample"
- "Define a new voice that's precise but friendly"

### voice-blend

Combine multiple voice profiles with weighted ratios.

**Triggers:**
- "Blend 70% technical with 30% friendly"
- "Mix executive and casual voices"
- "Combine these two profiles"

### voice-analyze

Analyze content's current voice characteristics.

**Triggers:**
- "What voice is this written in?"
- "Analyze the tone of this document"
- "How formal is this content?"

## Voice Profile Locations

Skills check these locations in priority order:

1. **Project:** `.aiwg/voices/` (project-specific profiles)
2. **User:** `~/.config/aiwg/voices/` (user-wide profiles)
3. **Built-in:** `voice-framework/voices/templates/` (AIWG defaults)

## Voice Profile Schema

Voice profiles are YAML files defining:

```yaml
name: technical-authority
description: Direct, precise, confident voice for technical content

tone:
  formality: 0.7       # 0=casual, 1=formal
  confidence: 0.9      # 0=tentative, 1=assertive
  warmth: 0.3          # 0=clinical, 1=personable
  energy: 0.4          # 0=measured, 1=enthusiastic

vocabulary:
  prefer:
    - "specifically"
    - "in practice"
    - "for example"
  avoid:
    - "leverage"
    - "utilize"
    - "seamlessly"
  signature_phrases:
    - "the key constraint here is"
    - "worth noting that"

structure:
  sentence_length: "varied"
  paragraph_style: "technical"
  use_lists: true
  include_examples: true

perspective:
  person: "second"      # first, second, third
  opinion_level: 0.6    # 0=objective, 1=opinionated
  uncertainty_shown: true

authenticity:
  acknowledge_tradeoffs: true
  reference_constraints: true
  use_specific_numbers: true
```

## Usage Examples

### Apply a Built-in Voice

```
User: "Write release notes in technical-authority voice"

Output: Release notes with precise terminology, specific version numbers,
direct statements, and tradeoff acknowledgments.
```

### Transform Existing Content

```
User: "Make this documentation more friendly for beginners"

Input: "The API endpoint accepts a JSON payload containing the requisite parameters..."

Output: "To use this endpoint, send it some JSON with the info it needs..."
```

### Create a Custom Voice

```
User: "Create a voice for our internal docs - casual but technically precise"

Output: New voice profile YAML saved to .aiwg/voices/internal-docs.yaml
```

### Blend Voices

```
User: "Write this with 70% technical and 30% friendly"

Process: Weighted merge of both profiles, applying combined characteristics.
```

## Replaces

This addon replaces:

- `writing-quality/validation/banned-patterns.md` (deprecated)
- `writing-quality/skills/ai-pattern-detection` (deprecated)

The pattern-avoidance approach is replaced by positive voice definition.

## Dependencies

None. Works standalone or with any framework.

## File Structure

```
voice-framework/
├── manifest.json           # Addon metadata
├── README.md               # This file
├── skills/
│   ├── voice-apply/        # Apply voice profiles
│   │   └── SKILL.md
│   ├── voice-create/       # Create new profiles
│   │   └── SKILL.md
│   ├── voice-blend/        # Combine profiles
│   │   └── SKILL.md
│   └── voice-analyze/      # Analyze voice characteristics
│       └── SKILL.md
├── voices/
│   └── templates/          # Built-in voice profiles
│       ├── technical-authority.yaml
│       ├── friendly-explainer.yaml
│       ├── executive-brief.yaml
│       └── casual-conversational.yaml
└── schemas/
    └── voice-profile.schema.json  # YAML validation schema
```

## Contributing

To add new built-in voices:

1. Create YAML profile in `voices/templates/`
2. Follow the schema in `schemas/voice-profile.schema.json`
3. Update `manifest.json` to include the new voice
4. Add examples to the skill documentation

## License

MIT - See [LICENSE](../../../../LICENSE)
