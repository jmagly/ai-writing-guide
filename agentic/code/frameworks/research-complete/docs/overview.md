# Research Framework Overview

The Research Framework automates academic research management across an 8-stage workflow: discover papers via semantic search, acquire PDFs with integrity validation, summarize using retrieval-augmented generation, track citations, assess quality with GRADE methodology, archive for long-term preservation, and maintain provenance. It eliminates manual busywork while enforcing standards that prevent the most common research failure mode — hallucinated citations.

## Why It Exists

Literature reviews are slow and error-prone when done manually. The framework addresses specific pain points:

| Problem | What the Framework Does | Time Savings |
|---------|------------------------|--------------|
| Manual paper search across databases | Semantic search with relevance ranking | 60% faster |
| Tracking where papers came from | Persistent REF-XXX identifiers assigned on acquisition | Always organized |
| Paywalled paper handling | Unpaywall integration + manual upload workflow | Streamlined |
| Reading full papers | RAG-grounded summarization at 3 levels | ~75% faster (20min → 5min) |
| Fabricated citations | All claims validated against source text | 0% vs 56% hallucination rate |
| Inconsistent quality assessment | Automated GRADE scoring | Consistent standards |
| Fragmented notes | Zettelkasten literature notes with atomic linking | Scalable knowledge base |

## The 8-Stage Workflow

```
1. Discovery      Find papers via semantic search, gap detection
2. Acquisition    Download PDFs, assign REF-XXX, validate integrity
3. Documentation  RAG summarization, structured extraction, lit notes
4. Citation       Format citations, build citation networks, bibliographies
5. Quality        GRADE assessments, FAIR validation, quality scoring
6. Synthesis      Create permanent notes, link related work
7. Gap Analysis   Identify research gaps and contradictions
8. Archival       OAIS-compliant archiving, integrity verification, provenance
```

All 8 stages are implemented in v1.0.0.

## Agent Catalog

Eight agents, one per workflow stage:

| Agent | Purpose | Key Capability |
|-------|---------|----------------|
| `discovery-agent` | Semantic search, gap detection | 200M+ papers via Semantic Scholar; citation network traversal |
| `research-acquisition-agent` | Download PDFs, assign IDs | FAIR validation, SHA-256 checksums, deduplication |
| `documentation-agent` | RAG summarization | Zero-hallucination target; multi-level summaries; Zettelkasten notes |
| `citation-agent` | Format citations | 9000+ citation styles; citation network analysis |
| `quality-agent` | Assess paper quality | GRADE methodology (High/Moderate/Low/Very Low) |
| `archival-agent` | Long-term preservation | OAIS compliance; SIP/AIP/DIP packages |
| `provenance-agent` | Lineage tracking | W3C PROV logging; reproducibility packages |
| `workflow-agent` | Orchestrate pipelines | DAG-based execution; parallel stages; failure recovery |

## Key Design Choices

### REF-XXX Identifiers

Every paper gets a persistent `REF-XXX` identifier when acquired. This ID appears in summaries, citations, notes, and provenance records, providing a stable cross-reference that survives database reorganizations and file moves.

### Zero-Hallucination Target for Summaries

The documentation agent validates every claim in a summary against the source PDF before including it. Claims with confidence below the threshold are flagged for user review rather than included silently. This is the reason the framework requires actual PDFs rather than just metadata.

### FAIR Compliance

Acquired papers are scored on Findability, Accessibility, Interoperability, and Reusability (0-100). Papers below threshold are flagged rather than silently accepted. This matters for systematic reviews where you need to demonstrate that your corpus meets quality standards.

### GRADE Quality Assessment

The quality agent applies the GRADE framework used in clinical and policy research to assess evidence quality. This is more useful than star ratings or citation counts because it evaluates the type and reliability of evidence, not just its popularity.

## Storage Structure

All research artifacts go in `.aiwg/research/`:

```
.aiwg/research/
├── discovery/              # Search results, strategies, gap reports, acquisition queues
├── sources/                # Stage 2 output
│   ├── pdfs/               # REF-XXX-{slug}.pdf
│   ├── metadata/           # REF-XXX-metadata.json
│   └── checksums.txt       # SHA-256 integrity verification
├── knowledge/              # Stage 3 output
│   ├── summaries/          # REF-XXX-summary.md
│   ├── extractions/        # REF-XXX-extraction.json (structured data)
│   └── notes/              # REF-XXX-literature-note.md + permanent notes
└── config/                 # Per-agent configuration YAML files
```

## Integration with SDLC

The research framework can be used alongside sdlc-complete. The artifact directories do not overlap (`.aiwg/research/` vs `.aiwg/requirements/` etc.). A common pattern is using the discovery and documentation agents during Inception and Elaboration phases to ground architectural decisions in the literature:

```bash
# During Inception: research relevant patterns
aiwg research search "event sourcing CQRS patterns" --year 2020-2024

# During Elaboration: research authentication approaches
aiwg research search "OAuth2 security vulnerabilities" --venue conference
```

## References

- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/docs/quickstart.md` — Deploy and first literature review
- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/agents/` — Agent definitions
- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/inception/vision-document.md` — Framework vision
