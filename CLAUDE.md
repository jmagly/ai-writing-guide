# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

The AI Writing Guide is a comprehensive framework for improving AI-generated content quality. It provides guidelines, validation patterns, and specialized Claude Code agents to ensure AI outputs maintain authentic, professional writing standards while avoiding detection patterns.

## Critical Usage Instructions

### Context Selection Strategy

**IMPORTANT**: Do not include all documents from this repository in your context. The USAGE_GUIDE.md provides targeted document combinations for specific needs.

**Always include**: `CLAUDE.md` (this file)

**Add situationally based on task**:
- For AI pattern detection: `validation/banned-patterns.md`
- For maintaining authority: `core/sophistication-guide.md`
- For technical writing: `examples/technical-writing.md`
- For quick validation: `context/quick-reference.md`

## High-Level Architecture

### Document Framework Structure

1. **Core Philosophy (`core/`)**: Fundamental writing principles that guide all content generation. These establish the balance between removing AI patterns and maintaining sophisticated, authoritative voice.

2. **Validation Rules (`validation/`)**: Specific patterns, phrases, and structures that indicate AI-generated content. These are detection patterns that should be avoided.

3. **Context Documents (`context/`)**: Optimized, condensed versions of guidelines for efficient agent context usage. These provide quick-reference materials without overwhelming the context window.

4. **Examples (`examples/`)**: Before/after demonstrations showing transformation from AI-detected writing to authentic human voice while preserving technical depth.

5. **Agent Definitions (`.claude/agents/`)**: Pre-configured Claude Code subagents specialized for different aspects of writing improvement and validation.

### Agent Ecosystem

The repository includes specialized agents that can be invoked via `/project:agent-name`:

- **writing-validator**: Validates content against AI patterns and authenticity markers
- **prompt-optimizer**: Enhances prompts using AI Writing Guide principles
- **content-diversifier**: Generates varied examples and perspectives
- **code-reviewer**: Reviews code with focus on real-world quality metrics
- **test-engineer**: Creates comprehensive test suites with practical coverage
- **requirements-analyst**: Transforms vague requests into detailed specifications
- **devops-engineer**: Automates CI/CD and infrastructure tasks
- **architecture-designer**: Makes system design decisions

Agents work independently with isolated contexts and can be launched in parallel for complex tasks.

## Common Development Tasks

### Using the Writing Guide

```bash
# Validate content for AI patterns
/project:writing-validator "path/to/content.md"

# Optimize a prompt for better output
/project:prompt-optimizer "original prompt text"

# Generate diverse content examples
/project:content-diversifier "base concept or topic"
```

### Working with Agents

```bash
# Launch multiple agents in parallel for comprehensive work:
# 1. Use Task tool with multiple invocations in single message
# 2. Each agent operates independently
# 3. Results returned upon completion

# For complex multi-step tasks, use general-purpose agent
# For specific validations, use specialized agents
```

### Key Commands

```bash
# Review available agents
ls .claude/agents/

# Check agent configurations
cat .claude/agents/[agent-name].md

# View usage guide for context selection
cat USAGE_GUIDE.md
```

## Writing Guide Principles

When generating or reviewing content:

1. **Avoid banned patterns**: Check `validation/banned-patterns.md` for phrases that trigger AI detection
2. **Maintain sophistication**: Don't dumb down technical content - preserve domain-appropriate vocabulary
3. **Include authenticity markers**: Add opinions, acknowledge trade-offs, reference real-world constraints
4. **Vary structure**: Mix sentence lengths, paragraph structures, and transition styles
5. **Be specific**: Replace vague claims with exact metrics and concrete examples

## Important Notes

### Content Generation
- The goal is removing performative language, not simplifying content
- Maintain the sophistication level appropriate to the audience and domain
- Academic, executive, and technical content require different voice calibrations

### Agent Usage
- Agents are stateless - provide complete context in prompts
- Parallel execution is preferred for independent tasks
- Use specialized agents for their defined purposes, not general tasks

### Context Optimization
- Start with minimal context (just CLAUDE.md)
- Add documents only when specific problems emerge
- Different writing contexts need different guideline combinations

## Configuration

The repository includes:
- `.claude/settings.local.json`: Permissions and tool access configuration
- `.claude/agents/`: Specialized agent definitions
- No build commands or test suites (documentation/guideline repository)

## Development Workflow

1. **Initial content creation**: Start with CLAUDE.md only
2. **Pattern detection**: If AI patterns appear, add validation documents
3. **Voice correction**: If lacking authenticity, add example documents
4. **Full remediation**: Use complete suite only for persistent issues

Remember: Authority comes from expertise (not formality), sophistication from precision (not complexity), and authenticity from honesty (not casualness).