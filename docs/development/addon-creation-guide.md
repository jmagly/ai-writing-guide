# Creating AIWG Addons

Addons are standalone utilities that work anywhere - with or without frameworks installed.

## When to Create an Addon

Create an addon when you have:

- Utilities that don't depend on any framework
- Tools that should be available across all projects
- Features that complement but don't extend specific frameworks

Examples: voice profiles, validation tools, code quality checkers, documentation generators.

## Quick Start

### Using CLI (Fastest)

```bash
# Create addon structure
aiwg scaffold-addon my-addon --description "My custom utilities"

# Navigate to addon
cd ~/.local/share/ai-writing-guide/agentic/code/addons/my-addon

# Add components
aiwg add-agent my-helper --to my-addon --template simple
aiwg add-command run-check --to my-addon --template utility
```

### Using In-Session Commands (Guided)

```bash
/devkit-create-addon my-addon --interactive
```

Claude will ask about:

1. **Purpose**: What problem does this addon solve?
2. **Capabilities**: What agents, commands, or skills will it provide?
3. **Target audience**: Who will use this addon?
4. **Dependencies**: Does it need external tools or APIs?

## Addon Structure

```
my-addon/
├── manifest.json       # Package metadata and component registry
├── README.md           # User documentation
├── agents/             # Agent definitions
│   └── my-helper.md
├── commands/           # Slash commands
│   └── run-check.md
├── skills/             # Skills (optional)
│   └── my-skill/
│       ├── SKILL.md
│       └── references/
└── templates/          # Document templates (optional)
    └── my-template.md
```

## Manifest Configuration

```json
{
  "id": "my-addon",
  "type": "addon",
  "name": "My Addon",
  "version": "1.0.0",
  "description": "What this addon does",
  "author": "Your Name",
  "license": "MIT",
  "core": false,
  "autoInstall": false,
  "entry": {
    "agents": "agents",
    "commands": "commands",
    "skills": "skills"
  },
  "agents": ["my-helper"],
  "commands": ["run-check"],
  "skills": []
}
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `id` | Unique identifier (lowercase, hyphens) |
| `type` | Must be `"addon"` |
| `core` | If `true`, auto-installed with any framework |
| `autoInstall` | If `true`, installed with AIWG by default |
| `entry` | Maps component types to directories |
| `agents/commands/skills` | Arrays of component names (no .md extension) |

## Creating Agents

### Simple Agent (Single Responsibility)

```bash
aiwg add-agent code-checker --to my-addon --template simple
```

Generated structure:

```markdown
---
name: code-checker
description: [Brief description]
model: sonnet
tools: Read, Write, Bash
---

# Code Checker Agent

## Domain Expertise
[What this agent specializes in]

## Responsibilities
- [Primary task]
- [Secondary task]

## Process
1. [Step one]
2. [Step two]
```

### Complex Agent (Multi-Step Analysis)

```bash
aiwg add-agent security-auditor --to my-addon --template complex
```

Additional sections: Knowledge Base, Analysis Framework, Output Format.

### Orchestrator Agent (Coordinates Others)

```bash
aiwg add-agent workflow-manager --to my-addon --template orchestrator
```

Includes Task tool for multi-agent coordination.

## Creating Commands

### Utility Command (Quick Operations)

```bash
aiwg add-command quick-check --to my-addon --template utility
```

```markdown
---
name: quick-check
description: Perform quick validation check
args:
  - name: target
    description: File or directory to check
    required: true
---

Check the specified target for common issues.

## Process
1. Validate target exists
2. Run checks
3. Report results
```

### Transformation Command (Input → Output)

```bash
aiwg add-command convert-format --to my-addon --template transformation
```

Structured for clear input processing and output generation.

### Orchestration Command (Multi-Agent Workflow)

```bash
aiwg add-command full-review --to my-addon --template orchestration
```

Includes agent assignment table and workflow phases.

## Creating Skills

```bash
aiwg add-skill auto-format --to my-addon
```

Skills differ from commands - they're triggered by natural language patterns rather than slash commands.

```
auto-format/
├── SKILL.md           # Trigger phrases and execution process
└── references/        # Supporting documentation
```

## Testing Your Addon

### Local Testing

```bash
# Deploy to test project
aiwg -deploy-agents --target ./test-project --mode general

# Verify commands available
ls ./test-project/.claude/commands/

# Test in Claude Code session
cd ./test-project
# /run-check some-file.ts
```

### Validation

```bash
# Check manifest and structure
aiwg validate ~/.local/share/ai-writing-guide/agentic/code/addons/my-addon --verbose

# Auto-fix issues
aiwg validate my-addon --fix
```

## Distribution

### Include in AIWG

1. Create PR to ai-writing-guide repository
2. Place addon in `agentic/code/addons/`
3. Update `agentic/code/addons/manifest.json` (addon registry)

### Standalone Distribution

1. Package addon directory
2. Users install to `~/.local/share/ai-writing-guide/agentic/code/addons/`
3. Deploy with `aiwg -deploy-agents --mode general`

## Best Practices

1. **Keep addons focused** - One clear purpose, not kitchen sink utilities
2. **Document thoroughly** - README should explain all features
3. **Use descriptive names** - `code-quality-checker` not `cqc`
4. **Version semantically** - Major.Minor.Patch
5. **Test before publishing** - Use `--dry-run` and local testing
6. **Update manifest** - Keep agents/commands arrays in sync with files

## Examples

### Existing Addons

- `aiwg-utils` - Core utilities (context regeneration, workspace management)
- `voice-framework` - Voice profiles and voice-apply skill
- `writing-quality` - Banned patterns, validation rules
- `guided-implementation` - Bounded iteration control for issue-to-code workflows

### Reference Implementations

- Simple addon: `agentic/code/addons/writing-quality/`
- Complex addon: `agentic/code/addons/voice-framework/`
- Core addon: `agentic/code/addons/aiwg-utils/`
- Research-backed addon: `agentic/code/addons/guided-implementation/`
