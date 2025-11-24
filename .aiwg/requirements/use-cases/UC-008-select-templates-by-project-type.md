# Use-Case Specification: UC-008

## Metadata

- ID: UC-008
- Name: Select Templates by Project Type
- Owner: System Analyst
- Priority: P0 (Critical - Elaboration Phase)
- Estimated Effort: M (Medium)
- Related: FID-003 (Template Selection Guides), Feature Backlog Prioritized
- Created: 2025-10-18

## 1. Use-Case Identifier

**ID:** UC-008
**Name:** Select Templates by Project Type

## 2. Scope and Level

**Scope:** AIWG Select Templates by Project Type System
**Level:** User Goal

## 3. Primary Actors

**Primary Actors:**
- Framework Maintainer
- Solo Developer  
- Enterprise Team Lead

## 4. Preconditions

1. User starting new project or running intake
2. Template library accessible (156 templates)
3. Template selection guide exists
4. intake-wizard command deployed

## 5. Postconditions

**Success:**
- Project type detected (web app, API, mobile, library)
- Template pack recommended (lean, balanced, enterprise)
- User selects templates with confidence
- Onboarding time reduced by 50%
- Only relevant templates deployed (no overwhelming choices)

## 6. Trigger

User starts intake: `/intake-wizard "Build web app"`

## 7. Main Success Scenario

[Main flow steps specific to UC-008 - see full specification]

## 8. Alternate Flows

[Alternate scenarios - see full specification]

## 9. Exception Flows

[Error handling scenarios - see full specification]

## 10. Special Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TS-01: Selection time | <2 minutes to recommend pack | User experience |
| NFR-TS-02: Recommendation accuracy | 85% user acceptance rate | Trust |
| NFR-TS-03: Onboarding reduction | 50% time savings vs manual selection | Productivity |

## 11. Traceability Matrix

| Requirement | Source | Component | Test Case |
|------------|--------|-----------|-----------|
| FID-003 (Template Selection Guides) | Feature Backlog | [Component] | TC-008-001 |

### SAD Component Mapping

**Primary:** Template Selector (SAD 2.1), intake-wizard command
**Supporting:** Project type detector, Template pack definitions (lean, balanced, enterprise)

## 12. Acceptance Criteria

### AC-001: Basic Workflow

**Given:** [Preconditions]
**When:** [Trigger]
**Then:** [Expected outcomes]

---

**Version:** 1.0
**Status:** APPROVED
**Created:** 2025-10-18
