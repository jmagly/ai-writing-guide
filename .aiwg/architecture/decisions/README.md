# Architecture Decision Records (ADRs)

This directory contains formal Architecture Decision Records extracted from the Software Architecture Document v1.0 for the AIWG SDLC Framework Plugin System.

## ADR Index

| ADR | Title | Status | Date | Summary |
|-----|-------|--------|------|---------|
| [ADR-001](ADR-001-plugin-manifest-format.md) | Plugin Manifest Format | Accepted | 2025-10-18 | Use YAML format with semantic versioning for plugin manifests to balance human readability with structural expressiveness |
| [ADR-002](ADR-002-plugin-isolation-strategy.md) | Plugin Isolation Strategy | Accepted | 2025-10-18 | Implement filesystem-based isolation with NO code execution, removing lifecycle hooks for security |
| [ADR-003](ADR-003-traceability-automation-approach.md) | Traceability Automation Approach | Accepted | 2025-10-18 | Parse metadata from artifacts to build dependency graphs automatically, achieving 99% effort reduction |
| [ADR-004](ADR-004-contributor-workspace-isolation.md) | Contributor Workspace Isolation | Accepted | 2025-10-18 | Create isolated workspaces in `.aiwg/contrib/{feature}/` for parallel contribution without conflicts |
| [ADR-005](ADR-005-quality-gate-thresholds.md) | Quality Gate Thresholds | Accepted | 2025-10-18 | Set 80/100 minimum and 85/100 target quality scores to balance accessibility with code quality |
| [ADR-006](ADR-006-plugin-rollback-strategy.md) | Plugin Rollback Strategy | Accepted | 2025-10-18 | Implement transaction-based installation with filesystem snapshots for reliable failure recovery |

## Context

These ADRs were formalized from Section 6 (Design Decisions and Rationale) and Section 9 (Key Decisions) of the Software Architecture Document v1.0, which was baselined on 2025-10-18 as part of the AIWG SDLC Framework Inception Phase.

## Key Architectural Principles

1. **Security First**: No arbitrary code execution in plugins (ADR-002)
2. **Automation**: 99% reduction in manual traceability effort (ADR-003)
3. **Simplicity**: Filesystem-based approaches over complex solutions
4. **Reliability**: Transaction-based operations with rollback capability (ADR-006)
5. **Accessibility**: Balance quality requirements with contributor experience (ADR-005)

## Relationships

- ADR-001 and ADR-002 are tightly coupled - the manifest format excludes lifecycle hooks per the isolation strategy
- ADR-003 enables ADR-005's traceability scoring component
- ADR-004 and ADR-002 share the same filesystem security boundaries
- ADR-006 depends on ADR-001's versioning for rollback operations

## Source Document

Software Architecture Document v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`

## Status

All ADRs are **ACCEPTED** and baselined as part of the Architecture Baseline milestone (Inception Phase, Week 2).

## Next Steps

These ADRs guide the Construction Phase implementation beginning Week 1:
- Security enhancements per ADR-002 (Weeks 1-4)
- Rollback implementation per ADR-006 (Weeks 1-2)
- Traceability automation per ADR-003 (Weeks 5-6)
- Quality gate automation per ADR-005 (Weeks 3-4)