---
paths:
  - "**/*.md"
  - "**/*.txt"
  - "docs/**"
  - "content/**"
  - "agentic/code/addons/voice-framework/**"
---

# Voice Framework Rules

These rules apply when working with markdown, documentation, or content files.

## Voice Profiles

The Voice Framework provides consistent, authentic writing through predefined profiles.

### Built-in Profiles

Located in `agentic/code/addons/voice-framework/voices/templates/`:

| Profile | Use For | Characteristics |
|---------|---------|-----------------|
| `technical-authority` | Docs, architecture, API refs | Direct, precise, confident |
| `friendly-explainer` | Tutorials, onboarding, guides | Approachable, encouraging |
| `executive-brief` | Business cases, summaries | Concise, outcome-focused |
| `casual-conversational` | Blogs, newsletters, community | Relaxed, personal |

### Profile Priority (First Found Wins)

1. Project: `.aiwg/voices/` (project-specific)
2. User: `~/.config/aiwg/voices/` (user-wide)
3. Built-in: `voice-framework/voices/templates/` (AIWG defaults)

## Voice Skills

| Skill | Purpose |
|-------|---------|
| `voice-apply` | Apply voice profile to content |
| `voice-create` | Generate new voice from description |
| `voice-blend` | Combine multiple profiles (e.g., 70% technical + 30% casual) |
| `voice-analyze` | Analyze content's current voice characteristics |

### Usage Examples

Natural language (skills auto-trigger):
- "Write this in technical-authority voice"
- "Make it more casual"
- "Create a voice for API docs - precise, no-nonsense"
- "Blend 70% technical with 30% friendly"

## Writing Principles

When generating or reviewing content:

1. **Apply appropriate voice**: Match audience and context
2. **Maintain sophistication**: Preserve domain-appropriate vocabulary - don't dumb down
3. **Include authenticity markers**: Add opinions, acknowledge trade-offs, reference constraints
4. **Vary structure**: Mix sentence lengths, paragraph structures, transition styles
5. **Be specific**: Replace vague claims with exact metrics and concrete examples

## Content Quality Guidelines

Authority comes from expertise (not formality), sophistication from precision (not complexity), and authenticity from honesty (not casualness).

### Avoid

- Performative language ("It's important to note...")
- Excessive hedging ("might", "could potentially")
- Empty superlatives ("very", "really", "extremely")
- Passive constructions where active works better

### Prefer

- Direct statements
- Concrete examples
- Measured confidence
- Technical precision when warranted

## AI Pattern Detection

Use `/ai-pattern-detection` skill or `/writing-validator` command to identify and fix:
- Overused AI-characteristic phrases
- Repetitive sentence structures
- Generic language lacking specificity
- Missing authenticity markers
