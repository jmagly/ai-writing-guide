# REF-013: MetaGPT - Meta Programming for Multi-Agent Collaborative Framework

## Citation

Hong, S., Zhuge, M., Chen, J., Zheng, X., Cheng, Y., Zhang, C., Wang, J., Wang, Z., Yau, S. K. S., Lin, Z., Zhou, L., Ran, C., Xiao, L., Wu, C., & Schmidhuber, J. (2024). MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework. *The Twelfth International Conference on Learning Representations (ICLR 2024)*.

**arXiv**: [https://arxiv.org/abs/2308.00352](https://arxiv.org/abs/2308.00352)

**GitHub**: [https://github.com/geekan/MetaGPT](https://github.com/geekan/MetaGPT)

## Summary

MetaGPT introduces a meta-programming framework that encodes **Standardized Operating Procedures (SOPs)** into LLM-based multi-agent collaboration. By embedding human workflow patterns into prompt sequences, agents with domain expertise can verify intermediate results and reduce compounding errors. Uses an assembly-line paradigm for task decomposition.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Meta Programming** | Using SOPs as programs that guide agent behavior |
| **Standardized Operating Procedures** | Encoded human workflow best practices |
| **Assembly Line** | Sequential processing with specialized stations |
| **Intermediate Verification** | Each stage validates before passing forward |

### Architecture

```
Requirement
     ↓
┌────────────────────────────────────────────┐
│ Product Manager                            │
│   SOP: Create PRD with user stories        │
│   Output: Product Requirements Document    │
├────────────────────────────────────────────┤
│ Architect                                  │
│   SOP: Design system architecture          │
│   Output: System design, API specs         │
├────────────────────────────────────────────┤
│ Project Manager                            │
│   SOP: Break down into tasks               │
│   Output: Task list, schedule              │
├────────────────────────────────────────────┤
│ Engineer(s)                                │
│   SOP: Implement per specifications        │
│   Output: Code files                       │
├────────────────────────────────────────────┤
│ QA Engineer                                │
│   SOP: Write and execute tests             │
│   Output: Test results, bug reports        │
└────────────────────────────────────────────┘
     ↓
Complete Software Project
```

### Key Findings

1. **SOPs Reduce Errors**: Encoding best practices into agent prompts significantly reduces hallucination and drift
2. **Intermediate Artifacts Matter**: Forcing explicit outputs at each stage enables verification
3. **Assembly Line > Unstructured Chat**: Sequential processing with handoffs outperforms free-form discussion
4. **Human Workflows Transfer**: Software engineering SOPs work in LLM context

### Benchmark Results

MetaGPT generates more coherent solutions than chat-based multi-agent systems on collaborative software engineering benchmarks.

## AIWG Application

### Direct Parallels

| MetaGPT Feature | AIWG Equivalent |
|-----------------|-----------------|
| SOPs as prompts | Flow command templates |
| Assembly line | Phase gates with handoffs |
| Intermediate verification | Gate check validation |
| Domain expertise roles | 58 specialized agents |
| PRD, specs, code | .aiwg/ artifact progression |

### Critical Insight: SOPs as Guardrails

MetaGPT's key innovation is embedding SOPs directly into agent behavior. AIWG implements this via:

```markdown
# AIWG Flow Command (SOP Encoded)

## flow-inception-to-elaboration

### Prerequisites
- [ ] Intake validated
- [ ] Vision document approved

### Procedure
1. Architecture Designer creates SAD draft
2. Security Architect reviews for threats
3. Test Architect reviews for testability
4. Requirements Analyst verifies traceability
5. Documentation Synthesizer merges feedback

### Exit Criteria
- [ ] SAD baselined in .aiwg/architecture/
- [ ] 3-5 ADRs approved
- [ ] Master Test Plan drafted
```

### Lessons for AIWG

1. **Explicit SOPs > Implicit Knowledge**: Write down procedures, don't assume agents know
2. **Intermediate Artifacts**: Each phase should produce verifiable outputs
3. **Sequential Verification**: Check work before passing to next stage
4. **Role Boundaries**: Clear responsibilities reduce conflicts

### Implementation Pattern

MetaGPT's assembly line maps to AIWG's artifact flow:

```
MetaGPT:
  PRD → System Design → Task Breakdown → Code → Tests

AIWG:
  Intake → Requirements → Architecture → Implementation → Deployment
    ↓           ↓              ↓              ↓             ↓
  .aiwg/     .aiwg/        .aiwg/          Code        .aiwg/
  intake/  requirements/  architecture/    + tests    deployment/
```

## Key Quotes

> "MetaGPT incorporates efficient human workflows as a meta function to coordinate the expert agents, thereby streamlining the entire process."

> "By encoding SOPs into prompt sequences for more streamlined workflows, agents with human-like domain expertise can verify intermediate results and reduce errors."

> "MetaGPT utilizes an assembly line paradigm to assign diverse roles to various agents, efficiently breaking down complex tasks into subtasks."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Workflow Orchestration | **Critical** - SOP encoding pattern |
| Phase Gates | **Critical** - intermediate verification |
| Artifact Management | **High** - structured outputs |
| Agent Design | **High** - role specialization |

## Cross-References

- **REF-012**: ChatDev (comparison framework)
- **REF-010**: Cooper Stage-Gate (similar phased approach)
- **Flow Commands**: `.claude/commands/flow-*.md`
- **Templates**: `agentic/code/frameworks/sdlc-complete/templates/`

## Related Work

- ChatDev: Qian, C., et al. (2024). Communicative Agents for Software Development
- AgentVerse: Chen, W., et al. (2023). Facilitating Multi-Agent Collaboration
- CAMEL: Li, G., et al. (2023). Communicative Agents for "Mind" Exploration

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
