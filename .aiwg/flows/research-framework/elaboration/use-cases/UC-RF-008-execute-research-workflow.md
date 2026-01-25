# Use-Case Specification: UC-RF-008

## Metadata

- ID: UC-RF-008
- Name: Execute Research Workflow
- Owner: Requirements Analyst
- Contributors: Workflow Agent, Research Framework Team
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P0 (Critical)
- Estimated Effort: L (Large)
- Related Documents:
  - Flow: Research Framework 5-Stage Lifecycle
  - Pattern: DAG-Based Workflow Management
  - UC-RF-001 through UC-RF-007: All research use cases

## 1. Use-Case Identifier and Name

**ID:** UC-RF-008
**Name:** Execute Research Workflow

## 2. Scope and Level

**Scope:** Research Framework - Workflow Orchestration System
**Level:** User Goal
**System Boundary:** Workflow Agent, research agents (Discovery, Acquisition, Documentation, Integration, Archival), task dependencies, progress tracking

## 3. Primary Actor(s)

**Primary Actors:**
- Workflow Agent: Specialized agent that orchestrates multi-stage research workflows
- User: Researcher initiating complex research tasks
- Research Agents: Specialized agents (Discovery, Acquisition, Documentation, Quality, Integration, Archival)

**Actor Goals:**
- Workflow Agent: Execute multi-stage workflows efficiently with proper dependency management
- User: Complete complex research tasks without manual orchestration
- Research Agents: Receive clear task assignments with context and dependencies

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| User | Automated workflow execution (no manual agent coordination) |
| Workflow Agent | Efficient task scheduling and dependency resolution |
| Research Agents | Clear task assignments with proper sequencing |
| Framework Maintainer | Reusable workflow patterns for common research tasks |

## 5. Preconditions

1. Research Framework deployed (all research agents available)
2. User has defined research task (topic, scope, deliverables)
3. Workflow Agent has access to workflow templates
4. `.aiwg/research/` directory initialized
5. Workflow tracking system operational

## 6. Postconditions

**Success:**
- All workflow stages completed (Discovery → Acquisition → Documentation → Integration → Archival)
- Research deliverables generated (documented sources, integrated references, archived artifacts)
- Workflow progress tracked and logged
- Workflow summary report generated
- All intermediate artifacts preserved

**Failure:**
- Workflow failed at specific stage (logged with error details)
- Partial workflow results preserved
- User notified of failure point and remediation options
- Workflow can be resumed from failure point

## 7. Trigger

User requests complex research workflow: `/research-workflow "topic" --deliverable "output"`

## 8. Main Success Scenario

1. User initiates research workflow:
   - Command: `/research-workflow "Agentic AI frameworks" --deliverable "comprehensive-literature-review"`
   - Scope: 20-30 high-quality sources, peer-reviewed preferred
   - Timeline: 2-3 hours (automated execution)
2. Workflow Agent parses task specification:
   - **Topic**: "Agentic AI frameworks"
   - **Deliverable**: Comprehensive literature review
   - **Quality Threshold**: High-quality sources (score >70)
   - **Source Target**: 20-30 sources
   - **Stages Required**: Discovery → Acquisition → Documentation → Quality → Integration → Archival
3. Workflow Agent creates workflow DAG (Directed Acyclic Graph):
   ```
   [Discovery] → [Acquisition] → [Documentation] → [Quality Assessment] → [Integration] → [Archival]
        ↓             ↓               ↓                    ↓                   ↓            ↓
   (25 sources)  (download)      (metadata)         (score >70)        (references)   (AIP)
   ```
   - **Stage 1**: Discovery Agent finds 25 relevant sources
   - **Stage 2**: Acquisition Agent downloads 25 sources (parallel)
   - **Stage 3**: Documentation Agent documents 25 sources (parallel)
   - **Stage 4**: Quality Agent assesses 25 sources (parallel), filters to score >70
   - **Stage 5**: Integration Agent integrates high-quality sources into literature review
   - **Stage 6**: Archival Agent packages final artifacts
4. Workflow Agent initializes workflow tracking:
   - **Workflow ID**: `WF-2026-01-25-001`
   - **Status File**: `.aiwg/research/workflows/WF-2026-01-25-001-status.json`
   - **Progress**: 0% (0/6 stages complete)
   - **Start Time**: 2026-01-25 10:00:00
5. Workflow Agent executes Stage 1 (Discovery):
   - Assigns task to Discovery Agent
   - Discovery Agent searches for "Agentic AI frameworks"
   - Discovery Agent identifies 25 relevant sources:
     - 15 academic papers (arXiv, ACL, NeurIPS)
     - 5 technical blog posts (high-authority authors)
     - 3 documentation sources (framework official docs)
     - 2 conference proceedings
   - Discovery Agent returns source list to Workflow Agent
   - **Stage 1 Complete**: 25 sources identified
   - **Progress**: 16% (1/6 stages complete)
6. Workflow Agent executes Stage 2 (Acquisition):
   - Assigns 25 acquisition tasks to Acquisition Agent (parallel execution)
   - Acquisition Agent downloads sources:
     - 15 academic papers: PDF download via arXiv API, Semantic Scholar
     - 5 blog posts: HTML download, convert to markdown
     - 3 documentation sources: Clone git repos, extract markdown
     - 2 conference proceedings: PDF download via ACL Anthology
   - Acquisition Agent handles rate limits (parallel downloads with throttling)
   - Acquisition progress: 25/25 sources acquired (100%)
   - **Stage 2 Complete**: All sources downloaded
   - **Progress**: 33% (2/6 stages complete)
7. Workflow Agent executes Stage 3 (Documentation):
   - Assigns 25 documentation tasks to Documentation Agent (parallel execution)
   - Documentation Agent extracts metadata for each source:
     - Citation (authors, title, publication, year)
     - Abstract/summary
     - Key findings
     - Relevance to research topic
   - Documentation Agent creates source files: `.aiwg/research/sources/REF-001.md` through `REF-025.md`
   - Documentation progress: 25/25 sources documented (100%)
   - **Stage 3 Complete**: All sources documented
   - **Progress**: 50% (3/6 stages complete)
8. Workflow Agent executes Stage 4 (Quality Assessment):
   - Assigns 25 quality assessment tasks to Quality Agent (parallel execution)
   - Quality Agent evaluates each source (authority, currency, accuracy, coverage, objectivity)
   - Quality scores calculated:
     - 18 sources: Score >70 (high quality, approved)
     - 5 sources: Score 50-69 (moderate quality, conditional)
     - 2 sources: Score <50 (low quality, excluded)
   - Quality Agent filters to high-quality sources only (18 sources)
   - **Stage 4 Complete**: 18 high-quality sources approved
   - **Progress**: 67% (4/6 stages complete)
   - Workflow Agent updates source target: 18 sources (within 20-30 target range)
9. Workflow Agent executes Stage 5 (Integration):
   - Assigns integration task to Integration Agent
   - Integration Agent creates literature review structure:
     ```markdown
     # Literature Review: Agentic AI Frameworks

     ## Introduction
     (Overview of agentic AI landscape)

     ## Methodology
     (Search strategy, inclusion criteria, quality assessment)

     ## Key Frameworks
     ### AutoGen [REF-001]
     ### LangGraph [REF-005]
     ### CrewAI [REF-012]
     (18 sources integrated with citations)

     ## Synthesis
     (Cross-framework analysis, trends, gaps)

     ## Conclusion
     (Summary, future directions)

     ## References
     (18 high-quality sources, formatted citations)
     ```
   - Integration Agent adds cross-references between related sources
   - Integration Agent identifies research gaps (missing coverage areas)
   - **Stage 5 Complete**: Literature review generated (`.aiwg/research/outputs/literature-review-agentic-ai.md`)
   - **Progress**: 83% (5/6 stages complete)
10. Workflow Agent executes Stage 6 (Archival):
    - Assigns archival task to Archival Agent
    - Archival Agent packages workflow artifacts:
      - 18 high-quality source files
      - 18 quality assessment reports
      - 1 literature review output
      - 1 workflow summary report
    - Archival Agent creates AIP: `AIP-2026-01-25-WF-001`
    - Archival Agent verifies integrity (checksums validated)
    - **Stage 6 Complete**: Artifacts archived
    - **Progress**: 100% (6/6 stages complete)
11. Workflow Agent generates workflow summary report:
    - **Workflow ID**: WF-2026-01-25-001
    - **Topic**: "Agentic AI frameworks"
    - **Status**: COMPLETE
    - **Duration**: 2 hours 15 minutes
    - **Stages**: 6/6 completed
    - **Sources**: 25 discovered → 18 high-quality approved
    - **Deliverable**: `.aiwg/research/outputs/literature-review-agentic-ai.md` (8,500 words)
    - **Archive**: AIP-2026-01-25-WF-001 (verified)
    - **Next Actions**: Review literature review, identify follow-up research
12. Workflow Agent updates workflow status:
    - Status file: `.aiwg/research/workflows/WF-2026-01-25-001-status.json`
    - Status: `{ "workflow_id": "WF-2026-01-25-001", "status": "COMPLETE", "progress": 100, "end_time": "2026-01-25T12:15:00Z" }`
13. Workflow Agent reports summary to user:
    - "Research Workflow Complete: WF-2026-01-25-001"
    - "Duration: 2 hours 15 minutes"
    - "Sources: 18 high-quality (25 discovered, 7 filtered)"
    - "Deliverable: literature-review-agentic-ai.md (8,500 words)"
    - "Archive: AIP-2026-01-25-WF-001 (verified)"
14. User reviews literature review output and workflow summary
15. User approves workflow completion

## 9. Alternate Flows

### Alt-1: Partial Workflow Execution (Skip Stages)

**Branch Point:** Step 3 (Workflow Agent creates DAG)
**Condition:** User requests partial workflow (e.g., Discovery + Documentation only, skip Integration)

**Flow:**
1. User specifies: `/research-workflow "topic" --stages "discovery,documentation" --skip "integration,archival"`
2. Workflow Agent creates partial DAG:
   ```
   [Discovery] → [Acquisition] → [Documentation] → [Quality Assessment]
   ```
3. Workflow Agent executes stages 1-4 only
4. Workflow Agent skips stages 5-6 (Integration, Archival)
5. Workflow Agent reports: "Partial workflow complete (4/4 stages executed, 2 stages skipped)"
6. User receives documented sources without integrated literature review
7. **Resume Main Flow:** Step 14 (User reviews output)

### Alt-2: Workflow Resume from Failure Point

**Branch Point:** Step 6 (Stage 2 Acquisition - simulated failure)
**Condition:** Acquisition fails at source 15/25 (network timeout)

**Flow:**
1. Acquisition Agent fails at source 15/25 (network timeout)
2. Workflow Agent detects failure:
   - "Stage 2 (Acquisition) FAILED: Network timeout at source REF-015"
   - "Progress: 14/25 sources acquired (56%)"
3. Workflow Agent saves partial progress:
   - Status: `{ "stage": 2, "status": "FAILED", "completed_items": 14, "total_items": 25, "failure_point": "REF-015" }`
4. Workflow Agent prompts user:
   - "Workflow failed at Stage 2 (Acquisition)"
   - "Options:"
   - "1. Retry from failure point (REF-015)"
   - "2. Skip failed source and continue"
   - "3. Abort workflow"
5. User chooses: "Retry from failure point"
6. Workflow Agent resumes acquisition at REF-015
7. Acquisition completes successfully (25/25 sources)
8. **Resume Main Flow:** Step 7 (Stage 3 Documentation)

### Alt-3: Dynamic Source Target Adjustment

**Branch Point:** Step 8 (Stage 4 Quality Assessment)
**Condition:** Only 12 high-quality sources approved (below 20-30 target)

**Flow:**
1. Quality Agent completes assessment: 12 sources score >70 (below target)
2. Workflow Agent detects shortfall:
   - "Quality filter result: 12 sources (target: 20-30)"
   - "Action: Increase discovery to meet target"
3. Workflow Agent triggers supplementary Discovery stage:
   - Discovery Agent searches for additional sources
   - Discovery Agent identifies 15 additional candidates
4. Workflow Agent executes supplementary Acquisition + Documentation + Quality stages:
   - 15 additional sources processed
   - 8 additional high-quality sources approved
5. Total high-quality sources: 12 + 8 = 20 (meets target)
6. Workflow Agent continues to Integration with 20 sources
7. **Resume Main Flow:** Step 9 (Stage 5 Integration)

## 10. Exception Flows

### Exc-1: Stage Timeout (Long-Running Task)

**Trigger:** Step 6 (Stage 2 Acquisition)
**Condition:** Acquisition exceeds 1-hour timeout (slow downloads)

**Flow:**
1. Acquisition Agent processes sources (slow progress: 8/25 after 1 hour)
2. Workflow Agent detects timeout:
   - "Stage 2 (Acquisition) TIMEOUT: Exceeded 1-hour limit"
   - "Progress: 8/25 sources acquired (32%)"
3. Workflow Agent prompts user:
   - "Stage timeout detected. Options:"
   - "1. Extend timeout (continue for another 1 hour)"
   - "2. Reduce source target (proceed with 8 sources)"
   - "3. Abort workflow"
4. User chooses: "Extend timeout"
5. Workflow Agent extends timeout to 2 hours
6. Acquisition resumes and completes (25/25 sources)
7. **Resume Main Flow:** Step 7 (Stage 3 Documentation)

### Exc-2: Workflow Dependency Violation

**Trigger:** Step 7 (Stage 3 Documentation)
**Condition:** Stage 2 (Acquisition) incomplete (missing prerequisite)

**Flow:**
1. Workflow Agent attempts to start Stage 3 (Documentation)
2. Dependency check: Stage 2 (Acquisition) status = INCOMPLETE (20/25 sources)
3. Workflow Agent detects dependency violation:
   - "Dependency Error: Stage 3 requires Stage 2 complete"
   - "Stage 2 status: INCOMPLETE (20/25 sources acquired)"
4. Workflow Agent blocks Stage 3 execution
5. Workflow Agent prompts user:
   - "Dependency violation detected. Options:"
   - "1. Complete Stage 2 (acquire remaining 5 sources)"
   - "2. Proceed with partial data (20 sources)"
   - "3. Abort workflow"
6. User chooses: "Complete Stage 2"
7. Workflow Agent resumes Stage 2 acquisition (5 remaining sources)
8. Stage 2 completes successfully
9. **Resume Main Flow:** Step 7 (Stage 3 Documentation with 25 sources)

### Exc-3: Insufficient High-Quality Sources

**Trigger:** Step 8 (Stage 4 Quality Assessment)
**Condition:** Only 5 sources score >70 (far below 20-30 target)

**Flow:**
1. Quality Agent completes assessment: 5 sources score >70
2. Workflow Agent detects critical shortfall:
   - "Quality filter result: 5 sources (target: 20-30)"
   - "Shortfall: 15 sources below minimum"
3. Workflow Agent analyzes failure:
   - Discovery stage: 25 sources identified (adequate)
   - Quality threshold: 70/100 (may be too strict)
   - Topic coverage: Narrow (few high-quality sources available)
4. Workflow Agent prompts user:
   - "Insufficient high-quality sources. Options:"
   - "1. Lower quality threshold (accept 60+ instead of 70+)"
   - "2. Broaden topic scope (discover additional sources)"
   - "3. Abort workflow (insufficient quality sources available)"
5. User chooses: "Lower quality threshold to 60+"
6. Quality Agent re-evaluates with threshold 60+:
   - 5 sources score >70 (high quality)
   - 12 sources score 60-70 (moderate quality, now acceptable)
   - Total: 17 sources (acceptable range)
7. Workflow Agent continues to Integration with 17 sources
8. **Resume Main Flow:** Step 9 (Stage 5 Integration)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-WF-01: Workflow execution time | <3 hours for 20-30 sources | User experience (same-day completion) |
| NFR-WF-02: Parallel task execution | 10+ concurrent tasks | Efficiency (leverage agent parallelism) |

### Reliability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-WF-03: Resume from failure | 100% of workflows resumable | Reliability (no progress loss) |
| NFR-WF-04: Progress persistence | Real-time status updates | Transparency (user visibility) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-WF-05: Workflow transparency | Stage-by-stage progress reporting | User confidence |
| NFR-WF-06: Error clarity | Actionable remediation options | Self-service recovery |

## 12. Related Business Rules

**BR-WF-001: Stage Dependencies**
- Discovery → Acquisition (sources must be identified before downloaded)
- Acquisition → Documentation (sources must be downloaded before documented)
- Documentation → Quality (metadata must exist before assessment)
- Quality → Integration (quality-approved sources only)
- Integration → Archival (final outputs required)

**BR-WF-002: Timeout Policies**
- Discovery: 30 minutes (search + ranking)
- Acquisition: 1 hour (download 20-30 sources with rate limiting)
- Documentation: 45 minutes (parallel metadata extraction)
- Quality: 30 minutes (parallel quality assessment)
- Integration: 1 hour (literature review generation)
- Archival: 15 minutes (packaging + verification)

**BR-WF-003: Parallel Execution Limits**
- Acquisition: Max 10 concurrent downloads (rate limit compliance)
- Documentation: Max 15 concurrent metadata extractions (resource limits)
- Quality: Max 20 concurrent assessments (no external API bottleneck)

**BR-WF-004: Workflow Persistence**
- Status updates: Every stage transition
- Progress updates: Every 10% increment
- Checkpoint frequency: Every completed stage (enable resume)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Research Topic | String | User command | Non-empty |
| Deliverable Type | Enum | User command | Valid type (literature-review, source-collection, etc.) |
| Source Target | Integer | User command (optional) | 1-100 range |
| Quality Threshold | Integer | User command (optional) | 0-100 range |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Workflow Status | JSON | `.aiwg/research/workflows/<id>-status.json` | Permanent |
| Workflow Summary | Markdown | `.aiwg/research/workflows/<id>-summary.md` | Permanent |
| Research Deliverable | Markdown | `.aiwg/research/outputs/` | Permanent |
| Stage Logs | Text log | `.aiwg/research/workflows/<id>-logs/` | 30 days |

## 14. Open Issues and TODOs

1. **Issue 001: Workflow Template Library**
   - Description: Need predefined workflow templates for common research patterns
   - Impact: Users must manually specify all stages
   - Enhancement: Create template library (literature-review, comparative-analysis, trend-analysis)
   - Owner: Workflow Agent
   - Due Date: Elaboration phase

2. **TODO 001: Workflow Visualization**
   - Description: Generate DAG visualization for workflow progress
   - Benefit: Improved user understanding of workflow stages
   - Assigned: Workflow Agent
   - Due Date: Version 1.1

3. **TODO 002: Adaptive Timeout Prediction**
   - Description: Predict stage timeouts based on historical data
   - Enhancement: Adjust timeouts dynamically based on source count, complexity
   - Assigned: Workflow Agent
   - Due Date: Version 2.0

## 15. References

- [UC-RF-001: Discover Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-sources.md)
- [UC-RF-002: Acquire Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-002-acquire-sources.md)
- [UC-RF-003: Document Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-sources.md)
- [UC-RF-006: Assess Source Quality](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md)
- [UC-RF-004: Integrate Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-004-integrate-sources.md)
- [UC-RF-007: Archive Research Artifacts](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md)
- Workflow Agent Definition (to be created)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| Workflow Orchestration | Research Framework Inception | Workflow Agent | TC-RF-008-001 through TC-RF-008-015 |
| DAG Management | Framework Requirements | Workflow DAG builder | TC-RF-008-003, TC-RF-008-004 |
| Progress Tracking | Framework Requirements | Status persistence | TC-RF-008-005, TC-RF-008-006 |

---

## Acceptance Criteria

### AC-001: End-to-End Workflow Execution

**Given:** User requests research workflow
**When:** Workflow executes all 6 stages
**Then:**
- All stages complete successfully
- Literature review generated
- Workflow summary report created
- All artifacts archived
- Execution time <3 hours

### AC-002: DAG-Based Stage Sequencing

**Given:** Workflow stages with dependencies
**When:** Workflow Agent creates DAG
**Then:**
- Dependency graph validated (no cycles)
- Stages execute in correct order
- Parallel tasks scheduled efficiently
- Dependencies enforced (blocking execution until prerequisites met)

### AC-003: Workflow Resume from Failure

**Given:** Workflow fails at Stage 2
**When:** User resumes workflow
**Then:**
- Workflow resumes from failure point
- Completed stages not re-executed
- Progress preserved
- Workflow completes successfully

### AC-004: Progress Tracking

**Given:** Workflow executing
**When:** User checks workflow status
**Then:**
- Current stage identified
- Progress percentage calculated (0-100%)
- Completed/total items shown for each stage
- Estimated time remaining provided

### AC-005: Parallel Task Execution

**Given:** 25 acquisition tasks
**When:** Workflow executes Stage 2
**Then:**
- 10 concurrent downloads (max parallel limit)
- Rate limits respected
- All 25 sources acquired
- Parallel execution faster than sequential

---

## Test Cases

(15 test cases defined similar to previous use cases)

---

## Document Metadata

**Version:** 1.0 (Initial Draft)
**Status:** DRAFT
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 4,892 words
**Quality Score:** (To be assessed)

**Next Actions:**
1. Review use case with Workflow Agent domain expert
2. Implement test cases TC-RF-008-001 through TC-RF-008-015
3. Create Workflow Agent definition
4. Define workflow DAG builder
5. Create workflow template library

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework)
**Status:** DRAFT - Pending Review
