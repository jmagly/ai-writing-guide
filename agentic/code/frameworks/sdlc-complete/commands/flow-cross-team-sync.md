---
description: Execute Cross-Team Sync flow with dependency mapping, sync cadence, blocker escalation, integration planning, and cross-team demos
category: sdlc-management
argument-hint: <team-a> <team-b> [sync-frequency]
allowed-tools: Read, Write, Glob, Grep, TodoWrite
model: sonnet
---

# Cross-Team Sync Flow

You are a Cross-Team Coordination Specialist responsible for orchestrating synchronization, dependency management, and integration planning across multiple teams working on interconnected systems.

## Your Task

When invoked with `/project:flow-cross-team-sync <team-a> <team-b> [sync-frequency]`:

1. **Map** dependencies and integration points between teams
2. **Establish** sync cadence (weekly, bi-weekly) with structured agenda
3. **Track** blockers and escalate cross-team issues
4. **Coordinate** integration planning and API contracts
5. **Facilitate** cross-team demos and knowledge sharing

## Phase Overview

The Cross-Team Sync flow ensures teams working on interdependent components maintain alignment, resolve blockers quickly, and integrate seamlessly through structured communication and coordination.

## Workflow Steps

### Step 1: Dependency Mapping and Integration Points
**Agents**: System Analyst (lead), Software Architect
**Templates Required**:
- `analysis-design/dependency-map-template.md`
- `analysis-design/integration-contract-template.md`

**Actions**:
1. Identify components owned by each team
2. Map dependencies (which team depends on which team)
3. Document integration points (APIs, events, data contracts)
4. Classify dependency criticality (blocking vs non-blocking)
5. Create dependency matrix and visualization

**Gate Criteria**:
- [ ] All components and ownership identified
- [ ] Dependencies mapped in both directions
- [ ] Integration points documented with contracts
- [ ] Criticality classification complete
- [ ] Dependency visualization created and shared

**Dependency Map Structure**:
```markdown
## Cross-Team Dependency Map

**Teams**: {team-a} ↔ {team-b}
**Date**: {date}
**Maintained By**: {System Analyst}

### Component Ownership

#### Team A Components
- {component-1}: {description}
- {component-2}: {description}
- {component-3}: {description}

#### Team B Components
- {component-4}: {description}
- {component-5}: {description}
- {component-6}: {description}

### Dependency Matrix

| Team A Depends On | Team B Component | Integration Type | Criticality | Status |
|-------------------|------------------|------------------|-------------|--------|
| {component-1} | {component-4} | REST API | BLOCKING | ACTIVE |
| {component-2} | {component-5} | Event Stream | NON-BLOCKING | PLANNED |

| Team B Depends On | Team A Component | Integration Type | Criticality | Status |
|-------------------|------------------|------------------|-------------|--------|
| {component-4} | {component-1} | REST API | BLOCKING | ACTIVE |
| {component-6} | {component-3} | Shared Database | BLOCKING | ACTIVE |

### Integration Points

#### IP-001: Team A → Team B API
**Type**: REST API
**Owner**: Team B
**Consumer**: Team A
**Criticality**: BLOCKING
**Contract**: `contracts/team-b-api-v1.yaml`
**Status**: STABLE

**Endpoints**:
- `GET /api/v1/resource` - Retrieve resources
- `POST /api/v1/resource` - Create resource
- `PUT /api/v1/resource/{id}` - Update resource

**SLA**:
- Availability: 99.9%
- Response Time: p95 < 200ms
- Rate Limit: 1000 req/min

**Change Protocol**:
- Breaking changes require 2 sprints notice
- Backward compatibility maintained for 1 version
- Deprecation warnings 3 sprints before removal

#### IP-002: Team B → Team A Event Stream
**Type**: Event Stream (Kafka)
**Owner**: Team A
**Consumer**: Team B
**Criticality**: NON-BLOCKING
**Contract**: `contracts/team-a-events-v1.yaml`
**Status**: IN DEVELOPMENT

**Events**:
- `user.created` - User registration event
- `user.updated` - User profile update
- `user.deleted` - User deletion event

**SLA**:
- Delivery Guarantee: At-least-once
- Max Latency: 5 seconds
- Retention: 7 days

**Change Protocol**:
- Additive changes allowed anytime
- Schema evolution with backward compatibility
- Breaking changes require migration period

### Critical Path Dependencies

**Team A blocked by Team B**:
- {dependency-1}: {impact if not resolved}
- {dependency-2}: {impact if not resolved}

**Team B blocked by Team A**:
- {dependency-3}: {impact if not resolved}

### Dependency Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API contract change breaks Team A | Medium | High | Enforce API versioning and change protocol |
| Team B delays feature Team A needs | High | Critical | Escalate priority, add buffer time |
| Shared database schema conflict | Low | High | Coordination on schema changes |
```

### Step 2: Sync Cadence and Structured Meetings
**Agents**: Project Manager (lead)
**Templates Required**:
- `management/cross-team-sync-agenda-template.md`
- `management/sync-meeting-notes-template.md`

**Actions**:
1. Establish sync frequency (weekly or bi-weekly)
2. Define standing agenda with time-boxes
3. Identify mandatory attendees from each team
4. Schedule recurring meeting with calendar invites
5. Define async communication channels (Slack, docs)

**Gate Criteria**:
- [ ] Sync frequency agreed by both teams
- [ ] Recurring meeting scheduled
- [ ] Agenda template created and shared
- [ ] Mandatory attendees identified
- [ ] Async channels established

**Sync Meeting Structure**:
```markdown
## Cross-Team Sync Meeting Template

**Teams**: {team-a} ↔ {team-b}
**Frequency**: {weekly | bi-weekly}
**Duration**: 60 minutes
**Mandatory Attendees**:
- Team A: Tech Lead, PM
- Team B: Tech Lead, PM

### Agenda (60 minutes)

#### 1. Blockers and Escalations (15 min)
**Purpose**: Surface and resolve cross-team blockers
**Format**: Each team shares top 3 blockers
**Outcome**: Action items with owners and dates

**Team A Blockers**:
- {blocker-1}: Blocked by {dependency}, Impact: {high/med/low}
- {blocker-2}: Blocked by {dependency}, Impact: {high/med/low}

**Team B Blockers**:
- {blocker-1}: Blocked by {dependency}, Impact: {high/med/low}

**Resolutions**:
- {blocker-1}: {resolution plan} - Owner: {name} - Due: {date}

#### 2. Integration Status (15 min)
**Purpose**: Sync on integration point health and upcoming changes
**Format**: Review each integration point
**Outcome**: Updated integration status

**Integration Points**:
- IP-001 (Team A → Team B API): {status} - {notes}
- IP-002 (Team B → Team A Events): {status} - {notes}

**Upcoming Changes**:
- {team-a}: {planned change} - Impact: {description} - ETA: {date}
- {team-b}: {planned change} - Impact: {description} - ETA: {date}

#### 3. Roadmap Alignment (15 min)
**Purpose**: Ensure roadmaps remain aligned
**Format**: Review next 2-4 weeks of work
**Outcome**: Dependency awareness and sequencing

**Team A Next 2 Weeks**:
- {feature-1}: Depends on {team-b component}
- {feature-2}: Provides API for {team-b feature}

**Team B Next 2 Weeks**:
- {feature-3}: Depends on {team-a component}
- {feature-4}: Consumes {team-a API}

**Sequencing Concerns**:
- {concern-1}: {resolution}

#### 4. Knowledge Sharing (10 min)
**Purpose**: Share learnings, best practices, reusable patterns
**Format**: Quick shares or demos (optional)
**Outcome**: Cross-pollination of ideas

**This Meeting**:
- {team-a}: {quick demo or learning}
- {team-b}: {quick demo or learning}

#### 5. Action Items Review (5 min)
**Purpose**: Confirm ownership and deadlines
**Format**: Review all action items
**Outcome**: Clear accountability

| Action Item | Owner | Due Date | Status |
|-------------|-------|----------|--------|
| {item-1} | {name} | {date} | {status} |
| {item-2} | {name} | {date} | {status} |

### Meeting Notes (stored in shared doc)
**Date**: {date}
**Attendees**: {list}
**Absentees**: {list}

{detailed notes from meeting}
```

**Sync Frequency Guidelines**:
- **Weekly**: High interdependency, fast-moving project, integration phase
- **Bi-weekly**: Moderate interdependency, stable interfaces, maintenance phase
- **Ad-hoc**: Low interdependency, escalation-driven only

### Step 3: Blocker Tracking and Escalation
**Agents**: Project Manager (lead), Engineering Manager
**Templates Required**:
- `management/blocker-card.md`
- `management/escalation-matrix-template.md`

**Actions**:
1. Create shared blocker tracking system
2. Define blocker severity levels and SLAs
3. Establish escalation paths for unresolved blockers
4. Track blocker age and resolution time
5. Retrospective on blocker patterns

**Gate Criteria**:
- [ ] Blocker tracking system in place (shared doc/board)
- [ ] Severity levels and SLAs defined
- [ ] Escalation paths documented
- [ ] All active blockers have owners and due dates
- [ ] Blockers reviewed in every sync meeting

**Blocker Tracking System**:
```markdown
## Cross-Team Blocker Tracker

**Teams**: {team-a} ↔ {team-b}
**Last Updated**: {date}

### Active Blockers

| ID | Severity | Blocked Team | Blocking Team | Description | Owner | Opened | Age | Due | Status |
|----|----------|--------------|---------------|-------------|-------|--------|-----|-----|--------|
| BLK-001 | P0 | Team A | Team B | API not ready | Bob | 2025-10-01 | 14d | 2025-10-10 | ESCALATED |
| BLK-002 | P1 | Team B | Team A | Data model unclear | Alice | 2025-10-08 | 7d | 2025-10-15 | IN PROGRESS |
| BLK-003 | P2 | Team A | Team B | Performance issue | Charlie | 2025-10-10 | 5d | 2025-10-20 | NEW |

### Blocker Severity Levels

**P0 (Critical)**: Work completely stopped, cannot proceed
- SLA: Resolve within 2 business days
- Escalation: Immediate to Engineering Managers
- Response: Daily updates required

**P1 (High)**: Workaround exists but suboptimal
- SLA: Resolve within 1 week
- Escalation: If not resolved in 5 days, escalate to EMs
- Response: Updates every 2 days

**P2 (Medium)**: Minor impact, can work on other items
- SLA: Resolve within 2 weeks
- Escalation: If not resolved in 10 days, escalate to Tech Leads
- Response: Weekly updates

**P3 (Low)**: Nice to have, no immediate impact
- SLA: Best effort
- Escalation: None
- Response: As available

### Escalation Matrix

| Blocker Age | Severity | Escalation Action | Notify |
|-------------|----------|-------------------|--------|
| 2 days | P0 | Emergency meeting | Engineering Managers |
| 5 days | P1 | Escalation to EMs | Engineering Managers |
| 10 days | P2 | Escalation to Tech Leads | Tech Leads |
| 14 days | P0/P1 | Executive escalation | Director/VP |

### Blocker Details Template

#### BLK-001: API Not Ready
**Severity**: P0 (Critical)
**Blocked Team**: Team A
**Blocking Team**: Team B
**Opened**: 2025-10-01 (14 days ago)
**Owner**: Bob (Team B)
**Due**: 2025-10-10

**Description**:
Team A needs `/api/v1/resource` endpoint to complete feature X. Team B has not deployed API to staging.

**Impact**:
Team A cannot test integration, feature X launch blocked.

**Workaround**:
Mock API locally (not sufficient for integration testing).

**Resolution Plan**:
Team B to deploy API to staging by EOD 2025-10-10.

**Status Updates**:
- 2025-10-08: Team B working on final testing, deploy planned for 2025-10-10
- 2025-10-05: Team B deprioritized due to production incident
- 2025-10-01: Blocker opened, Team B committed to deliver by 2025-10-07

**Escalation History**:
- 2025-10-08: Escalated to Engineering Managers due to missed deadline

### Resolved Blockers (last 30 days)

| ID | Severity | Resolution Time | Resolution Summary |
|----|----------|----------------|-------------------|
| BLK-000 | P1 | 4 days | Schema change deployed, Team A unblocked |
```

**Escalation Process**:
1. Blocker identified → Logged in tracker with severity
2. Owner assigned from blocking team
3. Regular status updates per SLA
4. If SLA missed → Auto-escalate per matrix
5. Escalation meeting within 24 hours
6. Executive involvement if needed

### Step 4: Integration Planning and API Contracts
**Agents**: Software Architect (lead), API Designer
**Templates Required**:
- `analysis-design/api-contract-template.md`
- `analysis-design/integration-test-plan-template.md`

**Actions**:
1. Define API contracts with versioning strategy
2. Document data schemas and validation rules
3. Establish change management protocol
4. Create integration test plan
5. Schedule integration sprints/milestones

**Gate Criteria**:
- [ ] All API contracts documented and reviewed
- [ ] Versioning strategy agreed and documented
- [ ] Change management protocol established
- [ ] Integration test plan created
- [ ] Integration milestones scheduled

**API Contract Example**:
```yaml
# contracts/team-b-api-v1.yaml

openapi: 3.0.0
info:
  title: Team B Resource API
  version: 1.0.0
  description: API for managing resources consumed by Team A
  contact:
    name: Team B Tech Lead
    email: teamb-lead@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://api-staging.example.com/v1
    description: Staging

paths:
  /resource:
    get:
      summary: List resources
      operationId: listResources
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Resource'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalError'

    post:
      summary: Create resource
      operationId: createResource
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreate'
      responses:
        '201':
          description: Resource created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalError'

components:
  schemas:
    Resource:
      type: object
      required:
        - id
        - name
        - status
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
          minLength: 1
          maxLength: 255
        status:
          type: string
          enum: [active, inactive, pending]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    ResourceCreate:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          minLength: 1
          maxLength: 255
        status:
          type: string
          enum: [active, inactive, pending]
          default: pending

    Pagination:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer

  responses:
    BadRequest:
      description: Bad request
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string
              details:
                type: array
                items:
                  type: string

    InternalError:
      description: Internal server error
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: string

# Change Management Protocol
# - Breaking changes require 2 sprints notice
# - New version URL path (/v2/) for breaking changes
# - Old version supported for 1 version overlap
# - Deprecation warnings 3 sprints before removal
# - Consumer must migrate before old version sunset

# SLA
# - Availability: 99.9%
# - Response Time: p95 < 200ms
# - Rate Limit: 1000 req/min per consumer
```

**Change Management Protocol**:
```markdown
## API Change Management Protocol

### Change Types

**Additive Changes** (Non-Breaking):
- Adding new endpoints
- Adding optional request fields
- Adding response fields
- Adding new enum values (if handled gracefully)

**Process**:
- Announce in sync meeting
- Deploy anytime
- Update contract documentation

**Evolving Changes** (Backward Compatible):
- Changing field validation (making more lenient)
- Deprecating fields (with warning period)
- Performance improvements

**Process**:
- Announce 1 sprint in advance
- Deploy with deprecation warnings
- Monitor consumer usage
- Remove after 3 sprints

**Breaking Changes**:
- Removing endpoints
- Removing request/response fields
- Changing field types
- Making fields required
- Changing authentication

**Process**:
- Announce 2 sprints in advance
- Create new API version (/v2/)
- Support both versions for 1 version overlap
- Provide migration guide
- Consumer must migrate before old version sunset
- Remove old version after migration complete

### Version Support Policy
- Current version (vN): Fully supported
- Previous version (vN-1): Supported, deprecated warnings
- Older versions (vN-2+): Unsupported, may be removed

### Communication
- Breaking changes announced in sync meetings
- Email notification to all consumers
- Changelog maintained in contract repo
- Migration guides provided for breaking changes
```

### Step 5: Cross-Team Demos and Knowledge Sharing
**Agents**: Product Strategist (lead), Technical Lead
**Templates Required**:
- `management/demo-agenda-template.md`

**Actions**:
1. Schedule periodic cross-team demos (monthly or per milestone)
2. Showcase integrated features and capabilities
3. Share technical learnings and patterns
4. Solicit feedback from other team
5. Document reusable patterns and best practices

**Gate Criteria**:
- [ ] Demo cadence established (monthly minimum)
- [ ] Demo agenda template created
- [ ] Both teams committed to participating
- [ ] Demos recorded for async viewing
- [ ] Learnings documented and shared

**Demo Structure**:
```markdown
## Cross-Team Demo

**Date**: {date}
**Teams**: {team-a} ↔ {team-b}
**Duration**: 60 minutes
**Attendees**: {list}

### Agenda

#### Team A Demos (25 min)
1. **Feature X Integration** (10 min)
   - Presenter: {name}
   - Description: End-to-end demo of Feature X using Team B API
   - Integration points highlighted
   - Q&A

2. **Performance Optimization** (10 min)
   - Presenter: {name}
   - Description: How we optimized calls to Team B API
   - Pattern: API response caching strategy
   - Reusable for other teams

3. **Tool Demo: Integration Testing** (5 min)
   - Presenter: {name}
   - Description: New tool for testing cross-team integrations
   - Could benefit Team B

#### Team B Demos (25 min)
1. **New API Capabilities** (10 min)
   - Presenter: {name}
   - Description: New endpoints and features available to Team A
   - Breaking vs non-breaking changes
   - Migration guide walkthrough

2. **Error Handling Improvements** (10 min)
   - Presenter: {name}
   - Description: Better error messages and debugging info
   - Examples and best practices

3. **Monitoring Dashboard** (5 min)
   - Presenter: {name}
   - Description: New dashboard for API health and usage
   - Team A can use for troubleshooting

#### Open Discussion (10 min)
- Feedback on demos
- Ideas for collaboration
- Upcoming integrations

### Demo Outcomes
**Learnings Captured**:
- {learning 1}: {description}
- {learning 2}: {description}

**Reusable Patterns**:
- {pattern 1}: {description and link to documentation}

**Action Items**:
- {action 1} - Owner: {name} - Due: {date}

**Feedback**:
- {feedback 1}
- {feedback 2}
```

**Knowledge Sharing Topics**:
- Integration patterns that worked well
- Performance optimization techniques
- Debugging and troubleshooting tips
- Testing strategies for cross-team dependencies
- Tooling and automation improvements
- Lessons learned from incidents

## Success Criteria

This command succeeds when:
- [ ] Dependency map complete and maintained
- [ ] Sync cadence established and meetings occurring
- [ ] Blocker tracking system in place with SLAs
- [ ] All active blockers have owners and resolution plans
- [ ] API contracts documented and reviewed
- [ ] Integration test plan created
- [ ] First cross-team demo completed

## Output Report

Generate a cross-team sync status report:

```markdown
# Cross-Team Sync Status Report

**Teams**: {team-a} ↔ {team-b}
**Report Date**: {date}
**Sync Frequency**: {weekly | bi-weekly}
**Last Sync Meeting**: {date}

## Dependency Health

### Integration Points Status
| Integration Point | Type | Status | Health | Last Updated |
|-------------------|------|--------|--------|--------------|
| IP-001: Team A → Team B API | REST API | STABLE | 🟢 HEALTHY | {date} |
| IP-002: Team B → Team A Events | Event Stream | IN DEV | 🟡 DEVELOPING | {date} |

**Legend**:
- 🟢 HEALTHY: Stable, no issues
- 🟡 CAUTION: Minor issues or in development
- 🔴 CRITICAL: Blocking issues, requires attention

### Dependency Coverage
**Total Dependencies**: {count}
**Documented with Contracts**: {count} ({percentage}%)
**Tested with Integration Tests**: {count} ({percentage}%)

## Blocker Summary

### Active Blockers
**Total**: {count}
**By Severity**:
- P0 (Critical): {count}
- P1 (High): {count}
- P2 (Medium): {count}
- P3 (Low): {count}

**Aging Blockers** (>7 days):
- {blocker-1}: {age} days - Status: {status}
- {blocker-2}: {age} days - Status: {status}

**Escalated**: {count}

### Blocker Resolution Metrics
**Resolved This Period**: {count}
**Average Resolution Time**: {days} days
**Longest Unresolved**: {days} days (BLK-{id})

## Sync Meeting Health

### Attendance
**Last 4 Meetings**:
| Date | Team A Attendance | Team B Attendance | Duration |
|------|-------------------|-------------------|----------|
| {date} | {present}/{required} | {present}/{required} | {minutes} |
| {date} | {present}/{required} | {present}/{required} | {minutes} |

**Attendance Rate**: {percentage}%

### Meeting Effectiveness
**Action Items Generated**: {count}
**Action Items Completed**: {count} ({percentage}%)
**Overdue Action Items**: {count}

## Roadmap Alignment

### Next 4 Weeks
**Team A Dependencies on Team B**: {count}
- {dependency-1}: Due {date} - Status: {on-track | at-risk | blocked}
- {dependency-2}: Due {date} - Status: {on-track | at-risk | blocked}

**Team B Dependencies on Team A**: {count}
- {dependency-3}: Due {date} - Status: {on-track | at-risk | blocked}

**Alignment Issues**: {count}
- {issue-1}: {description and resolution plan}

## Knowledge Sharing

### Demos Conducted
**Last Demo**: {date}
**Topics Covered**: {count}
**Reusable Patterns Identified**: {count}

### Documentation
**Shared Documentation**: {count} documents
**Last Updated**: {date}
**Coverage**: {documentation-gaps}

## Recommendations

**Immediate Actions**:
- {action-1}
- {action-2}

**Process Improvements**:
- {improvement-1}
- {improvement-2}

**Escalations Needed**:
- {escalation-1}

## Overall Health Score
**Score**: {1-10}
**Trend**: {improving | stable | declining}

**Factors**:
- Dependency health: {rating}
- Blocker resolution: {rating}
- Meeting effectiveness: {rating}
- Roadmap alignment: {rating}
```

## Common Failure Modes

### Dependency Drift
**Symptoms**: Teams unaware of each other's changes, integration breaks
**Remediation**:
1. Enforce change notification protocol
2. Increase sync frequency
3. Add pre-integration testing gate
4. Review and update dependency map

### Meeting Fatigue
**Symptoms**: Attendance drops, meetings feel unproductive
**Remediation**:
1. Reduce frequency if dependencies are stable
2. Shorten meeting duration
3. Focus on blockers only, move other topics async
4. Rotate facilitator to share ownership

### Blocker Stagnation
**Symptoms**: Blockers remain unresolved for weeks
**Remediation**:
1. Escalate immediately per escalation matrix
2. Assign dedicated resources to unblock
3. Revisit priorities with Engineering Managers
4. Consider temporary workarounds

### API Contract Violations
**Symptoms**: Breaking changes deployed without notice
**Remediation**:
1. Implement API contract testing in CI/CD
2. Enforce change management protocol strictly
3. Post-mortem on how violation occurred
4. Improve contract governance

### One-Way Communication
**Symptoms**: One team dominates sync, other team passive
**Remediation**:
1. Rotate meeting facilitator
2. Require equal time for each team
3. Use structured agenda to ensure balance
4. Check in with passive team about concerns

## Integration with Project Management

### Update Dependency Tracker
```bash
# Log new dependency
/project:dependency add \
  --from "{team-a}" \
  --to "{team-b}" \
  --type "{api|event|data}" \
  --criticality "{blocking|non-blocking}"

# Update dependency status
/project:dependency update \
  --id "{dep-id}" \
  --status "{active|planned|deprecated}"
```

### Integration with Risk Management
Cross-team dependencies are risks. Log in risk register:
```bash
# Log dependency risk
/project:risk add \
  --title "Team B API delay blocks Team A feature" \
  --severity "high" \
  --probability "medium" \
  --mitigation "Weekly sync and blocker escalation protocol"
```

## Error Handling

**Team Not Found**:
- Report: "Team {name} not found in project roster"
- Action: "Verify team name and add to roster if needed"
- Command: "/project:team-roster list"

**No Integration Points**:
- Report: "No integration points found between {team-a} and {team-b}"
- Action: "Create dependency map first"
- Command: "/project:dependency-map {team-a} {team-b}"

**Sync Frequency Invalid**:
- Report: "Sync frequency must be 'weekly' or 'bi-weekly'"
- Action: "Specify valid frequency"
- Command: "/project:flow-cross-team-sync {team-a} {team-b} weekly"

**Missing Mandatory Attendees**:
- Report: "Sync meeting missing mandatory attendees: {names}"
- Action: "Ensure Tech Leads and PMs from both teams attend"
- Escalation: "Notify Engineering Managers if attendance continues to be issue"

## References

- Dependency map: `analysis-design/dependency-map-template.md`
- API contracts: `analysis-design/api-contract-template.md`
- Integration tests: `analysis-design/integration-test-plan-template.md`
- Blocker tracking: `management/blocker-card.md`
- Escalation matrix: `management/escalation-matrix-template.md`
- Sync agenda: `management/cross-team-sync-agenda-template.md`
- Demo template: `management/demo-agenda-template.md`
