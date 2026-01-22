# ADR-001: Unified Extension System

**Status**: Accepted
**Date**: 2026-01-22
**Deciders**: Architecture Designer, Code Reviewer, API Designer
**Technical Story**: [Epic #28](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/28)

## Context and Problem Statement

The AIWG CLI has grown to 605 lines with a monolithic command router containing:
- 58 lines of `COMMAND_ALIASES` mapping command variants
- 107 lines of `displayHelp()` hardcoded help text
- 70 lines of `handleUse()` framework deployment logic
- 150+ lines of switch/case routing to 32 commands

This architecture creates several problems:
1. **Maintenance burden**: Adding commands requires modifying multiple locations
2. **Code duplication**: Similar patterns repeated for each command category
3. **No extensibility**: Third-party extensions cannot add commands
4. **Testing difficulty**: Monolithic structure makes unit testing hard
5. **Documentation drift**: Help text separate from command implementation
6. **Platform coupling**: No abstraction for multi-platform support

## Decision Drivers

- **Modularity**: Extensions should be self-contained, single-file definitions
- **Type Safety**: Full TypeScript typing with runtime validation
- **Backward Compatibility**: All existing commands must continue working identically
- **Performance**: Registry operations should be O(1) or O(log n)
- **Discovery**: Support capability-based querying ("find all formatters")
- **Platform Agnostic**: Same extensions work across Claude, Copilot, Factory, Cursor

## Considered Options

### Option 1: Plugin Architecture with Dynamic Loading

Load extensions at runtime from plugin directories using `import()`.

**Pros**:
- True plugin isolation
- Hot-reload capability
- Third-party extensibility

**Cons**:
- Complex lifecycle management
- Security concerns with dynamic code
- Startup performance impact
- Difficult dependency management

### Option 2: Configuration-Driven Registry (Selected)

Extensions defined as declarative JSON/YAML with handler references.

**Pros**:
- Fast static analysis
- Type-safe with Zod validation
- Platform-portable
- Deterministic behavior
- Supports capability indexing

**Cons**:
- Less dynamic than true plugins
- Requires build step for TypeScript handlers
- More upfront schema design

### Option 3: Monorepo with Package-Based Extensions

Each extension as a separate npm package in a monorepo.

**Pros**:
- Clean separation
- Independent versioning
- npm ecosystem tooling

**Cons**:
- Heavy infrastructure overhead
- Complex dependency management
- Overkill for internal extensions

## Decision Outcome

**Chosen option**: Configuration-Driven Registry (Option 2)

This provides the right balance of type safety, performance, and maintainability while supporting the multi-platform deployment model AIWG requires.

## Architecture

### Unified Extension Schema

All extension types (agent, command, skill, hook, tool, mcp-server, framework, addon, template, prompt) share a common base schema:

```typescript
interface Extension {
  id: string;                    // Unique identifier (e.g., "sdlc:commit-and-push")
  type: ExtensionType;           // Discriminator for type guards
  name: string;                  // Human-readable name
  description: string;           // Brief description for help/discovery
  version: string;               // Semantic version
  metadata: ExtensionMetadata;   // Common metadata (author, license, etc.)
  capabilities?: string[];       // Capability tags for discovery
  platforms?: PlatformCompatibility; // Platform support matrix
}
```

### Type-Specific Extensions

Each extension type adds type-specific properties:

```typescript
interface CommandExtension extends Extension {
  type: 'command';
  command: {
    name: string;
    aliases: string[];
    category: string;
    handler: string;           // Path to handler module
    subcommands?: SubcommandDef[];
    options?: OptionDef[];
  };
}
```

### Extension Registry

The registry provides O(1) lookup by ID and efficient capability queries:

```typescript
interface ExtensionRegistry {
  extensions: Map<string, Extension>;
  byType: Map<ExtensionType, Set<string>>;
  byCapability: CapabilityIndex;

  get(id: string): Extension | undefined;
  getByType<T>(type: ExtensionType): T[];
  queryCapabilities(query: CapabilityQuery): Extension[];
  register(extension: Extension): void;
}
```

### CLI Integration

The refactored CLI entry point delegates to the registry:

```typescript
// Target: ~50 lines
export async function run(args: string[]) {
  const registry = await loadRegistry();
  const command = registry.resolveCommand(args[0]);

  if (!command) {
    return registry.generateHelp();
  }

  return command.handler.execute(args.slice(1));
}
```

## Migration Strategy

### Phase 1: Extract Handlers (Issues #33-42)
- Extract each command handler to `src/cli/handlers/<command>.ts`
- Create command extension definition files
- Maintain backward compatibility via facade

### Phase 2: Build Registry (Issues #43-47)
- Implement `ExtensionRegistry` class
- Add Zod validation for all extension types
- Create capability indexing

### Phase 3: Registry-Based Routing (Issues #48-53)
- Replace switch/case with registry lookup
- Generate help text from registry
- Implement command resolution with aliases

### Phase 4: Full Integration (Issues #54-60)
- Remove legacy router code
- Verify all tests pass
- Document migration for existing extensions

## Consequences

### Positive

- **Reduced CLI size**: 605 → ~50 lines (92% reduction)
- **Self-documenting**: Help generated from extension metadata
- **Type safety**: Full TypeScript + Zod validation
- **Testability**: Each handler independently testable
- **Extensibility**: New commands via extension files only
- **Platform support**: Same extensions work everywhere

### Negative

- **Initial complexity**: More files to understand the system
- **Migration effort**: All existing commands must be converted
- **Schema evolution**: Need careful versioning of extension schema

### Neutral

- **Performance**: Registry build at startup (negligible for CLI)
- **Bundle size**: Slightly larger due to Zod schemas

## Validation

Success criteria (from implementation plan):
- [ ] All P0 issues resolved
- [ ] All tests passing (npm test)
- [ ] Test coverage ≥80% for new code
- [ ] CLI entry point ≤60 lines
- [ ] All 32 commands working via registry
- [ ] Characterization tests green (45 tests)

## References

- @.aiwg/architecture/unified-extension-system-implementation-plan.md
- @.aiwg/architecture/unified-extension-schema.md
- @src/extensions/types.ts (1329 lines - type definitions)
- @test/characterization/cli-router.test.ts (45 tests)

## Revision History

| Date | Change |
|------|--------|
| 2026-01-22 | Initial ADR created |
