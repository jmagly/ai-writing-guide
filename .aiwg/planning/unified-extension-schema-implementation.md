# Unified Extension Schema - Implementation Roadmap

**Project:** AIWG Unified Extension System
**Status:** Planning
**Created:** 2026-01-22
**Target:** Q1 2026

## Overview

Implement the unified extension schema to replace fragmented extension types with a single, type-safe system supporting dynamic discovery, semantic search, and unified help generation.

## References

- @.aiwg/architecture/unified-extension-schema.md - Full specification
- @.aiwg/architecture/unified-extension-schema-summary.md - Quick reference
- @src/extensions/types.ts - TypeScript type definitions

## Goals

1. **Unification**: Single schema for all extension types
2. **Discovery**: Capability-based and semantic search
3. **Help System**: Dynamic help generation from metadata
4. **Migration**: Seamless upgrade from existing formats
5. **Performance**: Fast indexing and search
6. **Developer Experience**: Clear APIs and validation

## Success Criteria

- [ ] All extension types use unified schema
- [ ] Validation catches 100% of schema violations
- [ ] Search returns results in <50ms for 1000 extensions
- [ ] Migration preserves all existing functionality
- [ ] Help system generates accurate documentation
- [ ] Zero breaking changes for end users

## Architecture

```
src/extensions/
├── types.ts              # Type definitions (DONE)
├── validate.ts           # Validation engine
├── migrate.ts            # Migration utilities
├── index.ts              # Capability indexer
├── search.ts             # Search functionality
├── deploy.ts             # Deployment engine
├── help.ts               # Help generation
├── registry.ts           # Extension registry
└── __tests__/
    ├── validate.test.ts
    ├── migrate.test.ts
    ├── search.test.ts
    └── integration.test.ts
```

## Phase 1: Core Schema & Validation (Week 1)

### 1.1 Validation Engine

**File:** `src/extensions/validate.ts`

**Deliverables:**

```typescript
// Core validation function
export function validate(extension: Extension): ExtensionValidationResult;

// Validate field requirements
export function validateRequired(ext: Extension): ValidationError[];

// Validate field types
export function validateTypes(ext: Extension): ValidationError[];

// Validate field formats
export function validateFormats(ext: Extension): ValidationError[];

// Validate constraints
export function validateConstraints(ext: Extension): ValidationError[];

// Validate cross-field rules
export function validateCrossField(ext: Extension): ValidationError[];

// Type-specific validation
export function validateTypeSpecific(ext: Extension): ValidationError[];
```

**Implementation:**

1. Create validation rule engine
2. Implement field-level validators
3. Add cross-field validators
4. Create type-specific validators
5. Add helpful error messages with suggestions
6. Write comprehensive tests

**Test Coverage:**

- Valid extensions for each type
- Missing required fields
- Invalid field types
- Format violations
- Constraint violations
- Cross-field violations
- Type-specific violations

### 1.2 Validation Tests

**File:** `src/extensions/__tests__/validate.test.ts`

**Test Cases:**

```typescript
describe('Extension Validation', () => {
  describe('Required Fields', () => {
    it('rejects missing id');
    it('rejects missing type');
    it('rejects missing name');
    // ... all required fields
  });

  describe('Field Formats', () => {
    it('validates kebab-case id');
    it('validates semver version');
    it('validates CalVer version');
  });

  describe('Constraints', () => {
    it('enforces id length limits');
    it('requires at least one capability');
    it('requires at least one platform');
  });

  describe('Cross-Field Rules', () => {
    it('ensures metadata.type matches type');
    it('ensures pathTemplate includes {id}');
  });

  describe('Type-Specific Validation', () => {
    describe('Agent', () => {
      it('requires role');
      it('requires model');
      it('requires tools');
    });
    // ... all types
  });
});
```

**Exit Criteria:**

- [ ] All validation rules implemented
- [ ] 100% test coverage
- [ ] All edge cases handled
- [ ] Clear error messages with suggestions
- [ ] Documentation complete

## Phase 2: Migration System (Week 2)

### 2.1 Migration Engine

**File:** `src/extensions/migrate.ts`

**Deliverables:**

```typescript
// Migrate from any format to unified schema
export function migrate(source: unknown, format: string): Extension;

// Migration registry
export const MIGRATIONS: Record<string, MigrationMapping>;

// Format detection
export function detectFormat(source: unknown): string | null;

// Migrate agent frontmatter
export function migrateAgentFrontmatter(source: unknown): Extension;

// Migrate command frontmatter
export function migrateCommandFrontmatter(source: unknown): Extension;

// Migrate manifest.json
export function migrateManifest(source: unknown): Extension;

// Migrate skill SKILL.md
export function migrateSkill(source: unknown): Extension;

// Batch migration
export function migrateMany(sources: Array<{ source: unknown; format: string }>): Extension[];
```

**Implementation:**

1. Define migration mappings for each format
2. Implement field transformation functions
3. Add default value injection
4. Create format auto-detection
5. Implement batch migration
6. Write migration tests

**Migration Mappings:**

```typescript
// Agent frontmatter → Extension
'agent-frontmatter': {
  fieldMappings: {
    'id': (src) => kebabCase(src.name),
    'name': 'name',
    'description': 'description',
    'metadata.type': () => 'agent',
    'metadata.role': 'description',
    'metadata.model.tier': 'model',
    'metadata.tools': (src) => src.tools.split(', ')
  },
  defaults: {
    'platforms': { claude: 'full', factory: 'full' },
    'version': '1.0.0',
    'capabilities': [],
    'keywords': []
  }
}

// Command frontmatter → Extension
'command-frontmatter': { ... }

// Manifest.json → Extension
'manifest-v1': { ... }
```

### 2.2 Migration Tests

**File:** `src/extensions/__tests__/migrate.test.ts`

**Test Cases:**

```typescript
describe('Extension Migration', () => {
  describe('Format Detection', () => {
    it('detects agent frontmatter');
    it('detects command frontmatter');
    it('detects manifest.json');
    it('returns null for unknown formats');
  });

  describe('Agent Migration', () => {
    it('migrates basic agent');
    it('converts tools string to array');
    it('sets default version');
    it('preserves all metadata');
  });

  describe('Command Migration', () => {
    it('migrates basic command');
    it('converts allowed-tools to array');
    it('maps argument-hint');
  });

  describe('Manifest Migration', () => {
    it('migrates addon manifest');
    it('migrates framework manifest');
    it('preserves all fields');
  });

  describe('Batch Migration', () => {
    it('migrates multiple extensions');
    it('handles mixed formats');
    it('preserves order');
  });
});
```

**Exit Criteria:**

- [ ] All formats supported
- [ ] No data loss in migration
- [ ] Auto-detection works reliably
- [ ] Batch migration efficient
- [ ] Documentation complete

## Phase 3: Index & Search (Week 3)

### 3.1 Capability Indexer

**File:** `src/extensions/index.ts`

**Deliverables:**

```typescript
// Build capability index from extensions
export function buildIndex(extensions: Extension[]): CapabilityIndex;

// Update index incrementally
export function updateIndex(index: CapabilityIndex, extension: Extension): CapabilityIndex;

// Remove from index
export function removeFromIndex(index: CapabilityIndex, extensionId: string): CapabilityIndex;

// Index persistence
export function saveIndex(index: CapabilityIndex, path: string): Promise<void>;
export function loadIndex(path: string): Promise<CapabilityIndex>;

// Index statistics
export function getIndexStats(index: CapabilityIndex): IndexStats;

// Index validation
export function validateIndex(index: CapabilityIndex): boolean;
```

**Implementation:**

1. Build inverted indexes for capabilities, keywords, categories
2. Implement full-text search index
3. Add incremental update support
4. Create persistence layer
5. Optimize for fast lookup
6. Write index tests

**Index Structure:**

```typescript
{
  capabilities: {
    "api-design": ["api-designer", "rest-architect"],
    "traceability": ["mention-wire", "check-traceability"]
  },
  keywords: {
    "sdlc": ["api-designer", "test-engineer", ...],
    "testing": ["test-engineer", "mutation-analyst", ...]
  },
  categories: {
    "sdlc/architecture": ["api-designer", "architecture-designer"],
    "sdlc/testing": ["test-engineer", "test-architect"]
  },
  types: {
    "agent": ["api-designer", "test-engineer", ...],
    "command": ["mention-wire", "generate-tests", ...]
  },
  platforms: {
    "claude": ["api-designer", "mention-wire", ...],
    "factory": ["api-designer", "test-engineer", ...]
  },
  searchIndex: {
    "interface": ["api-designer"],
    "contract": ["api-designer"],
    "test": ["test-engineer", "generate-tests", ...]
  }
}
```

### 3.2 Search Engine

**File:** `src/extensions/search.ts`

**Deliverables:**

```typescript
// Search extensions by capability
export function search(
  index: CapabilityIndex,
  query: CapabilityQuery
): CapabilitySearchResult;

// Capability matching
export function matchCapabilities(
  ext: Extension,
  requires: string[],
  prefers?: string[]
): number;

// Keyword matching
export function matchKeywords(ext: Extension, keywords: string[]): number;

// Full-text search
export function fullTextSearch(
  index: CapabilityIndex,
  query: string
): Map<string, number>;

// Ranking algorithm
export function rankResults(
  matches: Map<string, number>,
  query: CapabilityQuery
): Map<string, number>;

// Filters
export function applyFilters(
  extensions: Extension[],
  query: CapabilityQuery
): Extension[];
```

**Implementation:**

1. Implement capability AND/OR logic
2. Add keyword matching
3. Create full-text search with stemming
4. Implement relevance scoring
5. Add filters (type, platform, status)
6. Optimize for performance
7. Write search tests

**Scoring Algorithm:**

```typescript
function calculateScore(ext: Extension, query: CapabilityQuery): number {
  let score = 0;

  // Required capabilities (must have all)
  if (query.requires) {
    const hasAll = query.requires.every(c => ext.capabilities.includes(c));
    if (!hasAll) return 0;
    score += query.requires.length * 10;
  }

  // Preferred capabilities (bonus for each)
  if (query.prefers) {
    const count = query.prefers.filter(c => ext.capabilities.includes(c)).length;
    score += count * 5;
  }

  // Keyword matches
  if (query.keywords) {
    const count = query.keywords.filter(k => ext.keywords.includes(k)).length;
    score += count * 3;
  }

  // Full-text search
  if (query.search) {
    const terms = query.search.toLowerCase().split(/\s+/);
    const text = `${ext.name} ${ext.description} ${ext.keywords.join(' ')}`.toLowerCase();
    const count = terms.filter(t => text.includes(t)).length;
    score += count * 2;
  }

  // Category exact match
  if (query.category && ext.category === query.category) {
    score += 8;
  }

  return score;
}
```

### 3.3 Search Tests

**File:** `src/extensions/__tests__/search.test.ts`

**Test Cases:**

```typescript
describe('Extension Search', () => {
  describe('Capability Search', () => {
    it('finds extensions by required capabilities');
    it('ranks by preferred capabilities');
    it('requires all required capabilities');
    it('handles missing capabilities');
  });

  describe('Keyword Search', () => {
    it('finds extensions by keywords');
    it('ranks by keyword count');
  });

  describe('Full-Text Search', () => {
    it('searches name and description');
    it('handles multi-word queries');
    it('is case-insensitive');
  });

  describe('Filters', () => {
    it('filters by type');
    it('filters by platform');
    it('filters by status');
    it('filters by category');
  });

  describe('Ranking', () => {
    it('ranks exact matches higher');
    it('ranks by relevance score');
    it('handles ties');
  });

  describe('Performance', () => {
    it('searches 1000 extensions in <50ms');
    it('handles complex queries efficiently');
  });
});
```

**Exit Criteria:**

- [ ] All search features implemented
- [ ] Performance targets met (<50ms)
- [ ] Accurate ranking algorithm
- [ ] Comprehensive test coverage
- [ ] Documentation complete

## Phase 4: Integration & Deployment (Week 4)

### 4.1 Registry System

**File:** `src/extensions/registry.ts`

**Deliverables:**

```typescript
// Extension registry
export class ExtensionRegistry {
  constructor(options: RegistryOptions);

  // Registration
  register(extension: Extension): void;
  unregister(id: string): void;
  update(extension: Extension): void;

  // Lookup
  get(id: string): Extension | null;
  getAll(): Extension[];
  getByType(type: ExtensionType): Extension[];

  // Search
  search(query: CapabilityQuery): CapabilitySearchResult;

  // Index management
  reindex(): void;
  getIndex(): CapabilityIndex;

  // Persistence
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;

  // Stats
  getStats(): RegistryStats;
}

// Registry options
export interface RegistryOptions {
  indexPath?: string;
  autoSave?: boolean;
  validateOnRegister?: boolean;
}
```

**Implementation:**

1. Create registry class with CRUD operations
2. Integrate validation on registration
3. Auto-update index on changes
4. Add persistence layer
5. Implement stats and monitoring
6. Write registry tests

### 4.2 Deployment Engine

**File:** `src/extensions/deploy.ts`

**Deliverables:**

```typescript
// Deploy extension to platform
export async function deploy(
  extension: Extension,
  options: DeployOptions
): Promise<DeployResult>;

// Resolve deployment path
export function resolvePath(
  extension: Extension,
  platform: string
): string;

// Format extension for platform
export function formatForPlatform(
  extension: Extension,
  platform: string
): string;

// Deploy batch
export async function deployMany(
  extensions: Extension[],
  options: DeployOptions
): Promise<DeployResult[]>;

// Undeploy extension
export async function undeploy(
  extension: Extension,
  options: DeployOptions
): Promise<void>;

// Deployment options
export interface DeployOptions {
  platform: string;
  projectPath: string;
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
}
```

**Implementation:**

1. Implement path resolution with variable substitution
2. Add platform-specific formatters
3. Create file writing logic
4. Add backup functionality
5. Implement batch deployment
6. Write deployment tests

### 4.3 Help System

**File:** `src/extensions/help.ts`

**Deliverables:**

```typescript
// Generate help for extension
export function generateHelp(extension: Extension): string;

// Generate type-specific help
export function generateAgentHelp(ext: Extension & { metadata: AgentMetadata }): string;
export function generateCommandHelp(ext: Extension & { metadata: CommandMetadata }): string;
export function generateSkillHelp(ext: Extension & { metadata: SkillMetadata }): string;

// Generate help index
export function generateHelpIndex(extensions: Extension[]): string;

// Generate markdown documentation
export function generateDocs(extension: Extension): string;

// Interactive help browser
export function launchHelpBrowser(registry: ExtensionRegistry): void;
```

**Implementation:**

1. Create help templates for each type
2. Add metadata extraction
3. Format as markdown/HTML
4. Build interactive browser (TUI)
5. Generate comprehensive docs
6. Write help tests

### 4.4 CLI Commands

**Updates to existing commands:**

```bash
# Search extensions
aiwg search <query>
aiwg search --capability api-design
aiwg search --type agent --platform claude

# Show extension info
aiwg info <extension-id>

# Validate extension
aiwg validate <path>

# Migrate extension
aiwg migrate <path> --format agent-frontmatter

# Index management
aiwg index rebuild
aiwg index stats

# Help system
aiwg help <extension-id>
aiwg help --list
aiwg help --browse
```

### 4.5 Smith Integration

**Update all smiths to generate unified schema:**

```typescript
// src/smiths/agentsmith/generate.ts
export async function generate(options: AgentOptions): Promise<Extension> {
  const extension: Extension = {
    id: options.name,
    type: 'agent',
    name: toTitleCase(options.name),
    description: options.description,
    version: '1.0.0',
    capabilities: inferCapabilities(options),
    keywords: inferKeywords(options),
    platforms: getPlatformSupport(options.platform),
    deployment: {
      pathTemplate: '.{platform}/agents/{id}.md',
    },
    metadata: {
      type: 'agent',
      role: options.description,
      model: { tier: options.model || 'sonnet' },
      tools: options.tools || ['Read', 'Write'],
      template: options.template || 'simple',
    },
  };

  // Validate before returning
  const result = validate(extension);
  if (!result.valid) {
    throw new ValidationError(result.errors);
  }

  return extension;
}
```

**Similar updates for:**
- CommandSmith
- SkillSmith
- ToolSmith
- MCPSmith

### 4.6 Integration Tests

**File:** `src/extensions/__tests__/integration.test.ts`

**Test Cases:**

```typescript
describe('Extension System Integration', () => {
  describe('End-to-End Workflow', () => {
    it('creates, validates, registers, deploys extension');
    it('searches and retrieves extension');
    it('updates extension and reindexes');
    it('generates help documentation');
  });

  describe('Smith Integration', () => {
    it('agentsmith generates valid extensions');
    it('commandsmith generates valid extensions');
    it('skillsmith generates valid extensions');
  });

  describe('Migration Workflow', () => {
    it('detects format and migrates');
    it('validates migrated extension');
    it('deploys migrated extension');
  });

  describe('Multi-Platform Deployment', () => {
    it('deploys to multiple platforms');
    it('applies platform-specific formatting');
    it('resolves path overrides');
  });

  describe('Registry Persistence', () => {
    it('saves and loads registry');
    it('preserves index on reload');
    it('handles concurrent access');
  });
});
```

**Exit Criteria:**

- [ ] All smiths generate unified schema
- [ ] CLI commands work correctly
- [ ] Help system generates accurate docs
- [ ] Deployment works on all platforms
- [ ] Integration tests pass
- [ ] Documentation complete

## Phase 5: Documentation & Release (Week 5)

### 5.1 Documentation

**Deliverables:**

1. **API Reference** - Complete TypeScript API docs
2. **User Guide** - How to use the extension system
3. **Developer Guide** - How to create extensions
4. **Migration Guide** - How to upgrade from old formats
5. **Examples** - Working examples for each extension type
6. **Troubleshooting** - Common issues and solutions

**Files:**

- `docs/api/extensions.md` - API reference
- `docs/guides/extension-development.md` - Developer guide
- `docs/guides/extension-migration.md` - Migration guide
- `docs/examples/creating-agents.md` - Agent examples
- `docs/examples/creating-commands.md` - Command examples
- `docs/troubleshooting/extensions.md` - Troubleshooting

### 5.2 Release Checklist

- [ ] All phases complete
- [ ] All tests passing (unit + integration)
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Migration guide verified
- [ ] Example extensions created
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Backward compatibility verified

### 5.3 Rollout Plan

**Week 1: Internal Testing**
- Deploy to test projects
- Verify migration works
- Collect feedback
- Fix critical issues

**Week 2: Beta Release**
- Release to beta users
- Monitor for issues
- Provide migration support
- Iterate based on feedback

**Week 3: Full Release**
- Public release
- Update all documentation
- Announce on Discord/Telegram
- Create tutorial videos
- Monitor adoption

**Week 4: Stabilization**
- Fix reported issues
- Performance optimization
- Enhance based on feedback
- Plan next iteration

## Risks & Mitigations

### Risk: Breaking Changes

**Mitigation:**
- Comprehensive migration layer
- Backward compatibility mode
- Deprecation warnings, not immediate removal
- Clear migration documentation

### Risk: Performance Degradation

**Mitigation:**
- Performance benchmarks from day 1
- Optimize critical paths (search, validation)
- Lazy loading where possible
- Cache frequently accessed data

### Risk: Migration Data Loss

**Mitigation:**
- Extensive migration testing
- Automated migration verification
- Manual review for critical extensions
- Rollback plan

### Risk: Adoption Resistance

**Mitigation:**
- Clear value proposition
- Easy migration path
- Comprehensive documentation
- Active support during transition

## Success Metrics

### Technical Metrics

- **Validation Speed**: <10ms per extension
- **Search Speed**: <50ms for 1000 extensions
- **Migration Success**: 100% data preservation
- **Test Coverage**: >90%
- **Type Safety**: Zero `any` types in public API

### User Metrics

- **Migration Time**: <1 hour per project
- **Discovery Improvement**: 50% faster finding extensions
- **Documentation Quality**: User survey >4/5
- **Developer Satisfaction**: Survey >4/5

### System Metrics

- **Code Reduction**: 30% less extension-related code
- **Maintainability**: Single source of truth
- **Extensibility**: New extension types in <1 day

## Future Enhancements

### Version 2.0 (Q2 2026)

- Dependency resolution and auto-install
- Extension marketplace/registry
- Version constraints (semver ranges)
- Extension composition (workflows)

### Version 3.0 (Q3 2026)

- Dynamic loading (hot-reload)
- Sandboxed execution
- AI-powered semantic search
- Usage analytics
- Extension recommendations

## References

- @.aiwg/architecture/unified-extension-schema.md
- @.aiwg/architecture/unified-extension-schema-summary.md
- @src/extensions/types.ts
- @src/smiths/agentsmith/types.ts
- @src/smiths/commandsmith/types.ts
- @src/smiths/skillsmith/types.ts
- @src/catalog/types.ts

## Conclusion

The unified extension schema provides a solid foundation for AIWG's extensibility system. This implementation plan delivers the system in 5 weeks with clear milestones, comprehensive testing, and careful attention to backward compatibility.

The phased approach allows for iterative validation and reduces risk, while the comprehensive test suite ensures quality and reliability. Post-release monitoring and support ensure successful adoption.
