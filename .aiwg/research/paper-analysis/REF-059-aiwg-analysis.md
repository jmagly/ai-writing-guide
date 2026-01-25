# REF-059 AIWG Analysis: LitLLM Literature Review

**Source**: @docs/references/REF-059-litllm-literature-review.md

**Paper**: ServiceNow Research (2025). LitLLM for Scientific Literature Reviews.

**AIWG Relevance**: HIGH - Critical anti-hallucination patterns for citation generation; establishes retrieval-first architecture as mandatory for citation integrity.

---

## AIWG Concept Mapping

### LitLLM → AIWG Implementation

| LitLLM Concept | AIWG Implementation | Coverage |
|----------------|---------------------|----------|
| Academic Search Integration | API integration specs | **Planned** |
| Real Papers Only | REF-XXX verified sources | **Strong** |
| Relevance Ranking | INDEX.md topic categories | **Moderate** |
| RAG Architecture | Research acquisition flow | **Partial** |
| Citation Verification | DOI validation pattern | **Partial** |
| Grounded Generation | Key Quotes with page numbers | **Strong** |
| Anti-Hallucination | Retrieval-first policy | **Implicit** |

### The Hallucination Problem

| Issue | Traditional LLM Behavior | AIWG Mitigation |
|-------|--------------------------|-----------------|
| Fabricated paper titles | Common | REF-XXX requires verified URL |
| Invented author names | Common | Metadata from source, not generated |
| Fake citations | Very common | Only cite retrieved papers |
| Misattributed findings | Common | Quotes with page numbers |

---

## The Core Problem: Citation Hallucination

### What Traditional LLMs Do Wrong

LLMs don't "retrieve" citations—they **generate text that looks like citations** based on training data patterns. Results:

- **Fabricated titles**: "A Study on X" (doesn't exist)
- **Invented authors**: "Smith et al. (2023)" (plausible but fake)
- **Wrong attributions**: Real paper, wrong finding
- **Chimera citations**: Mix of multiple real papers

### Why This Is Critical for AIWG

AIWG's professional positioning depends on research backing. Hallucinated citations would:
- Undermine credibility
- Fail peer review
- Embarrass users who cite our claims
- Violate FAIR principles (R1.2 - provenance)

### The LitLLM Solution

```
Query → Academic Search → Paper Retrieval → Relevance Ranking → Context Assembly → LLM Generation → Grounded Review
```

**Key Constraint**: The LLM can only cite papers that were retrieved. Cannot invent citations.

---

## Retrieval-First Architecture

### Principle

**Never generate citations without retrieval.**

### AIWG Implementation

```yaml
# Research acquisition pipeline
acquisition_pipeline:
  step_1_search:
    action: query_academic_apis
    apis:
      - semantic_scholar
      - arxiv
      - crossref
    constraint: "results must be verifiable sources"
    output: candidate_papers

  step_2_verify:
    action: verify_existence
    checks:
      - doi_resolves
      - url_accessible
      - metadata_matches
    output: verified_papers

  step_3_document:
    action: generate_summary
    input: verified_papers
    constraint: "ONLY cite verified_papers - no exceptions"
    anti_hallucination_prompt: |
      You may ONLY cite papers from the provided context.
      If a paper is not in the context, do NOT cite it.
      If unsure about a citation, omit it rather than guess.
    output: ref_document

  step_4_validate:
    action: citation_audit
    checks:
      - all_citations_in_verified_set
      - page_numbers_present
      - quotes_match_source
    on_violation: reject_and_flag
```

### Anti-Hallucination Prompt Pattern

For any agent that might generate citations:

```markdown
## Citation Policy

**CRITICAL**: You may ONLY cite sources that are:
1. Explicitly provided in your context
2. Verified with a REF-XXX identifier
3. Accompanied by a verifiable URL or DOI

**FORBIDDEN**:
- Citing papers "from memory"
- Inventing plausible-sounding citations
- Attributing findings without source verification

**When Uncertain**:
- State "citation needed" rather than guess
- Flag for human verification
- Err on the side of fewer, verified citations
```

---

## Citation Verification Pipeline

### Verification Steps

| Check | Purpose | Implementation |
|-------|---------|----------------|
| DOI Resolution | Paper exists | HTTP HEAD to doi.org |
| URL Accessibility | Source available | HTTP GET with timeout |
| Author Match | Correct attribution | Compare to metadata |
| Year/Venue Match | Accurate citation | Compare to metadata |
| Title Match | Correct paper | Fuzzy string match |

### Implementation

```yaml
# Citation verification
verify_citation:
  input:
    claimed:
      title: "Chain-of-Thought Prompting Elicits Reasoning"
      authors: ["Wei, J.", "et al."]
      year: 2022
      doi: "10.48550/arXiv.2201.11903"

  checks:
    - name: doi_resolution
      action: http_head
      url: "https://doi.org/10.48550/arXiv.2201.11903"
      expect: 200 or 302

    - name: metadata_fetch
      action: crossref_lookup
      doi: "10.48550/arXiv.2201.11903"
      output: actual_metadata

    - name: title_match
      compare: claimed.title vs actual_metadata.title
      threshold: 0.9  # Fuzzy match

    - name: author_match
      compare: claimed.authors vs actual_metadata.authors
      check: "first_author_matches"

    - name: year_match
      compare: claimed.year vs actual_metadata.year
      exact: true

  result:
    verified: true | false
    confidence: 0.95
    discrepancies: []
```

---

## Grounded Generation Requirements

### Key Quotes Must Have Sources

**AIWG Policy**: Every "Key Quote" must include:
1. Exact quote text
2. Page number (or "abstract" / "introduction")
3. Section reference if available

**Template Pattern**:

```markdown
### On [Topic] (p. X):
> "Exact quote from the paper here."

### On [Topic] (abstract):
> "Quote from abstract when page number unavailable."
```

### Source Level Tracking

Track what level of access was used:

```yaml
# Provenance includes source depth
documentation:
  ref_id: REF-059
  source_access:
    level: "full_text"  # abstract_only | full_text | specific_sections
    sections_read:
      - abstract
      - introduction
      - methodology
      - results
    confidence_note: "Full paper reviewed"
```

**Why This Matters**: Abstract-only summaries may miss nuances. Documentation should be transparent about source depth.

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Establish Anti-Hallucination Policy

Add to `.claude/rules/citation-policy.md`:

```markdown
# Citation Integrity Rules

**Enforcement Level**: CRITICAL

## Mandatory: Retrieval-First Architecture

### Rule 1: Never Generate Citations Without Retrieval

**FORBIDDEN**:
```text
The FAIR principles [Wilkinson et al., 2016] state that...
```
(When Wilkinson et al. is not in provided context)

**REQUIRED**:
```text
The FAIR principles [REF-056] state that...
```
(Where REF-056 is explicitly in context with verified metadata)

### Rule 2: Flag Uncertain Citations

If you cannot verify a citation, use:
```text
[citation needed - verify against REF-XXX]
```

Do NOT guess or fill in plausible details.

### Rule 3: Page Numbers Required for Quotes

**FORBIDDEN**:
> "Good data management is the key conduit to knowledge discovery."

**REQUIRED**:
> "Good data management is the key conduit to knowledge discovery." (p. 1)
```

#### 2. Citation Whitelist in Agent Prompts

When agents might cite research:

```yaml
# Agent system prompt includes
context:
  available_citations:
    - REF-056: "FAIR Principles - Wilkinson et al. (2016)"
    - REF-057: "Agent Laboratory - Schmidgall et al. (2025)"
    - REF-058: "R-LAM - Sureshkumar et al. (2026)"

  citation_policy: |
    You may ONLY cite papers listed above.
    Use the REF-XXX format for citations.
    If you need a citation not listed, flag it for later addition.
```

#### 3. Post-Generation Citation Audit

```bash
# Audit generated document for citation integrity
aiwg research audit-citations .aiwg/research/paper-analysis/REF-059-aiwg-analysis.md

# Output:
# Citation Audit: REF-059-aiwg-analysis.md
#
# Citations found: 5
# Verified against REF-XXX: 5/5 ✓
# With page numbers: 4/5 (1 is abstract)
# Potential hallucinations: 0
#
# Status: PASSED
```

### Short-Term (Enhancement)

#### 4. Academic API Integration

Implement acquisition agent with API access:

```yaml
# API integration for research acquisition
academic_apis:
  semantic_scholar:
    endpoint: "https://api.semanticscholar.org/graph/v1"
    rate_limit: 100/5min
    fields: ["paperId", "title", "authors", "year", "citationCount"]

  arxiv:
    endpoint: "http://export.arxiv.org/api/query"
    rate_limit: 1/3sec
    fields: ["id", "title", "authors", "published"]

  crossref:
    endpoint: "https://api.crossref.org/works"
    rate_limit: 50/sec
    fields: ["DOI", "title", "author", "published"]
```

#### 5. Source Depth Indicators

Add to REF-XXX template:

```markdown
## Source Access

| Aspect | Status |
|--------|--------|
| Full text available | Yes / No |
| PDF archived | Yes / No |
| Sections reviewed | [list] |
| Confidence level | High / Medium / Low |
| Access date | YYYY-MM-DD |
```

### Medium-Term (Framework Enhancement)

#### 6. Hallucination Detection

Automated detection for common patterns:

```yaml
# Hallucination detection rules
detection_rules:
  - name: "plausible_but_unverified"
    pattern: '\[.*et al\., \d{4}\]'
    unless: "matches known REF-XXX"
    action: flag

  - name: "round_number_statistics"
    pattern: '\b(exactly|precisely) \d+%'
    action: verify_against_source

  - name: "attribution_without_ref"
    pattern: 'according to .* \(\d{4}\)'
    unless: "has REF-XXX citation"
    action: flag
```

---

## Cross-References to AIWG Components

| Component | Location | LitLLM Relevance |
|-----------|----------|------------------|
| Research Acquisition | `/research-acquire` | Retrieval-first pattern |
| Citation Rules | `.claude/rules/citation-policy.md` | Anti-hallucination |
| REF-XXX Template | `templates/REF-XXX-template.md` | Source verification |
| Key Quotes Section | All REF-XXX documents | Grounded generation |
| API Integration | `api-integration-specs.md` | Academic API access |

---

## Key Quotes for Documentation

### On Core Innovation:
> "LitLLM retrieves real papers from academic search engines, accurately ranks results by relevance, and generates concise, factual literature reviews grounded in actual publications."

### On Hallucination Prevention:
> "Unlike traditional LLMs which often hallucinate, LitLLM [ensures] every claim is tied to a real paper."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (LitLLM) | Use In |
|-------------------|----------------------------|--------|
| "No made-up citations" | Retrieval-First Architecture | Technical docs |
| "Check citations exist" | Citation Verification Pipeline | API docs |
| "Quotes with sources" | Grounded Generation | All docs |
| "Only cite what we found" | Citation Whitelist | Agent prompts |

---

## Comparison with Alternatives

| Tool | Approach | Hallucination Risk | AIWG Usage |
|------|----------|-------------------|------------|
| **LitLLM** | RAG from databases | **Low** | Pattern to follow |
| **Elicit** | Structured extraction | Low | Alternative |
| **Consensus** | Evidence-backed search | Low | Alternative |
| **General LLM** | Training data only | **High** | NEVER for citations |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-059
**AIWG Priority**: HIGH
**Implementation Status**: Implicit policies; needs formal rules
**Key Contribution**: Anti-hallucination architecture
**Critical Requirement**: Retrieval-first for all citations
