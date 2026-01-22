# Unified Extension Schema - Deliverables Summary

**Date:** 2026-01-22
**Role:** API Designer
**Task:** Research and design unified extension schema for AIWG
**Status:** Design Complete

## Overview

Completed comprehensive design of unified extension schema that consolidates all AIWG extension types (agents, commands, skills, hooks, tools, MCP servers, frameworks, addons, templates, prompts) into a single, type-safe system with capability-based discovery and semantic search.

## Deliverables

### 1. Complete TypeScript Type Definitions

**File:** `@src/extensions/types.ts` (1,200+ lines)

**Contents:**
- Core `Extension` interface (single schema for all types)
- `ExtensionMetadata` discriminated union (type-specific data)
- Platform compatibility types
- Deployment configuration types
- Capability index types
- Search query and result types
- Validation rule types
- Migration mapping types
- Type guards for safe narrowing

**Key Features:**
- Fully type-safe with discriminated unions
- Supports all 10 extension types
- Platform-agnostic deployment
- Dependency management (requires, recommends, conflicts)
- Research compliance metadata
- Installation state tracking
- Signature/checksum validation

### 2. Unified Extension Schema Specification

**File:** `@.aiwg/architecture/unified-extension-schema.md` (1,800+ lines)

**Contents:**
- Design goals and philosophy
- Complete interface contracts
- Type discriminators
- Platform compatibility matrix
- Deployment configuration
- Type-specific metadata for all 10 types
- Capability index format
- Migration mapping strategy
- Validation rules
- Usage examples for each type

### 3. Quick Reference Guide

**File:** `@.aiwg/architecture/unified-extension-schema-summary.md` (700+ lines)

**Contents:**
- Core structure overview
- Extension type reference
- Platform compatibility guide
- Deployment configuration patterns
- Capability search examples
- Validation rules summary
- Migration guide from old formats
- Type guard usage
- Best practices

### 4. Implementation Roadmap

**File:** `@.aiwg/planning/unified-extension-schema-implementation.md` (1,000+ lines)

**Contents:**
- 5-week phased implementation plan
- Architecture overview
- Phase-by-phase deliverables
- Risk mitigation strategies
- Success metrics
- Future enhancements

## Key Design Decisions

### 1. Discriminated Unions

Used TypeScript discriminated unions for type safety enabling type-safe narrowing, exhaustive pattern matching, and IDE autocomplete.

### 2. Capability-Based Discovery

Extensions expose capabilities for semantic search enabling find-by-capability, AND/OR logic, and relevance scoring.

### 3. Platform Compatibility Matrix

Explicit support levels (full, partial, experimental, none) for platform-specific deployment and graceful degradation.

### 4. Deployment Configuration

Flexible path templates with variable substitution for platform-specific paths and multi-file extensions.

### 5. Dependency Management

Express relationships (requires, recommends, conflicts, systemDependencies) for automatic resolution and conflict detection.

### 6. Migration Layer

Backward-compatible migration mappings for zero-downtime migration and automated conversion.

### 7. Capability Index

Inverted index for sub-50ms search across 1000 extensions with multi-dimensional filtering.

## Extension Types Supported

1. **Agent** - Specialized AI personas with roles and tools
2. **Command** - Slash commands for workflow automation
3. **Skill** - Natural language-triggered capabilities
4. **Hook** - Lifecycle event handlers
5. **Tool** - System tools and utilities
6. **MCP Server** - Model Context Protocol servers
7. **Framework** - Complete workflow systems (SDLC, Marketing)
8. **Addon** - Extension packages
9. **Template** - Reusable document templates
10. **Prompt** - Importable prompt snippets

## Platform Support

- Claude Code / Desktop
- Factory AI
- Cursor
- GitHub Copilot
- Windsurf
- Codex / OpenAI
- OpenCode
- Generic / Warp

## Implementation Phases

### Phase 1: Core (Week 1)
- ✅ Type definitions complete
- Validation engine
- Validation tests
- **Exit:** All validation rules working

### Phase 2: Migration (Week 2)
- Migration engine
- Format auto-detection
- Migration tests
- **Exit:** All formats migrate cleanly

### Phase 3: Search (Week 3)
- Capability indexer
- Search engine
- Performance optimization
- **Exit:** <50ms search for 1000 extensions

### Phase 4: Integration (Week 4)
- Extension registry
- Deployment engine
- Help system
- Smith integration
- **Exit:** All smiths generate unified schema

### Phase 5: Release (Week 5)
- Documentation
- Examples
- Migration guide
- Release
- **Exit:** Public release ready

## Success Criteria

### Technical
- [x] Type definitions complete
- [ ] Validation speed <10ms
- [ ] Search speed <50ms for 1000 extensions
- [ ] 100% data preservation in migration
- [ ] >90% test coverage

### User
- [ ] Migration time <1 hour per project
- [ ] 50% faster extension discovery
- [ ] Documentation quality >4/5
- [ ] Developer satisfaction >4/5

### System
- [ ] 30% code reduction
- [ ] Single source of truth
- [ ] New extension types in <1 day

## Example Extension (Agent)

```typescript
const apiDesigner: Extension = {
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Defines API styles, endpoints, and data contracts.',
  version: '1.0.0',
  capabilities: ['api-design', 'interface-contracts', 'rest', 'versioning'],
  keywords: ['api', 'rest', 'contracts', 'sdlc'],
  category: 'sdlc/architecture',
  platforms: { claude: 'full', factory: 'full', cursor: 'full' },
  deployment: { pathTemplate: '.{platform}/agents/{id}.md' },
  requires: ['sdlc-complete'],
  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: { tier: 'sonnet' },
    tools: ['Read', 'Write', 'Glob', 'Grep'],
    canDelegate: true,
    responsibilities: [
      'Author interface and data contract cards',
      'Define error models and versioning strategy'
    ]
  }
};
```

## Files Created

1. **src/extensions/types.ts** (1,200+ lines)
   - Complete TypeScript type definitions

2. **.aiwg/architecture/unified-extension-schema.md** (1,800+ lines)
   - Full specification and design rationale

3. **.aiwg/architecture/unified-extension-schema-summary.md** (700+ lines)
   - Quick reference guide

4. **.aiwg/planning/unified-extension-schema-implementation.md** (1,000+ lines)
   - 5-week implementation roadmap

## Total Deliverables

- **4 comprehensive documents** (4,700+ lines)
- **Complete type system** (1,200+ lines of TypeScript)
- **10 extension types** fully specified
- **8 platform integrations** defined
- **5-week implementation plan** with milestones
- **Migration mappings** for all existing formats
- **Validation rules** for quality assurance
- **Search system** design with <50ms target
- **Help system** architecture
- **Example extensions** for each type

## Next Steps

1. **Review**: Stakeholder review of design
2. **Phase 1**: Implement validation engine (Week 1)
3. **Phase 2**: Build migration system (Week 2)
4. **Phase 3**: Create search functionality (Week 3)
5. **Phase 4**: Integrate with smiths (Week 4)
6. **Phase 5**: Document and release (Week 5)

## References

- @.aiwg/architecture/unified-extension-schema.md - Full specification
- @.aiwg/architecture/unified-extension-schema-summary.md - Quick reference
- @.aiwg/planning/unified-extension-schema-implementation.md - Implementation roadmap
- @src/extensions/types.ts - TypeScript implementation
