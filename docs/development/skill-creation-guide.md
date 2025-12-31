# Skill Creation Guide

Skills are reusable, auto-triggering capabilities that extend agent functionality. Unlike commands (user-invoked) or agents (orchestrator-launched), skills activate automatically when context matches.

## Skill Anatomy

```
skills/
└── my-skill/
    ├── SKILL.md          # Required: Skill definition
    └── scripts/          # Optional: Implementation scripts
        └── my_script.py
```

### SKILL.md Structure

```markdown
---
name: my-skill
description: Brief description (shown in skill catalog)
triggers:
  - pattern: "regex or keyword"
    weight: 0.8
tags: [category, domain]
---

# Skill Title

## Purpose

What this skill does and when it activates.

## Execution Steps

1. Step one
2. Step two

## Output Format

Expected output structure.
```

## Trigger Patterns

Skills activate based on trigger patterns matching user context:

| Trigger Type | Example | Use Case |
|--------------|---------|----------|
| Keyword | `"security review"` | Direct phrase match |
| Regex | `"(deploy|release) to prod"` | Flexible matching |
| Context | `"*.test.ts"` file in context | File-based activation |

## Implementation Patterns

### Prompt-Only Skills

Most skills need no code - the SKILL.md prompt is sufficient:

```markdown
## Execution Steps

1. Read the target file using the Read tool
2. Analyze for patterns X, Y, Z
3. Report findings in structured format
```

### Script-Backed Skills

For complex logic, add Python/Node scripts:

```markdown
## Execution Steps

1. Run `scripts/analyze.py` with file path
2. Parse JSON output
3. Present findings to user
```

Script conventions:
- Location: `skills/<skill-name>/scripts/`
- Input: CLI arguments or stdin
- Output: JSON to stdout
- Errors: stderr with exit code

## Creating a Skill

### Via CLI

```bash
aiwg add-skill my-skill --to aiwg-utils
```

### Via DevKit Command

```
/devkit-create-skill my-skill
```

### Manual Creation

1. Create `skills/my-skill/SKILL.md`
2. Add frontmatter with name, description, triggers
3. Document execution steps
4. Optionally add scripts

## Skill Categories

| Category | Location | Purpose |
|----------|----------|---------|
| SDLC | `sdlc-complete/skills/` | Lifecycle workflows |
| Marketing | `media-marketing-kit/skills/` | Campaign operations |
| Utilities | `aiwg-utils/skills/` | Cross-cutting tools |
| Voice | `voice-framework/skills/` | Writing assistance |
| Testing | `testing-quality/skills/` | Test automation |
| Doc Intel | `doc-intelligence/skills/` | Document processing |

## Skill vs Command vs Agent

| Aspect | Skill | Command | Agent |
|--------|-------|---------|-------|
| Invocation | Auto-trigger | `/slash-command` | Task tool |
| Scope | Single capability | User workflow | Domain expertise |
| Context | Stateless | Session | Isolated |
| Output | Inline | Varies | Report back |

## Best Practices

1. **Single responsibility**: One skill, one purpose
2. **Clear triggers**: Avoid overlapping patterns
3. **Graceful degradation**: Handle missing context
4. **Structured output**: Consistent format
5. **Documentation**: Explain when/why skill activates

## Testing Skills

```bash
# Validate skill structure
node tools/scaffolding/validate.mjs skills/<skill-name>

# Test trigger matching
aiwg skill-test <skill-name> "sample context"
```

## Deployment

Skills deploy automatically with `aiwg use`:

```bash
aiwg use sdlc        # Deploys SDLC skills to .claude/skills/
aiwg use marketing   # Deploys marketing skills
aiwg use all         # Deploys all skills
```

## References

- [DevKit Overview](devkit-overview.md)
- [Add-Skill CLI](../../tools/scaffolding/add-skill.mjs)
- [Skill Factory Addon](../../agentic/code/addons/skill-factory/)
