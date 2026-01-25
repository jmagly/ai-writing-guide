# REF-059: LitLLM - LLMs for Literature Review

## Citation

ServiceNow Research (2025). LitLLM for Scientific Literature Reviews.

**Project Site**: https://litllm.github.io/
**Documentation**: https://www.servicenow.com/blogs/2025/litllm-scientific-literature-reviews

## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2025 |
| Type | AI Tool / Research Software |
| Organization | ServiceNow Research |
| AIWG Relevance | **High** - Critical anti-hallucination patterns for citation generation; RAG architecture for research discovery |

## Executive Summary

LitLLM is an AI toolkit that transforms literature review writing using Retrieval-Augmented Generation (RAG). Unlike traditional LLMs which frequently hallucinate citations, LitLLM retrieves real papers from academic search engines before generating text, ensuring every citation is verifiable.

### Key Insight

> "Unlike traditional LLMs which often hallucinate, LitLLM retrieves real papers from academic search engines, accurately ranks results by relevance, and generates concise, factual literature reviews grounded in actual publications."

**AIWG Implication**: Any research framework that generates citations MUST use retrieval-first architecture. LLMs cannot be trusted to generate citations from training data alone.

---

## The Hallucination Problem

### What Traditional LLMs Do Wrong

Traditional LLMs frequently:
- **Fabricate paper titles** that don't exist
- **Invent author names** that sound plausible
- **Create fake citations** with realistic formatting
- **Misattribute findings** to wrong sources

### Why This Happens

LLMs don't "retrieve" from a database—they generate text that looks like citations based on patterns learned during training. The statistical likelihood of generating a real citation is low.

### The LitLLM Solution

```
Query → Academic Search → Paper Retrieval → Relevance Ranking → Context Assembly → LLM Generation → Grounded Review
```

Key constraint: **The LLM can only cite papers that were retrieved.** It cannot invent citations because citations must come from the retrieved context.

---

## Key Findings for AIWG

### 1. Retrieval Before Generation

> "LitLLM retrieves real papers from academic search engines, accurately ranks results by relevance, and generates concise, factual literature reviews grounded in actual publications."

**AIWG Implication**: Research acquisition commands must:
1. Search academic databases first
2. Retrieve actual paper metadata
3. Only then generate summaries/citations based on retrieved data

### 2. Citation Verification

Every citation must be verifiable:
- Paper exists in database
- Authors match
- Year/venue match
- DOI resolves

**AIWG Implication**: Post-generation validation step that verifies all citations against known sources.

### 3. Abstract-Level Limitation

> LitLLM "often works with abstracts, not full text"

**AIWG Implication**: Abstract-based summaries are acceptable for discovery/triage, but deep analysis requires full-text access. Track what level of access was used in provenance.

---

## AIWG Implementation Mapping

| LitLLM Concept | AIWG Implementation | Rationale |
|----------------|---------------------|-----------|
| **Academic Search** | Semantic Scholar API, arXiv API, CrossRef API integration | Multiple sources for comprehensive coverage |
| **Real Papers Only** | REF-XXX system requires verified source URL | No REF-XXX assigned without confirmed existence |
| **Relevance Ranking** | Topic categorization in INDEX.md; AIWG Relevance scoring | AI-assisted but human-verified relevance |
| **RAG Architecture** | Research acquisition retrieves before documenting | Never generate claims without source retrieval |
| **Citation Verification** | DOI validation, URL accessibility check | Automated verification before integration |
| **Grounded Generation** | Summaries cite specific page numbers and quotes | All claims traceable to source text |

---

## Specific AIWG Design Decisions Informed by LitLLM

### 1. Never Generate Citations Without Retrieval

**Decision**: Research agents MUST retrieve paper metadata from academic APIs before generating any citation. No "from memory" citations allowed.

**LitLLM Justification**: "Unlike traditional LLMs which often hallucinate"—this is the core problem LitLLM solves. AIWG must solve it the same way.

### 2. Citation Verification Pipeline

**Decision**: Every REF-XXX document must pass verification before integration:
- DOI resolves (if available)
- URL accessible
- Author names match source
- Year/venue confirmed

**LitLLM Justification**: The hallucination problem isn't just fabricated papers—it's also misattributed findings.

### 3. Quotes With Page Numbers

**Decision**: Key Quotes section requires page numbers. "No page number available" must be explicitly stated if unavailable.

**LitLLM Justification**: Grounded generation means claims are traceable. Page numbers enable verification.

### 4. Source Level Tracking

**Decision**: Provenance records track whether documentation was based on:
- Abstract only
- Full text
- Specific sections

**LitLLM Justification**: "Often works with abstracts, not full text"—knowing the source depth affects confidence.

### 5. Anti-Hallucination Warnings

**Decision**: Agent prompts include explicit warnings against generating unverified citations.

**LitLLM Justification**: LLMs naturally want to be "helpful" by providing citations. They must be constrained.

---

## Research Framework Application

### Research Acquisition Pipeline

```yaml
acquisition_pipeline:
  step_1_search:
    action: query_academic_apis
    apis: [semantic_scholar, arxiv, crossref]
    output: candidate_papers

  step_2_retrieve:
    action: fetch_metadata
    input: candidate_papers
    output: verified_metadata
    validation:
      - doi_resolution
      - url_accessibility

  step_3_document:
    action: generate_summary
    input: verified_metadata
    constraint: only_cite_retrieved_papers
    output: ref_document

  step_4_verify:
    action: citation_verification
    checks:
      - all_citations_in_retrieved_set
      - page_numbers_present
      - quotes_match_source
```

### Anti-Hallucination Safeguards

| Safeguard | Implementation |
|-----------|----------------|
| **Retrieval Gate** | No documentation without successful API retrieval |
| **Citation Whitelist** | LLM prompt includes list of allowed citations |
| **Post-Generation Audit** | Script validates all citations against whitelist |
| **Human Review Flag** | Any unverified citation flagged for human review |

---

## Comparison with AIWG Alternatives

| Tool | Approach | Hallucination Risk | AIWG Usage |
|------|----------|-------------------|------------|
| **LitLLM** | RAG from academic databases | **Low** | Pattern to follow |
| **Elicit** | Structured extraction (125M papers) | Low | Alternative for discovery |
| **Consensus** | Evidence-backed search (200M papers) | Low | Alternative for discovery |
| **General LLM** | Training data only | **High** | Never for citations |

---

## Key Quotes

### On the core innovation:
> "LitLLM retrieves real papers from academic search engines, accurately ranks results by relevance, and generates concise, factual literature reviews grounded in actual publications."

### On hallucination prevention:
> "Unlike traditional LLMs which often hallucinate, LitLLM [ensures] every claim is tied to a real paper."

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-008** | RAG provides foundational retrieval-augmented generation architecture |
| **REF-057** | Agent Laboratory uses complementary approach for research automation |
| **REF-056** | FAIR principles require findable/accessible sources (no hallucinated refs) |
| **REF-002** | Archetype 1 (Premature Action Without Grounding) is citation hallucination |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Research Acquisition | Initial AIWG-specific analysis document |
