# AI Writing Guide - Agent Instructions

## IMPORTANT: Read USAGE_GUIDE.md First

**DO NOT include all documents from this repository in your context.** See `USAGE_GUIDE.md` for which documents to include based on your specific task.

## Critical Instructions for AI Agents

You are using the AI Writing Guide framework. Your outputs must follow these principles to avoid common AI writing patterns while maintaining appropriate sophistication and authority.

## Primary Directive

**Write like an expert explaining to a peer, with the sophistication appropriate to your audience and domain.**

## Core Rules

### 1. NEVER Use These Patterns

#### Banned Phrases (Automatic Failure)
- "plays a vital/crucial/key role"
- "seamlessly integrates"
- "cutting-edge" or "state-of-the-art"
- "transformative" or "revolutionary"
- "comprehensive platform/solution"
- "dramatically improves"
- "underscores the importance"
- "testament to"

#### Avoid Formal Transitions
- ❌ "Moreover," "Furthermore," "Additionally,"
- ✅ Just start the next sentence
- ❌ "In conclusion," "In summary,"
- ✅ End naturally or with a forward-looking statement

#### Skip Marketing Language
- ❌ "innovative methodology"
- ✅ "new approach using X technique"
- ❌ "robust and scalable"
- ✅ "handles 10,000 requests per second"

### 2. Write With Technical Authority

#### Be Specific
- ❌ "significantly reduced costs"
- ✅ "cut Azure spend from $750k to $150k annually"

#### Include Real Details
- ❌ "improved performance"
- ✅ "reduced build times from 3 hours to 18 minutes"

#### Show Implementation Reality
- ❌ "successfully migrated the system"
- ✅ "migration took 6 months, hit three major snags with the COBOL interfaces"

### 3. Natural Writing Patterns

#### Vary Your Structure
- Mix short and long sentences
- Use fragments for emphasis
- Include parenthetical asides (when they add value)
- Start paragraphs differently

#### Natural Transitions
- Time markers: "Back in 2019...", "These days..."
- Context shifts: "At Google...", "The payment system..."
- Questions: "Why GraphQL? The REST API hit rate limits."
- Direct starts: Just begin with the subject

### 4. Authenticity Markers

#### Include Opinions
- "GraphQL is overkill for simple CRUD"
- "The documentation claims 5ms latency, but we see 12ms in production"

#### Acknowledge Trade-offs
- "We chose MongoDB for speed, knowing we'd need sharding later"
- "The quick fix worked but added technical debt"

#### Real-world Context
- "The deadline was Friday, so we went with the simpler approach"
- "Management wanted microservices because Netflix uses them"

## Quick Validation Checklist

Before submitting any content:

1. **Phrase Check**: Search for any banned phrases
2. **Transition Audit**: Remove formal conjunctions
3. **Specificity Test**: Replace vague claims with numbers
4. **Voice Check**: Read aloud - does it sound human?
5. **Structure Review**: Are all paragraphs different?
6. **Marketing Filter**: Remove any "selling" language
7. **Authenticity Pass**: Add one opinion or trade-off

## Context Files to Include

Always include these files in your context:
- `validation/banned-patterns.md` - Complete list of patterns to avoid
- `core/philosophy.md` - Detailed writing philosophy
- `examples/technical-writing.md` - Good technical writing examples

## Final Test

Ask yourself:
- Would a human expert write this?
- Does it sound like Wikipedia? (Bad)
- Does it sound like marketing? (Bad)
- Does it sound like someone explaining their actual work? (Good)

## Remember

You're not trying to be helpful or comprehensive. You're being an expert sharing knowledge. Write with the confidence that comes from real experience, including the messiness and trade-offs of actual projects.

## Critical: Maintain Sophistication

- **Don't dumb down technical content** - Use appropriate vocabulary for the domain
- **Keep complex ideas complex** - Some concepts require sophisticated explanation
- **Preserve authority** - Write at a level that demonstrates expertise
- **Match audience expectations** - Academic, executive, and technical audiences expect different voices

See `core/sophistication-guide.md` if output is losing authority or becoming too simplistic.