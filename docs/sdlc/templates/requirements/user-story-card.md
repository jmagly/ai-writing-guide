# User Story Card

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

## Story

### User Story Statement

**As a** [type of user/role/persona]
**I want** [capability/feature/action]
**So that** [business value/benefit/outcome]

**Example**:
**As a** job seeker
**I want** to filter job listings by salary range
**So that** I only see jobs that meet my compensation expectations

### Story Context

**Problem**: [Brief description of the problem or pain point this story addresses]

**Value**: [Why this matters to users and the business - quantify if possible]

**Scope**: [What this story includes and explicitly excludes]

**User Persona**: [Primary user type this story serves - link to persona if available]

### Supporting Information

**User Journey**: [Where in the user journey does this story fit?]

**Frequency**: [How often will users perform this action? Daily, weekly, rarely?]

**Current Workaround**: [How do users solve this problem today? What's broken?]

## Acceptance Criteria

Define clear, testable conditions that must be met for this story to be considered "done."

**INVEST Check** (Is this story ready?):

- **Independent**: Can be developed without depending on other stories in same sprint
- **Negotiable**: Details can be refined during implementation
- **Valuable**: Delivers value to users or business
- **Estimable**: Team can estimate effort required
- **Small**: Can complete in one sprint
- **Testable**: Clear pass/fail criteria

### Criterion 1: [Name of the behavior or capability]

**Given** [precondition/context/initial state]
**When** [action/event/user interaction]
**Then** [expected outcome/result]
**And** [additional outcome, if needed]

**Example**:
**Given** I am viewing the job search page
**When** I adjust the salary range slider to $80K-$120K
**Then** the job list updates to show only positions within that range
**And** the URL updates with the filter parameter for bookmarking

### Criterion 2: [Name of the behavior or capability]

**Given** [precondition/context]
**When** [action/event]
**Then** [expected outcome]

### Criterion 3: [Edge Cases and Error Handling]

**Given** [error condition or boundary case]
**When** [triggering action]
**Then** [graceful handling or error message]

**Example**:
**Given** no jobs exist in the selected salary range
**When** I apply the salary filter
**Then** the system displays "No jobs found - try adjusting your filters"

### Acceptance Criteria Checklist

- [ ] All happy path scenarios covered
- [ ] Edge cases and boundary conditions defined
- [ ] Error handling specified
- [ ] Performance expectations stated (if applicable)
- [ ] Security requirements included (if applicable)
- [ ] Accessibility requirements specified (if applicable)

## Non-Functional Requirements

Constraints and quality attributes specific to this story:

### Performance

- **Response Time**: [e.g., "Filter results update within 500ms"]
- **Throughput**: [e.g., "Support 100 concurrent filter operations"]
- **Data Volume**: [e.g., "Handle up to 50,000 job listings"]

### Security

- **Authentication**: [e.g., "No authentication required for public search"]
- **Authorization**: [e.g., "Premium filters require authenticated users"]
- **Data Protection**: [e.g., "Do not log salary filter selections (PII)"]

### Usability

- **User Experience**: [e.g., "Slider provides visual feedback during drag"]
- **Accessibility**: [e.g., "WCAG 2.1 Level AA - keyboard navigable"]
- **Mobile**: [e.g., "Touch-friendly on screens >320px wide"]

### Reliability

- **Uptime**: [e.g., "Degrades gracefully if search service is down"]
- **Error Handling**: [e.g., "Display user-friendly error, not stack trace"]

### Scalability

- **Expected Load**: [e.g., "10,000 searches/day"]
- **Growth**: [e.g., "Scale to 100,000 searches/day within 6 months"]

### Compliance

- **Regulatory**: [e.g., "GDPR-compliant - no tracking without consent"]
- **Policy**: [e.g., "Company policy: no salary discrimination"]

## Dependencies

### Upstream Dependencies

Stories, features, or technical work that must be completed before this story:

- **`US-{id}`**: [Brief description of dependency and why it's needed]
- **`FEAT-{id}`**: [Feature this story depends on]
- **`TECH-{id}`**: [Infrastructure or technical prerequisite]

**Example**:

- **`US-PLATFORM-040`**: Search API must support salary range parameters
- **`TECH-012`**: Database must have indexed salary_min and salary_max columns

### Downstream Impact

Stories or features that depend on this story being completed:

- **`US-{id}`**: [How this story enables another]

**Example**:

- **`US-PLATFORM-044`**: Saved search feature needs salary filters to be functional

### External Dependencies

Third-party services, data sources, or external teams:

- **[System/Team]**: [Nature of dependency, expected delivery date]

**Example**:

- **Design Team**: Salary slider component design (expected Oct 10)
- **Data Team**: Salary data cleanup and validation (in progress)

## Technical Considerations

**Note**: This section provides guidance and context, not prescriptive solutions. Implementation teams determine specific approaches.

### Integration Points

**Systems**: [What systems/services does this story interact with?]

- Backend search API
- Job listings database
- Analytics tracking service

**Data**: [What data is created, read, updated, or deleted?]

- Read: job listings with salary_min, salary_max
- Update: user search filter preferences (if saving searches)

**APIs**: [What interfaces are involved?]

- GET /api/jobs?salary_min={min}&salary_max={max}
- POST /api/search/save (if persisting filters)

### Implementation Guidance

**Frontend**:

- Use accessible range slider component
- Debounce API calls (wait 300ms after user stops dragging)
- Handle loading state and errors gracefully

**Backend**:

- Index salary columns for fast filtering
- Validate min < max, reject invalid ranges
- Return 400 Bad Request for invalid parameters

**Testing**:

- Unit tests: salary filter logic
- Integration tests: API contract validation
- E2E tests: user flow from filter to results

### Constraints

**Platform**: [Operating environments, browser/device support]

- Browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Devices: Desktop and mobile responsive

**Technology**: [Required frameworks, libraries, or standards]

- Must use existing design system slider component
- Follow REST API conventions

**Data**: [Data format, structure, or storage requirements]

- Salary stored as integer (cents or dollars)
- NULL salary values excluded from filtered results

**Legal**: [Compliance, privacy, or regulatory constraints]

- GDPR: Salary filter selections not logged without consent
- CCPA: Users can request deletion of saved filters

### Risks

**Technical Risk**: [Complexity, unknowns, or technical challenges]

- Risk: Database query performance degrades with complex filters
- Mitigation: Load testing, query optimization, caching

**Business Risk**: [Market, customer, or competitive considerations]

- Risk: Users confused by salary range (annual vs hourly)
- Mitigation: UX research, clear labeling, toggle option

**Data Quality Risk**: [Incomplete or inaccurate data]

- Risk: 30% of jobs missing salary data
- Mitigation: Allow "Include jobs without salary" checkbox

## Task Breakdown

Break story into implementation tasks (during sprint planning):

- [ ] [Frontend] Design and implement salary range slider UI - 4h
- [ ] [Frontend] Integrate slider with search API - 2h
- [ ] [Backend] Add salary range filtering to search endpoint - 3h
- [ ] [Backend] Optimize database query with salary indexes - 2h
- [ ] [Testing] Write unit tests for filter logic - 2h
- [ ] [Testing] Write integration tests for API - 2h
- [ ] [Testing] Write E2E tests for user flow - 3h
- [ ] [Docs] Update API documentation - 1h
- [ ] [Review] Code review and refinement - 2h

**Total Estimated Hours**: 21h
**Story Points**: 5 (based on team velocity)

## Notes & Attachments

### Conversation Log

Track key decisions, questions, and clarifications:

- **YYYY-MM-DD**: Decided to use Material UI slider component (ADR-034)
- **YYYY-MM-DD**: Product Owner confirmed salary should be annual, not hourly
- **YYYY-MM-DD**: UX research shows users prefer $10K increments (not $5K)

### Attachments

- **Wireframes**: [Link or reference to design mockups]
- **Mockups**: [Link to interactive prototypes]
- **Research**: [Link to user research findings or A/B test results]
- **Specifications**: [Link to detailed technical specs or API contracts]

### Open Questions

- [x] Should we support hourly salary filtering? (Resolved: No, annual only)
- [ ] What happens if user sets min > max? (Pending UX decision)
- [ ] Do we track salary filter for analytics? (Pending legal review)

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

- `/docs/sdlc/templates/management/epic-card.md` - Parent epic for this story
- `/docs/sdlc/templates/management/product-backlog-template.md` - Story lives in backlog
- `/docs/sdlc/templates/management/sprint-backlog-template.md` - Story committed to sprint
- `/docs/sdlc/templates/requirements/feature-specification-template.md` - Feature this story belongs to
- `/docs/sdlc/templates/test/test-case-template.md` - Tests derived from acceptance criteria
- `/docs/sdlc/templates/management/task-slice-card.md` - Tasks broken down from this story

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

**Version**: 1.1
**Last Updated**: 2025-10-15
**Owner**: Requirements Analyst + Product Designer
**Change History**:

- 2025-10-15: Enhanced template with INVEST checklist, task breakdown, open questions, and improved agent notes (v1.1)
- 2025-10-15: Initial template created (v1.0)
