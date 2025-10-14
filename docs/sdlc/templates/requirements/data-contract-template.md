# Data Contract

## Metadata

- ID: DES-DATA-<id>
- Owner: API Designer (docs/agents/sdlc/api-designer.md)
- Contributors: System Analyst (docs/agents/system-analyst.md), Implementer (docs/agents/software-implementer.md)
- Reviewers: Architecture Designer (docs/agents/architecture-designer.md)
- Team: <team>
- Stakeholders: <list>
- Status: <draft/in-progress/blocked/approved/done>
- Dates: created <YYYY-MM-DD> / updated <YYYY-MM-DD> / due <YYYY-MM-DD>
- Related: UC-<id>, REQ-<id>, DES-<id>, TEST-<id>
- Links: <paths/urls>

## Related templates

- docs/sdlc/templates/analysis-design/interface-contract-card.md
- docs/sdlc/templates/requirements/use-case-acceptance-template.md

## Endpoint / Interface

- Name/Path: <GET /api/v1/...>
- Version: v<major.minor>

## Request Schema

```json
{
  "field": "type",
  "required": true
}
```

## Response Schema

```json
{
  "data": {},
  "meta": {}
}
```

## Constraints

- Validation rules
- AuthZ/AuthN
- Rate limits
