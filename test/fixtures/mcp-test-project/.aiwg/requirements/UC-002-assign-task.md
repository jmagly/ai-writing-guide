# UC-002: Assign Task

## Summary

Users can assign or reassign tasks to team members.

## Actors

- **Primary**: Team Lead, Task Owner
- **Secondary**: Assignee (notified)

## Preconditions

- Task exists
- User has permission to modify task
- Target assignee is workspace member

## Main Flow

1. User opens task detail view
2. User clicks "Assign" dropdown
3. System displays list of workspace members with workload indicators
4. User selects assignee
5. System updates task assignment
6. System notifies new assignee
7. System notifies previous assignee (if reassignment)
8. System logs assignment change in activity feed

## Business Rules

- Tasks can only have one assignee at a time
- Self-assignment is allowed
- Assignment history is preserved for audit

## Acceptance Criteria

- [ ] Assignment updates in real-time
- [ ] Both old and new assignees notified
- [ ] Assignment change logged with timestamp and actor
