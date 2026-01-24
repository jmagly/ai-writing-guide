# Citation Placement Plan

This document guides where and how citations appear in AIWG documentation, implementing Decision 5 from the documentation professionalization initiative.

## Decision 5 Summary

| Location | Citations | Format |
|----------|-----------|--------|
| README.md | None | Professional terms only |
| Practitioner docs | None | Dual inline terminology |
| `docs/research/` | Mixed | (Author, Year) + REF-XXX link |
| Glossary | Table | Informal \| Professional \| Citation |

## Location Rules

### README.md

**Rule**: No citations. Use professional terminology without attribution.

**Example**:
```markdown
<!-- CORRECT -->
AIWG provides structured semantic memory, ensemble validation, and closed-loop self-correction.

<!-- INCORRECT -->
AIWG provides structured semantic memory (Lewis et al., 2020)...
```

### Practitioner Documentation

**Scope**: All docs in `docs/` except `docs/research/`

**Rule**: No inline citations. Use dual terminology format.

**Example**:
```markdown
<!-- CORRECT -->
AIWG implements **structured semantic memory** (context stacks) to maintain project knowledge across sessions.

<!-- INCORRECT -->
AIWG implements structured semantic memory (Lewis et al., 2020) to maintain...
```

### Research Documentation

**Scope**: `docs/research/` directory

**Rule**: Full academic citations with REF links.

**Example**:
```markdown
<!-- CORRECT -->
AIWG's memory architecture draws on Retrieval-Augmented Generation (Lewis et al., 2020; see REF-008), extending the pattern with bidirectional traceability links (Gotel & Finkelstein, 1994; see REF-011).

<!-- ALSO CORRECT -->
The Ralph loop implements closed-loop self-correction as described in Self-Refine [REF-015], enhanced with external verification to address model blind spots [REF-002].
```

### Glossary

**Scope**: `docs/research/glossary.md`

**Rule**: Table format with citation column.

**Example**:
```markdown
| Informal Term | Professional Term | Citation | Definition |
|---------------|-------------------|----------|------------|
| Context stacks | Structured Semantic Memory | Lewis et al. (2020), Graves et al. (2014) | Persistent knowledge store... |
```

### Reference Files

**Scope**: `docs/references/REF-*.md`

**Rule**: Full academic citation in header, inline citations as needed.

**Example**:
```markdown
## Citation

Lewis, P., Perez, E., Piktus, A., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems 33 (NeurIPS 2020)*.
```

## Migration Checklist

Files that may need citation removal:

| File | Current State | Action |
|------|---------------|--------|
| README.md | No citations | None needed |
| CLAUDE.md | No citations | None needed |
| docs/multi-agent-documentation-pattern.md | Check | Remove if present |
| docs/ralph-guide.md | Check | Remove if present |
| agentic/code/frameworks/sdlc-complete/docs/*.md | Check | Remove if present |

Files that should have citations:

| File | Current State | Action |
|------|---------------|--------|
| docs/research/glossary.md | Has citations | ✅ Complete |
| docs/references/README.md | Has REF links | ✅ Complete |
| docs/references/REF-*.md | Has full citations | ✅ Complete |

## Implementation Order

1. **Phase 1** (Complete): Create reference files with full citations
2. **Phase 2** (Complete): Create glossary with citation table
3. **Phase 3** (Next): Audit practitioner docs for stray citations
4. **Phase 4**: Create `docs/research/foundations.md` with academic framing

## Validation

Before merging documentation changes:

1. **README check**: `grep -E '\([A-Z][a-z]+,?\s*\d{4}\)' README.md` should return nothing
2. **Practitioner check**: Same grep on `docs/*.md` excluding `docs/research/`
3. **Research check**: `docs/research/*.md` should have (Author, Year) patterns

## Exceptions

None. The tiered citation strategy applies uniformly.

## Rationale

- **Practitioners** need actionable guidance, not academic sourcing
- **Researchers** validating claims need traceable citations
- **README** serves as marketing/overview, not academic paper
- **Glossary** bridges informal↔professional with clear attribution

---

*Last updated: 2026-01-24*
*Issue: #74 Research Acquisition, Decision 5*
