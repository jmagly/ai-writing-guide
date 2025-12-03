# Writing Quality Addon

**Type**: Addon (standalone utility)
**Version**: 1.0.0
**Framework Dependency**: None (works with any framework or standalone)

## Overview

The Writing Quality addon provides AI pattern detection and content improvement capabilities. It helps remove AI "tells" from generated content while maintaining sophistication and authenticity.

## Components

### Agents (3)

| Agent | Purpose |
|-------|---------|
| `writing-validator` | Validates content against 505 AI patterns across 6 categories |
| `prompt-optimizer` | Enhances prompts using AI Writing Guide principles |
| `content-diversifier` | Generates varied examples and perspectives |

### Content Directories

| Directory | Contents |
|-----------|----------|
| `core/` | Philosophy and sophistication principles |
| `validation/` | Banned patterns, detection markers (505 patterns) |
| `examples/` | Before/after rewrites demonstrating improvements |
| `context/` | Quick-reference guides for different voices |
| `patterns/` | Pattern JSON files for programmatic validation |

## Installation

```bash
# Deploy writing addon only
aiwg -deploy-agents --mode writing

# Deploy with all frameworks
aiwg -deploy-agents --mode all
```

## Usage

### Validate Content

```bash
# Using the writing-validator agent
"Check this document for AI patterns: docs/readme.md"
```

### Optimize Prompts

```bash
# Using the prompt-optimizer agent
"Optimize this prompt for better output: [your prompt]"
```

### Generate Variations

```bash
# Using the content-diversifier agent
"Generate 5 variations of this concept: [your concept]"
```

## Pattern Categories

The addon detects patterns across 6 categories:

1. **Filler phrases** - Empty hedging ("It's worth noting", "In today's world")
2. **Buzzwords** - Overused tech jargon ("leverage", "cutting-edge")
3. **Vague quantifiers** - Imprecise claims ("significantly improve")
4. **Passive constructions** - Weak voice patterns
5. **Redundant modifiers** - Unnecessary intensifiers
6. **Formulaic structures** - Template-like sentence patterns

## Integration with Frameworks

The Writing Quality addon works seamlessly with:

- **SDLC Complete**: Validate documentation, README files, architecture docs
- **Media/Marketing Kit**: Validate marketing copy, blog posts, social content
- **Standalone**: Use independently for any content improvement task

## Related ADRs

- ADR-008: Plugin Type Taxonomy (defines addon classification)

## License

MIT License - See repository root for details.
