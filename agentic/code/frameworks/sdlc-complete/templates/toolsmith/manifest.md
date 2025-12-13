# Toolsmith Templates Manifest

Templates and configuration for the Toolsmith feature.

## Directory Contents

| File | Type | Description |
|------|------|-------------|
| cli-tool-template.md | Template | Standard CLI tool specification template |
| config-template.json | Configuration | Default Toolsmith configuration |
| README.md | Documentation | Usage guide for templates |

### samples/

| File | Type | Description |
|------|------|-------------|
| jq.tool.md | Sample | Complete example specification for jq |

## Usage

These templates are used by the Toolsmith feature to generate tool specifications. They are deployed to `.aiwg/smiths/toolsmith/templates/` during initialization.

## Related

- @.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md
- @agentic/code/frameworks/sdlc-complete/agents/toolsmith-provider.md
