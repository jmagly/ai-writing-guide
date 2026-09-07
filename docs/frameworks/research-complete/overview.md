# Research Framework Overview

The Research Framework helps teams turn source material into reviewable literature artifacts: search plans, acquired
papers, grounded summaries, citations, quality assessments, gap notes, and provenance records. Use it when research
needs to survive beyond a chat transcript and when citations or source boundaries matter.

## Common Use Cases

- Build a literature review for an architecture decision or policy brief.
- Collect papers for a systematic scan and keep acquisition records tied to stable `REF-XXX` identifiers.
- Summarize PDFs with source-grounded claims and reviewer-visible uncertainty.
- Track citation networks, quality posture, and gaps before synthesis.

## Why It Exists

Literature work often fails because sources, claims, and quality judgments drift apart. The framework addresses that
by keeping each research output tied to its source identity, retrieval metadata, and review state.

| Problem | What the Framework Does |
|---------|------------------------|
| Manual paper search across databases | Captures semantic searches, relevance notes, and gap-detection output |
| Tracking where papers came from | Assigns persistent `REF-XXX` identifiers during acquisition |
| Paywalled paper handling | Supports Unpaywall lookup and manual upload workflows |
| Reading full papers | Produces source-grounded summaries at multiple levels |
| Fabricated citations | Flags unsupported claims for review instead of treating them as accepted |
| Inconsistent quality assessment | Applies GRADE and FAIR-style checks with visible criteria |
| Fragmented notes | Produces literature notes that can be linked into a broader knowledge base |

## Workflow

```
1. Discovery      Find papers via semantic search, gap detection
2. Acquisition    Download PDFs, assign REF-XXX, validate integrity
3. Documentation  RAG summarization, structured extraction, lit notes
4. Citation       Format citations, build citation networks, bibliographies
5. Quality        GRADE assessments, FAIR validation, quality scoring
6. Synthesis      Create permanent notes, link related work
7. Gap Analysis   Identify research gaps and contradictions
8. Archival       OAIS-inspired archival workflow, integrity verification, provenance
```

## Agent Roles

The framework includes role-specific agents for each workflow stage:

| Agent | Purpose | Key Capability |
|-------|---------|----------------|
| `discovery-agent` | Semantic search, gap detection | Source discovery and citation network traversal |
| `research-acquisition-agent` | Download PDFs, assign IDs | FAIR validation, SHA-256 checksums, deduplication |
| `documentation-agent` | RAG summarization | Source-grounded summaries and literature notes |
| `citation-agent` | Format citations | Citation formatting and network analysis |
| `quality-agent` | Assess paper quality | GRADE methodology (High/Moderate/Low/Very Low) |
| `archival-agent` | Long-term preservation | OAIS compliance; SIP/AIP/DIP packages |
| `provenance-agent` | Lineage tracking | W3C PROV logging; reproducibility packages |
| `workflow-agent` | Orchestrate pipelines | DAG-based execution; parallel stages; failure recovery |

## Key Design Choices

### REF-XXX Identifiers

Every paper gets a persistent `REF-XXX` identifier when acquired. This ID appears in summaries, citations, notes, and provenance records, providing a stable cross-reference that survives database reorganizations and file moves.

### Source-Grounded Summaries

The documentation agent checks summary claims against the source PDF before treating them as accepted. Claims below
the configured confidence threshold are flagged for user review rather than included silently. This is the reason the
framework requires actual PDFs rather than just metadata.

### FAIR-Oriented Review

Acquired papers are scored on Findability, Accessibility, Interoperability, and Reusability (0-100). Papers below
threshold are flagged rather than silently accepted. The score records a workflow assessment; it is not a
certification of compliance or source quality.

### GRADE Quality Assessment

The quality workflow asks the agent to assess evidence using explicit criteria and record uncertainty. Review the
suitability of GRADE for the question and evidence type; a generated assessment still requires domain review.

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

- [Quickstart](quickstart.md) — Deploy and first literature review
- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/agents/` — Agent definitions
- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/inception/vision-document.md` — Framework vision
