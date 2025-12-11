# UC-001: Create Task

## Summary

Users can create new tasks with title, description, assignee, due date, and priority.

## Actors

- **Primary**: Team Member
- **Secondary**: System (auto-assignment)

## Preconditions

- User is authenticated
- User has workspace access

## Main Flow

1. User clicks "New Task" button
2. System displays task creation form
3. User enters task title (required)
4. User optionally enters description, due date, priority
5. User selects assignee or leaves for auto-assignment
6. User clicks "Create"
7. System validates input
8. System creates task with unique ID
9. System notifies assignee (if assigned)
10. System displays task in workspace

## Alternative Flows

### A1: Auto-Assignment
- At step 5, if no assignee selected:
  - System analyzes team workload
  - System suggests most available team member
  - User confirms or overrides

### A2: Validation Failure
- At step 7, if validation fails:
  - System highlights invalid fields
  - User corrects and resubmits

## Postconditions

- Task exists in database with status "Open"
- Assignee notified via email and in-app
- Task appears in workspace task list

## Non-Functional Requirements

- Response time: <500ms
- Support offline creation (sync when online)

## Acceptance Criteria

- [ ] Task created with all required fields
- [ ] Task ID is unique and sequential
- [ ] Notification sent within 30 seconds
- [ ] Task appears in real-time for all workspace members
