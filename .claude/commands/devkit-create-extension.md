---
name: devkit-create-extension
description: Create a new AIWG extension (framework expansion pack) with AI-guided setup
args: <name> --for <framework> [--interactive --guidance "text"]
---

# Create AIWG Extension

Create a new extension (framework expansion pack) with AI assistance.

Extensions enhance a specific parent framework with additional templates, checklists, and domain-specific content. They cannot operate standalone.

## Usage

```
/devkit-create-extension <name> --for <framework> [--interactive]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| name | Yes | Extension name (kebab-case recommended) |

## Required Options

| Option | Description |
|--------|-------------|
| --for | Parent framework ID (e.g., sdlc-complete, media-marketing-kit) |

## Optional Options

| Option | Description |
|--------|-------------|
| --interactive | Enable interactive mode with guided questions |

## What This Creates

```
agentic/code/frameworks/<framework>/extensions/<name>/
├── manifest.json      # type: "extension", requires: ["<framework>"]
├── README.md          # Documentation
├── templates/         # Domain-specific templates
└── checklists/        # Compliance/verification checklists
```

## Interactive Mode

When `--interactive` is specified, I will ask:

1. **Domain**: What compliance/domain does this extension address?
2. **Purpose**: What specific requirements or standards does it cover?
3. **Templates**: What templates should be included?
4. **Checklists**: What verification checklists are needed?
5. **Dependencies**: Does it depend on other extensions?

## Examples

```bash
# Quick creation
/devkit-create-extension hipaa --for sdlc-complete

# Interactive guided creation
/devkit-create-extension sox --for sdlc-complete --interactive
```

## Common Extension Types

### Compliance Extensions
- `gdpr` - EU data protection
- `hipaa` - Healthcare (US)
- `sox` - Financial controls (US)
- `pci-dss` - Payment card security
- `ftc` - FTC advertising rules

### Domain Extensions
- `healthcare` - Healthcare-specific templates
- `fintech` - Financial technology patterns
- `government` - Government/public sector

## Execution

1. **Validate inputs**: Check name and framework
2. **Verify framework exists**: Ensure parent framework is installed
3. **Check for duplicates**: Verify extension doesn't exist
4. **Gather info**: In interactive mode, ask about domain and needs
5. **Generate manifest**: Create with `requires` field for parent
6. **Create structure**: Build templates/ and checklists/ directories
7. **Generate README**: Document extension purpose and usage
8. **Optionally create content**: Offer to create initial templates/checklists
9. **Report success**: Show created files and activation instructions

## CLI Equivalent

For non-interactive creation:

```bash
aiwg scaffold-extension <name> --for <framework> --description "..."
```

## Related Commands

- `/devkit-create-addon` - Create standalone addon
- `/devkit-create-framework` - Create full framework
- `/devkit-validate` - Validate extension structure
- `aiwg add-template` - Add template to extension
