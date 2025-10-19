# Use-Case Specification: UC-004

## Metadata

- ID: UC-004
- Name: Coordinate Multi-Agent Workflows for Comprehensive Artifact Generation
- Owner: System Analyst
- Priority: P0 (Critical)
- Estimated Effort: L (Large - for orchestrator setup)
- Related: REQ-SDLC-005, REQ-SDLC-006, SAD Section 4.2

## 1. Use-Case Identifier

**ID:** UC-004
**Name:** Coordinate Multi-Agent Workflows for Comprehensive Artifact Generation

## 2. Scope and Level

**Scope:** AIWG Multi-Agent Orchestration System
**Level:** User Goal
**System Boundary:** Claude Code Core Orchestrator, Task tool, SDLC agents

## 3. Primary Actors

- Enterprise Team Lead (managing complex compliance projects)
- Technical Lead (requiring multi-stakeholder review cycles)
- Project Manager (coordinating distributed teams)
- Compliance Officer (requiring full audit trails)

## 4. Preconditions

1. Project in Inception or Elaboration phase
2. SDLC agents deployed (58 specialized roles)
3. Requirements artifacts exist (`.aiwg/requirements/`)
4. Claude Code configured as Core Orchestrator (CLAUDE.md with orchestration prompts)

## 5. Postconditions

**Success:**
- Comprehensive artifact generated (SAD, ADRs, test plans) with 3+ reviewer sign-offs
- Full audit trail preserved (`.aiwg/working/{artifact}/reviews/`)
- Requirements traceability validated (100% coverage)
- Security, testability, clarity validated by specialized reviewers
- BASELINED artifact stored in `.aiwg/architecture/` (Git-trackable, compliance-ready)

## 6. Trigger

User requests: "Create architecture baseline"

## 7. Main Success Scenario

1. User requests comprehensive artifact: "Create architecture baseline"
2. Claude Code (Core Orchestrator) interprets → maps to `flow-inception-to-elaboration`
3. Orchestrator initializes workspaces:
   - `.aiwg/working/architecture/sad/drafts/`
   - `.aiwg/working/architecture/sad/reviews/`
4. **Step 1 - Primary Author:**
   - Orchestrator launches Architecture Designer via Task tool
   - Agent reads requirements from `.aiwg/requirements/`
   - Agent reads SAD template from AIWG installation
   - Agent generates v0.1 draft: `.aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md`
   - Orchestrator confirms: "SAD v0.1 draft complete (3,245 words)"
5. **Step 2 - Parallel Reviewers:**
   - Orchestrator launches 4 agents simultaneously (single message, 4 Task calls):
     - Security Architect: Validates security patterns, data classification
     - Test Architect: Validates testability, component boundaries
     - Requirements Analyst: Validates traceability, completeness
     - Technical Writer: Validates clarity, consistency
   - Each reviewer saves feedback: `.aiwg/working/architecture/sad/reviews/{role}-review.md`
6. Orchestrator monitors completion: "4/4 reviews complete (3 APPROVED, 1 CONDITIONAL)"
7. **Step 3 - Synthesizer:**
   - Orchestrator launches Documentation Synthesizer
   - Agent reads v0.1 draft + 4 reviews
   - Agent merges feedback, resolves conflicts
   - Agent generates final SAD: `.aiwg/architecture/software-architecture-doc.md` (BASELINED)
8. **Step 4 - Archive:**
   - Orchestrator moves working artifacts to archive
   - Updates traceability matrix (requirements → architecture mapping)
9. Orchestrator reports success:
   - "SAD BASELINED: `.aiwg/architecture/software-architecture-doc.md`"
   - "4 reviewer sign-offs, 3,487 words, 100% requirements coverage"
10. User reviews final artifact, confirms completeness, proceeds to next workflow

## 8. Alternate Flows

### Alt-1: Custom Reviewer Panel

**Condition:** User wants different reviewers

**Flow:**
1. User specifies: "Create SAD with performance focus. Use performance-engineer instead of test-architect."
2. Orchestrator adjusts reviewer panel:
   - Security Architect
   - Performance Engineer (replaces Test Architect)
   - Requirements Analyst
   - Technical Writer
3. Parallel review proceeds with custom panel
4. **Resume Main:** Step 6

### Alt-2: Consensus Voting (Reviewer Disagreement)

**Condition:** 2 APPROVED, 2 REJECTED (reviewer conflict)

**Flow:**
1. Parallel reviewers complete:
   - Security Architect: REJECTED ("Missing threat model")
   - Test Architect: APPROVED
   - Requirements Analyst: REJECTED ("Incomplete traceability")
   - Technical Writer: APPROVED
2. Orchestrator detects conflict (50% approval rate, threshold 75%)
3. Orchestrator launches Consensus Facilitator:
   - Analyzes conflicting feedback
   - Identifies unresolvable issues
   - Flags for user decision
4. Orchestrator prompts user: "Resolver conflict: Missing threat model (Security Architect). Add threat model section or proceed with warning?"
5. User chooses: "Add threat model section"
6. Orchestrator relaunches Primary Author to add threat model
7. Orchestrator re-launches Security Architect review
8. Security Architect: APPROVED
9. **Resume Main:** Step 7 (Synthesizer)

### Alt-3: Parallel Artifact Generation

**Condition:** User wants SAD + ADRs + Test Plan simultaneously

**Flow:**
1. User requests: "Create architecture baseline with all artifacts"
2. Orchestrator launches 3 workflows in parallel:
   - Workflow 1: SAD generation (4 agents)
   - Workflow 2: ADR generation (3 agents per ADR, 5 ADRs = 15 agents)
   - Workflow 3: Test Plan generation (3 agents)
3. Orchestrator monitors 22 agents total (SAD 4 + ADRs 15 + Test Plan 3)
4. Workflows complete in 15-20 minutes (parallel execution)
5. Orchestrator reports: "3 artifacts BASELINED (SAD, 5 ADRs, Test Plan)"
6. **Resume Main:** Step 10

## 9. Exception Flows

### Exc-1: Reviewer Timeout

**Trigger:** Step 5
**Condition:** 1 of 4 reviewers times out (>10 minute execution)

**Flow:**
1. Security Architect review times out
2. Orchestrator logs timeout: `.aiwg/working/architecture/sad/reviews/security-architect-timeout.log`
3. Orchestrator retries Security Architect (1 retry attempt)
4. Retry succeeds → review completes
5. If retry fails: Orchestrator proceeds with 3/4 reviews, flags warning for user
6. **Resume Main:** Step 6

### Exc-2: Synthesizer Conflict (Unresolvable Feedback)

**Trigger:** Step 7
**Condition:** Synthesizer cannot merge conflicting feedback

**Flow:**
1. Synthesizer analyzes reviews:
   - Security Architect: "Use OAuth2 for authentication"
   - Requirements Analyst: "Use SAML for authentication (enterprise requirement)"
2. Synthesizer detects conflict (contradictory authentication strategies)
3. Synthesizer flags unresolvable conflict:
   - "Conflict: OAuth2 vs SAML authentication. Requires user decision."
4. Orchestrator prompts user: "Choose authentication strategy: OAuth2 or SAML?"
5. User chooses: "SAML (enterprise requirement takes precedence)"
6. Synthesizer merges with user decision
7. **Resume Main:** Step 8

### Exc-3: Context Window Exhaustion

**Trigger:** Step 7
**Condition:** SAD >10,000 words exceeds reviewer context limits

**Flow:**
1. Synthesizer attempts to read v0.1 draft (12,000 words)
2. Context window limit exceeded
3. Orchestrator detects context exhaustion
4. Orchestrator chunks SAD into sections:
   - Section 1: Introduction + Overview (3,000 words)
   - Section 2: Architecture Views (4,000 words)
   - Section 3: Component Design (3,000 words)
   - Section 4: Quality Attributes (2,000 words)
5. Orchestrator launches chunked review (4 sections, 4 reviewers = 16 tasks)
6. Synthesizer merges section reviews
7. **Resume Main:** Step 8

## 10. Special Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-MA-01: Workflow completion | 15-20 minutes for SAD + reviews | Productivity |
| NFR-MA-02: Reviewer sign-offs | 3+ specialized reviewers | Quality |
| NFR-MA-03: Requirements coverage | 100% traceability | Compliance |
| NFR-MA-04: Audit trail | Full review history preserved | Governance |

## 11. Related Business Rules

**BR-MA-001: Reviewer Panel Selection**
- Default panel: Security Architect, Test Architect, Requirements Analyst, Technical Writer
- User can customize via natural language ("add performance-engineer")
- Minimum 3 reviewers required for BASELINE approval

**BR-MA-002: Approval Thresholds**
- 75%+ APPROVED → Proceed to synthesis
- 50-74% APPROVED → Consensus voting required
- <50% APPROVED → Reject, require Primary Author revision

**BR-MA-003: Parallel Execution Limits**
- Maximum 25 concurrent agents (Claude Code constraint)
- Chunked execution for workflows >25 agents
- Queue management for sequential dependencies

## 12. Data Requirements

### Input Data

| Element | Format | Source | Validation |
|---------|--------|--------|-----------|
| Artifact Type | Enum (SAD, ADR, Test Plan) | User request | Valid artifact type |
| Custom Reviewers | Array of agent names | Optional user specification | Valid agent names |
| Requirements Path | String | `.aiwg/requirements/` | Directory exists |

### Output Data

| Element | Format | Destination | Retention |
|---------|--------|-------------|----------|
| Primary Draft | Markdown | `.aiwg/working/{artifact}/drafts/` | 30 days (archive) |
| Review Feedback | Markdown | `.aiwg/working/{artifact}/reviews/` | Permanent (audit trail) |
| BASELINED Artifact | Markdown | `.aiwg/architecture/` | Permanent (Git-tracked) |

## 13. Open Issues

1. **Issue 001: Reviewer panel configuration**
   - Should users configure default panels in CLAUDE.md?
   - Owner: Product Strategist
   - Due: Construction phase

2. **Issue 002: Consensus algorithm**
   - What consensus algorithm for 2 APPROVED / 2 REJECTED scenarios?
   - Owner: Process Engineer
   - Due: Elaboration phase

## 14. References

- [Use Case Brief](/aiwg/requirements/use-case-briefs/UC-004-multi-agent-workflows.md)
- [SAD Section 4.2](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md)
- [Multi-Agent Pattern](/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md)

---

## Traceability Matrix

| Requirement | Source | Component | Test Case |
|------------|--------|-----------|-----------|
| REQ-SDLC-005 | Feature Backlog | Core Orchestrator | TC-MA-001 |
| REQ-SDLC-006 | Feature Backlog | Reviewer agents | TC-MA-002 |
| NFR-MA-01 | This document | Parallel execution | TC-MA-003 |
| BR-MA-001 | This document | Panel selection | TC-MA-004 |

### SAD Component Mapping

**Primary:** Core Orchestrator (Claude Code), Task tool (SAD 4.2)
**Supporting:** 58 SDLC agents, Documentation Synthesizer

---

## Acceptance Criteria

### AC-001: Basic Multi-Agent Workflow

**Given:** User requests "Create architecture baseline"
**When:** Orchestrator executes workflow
**Then:**
- SAD generated with 3+ reviewer sign-offs
- Full audit trail preserved (drafts + reviews)
- Workflow completes in 15-20 minutes
- 100% requirements traceability validated

### AC-002: Custom Reviewer Panel

**Given:** User specifies custom reviewers
**When:** User says "Add performance-engineer to review panel"
**Then:**
- Orchestrator adjusts panel (4 default + 1 custom = 5 reviewers)
- All 5 reviews complete
- Synthesis includes all feedback

### AC-003: Consensus Voting

**Given:** 2/4 reviewers reject (50% approval)
**When:** Orchestrator detects conflict
**Then:**
- Consensus Facilitator launched
- User prompted for conflict resolution
- Synthesizer merges with user decision

### AC-004: Parallel Artifact Generation

**Given:** User requests "SAD + ADRs + Test Plan"
**When:** Orchestrator launches 3 workflows simultaneously
**Then:**
- All 3 artifacts generated in 15-20 minutes (parallel execution)
- No workflow blocks others
- All artifacts BASELINED

---

**Version:** 1.0
**Status:** APPROVED
**Created:** 2025-10-18
**Word Count:** 2,178 words
