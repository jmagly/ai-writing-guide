# REF-011: An Analysis of the Requirements Traceability Problem

## Citation

Gotel, O. C. Z., & Finkelstein, A. C. W. (1994). An analysis of the requirements traceability problem. *Proceedings of IEEE International Conference on Requirements Engineering*, 94-101.

**DOI**: [10.1109/ICRE.1994.292398](https://doi.org/10.1109/ICRE.1994.292398)

**Link**: [IEEE Xplore](https://ieeexplore.ieee.org/document/292398) | [PDF](https://discovery.ucl.ac.uk/749/1/2.2_rtprob.pdf)

## Summary

Foundational empirical study (100+ practitioners) identifying the requirements traceability problem: the difficulty of following the life of a requirement through development. Distinguishes pre-RS (pre-requirements specification) and post-RS traceability, showing most problems stem from inadequate pre-RS traceability.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Requirements Traceability** | Ability to follow life of a requirement bidirectionally |
| **Pre-RS Traceability** | Tracing requirements to their origins (stakeholders, rationale) |
| **Post-RS Traceability** | Tracing requirements to implementation and tests |
| **Forward Traceability** | Requirements → Design → Code → Tests |
| **Backward Traceability** | Tests → Code → Design → Requirements |

### Key Findings

1. **Pre-RS Gap**: Most problems attributed to poor traceability stem from inadequate pre-RS traceability
2. **Bidirectionality Critical**: Both forward and backward tracing needed
3. **Human Factor**: Traceability is as much social/organizational as technical
4. **Maintenance Burden**: Keeping traces current is the primary challenge

### Traceability Dimensions

```
           BACKWARD                    FORWARD
              ←                           →
Stakeholders → Requirements → Design → Code → Tests
              ↑_____________________________|
                    BIDIRECTIONAL
```

## AIWG Application

### Direct Implementation: @-Mention System

AIWG's @-mention system implements bidirectional traceability:

| Traceability Type | AIWG Implementation |
|-------------------|---------------------|
| Pre-RS (origin) | `@.aiwg/intake/` links to stakeholder input |
| Post-RS (forward) | Code comments: `@implements @.aiwg/requirements/UC-001.md` |
| Backward | Test files: `@source @src/auth/login.ts` |
| Bidirectional | Cross-references in both directions |

### @-Mention Wiring Pattern

```typescript
// Forward: Source → Test
// src/auth/login.ts
/**
 * @implements @.aiwg/requirements/use-cases/UC-AUTH-001.md
 * @tests @test/unit/auth/login.test.ts
 */

// Backward: Test → Source
// test/unit/auth/login.test.ts
/**
 * @source @src/auth/login.ts
 * @requirement @.aiwg/requirements/use-cases/UC-AUTH-001.md
 */
```

### Traceability in SDLC Artifacts

```
.aiwg/
├── intake/              # Stakeholder origins (Pre-RS)
│   └── project-intake-form.md
│         ↓
├── requirements/        # Requirements specification
│   └── use-cases/
│       └── UC-AUTH-001.md
│             ↓ @implements
├── architecture/        # Design decisions
│   └── adrs/
│       └── ADR-001-auth-strategy.md
│             ↓ @implements
└── [Code files]         # Implementation
      └── src/auth/login.ts
            ↓ @tests
      └── test/unit/auth/login.test.ts
```

### Commands for Traceability

| Command | Purpose |
|---------|---------|
| `/mention-wire` | Add @-mentions to existing codebase |
| `/mention-validate` | Verify all mentions point to existing files |
| `/mention-report` | Generate traceability matrix |
| `/check-traceability` | Verify requirements-to-code coverage |

## Key Quotes

> "Requirements traceability refers to the ability to describe and follow the life of a requirement, in both a forwards and backwards direction."

> "The majority of the problems attributed to poor requirements traceability are due to inadequate pre-RS traceability."

> "An all-encompassing solution to the requirements traceability problem is unlikely due to its multifaceted nature."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| @-Mention System | **Critical** - core implementation |
| Artifact Management | **Critical** - linking strategy |
| Quality Assurance | **High** - verification commands |

## Related Standards

- IEEE 830: Software Requirements Specifications
- DO-178C: Airborne software traceability requirements
- ISO 26262: Automotive software safety traceability

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
