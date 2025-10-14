# Card Metadata Standard

## Purpose
Define a consistent metadata header for all “card” templates so teams can assign ownership,
maintain traceability, and relate cards to their parent templates and artifacts.

## Required fields
- ID: use a prefix plus number (examples below)
- Owner: person/role/team responsible for delivery
- Contributors: collaborators
- Reviewers: approvers/peers
- Team: primary team
- Stakeholders: key non-engineering contacts
- Status: draft | in-progress | blocked | approved | done
- Dates: created / updated / due
- Related: IDs to other artifacts (UC, REQ, DES, CODE, TEST, ADR, DEP, RSK, CR, etc.)
- Links: file paths or URLs to source/related artifacts

## Allowed ID prefixes (examples)
- UC-: Use case (e.g., UC-001)
- REQ-: Requirement (e.g., REQ-010)
- DES-: Design item (e.g., DES-004)
- TEST-: Test item (e.g., TEST-112)
- ADR-: Architecture decision record (e.g., ADR-003)
- DEP-: Dependency (e.g., DEP-007)
- RSK-: Risk (e.g., RSK-005)
- CR-: Change request (e.g., CR-002)
- WP-: Work package (e.g., WP-001)

## Header block (copy into cards)

```markdown
## Metadata
- ID: <PREFIX-###>
- Owner: <name/role/team>
- Contributors: <list>
- Reviewers: <list>
- Team: <team>
- Stakeholders: <list>
- Status: <draft/in-progress/blocked/approved/done>
- Dates: created <YYYY-MM-DD> / updated <YYYY-MM-DD> / due <YYYY-MM-DD>
- Related: UC-<id>, REQ-<id>, DES-<id>, CODE-<module>, TEST-<id>, ADR-<id>, DEP-<id>, RSK-<id>, CR-<id>
- Links: <paths/urls>

## Related templates
- <template path 1>
- <template path 2>
```

