# ADR-001: Modular Deployment Strategy

**Date**: 2024-10-17
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: Deployment Architecture

## Context

The AI Writing Guide framework serves an extremely diverse user base ranging from individual developers working on personal projects to large enterprise teams managing complex SDLC workflows. This creates significant challenges:

- **Context window limitations**: Deploying all 58 SDLC agents and 24 commands overwhelms the context window for simple writing tasks
- **Cognitive overload**: Solo developers don't need enterprise-grade SDLC orchestration for basic prompt improvement
- **Adoption barriers**: Complex installation deters casual users who just want writing validation
- **Performance impact**: Loading unnecessary agents and commands slows down simple operations

Current all-or-nothing deployment forces users to accept the entire framework complexity even when they only need a subset of functionality.

## Decision

Implement a **mode-based deployment strategy** allowing selective component installation:

```bash
aiwg -deploy-agents --mode general|sdlc|both
```

**Three deployment modes**:

1. **general** - Core writing agents only (3 agents: writing-validator, prompt-optimizer, content-diversifier)
2. **sdlc** - Full SDLC framework (58 agents, 24 commands, templates, flows)
3. **both** - Combined deployment for comprehensive projects

**Implementation details**:
- Mode selection in `deploy-agents.mjs` filters agent subset
- Command deployment follows same mode pattern
- Templates remain accessible via read-only reference (not copied)
- User can switch modes by redeploying

## Consequences

### Positive
- **Reduced friction**: New users start with minimal complexity
- **Optimized context**: Only relevant agents loaded per use case
- **Gradual adoption**: Users can start simple, add SDLC later
- **Better performance**: Faster operations with fewer agents
- **Clear separation**: Writing improvement vs software development

### Negative
- **Mode switching overhead**: Requires redeployment to change modes
- **Potential confusion**: Users might not discover full capabilities
- **Maintenance complexity**: Multiple deployment paths to test
- **Documentation burden**: Must explain mode differences clearly

### Neutral
- Mode selection becomes critical onboarding decision
- Default mode choice affects first impression
- Feature discovery requires intentional exploration

## Alternatives Considered

### 1. All-or-Nothing Deployment
**Rejected**: Overwhelming for simple use cases, high abandonment risk

### 2. Manual Agent Selection
**Rejected**: Too complex for users, requires deep framework knowledge

### 3. Progressive Disclosure (start minimal, prompt to add)
**Considered**: Good UX but requires interactive runtime, not feasible in current architecture

### 4. Profile-Based Deployment (writer, developer, enterprise)
**Considered**: More granular but adds complexity without clear benefit

## Implementation Status

✅ Implemented in `tools/agents/deploy-agents.mjs`
✅ CLI supports `--mode` parameter
✅ Documentation updated with mode guidance
✅ Installation script defaults to mode selection prompt

## Related Decisions

- ADR-002: Multi-Agent Orchestration Pattern (affects SDLC mode)
- ADR-004: Multi-Platform Compatibility (mode abstraction helps)

## References

- Implementation: `tools/agents/deploy-agents.mjs`
- Documentation: `USAGE_GUIDE.md`
- CLI interface: `tools/install/install.sh`