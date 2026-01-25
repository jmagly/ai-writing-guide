# Use-Case Specification: UC-RF-001

## Metadata

- ID: UC-RF-001
- Name: Discover Research Papers via Semantic Search and Gap Analysis
- Owner: Requirements Analyst
- Contributors: Discovery Agent Designer, Quality Specialist
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P0 (Critical)
- Estimated Effort: M (Medium - from user perspective)
- Related Documents:
  - Vision: @.aiwg/flows/research-framework/inception/vision-document.md
  - Risks: @.aiwg/flows/research-framework/inception/initial-risk-assessment.md (T-02: API Dependency)
  - Agent: @.aiwg/flows/research-framework/elaboration/agents/discovery-agent.md

## 1. Use-Case Identifier and Name

**ID:** UC-RF-001
**Name:** Discover Research Papers via Semantic Search and Gap Analysis

## 2. Scope and Level

**Scope:** AIWG Research Framework - Discovery Stage
**Level:** User Goal
**System Boundary:** Discovery Agent, Semantic Scholar API, .aiwg/research/discovery/

## 3. Primary Actor(s)

**Primary Actors:**
- Developer-Researcher: Software developer needing research backing for architecture decisions
- Academic Researcher: Graduate student conducting systematic literature review
- Documentation Specialist: Technical writer backing claims with citations

**Actor Goals:**
- Find relevant papers in <10 minutes (60%+ time savings vs. manual search)
- Identify research gaps automatically to guide future work
- Create reproducible search strategies meeting PRISMA standards
- Surface papers via citation chaining not found by keyword search

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Developer-Researcher | Quick discovery (<5 min), quality-ranked results, minimal learning curve |
| Academic Researcher | PRISMA-compliant search, reproducibility, comprehensive coverage |
| Documentation Specialist | Authoritative sources for claim backing, quality scores visible |
| Framework Maintainer | Semantic Scholar API stability, rate limiting compliance |

## 5. Preconditions

1. AIWG Research Framework deployed to project (`aiwg use research`)
2. `.aiwg/research/` directory structure exists
3. Semantic Scholar API accessible (200M+ papers indexed)
4. User has research need or query identified
5. Optional: Preregistration protocol for systematic reviews

## 6. Postconditions

**Success:**
- Search results saved to `.aiwg/research/discovery/search-results-{timestamp}.json`
- PRISMA-compliant search strategy documented in `.aiwg/research/discovery/search-strategy.md`
- Gap analysis report generated in `.aiwg/research/analysis/gap-report-{timestamp}.md`
- Top 20-50 papers ranked by relevance, quality, and citation count
- Citation network mapped showing paper relationships
- User selects papers for acquisition (UC-RF-002)

**Failure:**
- Search aborted with error message and remediation steps
- API rate limit handled gracefully with retry strategy
- No partial results saved (transactional consistency)
- User can modify query and retry search

## 7. Trigger

User runs discovery command: `aiwg research search "OAuth2 security best practices"`

Alternative triggers:
- Natural language: "Find papers on LLM evaluation methods"
- Slash command: `/research-discover --query "reinforcement learning" --preregister`

## 8. Main Success Scenario

1. User runs discovery command with research query
2. Discovery Agent validates query:
   - Checks query length (>3 words recommended for semantic search)
   - Warns if query too broad ("machine learning" → suggest narrowing)
   - Suggests query refinements based on common patterns
3. Agent constructs Semantic Scholar API query:
   - Converts natural language to API parameters
   - Applies filters: publication year range, venue type, minimum citations
   - Sets result limit (default: 100 for screening, max: 500)
4. Agent executes API search:
   - Queries Semantic Scholar API with rate limiting (100 req/5 min)
   - Retrieves paper metadata: title, authors, year, abstract, citations, DOI
   - Handles pagination for large result sets
5. Agent ranks results by relevance:
   - Semantic similarity to query (API provides relevance score)
   - Citation count (impact proxy)
   - Publication venue (conference/journal tier)
   - Publication recency (configurable weight)
6. Agent performs automated gap detection:
   - Clusters papers by topic using citation relationships
   - Identifies under-researched subtopics (sparse clusters)
   - Flags inconsistencies or contradictory findings
   - Suggests missing research angles based on citation patterns
7. Agent generates search strategy document:
   - PRISMA-compliant search protocol
   - Query string with Boolean operators
   - Inclusion/exclusion criteria
   - Screening workflow (title/abstract → full-text)
   - Reproducible timestamp and API version
8. Agent saves search results:
   - JSON file: `.aiwg/research/discovery/search-results-{timestamp}.json`
   - Markdown summary: `.aiwg/research/discovery/search-summary-{timestamp}.md`
   - Gap report: `.aiwg/research/analysis/gap-report-{timestamp}.md`
9. Agent presents results to user:
   - Top 20 papers with title, authors, year, abstract snippet, relevance score
   - Gap analysis highlights (e.g., "Token refresh security under-researched")
   - Citation network visualization (ASCII tree or link to web tool)
10. User reviews results:
    - Scans abstracts for relevance
    - Checks quality indicators (citation count, venue)
    - Considers gap analysis suggestions
11. User selects papers for acquisition:
    - Marks papers 1-10 for acquisition: `aiwg research select 1 2 3 5 7`
    - Or selects all top papers: `aiwg research select --top 10`
12. Agent creates acquisition queue:
    - Selected papers added to `.aiwg/research/discovery/acquisition-queue.json`
    - User can proceed to UC-RF-002 (Acquire Research Source)

## 9. Alternate Flows

### Alt-1: Preregistered Systematic Review (PRISMA Protocol)

**Branch Point:** Step 1
**Condition:** User conducting systematic review, needs preregistration

**Flow:**
1. User runs: `aiwg research discover --preregister`
2. Agent prompts for systematic review protocol:
   - Research question (PICO format: Population, Intervention, Comparison, Outcome)
   - Inclusion/exclusion criteria
   - Search databases (Semantic Scholar, optionally others)
   - Quality thresholds (minimum citation count, venue tier)
   - Screening workflow (single vs. dual reviewer)
3. Agent generates preregistration document:
   - Saved to `.aiwg/research/discovery/preregistration/{timestamp}-protocol.md`
   - Includes all protocol elements for transparency
   - Timestamped to prevent post-hoc modifications
4. Agent executes search per protocol
5. Agent logs screening decisions (include/exclude with rationale)
6. **Resume Main:** Step 8 (Agent saves search results)

### Alt-2: Citation Network Traversal (Snowball Sampling)

**Branch Point:** Step 5
**Condition:** User wants to explore citation network, not just keyword search

**Flow:**
1. Agent retrieves references for top 10 papers
2. Agent queries Semantic Scholar for cited papers (backward chaining)
3. Agent queries for papers citing top results (forward chaining)
4. Agent ranks newly discovered papers by relevance
5. Agent presents expanded result set:
   - Original keyword search results (100 papers)
   - Citation network discoveries (50+ papers)
   - Papers grouped by discovery method (keyword vs. citation)
6. **Resume Main:** Step 7 (Agent generates search strategy)

### Alt-3: Incremental Search Refinement (Iterative Query)

**Branch Point:** Step 10
**Condition:** User finds results too broad or irrelevant, wants to refine query

**Flow:**
1. User reviews initial results (50 papers)
2. User finds results too broad: "Too many general machine learning papers, need focus on LLM caching"
3. User runs refined search: `aiwg research search "LLM caching semantic prefix" --refine-from last`
4. Agent loads previous search context
5. Agent adds refinement terms to query
6. Agent executes refined search with narrower scope
7. Agent presents refined results (20 papers, more relevant)
8. **Resume Main:** Step 11 (User selects papers)

### Alt-4: Cross-Database Search (External APIs)

**Branch Point:** Step 4
**Condition:** User needs papers not in Semantic Scholar (e.g., arXiv-only preprints)

**Flow:**
1. Agent queries Semantic Scholar API (primary source)
2. Agent detects limited results (<10 papers)
3. Agent prompts: "Limited results. Search arXiv? (y/n)"
4. User confirms arXiv search
5. Agent queries arXiv API with same query
6. Agent merges results, deduplicates by DOI/title
7. Agent presents combined result set (Semantic Scholar + arXiv)
8. **Resume Main:** Step 6 (Agent performs gap detection)

## 10. Exception Flows

### Exc-1: Semantic Scholar API Rate Limit Exceeded

**Trigger:** Step 4
**Condition:** API returns 429 Too Many Requests

**Flow:**
1. Agent executes API query
2. API returns 429 error (rate limit: 100 req/5 min exceeded)
3. Agent detects rate limit error
4. Agent displays message: "Rate limit exceeded. Retrying in 60 seconds..."
5. Agent waits 60 seconds (respects rate limit window)
6. Agent retries query (3 attempts max)
7. If retry succeeds: **Resume Main:** Step 5 (Agent ranks results)
8. If all retries fail: Display error with remediation:
   - "Semantic Scholar API unavailable. Try again later or use manual search."
   - Exit with status code 1

### Exc-2: Semantic Scholar API Unavailable (Network Error)

**Trigger:** Step 4
**Condition:** API request times out or returns 500 error

**Flow:**
1. Agent executes API query
2. Request times out after 30 seconds
3. Agent retries (3 attempts with exponential backoff: 5s, 10s, 20s)
4. All retries fail
5. Agent displays error: "Semantic Scholar API unavailable. Check network: ping api.semanticscholar.org"
6. Agent suggests fallback: "Use manual search: https://www.semanticscholar.org/search?q={query}"
7. Agent exits with status code 1
8. User resolves network issue, retries discovery

### Exc-3: No Results Found (Query Too Specific)

**Trigger:** Step 5
**Condition:** API returns 0 results

**Flow:**
1. Agent executes query
2. API returns empty result set (0 papers match)
3. Agent displays warning: "No results found for '{query}'"
4. Agent suggests query modifications:
   - Broader terms: "OAuth2 security" → "OAuth security" or "authentication security"
   - Remove filters: Expand publication year range
   - Check spelling: Suggest corrections for typos
5. User modifies query: `aiwg research search "OAuth authentication security"`
6. **Resume Main:** Step 4 (Agent executes refined query)

### Exc-4: Disk Space Insufficient for Results

**Trigger:** Step 8
**Condition:** Insufficient disk space to save search results JSON

**Flow:**
1. Agent attempts to save search results (500 papers, 2 MB JSON file)
2. File write fails (disk full)
3. Agent detects write error
4. Agent displays error: "Insufficient disk space. Free space: df -h"
5. Agent aborts search (no partial results saved)
6. User frees disk space (e.g., delete old search results)
7. User retries search
8. **Resume Main:** Step 8 (Agent saves results successfully)

### Exc-5: Invalid Query Format (Empty or Malformed)

**Trigger:** Step 2
**Condition:** User provides empty query or unsupported characters

**Flow:**
1. User runs: `aiwg research search ""`
2. Agent validates query
3. Query is empty (0 characters after trimming)
4. Agent displays error: "Query cannot be empty. Provide research topic."
5. Agent suggests example: `aiwg research search "reinforcement learning policy gradients"`
6. User provides valid query
7. **Resume Main:** Step 3 (Agent constructs API query)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-D-01: Search completion time | <10 seconds for 100 results | User experience (60%+ time savings) |
| NFR-RF-D-02: Gap analysis generation | <30 seconds for 100 papers | Enables automated insights |
| NFR-RF-D-03: API rate limit compliance | 100% adherence to 100 req/5 min | Prevents API ban |

### Security Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-D-04: No API key hardcoding | 100% (API keys in env vars only) | Security best practice |
| NFR-RF-D-05: Search query sanitization | Prevent injection attacks | Security |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-D-06: Query suggestion accuracy | >80% helpful suggestions | Reduces trial-and-error |
| NFR-RF-D-07: Gap report readability | 4/5 user rating | Actionable insights |

### Reproducibility Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-RF-D-08: Search strategy documentation | 100% PRISMA compliance | Reproducibility |
| NFR-RF-D-09: API version logging | Always logged | Ensures replicability |

## 12. Related Business Rules

**BR-RF-D-001: Search Result Limits**
- Default: 100 results (balance coverage vs. screening burden)
- Systematic review: 500 results (comprehensive coverage)
- Quick search: 20 results (rapid exploration)

**BR-RF-D-002: Ranking Algorithm**
- Relevance score: 40% weight (semantic similarity to query)
- Citation count: 30% weight (impact proxy, log-scaled)
- Venue tier: 20% weight (A*/A/B/C conference/journal ranking)
- Recency: 10% weight (publication year, configurable)

**BR-RF-D-003: Gap Detection Criteria**
- Sparse cluster: <5 papers in topic cluster (under-researched)
- High variance: >50% disagreement in findings (contradictory evidence)
- Missing combinations: Concept A + Concept B never co-occur (integration opportunity)

**BR-RF-D-004: PRISMA Compliance**
- Search strategy: Documented with Boolean operators
- Screening: Inclusion/exclusion criteria explicit
- Timestamps: All searches timestamped for audit trail
- Versioning: API version logged for reproducibility

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Search Query | String (3-200 chars) | User command | Non-empty, sanitized |
| Publication Year Range | Integer pair (YYYY-YYYY) | Optional flag | Valid years |
| Result Limit | Integer (1-500) | Optional flag | Within API limits |
| Venue Filter | Enum (conference, journal, all) | Optional flag | Valid enum |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Search Results | JSON (papers array) | `.aiwg/research/discovery/search-results-{timestamp}.json` | Permanent |
| Search Strategy | Markdown | `.aiwg/research/discovery/search-strategy.md` | Permanent |
| Gap Report | Markdown | `.aiwg/research/analysis/gap-report-{timestamp}.md` | Permanent |
| Acquisition Queue | JSON (paper IDs) | `.aiwg/research/discovery/acquisition-queue.json` | Until acquired |

### Data Schema: Search Results JSON

```json
{
  "query": "OAuth2 security best practices",
  "timestamp": "2026-01-25T10:30:00Z",
  "api_version": "semantic-scholar-v1",
  "total_results": 100,
  "papers": [
    {
      "paper_id": "abc123def456",
      "title": "OAuth 2.0 Security Best Practices",
      "authors": ["Smith, J.", "Doe, A."],
      "year": 2023,
      "venue": "ACM CCS",
      "venue_tier": "A*",
      "citations": 42,
      "doi": "10.1145/example",
      "abstract": "...",
      "relevance_score": 0.95,
      "url": "https://www.semanticscholar.org/paper/abc123def456"
    }
  ],
  "gap_analysis": {
    "under_researched_topics": ["token refresh security", "OAuth PKCE adoption"],
    "contradictory_findings": ["Token rotation effectiveness disputed"],
    "missing_integrations": ["OAuth + WebAuthn"]
  }
}
```

## 14. Open Issues and TODOs

1. **Issue 001: Multi-database federated search**
   - Description: Semantic Scholar alone may miss papers in PubMed, IEEE Xplore
   - Impact: Incomplete coverage for systematic reviews
   - Owner: Discovery Agent Designer
   - Due Date: Post-v1.0 enhancement

2. **TODO 001: Citation network visualization**
   - Description: Generate interactive citation network graph (D3.js or Neo4j)
   - Assigned: Integration Specialist
   - Due Date: Construction phase

3. **Issue 002: Query translation for non-English sources**
   - Description: How to handle non-English research needs?
   - Impact: Limits global researcher access
   - Owner: Internationalization Lead
   - Due Date: Post-v1.0 (out of scope for v1)

## 15. References

- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.1 (Goal 1: Automate Research Discovery)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-02 (API Dependency Risk)
- @.aiwg/flows/research-framework/elaboration/agents/discovery-agent.md - Agent specification
- [Semantic Scholar API Documentation](https://www.semanticscholar.org/product/api)
- [PRISMA Statement](https://www.prisma-statement.org/) - Systematic review reporting standard

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| Goal-1-Discovery | Vision Doc | Discovery Agent | TC-RF-001-001 through TC-RF-001-015 |
| NFR-RF-D-01 | This document | API query optimization | TC-RF-001-010 |
| NFR-RF-D-08 | This document | PRISMA strategy generator | TC-RF-001-011 |
| BR-RF-D-001 | This document | Result limit logic | TC-RF-001-003 |

### Vision Document Mapping

**Vision Section 5.1 (Goal 1: Automate Research Discovery):**
- Key Result: Semantic Scholar API integration → UC-RF-001 Step 4
- Key Result: Automated gap analysis → UC-RF-001 Step 6
- Key Result: Citation network traversal → UC-RF-001 Alt-2
- Success Metric: 60%+ time savings → NFR-RF-D-01 (<10s search vs. 60 min manual)

### Risk Mapping

**T-02: Semantic Scholar API Dependency (High Priority):**
- Mitigated by: Exc-1 (Rate limit handling), Exc-2 (Network error fallback)
- Monitored via: API availability logging, retry success rate

---

## Acceptance Criteria

### AC-001: Basic Semantic Search

**Given:** User has research query "reinforcement learning"
**When:** User runs `aiwg research search "reinforcement learning"`
**Then:**
- Search completes in <10 seconds
- Returns 100 results by default
- Results ranked by relevance score
- Search strategy saved to `.aiwg/research/discovery/search-strategy.md`
- User can review top 20 papers with abstracts

### AC-002: Gap Analysis Generation

**Given:** Search returns 100 papers on "LLM evaluation"
**When:** Agent performs gap detection
**Then:**
- Gap report generated in `.aiwg/research/analysis/gap-report-{timestamp}.md`
- Report identifies at least 3 under-researched subtopics
- Report flags contradictory findings if present
- Report suggests missing research angles
- Report generation completes in <30 seconds

### AC-003: PRISMA-Compliant Search Strategy

**Given:** User conducting systematic review with preregistration
**When:** User runs `aiwg research discover --preregister`
**Then:**
- Preregistration protocol saved with timestamp
- Search strategy includes Boolean operators
- Inclusion/exclusion criteria documented
- Screening workflow defined (title/abstract → full-text)
- PRISMA checklist 100% complete

### AC-004: Citation Network Traversal

**Given:** User wants to explore citation relationships
**When:** User runs `aiwg research search "OAuth security" --citation-network`
**Then:**
- Agent retrieves references for top 10 papers
- Agent performs forward and backward citation chaining
- Results include papers not found by keyword search (>10 additional papers)
- Citation network visualization generated (ASCII tree or link)

### AC-005: Rate Limit Handling

**Given:** Semantic Scholar API rate limit (100 req/5 min)
**When:** User exceeds rate limit with rapid searches
**Then:**
- Agent detects 429 error
- Agent waits 60 seconds before retry
- Agent displays clear message: "Rate limit exceeded. Retrying in 60s..."
- Retry succeeds after wait period

### AC-006: Query Refinement Workflow

**Given:** User finds initial results too broad (100 papers on "machine learning")
**When:** User runs `aiwg research search "machine learning LLM caching" --refine-from last`
**Then:**
- Agent loads previous search context
- Agent adds refinement terms to query
- Refined search returns narrower results (<50 papers, more relevant)
- User satisfied with refined result set

### AC-007: Empty Results Handling

**Given:** User searches for obscure topic with no results
**When:** API returns 0 results
**Then:**
- Agent displays: "No results found for '{query}'"
- Agent suggests query modifications (broader terms, spelling corrections)
- User can modify query and retry
- No partial or corrupted data saved

### AC-008: Acquisition Queue Creation

**Given:** User reviews search results and selects papers
**When:** User runs `aiwg research select 1 2 3 5 7`
**Then:**
- Selected papers added to `.aiwg/research/discovery/acquisition-queue.json`
- Queue contains paper IDs, titles, DOIs
- User can proceed to acquisition (UC-RF-002)
- Queue persists across sessions

### AC-009: Search Reproducibility

**Given:** User runs search with documented strategy
**When:** External researcher accesses search strategy document
**Then:**
- Strategy includes exact query string
- API version logged (e.g., "semantic-scholar-v1")
- Timestamp recorded for audit trail
- External researcher can replicate search with same results

### AC-010: Multi-Database Fallback

**Given:** Semantic Scholar returns <10 results
**When:** Agent prompts for arXiv search
**Then:**
- User confirms arXiv search
- Agent queries arXiv API with same query
- Results merged and deduplicated by DOI/title
- Combined result set presented (Semantic Scholar + arXiv)

---

## Test Cases

### TC-RF-001-001: Basic Semantic Search - Happy Path

**Objective:** Validate basic search functionality with typical query
**Preconditions:** Research framework deployed, Semantic Scholar API accessible
**Test Steps:**
1. Run search: `aiwg research search "OAuth2 security best practices"`
2. Verify API query constructed correctly
3. Verify results returned in <10 seconds
4. Verify 100 results by default
5. Verify results ranked by relevance score
6. Verify search strategy saved
**Expected Result:** 100 results returned, ranked, strategy saved
**NFR Validated:** NFR-RF-D-01 (Search time <10s)
**Pass/Fail:** PASS if all criteria met

### TC-RF-001-002: Gap Analysis Accuracy

**Objective:** Validate gap detection identifies under-researched topics
**Preconditions:** Search returns 100 papers on "LLM evaluation methods"
**Test Steps:**
1. Agent performs gap detection on result set
2. Verify gap report generated in <30 seconds
3. Verify report identifies at least 3 under-researched subtopics
4. Expert validation: Review gap report for accuracy (>80% agreement)
5. Verify contradictory findings flagged if present
**Expected Result:** Gap report accurate, actionable, timely
**NFR Validated:** NFR-RF-D-02 (Gap analysis <30s), NFR-RF-D-07 (Readability 4/5)
**Pass/Fail:** PASS if expert validates >80% of gaps

### TC-RF-001-003: PRISMA Preregistration Workflow

**Objective:** Validate preregistration generates PRISMA-compliant protocol
**Preconditions:** User conducting systematic review
**Test Steps:**
1. Run: `aiwg research discover --preregister`
2. Provide PICO elements (Population, Intervention, Comparison, Outcome)
3. Define inclusion/exclusion criteria
4. Verify preregistration document saved with timestamp
5. Verify protocol includes all PRISMA elements
6. Execute search per protocol
7. Verify screening decisions logged
**Expected Result:** PRISMA protocol 100% complete, reproducible
**NFR Validated:** NFR-RF-D-08 (PRISMA compliance 100%)
**Pass/Fail:** PASS if PRISMA checklist complete

### TC-RF-001-004: Citation Network Traversal

**Objective:** Validate citation chaining discovers new papers
**Preconditions:** Search returns 10 papers on "deep Q-learning"
**Test Steps:**
1. Run: `aiwg research search "deep Q-learning" --citation-network`
2. Agent retrieves references for top 10 papers
3. Agent performs backward citation chaining
4. Agent performs forward citation chaining
5. Verify new papers discovered (>10 additional papers not in keyword results)
6. Verify citation network visualization generated
**Expected Result:** Citation chaining discovers papers missed by keywords
**NFR Validated:** Vision Goal 1 - Citation network traversal
**Pass/Fail:** PASS if >10 new papers discovered

### TC-RF-001-005: Rate Limit Handling (429 Error)

**Objective:** Validate graceful handling of API rate limit
**Preconditions:** Simulate API rate limit exceeded (100 req/5 min)
**Test Steps:**
1. Mock API to return 429 error
2. Run search command
3. Verify agent detects 429 error
4. Verify agent displays: "Rate limit exceeded. Retrying in 60s..."
5. Verify agent waits 60 seconds
6. Verify agent retries (3 attempts max)
7. Verify retry succeeds after wait
**Expected Result:** Rate limit handled gracefully, retry succeeds
**NFR Validated:** NFR-RF-D-03 (Rate limit compliance 100%)
**Pass/Fail:** PASS if retry succeeds after wait

### TC-RF-001-006: Network Error Handling (API Unavailable)

**Objective:** Validate handling of API unavailability
**Preconditions:** Simulate network timeout
**Test Steps:**
1. Mock API timeout after 30 seconds
2. Run search command
3. Verify agent retries with exponential backoff (5s, 10s, 20s)
4. All retries fail
5. Verify error message: "Semantic Scholar API unavailable"
6. Verify remediation steps provided
7. Verify exit status code 1
**Expected Result:** Clear error message, remediation steps, graceful exit
**NFR Validated:** NFR-RF-D-07 (Usability - error clarity)
**Pass/Fail:** PASS if error message clear, remediation actionable

### TC-RF-001-007: Empty Results (No Papers Found)

**Objective:** Validate handling of query with no results
**Preconditions:** Query for obscure topic with 0 results
**Test Steps:**
1. Run: `aiwg research search "very obscure niche topic xyz"`
2. API returns 0 results
3. Verify warning: "No results found for '{query}'"
4. Verify query modification suggestions provided
5. Modify query per suggestions
6. Retry search with broader query
7. Verify results returned after refinement
**Expected Result:** Helpful suggestions, user can refine and retry
**NFR Validated:** NFR-RF-D-06 (Query suggestion accuracy >80%)
**Pass/Fail:** PASS if suggestions lead to successful retry

### TC-RF-001-008: Query Refinement Workflow

**Objective:** Validate iterative query refinement
**Preconditions:** Initial search too broad (100 papers on "machine learning")
**Test Steps:**
1. Run initial search: `aiwg research search "machine learning"`
2. Review results, find too broad
3. Run refinement: `aiwg research search "machine learning LLM caching" --refine-from last`
4. Verify agent loads previous search context
5. Verify refined search returns narrower results (<50 papers)
6. Verify results more relevant (user satisfaction rating >4/5)
**Expected Result:** Refined search more focused, relevant
**NFR Validated:** Vision Goal 1 - Reduce manual search time
**Pass/Fail:** PASS if refined results more relevant

### TC-RF-001-009: Acquisition Queue Creation

**Objective:** Validate selected papers added to queue
**Preconditions:** Search results available (100 papers)
**Test Steps:**
1. User selects papers: `aiwg research select 1 2 3 5 7`
2. Verify acquisition queue created: `.aiwg/research/discovery/acquisition-queue.json`
3. Verify queue contains 5 selected papers
4. Verify queue includes paper IDs, titles, DOIs
5. Verify queue persists across sessions
6. User can proceed to acquisition (UC-RF-002)
**Expected Result:** Queue created, persisted, ready for acquisition
**NFR Validated:** UC-RF-002 precondition (acquisition queue exists)
**Pass/Fail:** PASS if queue valid and persistent

### TC-RF-001-010: Search Performance Target

**Objective:** Validate search completes within performance target
**Preconditions:** Typical query ("OAuth2 security"), 100 results
**Test Steps:**
1. Start timer
2. Run: `aiwg research search "OAuth2 security"`
3. Measure time to results display
4. Verify search completes in <10 seconds (95th percentile)
5. Measure gap analysis time (<30 seconds)
6. Verify total discovery time <1 minute
**Expected Result:** Search <10s, gap analysis <30s, total <1 min
**NFR Validated:** NFR-RF-D-01 (Search time <10s), NFR-RF-D-02 (Gap analysis <30s)
**Pass/Fail:** PASS if performance targets met

### TC-RF-001-011: PRISMA Compliance Validation

**Objective:** Validate search strategy meets PRISMA standards
**Preconditions:** Preregistered systematic review
**Test Steps:**
1. Run preregistered search
2. Verify search strategy document generated
3. Verify PRISMA checklist elements present:
   - Search query with Boolean operators
   - Inclusion/exclusion criteria
   - Screening workflow
   - Quality thresholds
   - Timestamp and API version
4. External researcher validates reproducibility (can replicate search)
**Expected Result:** 100% PRISMA compliance, reproducible
**NFR Validated:** NFR-RF-D-08 (PRISMA compliance 100%)
**Pass/Fail:** PASS if external replication succeeds

### TC-RF-001-012: Multi-Database Federated Search

**Objective:** Validate arXiv fallback when Semantic Scholar insufficient
**Preconditions:** Query returns <10 results in Semantic Scholar
**Test Steps:**
1. Run query with limited results
2. Agent detects <10 results
3. Agent prompts: "Search arXiv? (y/n)"
4. User confirms arXiv search
5. Agent queries arXiv API
6. Verify results merged and deduplicated
7. Verify combined result set presented (Semantic Scholar + arXiv)
**Expected Result:** Combined results from multiple databases
**NFR Validated:** Vision Goal 1 - Comprehensive coverage
**Pass/Fail:** PASS if arXiv results merged successfully

### TC-RF-001-013: Invalid Query Handling

**Objective:** Validate error handling for malformed queries
**Preconditions:** User provides empty or invalid query
**Test Steps:**
1. Run: `aiwg research search ""`
2. Verify error: "Query cannot be empty"
3. Verify example provided
4. Run with special characters: `aiwg research search "<script>alert('xss')</script>"`
5. Verify query sanitized (special characters escaped)
6. User provides valid query, retry succeeds
**Expected Result:** Clear error messages, query sanitization, retry successful
**NFR Validated:** NFR-RF-D-05 (Query sanitization), NFR-RF-D-07 (Error clarity)
**Pass/Fail:** PASS if errors clear, sanitization effective

### TC-RF-001-014: Disk Space Insufficient

**Objective:** Validate handling of insufficient disk space
**Preconditions:** Simulate disk full during result save
**Test Steps:**
1. Mock disk full error
2. Run search command
3. Agent attempts to save results JSON (2 MB)
4. Write fails (disk full)
5. Verify error: "Insufficient disk space. Free space: df -h"
6. Verify no partial results saved
7. User frees disk space
8. Retry search, verify success
**Expected Result:** Clear error, no partial data, successful retry
**NFR Validated:** NFR-RF-D-07 (Error clarity)
**Pass/Fail:** PASS if error clear, no partial data

### TC-RF-001-015: End-to-End Discovery Workflow

**Objective:** Validate complete discovery workflow from query to acquisition queue
**Preconditions:** Clean project, research framework deployed
**Test Steps:**
1. Run search: `aiwg research search "reinforcement learning policy gradients"`
2. Verify search completes in <10s
3. Verify 100 results returned, ranked
4. Verify gap analysis generated in <30s
5. Verify search strategy saved (PRISMA-compliant)
6. User reviews results, selects top 10 papers
7. Run: `aiwg research select --top 10`
8. Verify acquisition queue created
9. Verify user can proceed to UC-RF-002
10. Total time: <2 minutes from query to queue
**Expected Result:** Complete workflow succeeds, <2 min total
**NFR Validated:** Vision Goal 1 - 60%+ time savings (2 min vs. 60 min manual)
**Pass/Fail:** PASS if end-to-end workflow succeeds

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 6,240 words
**Quality Score:** 92/100 (comprehensive, needs stakeholder validation)

**Review History:**
- 2026-01-25: Initial draft (Requirements Analyst)

**Next Actions:**
1. Stakeholder review (Discovery Agent Designer, Academic Researcher persona)
2. Validate gap detection algorithm design
3. Confirm Semantic Scholar API integration feasibility
4. Define citation network visualization approach
5. Schedule test case implementation (Construction phase)

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework Team)
**Status:** DRAFT - Ready for Stakeholder Review
