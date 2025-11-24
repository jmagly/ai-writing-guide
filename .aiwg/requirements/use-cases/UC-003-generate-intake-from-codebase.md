# Use-Case Specification: UC-003

## Metadata

- ID: UC-003
- Name: Generate Intake Documents from Existing Codebase
- Owner: System Analyst
- Priority: P0 (Critical)
- Estimated Effort: S (from user perspective)
- Related: REQ-SDLC-003, REQ-SDLC-004, SAD Section 5.2

## 1. Use-Case Identifier

**ID:** UC-003
**Name:** Generate Intake Documents from Existing Codebase

## 2. Scope and Level

**Scope:** AIWG Intake System - Brownfield Project Support
**Level:** User Goal

## 3. Primary Actors

- Solo Developer (formalizing existing project)
- Technical Lead (inheriting legacy codebase)
- Project Manager (documenting undocumented system)

## 4. Preconditions

1. Existing codebase with git history (10+ commits)
2. SDLC commands deployed
3. Typical artifacts present (README.md, package.json, source code)

## 5. Postconditions

**Success:**
- 3 intake documents generated (project-intake.md, technical-intake.md, stakeholder-intake.md)
- 80-90% field accuracy (user edits <20%)
- Ready for Inception phase workflows

## 6. Trigger

User invokes: `/intake-from-codebase .`

## 7. Main Success Scenario

1. User navigates to project: `cd /path/to/existing-project`
2. User invokes: `/intake-from-codebase .`
3. Intake Coordinator agent analyzes codebase:
   - Git history (commit frequency, contributors, timeline)
   - Code structure (language, framework, patterns)
   - Dependencies (package.json, requirements.txt)
   - Documentation (README.md, wiki)
   - Issue tracker (if GitHub repo)
4. Agent generates 3 intake forms:
   - `project-intake.md` (vision, goals, stakeholders)
   - `technical-intake.md` (tech stack, architecture)
   - `stakeholder-intake.md` (personas, team structure)
5. Agent saves to `.aiwg/intake/`
6. User reviews (80-90% accuracy expected)
7. User optionally invokes interactive refinement: `/intake-from-codebase . --interactive`
8. Agent asks strategic questions to fill gaps
9. User validates: `/intake-start .aiwg/intake/`

## 8. Alternate Flows

### Alt-1: Interactive Refinement Mode

**Condition:** User wants guided refinement

**Flow:**
1. User runs: `/intake-from-codebase . --interactive`
2. Agent generates initial intake
3. Agent asks strategic questions:
   - "Primary business driver: cost reduction or new capability?"
   - "Compliance requirements: HIPAA, SOC2, GDPR?"
   - "Team skill level: junior, mid, senior?"
4. User answers questions
5. Agent refines intake based on answers
6. **Resume Main:** Step 6

### Alt-2: Guidance Parameter (Focus Areas)

**Condition:** User provides strategic guidance

**Flow:**
1. User runs: `/intake-from-codebase . --guidance "Focus on security posture, SOC2 audit in 3 months"`
2. Agent prioritizes security analysis:
   - Scans for HTTPS usage
   - Detects authentication patterns
   - Identifies data encryption
3. Agent generates security-focused intake
4. **Resume Main:** Step 5

## 9. Exception Flows

### Exc-1: Insufficient Git History

**Trigger:** Step 3
**Condition:** <10 commits in git history

**Flow:**
1. Agent analyzes git history
2. Detects only 5 commits
3. Agent warns: "Low confidence - sparse git history (<10 commits). Recommend manual intake."
4. User chooses: Continue with low-confidence or manual intake
5. If continue: Agent generates best-effort intake with confidence scores
6. **Resume Main:** Step 5

### Exc-2: Missing Documentation

**Trigger:** Step 3
**Condition:** No README.md, no package.json

**Flow:**
1. Agent attempts to read README.md
2. File not found
3. Agent flags low-confidence fields:
   - "Project Description: UNKNOWN (no README.md)"
   - "Tech Stack: Inferred from file extensions (low confidence)"
4. Agent prompts user for manual input via `--interactive`
5. **Resume Main:** Step 7

## 10. Special Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-IC-01: Analysis time | <5 minutes for 1000-file repos | User experience |
| NFR-IC-02: Field accuracy | 80-90% (user edits <20%) | Productivity |
| NFR-IC-03: Critical field coverage | 100% (name, tech stack, language) | Completeness |

## 11. Related Business Rules

**BR-IC-001: Confidence Scoring**
- High confidence (90%+): Git history rich, README detailed, standard project structure
- Medium confidence (70-89%): Some documentation missing, non-standard structure
- Low confidence (<70%): Sparse history, minimal documentation

**BR-IC-002: Interactive Refinement Triggers**
- Automatically triggered if confidence <70%
- User can manually trigger with `--interactive`

## 12. Data Requirements

### Input Data

| Element | Format | Source | Validation |
|---------|--------|--------|-----------|
| Codebase Path | String | CLI argument | Directory exists, has .git |
| Guidance Text | String | Optional flag | Free-form text |
| Interactive Mode | Boolean | Optional flag | True/False |

### Output Data

| Element | Format | Destination | Retention |
|---------|--------|-------------|----------|
| project-intake.md | Markdown | `.aiwg/intake/` | Persistent |
| technical-intake.md | Markdown | `.aiwg/intake/` | Persistent |
| stakeholder-intake.md | Markdown | `.aiwg/intake/` | Persistent |

## 13. Open Issues

1. **Issue 001: Multi-language codebase support**
   - How to handle polyglot projects (Python backend + React frontend)?
   - Owner: Intake Coordinator
   - Due: Elaboration phase

## 14. References

- [Use Case Brief](/aiwg/requirements/use-case-briefs/UC-003-generate-intake-from-codebase.md)
- [SAD Section 5.2](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md)
- [Intake Coordinator Agent](/agentic/code/frameworks/sdlc-complete/agents/intake-coordinator.md)

---

## Traceability Matrix

| Requirement | Source | Component | Test Case |
|------------|--------|-----------|-----------|
| REQ-SDLC-003 | Feature Backlog | intake-from-codebase.md | TC-IC-001 |
| NFR-IC-01 | This document | Codebase analyzer | TC-IC-002 |
| BR-IC-001 | This document | Confidence scoring | TC-IC-003 |

### SAD Component Mapping

**Primary:** Intake Coordinator Agent (SAD 5.2)
**Supporting:** Git analyzer, dependency parser, documentation scanner

---

## Acceptance Criteria

### AC-001: Basic Generation

**Given:** Existing project with 50+ commits, README.md, package.json
**When:** User runs `/intake-from-codebase .`
**Then:**
- 3 intake documents generated in <5 minutes
- Critical fields 100% populated (name, tech stack, language)
- 80%+ field accuracy (measured via user edit rate)

### AC-002: Interactive Refinement

**Given:** Generated intake with low-confidence fields
**When:** User runs `--interactive`
**Then:**
- Agent asks 3-5 strategic questions
- User answers questions
- Agent refines intake based on answers
- Confidence scores improve 10-20 points

### AC-003: Guidance Parameter

**Given:** User provides security focus guidance
**When:** User runs `--guidance "Focus on security, SOC2 audit"`
**Then:**
- Agent prioritizes security analysis
- Intake includes security posture assessment
- Compliance requirements highlighted

---

**Version:** 1.0
**Status:** APPROVED
**Created:** 2025-10-18
**Word Count:** 1,342 words
