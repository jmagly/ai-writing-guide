# General-Purpose Agents

This directory contains Claude Code agents that support the AI Writing Guide's core mission: improving AI-generated content quality.

## Available Agents

### content-diversifier

Generates varied examples and perspectives to demonstrate range in AI-generated content. Helps show different approaches to solving the same writing problem.

**Use when:**

- Creating before/after examples
- Demonstrating multiple writing styles
- Exploring alternative phrasings
- Testing pattern detection across variations

### prompt-optimizer

Enhances prompts using AI Writing Guide principles to produce better, more authentic output.

**Use when:**

- Refining prompts to avoid banned patterns
- Improving specificity and clarity
- Balancing sophistication with authenticity
- Optimizing for domain-appropriate voice

### writing-validator

Validates content against AI patterns and authenticity markers defined in the Writing Guide.

**Use when:**

- Checking for banned phrases
- Detecting performative language
- Verifying authenticity markers
- Validating sophistication level

## Usage

```bash
# Validate content
/project:writing-validator path/to/content.md

# Optimize a prompt
/project:prompt-optimizer "Your prompt text here"

# Generate diverse examples
/project:content-diversifier "Base concept or topic"
```

## Relationship to SDLC Framework

These agents are distinct from the SDLC framework agents found in `/agentic/code/frameworks/sdlc-complete/agents/`. While SDLC agents focus on software development lifecycle tasks, these agents support writing quality and content generation.

## Context Selection

These agents work best when combined with relevant Writing Guide documents:

- **validation**: Include `validation/banned-patterns.md`
- **sophistication**: Include `core/sophistication-guide.md`
- **examples**: Include relevant files from `examples/`

See `USAGE_GUIDE.md` in the repository root for context optimization strategies.
