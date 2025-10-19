# MetadataLoader - Usage Examples

Comprehensive examples demonstrating all features of the MetadataLoader component.

## Basic Usage

### Load Single File

```javascript
import { MetadataLoader } from './metadata-loader.mjs';

const loader = new MetadataLoader();

// Load metadata from a command file
const metadata = await loader.loadFromFile('.claude/commands/flow-inception-to-elaboration.md');

console.log(metadata);
// {
//   commandId: 'flow-inception-to-elaboration',
//   framework: 'sdlc-complete',
//   frameworkVersion: '1.0',
//   outputPath: 'frameworks/sdlc-complete/projects/{project-id}/',
//   contextPaths: [
//     'frameworks/sdlc-complete/repo/',
//     'frameworks/sdlc-complete/projects/{project-id}/',
//     'shared/'
//   ],
//   description: 'Orchestrate Inception→Elaboration phase transition'
// }
```

### Load by ID

```javascript
// Load command by ID (searches in .claude/commands/)
const cmdMeta = await loader.loadCommandMetadata('flow-inception-to-elaboration');

// Load agent by ID (searches in .claude/agents/)
const agentMeta = await loader.loadAgentMetadata('architecture-designer');

// Custom directory
const customMeta = await loader.loadCommandMetadata('custom-cmd', './custom/commands');
```

## Batch Loading

Process multiple files in parallel:

```javascript
import { MetadataLoader } from './metadata-loader.mjs';
import { readdir } from 'fs/promises';
import { join } from 'path';

const loader = new MetadataLoader();

// Get all command files
const commandsDir = '.claude/commands';
const files = (await readdir(commandsDir))
  .filter(f => f.endsWith('.md'))
  .map(f => join(commandsDir, f));

// Load all metadata in parallel
const results = await loader.loadBatch(files);

// Process results
console.log(`Loaded ${results.size} commands`);

for (const [path, metadata] of results) {
  console.log(`${metadata.commandId} → ${metadata.framework}`);
}

// Example output:
// Loaded 45 commands
// flow-inception-to-elaboration → sdlc-complete
// flow-security-review-cycle → sdlc-complete
// marketing-campaign-draft → marketing-flow
// ...
```

## Error Handling

Handle different error types appropriately:

```javascript
import {
  MetadataLoader,
  MetadataNotFoundError,
  YAMLParseError,
  InvalidMetadataError
} from './metadata-loader.mjs';

const loader = new MetadataLoader();

try {
  const metadata = await loader.loadFromFile('path/to/file.md');
  console.log('✓ Metadata loaded:', metadata.framework);
} catch (error) {
  if (error instanceof MetadataNotFoundError) {
    console.error('✗ No YAML frontmatter found');
    console.error('  Add frontmatter between --- delimiters at the top of the file');
  } else if (error instanceof YAMLParseError) {
    console.error('✗ YAML parsing failed');
    console.error('  Check indentation and syntax');
    console.error('  Details:', error.originalError.message);
  } else if (error instanceof InvalidMetadataError) {
    console.error('✗ Metadata validation failed');
    console.error('  Errors:', error.validationErrors);
    // Example: ['Invalid framework ID format: "SDLC" (must be kebab-case)']
  } else {
    console.error('✗ Unexpected error:', error.message);
  }
}
```

## Caching

Control caching behavior:

```javascript
// Caching enabled (default)
const loader = new MetadataLoader(true);

// First load - reads from disk
const meta1 = await loader.loadFromFile('file.md'); // ~5ms

// Second load - returns from cache (mtime check)
const meta2 = await loader.loadFromFile('file.md'); // ~0.5ms

// Manually invalidate cache
loader.invalidateCache('file.md');

// Clear all cache
loader.clearCache();

// Disable caching entirely
const noCacheLoader = new MetadataLoader(false);
```

## Default Framework Fallback

Handle missing framework property gracefully:

```javascript
const loader = new MetadataLoader(true, 'sdlc-complete'); // default framework

// File with missing framework property
// ---
// command-id: test
// output-path: frameworks/test/
// ---

const metadata = await loader.loadFromFile('file-without-framework.md');
// ⚠️  Framework property missing in file-without-framework.md, defaulting to 'sdlc-complete'

console.log(metadata.framework); // 'sdlc-complete' (default applied)
```

## Custom Default Framework

Use a different default framework:

```javascript
// Default to marketing-flow instead of sdlc-complete
const marketingLoader = new MetadataLoader(true, 'marketing-flow');

// Files without framework property will use marketing-flow
```

## Validation Examples

### Valid Metadata

```yaml
---
framework: sdlc-complete                # ✓ Valid kebab-case
framework-version: "1.0"                # ✓ Valid X.Y format (quoted)
output-path: frameworks/sdlc/projects/  # ✓ Valid string
context-paths:                          # ✓ Valid array
  - frameworks/sdlc/repo/
  - shared/
---
```

### Invalid Metadata (Validation Errors)

```yaml
---
framework: SDLC                         # ✗ Not kebab-case (uppercase)
framework-version: 1                    # ✗ Not X.Y format (needs quotes: "1.0")
output-path: 123                        # ✗ Not a string
context-paths: "not-an-array"           # ✗ Not an array
---
```

Errors thrown:
```
InvalidMetadataError: Metadata validation failed
  Errors:
    - Invalid framework ID format: 'SDLC' (must be kebab-case)
    - Invalid framework-version format: '1' (must be X.Y format, e.g., '1.0')
    - output-path must be a string, got number
    - context-paths must be an array, got string
```

## YAML Parsing Quirks

### Version Numbers Must Be Quoted

```yaml
# WRONG - YAML converts 1.0 to number 1
framework-version: 1.0

# RIGHT - Quote to preserve string
framework-version: "1.0"
```

### Arrays

```yaml
# Valid array syntax
context-paths:
  - path/one/
  - path/two/

# Also valid (inline)
context-paths: ["path/one/", "path/two/"]
```

## Command-Line Usage

```bash
# Load and display metadata
node tools/workspace/metadata-loader.mjs .claude/commands/flow-inception.md

# Output:
# ✓ Metadata loaded successfully:
# {
#   "framework": "sdlc-complete",
#   "frameworkVersion": "1.0",
#   ...
# }

# Error cases
node tools/workspace/metadata-loader.mjs no-frontmatter.md
# ✗ No YAML frontmatter found: no-frontmatter.md
#   Make sure the file has YAML frontmatter between --- delimiters

node tools/workspace/metadata-loader.mjs malformed.md
# ✗ YAML parsing failed: malformed.md
#   Nested mappings are not allowed...
#   Check YAML syntax (indentation, quotes, etc.)
```

## Integration Example

Using MetadataLoader in a workspace manager:

```javascript
import { MetadataLoader } from './metadata-loader.mjs';
import { WorkspaceManager } from './workspace-manager.mjs';

class FrameworkRouter {
  constructor() {
    this.metadataLoader = new MetadataLoader();
    this.workspaceManager = new WorkspaceManager();
  }

  async routeCommand(commandId) {
    // Load command metadata
    const metadata = await this.metadataLoader.loadCommandMetadata(commandId);

    // Determine framework
    const framework = metadata.framework;
    console.log(`Routing to framework: ${framework}`);

    // Load framework-specific context
    const contextPaths = metadata.contextPaths || [];
    const context = await this.workspaceManager.loadContext(framework, contextPaths);

    // Resolve output path
    const outputPath = await this.workspaceManager.resolvePath(
      metadata.outputPath,
      { framework, projectId: 'current-project' }
    );

    return {
      framework,
      context,
      outputPath
    };
  }
}

// Usage
const router = new FrameworkRouter();
const route = await router.routeCommand('flow-inception-to-elaboration');

console.log(route);
// {
//   framework: 'sdlc-complete',
//   context: { ... },
//   outputPath: '.aiwg/frameworks/sdlc-complete/projects/current-project/'
// }
```

## Performance Considerations

### Batch vs Sequential Loading

```javascript
const files = ['cmd1.md', 'cmd2.md', 'cmd3.md', ...]; // 45 files

// SLOW - Sequential loading (~225ms total)
for (const file of files) {
  await loader.loadFromFile(file); // ~5ms each
}

// FAST - Parallel batch loading (~10ms total)
await loader.loadBatch(files); // All in parallel
```

### Cache Impact

```javascript
// Load 45 commands without cache
const noCacheLoader = new MetadataLoader(false);
const start1 = Date.now();
await noCacheLoader.loadBatch(commandFiles); // ~225ms
console.log(`No cache: ${Date.now() - start1}ms`);

// Load 45 commands with cache (second run)
const cachedLoader = new MetadataLoader(true);
await cachedLoader.loadBatch(commandFiles); // First run: ~225ms
const start2 = Date.now();
await cachedLoader.loadBatch(commandFiles); // Second run: ~5ms
console.log(`With cache: ${Date.now() - start2}ms`);

// Cache speedup: 45x faster
```

## Security Notes

The MetadataLoader uses safe YAML parsing:

- **Safe by default**: Uses `yaml` library v2.x which is safe by default
- **No code execution**: Cannot execute arbitrary JavaScript code
- **Alias protection**: Limits alias count to prevent billion laughs attack
- **Strict mode**: Enforces strict YAML parsing (no ambiguous keys)
- **Path validation**: Framework IDs validated to prevent path traversal

Example of what is **NOT** possible:

```yaml
# This WILL NOT execute code (safe)
---
framework: sdlc-complete
command: !!js/function >
  function() { require('fs').unlinkSync('/etc/passwd') }
---
```

The YAML parser will safely parse this as a string, not execute it.

## Common Patterns

### Validate All Commands

```javascript
import { readdir } from 'fs/promises';
import { join } from 'path';

const loader = new MetadataLoader();
const commandsDir = '.claude/commands';

const files = (await readdir(commandsDir))
  .filter(f => f.endsWith('.md'))
  .map(f => join(commandsDir, f));

const results = await loader.loadBatch(files);

// Check for missing metadata
const missing = files.length - results.size;
if (missing > 0) {
  console.warn(`⚠️  ${missing} files failed to load`);
}

// Check framework distribution
const frameworks = new Map();
for (const [, metadata] of results) {
  const count = frameworks.get(metadata.framework) || 0;
  frameworks.set(metadata.framework, count + 1);
}

console.log('Framework distribution:');
for (const [framework, count] of frameworks) {
  console.log(`  ${framework}: ${count} commands`);
}

// Example output:
// Framework distribution:
//   sdlc-complete: 42 commands
//   marketing-flow: 3 commands
```

### Extract Unique Frameworks

```javascript
const loader = new MetadataLoader();

// Load all commands and agents
const commands = await loader.loadBatch(commandFiles);
const agents = await loader.loadBatch(agentFiles);

// Extract unique frameworks
const frameworks = new Set();
for (const [, metadata] of [...commands, ...agents]) {
  frameworks.add(metadata.framework);
}

console.log('Installed frameworks:', Array.from(frameworks));
// ['sdlc-complete', 'marketing-flow', 'agile-lite']
```

## Troubleshooting

### Common Issues

1. **"YAML parsing failed"** - Check indentation (use spaces, not tabs)
2. **"Invalid framework-version format"** - Quote version numbers: `"1.0"` not `1.0`
3. **"framework must be kebab-case"** - Use lowercase: `sdlc-complete` not `SDLC-Complete`
4. **Cache not invalidating** - File mtime must change (touch the file or edit it)

### Debug Mode

Add console logging to see what's happening:

```javascript
const loader = new MetadataLoader();

const metadata = await loader.loadFromFile('file.md');
console.log('Raw frontmatter:', loader.extractFrontmatter(fileContent));
console.log('Parsed YAML:', loader.parseYAML(frontmatter, 'file.md'));
console.log('Normalized:', loader.normalizeMetadata(parsed));
console.log('Validated:', metadata);
```
