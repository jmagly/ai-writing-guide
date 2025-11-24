# Workspace Management Components

Framework-scoped workspace management for AIWG (FID-007).

## Overview

This directory contains components for managing framework-scoped workspaces, enabling multiple process frameworks (SDLC, Marketing, Agile, etc.) to coexist within a single repository without cross-contamination.

## Components

### MetadataLoader

Extract and validate YAML frontmatter from markdown files (commands, agents, templates).

**File**: `metadata-loader.mjs`

**Responsibilities**:
- Extract YAML frontmatter from markdown files
- Validate metadata schema (required: `framework`, optional: `framework-version`, `output-path`, `context-paths`)
- Safe YAML parsing (prevents code injection)
- In-memory caching to avoid repeated file reads
- Batch loading for performance (parallel processing)

**Usage**:

```javascript
import { MetadataLoader } from './metadata-loader.mjs';

const loader = new MetadataLoader();

// Load single file
const metadata = await loader.loadFromFile('.claude/commands/flow-inception-to-elaboration.md');
console.log(metadata.framework); // 'sdlc-complete'

// Load by command ID
const cmdMeta = await loader.loadCommandMetadata('flow-inception-to-elaboration');

// Load by agent ID
const agentMeta = await loader.loadAgentMetadata('architecture-designer');

// Batch load multiple files
const results = await loader.loadBatch([
  '.claude/commands/cmd1.md',
  '.claude/commands/cmd2.md'
]);
```

**CLI Usage**:

```bash
# Load metadata from file
node tools/workspace/metadata-loader.mjs .claude/commands/flow-inception.md

# Output:
# ✓ Metadata loaded successfully:
# {
#   "framework": "sdlc-complete",
#   "frameworkVersion": "1.0",
#   "outputPath": "frameworks/sdlc-complete/projects/{project-id}/",
#   ...
# }
```

**Metadata Schema**:

Commands (`.claude/commands/*.md`):
```yaml
---
command-id: flow-inception-to-elaboration
framework: sdlc-complete              # REQUIRED (kebab-case)
framework-version: "1.0"              # REQUIRED (quoted X.Y format)
output-path: frameworks/sdlc-complete/projects/{project-id}/
context-paths:
  - frameworks/sdlc-complete/repo/
  - frameworks/sdlc-complete/projects/{project-id}/
  - shared/
---
```

Agents (`.claude/agents/*.md`):
```yaml
---
agent-id: architecture-designer
name: Architecture Designer
framework: sdlc-complete              # REQUIRED
framework-version: "1.0"              # REQUIRED (quoted)
context-paths:
  - frameworks/sdlc-complete/repo/templates/analysis-design/
  - frameworks/sdlc-complete/projects/{project-id}/architecture/
output-base: frameworks/sdlc-complete/projects/{project-id}/
---
```

**Important Notes**:

1. **Version Numbers Must Be Quoted**: YAML converts `1.0` to the number `1`. Always quote version numbers: `"1.0"`

2. **Framework Property Required**: If missing, defaults to `sdlc-complete` with a warning

3. **Kebab-Case Framework IDs**: Framework IDs must be lowercase letters, numbers, and hyphens only (e.g., `sdlc-complete`, `marketing-flow`, `agile-lite`)

4. **Caching Enabled by Default**: Files are cached based on modification time. Disable with `new MetadataLoader(false)`

**Error Handling**:

```javascript
try {
  const metadata = await loader.loadFromFile('path/to/file.md');
} catch (error) {
  if (error instanceof MetadataNotFoundError) {
    // No YAML frontmatter found
    console.error('Add YAML frontmatter between --- delimiters');
  } else if (error instanceof YAMLParseError) {
    // Malformed YAML syntax
    console.error('Check YAML indentation and syntax');
  } else if (error instanceof InvalidMetadataError) {
    // Schema validation failed
    console.error('Fix validation errors:', error.validationErrors);
  }
}
```

**Security**:

- Uses `YAML.parse` with strict mode (safe by default in yaml v2.x)
- Prevents arbitrary code execution
- Limits alias count to prevent billion laughs attack
- Validates framework IDs to prevent path traversal

## Implementation Status

| Component | Status | Tests | Documentation |
|-----------|--------|-------|---------------|
| MetadataLoader | ✓ Complete | Pending | ✓ Complete |
| RegistryManager | Pending | Pending | Pending |
| WorkspaceManager | Pending | Pending | Pending |
| PathResolver | Pending | Pending | Pending |
| ContextCurator | Pending | Pending | Pending |
| NaturalLanguageRouter | Pending | Pending | Pending |
| MigrationTool | Pending | Pending | Pending |

## Architecture

**4-Tier Workspace Model**:

```
.aiwg/
├── frameworks/
│   ├── sdlc-complete/              # SDLC framework workspace
│   │   ├── repo/                   # Tier 1: Global system docs (stable)
│   │   ├── projects/               # Tier 2: Active development (evolving)
│   │   │   └── {project-id}/
│   │   ├── working/                # Tier 3: Temporary collaboration
│   │   └── archive/                # Tier 4: Completed work (historical)
│   ├── marketing-flow/             # Marketing framework workspace
│   └── agile-lite/                 # Agile framework workspace
├── shared/                         # Cross-framework resources
└── frameworks/registry.json        # Installed frameworks metadata
```

## References

- **Feature**: FID-007 - Framework-Scoped Workspace Management (P0 #1)
- **Use Case**: UC-012 - Framework-Aware Workspace Management
- **ADR**: ADR-007 - Framework-Scoped Workspace Architecture
- **Implementation Plan**: `.aiwg/working/FID-007-implementation-plan.md`

## Contributing

When adding new components:

1. Follow existing naming conventions (`kebab-case.mjs`)
2. Include comprehensive JSDoc comments
3. Export error classes for proper error handling
4. Add CLI usage examples
5. Update this README with component documentation

## License

ISC - See repository LICENSE file

## Natural Language Router

**File:** `natural-language-router.mjs`

### Purpose

Maps natural language user input to framework-specific commands with zero-friction routing. Enables users to say "transition to elaboration" instead of typing `/flow-inception-to-elaboration`.

### Features

- **Translation Loading**: Parses 75+ phrase translations from markdown table
- **Fuzzy Matching**: Levenshtein distance-based typo tolerance
- **Confidence Scoring**: 0.0-1.0 scores with configurable threshold (default: 0.7)
- **Multi-Framework Support**: Routes to SDLC, Marketing, Legal, etc.
- **Caching**: In-memory cache with 5-minute TTL
- **Performance**: <100ms routing per phrase (NFR-PERF-09)

### Usage

```javascript
import { NaturalLanguageRouter } from './natural-language-router.mjs';

const router = new NaturalLanguageRouter();

// Exact match
const result = await router.route("transition to elaboration");
// => {
//   commandId: "flow-inception-to-elaboration",
//   framework: "sdlc-complete",
//   confidence: 1.0,
//   matchedPhrase: "transition to elaboration",
//   category: "phase-transitions"
// }

// Fuzzy match (typo tolerance)
const fuzzy = await router.route("transision to elaboration");
// => { commandId: "flow-inception-to-elaboration", confidence: 0.92, ... }

// Unknown phrase
const unknown = await router.route("do something random");
// => null (confidence below threshold)

// Get suggestions
const suggestions = await router.getSuggestions("start");
// => [
//   { phrase: "start elaboration", confidence: 0.65, ... },
//   { phrase: "start security review", confidence: 0.62, ... }
// ]

// Batch routing
const results = await router.routeBatch([
  "transition to elaboration",
  "run security review"
]);
// => [ { commandId: "...", ... }, { commandId: "...", ... } ]
```

### Configuration

```javascript
// Custom configuration
const router = new NaturalLanguageRouter(
  '/custom/path/translations.md',
  {
    confidenceThreshold: 0.8,  // Require 80% similarity (default: 0.7)
    cacheTTL: 600000            // 10-minute cache (default: 5 min)
  }
);
```

### API Reference

#### Core Methods

- **`route(phrase)`** - Map phrase to command ID + framework
- **`routeBatch(phrases)`** - Batch routing for multiple phrases
- **`getSuggestions(phrase, limit=3)`** - Get top N suggestions for ambiguous input

#### Translation Management

- **`loadTranslations()`** - Load from markdown (auto-called on first use)
- **`reloadTranslations()`** - Force cache refresh
- **`getTranslationCount()`** - Total loaded translations

#### Filtering

- **`getByCategory(category)`** - All translations in category (e.g., "phase-transitions")
- **`getByFramework(frameworkId)`** - All translations for framework (e.g., "sdlc-complete")

#### Utilities

- **`normalize(phrase)`** - Lowercase, trim, remove punctuation
- **`fuzzyMatch(phrase, target)`** - Levenshtein similarity score (0.0-1.0)
- **`findBestMatch(phrase, candidates)`** - Best match from list
- **`extractTokens(phrase)`** - Split into words

### Translation Table Format

Parses markdown tables from `simple-language-translations.md`:

```markdown
### Phase Transitions

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "transition to elaboration" | Start Inception→Elaboration | `flow-inception-to-elaboration` | 15-20 min |
| "move to elaboration" | Same as above | `flow-inception-to-elaboration` | 15-20 min |
```

### Categories

- **phase-transitions**: Concept→Inception, Inception→Elaboration, etc.
- **workflow-requests**: Run iteration, deploy to production
- **review-cycles**: Security review, test execution, compliance
- **artifact-generation**: Create SAD, generate requirements
- **status-checks**: Project status, gate check
- **team-process**: Onboarding, knowledge transfer

### Performance

- **Translation Loading**: <500ms (first load)
- **Routing**: <100ms per phrase (NFR-PERF-09)
- **Cache Hit**: <1ms (in-memory lookup)
- **Batch Processing**: Parallel execution via Promise.all

### Error Handling

- **TranslationLoadError**: Thrown if translation file missing/invalid
- **Null Return**: Low confidence matches return null (graceful degradation)
- **Input Validation**: Null/empty phrases return null

### Testing

Run unit tests:

```bash
node tests/unit/natural-language-router.test.mjs
```

**Test Coverage**:
- 19 unit tests
- Exact matching, fuzzy matching, typo tolerance
- Confidence scoring, batch operations
- Translation loading, caching
- Performance validation (<100ms)
- Edge cases (null, empty, unknown phrases)

### Traceability

- **Feature**: FID-007 (Framework-Scoped Workspace Management - P0 #1)
- **Use Case**: UC-012 (Framework-Aware Workspace Management - AC-4)
- **NFR**: NFR-PERF-09 (Framework-scoped context loading optimization)
- **Implementation Plan**: Week 3, Task 2 (5 hours)
- **Test Cases**: TC-WS-004-1, TC-WS-004-2, TC-WS-004-3

### Example Scenarios

#### Scenario 1: Phase Transition

```javascript
// User says: "Let's transition to Elaboration"
const result = await router.route("Let's transition to Elaboration");
// => {
//   commandId: "flow-inception-to-elaboration",
//   framework: "sdlc-complete",
//   confidence: 1.0
// }
```

#### Scenario 2: Security Review

```javascript
// User says: "Run security review"
const result = await router.route("run security review");
// => {
//   commandId: "flow-security-review-cycle",
//   framework: "sdlc-complete",
//   confidence: 1.0,
//   category: "review-cycles"
// }
```

#### Scenario 3: Ambiguous Input

```javascript
// User says: "start"
const suggestions = await router.getSuggestions("start", 5);
// => [
//   { phrase: "start elaboration", confidence: 0.65, ... },
//   { phrase: "start security review", confidence: 0.62, ... },
//   { phrase: "start iteration", confidence: 0.60, ... }
// ]
```

### Integration with Workspace Manager

```javascript
import { NaturalLanguageRouter } from './natural-language-router.mjs';
import { WorkspaceManager } from './workspace-manager.mjs';

const router = new NaturalLanguageRouter();
const workspace = new WorkspaceManager();

// User natural language input
const userInput = "transition to elaboration";

// Route to command
const route = await router.route(userInput);
if (!route) {
  console.log("I didn't understand that. Did you mean:");
  const suggestions = await router.getSuggestions(userInput);
  suggestions.forEach(s => console.log(`  - ${s.phrase}`));
  return;
}

// Execute command with framework context
console.log(`Executing ${route.commandId} in ${route.framework} framework...`);
// ... orchestrate multi-agent workflow
```

