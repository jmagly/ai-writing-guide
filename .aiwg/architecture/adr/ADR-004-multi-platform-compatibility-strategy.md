# ADR-004: Multi-Platform Compatibility Strategy

**Date**: 2024-10-17
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: Platform Architecture

## Context

The AI Writing Guide initially targets Claude Code (Claude's official CLI) as the primary platform. However, the AI coding assistant landscape is rapidly evolving:

- **Market dynamics**: OpenAI Codex, GitHub Copilot, Cursor, and others gaining adoption
- **User requests**: Early feedback includes "Can this work with ChatGPT?"
- **Platform differences**: Each platform has unique agent formats, tool access, context limits
- **Abstraction cost**: Building platform abstraction layer upfront adds significant complexity
- **Unknown demand**: Actual multi-platform demand uncertain until MVP proven

The challenge is balancing immediate delivery for Claude Code users with potential future multi-platform support without over-engineering.

## Decision

Adopt a **"Monitor-then-Abstract" strategy** - remain Claude-focused initially, add abstraction only after validated demand:

**Phase 1 (Current)**: Claude Code First
- Optimize for Claude Code agent format
- Use Claude-specific features freely
- Document Claude assumptions clearly
- Monitor user requests for other platforms

**Phase 2 (Triggered by demand)**: Compatibility Layer
```text
If (OpenAI/Codex requests > 20% of issues) then:
  - Create platform abstraction interface
  - Build compatibility adapters
  - Add --provider parameter
  - Generate platform-specific outputs
```

**Phase 3 (If needed)**: Full Multi-Platform
- Platform-agnostic core
- Provider plugins
- Feature parity across platforms
- Platform-specific optimizations

**Monitoring triggers**:
- GitHub issues requesting platform support
- Fork activity for platform adaptations
- Community contributions for compatibility

## Consequences

### Positive
- **Faster MVP**: No abstraction overhead initially
- **Claude optimization**: Can leverage Claude-specific features fully
- **Data-driven decision**: Abstract only when proven need
- **Simpler maintenance**: Single platform easier to support
- **Clear focus**: Better Claude Code experience vs mediocre multi-platform

### Negative
- **Refactor risk**: Might need significant changes if abstraction needed
- **Technical debt**: Claude assumptions baked into architecture
- **Lost users**: Those on other platforms can't use initially
- **Competitive disadvantage**: Competitors might support more platforms

### Neutral
- Success tied to Claude Code adoption
- Community might fork for other platforms
- Abstraction complexity deferred but not eliminated

## Alternatives Considered

### 1. Platform Abstraction Upfront
**Rejected**: Premature optimization, adds complexity without proven need

### 2. Claude-Only Forever
**Rejected**: Limits adoption potential, ignores market evolution

### 3. Multi-Platform from Start
**Rejected**: Dilutes focus, delays MVP, complex testing matrix

### 4. Plugin Architecture
**Considered**: Good eventual solution but overkill for MVP

### 5. Community-Driven Ports
**Considered**: Possible approach, but fragments experience

## Implementation Status

✅ Claude Code agent format used
✅ Documentation mentions Claude Code specifically
✅ No abstraction layer present
⏳ Monitoring GitHub issues for platform requests

## Abstraction Design (Future)

If abstraction triggered, proposed interface:

```javascript
interface AgentProvider {
  formatAgent(definition: AgentDef): string
  deployAgent(agent: string, target: string): void
  getContextLimit(): number
  supportsTools(): string[]
}

class ClaudeProvider implements AgentProvider { }
class OpenAIProvider implements AgentProvider { }
```

## Migration Path

If abstraction needed:
1. Define provider interface
2. Wrap current code in ClaudeProvider
3. Add provider factory
4. Implement OpenAIProvider
5. Update deployment tools
6. Test both providers
7. Document platform differences

## Monitoring Metrics

Track monthly:
- Platform-related GitHub issues
- "OpenAI", "Codex", "ChatGPT" mentions
- Fork activity for adaptations
- Community PR submissions

**Abstraction trigger**: >20% of issues platform-related for 2 consecutive months

## Related Decisions

- ADR-001: Modular Deployment (helps platform adaptation)
- ADR-003: Zero-Data Architecture (no platform analytics)

## References

- Current Implementation: Claude-specific `.claude/agents/` format
- Platform Compatibility Guide: `docs/openai-compat.md` (future)
- Deployment Tool: `tools/agents/deploy-agents.mjs`