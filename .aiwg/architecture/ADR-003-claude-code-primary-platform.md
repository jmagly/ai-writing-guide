# ADR-003: Claude Code as Primary Target Platform

**Status**: ACCEPTED
**Date**: 2025-10-15
**Decision Makers**: Joseph Magly (Project Owner), Architecture Designer
**Phase**: Inception

## Context

The AI Writing Guide agent framework requires a target AI coding assistant platform. Several platforms exist: Claude Code (Anthropic), GitHub Copilot (OpenAI), Cursor (OpenAI/Anthropic), Codeium, Tabnine. Each platform has different agent/command capabilities.

**Key Requirements**:
- Native agent support (specialized AI agents, not just autocomplete)
- Command framework (slash commands for workflows)
- Parallel execution (multiple agents simultaneously)
- Context isolation (agents operate independently)
- Open API (not proprietary black box)

## Decision

**We will target Claude Code as the primary platform, with OpenAI/Codex compatibility as secondary.**

Implementation:
- Primary agent directory: `.claude/agents/`
- Primary command directory: `.claude/commands/`
- Secondary agent directory: `.codex/agents/` (OpenAI compatibility)
- Agent format: Markdown with YAML frontmatter
- Model selection: Claude Sonnet 4 (default), overridable

## Alternatives Considered

### Alternative 1: GitHub Copilot (Primary)

**Pros**:
- Largest user base (millions of developers)
- Native GitHub integration
- Familiar to developers (installed by default for many)

**Cons**:
- Limited agent support (autocomplete-focused, not agent-focused)
- No native command framework (no `.github/copilot/commands/`)
- No parallel execution support (single-threaded suggestions)
- No context isolation (full codebase context always loaded)
- Proprietary API (no agent customization)

**Decision**: REJECTED (insufficient agent/command support)

### Alternative 2: Cursor

**Pros**:
- Supports both OpenAI and Anthropic models
- Agent-like features (chat, composer)
- Popular among developers (growing user base)

**Cons**:
- No standardized agent directory (no `.cursor/agents/`)
- No command framework (custom rules only)
- Proprietary platform (closed source, paid product)
- Less documentation for agent development
- Not designed for SDLC agent teams

**Decision**: REJECTED (no standard agent framework)

### Alternative 3: Platform-Agnostic (No Primary Target)

**Pros**:
- Maximum compatibility (works with all platforms)
- No vendor lock-in
- Future-proof (new platforms emerge)

**Cons**:
- Lowest common denominator (can't use platform-specific features)
- No parallel execution (not all platforms support)
- No command framework (not all platforms have slash commands)
- Poor developer experience (generic, not optimized for any platform)

**Decision**: REJECTED (too generic, sacrifices capabilities)

### Alternative 4: OpenAI/Codex (Primary)

**Pros**:
- Large user base (ChatGPT, OpenAI API widely used)
- Powerful models (GPT-4, GPT-5 coming)
- Well-documented API

**Cons**:
- No native agent directory (no standard `.openai/agents/`)
- Command support varies (not standardized like Claude Code)
- Context isolation not as clear (pricing model encourages large contexts)
- OpenAI platform bias (not all developers use OpenAI)

**Decision**: SECONDARY (support as compatibility, not primary)

### Alternative 5: Multiple Primary Platforms (Claude + OpenAI)

**Pros**:
- Maximize reach (both Anthropic and OpenAI users)
- No platform lock-in (users choose)
- Feature parity across platforms

**Cons**:
- Double maintenance (test on both platforms)
- Lowest common denominator (can't use Claude-specific features)
- Solo developer can't maintain multiple platforms equally
- Confusing documentation (different instructions per platform)

**Decision**: REJECTED (too much maintenance overhead for solo developer)

## Consequences

### Positive

1. **Native Agent Support**:
   - Claude Code has `.claude/agents/` directory (standard agent location)
   - Agents discovered dynamically (no registration required)
   - Agents operate independently (context isolation built-in)

2. **Command Framework**:
   - Claude Code has `.claude/commands/` directory (slash commands)
   - Commands expand to full prompts (workflow automation)
   - Users can create custom commands (extensible)

3. **Parallel Execution**:
   - Claude Code Task tool enables parallel agent execution
   - Multiple agents run simultaneously (60-80% token reduction, 40-60% faster)
   - Core value proposition enabled (token optimization)

4. **Context Optimization**:
   - Agents operate with isolated context (no full codebase)
   - Token usage optimized (pay only for relevant context)
   - Performance optimized (faster execution with less context)

5. **Documentation and Support**:
   - Claude Code has comprehensive agent documentation
   - Active development (Anthropic commits to platform)
   - Growing community (developers sharing agents)

### Negative

1. **Platform Lock-In**:
   - Primary experience optimized for Claude Code
   - OpenAI users get secondary experience (compatibility, not optimization)
   - Claude Code required for full feature set

2. **Smaller User Base**:
   - Claude Code has smaller user base than GitHub Copilot
   - Limits initial adoption (fewer potential users)
   - Marketing challenge (need to promote Claude Code itself)

3. **Platform Risk**:
   - Anthropic could change Claude Code architecture
   - Anthropic could discontinue Claude Code (unlikely but possible)
   - API breaking changes require framework updates

4. **Cost Barrier**:
   - Claude Code requires Anthropic API access (paid, though free tier exists)
   - GitHub Copilot included for many developers (Microsoft enterprise)
   - Pricing model affects adoption (some users avoid paid AI tools)

5. **Feature Fragmentation**:
   - OpenAI compatibility is secondary (not all features work identically)
   - Users on different platforms have different experiences
   - Testing burden (must validate on multiple platforms)

### Mitigations

**Platform Lock-In**:
- Provide OpenAI/Codex compatibility (`.codex/agents/` directory)
- Document platform differences clearly
- Design agents to be platform-agnostic where possible

**Smaller User Base**:
- Document Claude Code installation in README (educate users)
- Provide OpenAI compatibility for GitHub Copilot users
- Marketing focuses on value proposition (not platform lock-in)

**Platform Risk**:
- Monitor Claude Code development (Anthropic changes)
- Maintain OpenAI compatibility as fallback
- Agent definitions are Markdown (portable if platform changes)

**Cost Barrier**:
- Emphasize free tier availability (Anthropic offers free API access)
- Highlight token optimization (framework reduces API costs)
- Document cost-benefit (60-80% token reduction justifies API cost)

**Feature Fragmentation**:
- Test on both Claude Code and OpenAI platforms
- Document platform-specific features clearly
- Provide fallback behavior for unsupported features

## Validation

**Success Criteria**:
- [ ] 54 agents deployed to `.claude/agents/` (v1.0)
- [ ] 32 commands deployed to `.claude/commands/` (v1.0)
- [ ] Parallel execution validated (Task tool with multiple agents)
- [ ] Token optimization measured (60-80% reduction demonstrated)
- [ ] OpenAI compatibility validated (agents work in `.codex/agents/`)

**Validation Timeline**:
- **Week 3 of Elaboration**: Test agent deployment on Claude Code
- **Week 4 of Elaboration**: Test parallel execution (multiple agents)
- **Post-v1.0**: Validate OpenAI compatibility (community feedback)

## Related Decisions

- **ADR-002**: Markdown as Primary Content Format (Claude Code expects Markdown agents)
- **ADR-001**: Git-Based Distribution (agents distributed via git)
- **Multi-Platform Support**: Documented in `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`

## References

- Claude Code Documentation: https://docs.claude.com/claude-code
- Claude Code Agent Guide: https://docs.claude.com/claude-code/agents
- Anthropic API: https://docs.anthropic.com/
- OpenAI Compatibility: `agentic/code/frameworks/sdlc-complete/agents/openai-compat.md`

**Conclusion**: Claude Code provides the best agent and command support for a token-optimized, parallel-execution AI framework. OpenAI compatibility ensures broader reach without sacrificing core capabilities.
