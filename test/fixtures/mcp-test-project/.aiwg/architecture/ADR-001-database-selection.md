# ADR-001: PostgreSQL over MongoDB

## Status

ACCEPTED

## Context

We need to select a primary database for TaskFlow Pro. The application requires:
- Complex queries across tasks, users, workspaces
- ACID transactions for task state changes
- Full-text search capability
- Proven scalability

## Decision

We will use **PostgreSQL 15** as our primary database.

## Rationale

| Criteria | PostgreSQL | MongoDB |
|----------|------------|---------|
| Query flexibility | Strong (SQL) | Limited (aggregation) |
| ACID compliance | Full | Limited |
| Full-text search | Built-in | Requires Atlas |
| Team expertise | High | Low |
| Operational cost | Lower | Higher (Atlas) |

## Consequences

### Positive
- Strong data integrity guarantees
- Familiar to development team
- Excellent tooling ecosystem
- Cost-effective hosting options

### Negative
- Schema migrations required for changes
- Horizontal scaling more complex
- JSON operations less natural than MongoDB

## Alternatives Considered

1. **MongoDB**: Rejected due to team expertise gap and transactional requirements
2. **MySQL**: Rejected due to inferior JSON support and full-text search
3. **CockroachDB**: Rejected due to operational complexity for our scale
