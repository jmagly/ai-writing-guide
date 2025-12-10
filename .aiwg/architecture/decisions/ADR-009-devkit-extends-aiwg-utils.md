# ADR-009: Development Kit as Extension of aiwg-utils

**Status**: Proposed
**Date**: 2025-12-10
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Development Kit Implementation

---

## Context and Problem Statement

The AIWG Development Kit needs a home within the AIWG architecture. Users have requested easier tools for creating and extending AIWG frameworks, addons, and extensions. The kit will provide CLI scaffolding, in-session commands, templates, and documentation.

Options considered:
1. **Separate addon** (`aiwg-devkit`) - New standalone addon
2. **Extension of aiwg-utils** - Add devkit features to existing addon
3. **Core tools only** - CLI only, no addon components

## Decision Drivers

- **User accessibility**: Should be immediately available without extra installation
- **Consistency**: Should align with existing AIWG patterns
- **Maintenance**: Should minimize duplication and fragmentation
- **Discoverability**: Users should find devkit features easily

## Decision

Extend **aiwg-utils** with Development Kit capabilities rather than creating a separate addon.

## Rationale

1. **Already core and auto-installed**: aiwg-utils is marked `core: true` and `autoInstall: true`, meaning all users already have access
2. **Consistent with purpose**: "Utils" naturally encompasses development utilities
3. **Avoids addon proliferation**: Users don't need to install another package
4. **Manifest support**: aiwg-utils already supports commands, agents, and skills
5. **Single point of documentation**: Users look in one place for utility features

## Consequences

### Positive

- Zero-friction access to devkit features
- No additional installation or deployment steps
- Consolidated utility documentation
- Simplified dependency management

### Negative

- aiwg-utils becomes larger (acceptable for utility purpose)
- Version coordination (bump to 1.2.0)
- May need future splitting if scope expands significantly

### Risks

**Risk: aiwg-utils becomes unwieldy** (LOW)
- **Mitigation**: Monitor size, extract to separate addon if exceeds 25 commands
- **Acceptance**: Current projection is ~16 commands total, well within scope

## Alternatives Considered

### Alternative 1: Separate aiwg-devkit Addon

Create `agentic/code/addons/aiwg-devkit/` as standalone addon.

**Rejected because**: Users would need extra installation step, fragments utility features, requires separate documentation.

### Alternative 2: Core Tools Only (No Addon)

Put everything in `tools/` without addon structure.

**Rejected because**: In-session commands need addon structure, loses discoverability benefits, inconsistent with AIWG patterns.

## References

- **ADR-008**: Plugin Type Taxonomy (defines addon vs framework vs extension)
- **aiwg-utils manifest**: Current addon structure
- **AIWG Development Kit Plan**: `.aiwg/planning/aiwg-devkit-plan.md`

---

**Last Updated**: 2025-12-10
**Author**: Claude (Orchestrator)
**Reviewers**: Project Owner (pending)
