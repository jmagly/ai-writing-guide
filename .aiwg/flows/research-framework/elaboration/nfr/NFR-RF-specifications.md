# Non-Functional Requirements: AIWG Research Framework

**Project**: AIWG Research Framework
**Framework ID**: research-complete
**Version**: 1.0.0
**Document ID**: NFR-RF-001
**Created**: 2026-01-25
**Status**: Draft for Review
**Document Type**: Non-Functional Requirements Specification

## References

- @.aiwg/flows/research-framework/inception/vision-document.md - Success metrics and quality goals
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk mitigation requirements
- @.aiwg/flows/research-framework/inception/solution-profile.md - Technical architecture and capabilities
- @.aiwg/flows/research-framework/inception/project-intake.md - Project scope and constraints
- @.aiwg/research/research-framework-findings.md - Research foundation and standards basis
- @agentic/code/frameworks/sdlc-complete/README.md - AIWG framework patterns

---

## 1. Executive Summary

### 1.1 Purpose

This document specifies the non-functional requirements (NFRs) for the AIWG Research Framework, defining quality attributes, performance targets, compliance standards, and operational constraints that govern how the system performs its functions rather than what functions it performs.

### 1.2 Scope

**Covered NFR Categories**:
- Performance (response times, throughput, scalability)
- Reliability (uptime, data integrity, recovery)
- Security (API key protection, data privacy, input validation)
- Usability (learning curve, error messages, documentation)
- Maintainability (code quality, test coverage, documentation standards)
- Compatibility (AIWG integration, external tool support, standards compliance)
- Compliance (FAIR principles, W3C PROV, OAIS alignment)

**Out of Scope**:
- Functional requirements (what system does) - covered in use cases
- Implementation details - covered in architecture document
- Test cases - covered in test strategy

### 1.3 NFR Relationship to Quality Goals

| Vision Goal | NFR Category | Key Requirements |
|-------------|--------------|------------------|
| 60%+ time savings | Performance, Usability | NFR-RF-P-001 (search <10s), NFR-RF-U-001 (<1 hour learning) |
| 100% FAIR compliance | Compliance | NFR-RF-CMP-001 through NFR-RF-CMP-004 (F1-F4) |
| 99%+ citation accuracy | Reliability | NFR-RF-R-002 (data integrity), NFR-RF-P-005 (validation) |
| <1 hour learning curve | Usability | NFR-RF-U-001, NFR-RF-U-002, NFR-RF-U-003 |
| <5 min to find papers | Performance | NFR-RF-P-001, NFR-RF-P-002 |

### 1.4 Priority Framework

**Priority Levels**:
- **Must Have (M)**: Critical for v1.0 release, system unusable without
- **Should Have (S)**: Important for v1.0, but workarounds exist
- **Could Have (C)**: Desirable for v1.0, may defer to v1.1+
- **Won't Have (W)**: Explicitly out of scope for v1.0

---

## 2. Performance Requirements

### NFR-RF-P-001: API Search Response Time

**ID**: NFR-RF-P-001
**Title**: Semantic Scholar API Search Response Time
**Category**: Performance
**Priority**: Must Have

**Requirement Statement**:
The Discovery Agent SHALL return initial search results from Semantic Scholar API within 10 seconds for 95% of searches under normal network conditions.

**Rationale**:
- Vision target: <5 min to find papers (includes search + review time)
- User testing: >10s perceived as slow, abandonment risk
- API baseline: Semantic Scholar median 2-3s, 95th percentile 8s
- Risk mitigation: Fast discovery critical for user adoption (Risk A-01)

**Acceptance Criteria**:
- [ ] 95% of API searches complete within 10 seconds (p95 latency)
- [ ] Median search latency <3 seconds
- [ ] Timeout at 30 seconds with graceful error message
- [ ] Response time logged for monitoring
- [ ] Caching reduces repeat search latency to <1 second

**Measurement Method**:
- Instrumented timing in Discovery Agent
- Logged to `.aiwg/research/provenance/performance-metrics.json`
- Automated test suite with mock API and real API validation
- Monthly performance report generation

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.1 (Efficiency Metrics)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk T-02 (API Rate Limits)

---

### NFR-RF-P-002: Batch Processing Throughput

**ID**: NFR-RF-P-002
**Title**: Screening and Acquisition Batch Processing
**Category**: Performance
**Priority**: Must Have

**Requirement Statement**:
The system SHALL process screening decisions for at least 100 papers per hour (manual review time excluded) and acquire PDFs at a rate of at least 20 papers per hour.

**Rationale**:
- PRISMA systematic reviews: 200-500 papers screened
- Vision target: 60% time reduction vs. manual (100 hours → 40 hours)
- Batch operations needed for efficiency
- Risk mitigation: Manual effort reduction (Risk A-04)

**Acceptance Criteria**:
- [ ] Screening automation processes 100+ papers/hour (API calls, relevance ranking)
- [ ] PDF acquisition completes 20+ downloads/hour (network permitting)
- [ ] Metadata extraction processes 50+ papers/hour
- [ ] Quality scoring processes 30+ papers/hour
- [ ] Batch operations resumable after interruption (no re-processing)

**Measurement Method**:
- Timed batch processing logs
- Throughput metrics in performance reports
- User survey: "How many papers did you process in X hours?"

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.1 (Efficiency Metrics)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk A-04 (Manual Effort)

---

### NFR-RF-P-003: Concurrent Operation Limits

**ID**: NFR-RF-P-003
**Title**: Maximum Concurrent Research Operations
**Category**: Performance
**Priority**: Should Have

**Requirement Statement**:
The system SHALL support at least 3 concurrent research operations (e.g., search + acquisition + summarization) without performance degradation exceeding 20%.

**Rationale**:
- Solo developer use case: Single user, but parallel tasks common
- Multi-project use case: matric-memory + matric-eval simultaneously
- Resource efficiency: Avoid sequential bottlenecks

**Acceptance Criteria**:
- [ ] 3 concurrent operations maintain >80% of single-operation performance
- [ ] No deadlocks or race conditions in concurrent access to artifacts
- [ ] File locking prevents data corruption during concurrent writes
- [ ] Progress indicators update independently for each operation
- [ ] Resource usage (memory, CPU) stays below 2GB RAM, 50% CPU for 3 operations

**Measurement Method**:
- Automated tests with concurrent operations
- Performance profiling under concurrent load
- Resource monitoring (memory, CPU usage)

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 4.4 (Technology Stack)

---

### NFR-RF-P-004: Knowledge Graph Query Performance

**ID**: NFR-RF-P-004
**Title**: Citation Network and Concept Graph Queries
**Category**: Performance
**Priority**: Could Have

**Requirement Statement**:
Knowledge graph queries (citation network traversal, concept relationships) SHALL complete within 5 seconds for corpora up to 1,000 papers.

**Rationale**:
- Vision scale: 100-1,000 paper corpora typical
- Graph algorithms complexity: O(n²) worst case for centrality
- User expectation: Interactive exploration, not batch processing
- Risk mitigation: Scalability concerns (Risk T-04)

**Acceptance Criteria**:
- [ ] Citation network queries (find related papers) <5s for 1,000-paper corpus
- [ ] Concept graph queries (find related concepts) <5s for 500-concept graph
- [ ] Author network queries (collaboration patterns) <5s for 200-author network
- [ ] Graph visualization rendering <10s for networks up to 500 nodes
- [ ] Performance degrades gracefully for larger corpora (progress indicators)

**Measurement Method**:
- Benchmark queries on test corpora (100, 500, 1,000 papers)
- Profile graph algorithms (centrality, community detection)
- User testing: perceived query speed

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk T-04 (Knowledge Graph Scalability)

---

### NFR-RF-P-005: LLM Summarization Latency

**ID**: NFR-RF-P-005
**Title**: AI Summary Generation Response Time
**Category**: Performance
**Priority**: Must Have

**Requirement Statement**:
LLM-powered summarization SHALL generate summaries for papers within 30 seconds for 90% of cases, with maximum timeout of 2 minutes.

**Rationale**:
- Vision target: <5 min/paper (vs. 20 min manual)
- LLM API latency: Claude typically 10-20s for medium-length prompts
- User expectation: Near-instant for short papers, tolerable wait for long papers
- Risk mitigation: Fast summarization critical for adoption (Risk A-04)

**Acceptance Criteria**:
- [ ] 90% of summaries complete within 30 seconds
- [ ] Median summarization time <15 seconds
- [ ] Maximum timeout 2 minutes, with graceful degradation (partial summary)
- [ ] Progress indicator shows LLM processing status
- [ ] Batch summarization queues requests, processes in background

**Measurement Method**:
- Logged summarization latency per paper
- Performance dashboard tracking p50, p90, p95, p99
- User survey: "Was summarization speed acceptable?"

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.1 (Efficiency Metrics: 20 min → <5 min)

---

## 3. Scalability Requirements

### NFR-RF-S-001: Source Corpus Size

**ID**: NFR-RF-S-001
**Title**: Maximum Supported Paper Corpus
**Category**: Scalability
**Priority**: Must Have

**Requirement Statement**:
The system SHALL support corpora of at least 1,000 papers without requiring specialized infrastructure (graph databases, distributed systems), with graceful degradation up to 5,000 papers.

**Rationale**:
- Vision use case: Typical systematic reviews 100-500 papers
- Advanced use case: Multi-year research programs 1,000+ papers
- Obsidian baseline: 8,000 notes / 64,000 links proven scalable
- Risk mitigation: Avoid early scalability limits (Risk T-04)

**Acceptance Criteria**:
- [ ] 1,000-paper corpus: All operations functional, no performance degradation >50%
- [ ] 5,000-paper corpus: Discovery and acquisition functional, knowledge graph may degrade
- [ ] Artifact storage: <10GB for 1,000 papers (PDFs + metadata + notes)
- [ ] Search/filter operations: <10s for 1,000-paper corpus
- [ ] Export operations: <5 min for full corpus export (BibTeX, Obsidian)

**Measurement Method**:
- Benchmark testing with synthetic 1,000-paper corpus
- Storage size monitoring
- Performance profiling at scale
- User testing with real corpora

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 11.2 (External Dependencies)
- @.aiwg/research/research-framework-findings.md - Obsidian scaling (8K notes)

---

### NFR-RF-S-002: Network Graph Size Limits

**ID**: NFR-RF-S-002
**Title**: Citation and Concept Network Capacity
**Category**: Scalability
**Priority**: Should Have

**Requirement Statement**:
Citation networks SHALL support at least 2,000 nodes (papers) and 10,000 edges (citations) with interactive query performance (<10s). Concept graphs SHALL support at least 1,000 concepts with 5,000 relationships.

**Rationale**:
- Citation network growth: 1,000 papers × 2 citations/paper average = 2,000 edges
- Concept extraction: ~5-10 concepts per paper × 1,000 papers = 5,000-10,000 concepts
- Graph algorithm complexity: Community detection O(n²), centrality O(n³)
- Vision goal: Reveal hidden connections at scale

**Acceptance Criteria**:
- [ ] Citation network: 2,000 nodes, 10,000 edges, queries <10s
- [ ] Concept graph: 1,000 concepts, 5,000 relationships, queries <10s
- [ ] Author network: 500 authors, 2,000 collaborations, queries <10s
- [ ] Visualization rendering: <30s for networks up to 500 visible nodes
- [ ] Graph export: Neo4j, RDF formats supported for advanced analysis

**Measurement Method**:
- Synthetic graph benchmarks (controlled node/edge counts)
- Query performance testing (centrality, community detection, path finding)
- Visualization rendering time measurement

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 3.4 (Integration: Knowledge Graphs)

---

### NFR-RF-S-003: Storage Growth Projections

**ID**: NFR-RF-S-003
**Title**: Artifact Storage Capacity Planning
**Category**: Scalability
**Priority**: Could Have

**Requirement Statement**:
The system SHALL document expected storage growth rates and provide warnings when artifact directories exceed 80% of recommended limits.

**Rationale**:
- Corpus growth over time: Research programs accumulate papers continuously
- Storage planning: Avoid unexpected disk space exhaustion
- Performance degradation: Large directories slow file operations
- OAIS archival planning: Long-term preservation requires capacity estimates

**Acceptance Criteria**:
- [ ] Storage estimates documented: 10MB/paper average (PDF + metadata + notes)
- [ ] 1,000-paper corpus: ~10GB estimated, 15GB maximum
- [ ] Storage monitoring: Automated checks report usage vs. limits
- [ ] Warnings: Alert at 80% capacity, error at 95%
- [ ] Archival guidance: Recommend offline storage or compression for corpora >5,000 papers

**Measurement Method**:
- Storage size tracking in provenance logs
- Automated capacity reports (weekly)
- User notification system for warnings

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 5.4 (Phase 4: OAIS)

---

## 4. Reliability Requirements

### NFR-RF-R-001: System Uptime (CLI Tool Context)

**ID**: NFR-RF-R-001
**Title**: Framework Availability and Error Recovery
**Category**: Reliability
**Priority**: Must Have

**Requirement Statement**:
The framework SHALL gracefully handle transient failures (network outages, API unavailability) with automatic retry logic (3 attempts, exponential backoff) and clear error messages. Critical operations SHALL be resumable without data loss.

**Rationale**:
- CLI tool context: Not SaaS, "uptime" means error resilience
- Vision risk: API rate limits, network issues common (Risk T-02)
- User expectation: Long-running operations (batch acquisition) must be resilient
- Data integrity: Partial failures should not corrupt artifacts

**Acceptance Criteria**:
- [ ] Transient network errors: Automatic retry 3 times with exponential backoff (1s, 2s, 4s)
- [ ] API rate limits: Graceful backoff, queue requests, resume when limits reset
- [ ] Interrupted operations: Resumable from checkpoint (batch acquisition, summarization)
- [ ] Error messages: Clear, actionable guidance (not stack traces)
- [ ] No data corruption: Partial writes rolled back or completed on resume

**Measurement Method**:
- Fault injection testing (simulate network failures, API errors)
- User testing with interrupted operations
- Error log analysis for clarity and actionability

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk T-02 (API Rate Limits)

---

### NFR-RF-R-002: Data Integrity Guarantees

**ID**: NFR-RF-R-002
**Title**: Artifact Integrity and Consistency
**Category**: Reliability
**Priority**: Must Have

**Requirement Statement**:
All research artifacts (PDFs, metadata, provenance logs) SHALL have integrity verification via checksums (SHA-256). Metadata updates SHALL be atomic or transactional to prevent partial writes.

**Rationale**:
- Vision goal: 99%+ citation accuracy requires data integrity
- FAIR principle: Integrity (part of Accessibility)
- OAIS requirement: Fixity information for archival
- Risk mitigation: Prevent corruption, enable verification (Risk Q-04)

**Acceptance Criteria**:
- [ ] SHA-256 checksums generated for all PDFs and metadata files
- [ ] Checksums stored in `.aiwg/research/provenance/checksums.json`
- [ ] Integrity checks on file read: Warn if checksum mismatch
- [ ] Atomic writes: Metadata updates complete fully or roll back (no partial states)
- [ ] Provenance logs: Immutable append-only, checksummed

**Measurement Method**:
- Automated integrity checks on all artifact reads
- Fault injection: Corrupt file, verify detection
- Checksum validation reports

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (Quality Metrics: 99%+ citation accuracy)
- @.aiwg/research/research-framework-findings.md - OAIS fixity information

---

### NFR-RF-R-003: Recovery Procedures

**ID**: NFR-RF-R-003
**Title**: Backup and Disaster Recovery
**Category**: Reliability
**Priority**: Should Have

**Requirement Statement**:
The system SHALL provide automated backup procedures for all research artifacts and document recovery steps for common failure scenarios (corrupted metadata, lost PDFs, incomplete operations).

**Rationale**:
- Research value: Months of work in corpus, loss unacceptable
- Git-based: Version control provides some recovery, but not complete
- User guidance: Solo developers need clear recovery instructions
- OAIS archival: Preservation planning includes backup strategy

**Acceptance Criteria**:
- [ ] Backup procedure documented: Git + `.aiwg/research/` directory snapshot
- [ ] Recovery documentation: Step-by-step for corrupted metadata, lost files
- [ ] Automated backup script provided (optional, user-triggered)
- [ ] Restore validation: Checksums verify backup integrity
- [ ] Disaster recovery SLA: <1 hour to restore from backup (user effort)

**Measurement Method**:
- User testing: Follow recovery procedures, measure time and success rate
- Automated backup validation tests
- Documentation review: Clarity and completeness

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 3.5 (Archival)

---

## 5. Security Requirements

### NFR-RF-SEC-001: API Key Protection

**ID**: NFR-RF-SEC-001
**Title**: Secure API Credential Management
**Category**: Security
**Priority**: Must Have

**Requirement Statement**:
API keys (Semantic Scholar, LLM services) SHALL be stored in environment variables or secure configuration files (mode 600), NEVER committed to version control. All API calls SHALL use HTTPS.

**Rationale**:
- Risk mitigation: API key exposure (Risk S-01)
- Security best practice: Prevent credential leaks in git history
- AIWG token security rules: Heredoc pattern, mode 600 files
- User trust: Framework must handle credentials securely

**Acceptance Criteria**:
- [ ] API keys loaded from environment variables or `~/.aiwg/config/api-keys.env` (mode 600)
- [ ] Default `.gitignore` excludes API key files
- [ ] Error message if API key file has insecure permissions (not mode 600)
- [ ] All API calls use HTTPS, reject HTTP
- [ ] Documentation: Clear guidance on API key setup and security

**Measurement Method**:
- Security audit: Grep codebase for hardcoded keys
- File permission validation tests
- User onboarding: Verify API key setup instructions followed

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk S-01 (API Key Exposure)
- @.claude/rules/token-security.md - Token security patterns

---

### NFR-RF-SEC-002: Data Privacy in Shared Corpus

**ID**: NFR-RF-SEC-002
**Title**: Sensitive Data Protection
**Category**: Security
**Priority**: Should Have

**Requirement Statement**:
The system SHALL provide warnings when committing to shared repositories (research-papers repo) and document guidelines for identifying sensitive data (proprietary research, confidential sources).

**Rationale**:
- Risk mitigation: Data privacy in shared corpus (Risk S-02)
- Shared corpus use case: research-papers repo across projects
- Legal liability: Prevent accidental exposure of confidential data
- User awareness: Many users unfamiliar with data privacy risks

**Acceptance Criteria**:
- [ ] Pre-commit hook warns: "Review for sensitive data before sharing"
- [ ] Documentation: Guidelines for identifying sensitive data (proprietary, embargoed)
- [ ] `.aiwg/research/config/privacy-checklist.md` template provided
- [ ] No automated privacy scanning (false positives, complexity), rely on user judgment
- [ ] Shared corpus best practice: Public papers only, separate private corpus

**Measurement Method**:
- User testing: Do users understand privacy warnings?
- Documentation review: Clarity of privacy guidelines
- Community feedback: Any privacy incidents reported?

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk S-02 (Data Privacy)

---

### NFR-RF-SEC-003: Input Validation

**ID**: NFR-RF-SEC-003
**Title**: User Input Sanitization
**Category**: Security
**Priority**: Must Have

**Requirement Statement**:
All user inputs (search queries, file paths, metadata) SHALL be validated and sanitized to prevent injection attacks (command injection, path traversal, XSS in markdown).

**Rationale**:
- Security best practice: Never trust user input
- Markdown rendering: XSS risk in literature notes if rendered in web UI
- File operations: Path traversal could access files outside `.aiwg/research/`
- Command execution: API calls, shell commands must sanitize inputs

**Acceptance Criteria**:
- [ ] Search queries: Sanitize special characters before API calls
- [ ] File paths: Validate within `.aiwg/research/` directory, reject `../` traversal
- [ ] Markdown content: Escape HTML/JavaScript in user-generated notes if web-rendered
- [ ] Metadata fields: Validate format (DOI, year, author names)
- [ ] No `eval()` or unsafe execution of user-provided code

**Measurement Method**:
- Security testing: Attempt injection attacks (command, path, XSS)
- Code review: Identify input validation gaps
- Automated static analysis (linting rules)

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 7.1 (Technical Risks)

---

### NFR-RF-SEC-004: Malicious PDF Protection

**ID**: NFR-RF-SEC-004
**Title**: PDF Security Scanning
**Category**: Security
**Priority**: Could Have

**Requirement Statement**:
The system SHOULD provide optional integration with PDF security scanning tools to detect malicious PDFs before processing, with clear user warnings about risks.

**Rationale**:
- Risk mitigation: Malicious PDFs (Risk S-03, very low likelihood but high impact)
- PDF parsers: Potential exploit vectors
- User awareness: Inform users of risks, provide opt-in mitigation
- Not mandatory: Low priority given rarity, avoid complexity

**Acceptance Criteria**:
- [ ] Documentation: Warn users of PDF risks from untrusted sources
- [ ] Optional integration: Command to scan PDFs with ClamAV or similar
- [ ] Default behavior: No scanning (user responsibility)
- [ ] Warning on acquisition: "Only download from trusted sources"
- [ ] Quarantine option: Isolate suspicious PDFs for manual review

**Measurement Method**:
- User awareness testing: Do users understand PDF risks?
- Integration testing: Verify optional scanning tools work if enabled
- Community feedback: Any malware incidents reported?

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk S-03 (Malicious PDFs)

---

## 6. Usability Requirements

### NFR-RF-U-001: Learning Curve

**ID**: NFR-RF-U-001
**Title**: Time to Proficiency for Basic Tasks
**Category**: Usability
**Priority**: Must Have

**Requirement Statement**:
New users SHALL achieve proficiency in basic research tasks (search, acquire, summarize) within 1 hour of onboarding, as measured by completion of quick-start tutorial and user self-assessment.

**Rationale**:
- Vision goal: <1 hour learning curve
- Risk mitigation: Steep learning curve (Risk A-01)
- User expectation: Developers want quick onboarding, not academic training
- Adoption critical: Users abandon if too complex

**Acceptance Criteria**:
- [ ] Quick-start tutorial: Completable in <30 minutes
- [ ] First search task: Successful discovery within 5 minutes of setup
- [ ] First acquisition: Download and metadata extraction within 10 minutes
- [ ] First summary: AI-generated summary within 15 minutes
- [ ] User self-assessment: >70% report "confident in basic tasks" after 1 hour

**Measurement Method**:
- User testing: Time to complete quick-start (n=10 users)
- Self-assessment survey: Confidence in basic tasks (1-5 scale)
- Task completion rate: % successfully completing each task

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.5 (User Satisfaction: <1 hour learning curve)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk A-01 (Steep Learning Curve)

---

### NFR-RF-U-002: Error Message Quality

**ID**: NFR-RF-U-002
**Title**: Clear, Actionable Error Guidance
**Category**: Usability
**Priority**: Must Have

**Requirement Statement**:
All error messages SHALL provide clear explanations of what went wrong and actionable steps to resolve, with links to documentation where appropriate. Technical stack traces SHALL NOT be shown to users by default.

**Rationale**:
- User frustration: Cryptic errors cause abandonment
- Solo developer support burden: Good errors reduce support requests
- Learning curve: Errors are teaching moments
- Risk mitigation: Reduce perceived complexity (Risk A-01)

**Acceptance Criteria**:
- [ ] Error format: "What happened" + "Why" + "How to fix" + "Learn more (link)"
- [ ] No stack traces in user-facing errors (log to file instead)
- [ ] Common errors documented: API rate limits, network failures, invalid metadata
- [ ] Error codes provided for reference (e.g., "ERR-API-001: Rate limit exceeded")
- [ ] User testing: >80% understand error message and know how to proceed

**Measurement Method**:
- Error message review: Evaluate against format template
- User testing: Present errors, ask "What would you do next?"
- Support ticket analysis: Are errors mentioned frequently? Unclear?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.5 (User Satisfaction: Documentation Quality 4.5/5)

---

### NFR-RF-U-003: Documentation Completeness

**ID**: NFR-RF-U-003
**Title**: Comprehensive User Guidance
**Category**: Usability
**Priority**: Must Have

**Requirement Statement**:
User documentation SHALL cover 100% of user-facing workflows (discovery, acquisition, documentation, integration, archival) with examples, templates, and troubleshooting guides. API documentation SHALL cover 100% of public interfaces.

**Rationale**:
- Vision goal: User satisfaction 4.5/5 on documentation quality
- Learning curve: Good docs critical for self-service
- Support burden: Comprehensive docs reduce support requests
- Risk mitigation: Poor docs compound steep learning curve (Risk A-01)

**Acceptance Criteria**:
- [ ] User guide: Covers all 5 lifecycle stages with step-by-step instructions
- [ ] Quick-start: <30 min tutorial for basic tasks
- [ ] Templates: Provided for search strategies, quality criteria, notes
- [ ] Examples: Real-world use cases (matric-memory professionalization)
- [ ] Troubleshooting: Common errors and solutions documented
- [ ] API docs: 100% of public functions, classes, CLI commands documented
- [ ] User rating: >80% rate documentation 4/5 or higher

**Measurement Method**:
- Documentation coverage audit: Checklist of required topics
- User survey: Documentation quality rating (1-5 scale)
- Task completion without docs: Can users self-serve?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.5 (Documentation Quality 4.5/5)

---

### NFR-RF-U-004: Progressive Disclosure

**ID**: NFR-RF-U-004
**Title**: Incremental Complexity Exposure
**Category**: Usability
**Priority**: Should Have

**Requirement Statement**:
The system SHALL support tiered workflow complexity levels (Quick, Standard, Rigorous), allowing users to start simple and progressively adopt advanced features (PRISMA, GRADE, Zettelkasten) as needed.

**Rationale**:
- Risk mitigation: Too academic for developers (Risk A-03)
- User diversity: Developers want quick start, researchers want rigor
- Adoption strategy: Value early, commitment later
- Flexibility: Users choose appropriate effort level

**Acceptance Criteria**:
- [ ] Quick mode: Discovery + acquisition only, minimal metadata
- [ ] Standard mode: + AI summaries, basic quality scoring, literature notes
- [ ] Rigorous mode: + PRISMA protocol, GRADE scoring, Zettelkasten synthesis
- [ ] Mode selection: CLI flag or config file setting
- [ ] Feature unlocking: Tutorials introduce advanced features after basics mastered
- [ ] User survey: >70% report "appropriate complexity for my needs"

**Measurement Method**:
- User testing: Track which modes users select
- Feature usage analytics: % using advanced features
- User survey: Perceived complexity appropriateness

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk A-03 (Too Academic for Developers)

---

## 7. Maintainability Requirements

### NFR-RF-M-001: Code Quality Standards

**ID**: NFR-RF-M-001
**Title**: Code Maintainability and Readability
**Category**: Maintainability
**Priority**: Must Have

**Requirement Statement**:
All code SHALL follow TypeScript/JavaScript best practices with ESLint rules enforced, maintain cyclomatic complexity <15 per function, and include inline comments for complex logic.

**Rationale**:
- Solo developer: Code maintainability critical (no team to ask)
- Long-term sustainability: Framework will evolve over years
- Community contributions: Clear code lowers contribution barrier
- Risk mitigation: Technical debt from rushed implementation (Risk R-01)

**Acceptance Criteria**:
- [ ] ESLint rules enforced in CI/CD pipeline (no warnings)
- [ ] Cyclomatic complexity <15 per function (SonarQube or similar)
- [ ] Functions <50 lines (guideline, exceptions allowed with justification)
- [ ] Inline comments for non-obvious logic (algorithm explanations)
- [ ] TypeScript: Strict mode enabled, no `any` types (exceptions documented)

**Measurement Method**:
- Automated linting in CI/CD (fail on warnings)
- Complexity analysis (SonarQube, CodeClimate)
- Code review checklist for complexity and comments

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.2 (Secondary Objectives: Minimize Maintenance)

---

### NFR-RF-M-002: Test Coverage Targets

**ID**: NFR-RF-M-002
**Title**: Automated Test Coverage
**Category**: Maintainability
**Priority**: Must Have

**Requirement Statement**:
The codebase SHALL maintain at least 90% test coverage (line coverage) with 100% coverage of critical paths (API integration, data integrity, provenance logging). All tests SHALL pass before merging to main branch.

**Rationale**:
- Vision goal: 90%+ code coverage, automated testing
- Solo developer: Tests prevent regressions when changing code
- Critical operations: Data integrity, provenance cannot fail
- Risk mitigation: Technical debt, insufficient testing (Risk R-01)

**Acceptance Criteria**:
- [ ] Overall line coverage: ≥90%
- [ ] Critical path coverage: 100% (API calls, checksums, provenance logs)
- [ ] Unit tests: ≥80% coverage per module
- [ ] Integration tests: Cover all agent workflows end-to-end
- [ ] CI/CD: Tests run on every commit, block merge if failing
- [ ] Coverage reports generated and tracked over time

**Measurement Method**:
- Coverage tool: Jest with Istanbul or c8
- Automated coverage reports in CI/CD
- Coverage trend tracking (dashboard or reports)

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.2 (Minimize Maintenance: 90%+ coverage)

---

### NFR-RF-M-003: Documentation Standards

**ID**: NFR-RF-M-003
**Title**: Code and API Documentation Requirements
**Category**: Maintainability
**Priority**: Must Have

**Requirement Statement**:
All public functions, classes, and CLI commands SHALL have JSDoc/TSDoc comments describing purpose, parameters, return values, and exceptions. Documentation SHALL be auto-generated from code comments.

**Rationale**:
- API discoverability: Users and contributors need reference docs
- Code maintainability: Self-documenting code reduces cognitive load
- Automation: Docs stay synchronized with code changes
- Community contributions: Clear APIs enable extensions

**Acceptance Criteria**:
- [ ] 100% of public APIs documented with JSDoc/TSDoc
- [ ] CLI command help text generated from code comments
- [ ] API reference auto-generated (TypeDoc or similar)
- [ ] Examples included in function docs where appropriate
- [ ] CI/CD: Fail if public API undocumented (linting rule)

**Measurement Method**:
- Automated doc linting (check for missing JSDoc)
- Doc generation in CI/CD (verify successful build)
- Manual review: Are docs clear and helpful?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.5 (Documentation Quality)

---

### NFR-RF-M-004: Change Management

**ID**: NFR-RF-M-004
**Title**: Version Control and Release Process
**Category**: Maintainability
**Priority**: Should Have

**Requirement Statement**:
All changes SHALL follow semantic versioning (MAJOR.MINOR.PATCH), with CHANGELOG.md maintained for every release. Breaking changes SHALL be documented with migration guides.

**Rationale**:
- User expectations: Predictable versioning, clear release notes
- Migration planning: Users need to know what breaks and how to fix
- Long-term maintenance: Track what changed and why
- AIWG standards: Consistent release documentation

**Acceptance Criteria**:
- [ ] Semantic versioning: MAJOR (breaking), MINOR (features), PATCH (fixes)
- [ ] CHANGELOG.md updated for every release (Keep a Changelog format)
- [ ] Breaking changes: Migration guide provided in docs
- [ ] Release notes: Posted to GitHub releases
- [ ] Deprecation policy: 1 minor version warning before removal

**Measurement Method**:
- Release checklist: Verify version, changelog, migration docs
- User feedback: Are release notes clear?
- Automated checks: Version bump matches change type

**Traceability**:
- @CLAUDE.md - Release Documentation Requirements
- @.claude/rules/versioning.md - CalVer format

---

## 8. Compatibility Requirements

### NFR-RF-C-001: AIWG Framework Integration

**ID**: NFR-RF-C-001
**Title**: Compatibility with AIWG Core Framework
**Category**: Compatibility
**Priority**: Must Have

**Requirement Statement**:
The Research Framework SHALL integrate seamlessly with AIWG core framework, following extension system patterns, artifact directory conventions (`.aiwg/research/`), and agent deployment mechanisms (`aiwg use research`).

**Rationale**:
- Strategic positioning: Research framework part of AIWG ecosystem
- User experience: Consistent patterns across frameworks (SDLC, marketing, research)
- Agent deployment: Standard `aiwg use` command
- Artifact management: Unified `.aiwg/` directory structure

**Acceptance Criteria**:
- [ ] Deployment: `aiwg use research` installs agents and templates
- [ ] Artifact directory: `.aiwg/research/` follows AIWG conventions
- [ ] Agent definitions: Compatible with AIWG agent registry
- [ ] Command integration: Research commands available via `aiwg research <command>`
- [ ] Documentation: Links to AIWG core docs, consistent terminology

**Measurement Method**:
- Integration testing: Deploy framework via AIWG CLI
- User testing: Verify no conflicts with SDLC or marketing frameworks
- Documentation review: Consistency with AIWG patterns

**Traceability**:
- @agentic/code/frameworks/sdlc-complete/README.md - AIWG framework patterns
- @docs/extensions/overview.md - Extension system architecture

---

### NFR-RF-C-002: External Tool Compatibility

**ID**: NFR-RF-C-002
**Title**: Integration with Zotero, Obsidian, Reference Managers
**Category**: Compatibility
**Priority**: Should Have

**Requirement Statement**:
The system SHALL support bidirectional data exchange with Zotero (BibTeX/RIS import/export), Obsidian (Markdown with bidirectional links), and standard reference manager formats (BibTeX, RIS, CSL-JSON).

**Rationale**:
- User workflow preservation: Don't force migration from existing tools
- Risk mitigation: Workflow disruption (Risk A-02)
- Interoperability: Users choose their preferred PKM/reference manager
- Standards compliance: BibTeX, RIS, CSL-JSON widely supported

**Acceptance Criteria**:
- [ ] Zotero export: BibTeX and RIS formats with ≥95% metadata accuracy
- [ ] Zotero import: Read BibTeX/RIS, populate `.aiwg/research/sources/`
- [ ] Obsidian export: Markdown notes with `[[wikilinks]]` preserved
- [ ] Obsidian import: Read Markdown notes, convert to framework format
- [ ] CSL-JSON support: Citation formatting via Citation Style Language
- [ ] No data loss: Round-trip export/import preserves metadata

**Measurement Method**:
- Interoperability testing: Export to Zotero, import back, verify no data loss
- Format validation: BibTeX, RIS, CSL-JSON parsers accept output
- User testing: Do users successfully integrate with existing tools?

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 4.3 (Integration Points)

---

### NFR-RF-C-003: Standards Compliance (FAIR, PROV, OAIS)

**ID**: NFR-RF-C-003
**Title**: Adherence to Research Data Standards
**Category**: Compatibility
**Priority**: Must Have

**Requirement Statement**:
Metadata SHALL comply with FAIR principles (Findable, Accessible, Interoperable, Reusable) as measured by automated F-UJI-style assessment. Provenance logs SHALL follow W3C PROV data model. Archival packages SHALL align with OAIS reference model concepts (SIP/AIP/DIP).

**Rationale**:
- Vision goal: 100% FAIR compliance
- Academic credibility: Standards compliance required for publication
- Reproducibility: PROV enables audit trails, OAIS enables preservation
- Interoperability: Standard formats ensure long-term usability

**Acceptance Criteria**:
- [ ] FAIR compliance: ≥90% on automated F-UJI assessment
- [ ] W3C PROV: Provenance logs include Entity, Activity, Agent relationships
- [ ] OAIS alignment: Archival packages include preservation metadata (PDI)
- [ ] Standards documentation: Map framework features to FAIR/PROV/OAIS requirements
- [ ] Validation tools: Automated checks for FAIR, PROV compliance

**Measurement Method**:
- F-UJI assessment on sample corpus
- PROV validation: Logs parseable by PROV tools (PROV-O validator)
- OAIS audit: Expert review of archival package structure
- Standards compliance report included in documentation

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (Quality Metrics: 100% FAIR)
- @.aiwg/research/research-framework-findings.md - FAIR, PROV, OAIS standards

---

### NFR-RF-C-004: Multi-Platform Support

**ID**: NFR-RF-C-004
**Title**: Cross-Platform Compatibility
**Category**: Compatibility
**Priority**: Must Have

**Requirement Statement**:
The framework SHALL run on Linux, macOS, and Windows with Node.js ≥18.20.8, with no platform-specific dependencies for core functionality.

**Rationale**:
- User diversity: Developers use all major platforms
- AIWG core: Supports multi-platform deployment
- Accessibility: Don't exclude users based on OS
- Node.js baseline: Consistent runtime across platforms

**Acceptance Criteria**:
- [ ] Core functionality works on Linux, macOS, Windows
- [ ] No hardcoded platform-specific paths (use `path.join()`)
- [ ] File operations handle platform differences (line endings, permissions)
- [ ] Automated tests run on all 3 platforms (GitHub Actions matrix)
- [ ] Documentation: Platform-specific notes where needed (e.g., Windows path escaping)

**Measurement Method**:
- CI/CD: Automated tests on Linux, macOS, Windows
- User testing: At least 1 user per platform
- Issue tracking: Platform-specific bugs rare (<5%)

**Traceability**:
- @CLAUDE.md - Platform: linux (but support all major platforms)

---

## 9. Compliance Requirements

### NFR-RF-CMP-001: FAIR Principle F1 (Findable - Persistent Identifier)

**ID**: NFR-RF-CMP-001
**Title**: F1 - Globally Unique and Persistent Identifiers
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
Every research source SHALL be assigned a globally unique, persistent identifier (DOI preferred, fallback to REF-XXX framework-internal ID) that remains stable across all artifacts and references.

**Rationale**:
- FAIR F1: Data assigned globally unique and persistent identifier
- Citation accuracy: Stable IDs prevent broken references
- Cross-project reuse: research-papers repo shared across projects
- Interoperability: DOIs standard in academic publishing

**Acceptance Criteria**:
- [ ] Primary ID: DOI if available (from API or PDF metadata)
- [ ] Fallback ID: REF-XXX format (e.g., REF-042-oauth2-security-patterns)
- [ ] ID uniqueness: No duplicates within corpus (validation check)
- [ ] ID stability: Never changes once assigned (immutable)
- [ ] ID references: All citations, notes, graphs use consistent ID

**Measurement Method**:
- F-UJI assessment: Check F1 compliance (100% target)
- Automated validation: Detect duplicate IDs
- User testing: Citations remain valid after ID assignment

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)
- @.aiwg/research/research-framework-findings.md - FAIR principles

---

### NFR-RF-CMP-002: FAIR Principle F2 (Findable - Rich Metadata)

**ID**: NFR-RF-CMP-002
**Title**: F2 - Data Described with Rich Metadata
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
Every source SHALL have comprehensive metadata including title, authors, publication year, venue, DOI, abstract, keywords, and citation data, stored in machine-readable format (JSON).

**Rationale**:
- FAIR F2: Data described with rich metadata
- Discovery: Metadata enables search, filter, quality assessment
- Interoperability: Standard metadata fields across research tools
- Quality: Rich metadata supports GRADE scoring

**Acceptance Criteria**:
- [ ] Required fields: Title, authors, year, DOI (or URL), abstract
- [ ] Recommended fields: Venue, keywords, citation count, license
- [ ] Format: JSON schema defined in `.aiwg/research/config/metadata-schema.json`
- [ ] Completeness: >95% of sources have all required fields
- [ ] Validation: Automated check for missing metadata

**Measurement Method**:
- F-UJI assessment: Check F2 compliance (>90% target)
- Metadata completeness report: % with required fields
- Schema validation: All metadata files conform to schema

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-003: FAIR Principle F3 (Findable - Metadata Includes ID)

**ID**: NFR-RF-CMP-003
**Title**: F3 - Metadata Clearly References Data Identifier
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
All metadata files SHALL explicitly include the persistent identifier (DOI or REF-XXX) of the source they describe, enabling bidirectional linking between data and metadata.

**Rationale**:
- FAIR F3: Metadata clearly references data identifier
- Linking: Connect metadata to PDFs, notes, citations
- Provenance: Track metadata lineage
- Validation: Detect orphaned metadata or PDFs

**Acceptance Criteria**:
- [ ] Metadata field: `"id": "DOI:10.1234/example"` or `"id": "REF-042"`
- [ ] File naming: `REF-XXX-metadata.json` matches ID in content
- [ ] Bidirectional: PDF checksums link to metadata, metadata links to PDF
- [ ] Validation: Automated check for metadata-PDF consistency
- [ ] Orphan detection: Report metadata without PDFs, PDFs without metadata

**Measurement Method**:
- F-UJI assessment: Check F3 compliance (100% target)
- Automated validation: Verify all metadata references valid PDFs
- Orphan report: List metadata/PDFs without pairs

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-004: FAIR Principle F4 (Findable - Searchable Resource)

**ID**: NFR-RF-CMP-004
**Title**: F4 - Metadata Registered in Searchable Resource
**Category**: Compliance - FAIR
**Priority**: Should Have

**Requirement Statement**:
Metadata SHALL be indexed in a searchable resource (local file-based index, optional external registry like DataCite) to enable discovery without direct file access.

**Rationale**:
- FAIR F4: Metadata registered/indexed in searchable resource
- Discovery: Users can search corpus without opening every file
- Scalability: File-based search sufficient for 1,000s of papers
- External registry: Optional for broader discoverability

**Acceptance Criteria**:
- [ ] Local index: `.aiwg/research/sources/index.json` with searchable fields (title, authors, keywords)
- [ ] Search functionality: CLI command `aiwg research search <query>` searches local index
- [ ] Index updates: Automatically updated when metadata added/modified
- [ ] Optional: Export metadata to DataCite or Zenodo for public discoverability
- [ ] Performance: Search <3s for 1,000-paper corpus

**Measurement Method**:
- F-UJI assessment: Check F4 compliance (>80% target, local index counts)
- Search performance testing: Query latency benchmarks
- User testing: Can users find papers via search?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-005: FAIR Principle A1 (Accessible - Open Protocol)

**ID**: NFR-RF-CMP-005
**Title**: A1 - Retrievable via Standardized Protocol
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
All research artifacts SHALL be accessible via standardized, open protocols (file system access, HTTPS for remote sources, Git for versioning) without proprietary tools.

**Rationale**:
- FAIR A1: Retrievable by identifier using open protocol
- Accessibility: No vendor lock-in, users own their data
- Longevity: Standard protocols persist, proprietary tools don't
- Interoperability: Any tool can access artifacts

**Acceptance Criteria**:
- [ ] Local access: Standard file system, no database required
- [ ] Remote access: PDFs accessible via HTTPS (DOI → URL resolution)
- [ ] Version control: Git provides versioned access
- [ ] No proprietary formats: Markdown, JSON, PDF (not binary databases)
- [ ] Documentation: Explain how to access artifacts without framework tools

**Measurement Method**:
- F-UJI assessment: Check A1 compliance (100% target)
- Manual test: Access artifacts without AIWG CLI (file manager, text editor)
- User testing: Can external researchers access artifacts?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-006: FAIR Principle A2 (Accessible - Persistent Metadata)

**ID**: NFR-RF-CMP-006
**Title**: A2 - Metadata Persists Even if Data Unavailable
**Category**: Compliance - FAIR
**Priority**: Should Have

**Requirement Statement**:
Metadata SHALL remain accessible even if the original PDF is deleted or unavailable, enabling users to identify missing sources and plan re-acquisition.

**Rationale**:
- FAIR A2: Metadata accessible even when data no longer available
- Data loss resilience: Track what was deleted/lost
- Archival: Metadata provides record of corpus history
- Recovery: Metadata enables re-acquisition from DOI

**Acceptance Criteria**:
- [ ] Metadata persistence: Deleting PDF does not delete metadata (tombstone record)
- [ ] Status field: `"status": "available"` | `"deleted"` | `"unavailable"`
- [ ] Tombstone: Deleted PDFs marked, metadata retained with deletion date
- [ ] Re-acquisition: Metadata provides DOI for re-download
- [ ] Provenance: Deletion events logged in provenance

**Measurement Method**:
- F-UJI assessment: Check A2 compliance (>80% target)
- Deletion test: Delete PDF, verify metadata persists
- User testing: Can users identify and recover missing sources?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-007: FAIR Principle I1 (Interoperable - Formal Language)

**ID**: NFR-RF-CMP-007
**Title**: I1 - Knowledge Representation in Formal Language
**Category**: Compliance - FAIR
**Priority**: Should Have

**Requirement Statement**:
Metadata and provenance SHALL use formal, standardized languages (JSON, BibTeX, RDF/Turtle for graphs) with defined schemas to enable machine processing and interoperability.

**Rationale**:
- FAIR I1: Formal, accessible, shared, broadly applicable language
- Interoperability: Standard formats work across tools
- Machine-readable: Automated processing, validation
- Longevity: Formal schemas enable future migration

**Acceptance Criteria**:
- [ ] Metadata: JSON with published schema (`.aiwg/research/config/metadata-schema.json`)
- [ ] Provenance: W3C PROV-O (RDF/Turtle or JSON-LD)
- [ ] Citations: BibTeX, CSL-JSON (standard formats)
- [ ] Knowledge graph: RDF/Turtle export option (Neo4j internal format acceptable)
- [ ] Schema versioning: Track schema changes, provide migration tools

**Measurement Method**:
- F-UJI assessment: Check I1 compliance (>80% target)
- Schema validation: All artifacts validate against published schemas
- Interoperability testing: Parse artifacts with external tools (jq, RDF parsers)

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-008: FAIR Principle I2 (Interoperable - FAIR Vocabularies)

**ID**: NFR-RF-CMP-008
**Title**: I2 - Use of FAIR-Compliant Vocabularies
**Category**: Compliance - FAIR
**Priority**: Could Have

**Requirement Statement**:
Metadata SHOULD use controlled vocabularies and ontologies where available (e.g., MESH for medical terms, ACM CCS for computing topics) to enable semantic interoperability.

**Rationale**:
- FAIR I2: Use vocabularies that follow FAIR principles
- Semantic interoperability: Shared terminology enables integration
- Discovery: Standard terms improve search across corpora
- Domain specificity: Controlled vocabularies capture nuance

**Acceptance Criteria**:
- [ ] Keyword mapping: Option to map free-text keywords to controlled vocabularies
- [ ] Domain support: MESH (medical), ACM CCS (computing), others as needed
- [ ] Documentation: List supported vocabularies, how to use
- [ ] Optional feature: Not required for basic operation
- [ ] User feedback: Do users find controlled vocabularies valuable?

**Measurement Method**:
- F-UJI assessment: Check I2 compliance (optional, bonus points)
- User testing: Adoption rate of controlled vocabularies
- Semantic search: Controlled vocab improves search relevance?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-009: FAIR Principle I3 (Interoperable - Qualified References)

**ID**: NFR-RF-CMP-009
**Title**: I3 - Qualified References to Other Data
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
All references to external sources (citations, related papers, datasets) SHALL include qualified references with relationship semantics (e.g., "cites", "is-cited-by", "supports", "contradicts").

**Rationale**:
- FAIR I3: Include qualified references to other metadata
- Citation context: Not just "who cites whom" but "why"
- Knowledge synthesis: Relationship semantics enable deeper analysis
- Provenance: Track how sources relate to each other

**Acceptance Criteria**:
- [ ] Citation metadata: Include relationship type (`"cites"`, `"cited-by"`)
- [ ] Context metadata: Scite-style classification (`"supports"`, `"contradicts"`, `"mentions"`)
- [ ] Provenance links: Qualify relationships (`"derived-from"`, `"influenced-by"`)
- [ ] Schema: Defined relationship vocabulary in metadata schema
- [ ] Validation: Automated check for relationship types

**Measurement Method**:
- F-UJI assessment: Check I3 compliance (>90% target)
- Citation network analysis: % of citations with relationship metadata
- User testing: Do qualified references improve understanding?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-010: FAIR Principle R1 (Reusable - Clear Usage License)

**ID**: NFR-RF-CMP-010
**Title**: R1 - Clear Data Usage License
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
Metadata SHALL include license information for each source (e.g., CC-BY, CC-BY-NC, copyright) to clarify reuse permissions and legal constraints.

**Rationale**:
- FAIR R1: Described with clear usage license
- Legal compliance: Users need to know what's allowed
- Reuse planning: License determines how sources can be used
- Open science: Prefer open licenses, document restrictions

**Acceptance Criteria**:
- [ ] License field: `"license": "CC-BY-4.0"` or `"license": "Copyright (all rights reserved)"`
- [ ] License extraction: Attempt to extract from PDF or API metadata
- [ ] Default: `"license": "Unknown - verify before reuse"` if not found
- [ ] License dashboard: Report showing license distribution across corpus
- [ ] Documentation: Explain license implications for reuse

**Measurement Method**:
- F-UJI assessment: Check R1 compliance (>80% target)
- License coverage: % of sources with license metadata
- User survey: Do users understand license restrictions?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (FAIR Compliance 100%)

---

### NFR-RF-CMP-011: FAIR Principle R1.1 (Reusable - Detailed Provenance)

**ID**: NFR-RF-CMP-011
**Title**: R1.1 - Detailed Provenance Information
**Category**: Compliance - FAIR
**Priority**: Must Have

**Requirement Statement**:
All research artifacts SHALL have detailed provenance tracking when, how, and by whom they were created, modified, or transformed, following W3C PROV data model.

**Rationale**:
- FAIR R1.1: Released with detailed provenance
- Reproducibility: Full audit trail enables verification
- Trust: Users can validate how artifacts were generated
- Standards compliance: W3C PROV enables tool interoperability

**Acceptance Criteria**:
- [ ] Provenance logs: W3C PROV-compatible (Entity, Activity, Agent)
- [ ] Operation tracking: All API calls, transformations, manual edits logged
- [ ] Timestamps: ISO 8601 format for all operations
- [ ] Agent attribution: User, LLM, or automated process identified
- [ ] Lineage graphs: Visual representation of artifact derivation

**Measurement Method**:
- F-UJI assessment: Check R1.1 compliance (>90% target)
- PROV validation: Logs parseable by PROV tools
- User testing: Can external researchers trace artifact origins?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (Provenance Completeness 100%)
- @.aiwg/research/research-framework-findings.md - W3C PROV standard

---

### NFR-RF-CMP-012: FAIR Principle R1.2 (Reusable - Domain Standards)

**ID**: NFR-RF-CMP-012
**Title**: R1.2 - Community Standards for Data Format
**Category**: Compliance - FAIR
**Priority**: Should Have

**Requirement Statement**:
Artifacts SHOULD follow domain-relevant community standards (PRISMA for systematic reviews, GRADE for quality assessment, Zettelkasten for note-taking) where applicable.

**Rationale**:
- FAIR R1.2: Meet domain-relevant community standards
- Credibility: Academic community expects standard methodologies
- Interoperability: Standard formats enable tool integration
- Reuse: Familiar standards lower adoption barrier

**Acceptance Criteria**:
- [ ] PRISMA compliance: Search strategies follow 27-item checklist
- [ ] GRADE scoring: Quality assessments use GRADE dimensions
- [ ] Zettelkasten: Literature/permanent notes follow atomic note principles
- [ ] Documentation: Map framework features to community standards
- [ ] Validation: Optional checklist-based standard compliance reports

**Measurement Method**:
- F-UJI assessment: Check R1.2 compliance (>80% target)
- Expert review: Do artifacts follow claimed standards?
- User survey: Do researchers recognize standard methodologies?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 3.1 (Discovery: PRISMA-Style)
- @.aiwg/research/research-framework-findings.md - PRISMA, GRADE, Zettelkasten

---

### NFR-RF-CMP-013: FAIR Principle R1.3 (Reusable - Domain Expertise)

**ID**: NFR-RF-CMP-013
**Title**: R1.3 - Meets Domain-Relevant Expertise Requirements
**Category**: Compliance - FAIR
**Priority**: Should Have

**Requirement Statement**:
The system SHOULD provide guidance and templates that enable users without formal research training to produce artifacts meeting academic standards, while supporting expert users with full methodological rigor.

**Rationale**:
- FAIR R1.3: Meets domain-relevant community standards for expertise
- Accessibility: Developers benefit from research without PhD training
- Quality: Experts can apply full rigor (PRISMA, GRADE, OAIS)
- Tiered complexity: Quick mode for developers, rigorous mode for academics

**Acceptance Criteria**:
- [ ] Quick mode: Simplified workflows for developers (discovery + summaries)
- [ ] Rigorous mode: Full PRISMA/GRADE workflows for experts
- [ ] Templates: Pre-filled examples for common use cases (software research, medical reviews)
- [ ] Glossary: Plain-language explanations of academic jargon
- [ ] Expert validation: Academic researchers confirm framework meets standards

**Measurement Method**:
- F-UJI assessment: Check R1.3 compliance (subjective, >70% target)
- User segmentation: Developers vs. researchers success rates
- Expert review: Academic validation of rigorous mode outputs

**Traceability**:
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Risk A-03 (Too Academic for Developers)

---

### NFR-RF-CMP-014: W3C PROV Conformance

**ID**: NFR-RF-CMP-014
**Title**: W3C PROV Data Model Compatibility
**Category**: Compliance - PROV
**Priority**: Should Have

**Requirement Statement**:
Provenance logs SHALL be compatible with W3C PROV data model, including Entity-Activity-Agent relationships, with optional export to PROV-O (RDF/Turtle) format for interoperability with PROV tools.

**Rationale**:
- Vision goal: 100% W3C PROV-compliant provenance tracking
- Reproducibility: Standard provenance enables verification
- Tool interoperability: PROV tools can analyze logs
- Academic credibility: PROV widely recognized in research community

**Acceptance Criteria**:
- [ ] PROV elements: Entity (artifacts), Activity (operations), Agent (user/LLM)
- [ ] Relationships: `wasGeneratedBy`, `wasDerivedFrom`, `wasAttributedTo`, `used`
- [ ] Timestamps: All activities timestamped (ISO 8601)
- [ ] Export: Optional PROV-O (RDF/Turtle or JSON-LD) export
- [ ] Validation: PROV-O validator accepts exported logs

**Measurement Method**:
- PROV-O validation: Use W3C PROV validator on exported logs
- Interoperability testing: Import logs into PROV visualization tools (PROV-N, ProvStore)
- User testing: Can external researchers understand provenance?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 9.2 (Provenance Completeness 100%)
- @.aiwg/research/research-framework-findings.md - W3C PROV standard

---

### NFR-RF-CMP-015: OAIS Alignment

**ID**: NFR-RF-CMP-015
**Title**: OAIS Reference Model Concepts
**Category**: Compliance - OAIS
**Priority**: Could Have

**Requirement Statement**:
Archival packages SHOULD align with OAIS reference model concepts, including Submission Information Packages (SIP), Archival Information Packages (AIP), and Dissemination Information Packages (DIP), with preservation metadata.

**Rationale**:
- Vision: OAIS-compliant archival for long-term preservation
- Longevity: OAIS ensures artifacts accessible in 10+ years
- Standards compliance: OAIS ISO 14721:2025 (updated Dec 2024)
- Optional feature: Advanced users, not required for basic operation

**Acceptance Criteria**:
- [ ] SIP: User submissions include content + basic metadata
- [ ] AIP: Archival packages add preservation metadata (checksums, format info)
- [ ] DIP: Dissemination exports tailored for specific uses (BibTeX, Obsidian)
- [ ] PDI (Preservation Description Information): Format, fixity, provenance metadata
- [ ] Documentation: Map framework artifacts to OAIS concepts

**Measurement Method**:
- OAIS audit: Expert review of archival package structure
- User testing: Do archival packages enable long-term preservation?
- Format migration: Test recovery of archived artifacts after format changes

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 7.2 (Should Have: OAIS Compliance)
- @.aiwg/research/research-framework-findings.md - OAIS ISO 14721:2025

---

## 10. Cross-Cutting Requirements

### NFR-RF-X-001: Offline Operation Support

**ID**: NFR-RF-X-001
**Title**: Offline-First Architecture
**Category**: Cross-Cutting
**Priority**: Should Have

**Requirement Statement**:
Core functionality (metadata management, note-taking, local search) SHALL work offline without internet connectivity. Online-only features (API discovery, LLM summarization) SHALL degrade gracefully with clear offline indicators.

**Rationale**:
- User scenarios: Work on planes, rural areas, secure networks
- Resilience: Framework useful even when APIs unavailable
- AIWG principle: Local-first architecture
- Data ownership: Users control artifacts without cloud dependency

**Acceptance Criteria**:
- [ ] Offline-capable: Metadata management, local search, note-taking, bibliography generation
- [ ] Online-required: API discovery, LLM summarization, gap analysis (external APIs)
- [ ] Graceful degradation: Clear messages for offline-unavailable features
- [ ] Sync: Changes made offline integrable when online
- [ ] Documentation: Clarify which features require internet

**Measurement Method**:
- Offline testing: Disconnect network, verify core functionality
- User testing: Work offline, reconnect, verify no data loss
- Error message review: Are offline limitations clear?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 11.4 (Resource Dependencies: Local-first)

---

### NFR-RF-X-002: Internationalization Readiness

**ID**: NFR-RF-X-002
**Title**: Multi-Language Support Foundation
**Category**: Cross-Cutting
**Priority**: Won't Have (v1.0)

**Requirement Statement**:
The system SHALL be architected to support future internationalization (i18n) with externalized strings, but v1.0 will support English only.

**Rationale**:
- Vision scope: English-language research (assumption)
- Future expansion: i18n enables global adoption
- Architecture: Easier to add i18n from start than retrofit
- Priority: Deferred to v1.1+ to focus on core functionality

**Acceptance Criteria**:
- [ ] Code structure: User-facing strings in separate files (not hardcoded)
- [ ] i18n library: Use standard library (e.g., i18next) for future expansion
- [ ] v1.0: English only, no translations
- [ ] Documentation: Note i18n architecture, invite community translations
- [ ] Future work: Add translations in v1.1+

**Measurement Method**:
- Code review: Verify strings externalized
- Architecture review: i18n-ready structure in place
- Community interest: Requests for translations?

**Traceability**:
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 11.1 (Assumptions: English-language research)

---

### NFR-RF-X-003: Accessibility (WCAG 2.1 for Web Components)

**ID**: NFR-RF-X-003
**Title**: Accessibility Standards for Web-Rendered Content
**Category**: Cross-Cutting
**Priority**: Could Have

**Requirement Statement**:
If research artifacts are rendered in web UI (optional future feature), content SHALL meet WCAG 2.1 Level AA standards for accessibility.

**Rationale**:
- Inclusion: Accessible to users with disabilities
- Future-proofing: Web dashboards likely in v1.1+
- Standards: WCAG widely recognized
- Priority: Deferred to when web UI implemented

**Acceptance Criteria**:
- [ ] WCAG 2.1 Level AA compliance for web-rendered content
- [ ] Keyboard navigation: All features accessible without mouse
- [ ] Screen reader support: Semantic HTML, ARIA labels
- [ ] Color contrast: Text meets 4.5:1 ratio minimum
- [ ] Automated testing: aXe or similar accessibility checker

**Measurement Method**:
- Automated testing: aXe, Lighthouse accessibility audits
- Manual testing: Screen reader (NVDA, JAWS) validation
- User testing: Accessibility community feedback

**Traceability**:
- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 8.4 (Phase 4: Future Enhancements)

---

## 11. NFR Traceability Matrix

| NFR ID | Category | Priority | Vision Metric | Risk Mitigation | Use Case |
|--------|----------|----------|---------------|-----------------|----------|
| NFR-RF-P-001 | Performance | M | <5 min to find papers | T-02 (API limits) | UC-001 Discovery |
| NFR-RF-P-002 | Performance | M | 60% time savings | A-04 (Manual effort) | UC-001, UC-002 |
| NFR-RF-P-003 | Performance | S | - | R-01 (Capacity) | UC-001-UC-005 |
| NFR-RF-P-004 | Performance | C | - | T-04 (Scalability) | UC-004 Integration |
| NFR-RF-P-005 | Performance | M | <5 min/paper | A-04 (Manual effort) | UC-003 Documentation |
| NFR-RF-S-001 | Scalability | M | 1,000+ papers | T-04 (Scalability) | All use cases |
| NFR-RF-S-002 | Scalability | S | - | T-04 (Scalability) | UC-004 Integration |
| NFR-RF-S-003 | Scalability | C | - | - | UC-005 Archival |
| NFR-RF-R-001 | Reliability | M | - | T-02 (API limits) | UC-001, UC-002 |
| NFR-RF-R-002 | Reliability | M | 99%+ citation accuracy | Q-04 (Reproducibility) | All use cases |
| NFR-RF-R-003 | Reliability | S | - | - | UC-005 Archival |
| NFR-RF-SEC-001 | Security | M | - | S-01 (API key exposure) | All use cases |
| NFR-RF-SEC-002 | Security | S | - | S-02 (Data privacy) | UC-002, UC-005 |
| NFR-RF-SEC-003 | Security | M | - | - | All use cases |
| NFR-RF-SEC-004 | Security | C | - | S-03 (Malicious PDFs) | UC-002 Acquisition |
| NFR-RF-U-001 | Usability | M | <1 hour learning | A-01 (Learning curve) | All use cases |
| NFR-RF-U-002 | Usability | M | - | A-01 (Learning curve) | All use cases |
| NFR-RF-U-003 | Usability | M | Docs quality 4.5/5 | A-01 (Learning curve) | All use cases |
| NFR-RF-U-004 | Usability | S | - | A-03 (Too academic) | All use cases |
| NFR-RF-M-001 | Maintainability | M | Minimize maintenance | R-01 (Capacity) | All use cases |
| NFR-RF-M-002 | Maintainability | M | 90%+ test coverage | R-01 (Capacity) | All use cases |
| NFR-RF-M-003 | Maintainability | M | - | - | All use cases |
| NFR-RF-M-004 | Maintainability | S | - | - | All use cases |
| NFR-RF-C-001 | Compatibility | M | - | - | All use cases |
| NFR-RF-C-002 | Compatibility | S | - | A-02 (Workflow disruption) | UC-002, UC-004 |
| NFR-RF-C-003 | Compatibility | M | 100% FAIR compliance | C-02 (FAIR failures) | All use cases |
| NFR-RF-C-004 | Compatibility | M | - | - | All use cases |
| NFR-RF-CMP-001 | Compliance | M | FAIR F1 | - | UC-002 Acquisition |
| NFR-RF-CMP-002 | Compliance | M | FAIR F2 | - | UC-002 Acquisition |
| NFR-RF-CMP-003 | Compliance | M | FAIR F3 | - | UC-002 Acquisition |
| NFR-RF-CMP-004 | Compliance | S | FAIR F4 | - | UC-001 Discovery |
| NFR-RF-CMP-005 | Compliance | M | FAIR A1 | - | All use cases |
| NFR-RF-CMP-006 | Compliance | S | FAIR A2 | - | UC-005 Archival |
| NFR-RF-CMP-007 | Compliance | S | FAIR I1 | - | All use cases |
| NFR-RF-CMP-008 | Compliance | C | FAIR I2 | - | UC-001 Discovery |
| NFR-RF-CMP-009 | Compliance | M | FAIR I3 | - | UC-004 Integration |
| NFR-RF-CMP-010 | Compliance | M | FAIR R1 | - | UC-002 Acquisition |
| NFR-RF-CMP-011 | Compliance | M | FAIR R1.1, PROV 100% | Q-04 (Reproducibility) | All use cases |
| NFR-RF-CMP-012 | Compliance | S | FAIR R1.2 | - | UC-001, UC-003 |
| NFR-RF-CMP-013 | Compliance | S | FAIR R1.3 | A-03 (Too academic) | All use cases |
| NFR-RF-CMP-014 | Compliance | S | PROV compliance | Q-04 (Reproducibility) | All use cases |
| NFR-RF-CMP-015 | Compliance | C | OAIS alignment | - | UC-005 Archival |
| NFR-RF-X-001 | Cross-Cutting | S | - | T-02 (API limits) | All use cases |
| NFR-RF-X-002 | Cross-Cutting | W (v1.0) | - | - | Future |
| NFR-RF-X-003 | Cross-Cutting | C | - | - | Future web UI |

**Legend**:
- **Priority**: M = Must Have, S = Should Have, C = Could Have, W = Won't Have (v1.0)
- **Vision Metric**: Key success metric from vision document
- **Risk Mitigation**: Risk ID from initial risk assessment
- **Use Case**: UC-001 (Discovery), UC-002 (Acquisition), UC-003 (Documentation), UC-004 (Integration), UC-005 (Archival)

---

## 12. Validation Approach

### 12.1 NFR Validation Methods

| NFR Category | Validation Method | Frequency | Responsible |
|--------------|------------------|-----------|-------------|
| **Performance** | Automated benchmarks, load testing | Every release | Developer |
| **Scalability** | Synthetic corpus testing (100, 500, 1K papers) | Monthly, pre-release | Developer |
| **Reliability** | Fault injection, integrity checks | Every release | Developer |
| **Security** | Security audit, penetration testing | Quarterly, pre-release | Developer + Community |
| **Usability** | User testing (n=10), surveys | End of elaboration, transition | Developer + Users |
| **Maintainability** | Automated code quality metrics (SonarQube) | Every commit | CI/CD |
| **Compatibility** | Integration testing with external tools | Every release | Developer |
| **Compliance** | F-UJI assessment, PROV validation | End of construction, pre-release | Developer + Expert Review |

### 12.2 Acceptance Criteria Tracking

**Artifact**: `.aiwg/flows/research-framework/elaboration/nfr/nfr-acceptance-tracking.md`

Track acceptance criteria completion for each NFR:
- [ ] Criteria defined
- [ ] Measurement method implemented
- [ ] Automated tests written (if applicable)
- [ ] Manual testing completed (if applicable)
- [ ] Results documented
- [ ] Criteria met (pass/fail)

### 12.3 NFR Review Gates

**Elaboration Phase Gate**:
- Review: Performance, Usability NFRs (critical for adoption)
- Decision: Proceed to construction if user testing shows <1 hour learning curve

**Construction Phase Gate**:
- Review: Reliability, Security, Maintainability NFRs
- Decision: Proceed to transition if test coverage ≥90%, security audit clean

**Transition Phase Gate**:
- Review: Compliance NFRs (FAIR, PROV, OAIS)
- Decision: Release v1.0 if FAIR compliance ≥90%, PROV validation passes

---

## 13. NFR Priority Justification

### 13.1 Must Have NFRs (Critical for v1.0)

**Why These Are Non-Negotiable**:
1. **Performance (P-001, P-002, P-005)**: Vision promise of 60% time savings depends on fast operations
2. **Reliability (R-001, R-002)**: Data integrity and error resilience foundational for trust
3. **Security (SEC-001, SEC-003)**: API key exposure or injection attacks would be catastrophic
4. **Usability (U-001, U-002, U-003)**: Learning curve and documentation quality determine adoption success
5. **Maintainability (M-001, M-002, M-003)**: Solo developer context requires high-quality, well-tested code
6. **Compatibility (C-001, C-003, C-004)**: AIWG integration and FAIR compliance core to value proposition
7. **FAIR Compliance (CMP-001 through CMP-005, CMP-009, CMP-010, CMP-011)**: 100% FAIR compliance is vision goal

**Consequences of Failure**: If any Must Have NFR unmet, framework not viable for release (user adoption fails, data integrity compromised, or strategic goals unmet).

### 13.2 Should Have NFRs (Important but Not Blocking)

**Why These Are High Priority But Deferrable**:
1. **Performance (P-003)**, **Scalability (S-002, S-003)**: Nice to have, but workarounds exist (sequential operations, manual pruning)
2. **Reliability (R-003)**: Backup important but Git provides basic version control
3. **Security (SEC-002)**: Privacy warnings important but low likelihood of incidents
4. **Usability (U-004)**: Tiered complexity nice but can add post-v1.0
5. **Maintainability (M-004)**: Semantic versioning important but not blocking functionality
6. **Compatibility (C-002)**: Zotero/Obsidian integration valuable but not critical (BibTeX export sufficient)
7. **FAIR/PROV (CMP-006, CMP-007, CMP-012, CMP-013, CMP-014)**: Advanced compliance features enhance credibility but not required for basic FAIR

**Fallback Plan**: If timeline pressure, defer Should Have to v1.1 and document as known limitations.

### 13.3 Could Have NFRs (Desirable but Optional)

**Why These Are Lowest Priority**:
1. **Performance (P-004)**: Knowledge graphs optional feature
2. **Scalability (S-003)**: Storage monitoring nice but users can check manually
3. **Security (SEC-004)**: Malicious PDFs very low risk
4. **Compliance (CMP-008, CMP-015)**: Controlled vocabularies and OAIS advanced features
5. **Cross-Cutting (X-003)**: Web accessibility only if web UI built

**Decision Rule**: Implement if time allows, cut if timeline slippage. No impact on core value proposition.

### 13.4 Won't Have NFRs (Explicitly Out of Scope)

**Why These Are Deferred**:
1. **Internationalization (X-002)**: English-only assumption reduces complexity, i18n deferred to v1.1+ based on demand

---

## 14. Next Steps

### 14.1 Immediate Actions (Elaboration Phase)

- [ ] **Stakeholder Review**: Present NFR specification, gather feedback on priorities
- [ ] **Validation Planning**: Design automated tests for performance, reliability, security NFRs
- [ ] **Benchmark Development**: Create synthetic corpora (100, 500, 1,000 papers) for scalability testing
- [ ] **FAIR Assessment Setup**: Implement F-UJI-style compliance checking
- [ ] **User Testing Preparation**: Recruit n=10 users for usability validation (learning curve, error messages)

### 14.2 Construction Phase Actions

- [ ] **Automated Testing**: Implement tests for all Must Have NFR acceptance criteria
- [ ] **Performance Benchmarking**: Run benchmarks, tune for P-001, P-002, P-005 targets
- [ ] **Security Audit**: Review code for SEC-001, SEC-003 vulnerabilities
- [ ] **Code Quality**: Enforce M-001 (ESLint), M-002 (90% coverage), M-003 (JSDoc)
- [ ] **FAIR Validation**: Run F-UJI assessment on test corpus, iterate until ≥90% compliance

### 14.3 Transition Phase Actions

- [ ] **User Testing**: Validate U-001 (<1 hour learning), U-002 (error messages), U-003 (docs quality)
- [ ] **Compliance Audit**: Expert review of FAIR, PROV, OAIS compliance
- [ ] **Performance Validation**: Confirm all performance NFRs met under realistic load
- [ ] **Documentation Completion**: User guides, API docs, troubleshooting (U-003)
- [ ] **Release Readiness**: NFR acceptance tracking shows all Must Have criteria met

---

## 15. Conclusion

This Non-Functional Requirements specification defines the quality attributes and constraints that will govern the AIWG Research Framework implementation. By prioritizing NFRs aligned with vision goals (60% time savings, 100% FAIR compliance, 99%+ citation accuracy, <1 hour learning curve), mitigating identified risks (LLM hallucination, manual effort, steep learning curve, capacity constraints), and ensuring compliance with academic standards (FAIR, PROV, OAIS), the framework will deliver a robust, trustworthy, and usable solution for research management.

**Key Success Criteria**:
- Performance: Fast enough to deliver promised time savings
- Reliability: Trustworthy enough to stake research credibility on
- Security: Safe enough to handle sensitive research data
- Usability: Simple enough for developers, rigorous enough for academics
- Maintainability: Sustainable for solo developer long-term
- Compatibility: Integrates with AIWG and external research tools
- Compliance: Meets academic standards without manual overhead

**Risk Mitigation Summary**:
- **T-01 (LLM Hallucination)**: NFR-RF-R-002 (data integrity), NFR-RF-P-005 (validation)
- **A-04 (Manual Effort)**: NFR-RF-P-001, P-002, P-005 (automation speed)
- **R-01 (Capacity)**: NFR-RF-M-001, M-002, M-003 (code quality, testing)
- **Q-01 (Quality)**: NFR-RF-CMP-001 through CMP-015 (FAIR compliance)
- **A-01 (Learning Curve)**: NFR-RF-U-001, U-002, U-003, U-004 (usability)

**Next Artifact**: Use case specifications (UC-001 through UC-005) defining functional requirements with traceability to these NFRs.

---

**Document Status**: Draft for Review
**Reviewers**: Project Stakeholders, Quality Assurance Lead, Architecture Team
**Approval Required**: Project Sponsor (Joseph Magly)
**Review Date**: 2026-01-25
**Next Review**: End of Elaboration Phase (2026-02-15)
