# ADR-004: Contributor Workspace Isolation

**Status**: Accepted
**Date**: 2025-10-18
**Deciders**: Architecture Designer, DevOps Engineer, Security Architect
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

Contributors may work on multiple features simultaneously, and multiple contributors may work on the same project. Without proper isolation, feature development can conflict, causing merge issues, test contamination, and development friction. We need a workspace strategy that enables parallel contribution without interference while remaining simple enough for solo maintainer oversight.

## Decision Drivers

- **Parallel development**: Enable multiple contributors working simultaneously
- **Feature isolation**: Prevent cross-contamination between features
- **Easy cleanup**: Simple abort/rollback for failed contributions
- **Git compatibility**: Work well with Git-based workflows
- **Disk efficiency**: Reasonable space requirements for workspaces
- **Maintainer simplicity**: Solo maintainer must easily review contributions

## Considered Options

1. **Directory-based workspace isolation** - Separate `.aiwg/contrib/{feature}/` directories per contribution
2. **Git branches only** - Rely solely on Git branching for isolation
3. **Separate repository clones** - Full repository clone per feature
4. **Docker containers** - Containerized development environments
5. **Namespace prefixes** - Use naming conventions to separate features
6. **Monorepo tooling** - Adopt tools like Lerna, Rush, or Nx

## Decision Outcome

**Chosen option**: "Directory-based workspace isolation (`.aiwg/contrib/{feature}/`)"

**Rationale**: Directory isolation provides clear physical separation between features while maintaining simplicity. Each feature gets its own workspace that can be easily created, tested, and deleted without affecting other work. This approach is Git-friendly (each workspace maps to a branch) and requires no additional tooling or infrastructure.

## Consequences

### Positive

- Clean feature isolation with zero cross-contamination
- Parallel contributions fully supported (100+ simultaneous)
- Easy abort with simple directory deletion
- Git-friendly structure for tracking changes
- No additional tooling or infrastructure required
- Clear workspace ownership and boundaries
- Simple workspace management commands

### Negative

- Disk space overhead for multiple workspaces (~50MB per workspace)
- Need explicit workspace management commands
- Contributors must remember active workspaces
- Potential for orphaned workspaces if not cleaned
- Manual coordination for shared dependencies

### Risks

- Workspace proliferation if cleanup not enforced
- Disk space exhaustion with many parallel features
- Confusion if workspace names collide

## Implementation Notes

**Workspace Structure**:
```
.aiwg/contrib/
├── feature-a/          # Isolated workspace for feature A
│   ├── plugin.yaml     # Feature-specific plugin manifest
│   ├── templates/      # New templates
│   ├── agents/         # New agents
│   └── tests/          # Feature tests
├── feature-b/          # Parallel workspace for feature B
└── bugfix-123/         # Workspace for bug fix
```

**Workspace Lifecycle**:
1. Create: `aiwg -contribute-start "feature-name"`
2. Develop: Work in `.aiwg/contrib/feature-name/`
3. Test: `aiwg -contribute-test "feature-name"`
4. Submit: `aiwg -contribute-pr "feature-name"`
5. Cleanup: `aiwg -contribute-cleanup "feature-name"`

**Workspace Management Commands**:
- List workspaces: `aiwg -contribute-list`
- Switch workspace: `aiwg -contribute-switch "feature-name"`
- Clean all: `aiwg -contribute-cleanup-all`

**Isolation Guarantees**:
- Each workspace has independent file system
- No shared state between workspaces
- Tests run in workspace context only
- Quality gates validate workspace independently

## Related Decisions

- ADR-002: Plugin Isolation Strategy (workspaces follow same security boundaries)
- ADR-005: Quality Gate Thresholds (applied per workspace)
- SAD Section 5.2: Contributor Workflow Components (ForkManager implementation)

## References

- SAD v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Contributor Workflow Requirements: Section 3.1 of SAD
- ForkManager Component: Section 5.2 of SAD
- Directory Structure: Section 4.3 of SAD