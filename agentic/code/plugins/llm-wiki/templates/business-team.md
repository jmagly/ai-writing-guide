---
title: "{{title}}"
type: business-team
project: "{{project name}}"
team: "{{team name}}"
date: "{{YYYY-MM-DD}}"
category: "{{meeting | decision | status | retrospective | handoff}}"
decision-status: "{{proposed | approved | rejected | superseded}}"
tags: []
---

# {{title}}

> One-line summary of the meeting, decision, or status update.

## Context

What prompted this page. Link to the project, sprint, or prior meeting.

- Project: [[{{Project Page}}]]
- Prior: [[{{Previous Meeting or Decision}}]]

## Attendees

| Name | Role | Present |
|------|------|---------|
| {{name}} | {{role}} | {{yes / no / async}} |

## Agenda / Topics

1. {{Topic}} — owner: {{name}}
2. {{Topic}} — owner: {{name}}

## Discussion

Summary of key points discussed. Attribute positions to individuals where relevant.

### {{Topic}}

{{Discussion notes. Link to [[{{related entity or concept}}]] as needed.}}

## Decisions

| ID | Decision | Owner | Date | Status |
|----|----------|-------|------|--------|
| D-{{N}} | {{What was decided}} | {{who}} | {{YYYY-MM-DD}} | {{approved / pending}} |

## Action Items

| ID | Action | Owner | Due | Status |
|----|--------|-------|-----|--------|
| A-{{N}} | {{Concrete next step}} | {{who}} | {{YYYY-MM-DD}} | {{open / done}} |

## Follow-Up

- Next meeting: [[{{Next Meeting Page}}]]
- Blocked by: [[{{Blocking Item}}]]
- Feeds into: [[{{Downstream Deliverable}}]]
