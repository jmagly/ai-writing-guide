# Use-Case Specification: UC-RF-009

## Metadata

- ID: UC-RF-009
- Name: Perform Gap Analysis
- Owner: Requirements Analyst
- Contributors: Discovery Agent, Gap Analysis Agent, Research Framework Team
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P1 (High)
- Estimated Effort: M (Medium)
- Related Documents:
  - Flow: Research Framework 5-Stage Lifecycle
  - UC-RF-001: Discover Research Sources
  - UC-RF-003: Document Research Sources

## 1. Use-Case Identifier and Name

**ID:** UC-RF-009
**Name:** Perform Gap Analysis

## 2. Scope and Level

**Scope:** Research Framework - Gap Analysis System
**Level:** User Goal
**System Boundary:** Gap Analysis Agent, research corpus, topic coverage analysis, citation network analysis

## 3. Primary Actor(s)

**Primary Actors:**
- Gap Analysis Agent: Specialized agent that identifies research gaps
- User: Researcher seeking to identify knowledge gaps
- Discovery Agent: Agent that discovers sources to fill gaps

**Actor Goals:**
- Gap Analysis Agent: Systematically identify gaps in research coverage
- User: Understand missing topics and under-represented areas
- Discovery Agent: Receive targeted search queries for gap-filling sources

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| User | Complete research coverage (no critical gaps) |
| Gap Analysis Agent | Comprehensive gap detection across multiple dimensions |
| Research Community | Identification of underexplored research areas |
| Framework Maintainer | Automated gap detection to improve research quality |

## 5. Preconditions

1. Research corpus exists (sources documented in `.aiwg/research/sources/`)
2. Minimum corpus size: 10+ sources (sufficient for gap analysis)
3. Source metadata complete (topics, keywords, citations documented)
4. Gap Analysis Agent has access to topic taxonomy (if defined)

## 6. Postconditions

**Success:**
- Gap analysis report generated
- Topic coverage gaps identified (missing or under-represented topics)
- Citation completeness assessed (orphaned references, missing citations)
- Source diversity evaluated (publication types, date ranges, author diversity)
- Recommendations generated for gap-filling research
- Gap-filling search queries created

**Failure:**
- Insufficient corpus for gap analysis (minimum threshold not met)
- User notified of corpus size limitation
- Recommendations to expand corpus before gap analysis

## 7. Trigger

Manual user request OR automated coverage threshold check

## 8. Main Success Scenario

1. User initiates gap analysis:
   - Command: `/gap-analysis`
   - Trigger: Manual request to assess research coverage
2. Gap Analysis Agent validates corpus readiness:
   - Corpus size: 25 sources (exceeds 10-source minimum)
   - Metadata completeness: 100% (all sources documented)
   - Topic field present: 23/25 sources (92% coverage)
3. Gap Analysis Agent performs topic coverage analysis:
   - **Topic Extraction**: Identifies topics from source metadata
     - Topic 1: "Multi-agent frameworks" (12 sources, 48% coverage)
     - Topic 2: "Prompt engineering" (8 sources, 32% coverage)
     - Topic 3: "Agent memory systems" (3 sources, 12% coverage)
     - Topic 4: "Agent tool use" (2 sources, 8% coverage)
   - **Expected Topics**: Compares to predefined topic taxonomy (if available)
     - Expected: "Multi-agent frameworks", "Prompt engineering", "Agent memory", "Tool use", "Agent safety", "Evaluation methods"
     - Missing: "Agent safety" (0 sources), "Evaluation methods" (0 sources)
   - **Coverage Gaps Identified**:
     - **Gap 1**: "Agent safety" (0% coverage, expected 15-20%)
     - **Gap 2**: "Evaluation methods" (0% coverage, expected 10-15%)
     - **Gap 3**: "Agent tool use" (8% coverage, under-represented, expected 15-20%)
4. Gap Analysis Agent performs citation completeness analysis:
   - **Citation Network**: Analyzes references in documented sources
     - Total citations: 245 references across 25 sources
     - Orphaned citations: 12 references (cited but not in corpus)
     - Missing citations: 5 sources lack reference lists (incomplete metadata)
   - **Citation Gap Analysis**:
     - **Gap 4**: 12 orphaned citations (frequently cited works not in corpus)
       - "Constitutional AI: Harmlessness from AI Feedback" (cited 5 times, not in corpus)
       - "Chain-of-Thought Prompting" (cited 4 times, not in corpus)
       - "ReAct: Synergizing Reasoning and Acting" (cited 3 times, not in corpus)
     - **Gap 5**: 5 sources missing reference lists (citation metadata incomplete)
5. Gap Analysis Agent performs source diversity analysis:
   - **Publication Type Diversity**:
     - Academic papers: 18 sources (72%)
     - Blog posts: 5 sources (20%)
     - Documentation: 2 sources (8%)
     - Books/chapters: 0 sources (0%)
     - **Gap 6**: No books/chapters (expected 5-10% for comprehensive coverage)
   - **Date Range Analysis**:
     - 2024: 15 sources (60%)
     - 2023: 8 sources (32%)
     - 2022: 2 sources (8%)
     - 2021 or earlier: 0 sources (0%)
     - **Gap 7**: No foundational papers from 2021 or earlier (historical context missing)
   - **Author Diversity**:
     - Unique authors: 45 authors across 25 sources
     - Author concentration: Top 3 authors appear in 10 sources (40%)
     - **Gap 8**: High author concentration (may indicate limited perspective diversity)
6. Gap Analysis Agent calculates coverage score:
   - **Topic Coverage**: 66% (4/6 expected topics covered)
   - **Citation Completeness**: 95% (233/245 citations in corpus or documented)
   - **Source Diversity**: 75% (good publication type diversity, date range limited)
   - **Overall Coverage Score**: 79% (weighted average: 0.5×66% + 0.3×95% + 0.2×75%)
7. Gap Analysis Agent generates recommendations:
   - **Recommendation 1**: Fill "Agent safety" topic gap (Priority: High)
     - Search query: "AI safety, agent alignment, constitutional AI"
     - Target: 3-5 sources on agent safety
   - **Recommendation 2**: Fill "Evaluation methods" topic gap (Priority: High)
     - Search query: "agent evaluation, benchmarking, task performance metrics"
     - Target: 2-3 sources on evaluation methods
   - **Recommendation 3**: Acquire orphaned citations (Priority: Medium)
     - Add "Constitutional AI: Harmlessness from AI Feedback" (Anthropic, 2022)
     - Add "Chain-of-Thought Prompting" (Wei et al., 2022)
     - Add "ReAct: Synergizing Reasoning and Acting" (Yao et al., 2022)
   - **Recommendation 4**: Add foundational papers (Priority: Medium)
     - Search query: "agent foundations, early multi-agent systems, 2019-2021"
     - Target: 2-3 foundational papers for historical context
   - **Recommendation 5**: Complete citation metadata (Priority: Low)
     - Document reference lists for 5 sources missing citations
8. Gap Analysis Agent creates gap-filling search queries:
   - **Query 1**: `"AI safety" OR "agent alignment" OR "constitutional AI"`
   - **Query 2**: `"agent evaluation" OR "benchmarking" OR "task performance metrics"`
   - **Query 3**: Exact titles for orphaned citations (known works)
   - **Query 4**: `"multi-agent systems" AND year:2019-2021` (foundational papers)
9. Gap Analysis Agent generates gap analysis report:
   - **Report File**: `.aiwg/research/gap-analysis/gap-report-2026-01-25.md`
   - **Report Sections**:
     - Executive summary (coverage score: 79%, 8 gaps identified)
     - Topic coverage gaps (2 missing topics, 1 under-represented)
     - Citation gaps (12 orphaned citations)
     - Diversity gaps (no books, limited date range)
     - Recommendations (5 actionable recommendations with search queries)
     - Priority ranking (High: fill missing topics, Medium: orphaned citations, Low: metadata completion)
10. Gap Analysis Agent updates corpus metadata:
    - Adds `gap_analysis_date: 2026-01-25` to corpus metadata
    - Adds `coverage_score: 79` to corpus metadata
    - Adds `identified_gaps: 8` to corpus metadata
11. Gap Analysis Agent prompts user for gap-filling action:
    - "Gap Analysis Complete: 8 gaps identified (coverage score: 79%)"
    - "Options:"
    - "1. Auto-fill gaps (execute Discovery Agent with gap-filling queries)"
    - "2. Review gap report (manual gap-filling)"
    - "3. Ignore gaps (accept current coverage)"
12. User chooses: "Auto-fill gaps (High priority only)"
13. Gap Analysis Agent triggers Discovery Agent with gap-filling queries:
    - Query 1: "AI safety, agent alignment, constitutional AI"
    - Query 2: "agent evaluation, benchmarking, task performance metrics"
14. Discovery Agent identifies 8 candidate sources for gap-filling
15. User reviews gap-filling candidates and approves for acquisition
16. Gap analysis workflow completes with gap-filling initiated

## 9. Alternate Flows

### Alt-1: Insufficient Corpus (Below Minimum Threshold)

**Branch Point:** Step 2 (Gap Analysis Agent validates corpus readiness)
**Condition:** Corpus size <10 sources (insufficient for gap analysis)

**Flow:**
1. Gap Analysis Agent checks corpus size: 7 sources (below 10-source minimum)
2. Gap Analysis Agent generates error:
   - "Insufficient corpus for gap analysis"
   - "Current: 7 sources, Minimum: 10 sources"
   - "Action: Document 3+ additional sources before gap analysis"
3. Gap Analysis Agent provides corpus expansion recommendations:
   - "Expand corpus with Discovery Agent: `/discover "topic" --count 5`"
4. User expands corpus to 12 sources
5. **Resume Main Flow:** Step 2 (Gap Analysis Agent validates corpus readiness)

### Alt-2: User-Defined Topic Taxonomy

**Branch Point:** Step 3 (Topic coverage analysis)
**Condition:** User provides custom topic taxonomy for domain-specific gap analysis

**Flow:**
1. User provides topic taxonomy file: `.aiwg/research/topic-taxonomy.yaml`
   ```yaml
   topics:
     - name: "Multi-agent frameworks"
       weight: 30%
       keywords: ["AutoGen", "LangGraph", "CrewAI"]
     - name: "Prompt engineering"
       weight: 25%
       keywords: ["prompting", "chain-of-thought", "few-shot"]
     - name: "Agent memory"
       weight: 20%
       keywords: ["memory", "context", "retrieval"]
     - name: "Tool use"
       weight: 15%
       keywords: ["tools", "APIs", "function calling"]
     - name: "Safety"
       weight: 10%
       keywords: ["alignment", "safety", "guardrails"]
   ```
2. Gap Analysis Agent loads custom taxonomy
3. Gap Analysis Agent calculates expected coverage using taxonomy weights:
   - Expected "Multi-agent frameworks": 30% × 25 sources = 7-8 sources
   - Expected "Prompt engineering": 25% × 25 sources = 6-7 sources
   - Expected "Agent memory": 20% × 25 sources = 5 sources
   - Expected "Tool use": 15% × 25 sources = 3-4 sources
   - Expected "Safety": 10% × 25 sources = 2-3 sources
4. Gap Analysis Agent compares actual coverage to expected (taxonomy-based)
5. Gap Analysis Agent generates taxonomy-aligned recommendations
6. **Resume Main Flow:** Step 4 (Citation completeness analysis)

### Alt-3: Automated Periodic Gap Analysis

**Branch Point:** Step 1 (User initiates gap analysis)
**Condition:** Automated coverage threshold check triggers gap analysis

**Flow:**
1. Coverage monitoring agent detects new sources added (corpus size: 25 → 30 sources)
2. Coverage threshold check: "Analyze gaps every 10 sources added"
3. Gap Analysis Agent automatically triggered (no manual user request)
4. Gap Analysis Agent performs analysis (same as main flow)
5. Gap Analysis Agent generates report and emails user:
   - "Automated Gap Analysis: 30 sources corpus"
   - "Coverage improved: 79% → 82% (3 percentage points)"
   - "New gaps identified: 1 (Agent observability - emerging topic)"
6. User reviews automated gap report
7. **Resume Main Flow:** Step 11 (Gap Analysis Agent prompts user for action)

## 10. Exception Flows

### Exc-1: Metadata Incompleteness (Missing Topics)

**Trigger:** Step 3 (Topic coverage analysis)
**Condition:** >30% of sources missing topic metadata

**Flow:**
1. Gap Analysis Agent checks topic metadata completeness:
   - Topic field present: 15/25 sources (60%)
   - Topic field missing: 10/25 sources (40% - exceeds 30% threshold)
2. Gap Analysis Agent detects metadata gap:
   - "Topic metadata incomplete: 40% of sources missing topic field"
   - "Impact: Topic coverage analysis unreliable"
3. Gap Analysis Agent prompts user:
   - "Options:"
   - "1. Auto-infer topics (extract from abstracts/keywords)"
   - "2. Manual topic annotation (user provides topics)"
   - "3. Skip topic gap analysis (proceed with citation/diversity analysis only)"
4. User chooses: "Auto-infer topics"
5. Gap Analysis Agent extracts topics from source abstracts using LLM:
   - Source REF-016: Abstract → Topics: "multi-agent, coordination"
   - Source REF-017: Abstract → Topics: "prompt engineering, few-shot"
   - (10 sources auto-annotated)
6. Gap Analysis Agent updates source metadata with inferred topics
7. **Resume Main Flow:** Step 3 (Topic coverage analysis with complete metadata)

### Exc-2: Orphaned Citation Resolution Failure

**Trigger:** Step 4 (Citation completeness analysis - orphaned citation lookup)
**Condition:** Cannot resolve orphaned citation (insufficient metadata)

**Flow:**
1. Gap Analysis Agent identifies orphaned citation: "Smith et al., 2023"
2. Gap Analysis Agent attempts to resolve:
   - Search academic databases: No matches for "Smith et al., 2023"
   - Insufficient citation metadata (no title, no venue)
3. Gap Analysis Agent marks citation as unresolvable:
   - "Orphaned citation unresolved: Smith et al., 2023"
   - "Reason: Insufficient metadata (title/venue missing)"
4. Gap Analysis Agent adds to recommendations:
   - "Action: Manually review citing source (REF-012) to complete citation metadata"
5. User reviews citing source and provides complete citation:
   - Title: "Multi-Agent Coordination Strategies"
   - Venue: "NeurIPS 2023"
6. Gap Analysis Agent retries resolution with complete metadata
7. Citation resolved successfully
8. **Resume Main Flow:** Step 5 (Source diversity analysis)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-GA-01: Gap analysis time | <2 minutes for 50 sources | User experience (rapid feedback) |
| NFR-GA-02: Topic extraction time | <30 seconds for 50 abstracts | Efficiency (LLM-based extraction) |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-GA-03: Gap detection accuracy | 90%+ precision (identified gaps are valid) | Reliability (avoid false positives) |
| NFR-GA-04: Coverage score accuracy | ±5% vs manual assessment | Consistency (trustworthy metrics) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-GA-05: Report clarity | <1000 words, actionable recommendations | Decision support |
| NFR-GA-06: Recommendation prioritization | Clear priority ranking (High/Medium/Low) | Focus (critical gaps first) |

## 12. Related Business Rules

**BR-GA-001: Minimum Corpus Size**
- Minimum: 10 sources (statistical validity)
- Recommended: 20+ sources (comprehensive gap analysis)
- Warning threshold: <15 sources (limited confidence)

**BR-GA-002: Coverage Score Weighting**
- Topic coverage: 50% (most critical dimension)
- Citation completeness: 30% (important for validation)
- Source diversity: 20% (secondary consideration)

**BR-GA-003: Gap Priority Thresholds**
- High: Missing expected topics (0% coverage), >10 orphaned citations
- Medium: Under-represented topics (<50% expected coverage), 5-10 orphaned citations
- Low: Minor diversity gaps, metadata incompleteness

**BR-GA-004: Topic Coverage Expectations**
- Major topics: 20-30% of corpus each
- Minor topics: 10-15% of corpus each
- Emerging topics: 5-10% of corpus each

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Source Metadata | YAML frontmatter | `.aiwg/research/sources/*.md` | Required fields present |
| Topic Taxonomy | YAML (optional) | `.aiwg/research/topic-taxonomy.yaml` | Valid schema |
| Citation Network | Extracted from source files | Reference sections in sources | Valid citations |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Gap Analysis Report | Markdown | `.aiwg/research/gap-analysis/gap-report-<date>.md` | Permanent |
| Coverage Score | Integer (0-100) | Corpus metadata | Permanent |
| Gap-Filling Queries | Text | Gap analysis report | Permanent |
| Recommendations | Markdown list | Gap analysis report | Permanent |

## 14. Open Issues and TODOs

1. **Issue 001: Dynamic Topic Taxonomy**
   - Description: How to adapt topic taxonomy for emerging research areas?
   - Impact: May miss new topics not in predefined taxonomy
   - Enhancement: LLM-based topic discovery (identify emerging topics from corpus)
   - Owner: Gap Analysis Agent
   - Due Date: Version 1.1

2. **TODO 001: Visual Gap Dashboard**
   - Description: Create visual coverage dashboard (heatmap, topic clouds)
   - Benefit: Easier gap identification at a glance
   - Assigned: Gap Analysis Agent
   - Due Date: Version 1.1

3. **TODO 002: Comparative Gap Analysis**
   - Description: Compare corpus coverage to reference corpora (e.g., research community standard)
   - Benefit: Benchmark coverage against domain norms
   - Assigned: Gap Analysis Agent
   - Due Date: Version 2.0

## 15. References

- [UC-RF-001: Discover Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-sources.md)
- [UC-RF-003: Document Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-sources.md)
- Gap Analysis Agent Definition (to be created)

---

## Acceptance Criteria

### AC-001: Topic Coverage Gap Detection

**Given:** Corpus with 25 sources covering 4/6 expected topics
**When:** Gap analysis performed
**Then:**
- Missing topics identified (2 gaps)
- Under-represented topics flagged (1 gap)
- Coverage score calculated
- Gap-filling recommendations generated

### AC-002: Citation Completeness Analysis

**Given:** Corpus with 12 orphaned citations
**When:** Citation analysis performed
**Then:**
- Orphaned citations identified
- Frequently cited works prioritized
- Gap-filling queries created (exact titles)

### AC-003: Source Diversity Assessment

**Given:** Corpus with limited publication type diversity
**When:** Diversity analysis performed
**Then:**
- Publication type gaps identified (no books)
- Date range gaps identified (no 2021 or earlier)
- Author concentration measured
- Diversity recommendations generated

### AC-004: Auto-Fill Gaps

**Given:** Gap analysis complete with recommendations
**When:** User chooses auto-fill
**Then:**
- Discovery Agent triggered with gap-filling queries
- High-priority gaps targeted first
- Gap-filling sources identified

### AC-005: Coverage Score Calculation

**Given:** Gap analysis complete
**When:** Coverage score calculated
**Then:**
- Score ranges 0-100
- Weighted average of topic/citation/diversity scores
- Score documented in corpus metadata

---

## Test Cases

(15 test cases similar to previous use cases)

---

## Document Metadata

**Version:** 1.0 (Initial Draft)
**Status:** DRAFT
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 4,127 words
**Quality Score:** (To be assessed)

**Next Actions:**
1. Review use case with Gap Analysis Agent domain expert
2. Implement test cases TC-RF-009-001 through TC-RF-009-015
3. Create Gap Analysis Agent definition
4. Define topic taxonomy schema
5. Integrate with Research Framework workflow

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework)
**Status:** DRAFT - Pending Review
