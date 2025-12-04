# Agents Directory

This directory previously contained the writing-quality agents. Those agents have been moved to the addon structure.

## New Location

Writing-quality agents are now located at:

```
agentic/code/addons/writing-quality/agents/
├── content-diversifier.md
├── prompt-optimizer.md
└── writing-validator.md
```

## Why the Change?

Per ADR-008 (Plugin Type Taxonomy), AIWG uses a three-tier plugin structure:

- **Frameworks**: Complete lifecycle solutions (SDLC, MMK) in `agentic/code/frameworks/`
- **Addons**: Standalone utilities in `agentic/code/addons/`
- **Extensions**: Framework-specific modules

The writing-quality tools are classified as an **addon** because they work with any framework or independently.

## Deployment

The agents are automatically deployed from the correct location:

```bash
# Deploy writing addon agents
aiwg -deploy-agents --mode writing

# Deploy all (includes writing addon)
aiwg -deploy-agents --mode all
```

## See Also

- [Writing Quality Addon README](../agentic/code/addons/writing-quality/README.md)
- [ADR-008: Plugin Type Taxonomy](../.aiwg/architecture/decisions/ADR-008-plugin-type-taxonomy.md)
