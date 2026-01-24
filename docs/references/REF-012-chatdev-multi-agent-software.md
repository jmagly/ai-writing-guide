# REF-012: ChatDev - Communicative Agents for Software Development

## Citation

Qian, C., Liu, W., Liu, H., Chen, N., Dang, Y., Li, J., Yang, C., Chen, W., Su, Y., Cong, X., Xu, J., Li, D., Liu, Z., & Sun, M. (2024). ChatDev: Communicative Agents for Software Development. *Proceedings of the 62nd Annual Meeting of the Association for Computational Linguistics (ACL 2024)*, 15174-15186.

**arXiv**: [https://arxiv.org/abs/2307.07924](https://arxiv.org/abs/2307.07924)

**GitHub**: [https://github.com/OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev)

## Summary

ChatDev is a virtual software company powered by LLM agents playing specialized roles (CEO, CTO, Programmer, Tester, etc.) that collaborate through natural language communication to complete the entire software development lifecycle. The framework demonstrates that explicit task decomposition and role specialization significantly improve code quality over single-agent approaches.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Virtual Software Company** | Agents as roles in a company structure |
| **Chat Chain** | Structured dialogue protocol for agent communication |
| **Role Specialization** | Each agent has domain-specific expertise and responsibilities |
| **Waterfall with Iteration** | Phases: Design → Coding → Testing → Documentation |

### Architecture

```
User Requirement
       ↓
┌─────────────────────────────────────────────┐
│ CEO ←→ CTO: Design Phase                    │
│   Requirements analysis, architecture       │
├─────────────────────────────────────────────┤
│ CTO ←→ Programmer: Coding Phase             │
│   Implementation, code review               │
├─────────────────────────────────────────────┤
│ Programmer ←→ Tester: Testing Phase         │
│   Unit tests, bug fixing                    │
├─────────────────────────────────────────────┤
│ CTO ←→ Programmer: Documentation Phase      │
│   README, comments                          │
└─────────────────────────────────────────────┘
       ↓
   Complete Software
```

### Key Findings

1. **Role Specialization Works**: ChatDev significantly outperforms single-agent GPT-4 on software tasks
2. **Communication Protocol Matters**: Structured "chat chains" improve collaboration quality
3. **Decomposition is Essential**: "Complex tasks are difficult to solve in a single-step solution"
4. **Quality Improvement**: ChatDev raised quality score from 0.1523 to 0.3953 vs MetaGPT

### Comparison with Baselines

| System | Quality | Completeness | Notes |
|--------|---------|--------------|-------|
| GPT-Engineer | Low | Low | Single-agent |
| MetaGPT | 0.1523 | Medium | SOPs but less communication |
| **ChatDev** | **0.3953** | **High** | Rich agent communication |

## AIWG Application

### Direct Parallels

| ChatDev Feature | AIWG Equivalent |
|-----------------|-----------------|
| Role-based agents | 58 specialized SDLC agents |
| CEO, CTO, Programmer | Architecture Designer, Software Implementer |
| Chat Chain protocol | Primary→Reviewers→Synthesizer pattern |
| Waterfall phases | Inception→Elaboration→Construction→Transition |
| Quality review | Multi-agent review panels |

### Key Insight: Structured Communication

ChatDev's success validates AIWG's approach to structured agent communication:

```
ChatDev Chat Chain:
  CEO ←→ CTO: "What architecture should we use?"
  CTO → Programmer: "Implement using MVC pattern"

AIWG Equivalent:
  Primary Author → Draft
  Reviewer 1: "Security concern in auth module"
  Reviewer 2: "Missing test coverage for edge case"
  Synthesizer → Integrated document with feedback addressed
```

### Lessons for AIWG

1. **Rich Communication > Simple Delegation**: ChatDev's bidirectional chat outperforms simple task assignment
2. **Domain Expertise Per Role**: Each agent should have bounded, deep knowledge
3. **Explicit Phase Boundaries**: Clear handoffs improve quality
4. **Iterative Refinement**: Multiple rounds of review improve output

## Key Quotes

> "Software development is a complex task that requires the cooperation of multiple roles in organizations."

> "ChatDev outperforms all baseline methods across all metrics... explicitly decomposing difficult problems into smaller subtasks enhances effectiveness."

> "Language serves as a unifying bridge for autonomous task-solving among LLM agents."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Multi-Agent Architecture | **Critical** - validates approach |
| Agent Communication | **High** - structured dialogue patterns |
| Workflow Orchestration | **High** - phase-based development |
| Quality Assurance | **Medium** - review mechanisms |

## Cross-References

- **REF-007**: Jacobs et al. MoE (theoretical foundation)
- **REF-004**: MAGIS (similar multi-agent for GitHub issues)
- **REF-013**: MetaGPT (comparison framework)
- **Multi-Agent Pattern**: `docs/multi-agent-documentation-pattern.md`

## Related Work

- MetaGPT: Hong, S., et al. (2024). Meta Programming for Multi-Agent Collaboration
- AutoGen: Wu, Q., et al. (2023). Enabling next-gen LLM applications via multi-agent conversation
- CAMEL: Li, G., et al. (2023). Communicative Agents for "Mind" Exploration

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
