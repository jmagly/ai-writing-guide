# REF-006: Cognitive Load Theory

## Citation

Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.

**DOI**: [https://doi.org/10.1207/s15516709cog1202_4](https://doi.org/10.1207/s15516709cog1202_4)

**Link**: [Wiley Online Library](https://onlinelibrary.wiley.com/doi/abs/10.1207/s15516709cog1202_4)

## Summary

John Sweller's Cognitive Load Theory (CLT) builds on Miller's working memory research to explain how instructional design affects learning. The theory identifies three types of cognitive load and provides principles for optimizing instruction by reducing extraneous load while managing intrinsic load.

### Key Concepts

| Load Type | Definition | Example |
|-----------|------------|---------|
| **Intrinsic** | Inherent complexity of the material | Understanding recursion requires holding base case + recursive case |
| **Extraneous** | Load imposed by poor presentation | Searching between separate diagrams and text |
| **Germane** | Load devoted to schema construction | Connecting new concept to existing knowledge |

### Core Principles

1. **Working Memory Limitation**: Consistent with Miller (1956), working memory is limited
2. **Schema Acquisition**: Learning creates mental schemas that reduce future load
3. **Automation**: With practice, schemas become automated, freeing working memory
4. **Element Interactivity**: High-interacting elements increase intrinsic load

### Instructional Design Effects

| Effect | Description | Application |
|--------|-------------|-------------|
| **Worked Example** | Studying worked examples > solving equivalent problems | Provide templates, not blank canvases |
| **Split-Attention** | Integrated formats > separate sources | Keep related info together |
| **Redundancy** | Eliminate redundant information | Don't repeat same info in text + diagram |
| **Modality** | Audio + visual > visual only (for complex material) | Use multiple channels |
| **Expertise Reversal** | What helps novices may hurt experts | Adapt guidance to skill level |

## AIWG Application

### Direct Applications

| AIWG Feature | CLT Principle Applied |
|--------------|----------------------|
| **Templates** | Worked Example Effect - provide structure, not blank slate |
| **Integrated Docs** | Split-Attention Effect - keep context together |
| **Progressive Disclosure** | Expertise Reversal - adapt detail to audience |
| **Decomposition** | Reduce element interactivity per subtask |
| **Phase Gates** | Chunked validation reduces simultaneous load |

### Reducing Extraneous Load in AIWG

**Template Design**:
```markdown
## Bad: High Extraneous Load
"Create a requirements document following IEEE 830 standards,
ensuring traceability, with acceptance criteria for each requirement,
organized by functional area, with priority ratings..."

## Good: Low Extraneous Load (Template)
# Requirement: [REQ-XXX]
## Description: [What the system shall do]
## Acceptance Criteria:
- [ ] [Criterion 1]
## Priority: [High/Medium/Low]
## Traces To: [Use Case ID]
```

**Context Management**:
```markdown
## Bad: Split Attention
"See the architecture diagram in Appendix A,
cross-reference with the requirements in Section 3,
and validate against the NFRs in the supplementary doc..."

## Good: Integrated Format
The authentication module (shown below) implements REQ-AUTH-001:
[Diagram inline]
NFR: Response time < 200ms (NFR-PERF-003)
```

### Managing Intrinsic Load

AIWG's decomposition patterns directly address intrinsic load:

1. **Phase Gates**: Complex project → 5 phases with distinct concerns
2. **Agent Specialization**: Full SDLC knowledge → 58 agents with bounded expertise
3. **Template Modularity**: Complete document → discrete sections with templates
4. **Iteration Planning**: Full scope → timeboxed iterations with ≤7 items

### Germane Load Optimization

AIWG promotes schema formation through:

- **Consistent Patterns**: Same Primary→Reviewer→Synthesizer flow builds mental model
- **Terminology Standardization**: Predictable vocabulary reduces translation effort
- **Progressive Complexity**: Quickstart → Full Guide → Reference follows expertise progression

## Key Quotes

> "Cognitive load theory suggests that effective instructional material facilitates learning by directing cognitive resources toward activities that are relevant to learning rather than toward preliminaries to learning."

> "The manner in which information is presented to learners and the learning activities required of them can either facilitate or hinder learning."

> "Expertise reversal effect... instructional techniques that are effective for low knowledge learners may be ineffective or even counterproductive for high knowledge learners."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Template Design | **Critical** - worked examples principle |
| Documentation | **Critical** - split-attention avoidance |
| Multi-Audience | **High** - expertise reversal consideration |
| Task Decomposition | **High** - element interactivity management |

## Cross-References

- **REF-005**: Miller's Law (foundational working memory limits)
- **Multi-Audience Docs**: `docs/research/` tiers apply expertise reversal
- **Template Library**: `agentic/code/frameworks/sdlc-complete/templates/`

## Related Work

- Miller, G. A. (1956). The magical number seven, plus or minus two
- Sweller, J., van Merriënboer, J. J., & Paas, F. G. (1998). Cognitive architecture and instructional design
- Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
