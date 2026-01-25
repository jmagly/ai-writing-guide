# Test Strategy: AIWG Research Framework

**Project**: AIWG Research Framework
**Framework ID**: research-complete
**Version**: 1.0.0
**Document Date**: 2026-01-25
**Status**: Draft
**Owner**: Test Architect
**Contributors**: Test Engineer, Quality Assurance Specialist, Security Auditor

## References

- @.aiwg/flows/research-framework/inception/vision-document.md - Vision and success metrics
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk profile and mitigation priorities
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-research-papers.md - Use case #1 with acceptance criteria
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-002-acquire-research-source.md - Use case #2
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-research-paper.md - Use case #3
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-004-integrate-citations.md - Use case #4
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-005-track-provenance.md - Use case #5
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md - Use case #6
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md - Use case #7
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-008-execute-research-workflow.md - Use case #8
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-009-perform-gap-analysis.md - Use case #9
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-010-export-research-artifacts.md - Use case #10
- @.aiwg/flows/research-framework/elaboration/agents/discovery-agent-spec.md - Discovery Agent specification
- @.aiwg/flows/research-framework/elaboration/agents/acquisition-agent-spec.md - Acquisition Agent specification
- @.aiwg/flows/research-framework/elaboration/agents/documentation-agent-spec.md - Documentation Agent specification
- @.aiwg/flows/research-framework/elaboration/agents/citation-agent-spec.md - Citation Agent specification

---

## Executive Summary

This Test Strategy defines the quality assurance approach for the AIWG Research Framework, a comprehensive system enabling research-backed software development through automated discovery, acquisition, documentation, and quality assessment of academic literature. The strategy addresses high-risk areas including LLM hallucination (T-01), data quality issues (Q-01), and API dependencies (T-02), while ensuring 100% coverage of all use cases and compliance with FAIR, PROV, and OAIS standards.

**Key Commitments**:
- **Minimum Coverage**: 90% code coverage (80% line, 75% branch)
- **Use Case Coverage**: 100% (all 10 use cases validated)
- **NFR Coverage**: 100% (all 45 NFRs measurable and tested)
- **Blocking Quality Gates**: Tests MUST pass before PR merge and release
- **Risk-Based Testing**: Priority testing for Critical (T-01, A-04) and High (R-01, Q-01, A-01) risks

**Quality Philosophy**: Testing is a blocking gate, not an afterthought. Coverage targets are minimum thresholds, not aspirational goals.

---

## 1. Test Strategy Overview

### 1.1 Objectives

**Primary Objective**: Ensure AIWG Research Framework delivers reliable, accurate, and reproducible research workflows meeting academic quality standards (PRISMA, GRADE, FAIR, PROV, OAIS).

**Specific Objectives**:

1. **Functional Correctness**
   - Validate all 10 use cases with acceptance criteria
   - Verify agent capabilities (8 agents: Discovery, Acquisition, Documentation, Citation, Quality, Provenance, Archive, Workflow)
   - Test API integrations (Semantic Scholar, Zotero, CrossRef, Retraction Watch)

2. **Risk Mitigation**
   - **Critical Risks**: LLM hallucination <5% (T-01), manual effort acceptable (A-04)
   - **High Risks**: Quality scoring >90% accuracy (Q-01), onboarding <5 hours (A-01)
   - **API Reliability**: Rate limit compliance 100% (T-02), graceful failure handling

3. **Performance & Scalability**
   - Search completion <10 seconds (NFR-RF-D-01)
   - Gap analysis <30 seconds for 100 papers (NFR-RF-D-02)
   - Document generation <60 seconds per paper (NFR-RF-Doc-01)
   - Support 1,000+ paper corpora without degradation

4. **Compliance Validation**
   - FAIR compliance 100% (automated F-UJI validation)
   - PRISMA protocol completeness 100%
   - W3C PROV compatibility (automated schema validation)
   - OAIS archival package conformance

5. **Security & Privacy**
   - API key protection (no hardcoding, env vars only)
   - Input sanitization (prevent injection attacks)
   - Copyright compliance (respect publisher terms)
   - Data privacy in shared corpora

### 1.2 Scope

**In Scope**:

| Component | Coverage | Testing Focus |
|-----------|----------|---------------|
| **Discovery Agent** | 100% use cases | Semantic search, gap analysis, citation chaining |
| **Acquisition Agent** | 100% use cases | PDF download, metadata extraction, FAIR validation |
| **Documentation Agent** | 100% use cases | LLM summarization, hallucination detection, citation verification |
| **Citation Agent** | 100% use cases | BibTeX generation, in-text citation, context classification |
| **Quality Agent** | 100% use cases | GRADE scoring, retraction checking, quality metrics |
| **Provenance Agent** | 100% use cases | W3C PROV graph generation, lineage tracking |
| **Archive Agent** | 100% use cases | OAIS SIP/AIP/DIP packaging, long-term preservation |
| **Workflow Agent** | 100% use cases | PRISMA protocol execution, reproducibility |
| **API Integrations** | All endpoints | Semantic Scholar, Zotero, CrossRef, Retraction Watch |
| **CLI Commands** | All commands | `aiwg research search`, `select`, `acquire`, `document`, etc. |
| **NFRs** | 45 NFRs | Performance, security, usability, compliance |
| **Data Formats** | All schemas | JSON, BibTeX, RIS, PROV-O, OAIS METS |

**Out of Scope** (Deferred to Post-v1.0):

- Multi-user collaboration (single-user MVP)
- Real-time synchronization (async workflow)
- Advanced ML models (knowledge graph embeddings, semantic clustering)
- Non-English language support (English-only v1.0)
- Visual editors (CLI-only v1.0)

### 1.3 Approach

**Testing Philosophy**: Shift-Left Quality Assurance

1. **Test-Driven Development (TDD)**: Write tests before implementation
2. **Continuous Testing**: Tests run on every commit (CI/CD integration)
3. **Risk-Based Prioritization**: Critical risks tested first and most thoroughly
4. **Automation First**: 95%+ test automation target (minimize manual testing)
5. **Progressive Assurance**: Test at unit → integration → system → acceptance levels

**Test Pyramid Strategy**:

```
                 /\
                /  \  E2E Tests (10%)
               /    \  - 10 use case scenarios
              /------\  - Critical workflows
             /        \
            / Integration \ (30%)
           /   Tests       \
          /------------------\  - Agent interactions
         /                    \ - API integrations
        /   Unit Tests (60%)   \ - Component logic
       /------------------------\ - Utility functions
```

**Coverage Targets by Level**:

| Test Level | Volume | Coverage Target | Automation |
|------------|--------|-----------------|------------|
| Unit Tests | 60% of test effort | 90% code coverage (80% line, 75% branch) | 100% automated |
| Integration Tests | 30% of test effort | 100% API endpoints, 100% agent interactions | 100% automated |
| System Tests (E2E) | 10% of test effort | 100% use cases, 100% critical paths | 100% automated |
| Acceptance Tests | Manual validation | 100% NFRs, user satisfaction | 50% automated |

**Testing Cadence**:

- **Pre-commit**: Unit tests (fast suite <30s), linting, type checking
- **PR Merge**: Full test suite (unit + integration + E2E), coverage check
- **Nightly**: Extended tests (performance, security scans, mutation testing)
- **Release**: Acceptance tests, manual exploratory testing, UAT sign-off

---

## 2. Test Levels

### 2.1 Unit Testing

**Objective**: Validate individual components (agents, services, utilities) in isolation.

**Scope**:

| Component | Unit Test Focus | Test Count (Estimate) |
|-----------|----------------|----------------------|
| Discovery Agent | Query construction, result ranking, gap detection algorithm | 25 tests |
| Acquisition Agent | PDF extraction, metadata parsing, FAIR validation | 20 tests |
| Documentation Agent | RAG-based summarization, citation verification, hallucination detection | 30 tests (critical risk T-01) |
| Citation Agent | BibTeX generation, in-text citation formatting, context classification | 15 tests |
| Quality Agent | GRADE scoring logic, retraction checking, quality aggregation | 20 tests (critical risk Q-01) |
| Provenance Agent | W3C PROV graph construction, lineage tracking, schema validation | 15 tests |
| Archive Agent | OAIS package creation, METS XML generation, checksum validation | 15 tests |
| Workflow Agent | PRISMA protocol execution, screening workflow, reproducibility | 20 tests |
| Utility Functions | File I/O, JSON parsing, date formatting, string sanitization | 30 tests |
| **Total** | | **190 unit tests** |

**Coverage Requirements**:

- **Minimum**: 80% line coverage, 75% branch coverage (enforced by CI)
- **Target**: 90% line coverage, 85% branch coverage
- **Critical Components**: 100% coverage for hallucination detection, citation verification, quality scoring

**Tools**:

- **Test Framework**: Jest (Node.js/TypeScript) or Vitest (faster alternative)
- **Mocking**: Jest mocks for API calls, file system operations
- **Coverage**: nyc (Istanbul) or Vitest coverage
- **Assertions**: expect() API, custom matchers for FAIR/PROV validation

**Example: Documentation Agent Hallucination Detection**

```typescript
describe('DocumentationAgent - Hallucination Detection', () => {
  it('should detect fabricated citations in LLM summary', async () => {
    const mockSummary = 'Smith et al. (2025) found that...' // 2025 paper doesn't exist
    const paperMetadata = { year: 2023, authors: ['Doe, J.'], doi: '10.1234/real' }

    const agent = new DocumentationAgent()
    const result = await agent.detectHallucination(mockSummary, paperMetadata)

    expect(result.hallucinated).toBe(true)
    expect(result.issues).toContain('Citation year mismatch: 2025 vs 2023')
    expect(result.issues).toContain('Author mismatch: Smith not in paper')
  })

  it('should verify DOI existence via CrossRef API', async () => {
    const fakeDOI = '10.9999/fake'
    const agent = new DocumentationAgent()

    const result = await agent.verifyDOI(fakeDOI)

    expect(result.valid).toBe(false)
    expect(result.source).toBe('CrossRef API')
  })

  it('should pass clean summary without hallucinations', async () => {
    const mockSummary = 'Doe et al. (2023) demonstrated...'
    const paperMetadata = { year: 2023, authors: ['Doe, J.'], doi: '10.1234/real' }

    const agent = new DocumentationAgent()
    const result = await agent.detectHallucination(mockSummary, paperMetadata)

    expect(result.hallucinated).toBe(false)
    expect(result.issues).toHaveLength(0)
  })
})
```

**Blocking Conditions**:

- **PR Merge**: Unit tests MUST pass, coverage CANNOT decrease below 80% line
- **Release**: Unit test suite MUST pass 100%, no regressions

### 2.2 Integration Testing

**Objective**: Validate interactions between agents, API integrations, and data flows.

**Scope**:

| Integration | Test Focus | Test Count (Estimate) |
|-------------|-----------|----------------------|
| Discovery → Acquisition | Search results → acquisition queue → PDF download | 5 tests |
| Acquisition → Documentation | PDF extraction → LLM summarization pipeline | 5 tests |
| Documentation → Citation | Summary generation → BibTeX creation workflow | 5 tests |
| Quality → Provenance | GRADE scoring → W3C PROV tracking | 5 tests |
| Workflow → All Agents | PRISMA protocol execution end-to-end | 5 tests |
| Semantic Scholar API | Search, pagination, rate limiting, error handling | 10 tests |
| Zotero Integration | Export to BibTeX, RIS, import from Zotero library | 5 tests |
| CrossRef API | DOI validation, metadata enrichment | 5 tests |
| Retraction Watch API | Retraction checking, flagging retracted papers | 5 tests |
| File System | `.aiwg/research/` structure, artifact persistence | 5 tests |
| **Total** | | **55 integration tests** |

**Coverage Requirements**:

- **API Endpoints**: 100% coverage (all endpoints tested)
- **Agent Handoffs**: 100% coverage (all agent-to-agent transitions validated)
- **Data Persistence**: 100% coverage (all JSON/BibTeX/RIS file formats validated)

**Tools**:

- **API Mocking**: nock (HTTP mocking), MSW (Mock Service Worker)
- **Contract Testing**: Pact (verify API contracts don't break)
- **Test Containers**: Docker containers for Zotero, Neo4j (if needed)
- **Fixtures**: Sample PDFs, JSON responses, BibTeX files

**Example: Semantic Scholar API Rate Limit Handling**

```typescript
describe('Semantic Scholar API - Rate Limit', () => {
  it('should retry after 60s when rate limited', async () => {
    const scope = nock('https://api.semanticscholar.org')
      .get('/graph/v1/paper/search')
      .query({ query: 'machine learning', limit: 100 })
      .reply(429, { error: 'Rate limit exceeded' }) // First attempt: rate limited
      .get('/graph/v1/paper/search')
      .query({ query: 'machine learning', limit: 100 })
      .delay(60000) // Simulate 60s wait
      .reply(200, { data: [/* mock papers */] }) // Second attempt: success

    const agent = new DiscoveryAgent()
    const result = await agent.search('machine learning')

    expect(result.papers).toHaveLength(100)
    expect(scope.isDone()).toBe(true) // Both requests made
  })

  it('should fail gracefully after 3 retries', async () => {
    const scope = nock('https://api.semanticscholar.org')
      .get('/graph/v1/paper/search')
      .times(3) // 3 retry attempts
      .reply(429, { error: 'Rate limit exceeded' })

    const agent = new DiscoveryAgent()

    await expect(agent.search('machine learning')).rejects.toThrow('Rate limit exceeded after 3 retries')
  })
})
```

**Blocking Conditions**:

- **PR Merge**: Integration tests MUST pass, no API contract regressions
- **Release**: 100% API endpoint coverage, all agent handoffs validated

### 2.3 System Testing (End-to-End)

**Objective**: Validate complete workflows from user command to final artifact generation.

**Scope**:

| Use Case | E2E Test Scenario | Critical Path |
|----------|------------------|---------------|
| UC-RF-001 | Discovery: Search → Gap Analysis → Acquisition Queue | Yes (60s workflow) |
| UC-RF-002 | Acquisition: Queue → PDF Download → FAIR Validation | Yes (90s workflow) |
| UC-RF-003 | Documentation: PDF → LLM Summary → Hallucination Check | Yes (Critical Risk T-01) |
| UC-RF-004 | Citation: Summary → BibTeX → In-Text Citation | Yes (30s workflow) |
| UC-RF-005 | Provenance: Actions → W3C PROV Graph → Validation | Yes (PROV compliance) |
| UC-RF-006 | Quality: Paper → GRADE Score → Retraction Check | Yes (Critical Risk Q-01) |
| UC-RF-007 | Archive: Artifacts → OAIS AIP → Checksum Validation | No (OAIS compliance) |
| UC-RF-008 | Workflow: PRISMA Protocol → Execution → Report | Yes (Reproducibility) |
| UC-RF-009 | Gap Analysis: Papers → Clustering → Gap Report | Yes (Automation value) |
| UC-RF-010 | Export: Artifacts → BibTeX/RIS/Zotero → Validation | No (Integration) |

**Test Count**: 10 E2E tests (1 per use case) + 5 critical path variations = **15 E2E tests**

**Coverage Requirements**:

- **Use Cases**: 100% coverage (all 10 use cases)
- **Critical Paths**: 100% coverage (6 critical workflows)
- **NFR Validation**: Embedded in E2E tests (performance, usability)

**Tools**:

- **E2E Framework**: Playwright (browser-based) or custom CLI test harness
- **Fixtures**: Real PDFs (open access), sample corpora, reference datasets
- **Environment**: Dockerized test environment with API mocks
- **Reporting**: Allure or similar for visual test reports

**Example: UC-RF-001 E2E Test**

```typescript
describe('UC-RF-001: Discover Research Papers E2E', () => {
  it('should complete discovery workflow in <2 minutes', async () => {
    const startTime = Date.now()

    // Step 1: Run discovery command
    const result = await cli.run(['research', 'search', 'reinforcement learning policy gradients'])

    // Validate search completed in <10s (NFR-RF-D-01)
    expect(Date.now() - startTime).toBeLessThan(10000)

    // Validate 100 results returned
    const searchResults = await fs.readJSON('.aiwg/research/discovery/search-results-*.json')
    expect(searchResults.papers).toHaveLength(100)

    // Validate gap analysis completed in <30s (NFR-RF-D-02)
    const gapReport = await fs.readFile('.aiwg/research/analysis/gap-report-*.md', 'utf8')
    expect(gapReport).toContain('## Under-Researched Topics')
    expect(Date.now() - startTime).toBeLessThan(40000) // 10s search + 30s gap analysis

    // Step 2: Select papers for acquisition
    await cli.run(['research', 'select', '--top', '10'])

    // Validate acquisition queue created
    const queue = await fs.readJSON('.aiwg/research/discovery/acquisition-queue.json')
    expect(queue.papers).toHaveLength(10)

    // Validate total workflow <2 minutes (vision goal: 60%+ time savings)
    expect(Date.now() - startTime).toBeLessThan(120000)
  })
})
```

**Blocking Conditions**:

- **Release**: All 10 use case E2E tests MUST pass
- **Critical Paths**: All 6 critical workflows MUST complete within performance targets
- **No Regressions**: E2E tests from previous releases MUST continue passing

### 2.4 Acceptance Testing

**Objective**: Validate framework meets user needs and business objectives.

**Scope**:

| Acceptance Criteria | Test Method | Owner |
|---------------------|-------------|-------|
| **Use Case Acceptance** | Validate all acceptance criteria (AC-001 to AC-010 per use case) | Test Engineer |
| **NFR Acceptance** | Measure all 45 NFRs (performance, security, usability, compliance) | QA Specialist |
| **User Satisfaction** | Survey early adopters (matric-memory team, 5 external researchers) | Product Owner |
| **Reproducibility** | External researcher replicates PRISMA workflow | Academic Researcher |
| **FAIR Compliance** | F-UJI automated assessment (score >80%) | Compliance Specialist |
| **PROV Compliance** | W3C PROV-O schema validation (100% valid) | Standards Specialist |
| **OAIS Compliance** | OAIS SIP/AIP/DIP validation (METS conformance) | Archive Specialist |

**Test Count**: 10 use cases × 10 AC = 100 acceptance tests + 45 NFR tests = **145 acceptance tests**

**Coverage Requirements**:

- **Use Case AC**: 100% acceptance criteria validated
- **NFR Targets**: 100% NFRs measured and validated
- **User Satisfaction**: >80% users rate framework 4/5 or higher

**Tools**:

- **Manual Testing**: Checklist-based validation for use case AC
- **Automated NFR Testing**: Custom scripts for performance, security, compliance metrics
- **User Testing**: UserTesting.com or in-person sessions with matric-memory team
- **Compliance Tools**: F-UJI (FAIR), PROV-O validator, OAIS METS validator

**Example: NFR-RF-D-01 Acceptance Test**

```typescript
describe('NFR-RF-D-01: Search Completion Time <10s', () => {
  it('should complete search in <10s for 95th percentile', async () => {
    const durations: number[] = []

    // Run search 100 times to measure 95th percentile
    for (let i = 0; i < 100; i++) {
      const startTime = Date.now()
      await cli.run(['research', 'search', 'machine learning'])
      durations.push(Date.now() - startTime)
    }

    durations.sort((a, b) => a - b)
    const p95 = durations[Math.floor(durations.length * 0.95)]

    expect(p95).toBeLessThan(10000) // 95th percentile <10s
  })
})
```

**Blocking Conditions**:

- **Release**: All 145 acceptance tests MUST pass
- **NFR Targets**: All 45 NFRs MUST meet or exceed targets
- **User Satisfaction**: >80% user approval rating required for v1.0 release

---

## 3. Test Types

### 3.1 Functional Testing

**Objective**: Verify all features work as specified in use cases.

**Coverage**:

- **Use Case Scenarios**: All 10 use cases with main success scenario + alternate flows
- **Agent Capabilities**: All 8 agents with specified capabilities (e.g., Discovery Agent: semantic search, gap analysis, citation chaining)
- **CLI Commands**: All 12 CLI commands (e.g., `search`, `select`, `acquire`, `document`, `cite`, `grade`, `archive`, `workflow`, `export`)
- **Data Formats**: All output formats validated (JSON, BibTeX, RIS, PROV-O, METS)

**Test Techniques**:

- **Equivalence Partitioning**: Valid/invalid inputs (e.g., search query 3-200 chars, <3 chars invalid)
- **Boundary Value Analysis**: Edge cases (e.g., 1 result, 500 results, 0 results)
- **Decision Tables**: Complex logic (e.g., GRADE scoring with 5 criteria)
- **State Transition**: Workflow states (e.g., search → select → acquire → document)

**Priority**: P0 (Critical) - MUST PASS for release

### 3.2 Performance Testing

**Objective**: Validate framework meets performance NFRs.

**NFRs Validated**:

| NFR ID | Requirement | Target | Test Method |
|--------|-------------|--------|-------------|
| NFR-RF-D-01 | Search completion time | <10s (95th %ile) | Load test: 100 searches, measure latency |
| NFR-RF-D-02 | Gap analysis generation | <30s for 100 papers | Benchmark: 100-paper corpus, measure time |
| NFR-RF-Doc-01 | Document generation | <60s per paper | Stress test: 10 concurrent summaries |
| NFR-RF-Cite-01 | BibTeX generation | <5s for 100 papers | Batch test: 100 papers → BibTeX |
| NFR-RF-Q-01 | GRADE scoring | <15s per paper | Performance test: 50 papers, measure avg |
| NFR-RF-Prov-01 | PROV graph generation | <20s for 100 actions | Graph generation benchmark |
| NFR-RF-Arch-01 | OAIS package creation | <120s for 100 papers | Archive 100-paper corpus, measure time |
| NFR-RF-WF-01 | PRISMA workflow execution | <5 min for 500 papers | End-to-end workflow benchmark |

**Performance Baselines**:

- **Establish Baseline**: Week 11 (end of Documentation phase)
- **Regression Detection**: Any >10% performance degradation triggers investigation
- **Scalability Testing**: Test with 100, 500, 1,000 paper corpora (verify no degradation)

**Tools**:

- **Load Testing**: k6 (CLI load testing), Apache Bench
- **Profiling**: Node.js profiler, Chrome DevTools
- **Monitoring**: Grafana + Prometheus (optional, post-v1.0)

**Blocking Conditions**:

- **Release**: All 8 performance NFRs MUST meet targets
- **No Regressions**: Performance CANNOT degrade >10% from baseline

### 3.3 Security Testing

**Objective**: Validate security NFRs and mitigate security risks.

**NFRs Validated**:

| NFR ID | Requirement | Target | Test Method |
|--------|-------------|--------|-------------|
| NFR-RF-Sec-01 | API key protection | 100% (no hardcoding) | Static analysis: grep for API keys in code |
| NFR-RF-Sec-02 | Input sanitization | Prevent injection | Fuzz testing: malicious inputs |
| NFR-RF-Sec-03 | Copyright compliance | Respect publisher TOS | Manual audit: acquisition logic review |
| NFR-RF-Sec-04 | Data privacy | No PII in shared corpus | Privacy scan: detect sensitive data |
| NFR-RF-Sec-05 | PDF malware scanning | Optional virus scan | VirusTotal API integration (optional) |

**Security Risks Addressed**:

| Risk ID | Risk | Test Coverage |
|---------|------|---------------|
| S-01 | API key exposure | Static analysis, secret scanning (GitHub Actions) |
| S-02 | Data privacy in shared corpus | Privacy scanning, user guidelines |
| S-03 | Malicious PDFs | Optional VirusTotal integration, user warnings |

**Security Testing Techniques**:

1. **Static Analysis**: ESLint security rules, npm audit, Snyk vulnerability scanning
2. **Input Fuzzing**: Generate malicious inputs (SQL injection, XSS, command injection attempts)
3. **Secret Scanning**: GitHub secret scanning, truffleHog for leaked credentials
4. **Dependency Scanning**: Dependabot, npm audit for vulnerable dependencies
5. **Manual Review**: Code review for security best practices

**Tools**:

- **SAST**: ESLint plugin-security, SonarQube
- **Dependency Scanning**: npm audit, Snyk, Dependabot
- **Secret Scanning**: truffleHog, GitHub secret scanning
- **Fuzzing**: afl-fuzz, custom input generators

**Blocking Conditions**:

- **PR Merge**: No high/critical vulnerabilities (npm audit)
- **Release**: All 5 security NFRs validated, no secrets in code

### 3.4 Compliance Testing

**Objective**: Validate adherence to academic standards (FAIR, PROV, OAIS, PRISMA, GRADE).

**Standards Validated**:

| Standard | Compliance Requirement | Test Method |
|----------|------------------------|-------------|
| **FAIR Principles** | Findable, Accessible, Interoperable, Reusable | F-UJI automated assessment (score >80%) |
| **W3C PROV** | Provenance graphs conform to PROV-O ontology | PROV-O schema validator (100% valid) |
| **OAIS** | Archival packages conform to OAIS reference model | METS XML validation, BagIt compliance |
| **PRISMA** | Systematic review protocols complete | PRISMA checklist 100% |
| **GRADE** | Quality assessment structured per GRADE guidelines | GRADE criteria coverage 100% |

**NFRs Validated**:

| NFR ID | Requirement | Target | Test Method |
|--------|-------------|--------|-------------|
| NFR-RF-FAIR-01 | FAIR compliance rate | 100% | F-UJI assessment on sample corpus |
| NFR-RF-PROV-01 | PROV graph validity | 100% | PROV-O validator |
| NFR-RF-OAIS-01 | OAIS package conformance | 100% | METS validator, BagIt validation |
| NFR-RF-Comp-01 | PRISMA checklist completion | 100% | Manual checklist review |
| NFR-RF-Comp-02 | GRADE criteria coverage | 100% | Automated criteria check |

**Compliance Testing Process**:

1. **FAIR Compliance**:
   - Run F-UJI assessment on sample 10-paper corpus
   - Validate metadata completeness (DOI, authors, year, abstract)
   - Check persistent identifiers (DOI, ORCID)
   - Verify machine-readable formats (JSON-LD, PROV-O RDF)

2. **PROV Compliance**:
   - Generate W3C PROV graph for sample workflow
   - Validate against PROV-O ontology schema
   - Check Activity, Entity, Agent triples
   - Verify wasGeneratedBy, wasAttributedTo, used relationships

3. **OAIS Compliance**:
   - Create archival package (SIP → AIP → DIP)
   - Validate METS XML structure
   - Check BagIt manifest (checksums valid)
   - Verify preservation metadata

4. **PRISMA Compliance**:
   - Generate systematic review protocol
   - Validate PRISMA checklist (27 items)
   - Check search strategy documentation
   - Verify screening workflow completeness

5. **GRADE Compliance**:
   - Generate GRADE quality assessment
   - Validate all 5 criteria (risk of bias, inconsistency, indirectness, imprecision, publication bias)
   - Check quality of evidence rating (high, moderate, low, very low)

**Tools**:

- **F-UJI**: https://www.f-uji.net/ (FAIR assessment tool)
- **PROV-O Validator**: https://www.w3.org/TR/prov-o/ (RDF validation)
- **METS Validator**: Library of Congress METS schema validator
- **BagIt**: Python bagit library for archival package validation
- **PRISMA Checklist**: http://www.prisma-statement.org/PRISMAStatement/Checklist.aspx

**Blocking Conditions**:

- **Release**: All 5 compliance NFRs MUST meet 100% targets
- **F-UJI Score**: >80% on automated FAIR assessment
- **PROV Validation**: 100% valid PROV-O graphs

---

## 4. Test Coverage Requirements

### 4.1 Code Coverage Targets

**Mandatory Thresholds** (CI-Enforced):

| Metric | Minimum (Blocking) | Target (Goal) | Enforcement |
|--------|-------------------|---------------|-------------|
| **Line Coverage** | 80% | 90% | PR merge blocked if <80% |
| **Branch Coverage** | 75% | 85% | PR merge blocked if <75% |
| **Function Coverage** | 85% | 95% | Warning if <85% |
| **Statement Coverage** | 80% | 90% | PR merge blocked if <80% |

**Critical Component Coverage** (100% Required):

| Component | Justification | Enforcement |
|-----------|--------------|-------------|
| Hallucination Detection | Critical Risk T-01 (LLM hallucination) | 100% line + branch |
| Citation Verification | Prevent citing fabricated papers | 100% line + branch |
| Quality Scoring | Critical Risk Q-01 (low-quality sources) | 100% line + branch |
| FAIR Validation | Compliance requirement | 100% line + branch |
| PROV Graph Generation | Standards compliance | 100% line + branch |
| API Rate Limiting | Critical Risk T-02 (API dependency) | 100% line + branch |
| Input Sanitization | Security Risk S-01 | 100% line + branch |

**Coverage Progression**:

| Phase | Line Coverage Target | Branch Coverage Target |
|-------|---------------------|------------------------|
| Construction (Week 9) | 60% | 55% |
| Documentation (Week 11) | 75% | 70% |
| Integration (Week 14) | 85% | 80% |
| Release (Week 20) | 90% | 85% |

**Coverage Ratcheting**:

- **Rule**: Coverage CANNOT decrease from previous PR
- **Enforcement**: CI fails if coverage drops >1%
- **Exception**: Technical debt approved by Test Architect (rare)

### 4.2 Use Case Coverage

**Coverage Matrix**: 100% Use Case Validation

| Use Case | Acceptance Criteria | Test Cases | Automation | Status |
|----------|-------------------|------------|------------|--------|
| UC-RF-001: Discover Research Papers | 10 AC | 15 tests | 100% | Planned |
| UC-RF-002: Acquire Research Source | 8 AC | 12 tests | 100% | Planned |
| UC-RF-003: Document Research Paper | 12 AC | 18 tests | 100% | Planned |
| UC-RF-004: Integrate Citations | 6 AC | 10 tests | 100% | Planned |
| UC-RF-005: Track Provenance | 5 AC | 8 tests | 100% | Planned |
| UC-RF-006: Assess Source Quality | 10 AC | 15 tests | 100% | Planned |
| UC-RF-007: Archive Research Artifacts | 7 AC | 10 tests | 100% | Planned |
| UC-RF-008: Execute Research Workflow | 8 AC | 12 tests | 100% | Planned |
| UC-RF-009: Perform Gap Analysis | 6 AC | 10 tests | 100% | Planned |
| UC-RF-010: Export Research Artifacts | 5 AC | 8 tests | 100% | Planned |
| **Total** | **77 AC** | **118 tests** | **100%** | |

**Traceability**: Every acceptance criteria MUST map to at least 1 test case.

### 4.3 NFR Coverage

**NFR Coverage Matrix**: 100% NFR Validation

| NFR Category | NFR Count | Measurable Targets | Test Automation | Status |
|--------------|-----------|-------------------|-----------------|--------|
| **Performance** | 10 NFRs | <10s search, <30s gap analysis, <60s doc generation, etc. | 100% | Planned |
| **Security** | 8 NFRs | API key protection, input sanitization, privacy, etc. | 90% | Planned |
| **Usability** | 7 NFRs | Onboarding <5hrs, query suggestions >80%, etc. | 50% (manual surveys) | Planned |
| **Compliance** | 10 NFRs | FAIR 100%, PROV 100%, OAIS 100%, PRISMA 100%, etc. | 100% | Planned |
| **Reliability** | 5 NFRs | API retry logic, rate limit compliance, error handling | 100% | Planned |
| **Scalability** | 5 NFRs | Support 1,000+ papers, no degradation at scale | 100% | Planned |
| **Total** | **45 NFRs** | **100% measurable** | **95% automation** | |

**NFR Testing Schedule**:

| Phase | NFRs Validated | Test Type |
|-------|----------------|-----------|
| Construction (Week 9-11) | Performance baselines, security static analysis | Automated |
| Integration (Week 12-14) | Compliance (FAIR, PROV), reliability (API retry) | Automated |
| Workflows (Week 15-17) | Scalability (1,000-paper corpus), PRISMA compliance | Automated |
| Validation (Week 18-20) | Usability (user surveys), full NFR regression | Manual + Automated |

---

## 5. Test Data Strategy

### 5.1 Test Data Requirements

**Data Categories**:

| Category | Purpose | Volume | Source |
|----------|---------|--------|--------|
| **Open Access Papers** | Real-world validation | 100 papers | Semantic Scholar, arXiv, PubMed Central |
| **Mock API Responses** | Offline testing, CI/CD | 500+ fixtures | Recorded Semantic Scholar responses |
| **Sample PDFs** | PDF extraction, hallucination detection | 50 PDFs | Open access repositories (CC BY license) |
| **BibTeX/RIS Fixtures** | Citation format validation | 100 entries | Zotero library, CrossRef API |
| **FAIR Metadata** | FAIR compliance testing | 20 datasets | Zenodo, Figshare (FAIR-compliant sources) |
| **PROV Graphs** | W3C PROV validation | 10 graphs | W3C PROV examples, custom workflows |
| **OAIS Packages** | Archival package testing | 5 packages | Library of Congress OAIS examples |
| **GRADE Assessments** | Quality scoring validation | 30 papers | Cochrane reviews, expert-validated |

### 5.2 Test Data Sources

**Primary Sources**:

1. **Semantic Scholar API**:
   - Query: "machine learning", "reinforcement learning", "natural language processing"
   - Filter: Open access, year >2020, citations >10
   - Record responses for offline testing

2. **arXiv**:
   - Categories: cs.AI, cs.LG, cs.CL
   - Download sample PDFs (open access, no copyright issues)

3. **PubMed Central**:
   - Medical/healthcare research papers
   - Open access subset (CC BY license)

4. **Expert-Curated Datasets**:
   - Cochrane reviews (GRADE quality assessments)
   - Zenodo/Figshare (FAIR-compliant datasets)

**Data Licensing**:

- **Requirement**: All test data MUST be open access or CC BY licensed
- **Prohibition**: No paywalled content, respect publisher terms
- **Attribution**: Credit original sources in test documentation

### 5.3 Test Data Generation

**Automated Generation**:

1. **Mock API Responses**:
   - Record real Semantic Scholar API responses
   - Anonymize if needed (replace author names, paper IDs)
   - Store in `test/fixtures/api-responses/`

2. **Synthetic Data**:
   - Generate BibTeX entries with faker.js
   - Create PROV graphs programmatically
   - Build OAIS packages from templates

3. **Edge Cases**:
   - Empty results (0 papers)
   - Large results (500 papers)
   - Malformed data (invalid DOI, missing metadata)
   - Retracted papers (flagged in Retraction Watch)

**Data Versioning**:

- **Storage**: `test/fixtures/` directory
- **Version Control**: Git LFS for large PDFs (>1MB)
- **Updates**: Refresh fixtures quarterly to match API changes

### 5.4 Test Data Management

**Data Isolation**:

- **Principle**: Tests MUST NOT depend on external APIs (except explicit integration tests)
- **Approach**: Mock API responses for unit/E2E tests, real APIs for integration tests only

**Data Cleanup**:

- **Temporary Files**: Delete `.aiwg/research/` artifacts after each test
- **Test Isolation**: Each test suite runs in isolated directory (`test-run-{uuid}/`)
- **CI Cleanup**: Wipe test artifacts after CI run

**Data Privacy**:

- **No PII**: Test data MUST NOT contain personally identifiable information
- **No Secrets**: API keys, tokens in environment variables only (never in fixtures)
- **Public Datasets**: All test data shareable (no proprietary or confidential data)

**Fixtures Organization**:

```
test/fixtures/
├── api-responses/
│   ├── semantic-scholar/
│   │   ├── search-machine-learning.json
│   │   ├── search-empty-results.json
│   │   └── rate-limit-error.json
│   ├── crossref/
│   │   ├── doi-valid.json
│   │   └── doi-invalid.json
│   └── retraction-watch/
│       └── retracted-paper.json
├── pdfs/
│   ├── sample-paper-01.pdf
│   ├── sample-paper-02.pdf
│   └── sample-scanned.pdf (OCR test case)
├── bibtex/
│   ├── valid-100-entries.bib
│   └── malformed-entries.bib
├── fair-metadata/
│   ├── zenodo-dataset.json
│   └── figshare-dataset.json
├── prov-graphs/
│   ├── simple-workflow.ttl (Turtle format)
│   └── complex-lineage.jsonld
└── oais-packages/
    ├── sample-sip/ (Submission Information Package)
    ├── sample-aip/ (Archival Information Package)
    └── sample-dip/ (Dissemination Information Package)
```

---

## 6. Test Automation

### 6.1 Automation Strategy

**Automation Targets**:

| Test Level | Automation Target | Current | Rationale |
|------------|------------------|---------|-----------|
| Unit Tests | 100% | 0% (Phase 3+) | Fast feedback, high ROI |
| Integration Tests | 100% | 0% (Phase 3+) | API contracts, agent handoffs |
| E2E Tests | 100% | 0% (Phase 4+) | Critical workflows, regression prevention |
| Acceptance Tests | 50% | 0% (Phase 6) | Some manual (user surveys, expert validation) |
| **Overall** | **95%** | **0%** (pre-Construction) | Minimize manual testing burden |

**Automation Phases**:

| Phase | Automation Focus | Deliverable |
|-------|-----------------|-------------|
| Construction (Week 9-11) | Unit tests, basic integration tests | 60% automation |
| Integration (Week 12-14) | Full integration tests, E2E scaffolding | 80% automation |
| Workflows (Week 15-17) | E2E critical paths, performance tests | 90% automation |
| Validation (Week 18-20) | Acceptance tests, compliance tests | 95% automation |

### 6.2 Automation Tools

**Test Frameworks**:

| Tool | Purpose | Justification |
|------|---------|--------------|
| **Jest** or **Vitest** | Unit + Integration testing | Node.js/TypeScript standard, fast, mocking built-in |
| **Playwright** | E2E testing (if UI added) | Browser automation, cross-platform |
| **Supertest** | API testing | Express.js integration, HTTP assertions |
| **k6** | Load testing | CLI-based, scriptable, cloud integration |

**CI/CD Integration**:

| Tool | Purpose | Configuration |
|------|---------|--------------|
| **GitHub Actions** | CI/CD pipeline | `.github/workflows/test.yml` |
| **Pre-commit Hooks** | Local fast feedback | Husky + lint-staged |
| **Codecov** | Coverage reporting | Integrated with GitHub Actions |
| **Dependabot** | Dependency updates | Automated PRs for npm packages |

**Mocking & Stubbing**:

| Tool | Purpose | Use Case |
|------|---------|----------|
| **nock** | HTTP mocking | Mock Semantic Scholar API responses |
| **sinon** | Function stubs/spies | Stub file system operations, time functions |
| **MSW** | Service worker mocking | Mock browser-based API calls (if needed) |

**Test Data Tools**:

| Tool | Purpose | Use Case |
|------|---------|----------|
| **faker.js** | Synthetic data generation | Generate BibTeX entries, author names |
| **Git LFS** | Large file versioning | Store sample PDFs in version control |
| **Docker** | Test environment isolation | Run Zotero, Neo4j in containers |

### 6.3 CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/test.yml`):

```yaml
name: Test Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Integration tests
        run: npm run test:integration
        env:
          SEMANTIC_SCHOLAR_API_KEY: ${{ secrets.SEMANTIC_SCHOLAR_API_KEY }}

      - name: E2E tests
        run: npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info

      - name: Check coverage thresholds
        run: npm run coverage:check
        # Fails if coverage <80% line, <75% branch

  security:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

  performance:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Performance tests
        run: npm run test:performance

      - name: Check performance regression
        run: npm run performance:compare
        # Fails if >10% degradation from baseline
```

**Pre-commit Hooks** (`.husky/pre-commit`):

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run fast checks only (unit tests, linting)
npm run lint
npm run typecheck
npm run test:unit -- --bail --findRelatedTests
```

**Branch Protection Rules**:

- **Require**: All CI checks pass (test, security, coverage)
- **Require**: >1 approval for PRs to main
- **Prevent**: Force push to main
- **Enforce**: Coverage CANNOT decrease

### 6.4 Test Execution Schedule

**Pre-Commit** (Local, <30s):

- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (related files only)

**PR Merge** (CI, <5 min):

- Full lint + type check
- All unit tests (190 tests)
- All integration tests (55 tests)
- Coverage check (80% line, 75% branch)
- Security scan (npm audit, secret scan)

**Nightly** (CI, <30 min):

- Full test suite (unit + integration + E2E)
- Performance tests (baseline comparison)
- Mutation testing (Stryker)
- Dependency updates (Dependabot PRs)

**Release** (Manual + CI, <2 hours):

- Full regression suite
- All 145 acceptance tests
- Compliance validation (FAIR, PROV, OAIS)
- User acceptance testing (matric-memory team)
- Performance baseline update

---

## 7. Quality Gates

### 7.1 Pre-Commit Quality Gate

**Enforcement**: Local developer machine (Husky pre-commit hooks)

**Criteria**:

| Check | Threshold | Blocking | Rationale |
|-------|-----------|----------|-----------|
| Linting | 0 errors | Yes | Code style consistency |
| Type Errors | 0 errors | Yes | Type safety (TypeScript) |
| Unit Tests (Related) | 100% pass | Yes | Fast feedback on changes |
| Formatting | Prettier compliant | Yes | Consistent formatting |

**Bypass**: NOT allowed (except emergency hotfixes with Test Architect approval)

### 7.2 PR Merge Quality Gate

**Enforcement**: GitHub branch protection + CI (GitHub Actions)

**Criteria**:

| Check | Threshold | Blocking | Rationale |
|-------|-----------|----------|-----------|
| **All Tests Pass** | 100% | Yes | No regressions |
| **Code Coverage** | ≥80% line, ≥75% branch | Yes | Minimum coverage threshold |
| **Coverage Delta** | No decrease >1% | Yes | Prevent coverage erosion |
| **Security Vulnerabilities** | 0 high/critical | Yes | No known exploits |
| **Secret Scanning** | 0 secrets detected | Yes | No leaked credentials |
| **Peer Review** | ≥1 approval | Yes | Code quality assurance |
| **Linting** | 0 errors | Yes | Style compliance |
| **Type Errors** | 0 errors | Yes | Type safety |
| **Build Success** | Successful build | Yes | No compilation errors |

**Bypass**: NOT allowed (no exceptions)

**Escalation**: If gate blocks valid PR, Test Architect reviews and approves override (rare, documented)

### 7.3 Release Quality Gate

**Enforcement**: Manual checklist + automated validation (Release Manager + CI)

**Criteria**:

| Check | Threshold | Blocking | Rationale |
|-------|-----------|----------|-----------|
| **All Tests Pass** | 100% (unit + integration + E2E) | Yes | No known defects |
| **Code Coverage** | ≥90% line, ≥85% branch | Yes | Target coverage for release |
| **Use Case Validation** | 100% (all 10 use cases) | Yes | Complete functionality |
| **NFR Validation** | 100% (all 45 NFRs met) | Yes | Quality attributes |
| **Acceptance Tests** | 100% pass | Yes | User requirements met |
| **Performance** | All targets met, no regressions | Yes | User experience |
| **Security Scan** | 0 high/critical vulnerabilities | Yes | Production-ready |
| **Compliance** | FAIR >80%, PROV 100%, OAIS 100% | Yes | Standards conformance |
| **User Acceptance** | >80% satisfaction (4/5 rating) | Yes | User approval |
| **Documentation** | Complete (CLI ref, tutorials, API docs) | Yes | Usability |
| **Migration Guide** | Published (if breaking changes) | Yes | User support |
| **Changelog** | Complete with highlights | Yes | Transparency |
| **Known Issues** | Documented, no critical unresolved | Yes | Risk awareness |

**Release Checklist**:

- [ ] All automated tests pass (CI green)
- [ ] Code coverage ≥90% line
- [ ] 10 use cases validated (manual or automated)
- [ ] 45 NFRs validated (automated + manual surveys)
- [ ] Performance baselines met (no >10% regression)
- [ ] Security scan clean (npm audit, Snyk)
- [ ] FAIR compliance >80% (F-UJI assessment)
- [ ] PROV graphs 100% valid (PROV-O validator)
- [ ] OAIS packages conformant (METS validator)
- [ ] User acceptance testing complete (matric-memory sign-off)
- [ ] Documentation complete (CLI ref, tutorials)
- [ ] Changelog updated
- [ ] Release notes drafted
- [ ] Known issues documented
- [ ] Backup/rollback plan ready

**Approvals Required**:

- Test Architect (quality assurance)
- Product Owner (user acceptance)
- Release Manager (process compliance)

### 7.4 Phase Transition Quality Gates

**Inception → Elaboration**:

- [ ] Test strategy approved
- [ ] Coverage targets defined
- [ ] Automation feasibility assessed
- [ ] Test data sources identified

**Elaboration → Construction**:

- [ ] Master test plan approved
- [ ] Test environments provisioned (Docker, CI/CD)
- [ ] CI/CD pipeline includes test execution
- [ ] Baseline coverage established (0% for greenfield, acceptable)
- [ ] Test data fixtures created (API mocks, sample PDFs)

**Construction → Transition**:

- [ ] All coverage targets met (90% line, 85% branch)
- [ ] No critical/high defects open
- [ ] Performance baseline validated (all 8 NFRs)
- [ ] Security scan passed (no high/critical vulnerabilities)
- [ ] Regression suite passing (all unit + integration + E2E)

**Transition → Production**:

- [ ] UAT complete and signed off (matric-memory team)
- [ ] All test levels passing (unit, integration, E2E, acceptance)
- [ ] No regressions from baseline
- [ ] Operational runbook tested (deployment, rollback)
- [ ] Monitoring and alerting configured (optional for v1.0)

---

## 8. Risk-Based Testing

### 8.1 Critical Priority Risks (Score 20-25)

**T-01: LLM Hallucination in Summaries/Extractions** (Score: 20)

**Testing Strategy**:

| Test Type | Coverage | Test Count | Automation |
|-----------|----------|------------|------------|
| Unit Tests | Hallucination detection algorithm | 10 tests | 100% |
| Integration Tests | RAG-based summarization pipeline | 5 tests | 100% |
| E2E Tests | UC-RF-003 (Document Research Paper) | 3 tests | 100% |
| Acceptance Tests | Hallucination rate <5% | 1 validation | Manual (expert review) |

**Test Scenarios**:

1. **Fabricated Citations**: LLM generates non-existent paper citation
   - **Test**: Detect author/year/DOI mismatch with source paper
   - **Expected**: Hallucination flagged, warning displayed

2. **Citation Verification**: Cross-reference all citations with CrossRef DOI database
   - **Test**: Verify DOI existence via API
   - **Expected**: 100% DOI validation, fabricated DOIs rejected

3. **Human-in-the-Loop**: Require user approval for AI summaries
   - **Test**: Display "AI-generated, not verified" warning
   - **Expected**: User explicitly confirms before summary persisted

4. **Hallucination Reporting**: User reports suspected hallucination
   - **Test**: User clicks "Report Hallucination" button
   - **Expected**: Report logged, trends monitored

**Success Criteria**:

- Hallucination rate <5% in user testing (expert validation of 50 summaries)
- 100% DOI verification (no fabricated DOIs pass validation)
- User trust survey: >80% trust in AI summaries

**Monitoring**:

- Weekly hallucination report count (>5 reports/month → escalate)
- Monthly hallucination audit (random sample of 50 summaries)

---

**A-04: Requires Too Much Manual Effort** (Score: 20)

**Testing Strategy**:

| Test Type | Coverage | Test Count | Automation |
|-----------|----------|------------|------------|
| Performance Tests | Workflow completion time | 8 tests | 100% |
| Usability Tests | User onboarding, effort tracking | 5 tests | 50% (manual surveys) |
| E2E Tests | All 10 use cases (time measurement) | 10 tests | 100% |
| Acceptance Tests | User satisfaction, time savings | 2 validations | Manual (surveys) |

**Test Scenarios**:

1. **Tiered Workflow Complexity**: Quick vs. Standard vs. Rigorous workflows
   - **Test**: Measure time for each workflow (Quick <30 min, Standard <2 hrs, Rigorous <8 hrs)
   - **Expected**: >60% users choose Quick/Standard (not overwhelmed by rigor)

2. **Effort Tracking**: Log time spent on each workflow step
   - **Test**: Track user time per task (search, screen, document, grade)
   - **Expected**: Framework shows "You've saved 15 hours vs. manual research"

3. **Onboarding Completion**: Users complete onboarding tutorial
   - **Test**: Track completion rate (Stage 1, Stage 2, ..., Stage 5)
   - **Expected**: >70% complete Stage 2 (basic usage), >50% complete Stage 4 (advanced)

4. **User Satisfaction**: Survey users on effort perception
   - **Test**: Ask "Was framework time-saving or time-consuming?" (1-5 scale)
   - **Expected**: >60% users rate 4/5 (time-saving)

**Success Criteria**:

- Total workflow time <2 hours for 100-paper review (vs. 60 hours manual = 97% reduction)
- User satisfaction: >60% report time savings
- Onboarding completion: >70% complete basic workflow

**Monitoring**:

- Weekly onboarding completion rate (Phase 6: user testing)
- Bi-weekly user interviews on effort pain points
- Monthly effort tracking analytics (median time per task)

### 8.2 High Priority Risks (Score 15-19)

**Q-01: Low-Quality Source Data** (Score: 16)

**Testing Strategy**:

| Test Type | Coverage | Test Count | Automation |
|-----------|----------|------------|------------|
| Unit Tests | GRADE scoring logic, retraction checking | 20 tests | 100% |
| Integration Tests | Retraction Watch API, quality metrics | 5 tests | 100% |
| E2E Tests | UC-RF-006 (Assess Source Quality) | 3 tests | 100% |
| Acceptance Tests | Quality score accuracy >90% | 1 validation | Manual (expert review) |

**Test Scenarios**:

1. **Multi-Dimensional Quality Scoring**: GRADE-inspired quality assessment
   - **Test**: Score paper on 5 dimensions (venue, peer review, citations, metadata, study design)
   - **Expected**: Score 1-5 (very low to high), expert validates >90% agreement

2. **Retraction Checking**: Cross-reference DOIs with Retraction Watch database
   - **Test**: Query Retraction Watch API for retracted papers
   - **Expected**: 100% detection of known retractions, "RETRACTED" badge displayed

3. **Quality Score Distribution**: Monitor low-quality source percentage
   - **Test**: Track % papers scored <3/5
   - **Expected**: <10% low-quality sources in user corpora

4. **Expert Validation**: Blind comparison with expert-curated corpus (e.g., Cochrane reviews)
   - **Test**: Score 30 papers, compare to expert GRADE assessments
   - **Expected**: >80% agreement on quality category (high, moderate, low)

**Success Criteria**:

- Quality scoring accuracy >90% (expert validation)
- Retraction detection 100% (all known retractions flagged)
- Low-quality source percentage <10%

**Monitoring**:

- Weekly retraction check sweep (new retractions)
- Monthly quality score distribution analysis
- Quarterly expert validation (30-paper sample)

---

**A-01: Steep Learning Curve** (Score: 16)

**Testing Strategy**:

| Test Type | Coverage | Test Count | Automation |
|-----------|----------|------------|------------|
| Usability Tests | Onboarding completion, learning time | 5 tests | 50% (manual) |
| Documentation Tests | Tutorial clarity, glossary completeness | 3 tests | Manual |
| E2E Tests | Progressive onboarding stages | 5 tests | 100% |
| Acceptance Tests | User learning time <5 hours | 1 validation | Manual (surveys) |

**Test Scenarios**:

1. **Progressive Onboarding**: Stage 1 (30 min) → Stage 2 (1 hr) → ... → Stage 5 (8+ hrs)
   - **Test**: Track completion rate per stage
   - **Expected**: >70% complete Stage 2, >50% complete Stage 4

2. **Concept Glossary**: Plain-language explanations of academic jargon
   - **Test**: Survey users on glossary helpfulness (1-5 scale)
   - **Expected**: >80% rate 4/5 (helpful)

3. **Template Library**: Pre-filled examples for search, quality, notes
   - **Test**: Track template usage rate
   - **Expected**: >60% users use templates (vs. start from scratch)

4. **Time to First Value**: Measure time until user discovers first 10 papers
   - **Test**: Track time from install to first successful search
   - **Expected**: <1 hour (quick win encourages continued use)

**Success Criteria**:

- Onboarding completion: >70% complete basic tutorial
- User learning time: <5 hours to proficiency
- User satisfaction: >80% rate framework "easy to learn" (4/5)

**Monitoring**:

- Weekly onboarding analytics (Phase 6: user testing)
- Bi-weekly support question analysis (identify confusion points)
- Monthly user interviews on learning experience

---

**Other High Risks** (R-01, I-04, A-02):

- **R-01 (Solo Developer Capacity)**: Not directly testable, mitigated via schedule monitoring
- **I-04 (Migration from Existing Systems)**: Test Zotero import script (5 tests)
- **A-02 (Workflow Disruption)**: Test Zotero/Obsidian integrations (10 tests)

### 8.3 Medium Priority Risks (Score 10-14)

**Testing Approach**: Monitor + Contingency Planning

| Risk | Test Coverage | Monitoring Metric | Escalation Trigger |
|------|---------------|-------------------|-------------------|
| R-02 (Skill Gaps in Standards) | Compliance tests (FAIR, PROV, OAIS) | Compliance validation failure rate | >10% failures |
| Q-02 (Gap Analysis Errors) | Gap detection accuracy tests | User-reported false positives/negatives | >20% error rate |
| Q-03 (Citation Context Misclassification) | Citation context tests | User-reported misclassifications | >15% error rate |
| A-03 (Too Academic for Developers) | User persona surveys | Developer adoption rate | <30% developer users |
| C-02 (FAIR Compliance Failures) | F-UJI automated assessment | FAIR score <80% | Immediate |
| R-03 (Zero Budget Limits Tools) | Feature availability tests | User requests for premium features | >20% requests |
| Q-04 (Reproducibility Failures) | External replication tests | Replication failure rate | >5% failures |
| C-01 (Copyright Violations) | Acquisition logic audit | User reports of paywalled PDFs | Any violation |

**Test Budget**: 5 hours setup per risk, 10-20 hours contingency if triggered

### 8.4 Low & Very Low Risks (Score 1-9)

**Testing Approach**: Accept + Periodic Review

- **Monthly Risk Review**: Check if any low-priority risks escalated
- **Test Coverage**: Minimal (basic smoke tests only)
- **Budget**: 1 hour/month total for all low-priority risks

---

## 9. Test Schedule

### 9.1 By Development Phase

**Phase 2: Architecture & Infrastructure (Weeks 6-8)**

| Week | Testing Activities | Deliverables |
|------|-------------------|-------------|
| 6 | Test environment setup (Docker, CI/CD) | GitHub Actions workflow configured |
| 7 | Test data fixtures creation (API mocks, sample PDFs) | 100+ fixtures in `test/fixtures/` |
| 8 | Unit test scaffolding, pre-commit hooks | Husky configured, 10 example unit tests |

**Phase 3: Core Services & Documentation (Weeks 9-11)**

| Week | Testing Activities | Deliverables |
|------|-------------------|-------------|
| 9 | Unit tests for Discovery, Acquisition agents | 45 unit tests (60% coverage) |
| 10 | Unit tests for Documentation, Citation agents | 45 unit tests (75% coverage) |
| 11 | Integration tests (API mocking), performance baselines | 30 integration tests, baseline metrics |

**Phase 4: Integration & Workflows (Weeks 12-14)**

| Week | Testing Activities | Deliverables |
|------|-------------------|-------------|
| 12 | Unit tests for Quality, Provenance agents | 35 unit tests (85% coverage) |
| 13 | Integration tests (Zotero, CrossRef), E2E scaffolding | 25 integration tests, 5 E2E tests |
| 14 | E2E critical paths, compliance tests (FAIR, PROV) | 10 E2E tests, compliance validation |

**Phase 5: Advanced Features (Weeks 15-17)**

| Week | Testing Activities | Deliverables |
|------|-------------------|-------------|
| 15 | Unit tests for Archive, Workflow agents | 30 unit tests (90% coverage target) |
| 16 | Performance tests (scalability, 1,000-paper corpus) | Load tests, scalability validation |
| 17 | Security tests (fuzzing, secret scanning), mutation testing | Security scan clean, mutation score >80% |

**Phase 6: Validation & Documentation (Weeks 18-20)**

| Week | Testing Activities | Deliverables |
|------|-------------------|-------------|
| 18 | User acceptance testing (matric-memory team) | UAT feedback, usability issues logged |
| 19 | Acceptance tests (all 145 tests), NFR validation | NFR validation complete, regression clean |
| 20 | Final regression, release checklist, documentation review | Release gate passed, v1.0 ready |

### 9.2 Regression Testing Cadence

**Weekly Regression** (During Construction, Weeks 9-20):

- **Scope**: All unit tests (190 tests)
- **Duration**: <5 minutes
- **Trigger**: Every PR merge to main
- **Pass Criteria**: 100% tests pass, coverage ≥80% line

**Bi-Weekly Regression** (During Integration, Weeks 12-20):

- **Scope**: Unit + Integration tests (245 tests)
- **Duration**: <10 minutes
- **Trigger**: Scheduled nightly
- **Pass Criteria**: 100% tests pass, no performance regressions

**Monthly Regression** (Entire Project):

- **Scope**: Full suite (unit + integration + E2E + acceptance)
- **Duration**: <30 minutes
- **Trigger**: End of each phase, pre-release
- **Pass Criteria**: All quality gates passed (see Section 7)

**Release Regression**:

- **Scope**: Complete test suite + manual exploratory testing
- **Duration**: <2 hours
- **Trigger**: v1.0 release candidate
- **Pass Criteria**: Release quality gate (Section 7.3)

---

## 10. Traceability Matrix

### 10.1 Use Cases to Test Cases

| Use Case | Acceptance Criteria | Test Cases | Coverage |
|----------|-------------------|------------|----------|
| UC-RF-001: Discover Papers | AC-001 to AC-010 | TC-RF-001-001 to TC-RF-001-015 | 100% (15 tests) |
| UC-RF-002: Acquire Source | AC-001 to AC-008 | TC-RF-002-001 to TC-RF-002-012 | 100% (12 tests) |
| UC-RF-003: Document Paper | AC-001 to AC-012 | TC-RF-003-001 to TC-RF-003-018 | 100% (18 tests) |
| UC-RF-004: Integrate Citations | AC-001 to AC-006 | TC-RF-004-001 to TC-RF-004-010 | 100% (10 tests) |
| UC-RF-005: Track Provenance | AC-001 to AC-005 | TC-RF-005-001 to TC-RF-005-008 | 100% (8 tests) |
| UC-RF-006: Assess Quality | AC-001 to AC-010 | TC-RF-006-001 to TC-RF-006-015 | 100% (15 tests) |
| UC-RF-007: Archive Artifacts | AC-001 to AC-007 | TC-RF-007-001 to TC-RF-007-010 | 100% (10 tests) |
| UC-RF-008: Execute Workflow | AC-001 to AC-008 | TC-RF-008-001 to TC-RF-008-012 | 100% (12 tests) |
| UC-RF-009: Gap Analysis | AC-001 to AC-006 | TC-RF-009-001 to TC-RF-009-010 | 100% (10 tests) |
| UC-RF-010: Export Artifacts | AC-001 to AC-005 | TC-RF-010-001 to TC-RF-010-008 | 100% (8 tests) |
| **Total** | **77 AC** | **118 tests** | **100%** |

**Traceability Rule**: Every acceptance criteria MUST have at least 1 corresponding test case.

### 10.2 NFRs to Validation Tests

**Performance NFRs**:

| NFR ID | Requirement | Target | Test Case | Automation |
|--------|-------------|--------|-----------|------------|
| NFR-RF-D-01 | Search completion time | <10s (95th %ile) | TC-Perf-001 | 100% |
| NFR-RF-D-02 | Gap analysis generation | <30s for 100 papers | TC-Perf-002 | 100% |
| NFR-RF-Doc-01 | Document generation | <60s per paper | TC-Perf-003 | 100% |
| NFR-RF-Cite-01 | BibTeX generation | <5s for 100 papers | TC-Perf-004 | 100% |
| NFR-RF-Q-01 | GRADE scoring | <15s per paper | TC-Perf-005 | 100% |
| NFR-RF-Prov-01 | PROV graph generation | <20s for 100 actions | TC-Perf-006 | 100% |
| NFR-RF-Arch-01 | OAIS package creation | <120s for 100 papers | TC-Perf-007 | 100% |
| NFR-RF-WF-01 | PRISMA workflow execution | <5 min for 500 papers | TC-Perf-008 | 100% |

**Security NFRs**:

| NFR ID | Requirement | Target | Test Case | Automation |
|--------|-------------|--------|-----------|------------|
| NFR-RF-Sec-01 | API key protection | 100% (no hardcoding) | TC-Sec-001 | 100% (static analysis) |
| NFR-RF-Sec-02 | Input sanitization | Prevent injection | TC-Sec-002 | 100% (fuzzing) |
| NFR-RF-Sec-03 | Copyright compliance | Respect publisher TOS | TC-Sec-003 | Manual (audit) |
| NFR-RF-Sec-04 | Data privacy | No PII in shared corpus | TC-Sec-004 | 100% (privacy scan) |
| NFR-RF-Sec-05 | PDF malware scanning | Optional virus scan | TC-Sec-005 | Optional (VirusTotal) |

**Compliance NFRs**:

| NFR ID | Requirement | Target | Test Case | Automation |
|--------|-------------|--------|-----------|------------|
| NFR-RF-FAIR-01 | FAIR compliance rate | 100% | TC-Comp-001 | 100% (F-UJI) |
| NFR-RF-PROV-01 | PROV graph validity | 100% | TC-Comp-002 | 100% (PROV-O validator) |
| NFR-RF-OAIS-01 | OAIS package conformance | 100% | TC-Comp-003 | 100% (METS validator) |
| NFR-RF-Comp-01 | PRISMA checklist completion | 100% | TC-Comp-004 | Manual (checklist) |
| NFR-RF-Comp-02 | GRADE criteria coverage | 100% | TC-Comp-005 | 100% (automated check) |

**Usability NFRs**:

| NFR ID | Requirement | Target | Test Case | Automation |
|--------|-------------|--------|-----------|------------|
| NFR-RF-Usability-01 | Onboarding completion | >70% | TC-Usability-001 | Manual (analytics) |
| NFR-RF-Usability-02 | Learning time | <5 hours | TC-Usability-002 | Manual (surveys) |
| NFR-RF-Usability-03 | Query suggestion accuracy | >80% helpful | TC-Usability-003 | Manual (user feedback) |
| NFR-RF-Usability-04 | Gap report readability | 4/5 user rating | TC-Usability-004 | Manual (surveys) |

**Total**: 45 NFRs → 45 validation tests (95% automation)

### 10.3 Risks to Test Coverage

**Critical Risks**:

| Risk ID | Risk | Test Coverage | Test Count |
|---------|------|---------------|------------|
| T-01 | LLM Hallucination | Unit (10), Integration (5), E2E (3), Acceptance (1) | 19 tests |
| A-04 | Too Much Manual Effort | Performance (8), Usability (5), E2E (10), Acceptance (2) | 25 tests |

**High Risks**:

| Risk ID | Risk | Test Coverage | Test Count |
|---------|------|---------------|------------|
| Q-01 | Low-Quality Source Data | Unit (20), Integration (5), E2E (3), Acceptance (1) | 29 tests |
| A-01 | Steep Learning Curve | Usability (5), Documentation (3), E2E (5), Acceptance (1) | 14 tests |
| I-04 | Migration from Existing Systems | Integration (5) | 5 tests |
| A-02 | Workflow Disruption | Integration (10) | 10 tests |

**Medium Risks**: Monitored via periodic review, minimal test coverage

**Total Risk Test Coverage**: 102 tests dedicated to risk mitigation

---

## 11. Deliverables

### 11.1 Test Artifacts

**Documentation**:

| Artifact | Description | Owner | Status |
|----------|-------------|-------|--------|
| **Test Strategy** (this document) | Overall testing approach, coverage targets, quality gates | Test Architect | Draft (Week 2) |
| **Master Test Plan** | Detailed test schedules, resource allocation, environment setup | Test Engineer | Planned (Week 6) |
| **Test Coverage Matrix** | Use case → test case traceability, NFR → validation tests | QA Specialist | Planned (Week 7) |
| **Test Data Catalog** | Fixtures, sample PDFs, API mocks, FAIR datasets | Test Engineer | Planned (Week 7) |
| **Test Automation Framework** | CI/CD pipeline, test harness, mocking setup | Automation Engineer | Planned (Week 8) |

**Test Suites**:

| Suite | Test Count | Automation | Delivery |
|-------|------------|------------|----------|
| Unit Tests | 190 tests | 100% | Phase 3-5 (Weeks 9-17) |
| Integration Tests | 55 tests | 100% | Phase 3-4 (Weeks 9-14) |
| E2E Tests | 15 tests | 100% | Phase 4-5 (Weeks 12-17) |
| Acceptance Tests | 145 tests | 50% | Phase 6 (Weeks 18-20) |
| Performance Tests | 8 tests | 100% | Phase 5 (Weeks 15-17) |
| Security Tests | 5 tests | 90% | Phase 5 (Week 17) |
| Compliance Tests | 5 tests | 100% | Phase 4 (Week 14) |
| **Total** | **423 tests** | **95% automation** | |

**Test Reports**:

| Report | Frequency | Audience | Format |
|--------|-----------|----------|--------|
| Test Execution Summary | Per PR merge | Development Team | GitHub Actions log |
| Coverage Report | Weekly | Test Architect, Tech Lead | Codecov dashboard |
| Performance Baseline | Phase milestones | Product Owner, Test Architect | CSV + charts |
| Regression Report | Release candidate | Release Manager, Stakeholders | PDF |
| UAT Summary | Phase 6 | Product Owner, Stakeholders | Document |
| Defect Summary | Weekly | Development Team | GitHub Issues |

### 11.2 Quality Metrics Dashboard

**Key Metrics Tracked**:

| Metric | Target | Current | Trend | Alert Threshold |
|--------|--------|---------|-------|----------------|
| **Code Coverage (Line)** | 90% | 0% (pre-Construction) | → | <80% (blocking) |
| **Code Coverage (Branch)** | 85% | 0% | → | <75% (blocking) |
| **Test Pass Rate** | 100% | N/A | → | <100% (blocking) |
| **Defect Density** | <5 defects/KLOC | 0 | → | >10 defects/KLOC |
| **Critical Defects Open** | 0 | 0 | → | >0 (blocking) |
| **Performance Regression** | 0% | 0% | → | >10% (investigation) |
| **Security Vulnerabilities** | 0 high/critical | 0 | → | >0 (blocking) |
| **FAIR Compliance Score** | >80% | N/A | → | <80% (blocking) |
| **User Satisfaction** | >80% (4/5) | N/A | → | <80% (release risk) |

**Dashboard Tools**:

- **Codecov**: Code coverage visualization
- **GitHub Actions**: Test pass rate, CI/CD status
- **Grafana** (optional): Performance metrics, trend charts
- **Google Forms**: User satisfaction surveys

---

## 12. Roles and Responsibilities

| Role | Responsibilities | Owner |
|------|-----------------|-------|
| **Test Architect** | Define test strategy, coverage targets, quality gates | Joseph Magly |
| **Test Engineer** | Design test cases, implement unit/integration tests | Joseph Magly |
| **QA Specialist** | Execute acceptance tests, user testing, NFR validation | Joseph Magly |
| **Automation Engineer** | Build CI/CD pipeline, test automation framework | Joseph Magly |
| **Security Auditor** | Conduct security testing, vulnerability scanning | Joseph Magly |
| **Performance Engineer** | Design performance tests, establish baselines | Joseph Magly |
| **Compliance Specialist** | Validate FAIR, PROV, OAIS compliance | Joseph Magly |
| **Product Owner** | UAT sign-off, acceptance criteria definition | Joseph Magly |
| **Release Manager** | Release quality gate enforcement | Joseph Magly |

**Note**: Solo developer context, all roles filled by Joseph Magly. Post-v1.0, community contributors may assume some roles.

---

## 13. Escalation and Issue Management

### 13.1 Defect Severity Classification

| Severity | Description | Example | Response Time |
|----------|-------------|---------|--------------|
| **S1: Critical** | System unusable, data loss, security breach | API key leaked, hallucination rate >20% | Immediate (<4 hours) |
| **S2: High** | Core functionality broken, major workflow blocked | Discovery agent crashes, FAIR validation fails | <24 hours |
| **S3: Medium** | Feature degraded, workaround available | Gap analysis slow, BibTeX formatting error | <1 week |
| **S4: Low** | Cosmetic issue, minimal impact | Typo in docs, minor UI glitch | <1 month (or defer) |

### 13.2 Test Failure Escalation

**L1: Test Fails Locally** (Developer)

- Developer investigates, fixes, re-runs tests
- If unable to resolve in <2 hours, escalate to L2

**L2: Test Fails in CI** (Test Engineer)

- Test Engineer reviews failure, determines if test bug or code bug
- If code bug, assign to developer with priority
- If test bug (flaky test), fix immediately (no flaky tests tolerated)

**L3: Persistent Test Failures** (Test Architect)

- >3 consecutive failures on same test → Test Architect reviews
- Determine if architectural issue, test coverage gap, or environmental issue
- Escalate to Tech Lead if architectural change required

**L4: Quality Gate Violation** (Release Manager)

- Coverage drops below threshold, critical defects open, performance regression
- Release Manager halts release, convenes team
- Test Architect provides remediation plan

### 13.3 Flaky Test Policy

**Definition**: Flaky test = intermittent failures (passes some runs, fails others) without code changes

**Policy**: ZERO flaky tests tolerated

**Remediation**:

1. Flaky test detected → Disable test immediately (mark `skip` or `quarantine`)
2. Investigate root cause (timing issue, network dependency, non-deterministic behavior)
3. Fix test or isolate issue within 48 hours
4. Re-enable test with verification (run 100 times, 100% pass rate)

**Monitoring**: Track flaky test rate (<1% target, per Google research 4.56% industry avg)

---

## 14. Continuous Improvement

### 14.1 Retrospective Schedule

**Weekly** (During Construction, Weeks 9-20):

- Quick test health check (pass rate, coverage, flaky tests)
- Identify test blockers, process improvements

**Phase Milestones** (End of Phases 3, 4, 5, 6):

- Full retrospective: What worked, what didn't, what to change
- Review test metrics (coverage, defect density, performance)
- Adjust test strategy if needed

**Post-Release** (After v1.0):

- Comprehensive testing lessons learned
- Identify test gaps, false positives, inefficient tests
- Plan test strategy improvements for v1.1

### 14.2 Test Metrics Review

**Monthly**:

- Review dashboard metrics (coverage, pass rate, defect density)
- Identify trends (coverage increasing/decreasing, defect hotspots)
- Report to stakeholders (matric-memory team, early adopters)

**Quarterly**:

- Compare to industry benchmarks (Google 80% coverage, <5% flaky tests)
- Validate test ROI (bugs caught vs. test effort)
- Adjust coverage targets if needed (e.g., increase critical component coverage to 100%)

### 14.3 Test Automation Improvements

**Mutation Testing** (Post-v1.0):

- Introduce Stryker mutation testing (mutate code, verify tests catch mutations)
- Target: >80% mutation score (tests detect 80% of code changes)

**Visual Regression Testing** (If UI added):

- Use Percy or similar for visual diffs
- Prevent UI regressions

**Contract Testing** (API integrations):

- Use Pact to verify API contracts
- Prevent breaking changes in Semantic Scholar, Zotero APIs

---

## 15. Conclusion

### 15.1 Test Strategy Summary

This Test Strategy establishes a comprehensive, risk-based approach to quality assurance for the AIWG Research Framework. Key commitments:

- **90% code coverage** (80% line minimum, 75% branch minimum)
- **100% use case coverage** (all 10 use cases with acceptance criteria validated)
- **100% NFR coverage** (all 45 NFRs measured and tested)
- **95% test automation** (minimize manual testing burden)
- **Blocking quality gates** (tests MUST pass before PR merge and release)
- **Risk-based prioritization** (Critical risks T-01, A-04 tested most thoroughly)

**Testing Philosophy**: Testing is a blocking gate, not an afterthought. Coverage targets are minimum thresholds, not aspirational goals.

### 15.2 Success Criteria

The Test Architect has succeeded when:

1. **Every feature has tests before it reaches main branch** (TDD practiced)
2. **Coverage never decreases sprint over sprint** (ratcheting enforced)
3. **No critical bugs escape to production** (quality gates effective)
4. **Test execution time enables rapid feedback** (<5 min for PR, <30 min for full suite)
5. **Developers write tests naturally as part of development** (testing culture established)

### 15.3 Next Steps

**Immediate** (Week 2, Elaboration):

- [ ] Stakeholder review of test strategy
- [ ] Approval from Product Owner, Tech Lead
- [ ] Finalize coverage targets, quality gates

**Upcoming** (Week 6-8, Architecture):

- [ ] Create Master Test Plan (detailed schedules, resource allocation)
- [ ] Set up test environments (Docker, CI/CD)
- [ ] Create test data fixtures (API mocks, sample PDFs)

**Future** (Week 9+, Construction):

- [ ] Implement unit tests (190 tests)
- [ ] Build integration tests (55 tests)
- [ ] Develop E2E tests (15 tests)
- [ ] Execute acceptance tests (145 tests)

---

## Appendix A: Test Case Template

**Test Case ID**: TC-{Component}-{Number}

**Objective**: What is being validated?

**Preconditions**: What must be true before test?

**Test Steps**:
1. Step 1
2. Step 2
3. ...

**Expected Result**: What should happen?

**NFR Validated**: Which NFR(s) does this test validate?

**Pass/Fail Criteria**: Clear success/failure definition

---

## Appendix B: Defect Report Template

**Defect ID**: DEF-{Number}

**Severity**: S1 (Critical) | S2 (High) | S3 (Medium) | S4 (Low)

**Summary**: Brief description

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. ...

**Expected Behavior**: What should happen?

**Actual Behavior**: What actually happened?

**Environment**: OS, Node.js version, dependencies

**Logs/Screenshots**: Attach relevant evidence

**Impact**: Who is affected? How severely?

**Workaround**: Temporary mitigation (if any)

---

## Appendix C: Compliance Validation Checklists

### FAIR Compliance Checklist (F-UJI Assessment)

- [ ] **F1**: Data has globally unique persistent identifier (DOI)
- [ ] **F2**: Data described with rich metadata (authors, year, abstract, keywords)
- [ ] **F3**: Metadata includes identifier of data it describes
- [ ] **F4**: Metadata registered/indexed in searchable resource (Semantic Scholar)
- [ ] **A1**: Metadata retrievable by identifier via standard protocol (HTTPS)
- [ ] **A2**: Metadata accessible even when data no longer available (DOI persistence)
- [ ] **I1**: Metadata uses formal, accessible, shared language (JSON-LD, BibTeX)
- [ ] **I2**: Metadata uses FAIR-compliant vocabularies (Dublin Core, PROV-O)
- [ ] **I3**: Metadata includes qualified references (DOI, ORCID)
- [ ] **R1**: Metadata richly described with attributes (title, authors, abstract, venue, citations)
- [ ] **R1.1**: Metadata released with clear usage license (CC BY, MIT)
- [ ] **R1.2**: Metadata associated with provenance (W3C PROV graph)
- [ ] **R1.3**: Metadata meets domain-relevant community standards (PRISMA, GRADE)

**Target**: >80% compliance (12/15 criteria)

### W3C PROV Compliance Checklist

- [ ] **Activity** entities defined (search, acquisition, documentation, etc.)
- [ ] **Entity** entities defined (papers, summaries, citations, etc.)
- [ ] **Agent** entities defined (users, agents, APIs)
- [ ] **wasGeneratedBy** relationships (entity → activity)
- [ ] **used** relationships (activity → entity)
- [ ] **wasAttributedTo** relationships (entity → agent)
- [ ] **wasAssociatedWith** relationships (activity → agent)
- [ ] **wasDerivedFrom** relationships (entity → entity)
- [ ] **PROV-O RDF** serialization (Turtle or JSON-LD)
- [ ] **Schema validation** passes W3C PROV-O validator

**Target**: 100% compliance (all criteria met)

### OAIS Compliance Checklist

- [ ] **SIP** (Submission Information Package) created with metadata + content
- [ ] **AIP** (Archival Information Package) created with preservation metadata
- [ ] **DIP** (Dissemination Information Package) created for access
- [ ] **METS XML** structure valid (Library of Congress schema)
- [ ] **BagIt** manifest present with checksums (MD5, SHA-256)
- [ ] **Preservation metadata** includes format, provenance, fixity
- [ ] **Content metadata** includes descriptive, administrative, structural metadata

**Target**: 100% compliance (all criteria met)

---

**Document Status**: DRAFT - Ready for Stakeholder Review

**Approval Required**:
- [ ] Test Architect (Joseph Magly)
- [ ] Product Owner (Joseph Magly)
- [ ] Tech Lead (Joseph Magly)
- [ ] Release Manager (Joseph Magly)

**Next Review**: 2026-02-15 (End of Elaboration Phase)

**Version History**:
- 2026-01-25: Initial draft (Test Architect)
