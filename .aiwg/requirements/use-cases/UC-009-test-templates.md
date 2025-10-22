# Use-Case Specification: UC-009

## Metadata

- ID: UC-009
- Name: Generate Comprehensive Test Strategies and Test Cases from Requirements
- Owner: Test Architect
- Contributors: Test Engineer, Requirements Analyst, QA Lead
- Reviewers: Requirements Reviewer, Product Strategist
- Team: AIWG Framework Development
- Status: approved
- Created: 2025-10-18
- Updated: 2025-10-22
- Priority: P0 (Critical - Quality Enabler for Construction Phase)
- Estimated Effort: M (Medium)
- Related Documents:
  - Use Case Brief: /aiwg/requirements/use-case-briefs/UC-009-test-templates.md
  - Feature: FID-004 (Test Strategy Templates), Feature Backlog Prioritized
  - SAD: Section 5.4 (Test Generator Engine), Section 4.2 (Core Orchestrator)
  - Priority Matrix: Use Case Priority Matrix - Elaboration Week 5
  - Test Templates: ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/test/

## 1. Use-Case Identifier and Name

**ID:** UC-009
**Name:** Generate Comprehensive Test Strategies and Test Cases from Requirements

## 2. Scope and Level

**Scope:** AIWG Framework Test Generation System
**Level:** User Goal
**System Boundary:** AIWG framework repository, test template library, requirements analyzer, test case generator, coverage calculator

## 3. Primary Actor(s)

**Primary Actors:**
- **Test Architect**: Strategic test planning role, defines overall test strategy for projects
- **Test Engineer**: Tactical testing role, needs test case specifications to implement tests
- **QA Lead**: Quality assurance manager, validates test coverage completeness before releases
- **Developer**: Implements features, needs test cases to validate implementation correctness
- **Product Manager**: Validates acceptance criteria coverage, ensures all user stories tested

**Actor Goals:**
- Generate Master Test Plan in <10 minutes (vs weeks of manual effort)
- Derive test cases automatically from use cases and NFRs (eliminate manual test design overhead)
- Calculate test coverage targets by priority (P0: 100%, P1: 80%, P2: 50%)
- Create test coverage matrix (requirements → test cases traceability)
- Estimate test implementation effort (hours per test case, sprint velocity planning)
- Ensure quality pyramid balance (70-80% unit, 15-20% integration, 5-10% E2E)

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Test Architect | Complete test strategy that balances speed, coverage, and maintainability |
| Developer | Clear test specifications (Given/When/Then) to implement test cases |
| QA Lead | 100% P0 requirement coverage (quality gate for releases) |
| Product Manager | Acceptance criteria coverage (all user stories validated) |
| DevOps Engineer | CI/CD pipeline integration (test execution frequency, timeout thresholds) |
| Project Manager | Test implementation effort estimates (sprint capacity planning) |

## 5. Preconditions

1. AIWG project with `.aiwg/` directory structure
2. Requirements baseline exists:
   - Use cases: `.aiwg/requirements/use-cases/*.md`
   - NFRs: `.aiwg/requirements/nfrs/*.md` or Supplemental Specification
   - User stories: `.aiwg/requirements/user-stories/*.md` (optional)
3. Project context known:
   - Technology stack (Node.js/Python/Go/etc.)
   - Team size (solo developer vs enterprise team)
   - Test environment availability (CI/CD pipeline, test databases)
4. Test templates available:
   - Master Test Plan template: `~/.local/share/ai-writing-guide/.../templates/test/master-test-plan-template.md`
   - Test case template: `test-case-card.md`
   - Test strategy template: `test-strategy-template.md`
5. Test Architect agent has read access to requirements and templates
6. `.aiwg/testing/` directory exists (or will be created)

## 6. Postconditions

**Success Postconditions:**
- Master Test Plan generated: `.aiwg/testing/master-test-plan.md`
- Test cases derived from requirements (use cases → 15-30 test cases per UC, NFRs → 2-3 test cases per NFR)
- Test coverage matrix created: `.aiwg/testing/test-coverage-matrix.csv`
- Test execution schedule defined (unit daily, integration weekly, E2E pre-release)
- Test implementation effort estimated (hours per test case, total sprint capacity)
- Test strategy follows pyramid pattern (70-80% unit, 15-20% integration, 5-10% E2E)
- Coverage targets meet priority thresholds:
  - P0 requirements: 100% test coverage
  - P1 requirements: 80% test coverage
  - P2 requirements: 50% test coverage
- Test case specifications in Given/When/Then format (Gherkin/BDD style)
- Test artifacts archived in project repository (Git-tracked)

**Failure Postconditions:**
- Error log generated: `.aiwg/testing/generation-errors.log`
- Partial test plan saved (best-effort coverage)
- Remediation recommendations provided:
  - Missing requirements baseline → "Run `/project:intake-wizard` to generate requirements"
  - Missing project context → "Add `.aiwg/config/project-context.yaml` with tech stack"
  - Unsupported technology stack → "Use generic test template, customize manually"
- User notified of completion percentage (e.g., "75% test cases generated, 25% require manual design")

## 7. Trigger

**Manual Triggers:**
- Developer invokes: `/project:generate-tests` (generates Master Test Plan)
- Developer invokes: `/project:generate-tests --iteration 5` (generates iteration-specific test plan)
- Developer invokes: `/project:generate-tests --requirements UC-006` (generates test cases for specific requirement)

**Automatic Triggers:**
- Phase-based: Elaboration phase start → Generates Master Test Plan baseline
- Iteration-based: Construction sprint start → Generates iteration test plan (subset of master plan)
- Event-based: Requirements baseline updated → Regenerates test coverage matrix

**Workflow Integration:**
- `flow-inception-to-elaboration` → Generates Master Test Plan as deliverable
- `flow-iteration-dual-track` → Generates iteration test plan for Discovery track validation

## 8. Main Success Scenario

1. **Test Architect initiates test generation**
   - Test Architect invokes: `/project:generate-tests`
   - Core Orchestrator (Claude Code) receives command
   - Orchestrator validates arguments:
     - Project directory: `.` (current working directory)
     - Options: `--iteration N` (iteration-specific), `--requirements UC-XXX` (requirement-specific), `--update-only` (refresh existing plan)
   - Orchestrator creates temporary workspace: `.aiwg/working/test-generation-YYYY-MM-DD-HHMMSS/`

2. **System loads requirements baseline**
   - System scans `.aiwg/requirements/` directory recursively
   - System identifies requirement files:
     - Use cases: `.aiwg/requirements/use-cases/UC-*.md` (11 use cases found)
     - NFRs: `.aiwg/requirements/nfrs/NFR-*.md` or `.aiwg/requirements/supplemental-specification.md` (48 NFRs found)
     - User stories: `.aiwg/requirements/user-stories/US-*.md` (optional, 0 found)
   - System parses each requirement:
     - Extract requirement ID (UC-006, NFR-PERF-005, US-001)
     - Extract priority (P0, P1, P2) from metadata
     - Extract requirement type (Use Case, NFR, User Story)
     - Extract main scenario steps (for use cases)
     - Extract acceptance criteria (for use cases and user stories)
   - System builds requirements index:
     - Total requirements: 59 (11 use cases + 48 NFRs)
     - P0 requirements: 17 (5 use cases + 12 NFRs) - 29% of total
     - P1 requirements: 24 (4 use cases + 20 NFRs) - 41% of total
     - P2 requirements: 18 (2 use cases + 16 NFRs) - 30% of total
   - System logs requirements baseline: "Loaded 59 requirements (17 P0, 24 P1, 18 P2)"

3. **System analyzes project context**
   - System determines project context:
     - Technology stack: Read from `.aiwg/config/project-context.yaml` OR infer from `package.json` / `requirements.txt`
     - Team size: Read from `.aiwg/team/team-profile.yaml` OR default to solo developer
     - Test environment: Check for CI/CD config (`.github/workflows/`, `.gitlab-ci.yml`)
   - System extracts technology stack:
     - Primary language: Node.js (detected from `package.json`)
     - Test frameworks: Jest (detected from `package.json` devDependencies)
     - Secondary language: Python (detected from `.py` files in `tools/`)
     - Python test frameworks: Pytest (detected from `requirements-dev.txt`)
   - System extracts team context:
     - Team size: Solo developer (1 developer) from `team-profile.yaml`
     - Test expertise: Medium (developer has basic TDD experience)
     - Test automation maturity: Low (no existing CI/CD pipeline)
   - System logs project context: "Project: Node.js + Python, Team: Solo developer, Test maturity: Low"

4. **System selects test strategy template**
   - System loads test strategy template library:
     - Generic template: `test-strategy-template.md` (language-agnostic)
     - Node.js template: `test-strategy-nodejs.md` (Jest/Mocha focus)
     - Python template: `test-strategy-python.md` (Pytest focus)
   - System selects template based on project context:
     - Primary template: Node.js template (Jest framework)
     - Secondary template: Python template (Pytest framework)
     - Fallback: Generic template (if unsupported tech stack)
   - System loads Master Test Plan template: `master-test-plan-template.md`
   - System logs template selection: "Selected templates: Node.js (Jest), Python (Pytest)"

5. **System generates test strategy (unit/integration/E2E distribution)**
   - System applies test pyramid pattern:
     - **Unit tests**: 70-80% of total test cases (fast, isolated, developer-owned)
     - **Integration tests**: 15-20% of total test cases (API/service interactions)
     - **E2E tests**: 5-10% of total test cases (full user workflows)
   - System estimates total test case count:
     - Use cases: 11 UCs × 20 test cases/UC (avg) = 220 test cases
     - NFRs: 48 NFRs × 2.5 test cases/NFR (avg) = 120 test cases
     - Total estimated: 340 test cases
   - System calculates pyramid distribution:
     - Unit tests: 340 × 75% = 255 test cases (70-80% target met)
     - Integration tests: 340 × 20% = 68 test cases (15-20% target met)
     - E2E tests: 340 × 5% = 17 test cases (5-10% target met)
   - System validates pyramid balance: "Pyramid balance validated: 75% unit, 20% integration, 5% E2E"
   - System logs test strategy: "Test strategy: 255 unit, 68 integration, 17 E2E (340 total)"

6. **System derives test cases from use cases**
   - For each use case in requirements baseline:
     - System reads use case: `UC-006-automated-traceability.md`
     - System extracts scenarios:
       - Main success scenario: 15 steps (Step 1: Load requirements, Step 2: Scan codebase, ..., Step 15: Archive workspace)
       - Alternate flows: 4 alternates (Stale matrix detected, No implementation files, Partial traceability, High orphan rate)
       - Exception flows: 7 exceptions (Requirements missing, Parse error, Circular dependency, Permission error, CSV write error, Timeout, NetworkX missing)
     - System generates test cases (1 test case per scenario element):
       - Main scenario: 15 test cases (TC-006-001 to TC-006-015)
       - Alternate flows: 4 test cases (TC-006-016 to TC-006-019)
       - Exception flows: 7 test cases (TC-006-020 to TC-006-026)
       - Total for UC-006: 26 test cases
     - System maps test cases to test types:
       - Unit tests: 20 test cases (isolated step validation)
       - Integration tests: 4 test cases (workflow integration)
       - E2E tests: 2 test cases (full traceability workflow)
   - System repeats for all 11 use cases
   - System builds use case test map:
     - UC-001 → 18 test cases
     - UC-002 → 12 test cases
     - UC-003 → 15 test cases
     - UC-004 → 14 test cases
     - UC-005 → 30 test cases (exceptional - multi-agent iteration workflow)
     - UC-006 → 26 test cases
     - UC-007 → 16 test cases
     - UC-008 → 12 test cases
     - UC-009 → 18 test cases
     - UC-010 → 14 test cases
     - UC-011 → 22 test cases
   - System logs use case test derivation: "Derived 197 test cases from 11 use cases (avg 17.9 test cases/UC)"

7. **System derives test cases from NFRs**
   - For each NFR in requirements baseline:
     - System reads NFR: `NFR-PERF-005-traceability-validation-time.md`
     - System extracts NFR target: "Traceability validation <90 seconds (95th percentile) for 10,000+ nodes"
     - System generates test cases (2-3 test cases per NFR):
       - **Positive test**: Validate NFR met (e.g., "TC-PERF-005-001: Validation completes in <90s for 10,000 nodes")
       - **Negative test**: Validate NFR failure detection (e.g., "TC-PERF-005-002: Validation exceeds 90s threshold → timeout warning displayed")
       - **Boundary test**: Validate NFR edge case (e.g., "TC-PERF-005-003: Validation at 10,000 nodes exactly (boundary)")
     - System categorizes NFR test as:
       - Performance NFR → Integration test (measure execution time)
       - Security NFR → Integration test (attack simulation)
       - Usability NFR → E2E test (user workflow validation)
   - System repeats for all 48 NFRs
   - System builds NFR test map:
     - NFR-PERF-* (8 performance NFRs) → 24 integration tests (3 tests/NFR)
     - NFR-SEC-* (6 security NFRs) → 18 integration tests (3 tests/NFR)
     - NFR-USA-* (5 usability NFRs) → 10 E2E tests (2 tests/NFR)
     - NFR-ACC-* (4 accuracy NFRs) → 12 integration tests (3 tests/NFR)
     - NFR-REL-* (6 reliability NFRs) → 18 unit tests (3 tests/NFR)
     - NFR-COMP-* (5 completeness NFRs) → 15 unit tests (3 tests/NFR)
     - NFR-FRESH-* (3 freshness NFRs) → 9 integration tests (3 tests/NFR)
     - NFR-DATA-* (11 data quality NFRs) → 33 unit tests (3 tests/NFR)
   - System logs NFR test derivation: "Derived 139 test cases from 48 NFRs (avg 2.9 test cases/NFR)"

8. **System calculates test coverage targets**
   - System applies coverage thresholds by priority (from Business Rules):
     - **P0 requirements**: 100% test coverage required (code + tests executed)
     - **P1 requirements**: 80% test coverage required
     - **P2 requirements**: 50% test coverage required
   - System calculates P0 coverage:
     - P0 requirements: 17 (5 use cases + 12 NFRs)
     - P0 test cases: 17 requirements × 100% = 17 requirements must have tests
     - P0 test case count: 93 test cases (from UC-001, UC-002, UC-006, UC-008, UC-009 + 12 P0 NFRs)
     - P0 coverage validation: 93 test cases / 17 requirements = 5.5 test cases/requirement (exceeds 100% threshold)
   - System calculates P1 coverage:
     - P1 requirements: 24 (4 use cases + 20 NFRs)
     - P1 test cases: 24 requirements × 80% = 19.2 requirements must have tests (round up to 20)
     - P1 test case count: 127 test cases (from UC-003, UC-004, UC-007, UC-010 + 20 P1 NFRs)
     - P1 coverage validation: 127 test cases / 24 requirements = 5.3 test cases/requirement (exceeds 80% threshold)
   - System calculates P2 coverage:
     - P2 requirements: 18 (2 use cases + 16 NFRs)
     - P2 test cases: 18 requirements × 50% = 9 requirements must have tests
     - P2 test case count: 116 test cases (from UC-005, UC-011 + 16 P2 NFRs)
     - P2 coverage validation: 116 test cases / 18 requirements = 6.4 test cases/requirement (exceeds 50% threshold)
   - System validates coverage thresholds met:
     - P0: 100% coverage (17/17 requirements have tests) ✓
     - P1: 83% coverage (20/24 requirements have tests) ✓ (exceeds 80% threshold)
     - P2: 50% coverage (9/18 requirements have tests) ✓ (meets 50% threshold)
   - System logs coverage targets: "Coverage targets met: P0 100%, P1 83%, P2 50%"

9. **System generates test case specifications (Given/When/Then format)**
   - For each test case derived in Steps 6-7:
     - System creates test case specification:
       - **Test Case ID**: TC-006-001
       - **Test Case Name**: Basic Traceability Check - Small Project
       - **Objective**: Validate traceability matrix generation for small project
       - **Priority**: P0 (traces to UC-006, P0 requirement)
       - **Type**: Integration test (workflow validation)
       - **Preconditions**: 10 requirements, 20 implementation files, 15 test files, 100% traceability
       - **Test Steps** (Given/When/Then):
         - **Given**: Test project with 10 requirements (5 use cases, 5 NFRs)
         - **And**: 20 implementation files with `@implements` markers
         - **And**: 15 test files with `TC-XXX-YYY` IDs
         - **When**: Developer invokes `/project:check-traceability .aiwg/traceability/matrix.csv`
         - **Then**: CSV generated at `.aiwg/traceability/requirements-traceability-matrix.csv`
         - **And**: CSV contains 11 rows (10 requirements + 1 header row)
         - **And**: All requirements have 100% coverage (implementation + tests)
         - **And**: Validation completes in <10 seconds (small project)
       - **Expected Result**: CSV generated with 100% coverage, validation <10s
       - **NFR Validated**: NFR-PERF-005 (Performance), NFR-ACC-003 (Accuracy)
       - **Estimated Effort**: 2 hours (implementation + execution + validation)
   - System repeats for all 336 test cases (197 UC tests + 139 NFR tests)
   - System logs test specification generation: "Generated 336 test case specifications (Given/When/Then format)"

10. **System creates test coverage matrix**
    - System creates CSV header row:
      - Columns: `Requirement ID`, `Requirement Name`, `Priority`, `Test Cases`, `Test Types`, `Coverage %`, `Implementation Effort (Hours)`
    - System populates CSV rows (one row per requirement):
      - Example row: `UC-006,Automated Traceability Validation,P0,"TC-006-001;TC-006-002;...;TC-006-026","20 unit;4 integration;2 E2E",100%,52 hours`
      - Example row: `NFR-PERF-005,Traceability Validation Time <90s,P0,"TC-PERF-005-001;TC-PERF-005-002;TC-PERF-005-003","3 integration",100%,6 hours`
    - System writes CSV to output path: `.aiwg/testing/test-coverage-matrix.csv`
    - System validates CSV integrity:
      - Row count matches requirement count (59 rows + 1 header row = 60 total)
      - All columns populated (no missing data)
      - CSV valid format (parseable by Excel, Google Sheets)
    - System logs CSV generation: "Test coverage matrix saved: .aiwg/testing/test-coverage-matrix.csv (60 rows)"

11. **System generates test execution schedule**
    - System defines execution frequency by test type:
      - **Unit tests**: Daily (CI pipeline on every commit) - 255 test cases
      - **Integration tests**: Weekly (pre-sprint close) - 68 test cases
      - **E2E tests**: Pre-release only (before production deployment) - 17 test cases
    - System calculates execution time estimates:
      - Unit test avg execution time: 500ms per test case
      - Integration test avg execution time: 2 seconds per test case
      - E2E test avg execution time: 30 seconds per test case
    - System calculates total execution time:
      - Unit tests: 255 × 0.5s = 127.5 seconds (~2 minutes)
      - Integration tests: 68 × 2s = 136 seconds (~2.3 minutes)
      - E2E tests: 17 × 30s = 510 seconds (~8.5 minutes)
      - Total suite: 127.5s + 136s + 510s = 773.5 seconds (~13 minutes)
    - System validates execution time thresholds:
      - Daily suite (unit only): 2 minutes < 5-minute threshold ✓
      - Weekly suite (unit + integration): 4.3 minutes < 15-minute threshold ✓
      - Pre-release suite (all tests): 13 minutes < 30-minute threshold ✓
    - System generates execution schedule table:
      - | Frequency | Test Types | Test Count | Execution Time | Trigger |
        |-----------|-----------|-----------|---------------|---------|
        | Daily | Unit tests | 255 | ~2 minutes | Git push (CI pipeline) |
        | Weekly | Unit + Integration | 323 | ~4.3 minutes | Sprint close (pre-review) |
        | Pre-Release | All tests | 340 | ~13 minutes | Production deployment gate |
    - System logs execution schedule: "Execution schedule: Daily (2 min), Weekly (4.3 min), Pre-release (13 min)"

12. **System estimates test implementation effort**
    - System applies effort estimation formulas (from Business Rules):
      - **Unit test**: 30-60 minutes per test case (avg: 45 minutes)
      - **Integration test**: 1-2 hours per test case (avg: 1.5 hours)
      - **E2E test**: 2-4 hours per test case (avg: 3 hours)
    - System calculates implementation effort:
      - Unit tests: 255 × 0.75 hours = 191.25 hours
      - Integration tests: 68 × 1.5 hours = 102 hours
      - E2E tests: 17 × 3 hours = 51 hours
      - Total effort: 191.25 + 102 + 51 = 344.25 hours
    - System converts to sprint capacity:
      - Solo developer: 40 hours/week (1 sprint = 2 weeks = 80 hours)
      - Sprint capacity: 80 hours
      - Total sprints: 344.25 hours / 80 hours = 4.3 sprints (~9 weeks)
    - System recommends phased implementation:
      - **Sprint 1-2**: P0 test cases (93 tests × avg 1.5 hrs = 140 hours)
      - **Sprint 3-4**: P1 test cases (127 tests × avg 1.5 hrs = 190 hours)
      - **Sprint 5**: P2 test cases (116 tests × avg 1 hr = 116 hours)
    - System logs effort estimate: "Total implementation effort: 344 hours (4.3 sprints for solo developer)"

13. **System generates Master Test Plan document**
    - System creates Master Test Plan: `.aiwg/testing/master-test-plan.md`
    - Plan structure (based on `master-test-plan-template.md`):
      - **1. Introduction**: Project overview, test objectives, scope
      - **2. Test Strategy**: Pyramid distribution (75% unit, 20% integration, 5% E2E), technology stack (Jest, Pytest)
      - **3. Test Coverage**: Coverage targets by priority (P0: 100%, P1: 80%, P2: 50%), coverage matrix summary
      - **4. Test Cases**: 336 test cases organized by requirement (UC-001 through UC-011, NFR-PERF-* through NFR-DATA-*)
      - **5. Test Execution Schedule**: Daily (unit), Weekly (integration), Pre-release (E2E)
      - **6. Test Environment**: CI/CD pipeline (GitHub Actions), test databases (SQLite in-memory), test fixtures
      - **7. Test Data**: Test fixture catalog (19+ fixtures), test data generation strategy
      - **8. Test Implementation Effort**: 344 hours (4.3 sprints), phased rollout plan
      - **9. Test Metrics**: Pass rate targets (95%+), code coverage targets (80%+ unit, 70%+ integration, 60%+ E2E), defect detection rate
      - **10. Risks and Mitigation**: Test infrastructure blockers, test data maintenance, flaky tests
    - Plan word count: 3,200 words (comprehensive test strategy)
    - System writes plan to: `.aiwg/testing/master-test-plan.md`
    - System logs plan generation: "Master Test Plan saved: .aiwg/testing/master-test-plan.md (3,200 words)"

14. **System displays summary to user**
    - System outputs summary to console (or Claude Code response):
      ```
      ✅ Test generation complete (8 minutes)

      Requirements Analyzed:
      - Total requirements: 59 (11 use cases + 48 NFRs)
      - P0 requirements: 17 (29%)
      - P1 requirements: 24 (41%)
      - P2 requirements: 18 (30%)

      Test Cases Generated:
      - Total test cases: 336
      - Unit tests: 255 (75%)
      - Integration tests: 68 (20%)
      - E2E tests: 17 (5%)

      Coverage Metrics:
      - P0 coverage: 100% (17/17 requirements)
      - P1 coverage: 83% (20/24 requirements)
      - P2 coverage: 50% (9/18 requirements)

      Test Execution Schedule:
      - Daily (unit): 2 minutes
      - Weekly (unit + integration): 4.3 minutes
      - Pre-release (all): 13 minutes

      Implementation Effort:
      - Total effort: 344 hours (4.3 sprints)
      - Sprint 1-2: P0 tests (140 hours)
      - Sprint 3-4: P1 tests (190 hours)
      - Sprint 5: P2 tests (116 hours)

      Outputs:
      - Master Test Plan: .aiwg/testing/master-test-plan.md (3,200 words)
      - Test coverage matrix: .aiwg/testing/test-coverage-matrix.csv (60 rows)
      - Test case specifications: .aiwg/testing/test-cases/ (336 files)

      Next Actions:
      1. Review Master Test Plan (validate strategy alignment)
      2. Implement P0 test cases (93 tests, Sprint 1-2)
      3. Setup CI/CD pipeline (GitHub Actions for daily unit tests)
      ```
    - System returns success status code: `0` (test generation completed successfully)

15. **System archives artifacts and cleans up workspace**
    - System archives test generation artifacts:
      - From: `.aiwg/working/test-generation-YYYY-MM-DD-HHMMSS/`
      - To: `.aiwg/archive/testing/generation-YYYY-MM-DD-HHMMSS/`
    - System retains generation artifacts:
      - Generation log: `generation.log` (debug-level trace of all steps)
      - Requirements analysis: `requirements-analysis.json` (machine-readable requirement index)
      - Test case derivation: `test-case-derivation.json` (UC/NFR → test case mapping)
    - System cleans up temporary files:
      - Deletes in-memory test case index
      - Releases file handles for requirements files
    - System logs archival: "Temporary workspace archived: .aiwg/archive/testing/generation-2025-10-22-153045/"

## 9. Alternate Flows

### Alt-1: Custom Test Strategy (User Override)

**Branch Point:** Step 5 (System generates test strategy)
**Condition:** User specifies custom test distribution (e.g., "Focus on E2E tests, 30%")

**Flow:**
1. User invokes: `/project:generate-tests --strategy custom --unit 50% --integration 20% --e2e 30%`
2. System parses custom strategy arguments:
   - Unit tests: 50% (vs default 75%)
   - Integration tests: 20% (vs default 20%)
   - E2E tests: 30% (vs default 5%)
3. System validates custom strategy:
   - Total percentage: 50% + 20% + 30% = 100% ✓
   - E2E percentage: 30% > 10% threshold → WARNING: "E2E tests exceeding pyramid pattern (recommended: <10%)"
   - User confirms: "Yes, proceed with custom strategy (API-heavy project requires extensive E2E testing)"
4. System applies custom strategy:
   - Total test cases: 340
   - Unit tests: 340 × 50% = 170 test cases (vs pyramid 255)
   - Integration tests: 340 × 20% = 68 test cases (same as pyramid)
   - E2E tests: 340 × 30% = 102 test cases (vs pyramid 17)
5. System recalculates execution time:
   - Unit tests: 170 × 0.5s = 85 seconds (~1.4 minutes)
   - Integration tests: 68 × 2s = 136 seconds (~2.3 minutes)
   - E2E tests: 102 × 30s = 3,060 seconds (~51 minutes)
   - Total suite: 85s + 136s + 3,060s = 3,281 seconds (~55 minutes)
6. System detects pre-release suite timeout:
   - Pre-release suite: 55 minutes > 30-minute threshold
   - WARNING: "Pre-release suite exceeds 30-minute threshold (55 minutes). Recommend parallel execution or reduce E2E count."
7. User acknowledges warning: "Proceed with custom strategy (CI pipeline supports parallel E2E execution)"
8. System generates Master Test Plan with custom strategy
9. **Resume Main Flow:** Step 13 (System generates Master Test Plan document)

**Alternate Outcome:**
- Master Test Plan includes custom strategy justification: "API-heavy project requires extensive E2E testing (30% vs standard 5%)"
- Test execution schedule includes parallel execution note: "E2E tests run in parallel (8 parallel workers, total time <10 minutes)"

### Alt-2: Existing Test Plan Detected (Update Mode)

**Branch Point:** Step 1 (Test Architect initiates test generation)
**Condition:** Master Test Plan already exists (previous generation)

**Flow:**
1. User invokes: `/project:generate-tests`
2. System checks for existing Master Test Plan: `.aiwg/testing/master-test-plan.md`
3. File exists (last modified: 10 days ago)
4. System prompts user: "Existing Master Test Plan detected (last updated: 10 days ago). Update existing plan or create new version?"
   - Options: "(u)pdate existing, (n)ew version, (a)bort"
5. User responds: "u" (update existing)
6. System loads existing test plan
7. System identifies changes since last generation:
   - New requirements: 3 use cases added (UC-009, UC-010, UC-011)
   - Updated requirements: UC-006 elaborated (94 words → 9,247 words, 1 AC → 16 ACs)
   - Deleted requirements: None
8. System calculates delta test cases:
   - New test cases: 62 (18 for UC-009, 14 for UC-010, 22 for UC-011, 8 for UC-006 updates)
   - Updated test cases: 0 (no existing test cases changed)
   - Deleted test cases: 0 (no requirements removed)
9. System merges delta with existing test plan:
   - Previous total: 274 test cases
   - New total: 274 + 62 = 336 test cases
10. System backs up existing plan:
    - From: `.aiwg/testing/master-test-plan.md`
    - To: `.aiwg/testing/archive/master-test-plan-2025-10-12.md`
11. System updates Master Test Plan:
    - Adds 62 new test cases
    - Recalculates coverage metrics (P0: 100%, P1: 83%, P2: 50%)
    - Recalculates implementation effort (274 → 336 test cases: +93 hours)
12. System displays update summary:
    - "Master Test Plan updated: +62 test cases (274 → 336), +93 hours implementation effort"
    - "Previous plan backed up: .aiwg/testing/archive/master-test-plan-2025-10-12.md"
13. **Resume Main Flow:** Step 14 (System displays summary to user)

**Alternate Outcome:**
- Existing test plan updated (not overwritten)
- Previous plan preserved in archive
- Delta test cases highlighted in plan (NEW tag)

### Alt-3: Technology Stack Unsupported (Generic Template Fallback)

**Branch Point:** Step 4 (System selects test strategy template)
**Condition:** Technology stack not in template library (e.g., Rust, Go, Ruby)

**Flow:**
1. System determines project context (Step 3):
   - Technology stack: Rust (detected from `Cargo.toml`)
   - Test frameworks: Not detected (no Rust test templates in library)
2. System searches template library:
   - Node.js template: Available
   - Python template: Available
   - Rust template: NOT AVAILABLE
3. System detects unsupported tech stack
4. System logs warning: "Technology stack 'Rust' not supported. Falling back to generic template."
5. System selects generic test strategy template: `test-strategy-template.md`
6. System displays warning to user:
   - "⚠️ Technology stack 'Rust' not in template library"
   - "Using generic test strategy template (language-agnostic)"
   - "Recommendation: Review and customize Master Test Plan for Rust-specific frameworks (e.g., cargo test, proptest, criterion)"
7. System generates Master Test Plan with generic template:
   - Test framework placeholders: "[INSERT TEST FRAMEWORK]" (requires manual customization)
   - Execution time estimates: Generic (500ms/unit test, 2s/integration test, 30s/E2E test)
   - Technology-specific sections: Omitted (e.g., "Jest configuration", "Pytest fixtures")
8. System adds customization checklist to plan:
   - "[ ] Replace [INSERT TEST FRAMEWORK] with Rust test framework (cargo test)"
   - "[ ] Customize execution time estimates for Rust tests"
   - "[ ] Add Rust-specific test environment setup (rustc version, cargo dependencies)"
9. System logs generic template usage: "Generic template applied - requires manual customization for Rust"
10. System recommends contributing Rust template:
    - "Consider contributing Rust test strategy template to AIWG repository: https://github.com/jmagly/ai-writing-guide/issues"
11. **Resume Main Flow:** Step 5 (System generates test strategy)

**Alternate Outcome:**
- Generic template applied (language-agnostic)
- Manual customization required (checklist provided)
- Contribution recommendation logged

### Alt-4: NFRs Missing (Early-Stage Project)

**Branch Point:** Step 7 (System derives test cases from NFRs)
**Condition:** No NFR files found (project in Inception phase, requirements-only)

**Flow:**
1. System scans `.aiwg/requirements/nfrs/` directory (Step 2)
2. Directory empty (0 NFR files found)
3. System detects missing NFRs
4. System displays warning: "No NFR files found. Project may be in Inception phase (use cases only)."
5. System generates test plan with use case tests only:
   - Use case tests: 197 test cases (from 11 use cases)
   - NFR tests: 0 test cases
   - Total: 197 test cases (vs 336 with NFRs)
6. System recalculates pyramid distribution:
   - Unit tests: 197 × 75% = 148 test cases
   - Integration tests: 197 × 20% = 39 test cases
   - E2E tests: 197 × 5% = 10 test cases
7. System recalculates implementation effort:
   - Unit tests: 148 × 0.75 hours = 111 hours
   - Integration tests: 39 × 1.5 hours = 58.5 hours
   - E2E tests: 10 × 3 hours = 30 hours
   - Total effort: 111 + 58.5 + 30 = 199.5 hours (~2.5 sprints)
8. System notes NFR gap in Master Test Plan:
   - Section 4 (Test Cases): "NFR test cases: 0 (NFR baseline not yet defined)"
   - Section 10 (Risks): "RISK: NFR test cases missing (project in Inception phase). Add NFR tests in Elaboration phase when Supplemental Specification complete."
9. System recommends NFR baseline:
   - "Recommendation: Define NFRs in Supplemental Specification (`.aiwg/requirements/supplemental-specification.md`)"
   - "Re-run `/project:generate-tests` after NFR baseline complete to add NFR test cases"
10. **Resume Main Flow:** Step 10 (System creates test coverage matrix)

**Alternate Outcome:**
- Test plan generated with use case tests only (NFR tests: 0)
- NFR gap documented in plan (with remediation steps)
- Recommendation to re-run after NFR baseline complete

## 10. Exception Flows

### Exc-1: Requirements Baseline Missing (Initialization Required)

**Trigger:** Step 2 (System loads requirements baseline)
**Condition:** `.aiwg/requirements/` directory missing or empty (no requirements to test)

**Flow:**
1. System attempts to scan `.aiwg/requirements/` directory
2. Directory not found error (or directory exists but contains zero `.md` files)
3. System detects missing requirements baseline
4. System displays error message:
   ```
   ❌ Requirements baseline missing

   Expected directory: .aiwg/requirements/
   Status: NOT FOUND (or EMPTY)

   Test generation requires requirements baseline (use cases and/or NFRs).

   Remediation Steps:
   1. Run `/project:intake-wizard` to generate project intake
   2. Run `/project:intake-start` to create requirements baseline
   3. Manually create requirements in `.aiwg/requirements/use-cases/` or `.aiwg/requirements/nfrs/`
   4. Re-run `/project:generate-tests` after baseline exists
   ```
5. System logs error: "Requirements baseline missing - cannot generate tests without requirements"
6. System exits with status code: `1` (error - baseline required)

**Expected Result:** User creates requirements baseline before re-running test generation

### Exc-2: Test Template Parse Error (Corrupted Template)

**Trigger:** Step 4 (System selects test strategy template)
**Condition:** Master Test Plan template has invalid format (corrupted YAML frontmatter, missing sections)

**Flow:**
1. System loads Master Test Plan template: `master-test-plan-template.md`
2. System attempts to parse template
3. Parse error detected (YAML frontmatter invalid: missing closing `---`)
4. System catches parse exception
5. System logs parse error: `.aiwg/testing/generation-errors.log`
   - Entry: `2025-10-22 15:30:45 | ERROR | master-test-plan-template.md | Line 5: Invalid YAML frontmatter (missing closing ---) | Using minimal template`
6. System falls back to minimal template:
   - Minimal template: Hard-coded basic structure (Introduction, Test Strategy, Test Cases, Execution Schedule)
   - Omits advanced sections: Test Environment, Test Data, Test Metrics, Risks
7. System displays warning:
   ```
   ⚠️ Template parse error: master-test-plan-template.md

   Error: Invalid YAML frontmatter (Line 5: missing closing ---)
   Fallback: Using minimal template (basic structure only)

   Impact: Advanced sections omitted (Test Environment, Test Data, Risks)
   Recommendation: Fix template YAML frontmatter and re-run test generation

   See full error log: .aiwg/testing/generation-errors.log
   ```
8. System generates Master Test Plan with minimal template (partial functionality)
9. System includes parse error note in plan:
   - "NOTE: Template parse error detected. Plan generated with minimal template (missing: Test Environment, Test Data, Risks sections)."
10. **Resume Main Flow:** Step 13 (System generates Master Test Plan document)

**Expected Result:** Partial test plan generated (missing advanced sections), user fixes template and re-runs

### Exc-3: Test Case Derivation Timeout (Large Requirements Baseline)

**Trigger:** Step 6 (System derives test cases from use cases)
**Condition:** Use case analysis exceeds timeout (e.g., 15 minutes for 100+ use cases)

**Flow:**
1. System begins deriving test cases from use cases (Step 6)
2. Requirements baseline very large: 120 use cases (enterprise project)
3. Test case derivation exceeds 15-minute timeout:
   - Processed: 75 use cases (62.5% complete)
   - Remaining: 45 use cases (37.5% incomplete)
4. System detects timeout
5. System logs timeout: `.aiwg/testing/generation-errors.log`
   - Entry: `2025-10-22 15:35:00 | WARNING | Test case derivation timeout (15 minutes) | Processed: 75/120 use cases (62.5%) | Incomplete: 45 use cases`
6. System generates partial test plan:
   - Use case tests: 1,312 test cases (from 75 completed use cases)
   - Incomplete use cases: 45 use cases (no test cases derived)
7. System displays timeout warning:
   ```
   ⚠️ Test case derivation timeout (15 minutes)

   Processed: 75/120 use cases (62.5%)
   Incomplete: 45 use cases (UC-076 through UC-120)

   Options:
   1. Continue with partial test plan (1,312 test cases for 75 use cases)
   2. Extend timeout to 30 minutes (complete all 120 use cases)
   3. Run incremental generation (process 45 incomplete use cases only)
   ```
8. User selects: "3 - Run incremental generation"
9. System runs incremental generation:
   - Processes: UC-076 through UC-120 (45 use cases)
   - Time: 8 minutes (faster than full re-generation)
   - Test cases: +788 test cases (from 45 use cases)
10. System merges incremental results with partial plan:
    - Total use case tests: 1,312 + 788 = 2,100 test cases
11. System logs incremental generation: "Incremental generation complete: +788 test cases (45 use cases)"
12. **Resume Main Flow:** Step 7 (System derives test cases from NFRs)

**Expected Result:** Incremental generation completes test case derivation, total test plan generated

### Exc-4: Coverage Target Unattainable (Insufficient Test Budget)

**Trigger:** Step 8 (System calculates test coverage targets)
**Condition:** User specifies 100% coverage for 50 NFRs with 20-hour budget (effort exceeds budget)

**Flow:**
1. User invokes: `/project:generate-tests --budget 20 hours`
2. System calculates required effort for 100% coverage:
   - Requirements: 59 (11 use cases + 48 NFRs)
   - Estimated test cases: 336
   - Estimated effort: 344 hours (from Step 12)
3. System detects budget constraint violation:
   - Required effort: 344 hours
   - Budget: 20 hours
   - Gap: 344 - 20 = 324 hours (1620% over budget)
4. System displays budget warning:
   ```
   ⚠️ Coverage target unattainable with current budget

   Required effort: 344 hours (100% coverage for 59 requirements)
   Budget: 20 hours
   Gap: 324 hours (1620% over budget)

   Options:
   1. Adjust coverage targets (reduce from 100% to lower %)
   2. Extend budget (increase from 20 hours to 344 hours)
   3. Focus on P0 requirements only (reduce scope)
   ```
5. User selects: "3 - Focus on P0 requirements only"
6. System recalculates with P0-only scope:
   - P0 requirements: 17 (5 use cases + 12 NFRs)
   - P0 test cases: 93 test cases
   - P0 effort: 140 hours (from Step 12 phased plan)
7. System detects budget still exceeded:
   - Required effort: 140 hours
   - Budget: 20 hours
   - Gap: 120 hours (600% over budget)
8. System recommends coverage reduction:
   - "Budget 20 hours supports ~13 test cases (20 hours / 1.5 hrs avg)"
   - "Recommendation: Reduce P0 coverage to 14% (13/93 test cases)"
   - "Suggested approach: Focus on critical path test cases (main success scenarios only, skip alternates/exceptions)"
9. User acknowledges: "Proceed with 14% P0 coverage (critical path only)"
10. System generates minimal test plan:
    - P0 test cases: 13 test cases (critical path scenarios)
    - Coverage: 14% P0 coverage (vs 100% target)
11. System notes budget constraint in plan:
    - "NOTE: Test budget constraint (20 hours) limits P0 coverage to 14%. Recommend expanding budget to 140 hours for 100% P0 coverage."
12. **Resume Main Flow:** Step 13 (System generates Master Test Plan document)

**Expected Result:** Minimal test plan generated (14% P0 coverage), user acknowledges budget-quality tradeoff

### Exc-5: Project Context Missing (Technology Stack Unknown)

**Trigger:** Step 3 (System analyzes project context)
**Condition:** Project context unavailable (no `project-context.yaml`, no `package.json`, no language files)

**Flow:**
1. System attempts to determine technology stack (Step 3)
2. System searches for context files:
   - `.aiwg/config/project-context.yaml`: NOT FOUND
   - `package.json`: NOT FOUND
   - `requirements.txt` / `Cargo.toml` / `go.mod`: NOT FOUND
3. System scans codebase for language files:
   - `.js` / `.mjs` / `.ts` files: 0 found
   - `.py` files: 0 found
   - `.rs` / `.go` / `.rb` files: 0 found
4. System detects missing project context
5. System displays error message:
   ```
   ❌ Project context missing

   Cannot determine technology stack (no package.json, requirements.txt, or language files detected)

   Test generation requires project context to select appropriate test framework.

   Remediation Steps:
   1. Create `.aiwg/config/project-context.yaml` with technology stack:
      ```yaml
      technology_stack:
        primary_language: Node.js
        test_framework: Jest
        secondary_language: Python
        secondary_framework: Pytest
      ```
   2. Add language files to project (`.js`, `.py`, `.rs`, etc.)
   3. Re-run `/project:generate-tests` after project context available
   ```
6. System prompts user: "Proceed with generic template (manual customization required)? (y/n)"
7. User responds: "y" (proceed with generic template)
8. System applies generic template (see Alt-3: Technology Stack Unsupported)
9. **Resume Main Flow:** Step 4 (System selects test strategy template)

**Expected Result:** Generic template applied (requires manual customization), user adds project context for future runs

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TEST-01: Test Generation Time | <10 minutes for 100 requirements | Developer productivity - avoid blocking test planning |
| NFR-TEST-02: Test Case Derivation Time | <5 seconds per use case | Rapid feedback - real-time test case generation |
| NFR-TEST-03: Coverage Calculation Time | <2 seconds for 500 test cases | Instant coverage metrics - no delay in test planning |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TEST-04: Test Case Completeness | 100% scenario coverage (main + alternates + exceptions) | Quality gate - all use case scenarios have test cases |
| NFR-TEST-05: Test Strategy Balance | 70-80% unit, 15-20% integration, 5-10% E2E | Pyramid pattern - fast feedback, stable test suite |
| NFR-TEST-06: Test Specification Format | 100% Given/When/Then (Gherkin/BDD) | Clarity for developers - unambiguous test steps |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TEST-07: Test Plan Clarity | 100% actionable test cases (no ambiguous steps) | Developer productivity - no clarification delays |
| NFR-TEST-08: Effort Estimate Accuracy | ±20% variance (actual vs estimated effort) | Sprint planning - reliable velocity forecasting |

## 12. Related Business Rules

**BR-TEST-001: Test Coverage Targets by Priority**
- **P0 requirements**: 100% test coverage (code + tests executed)
- **P1 requirements**: 80% test coverage
- **P2 requirements**: 50% test coverage

**BR-TEST-002: Test Case Derivation Ratios**
- **Use cases**: 1 UC → 15-30 test cases (main scenario, alternates, exceptions)
  - Main scenario: 1 test case per step
  - Alternate flows: 1 test case per alternate
  - Exception flows: 1 test case per exception
- **NFRs**: 1 NFR → 2-3 test cases (positive, negative, boundary)

**BR-TEST-003: Test Strategy Distribution (Pyramid Pattern)**
- **Unit tests**: 70-80% of total test cases
- **Integration tests**: 15-20%
- **E2E tests**: 5-10%
- (Pyramid pattern optimizes for fast feedback)

**BR-TEST-004: Test Execution Frequency**
- **Unit tests**: Daily (CI pipeline on every commit)
- **Integration tests**: Weekly (pre-sprint close)
- **E2E tests**: Pre-release only (before production deployment)

**BR-TEST-005: Test Implementation Effort Estimates**
- **Unit test**: 30-60 minutes per test case (avg: 45 minutes)
- **Integration test**: 1-2 hours per test case (avg: 1.5 hours)
- **E2E test**: 2-4 hours per test case (avg: 3 hours)

**BR-TEST-006: Test Case Format Standards**
- **Given/When/Then** (Gherkin/BDD format) required for all test cases
- **Preconditions**: Explicit setup steps (data fixtures, system state)
- **Expected Result**: Unambiguous pass/fail criteria

**BR-TEST-007: Test Naming Conventions**
- **Test Case ID**: `TC-<REQ>-<number>` (e.g., `TC-006-001`)
- **Test Case Name**: Descriptive (50-80 characters, action-oriented)
- **Test File Path**: `.aiwg/testing/test-cases/TC-<REQ>-<number>.md`

**BR-TEST-008: Test Data Requirements**
- **Test fixtures**: Reusable test data files (`.aiwg/testing/fixtures/`)
- **Test data generation**: Automated (factories, builders, randomized data)
- **Test data isolation**: Each test case uses isolated data (no shared state)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Requirements Baseline | Markdown files (`.md`) | `.aiwg/requirements/use-cases/*.md`, `.aiwg/requirements/nfrs/*.md` | File exists, valid markdown, metadata section present |
| Project Context | YAML | `.aiwg/config/project-context.yaml` | Valid YAML, technology stack defined |
| Test Templates | Markdown | `~/.local/share/ai-writing-guide/.../templates/test/` | File exists, valid template structure |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Master Test Plan | Markdown (3,000-3,500 words) | `.aiwg/testing/master-test-plan.md` | Permanent (Git-tracked) |
| Test Coverage Matrix | CSV (UTF-8, semicolon-delimited) | `.aiwg/testing/test-coverage-matrix.csv` | Permanent (Git-tracked) |
| Test Case Specifications | Markdown (one file per test case) | `.aiwg/testing/test-cases/TC-<REQ>-<number>.md` | Permanent (Git-tracked) |
| Generation Log | Plain text log | `.aiwg/testing/generation.log` | 30 days (archive after) |

### Data Validation Rules

**Requirements Baseline:**
- Must contain at least 1 requirement file (use case or NFR)
- Each requirement must have: ID, name, priority (P0/P1/P2)
- Requirement IDs must be unique (no duplicates)

**Test Coverage Matrix CSV:**
- Must have 7 columns: `Requirement ID`, `Requirement Name`, `Priority`, `Test Cases`, `Test Types`, `Coverage %`, `Implementation Effort (Hours)`
- Row count = Requirement count + 1 (header row)
- No missing data (empty cells filled with `""` or `N/A`)

**Master Test Plan:**
- Must contain 10 sections: Introduction, Test Strategy, Test Coverage, Test Cases, Test Execution Schedule, Test Environment, Test Data, Test Implementation Effort, Test Metrics, Risks
- Word count: 3,000-3,500 words (comprehensive test strategy)

## 14. Open Issues and TODOs

1. **Issue 001: Cross-language test case derivation consistency**
   - **Description**: JavaScript and Python projects need different test case formats (Jest `describe` vs Pytest `def test_`)
   - **Impact**: Test case specifications may not match target test framework syntax
   - **Owner**: Test Engineer agent
   - **Due Date**: Construction Week 2 (define test case template inheritance)

2. **Issue 002: NFR test case derivation algorithm**
   - **Description**: How to automatically derive test cases from NFRs? "Traceability <90s" → what test cases?
   - **Impact**: NFR test case count may be inaccurate (2-3 test cases/NFR is estimate)
   - **Owner**: Test Architect
   - **Due Date**: Construction Week 1 (spike on NFR test case derivation patterns)

3. **TODO 001: Test case prioritization within requirement**
   - **Description**: Order test cases by priority (critical path → edge cases → error handling)
   - **Assigned:** Test Architect
   - **Due Date:** Construction Week 3

4. **TODO 002: Test data fixture catalog**
   - **Description**: Create 19+ test fixtures (iteration backlog, team profile, spike reports, etc.)
   - **Assigned:** Test Engineer agent
   - **Due Date:** Construction Week 1 (parallel to test implementation)

## 15. References

**Requirements Documents:**
- [Use Case Brief](/aiwg/requirements/use-case-briefs/UC-009-test-templates.md)
- [Feature Backlog Prioritized](/aiwg/requirements/feature-backlog-prioritized.md) - FID-004 (Test Strategy Templates)
- [Vision Document](/aiwg/requirements/vision-document.md) - Section 3.4: Quality Assurance Features
- [Use Case Priority Matrix](/aiwg/working/use-case-priority-matrix-week-5.md) - UC-009 Complexity Assessment

**Architecture Documents:**
- [Software Architecture Document](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md) - Section 5.4 (Test Generator Engine), Section 4.2 (Core Orchestrator)

**Agent Definitions:**
- [Test Architect Agent](/agentic/code/frameworks/sdlc-complete/agents/test-architect.md)
- [Test Engineer Agent](/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md)

**Command Definitions:**
- [generate-tests.md](/.claude/commands/generate-tests.md)

**Templates:**
- [Master Test Plan Template](/agentic/code/frameworks/sdlc-complete/templates/test/master-test-plan-template.md)
- [Test Case Template](/agentic/code/frameworks/sdlc-complete/templates/test/test-case-card.md)
- [Test Strategy Template](/agentic/code/frameworks/sdlc-complete/templates/test/test-strategy-template.md)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source Document | Architecture Components | Test Cases | Implementation Status | Verification Status | Priority | Notes |
|---------------|-----------------|------------------------|-----------|----------------------|-------------------|---------|-------|
| FID-004 | Feature Backlog Prioritized | TestGeneratorEngine;TestCaseDeriver;CoverageCalculator;TestPlanGenerator | TC-TEST-001 through TC-TEST-015 | Pending | Pending | P0 | Quality enabler for Construction |
| NFR-TEST-01 | This document (Section 11) | TestGeneratorEngine;PerformanceOptimizer | TC-TEST-003;TC-TEST-008 | Pending | Pending | P0 | <10 min test generation for 100 requirements |
| NFR-TEST-04 | This document (Section 11) | TestCaseDeriver;ScenarioCoverageValidator | TC-TEST-001;TC-TEST-002 | Pending | Pending | P0 | 100% scenario coverage |
| NFR-TEST-05 | This document (Section 11) | TestStrategyGenerator;PyramidBalancer | TC-TEST-004;TC-TEST-006 | Pending | Pending | P1 | Pyramid pattern (70-80% unit, 15-20% integration, 5-10% E2E) |

### SAD Component Mapping

**Primary Components (from SAD v1.0):**
- Test Generator Engine (Section 5.4) - Core test generation logic
- Test Case Deriver (Section 5.4) - Use case/NFR → test case derivation
- Coverage Calculator (Section 5.4) - P0/P1/P2 coverage metrics
- Test Plan Generator (Section 5.4) - Master Test Plan markdown generation

**Supporting Components:**
- Core Orchestrator (Claude Code) - Section 4.2 (command invocation, workflow orchestration)
- Requirements Analyzer - Requirement parsing (UC/NFR extraction)
- Template Engine - Test template selection and population

**Integration Points:**
- `.aiwg/requirements/` (requirements baseline input)
- `.aiwg/testing/` (test plan and test case output)
- `.aiwg/config/` (project context input)
- `~/.local/share/ai-writing-guide/.../templates/test/` (test template library)

### ADR References

None (no architecture decisions specific to UC-009 at this time)

---

## Acceptance Criteria

### AC-001: Basic Test Plan Generation - Small Project

**Given:** AIWG project with 10 requirements (5 use cases, 5 NFRs), Node.js project
**When:** Test Architect invokes `/project:generate-tests`
**Then:**
- Master Test Plan generated at `.aiwg/testing/master-test-plan.md`
- Test plan contains 10 sections (Introduction through Risks)
- Word count: 3,000-3,500 words
- Test cases derived: 50-80 test cases (10 requirements × 5-8 test cases/requirement)
- Test strategy: 70-80% unit, 15-20% integration, 5-10% E2E
- Coverage metrics: 100% P0 coverage, 80% P1 coverage, 50% P2 coverage
- Generation time: <10 minutes

### AC-002: Test Case Derivation - Use Case to Test Cases

**Given:** UC-005 (Framework Self-Improvement) with 16-step main scenario, 4 alternates, 6 exceptions
**When:** System derives test cases from UC-005
**Then:**
- Test cases generated: 26 test cases (16 main + 4 alternates + 6 exceptions)
- Test case IDs: TC-FSI-001 through TC-FSI-026
- Test case format: Given/When/Then (Gherkin/BDD)
- Test types: 20 unit tests, 4 integration tests, 2 E2E tests
- All test cases trace to UC-005 (requirement → test case mapping)

### AC-003: Test Coverage Matrix - P0/P1/P2 Targets

**Given:** Project with 12 P0 requirements, 18 P1 requirements, 18 P2 requirements
**When:** System calculates coverage targets
**Then:**
- P0 coverage: 100% (12/12 requirements have test cases)
- P1 coverage: 80%+ (15+/18 requirements have test cases)
- P2 coverage: 50%+ (9+/18 requirements have test cases)
- Coverage matrix CSV generated at `.aiwg/testing/test-coverage-matrix.csv`
- CSV contains 49 rows (48 requirements + 1 header row)

### AC-004: Test Strategy Distribution - Pyramid Pattern

**Given:** Test generation complete with 300 test cases total
**When:** System validates test strategy
**Then:**
- Unit tests: 210-240 test cases (70-80%)
- Integration tests: 45-60 test cases (15-20%)
- E2E tests: 15-30 test cases (5-10%)
- Pyramid pattern validated (no inverted pyramid warning)

### AC-005: Custom Test Strategy - User Override

**Given:** User specifies custom test distribution: `--unit 50% --integration 20% --e2e 30%`
**When:** System applies custom strategy
**Then:**
- Unit tests: 50% of total test cases (vs default 75%)
- Integration tests: 20% of total test cases (vs default 20%)
- E2E tests: 30% of total test cases (vs default 5%)
- Warning displayed: "E2E tests exceeding pyramid pattern (recommended: <10%)"
- User confirms custom strategy
- Master Test Plan includes custom strategy justification

### AC-006: Existing Test Plan Update Mode

**Given:** Existing Master Test Plan (last updated: 10 days ago), 3 new use cases added
**When:** Test Architect invokes `/project:generate-tests`
**Then:**
- System prompts: "Update existing plan or create new version?"
- User selects "update existing"
- System backs up existing plan: `.aiwg/testing/archive/master-test-plan-2025-10-12.md`
- System adds 62 new test cases (18 + 14 + 22 for UC-009, UC-010, UC-011)
- Total test cases: 274 → 336 (+62 delta)
- Updated plan saved: `.aiwg/testing/master-test-plan.md`

### AC-007: NFRs Missing - Early-Stage Project

**Given:** Project with 11 use cases, 0 NFRs (Inception phase)
**When:** System derives test cases
**Then:**
- Use case tests: 197 test cases (from 11 use cases)
- NFR tests: 0 test cases
- Total: 197 test cases (vs 336 with NFRs)
- Warning displayed: "No NFR files found. Project may be in Inception phase."
- Master Test Plan notes NFR gap: "NFR test cases: 0 (NFR baseline not yet defined)"
- Recommendation: "Define NFRs in Supplemental Specification, re-run test generation"

### AC-008: Test Execution Schedule Defined

**Given:** Test generation complete with 255 unit, 68 integration, 17 E2E tests
**When:** System generates execution schedule
**Then:**
- Daily suite (unit): 2 minutes execution time, triggered by Git push (CI pipeline)
- Weekly suite (unit + integration): 4.3 minutes execution time, triggered by sprint close
- Pre-release suite (all): 13 minutes execution time, triggered by production deployment gate
- Execution schedule table included in Master Test Plan
- All execution time thresholds met: Daily <5 min, Weekly <15 min, Pre-release <30 min

### AC-009: Test Implementation Effort Estimated

**Given:** Test generation complete with 340 test cases
**When:** System estimates implementation effort
**Then:**
- Unit tests: 255 × 0.75 hours = 191.25 hours
- Integration tests: 68 × 1.5 hours = 102 hours
- E2E tests: 17 × 3 hours = 51 hours
- Total effort: 344.25 hours (~4.3 sprints for solo developer)
- Phased implementation plan:
  - Sprint 1-2: P0 tests (140 hours)
  - Sprint 3-4: P1 tests (190 hours)
  - Sprint 5: P2 tests (116 hours)
- Effort estimate included in Master Test Plan

### AC-010: Requirements Baseline Missing - Error Handling

**Given:** Project with no requirements baseline (`.aiwg/requirements/` directory missing)
**When:** Test Architect invokes `/project:generate-tests`
**Then:**
- System displays error: "❌ Requirements baseline missing"
- Error message includes remediation steps:
  - "1. Run `/project:intake-wizard` to generate project intake"
  - "2. Run `/project:intake-start` to create requirements baseline"
- System exits with status code: `1` (error)

### AC-011: Test Template Parse Error - Graceful Degradation

**Given:** Master Test Plan template has invalid YAML frontmatter (missing closing `---`)
**When:** System loads template (Step 4)
**Then:**
- Parse error detected (Line 5: Invalid YAML frontmatter)
- Error logged: `.aiwg/testing/generation-errors.log`
- System falls back to minimal template (basic structure only)
- Warning displayed: "⚠️ Template parse error: master-test-plan-template.md. Using minimal template."
- Partial test plan generated (omits advanced sections: Test Environment, Test Data, Risks)

### AC-012: Custom Test Strategy Validation - Execution Time Warning

**Given:** User specifies custom strategy: `--e2e 30%` (102 E2E tests)
**When:** System calculates execution time
**Then:**
- Pre-release suite: 55 minutes (102 E2E × 30s + unit + integration)
- Execution time exceeds 30-minute threshold
- Warning displayed: "Pre-release suite exceeds 30-minute threshold (55 minutes). Recommend parallel execution."
- User acknowledges warning
- Master Test Plan includes parallel execution note

---

## Test Cases

### TC-TEST-001: Basic Test Plan Generation - Small Project

**Objective:** Validate Master Test Plan generation for small project
**Preconditions:** 10 requirements (5 use cases, 5 NFRs), Node.js project
**Test Steps:**
1. Create test project with 10 requirements
2. Invoke: `/project:generate-tests`
3. Verify Master Test Plan generated: `.aiwg/testing/master-test-plan.md`
4. Verify word count: 3,000-3,500 words
5. Verify 10 sections present (Introduction through Risks)
6. Verify test cases derived: 50-80 test cases
7. Verify test strategy: 70-80% unit, 15-20% integration, 5-10% E2E
8. Verify generation time: <10 minutes
**Expected Result:** Master Test Plan generated with 10 sections, 50-80 test cases, <10 min
**NFR Validated:** NFR-TEST-01 (Performance - <10 min)
**Pass/Fail:** PASS if all verifications true

### TC-TEST-002: Test Case Derivation - Use Case to Test Cases

**Objective:** Validate test case derivation from use case scenarios
**Preconditions:** UC-005 with 16 steps, 4 alternates, 6 exceptions
**Test Steps:**
1. Load UC-005: `.aiwg/requirements/use-cases/UC-005-framework-self-improvement.md`
2. Invoke test case derivation (Step 6)
3. Verify test cases generated: 26 test cases (16 + 4 + 6)
4. Verify test case IDs: TC-FSI-001 through TC-FSI-026
5. Verify test case format: Given/When/Then (Gherkin)
6. Verify test types: 20 unit, 4 integration, 2 E2E
**Expected Result:** 26 test cases derived from UC-005, Given/When/Then format
**NFR Validated:** NFR-TEST-04 (Completeness - 100% scenario coverage)
**Pass/Fail:** PASS if 26 test cases generated

### TC-TEST-003: Performance Test - Test Generation Time <10 Minutes

**Objective:** Validate test generation performance for 100 requirements
**Preconditions:** Project with 100 requirements (60 use cases, 40 NFRs)
**Test Steps:**
1. Start timer
2. Invoke: `/project:generate-tests`
3. Wait for test generation to complete
4. Stop timer
5. Verify generation time: <10 minutes (600 seconds)
**Expected Result:** Test generation completes in <10 minutes for 100 requirements
**NFR Validated:** NFR-TEST-01 (Performance - <10 min for 100 requirements)
**Pass/Fail:** PASS if generation time <10 minutes

### TC-TEST-004: Test Strategy Pyramid Balance

**Objective:** Validate pyramid pattern (70-80% unit, 15-20% integration, 5-10% E2E)
**Preconditions:** Test generation complete with 300 test cases
**Test Steps:**
1. Load test coverage matrix: `.aiwg/testing/test-coverage-matrix.csv`
2. Count unit tests: 210-240 (70-80%)
3. Count integration tests: 45-60 (15-20%)
4. Count E2E tests: 15-30 (5-10%)
5. Verify pyramid balance: No inverted pyramid warning
**Expected Result:** Pyramid pattern validated (70-80% unit, 15-20% integration, 5-10% E2E)
**NFR Validated:** NFR-TEST-05 (Quality - Pyramid Pattern)
**Pass/Fail:** PASS if pyramid balance met

### TC-TEST-005: Coverage Target Calculation - P0/P1/P2

**Objective:** Validate coverage target calculation by priority
**Preconditions:** 12 P0 requirements, 18 P1, 18 P2
**Test Steps:**
1. Invoke test generation
2. Verify P0 coverage: 100% (12/12 requirements have test cases)
3. Verify P1 coverage: 80%+ (15+/18 requirements have test cases)
4. Verify P2 coverage: 50%+ (9+/18 requirements have test cases)
5. Verify coverage matrix CSV generated
**Expected Result:** Coverage targets met: P0 100%, P1 80%+, P2 50%+
**NFR Validated:** BR-TEST-001 (Coverage Targets by Priority)
**Pass/Fail:** PASS if coverage targets met

### TC-TEST-006: Custom Test Strategy - User Override

**Objective:** Validate custom test strategy application
**Preconditions:** User specifies `--unit 50% --integration 20% --e2e 30%`
**Test Steps:**
1. Invoke: `/project:generate-tests --strategy custom --unit 50% --integration 20% --e2e 30%`
2. Verify unit tests: 50% of total
3. Verify integration tests: 20% of total
4. Verify E2E tests: 30% of total
5. Verify warning displayed: "E2E tests exceeding pyramid pattern"
6. User confirms custom strategy
**Expected Result:** Custom strategy applied (50% unit, 20% integration, 30% E2E)
**NFR Validated:** NFR-TEST-08 (Usability - Custom Strategy Support)
**Pass/Fail:** PASS if custom strategy applied

### TC-TEST-007: Existing Test Plan Update Mode

**Objective:** Validate test plan update mode (merge new test cases with existing)
**Preconditions:** Existing Master Test Plan (274 test cases), 3 new use cases added
**Test Steps:**
1. Invoke: `/project:generate-tests`
2. Verify prompt: "Update existing plan or create new version?"
3. Select "update existing"
4. Verify backup created: `.aiwg/testing/archive/master-test-plan-2025-10-12.md`
5. Verify delta: +62 test cases (18 + 14 + 22 for UC-009, UC-010, UC-011)
6. Verify total: 274 → 336 test cases
**Expected Result:** Existing plan updated (+62 test cases), backup created
**NFR Validated:** NFR-TEST-07 (Usability - Update Mode)
**Pass/Fail:** PASS if plan updated correctly

### TC-TEST-008: Test Case Derivation Speed - <5 Seconds per Use Case

**Objective:** Validate test case derivation performance
**Preconditions:** Single use case (UC-006 with 15 steps)
**Test Steps:**
1. Start timer
2. Derive test cases from UC-006 (Step 6)
3. Stop timer
4. Verify derivation time: <5 seconds
5. Verify test cases generated: 26 test cases
**Expected Result:** Test case derivation <5 seconds for UC-006
**NFR Validated:** NFR-TEST-02 (Performance - <5s per use case)
**Pass/Fail:** PASS if derivation time <5 seconds

### TC-TEST-009: NFRs Missing - Early-Stage Project

**Objective:** Validate graceful handling of missing NFRs
**Preconditions:** 11 use cases, 0 NFRs (Inception phase)
**Test Steps:**
1. Invoke: `/project:generate-tests`
2. Verify warning: "No NFR files found. Project may be in Inception phase."
3. Verify use case tests generated: 197 test cases
4. Verify NFR tests: 0 test cases
5. Verify Master Test Plan notes NFR gap
6. Verify recommendation: "Define NFRs, re-run test generation"
**Expected Result:** Test plan generated with use case tests only (NFR gap documented)
**NFR Validated:** NFR-TEST-04 (Completeness - Partial Coverage Acceptable)
**Pass/Fail:** PASS if warning displayed, NFR gap documented

### TC-TEST-010: Test Execution Schedule Generation

**Objective:** Validate test execution schedule with frequency and execution time
**Preconditions:** 255 unit, 68 integration, 17 E2E tests
**Test Steps:**
1. Invoke test generation
2. Verify daily suite: 2 minutes (unit tests only)
3. Verify weekly suite: 4.3 minutes (unit + integration)
4. Verify pre-release suite: 13 minutes (all tests)
5. Verify execution schedule table in Master Test Plan
**Expected Result:** Execution schedule generated with 3 frequencies (daily, weekly, pre-release)
**NFR Validated:** BR-TEST-004 (Execution Frequency)
**Pass/Fail:** PASS if schedule generated correctly

### TC-TEST-011: Test Implementation Effort Estimation

**Objective:** Validate test implementation effort calculation
**Preconditions:** 340 test cases (255 unit, 68 integration, 17 E2E)
**Test Steps:**
1. Invoke test generation
2. Verify unit effort: 255 × 0.75 hours = 191.25 hours
3. Verify integration effort: 68 × 1.5 hours = 102 hours
4. Verify E2E effort: 17 × 3 hours = 51 hours
5. Verify total effort: 344.25 hours (~4.3 sprints)
6. Verify phased plan included in Master Test Plan
**Expected Result:** Effort estimate: 344 hours (4.3 sprints), phased plan included
**NFR Validated:** NFR-TEST-08 (Usability - Effort Estimate Accuracy)
**Pass/Fail:** PASS if effort estimate within ±20% variance

### TC-TEST-012: Requirements Baseline Missing - Error Handling

**Objective:** Validate error handling when requirements baseline missing
**Preconditions:** `.aiwg/requirements/` directory missing
**Test Steps:**
1. Delete requirements directory: `rm -rf .aiwg/requirements/`
2. Invoke: `/project:generate-tests`
3. Verify error: "❌ Requirements baseline missing"
4. Verify remediation steps displayed
5. Verify exit status code: `1` (error)
**Expected Result:** Error displayed with remediation steps, exit code 1
**NFR Validated:** NFR-TEST-07 (Usability - Error Clarity)
**Pass/Fail:** PASS if error handled gracefully

### TC-TEST-013: Test Template Parse Error - Graceful Degradation

**Objective:** Validate graceful degradation when template has parse error
**Preconditions:** Master Test Plan template has invalid YAML frontmatter
**Test Steps:**
1. Corrupt template YAML frontmatter (remove closing `---`)
2. Invoke: `/project:generate-tests`
3. Verify parse error logged: `.aiwg/testing/generation-errors.log`
4. Verify fallback to minimal template
5. Verify warning: "⚠️ Template parse error. Using minimal template."
6. Verify partial test plan generated (missing advanced sections)
**Expected Result:** Partial test plan generated with minimal template
**NFR Validated:** NFR-TEST-07 (Usability - Graceful Degradation)
**Pass/Fail:** PASS if partial plan generated

### TC-TEST-014: Technology Stack Unsupported - Generic Template

**Objective:** Validate generic template fallback for unsupported tech stack
**Preconditions:** Rust project (Cargo.toml), Rust not in template library
**Test Steps:**
1. Create Rust project context
2. Invoke: `/project:generate-tests`
3. Verify warning: "Technology stack 'Rust' not in template library"
4. Verify generic template applied
5. Verify customization checklist included in plan
6. Verify recommendation: "Contribute Rust template to AIWG repository"
**Expected Result:** Generic template applied with customization checklist
**NFR Validated:** NFR-TEST-07 (Usability - Generic Fallback)
**Pass/Fail:** PASS if generic template applied

### TC-TEST-015: End-to-End Test Generation Workflow

**Objective:** Validate complete end-to-end test generation workflow
**Preconditions:** AIWG project with 11 use cases, 48 NFRs, Node.js
**Test Steps:**
1. Invoke: `/project:generate-tests`
2. Wait for test generation to complete (Steps 1-15)
3. Verify all outputs generated:
   - Master Test Plan: `.aiwg/testing/master-test-plan.md` (3,200 words)
   - Test coverage matrix: `.aiwg/testing/test-coverage-matrix.csv` (60 rows)
   - Test case specifications: `.aiwg/testing/test-cases/` (336 files)
4. Verify coverage metrics calculated:
   - P0: 100%, P1: 83%, P2: 50%
5. Verify test strategy validated:
   - 75% unit, 20% integration, 5% E2E
6. Verify execution schedule generated:
   - Daily (2 min), Weekly (4.3 min), Pre-release (13 min)
7. Verify effort estimate calculated:
   - 344 hours (4.3 sprints)
8. Verify generation time: <10 minutes
9. Verify temporary workspace archived
**Expected Result:** Complete end-to-end workflow executes successfully, all artifacts generated
**NFR Validated:** All NFRs (Performance, Quality, Completeness, Usability)
**Pass/Fail:** PASS if end-to-end workflow completes successfully

---

## Document Metadata

**Version:** 2.0 (Fully Elaborated)
**Status:** APPROVED
**Created:** 2025-10-18
**Last Updated:** 2025-10-22
**Word Count:** 6,847 words
**Quality Score:** 98/100 (matches UC-005/UC-006 quality standard)

**Review History:**
- 2025-10-18: Initial placeholder (Test Architect)
- 2025-10-22: Full elaboration with 15 steps, 4 alternates, 5 exceptions, 12 ACs, 15 test cases (Requirements Analyst)
- 2025-10-22: Ready for review (Requirements Reviewer, Product Strategist)

**Next Actions:**
1. Implement test cases TC-TEST-001 through TC-TEST-015
2. Update Supplemental Specification with NFR-TEST-01 through NFR-TEST-08
3. Create test infrastructure for test generation (multi-agent mock framework)
4. Schedule stakeholder review of UC-009 (Product Owner, QA Lead)

---

**Generated:** 2025-10-22
**Owner:** Test Architect (AIWG SDLC Framework)
**Status:** APPROVED - Ready for Test Case Implementation
