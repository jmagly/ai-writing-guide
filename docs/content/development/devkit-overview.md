# AIWG Development Kit Overview

The AIWG Development Kit provides tools for creating, extending, and customizing the AI Writing Guide framework ecosystem.

## Three-Tier Plugin Taxonomy

AIWG uses a three-tier structure for extensibility:

| Type | Scale | Standalone | Location | Example |
|------|-------|------------|----------|---------|
| **Framework** | Large (50+ agents) | Yes | `agentic/code/frameworks/` | sdlc-complete, media-marketing-kit |
| **Extension** | Medium (5-20 agents) | No (requires parent) | `frameworks/{id}/extensions/` | gdpr, hipaa, sox |
| **Addon** | Small (1-10 agents) | Yes | `agentic/code/addons/` | aiwg-utils, voice-framework |

### When to Use Each

- **Create a Framework** when building a complete lifecycle solution with many interdependent agents, templates, and workflows (e.g., full software development lifecycle)

- **Create an Extension** when adding domain-specific capabilities to an existing framework (e.g., HIPAA compliance for SDLC, FTC guidelines for marketing)

- **Create an Addon** when building standalone utilities that work anywhere, with or without frameworks (e.g., voice profiles, validation tools)

## Available Tools

### CLI Commands (Outside Sessions)

Scaffolding for quick package creation:

```bash
# Create new packages
aiwg scaffold-addon <name> [--description "..."] [--dry-run]
aiwg scaffold-extension <name> --for <framework> [--description "..."] [--dry-run]
aiwg scaffold-framework <name> [--description "..."] [--dry-run]

# Add components to existing packages
aiwg add-agent <name> --to <target> [--template simple|complex|orchestrator] [--dry-run]
aiwg add-command <name> --to <target> [--template utility|transformation|orchestration] [--dry-run]
aiwg add-skill <name> --to <target> [--dry-run]
aiwg add-template <name> --to <target> [--type document|checklist|matrix|form] [--category <subdir>] [--dry-run]

# Validate packages
aiwg validate <path> [--fix] [--verbose]
```

### In-Session Commands (Within Claude Code)

Interactive, AI-guided creation:

```bash
# Create packages with guidance
/devkit-create-addon <name> [--interactive]
/devkit-create-extension <name> --for <framework> [--interactive]
/devkit-create-framework <name> [--interactive]

# Add components with templates
/devkit-create-agent <name> --to <target> [--template simple|complex|orchestrator]
/devkit-create-command <name> --to <target> [--template utility|transformation|orchestration]

# Validate and fix packages
/devkit-validate <path> [--fix] [--verbose]
```

## Quick Start

### Creating an Addon

```bash
# CLI approach (quick scaffolding)
aiwg scaffold-addon my-utils --description "My custom utilities"

# Result:
# agentic/code/addons/my-utils/
# ├── manifest.json
# ├── README.md
# ├── agents/
# ├── commands/
# └── skills/

# Add components
aiwg add-agent code-helper --to my-utils --template simple
aiwg add-command run-analysis --to my-utils --template utility
```

```bash
# In-session approach (interactive guidance)
/devkit-create-addon my-utils --interactive
# Claude guides you through purpose, capabilities, target audience

/devkit-create-agent code-helper --to my-utils --template complex
# Claude helps define expertise, tools, responsibilities
```

### Creating an Extension

```bash
# CLI approach
aiwg scaffold-extension hipaa --for sdlc-complete --description "HIPAA compliance templates"

# Result:
# agentic/code/frameworks/sdlc-complete/extensions/hipaa/
# ├── manifest.json (with "requires": ["sdlc-complete"])
# ├── README.md
# ├── templates/
# └── checklists/

# Add compliance templates
aiwg add-template phi-audit --to sdlc-complete/extensions/hipaa --type checklist
```

### Creating a Framework

```bash
# Framework creation is complex - use interactive mode
/devkit-create-framework fintech-lifecycle --interactive
# Claude helps design phase structure, agent roster, template organization
```

## Agent Templates

When adding agents with `--template`:

| Template | Model | Tools | Use Case |
|----------|-------|-------|----------|
| `simple` | sonnet | Read, Write, Bash | Single-responsibility agents |
| `complex` | sonnet | Read, Write, Bash, Glob, Grep, WebFetch | Multi-step analysis agents |
| `orchestrator` | opus | All + Task tool | Agents that coordinate other agents |

## Command Templates

When adding commands with `--template`:

| Template | Structure | Use Case |
|----------|-----------|----------|
| `utility` | Single action | Quick operations, lookups |
| `transformation` | Input → Process → Output | File conversion, formatting |
| `orchestration` | Multi-agent workflow | Complex workflows with agent coordination |

## Template Types

When adding templates with `--type`:

| Type | Format | Use Case |
|------|--------|----------|
| `document` | Markdown with sections | Architecture docs, guides |
| `checklist` | Markdown with checkboxes | Audit lists, review checklists |
| `matrix` | Markdown table | Decision matrices, RACI charts |
| `form` | YAML frontmatter + Markdown | Intake forms, questionnaires |

## Manifest Schema

All packages require a `manifest.json`:

```json
{
  "id": "package-id",
  "type": "addon|framework|extension",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "description": "What this package does",
  "author": "Author Name",
  "license": "MIT",
  "requires": ["parent-framework"],  // Extensions only
  "core": false,                      // Auto-install with any framework?
  "autoInstall": false,
  "entry": {
    "agents": "agents",
    "commands": "commands",
    "skills": "skills",
    "templates": "templates"
  },
  "agents": ["agent-one", "agent-two"],
  "commands": ["command-one", "command-two"],
  "skills": ["skill-one"],
  "templates": ["template-one"]
}
```

## Validation

The `aiwg validate` command checks:

- Manifest schema compliance
- Required fields present
- Component files exist for all manifest entries
- Directory structure matches type conventions
- Extension parent framework exists

With `--fix`:

- Creates missing directories
- Adds missing components to manifest
- Removes orphaned manifest entries

## Documentation

Detailed guides:

- [Creating Addons](#dev-addons)
- [Creating Extensions](#dev-extensions)
- [Creating Frameworks](#dev-frameworks)
- [Addon Walkthrough](#dev-walkthrough)

## Related

- [SDLC Framework Quick Start](#quickstart-sdlc)
- [Agent Design Rules](#ref-agent-design)
- [CLI Reference](#ref-cli)
