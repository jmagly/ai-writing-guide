# ADR-015: Enhanced Model Selection and Tier System

## Status

Proposed

## Context

Users need more flexibility in model selection when deploying AIWG agents:

1. **Quality Control**: Deploy all agents with highest-quality models for critical projects
2. **Cost Optimization**: Use economy models for development/testing
3. **Per-Agent Customization**: Override specific agents based on task complexity
4. **Provider Abstraction**: Consistent tier naming across providers (Claude, OpenAI, etc.)

The current system uses role-based model assignment (`reasoning`, `coding`, `efficiency`) with CLI overrides, but lacks:
- Named quality tiers (economy, standard, premium, max-quality)
- Per-agent model tagging in frontmatter
- Global/project tier preferences
- Model capability metadata for intelligent selection

## Decision

Implement a tiered model selection system with:

1. **Four Standard Quality Tiers**: `economy`, `standard`, `premium`, `max-quality`
2. **Agent-Level Model Tags**: Extended frontmatter with `model-tier` and `model-override`
3. **Hierarchical Configuration**: Global -> User -> Project -> Agent precedence
4. **Provider-Specific Mappings**: Abstract tiers to concrete model identifiers
5. **CLI Tier Commands**: `aiwg models` subcommand group
6. **SDK/DevKit Integration**: Programmatic model selection API

## Consequences

### Positive

- Users can deploy all agents at consistent quality level with single command
- Cost optimization through tier selection
- Per-agent customization when needed
- Future-proof as new models are released
- Consistent experience across providers

### Negative

- More complex configuration system
- Migration required from current `model: opus|sonnet|haiku` format
- Need to maintain model mappings as providers update offerings

## Alternatives Considered

1. **Direct Model Names Only**: Rejected - ties configuration to specific model versions
2. **Capability-Based Selection**: Deferred - useful but adds complexity; can be Phase 2
3. **Single Global Override**: Rejected - too coarse, no per-agent control

---

## References

- @agentic/code/frameworks/sdlc-complete/config/models.json - Current model configuration
- @agentic/code/frameworks/media-marketing-kit/config/models.json - MMK model configuration
- @tools/agents/deploy-agents.mjs - Current deployment implementation
- @src/cli/index.mjs - CLI command router
