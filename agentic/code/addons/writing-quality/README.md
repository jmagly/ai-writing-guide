# Writing Quality Addon

**Type**: Addon (standalone utility)
**Version**: 1.1.0
**Framework Dependency**: None (works with any framework or standalone)

## Overview

The Writing Quality addon provides content validation and writing improvement capabilities. It works alongside the Voice Framework to ensure consistent, natural writing that matches your intended voice.

> **Recommended**: Use the **[Voice Framework](../voice-framework/README.md)** addon for positive voice definition. The Voice Framework provides voice profiles that define the voice you *want*—the preferred approach for consistent writing.

## Components

### Agents (3)

| Agent | Purpose |
|-------|---------|
| `writing-validator` | Validates content for voice consistency and authenticity |
| `prompt-optimizer` | Enhances prompts using AI Writing Guide principles |
| `content-diversifier` | Generates varied examples and perspectives |

### Content Directories

| Directory | Contents |
|-----------|----------|
| `core/` | Philosophy and sophistication principles |
| `validation/` | Writing quality guidelines and markers |
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

## Quality Checks

The addon validates content across 6 categories:

1. **Specificity** - Concrete details vs. vague claims
2. **Voice consistency** - Matching the intended tone throughout
3. **Precision** - Accurate quantifiers and metrics
4. **Active voice** - Strong, direct sentence construction
5. **Appropriate modifiers** - Meaningful intensifiers
6. **Natural structure** - Varied, authentic sentence patterns

## Integration with Frameworks

The Writing Quality addon works seamlessly with:

- **SDLC Complete**: Validate documentation, README files, architecture docs
- **Media/Marketing Kit**: Validate marketing copy, blog posts, social content
- **Voice Framework**: Combine quality validation with positive voice definition
- **Standalone**: Use independently for any content improvement task

## Voice Framework Integration

For the best writing experience, combine Writing Quality with the Voice Framework:

```bash
# Deploy both addons
aiwg use writing           # Includes Writing Quality + Voice Framework
```

**Complementary approaches:**

| Approach | Writing Quality | Voice Framework |
|----------|----------------|-----------------|
| **Method** | Quality validation | Voice profiles (define) |
| **Focus** | Content consistency | Voice definition |
| **Output** | Quality assessment | Transformed content |
| **Use Case** | Validation | Generation |

**Recommended workflow:**
1. Define voice profile for your project
2. Generate content using voice profiles
3. Validate output with Writing Quality for edge cases

## Related ADRs

- ADR-008: Plugin Type Taxonomy (defines addon classification)

## License

MIT License - See repository root for details.
