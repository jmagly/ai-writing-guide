---
name: devkit-create-addon
description: Create a new AIWG addon with AI-guided setup
args: <name> [--interactive]
---

# Create AIWG Addon

Create a new standalone addon with AI assistance.

## Usage

```
/devkit-create-addon <name> [--interactive]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| name | Yes | Addon name (kebab-case recommended) |

## Options

| Option | Description |
|--------|-------------|
| --interactive | Enable interactive mode with guided questions |

## What This Creates

```
agentic/code/addons/<name>/
├── manifest.json      # Addon configuration
├── README.md          # Documentation
├── agents/            # Agent definitions
├── commands/          # Slash commands
└── skills/            # Auto-triggered skills
```

## Interactive Mode

When `--interactive` is specified, I will ask:

1. **Purpose**: What is the primary purpose of this addon?
2. **Capabilities**: What specific capabilities should it provide?
3. **Initial agents**: Should I create any starter agents?
4. **Initial commands**: Should I create any starter commands?
5. **Core status**: Should this be a core addon (auto-installed)?

## Examples

```bash
# Quick creation
/devkit-create-addon security-scanner

# Interactive guided creation
/devkit-create-addon code-metrics --interactive
```

## Execution

1. **Validate name**: Ensure name follows kebab-case convention
2. **Check existence**: Verify addon doesn't already exist
3. **Gather info**: In interactive mode, ask clarifying questions
4. **Generate manifest**: Create manifest.json with appropriate fields
5. **Create structure**: Build directory structure
6. **Generate README**: Create documentation with usage instructions
7. **Optionally create components**: If interactive, offer to create initial agents/commands
8. **Report success**: Show created files and next steps

## CLI Equivalent

For non-interactive creation, you can also use:

```bash
aiwg scaffold-addon <name> --description "..." --author "..."
```

## Related Commands

- `/devkit-create-agent` - Add agent to addon
- `/devkit-create-command` - Add command to addon
- `/devkit-create-skill` - Add skill to addon
- `/devkit-validate` - Validate addon structure
