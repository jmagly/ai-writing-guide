# ADR-001: Plugin Manifest Format

**Status**: Accepted
**Date**: 2025-10-18
**Deciders**: Architecture Designer, Security Architect, Requirements Analyst
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

Plugins need standardized metadata for discovery, installation, and integration with the AIWG framework. The manifest format must support complex configurations while remaining human-readable and maintainable. This format will define how plugins declare their capabilities, dependencies, and integration points.

## Decision Drivers

- **Human readability**: Contributors must easily understand and modify plugin configurations
- **Expressiveness**: Support complex structures for dependencies, injections, and multi-platform configurations
- **Tooling compatibility**: Must work with existing AIWG Node.js tooling ecosystem
- **Documentation**: Need ability to include inline comments for clarity
- **Security**: Format must not introduce execution vulnerabilities

## Considered Options

1. **YAML** - Human-readable data serialization format with comment support
2. **JSON** - Native JavaScript format, widely supported but less readable
3. **TOML** - Simple configuration format, growing popularity
4. **JavaScript** - Direct code execution with maximum flexibility
5. **XML** - Enterprise standard, verbose but well-structured

## Decision Outcome

**Chosen option**: "YAML format with semantic versioning"

**Rationale**: YAML provides the optimal balance of human readability and structural expressiveness. It supports the complex nested structures required for plugin dependencies and injections while maintaining clarity through indentation-based formatting. The ability to include comments directly in the manifest enables better documentation without external files.

## Consequences

### Positive

- Clear, readable plugin definitions that contributors can easily understand
- Version compatibility checking through semantic versioning
- Support for complex nested configurations (dependencies, platform-specific settings)
- Comments allow inline documentation of configuration choices
- Wide ecosystem support with mature parsing libraries

### Negative

- Additional dependency on js-yaml parsing library
- YAML parsing vulnerabilities require security hardening (FAILSAFE_SCHEMA)
- More complex validation compared to JSON Schema
- Indentation sensitivity can cause formatting errors

### Risks

- YAML deserialization attacks if not properly configured
- Schema validation complexity for deeply nested structures
- Version compatibility matrix management as plugins proliferate

## Implementation Notes

The manifest will use the following structure:
- Root-level metadata (name, version, type, description, author)
- Dependencies section with semantic version constraints
- Platform compatibility matrix
- Provides section detailing templates, agents, commands, and injections
- Configuration options for runtime settings
- Quality metrics for validation gates

Security hardening through:
- FAILSAFE_SCHEMA to prevent code execution
- 100KB size limit on manifest files
- JSON Schema validation of structure
- Required fields enforcement

## Related Decisions

- ADR-002: Plugin Isolation Strategy (defines security boundaries for manifest processing)
- ADR-004: Contributor Workspace Isolation (uses manifest for workspace configuration)
- ADR-006: Plugin Rollback Strategy (requires manifest versioning for rollback)

## References

- SAD v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Plugin Manifest Schema: Section 4.5 of SAD
- Security View: Section 4.6 of SAD (YAML security considerations)