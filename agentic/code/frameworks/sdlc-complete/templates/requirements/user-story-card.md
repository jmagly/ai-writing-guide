---
template_id: user-story-card
version: 2.0.0
reasoning_required: true
---

# User Story Card

## Reasoning

> Complete this section BEFORE writing the detailed story. Per @.claude/rules/reasoning-sections.md

1. **User Need**: Why does the user need this capability?
   > [Describe the user's problem, pain point, or goal that this story addresses]

2. **Value Proposition**: What value does this deliver?
   > [Quantify business value: conversion, efficiency, retention, revenue impact]

3. **Acceptance Definition**: How will we know this is complete?
   > [Define the core pass/fail criteria that make this story testable]

4. **Implementation Consideration**: What technical approach is suggested?
   > [High-level technical direction, integration points, known constraints]

5. **Risk Identification**: What could prevent successful delivery?
   > [Identify dependencies, unknowns, technical risks, timeline concerns]

## Metadata

- **ID**: `US-{project}-{number}` (e.g., US-PLATFORM-042)
- **Type**: Requirement Card (User Story)
- **Status**: Draft | Ready | In Progress | Done | Rejected | Blocked
- **Owner**: Product Owner / Business Analyst
- **Contributors**: Development Team, UX Designer, Stakeholders
- **Reviewers**: Product Owner, Technical Lead
- **Team**: Development Team Name
- **Stakeholders**: Key business and user representatives
- **Created**: YYYY-MM-DD
- **Last Updated**: YYYY-MM-DD
- **Priority**: Critical | High | Medium | Low
- **Story Points**: Fibonacci (1, 2, 3, 5, 8, 13) or T-Shirt (XS, S, M, L, XL)
- **Sprint**: Sprint number or "Backlog"
- **Related**:
  - Epic: `EP-{project}-{number}`
  - Feature: `FEAT-{id}`
  - Requirements: `REQ-{id}`
  - Test Cases: `TC-{id}`
  - Tasks: `TASK-{id}`
  - Dependencies: `US-{id}` (upstream stories)
  - Architecture: `ADR-{id}`, `ARCH-{id}`

## Phase 1: Story Core (ESSENTIAL)

Complete these fields immediately when creating a user story:

### User Story Statement

**As a** [type of user/role/persona]
**I want** [capability/feature/action]
**So that** [business value/benefit/outcome]

<!-- EXAMPLE:
**As a** job seeker
**I want** to filter job listings by salary range
**So that** I only see jobs that meet my compensation expectations
-->

<!-- ANTI-PATTERN:
**As a** user
**I want** better search
**So that** things work better
(Too vague - specify user type, exact capability, measurable benefit)
-->

### Story Context

**Problem**: [Brief description of the problem or pain point this story addresses]

<!-- EXAMPLE: Job seekers waste time reviewing positions that don't meet their salary expectations, leading to frustration and abandonment of the job search process. -->

**Value**: [Why this matters to users and the business - quantify if possible]

<!-- EXAMPLE: Expected to reduce time-to-application by 40% and increase conversion rate by 15% based on competitor analysis and user research. -->

**Scope**: [What this story includes and explicitly excludes]

<!-- EXAMPLE:
INCLUDES: Salary range slider, real-time filtering, URL parameter persistence
EXCLUDES: Saving filters to user profile (separate story US-PLATFORM-044)
-->

**User Persona**: [Primary user type this story serves - link to persona if available]

<!-- EXAMPLE: Sarah the Career Changer - mid-career professional seeking new opportunities with specific compensation requirements -->

### INVEST Check

Before accepting this story for sprint planning, verify:

- [ ] **Independent**: Can be developed without depending on other stories in same sprint
- [ ] **Negotiable**: Details can be refined during implementation
- [ ] **Valuable**: Delivers value to users or business
- [ ] **Estimable**: Team can estimate effort required
- [ ] **Small**: Can complete in one sprint
- [ ] **Testable**: Clear pass/fail criteria

<!-- EXAMPLE:
✓ Independent: No dependencies on other current sprint stories
✓ Negotiable: Slider UI details can be refined with UX
✓ Valuable: Increases conversion by 15% (validated in prototype)
✓ Estimable: Team estimates 5 story points
✓ Small: Can complete in 3-5 days
✓ Testable: Clear acceptance criteria defined below
-->

## Phase 2: Acceptance Criteria (EXPAND WHEN READY)

<details>
<summary>Click to expand detailed acceptance criteria and test scenarios</summary>

Define clear, testable conditions that must be met for this story to be considered "done."

### Criterion 1: [Name of the behavior or capability]

**Given** [precondition/context/initial state]
**When** [action/event/user interaction]
**Then** [expected outcome/result]
**And** [additional outcome, if needed]

<!-- EXAMPLE:
### Criterion 1: Apply Salary Filter

**Given** I am viewing the job search page
**When** I adjust the salary range slider to $80K-$120K
**Then** the job list updates to show only positions within that range
**And** the URL updates with the filter parameter for bookmarking
-->

### Criterion 2: [Name of the behavior or capability]

**Given** [precondition/context]
**When** [action/event]
**Then** [expected outcome]

<!-- EXAMPLE:
### Criterion 2: Clear Salary Filter

**Given** I have applied a salary filter
**When** I click the "Clear Filters" button
**Then** the salary slider resets to full range (min-max)
**And** all jobs are displayed again
-->

### Criterion 3: [Edge Cases and Error Handling]

**Given** [error condition or boundary case]
**When** [triggering action]
**Then** [graceful handling or error message]

<!-- EXAMPLE:
### Criterion 3: No Results Found

**Given** no jobs exist in the selected salary range
**When** I apply the salary filter
**Then** the system displays "No jobs found - try adjusting your filters"
**And** the filter remains applied (no auto-reset)
-->

### Acceptance Criteria Checklist

- [ ] All happy path scenarios covered
- [ ] Edge cases and boundary conditions defined
- [ ] Error handling specified
- [ ] Performance expectations stated (if applicable)
- [ ] Security requirements included (if applicable)
- [ ] Accessibility requirements specified (if applicable)

</details>

## Phase 3: Technical Details (ADVANCED)

<details>
<summary>Click to expand technical considerations, NFRs, and implementation guidance</summary>

### Non-Functional Requirements

Constraints and quality attributes specific to this story:

#### Performance

- **Response Time**: [e.g., "Filter results update within 500ms"]

<!-- EXAMPLE: Filter results update within 500ms on median connection -->

- **Throughput**: [e.g., "Support 100 concurrent filter operations"]

<!-- EXAMPLE: Support 100 concurrent filter operations without degradation -->

- **Data Volume**: [e.g., "Handle up to 50,000 job listings"]

<!-- EXAMPLE: Handle up to 50,000 job listings efficiently -->

#### Security

- **Authentication**: [e.g., "No authentication required for public search"]

<!-- EXAMPLE: No authentication required for public job search -->

- **Authorization**: [e.g., "Premium filters require authenticated users"]

<!-- EXAMPLE: Basic salary filter available to all; advanced filters require login -->

- **Data Protection**: [e.g., "Do not log salary filter selections (PII)"]

<!-- EXAMPLE: Do not log salary filter values to analytics (potential PII) -->

#### Usability

- **User Experience**: [e.g., "Slider provides visual feedback during drag"]

<!-- EXAMPLE: Slider provides visual feedback during drag, with current range displayed -->

- **Accessibility**: [e.g., "WCAG 2.1 Level AA - keyboard navigable"]

<!-- EXAMPLE: WCAG 2.1 Level AA compliant - keyboard navigable, screen reader announced -->

- **Mobile**: [e.g., "Touch-friendly on screens >320px wide"]

<!-- EXAMPLE: Touch-friendly slider on screens ≥320px wide -->

#### Reliability

- **Uptime**: [e.g., "Degrades gracefully if search service is down"]

<!-- EXAMPLE: Show cached results if search service unavailable -->

- **Error Handling**: [e.g., "Display user-friendly error, not stack trace"]

<!-- EXAMPLE: Display user-friendly error messages, never expose stack traces -->

#### Scalability

- **Expected Load**: [e.g., "10,000 searches/day"]

<!-- EXAMPLE: Expected 10,000 filtered searches per day -->

- **Growth**: [e.g., "Scale to 100,000 searches/day within 6 months"]

<!-- EXAMPLE: Must scale to 100,000 searches/day within 6 months -->

#### Compliance

- **Regulatory**: [e.g., "GDPR-compliant - no tracking without consent"]

<!-- EXAMPLE: GDPR-compliant - no salary filter tracking without explicit consent -->

- **Policy**: [e.g., "Company policy: no salary discrimination"]

<!-- EXAMPLE: Company policy: ensure salary filtering does not enable discriminatory practices -->

### Dependencies

#### Upstream Dependencies

Stories, features, or technical work that must be completed before this story:

- **`US-{id}`**: [Brief description of dependency and why it's needed]

<!-- EXAMPLE:
- **US-PLATFORM-040**: Search API must support salary range parameters
- **TECH-012**: Database must have indexed salary_min and salary_max columns
-->

#### Downstream Impact

Stories or features that depend on this story being completed:

- **`US-{id}`**: [How this story enables another]

<!-- EXAMPLE:
- **US-PLATFORM-044**: Saved search feature requires functional salary filters
-->

#### External Dependencies

Third-party services, data sources, or external teams:

- **[System/Team]**: [Nature of dependency, expected delivery date]

<!-- EXAMPLE:
- **Design Team**: Salary slider component design (expected Jan 10)
- **Data Team**: Salary data cleanup and validation (in progress)
-->

### Technical Considerations

**Note**: This section provides guidance and context, not prescriptive solutions. Implementation teams determine specific approaches.

#### Integration Points

**Systems**: [What systems/services does this story interact with?]

<!-- EXAMPLE:
- Backend search API
- Job listings database
- Analytics tracking service
-->

**Data**: [What data is created, read, updated, or deleted?]

<!-- EXAMPLE:
- Read: job listings with salary_min, salary_max fields
- Update: user search filter preferences (if saving searches)
-->

**APIs**: [What interfaces are involved?]

<!-- EXAMPLE:
- GET /api/jobs?salary_min={min}&salary_max={max}
- POST /api/search/save (if persisting filters)
-->

#### Implementation Guidance

**Frontend**:

<!-- EXAMPLE:
- Use accessible range slider component from design system
- Debounce API calls (wait 300ms after user stops dragging)
- Handle loading state and errors gracefully
- Update URL parameters for bookmarkable searches
-->

**Backend**:

<!-- EXAMPLE:
- Index salary_min and salary_max columns for fast filtering
- Validate min < max, reject invalid ranges with 400 Bad Request
- Return sorted results (highest salary first by default)
-->

**Testing**:

<!-- EXAMPLE:
- Unit tests: salary filter logic validation
- Integration tests: API contract validation
- E2E tests: complete user flow from filter to results
- Performance tests: response time under load
-->

#### Constraints

**Platform**: [Operating environments, browser/device support]

<!-- EXAMPLE:
- Browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Devices: Desktop and mobile responsive design
-->

**Technology**: [Required frameworks, libraries, or standards]

<!-- EXAMPLE:
- Must use existing design system slider component
- Follow REST API conventions
- Adhere to React coding standards
-->

**Data**: [Data format, structure, or storage requirements]

<!-- EXAMPLE:
- Salary stored as integer (annual USD, no decimals)
- NULL salary values excluded from filtered results
- Min salary ≥ 0, max salary ≤ 1000000
-->

**Legal**: [Compliance, privacy, or regulatory constraints]

<!-- EXAMPLE:
- GDPR: Salary filter selections not logged without consent
- CCPA: Users can request deletion of saved filter preferences
- Fair hiring: Ensure filtering doesn't enable discriminatory practices
-->

#### Risks

**Technical Risk**: [Complexity, unknowns, or technical challenges]

<!-- EXAMPLE:
- Risk: Database query performance degrades with complex salary filters
- Mitigation: Load testing, query optimization, consider caching strategy
-->

**Business Risk**: [Market, customer, or competitive considerations]

<!-- EXAMPLE:
- Risk: Users confused by salary range display (annual vs hourly)
- Mitigation: UX research, clear labeling, optional toggle for hourly calculation
-->

**Data Quality Risk**: [Incomplete or inaccurate data]

<!-- EXAMPLE:
- Risk: 30% of job listings missing salary data
- Mitigation: Provide "Include jobs without salary" checkbox option
-->

### Task Breakdown

Break story into implementation tasks (during sprint planning):

<!-- EXAMPLE:
- [ ] [Frontend] Design and implement salary range slider UI - 4h
- [ ] [Frontend] Integrate slider with search API - 2h
- [ ] [Backend] Add salary range filtering to search endpoint - 3h
- [ ] [Backend] Optimize database query with salary indexes - 2h
- [ ] [Testing] Write unit tests for filter logic - 2h
- [ ] [Testing] Write integration tests for API contract - 2h
- [ ] [Testing] Write E2E tests for user flow - 3h
- [ ] [Docs] Update API documentation - 1h
- [ ] [Review] Code review and refinement - 2h

**Total Estimated Hours**: 21h
**Story Points**: 5 (based on team velocity)
-->

### Notes & Attachments

#### Conversation Log

Track key decisions, questions, and clarifications:

<!-- EXAMPLE:
- **2026-01-15**: Decided to use Material UI slider component (ADR-034)
- **2026-01-16**: Product Owner confirmed salary should be annual, not hourly
- **2026-01-17**: UX research shows users prefer $10K increments (not $5K)
-->

#### Attachments

- **Wireframes**: [Link or reference to design mockups]
- **Mockups**: [Link to interactive prototypes]
- **Research**: [Link to user research findings or A/B test results]
- **Specifications**: [Link to detailed technical specs or API contracts]

#### Open Questions

<!-- EXAMPLE:
- [x] Should we support hourly salary filtering? (Resolved: No, annual only)
- [ ] What happens if user sets min > max? (Pending UX decision)
- [ ] Do we track salary filter for analytics? (Pending legal review)
-->

</details>

## Definition of Ready

Before this story enters a sprint, verify:

- [ ] Story statement is clear, complete, and follows "As a... I want... So that..." format
- [ ] Acceptance criteria are defined, testable, and unambiguous
- [ ] Story is sized (story points or hours assigned by team consensus)
- [ ] Dependencies are identified and either resolved or have mitigation plan
- [ ] Non-functional requirements (performance, security, etc.) are documented
- [ ] Team has reviewed, estimated, and asked clarifying questions
- [ ] Product Owner has prioritized and confirmed business value
- [ ] No open questions remain that would block implementation
- [ ] Story is small enough to complete in one sprint (3-5 days)

## Definition of Done

This story is complete when:

### Code Completion

- [ ] All acceptance criteria are met
- [ ] Code is written following team coding standards
- [ ] Code is peer-reviewed and approved (at least 1 reviewer)
- [ ] No critical or high-severity code review findings remain
- [ ] Code is merged to main/development branch

### Testing

- [ ] Unit tests pass with adequate coverage (>80% for new code)
- [ ] Integration tests pass (API contracts validated)
- [ ] Manual testing completed for UI/UX flows
- [ ] No high or critical severity defects remain
- [ ] Non-functional requirements verified (performance, security, accessibility)

### Documentation

- [ ] Code comments added for complex logic
- [ ] API documentation updated (if applicable)
- [ ] User-facing documentation or help text updated
- [ ] Release notes updated with user-visible changes

### Deployment & Acceptance

- [ ] Code deployed to staging or test environment
- [ ] Product Owner has reviewed and accepted the story
- [ ] Story marked as "Done" in tracking system (Jira, Azure DevOps, etc.)
- [ ] No regression in existing functionality

### Additional Criteria (Team-Specific)

- [ ] [Add any team-specific criteria, e.g., "Accessibility audit passed"]
- [ ] [Add any compliance criteria, e.g., "Security scan passed"]

## Agent Notes

### For Requirements Analyst

- Validate story follows INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Ensure acceptance criteria are measurable and unambiguous (avoid "should work well" - use specific metrics)
- Check that business value is clear and, if possible, quantified ("increase conversions by 10%")
- Verify story scope is appropriate for single sprint (3-5 days of work)
- If story is too large (>8 points), split into smaller stories
- Trace story back to epic, feature, or business requirement
- Progressive disclosure: Focus on Phase 1 during inception, expand Phases 2-3 during sprint planning

### For Test Engineer

- Each acceptance criterion should map to at least one test case
- Non-functional requirements need verification approach (performance testing, security scan)
- Consider edge cases and error scenarios beyond happy path
- Plan for both positive (expected behavior) and negative (error handling) test scenarios
- Identify test data needs early (especially for complex filters or integrations)
- Flag testability concerns during refinement, not during implementation

### For Software Implementer

- Technical considerations guide, not prescribe, solution - use your expertise
- Implementation should satisfy acceptance criteria, not mimic examples
- Consider testability and maintainability in design (SOLID, DRY principles)
- Document non-obvious decisions in code comments or ADRs
- Break story into tasks during sprint planning (frontend, backend, testing, docs)
- Raise blockers or questions immediately, don't wait for daily standup

### For Product Owner

- Prioritize based on value, dependencies, and risk (not developer convenience)
- Ensure story aligns with product vision, roadmap, and business goals
- Be available for clarifications during implementation (max 24h response time)
- Accept or reject based on acceptance criteria, not perfection
- Review and accept stories within 1 business day of completion
- Update backlog based on learnings from completed stories

### For UX Designer

- Provide wireframes or mockups before story enters sprint
- Ensure design aligns with design system and accessibility standards
- Participate in acceptance criteria definition (usability aspects)
- Review implementation before Product Owner acceptance
- Document design decisions and rationale

## Related Templates

- @agentic/code/frameworks/sdlc-complete/templates/management/epic-card.md - Parent epic for this story
- @agentic/code/frameworks/sdlc-complete/templates/management/product-backlog-template.md - Story lives in backlog
- @agentic/code/frameworks/sdlc-complete/templates/management/sprint-backlog-template.md - Story committed to sprint
- @agentic/code/frameworks/sdlc-complete/templates/test/test-case-card.md - Tests derived from acceptance criteria
- @agentic/code/frameworks/sdlc-complete/templates/implementation/task-slice-card.md - Tasks broken down from this story

## Quality Gates

**Story is Ready for Sprint When**:

- [ ] Meets all "Definition of Ready" criteria
- [ ] Team consensus on estimate (no dissent >2 story points)
- [ ] Product Owner confirmed priority and value
- [ ] No blockers or dependencies unresolved

**Story is Complete When**:

- [ ] Meets all "Definition of Done" criteria
- [ ] Product Owner acceptance obtained
- [ ] No critical or high-severity defects
- [ ] Deployed to appropriate environment

## Version Control

**Version**: 1.2
**Last Updated**: 2026-01-28
**Owner**: Requirements Analyst + Product Designer
**Change History**:

- 2026-01-28: Added progressive disclosure with phase labels and collapsible sections (v1.2)
- 2025-10-15: Enhanced template with INVEST checklist, task breakdown, open questions (v1.1)
- 2025-10-15: Initial template created (v1.0)
