# REF-022: AutoGen - Enabling Next-Gen LLM Applications via Multi-Agent Conversation

## Citation

Wu, Q., Bansal, G., Zhang, J., Wu, Y., Zhang, S., Zhu, E., Li, B., Jiang, L., Zhang, X., & Wang, C. (2023). AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation. *arXiv preprint arXiv:2308.08155*.

**arXiv**: [https://arxiv.org/abs/2308.08155](https://arxiv.org/abs/2308.08155)

**GitHub**: [https://github.com/microsoft/autogen](https://github.com/microsoft/autogen)

## Summary

AutoGen is Microsoft's framework for building multi-agent applications where customizable agents converse with each other to solve tasks. Agents can combine LLMs, human input, and tools in flexible configurations. The framework emphasizes conversation as the primary coordination mechanism.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Conversable Agents** | Agents that communicate via natural language |
| **Customizable Behaviors** | Configurable agent responses and tool use |
| **Human-in-the-Loop** | Seamless human participation in agent conversations |
| **Conversation Patterns** | Structured multi-agent dialogue flows |

### Architecture

```
┌─────────────────────────────────────────────────┐
│ Conversation Manager                            │
├─────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│ │ Agent A │←→│ Agent B │←→│ Agent C │          │
│ │ (LLM)   │  │ (Human) │  │ (Tool)  │          │
│ └─────────┘  └─────────┘  └─────────┘          │
├─────────────────────────────────────────────────┤
│ Conversation History & Context                  │
└─────────────────────────────────────────────────┘
```

### Key Findings

1. **Conversation-Centric**: Natural language as coordination protocol
2. **Flexible Composition**: Agents combine LLMs, humans, tools
3. **Production Ready**: 2.7M downloads, 37K GitHub stars
4. **Domain Agnostic**: Works across coding, math, QA, decision-making

### Conversation Patterns

| Pattern | Description |
|---------|-------------|
| Two-Agent Chat | Simple back-and-forth dialogue |
| Group Chat | Multiple agents with turn-taking |
| Hierarchical | Manager delegates to workers |
| Sequential | Pipeline of agent handoffs |

## AIWG Application

### Direct Parallel: Agent Communication

AIWG's multi-agent pattern aligns with AutoGen's conversation model:

| AutoGen Pattern | AIWG Equivalent |
|-----------------|-----------------|
| Conversable agents | Specialized SDLC agents |
| Group chat | Multi-agent review panel |
| Human-in-loop | User approval gates |
| Tool agents | Agents with Bash, Read, Write tools |

### Integration Pattern

```
AutoGen:
  User Request → Agent A → Agent B → Agent C → Response

AIWG:
  Requirement → Primary Author → Reviewers → Synthesizer → Artifact
```

### Key Differences from AIWG

| Aspect | AutoGen | AIWG |
|--------|---------|------|
| Coordination | Conversation-based | Artifact-based |
| Output | Conversation result | Structured document |
| Persistence | Chat history | .aiwg/ artifacts |
| Validation | Conversational agreement | Gate checks |

### Why AutoGen Matters for AIWG

1. **Conversation Patterns**: Validated multi-agent dialogue approaches
2. **Human Integration**: Patterns for human-in-the-loop
3. **Composition**: Flexible agent combination strategies
4. **Scale**: Production evidence at massive scale

## Key Quotes

> "AutoGen enables development of LLM applications using multiple agents that can converse with each other to solve tasks."

> "Using AutoGen, developers can flexibly define agent interaction behaviors."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Multi-Agent Architecture | **High** - conversation patterns |
| Agent Communication | **High** - dialogue protocols |
| Human-in-Loop | **Medium** - approval integration |
| Production Patterns | **Medium** - scale validation |

## Cross-References

- **REF-012**: ChatDev (role-based communication)
- **REF-013**: MetaGPT (SOP-guided agents)
- **REF-007**: Mixture of Experts (ensemble foundation)
- **Multi-Agent Pattern**: `docs/multi-agent-documentation-pattern.md`

## Related Work

- ChatDev: Qian et al. (2024) - virtual software company
- MetaGPT: Hong et al. (2024) - SOP-driven agents
- CAMEL: Li et al. (2023) - role-playing agents

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
