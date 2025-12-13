# Toolsmith Implementation Specification

**Document Type**: Technical Specification
**Version**: 1.0
**Status**: Draft
**Date**: 2025-12-12
**Author**: Architecture Designer

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Specifications](#2-component-specifications)
3. [Data Models](#3-data-models)
4. [Implementation Details](#4-implementation-details)
5. [Integration Guide](#5-integration-guide)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment](#7-deployment)

---

## 1. Overview

### 1.1 Purpose

The Toolsmith feature provides on-demand, platform-aware tool specifications for AI agents. It solves the problem of context window pressure when agents need to use system tools, and is specifically optimized for subagent scenarios where context is discarded after task completion.

### 1.2 Key Design Principles

1. **Context Efficiency**: Minimize context usage by loading tool specs on-demand
2. **Self-Contained Output**: Returned specs must be complete and usable without additional context
3. **Platform Awareness**: Adapt specs for the actual runtime environment
4. **Verification**: Only provide specs for tools that are actually installed and working
5. **Caching**: Avoid regenerating known tool specifications

### 1.3 Architecture Position

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  aiwg runtime-info | aiwg toolsmith get <tool>                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                   Core Services Layer                            │
│  RuntimeDiscovery │ ToolsmithProvider │ SpecGenerator           │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                     Storage Layer                                │
│  .aiwg/smiths/toolsmith/                                        │
│  ├── runtime.json (catalog)                                     │
│  ├── index.json (search)                                        │
│  └── tools/ (specifications)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 RuntimeDiscovery Module

**File**: `src/toolsmith/runtime-discovery.mjs`

**Responsibilities**:
- Scan system for installed tools
- Verify tool functionality (--version check)
- Detect tool capabilities and categories
- Generate runtime catalog

**Public Interface**:

```javascript
/**
 * RuntimeDiscovery - Discovers and catalogs installed system tools
 */
export class RuntimeDiscovery {
  /**
   * Perform full discovery scan
   * @returns {Promise<RuntimeCatalog>}
   */
  async discover() {}

  /**
   * Verify existing catalog is still accurate
   * @returns {Promise<VerificationResult>}
   */
  async verify() {}

  /**
   * Check a specific tool
   * @param {string} toolName
   * @returns {Promise<ToolStatus>}
   */
  async checkTool(toolName) {}

  /**
   * Get environment information
   * @returns {Promise<EnvironmentInfo>}
   */
  async getEnvironment() {}

  /**
   * Get resource information (disk, memory, cpu)
   * @returns {Promise<ResourceInfo>}
   */
  async getResources() {}

  /**
   * Add a custom tool to the catalog
   * @param {CustomToolConfig} config
   */
  async addCustomTool(config) {}
}
```

**Internal Methods**:

```javascript
class RuntimeDiscovery {
  // Private methods
  #scanPathDirectories() {}      // Scan PATH for executables
  #detectToolVersion(path) {}    // Run --version and parse
  #categorizeTools(tools) {}     // Apply category heuristics
  #findManPage(toolName) {}      // Locate man page
  #detectCapabilities(tool) {}   // Infer tool capabilities
}
```

**Discovery Algorithm**:

```
1. Collect PATH directories
   - Parse $PATH
   - Add configured additionalPaths
   - Deduplicate and filter existing

2. Scan each directory
   - List executables (file mode check)
   - Skip excludePatterns
   - Build candidate list

3. For each candidate:
   a. Execute: <tool> --version || <tool> -v || <tool> version
   b. If exit 0: parse version string
   c. If exit non-0: try alternative detection
   d. Categorize based on:
      - Known tool database match
      - Name heuristics (gcc -> languages)
      - Capability detection

4. Find supporting resources:
   - Man page: man -w <tool>
   - Documentation URL: known database

5. Build CatalogedTool objects

6. Write runtime.json
```

### 2.2 ToolsmithProvider Module

**File**: `src/toolsmith/toolsmith-provider.mjs`

**Responsibilities**:
- Handle tool specification requests
- Search tool index
- Generate/retrieve specifications
- Platform adaptation

**Public Interface**:

```javascript
/**
 * ToolsmithProvider - Provides tool specifications on-demand
 */
export class ToolsmithProvider {
  /**
   * Get specification for a tool
   * @param {string} toolId
   * @returns {Promise<ToolSpecification>}
   */
  async getToolSpec(toolId) {}

  /**
   * Search for tools by query
   * @param {string} query - Keyword or capability search
   * @returns {Promise<ToolSearchResult[]>}
   */
  async searchTools(query) {}

  /**
   * Get specs for multiple tools
   * @param {string[]} toolIds
   * @returns {Promise<ToolSpecification[]>}
   */
  async getToolSpecs(toolIds) {}

  /**
   * Check tool availability
   * @param {string} toolId
   * @returns {Promise<ToolAvailability>}
   */
  async isToolAvailable(toolId) {}

  /**
   * Get tool recommendation for a capability
   * @param {string} capability
   * @returns {Promise<ToolRecommendation>}
   */
  async getToolForCapability(capability) {}

  /**
   * Force regenerate a tool spec
   * @param {string} toolId
   * @returns {Promise<ToolSpecification>}
   */
  async regenerateSpec(toolId) {}
}
```

**Lookup Algorithm**:

```
Request: getToolSpec("jq")

1. Load index.json
2. Check for direct match: index.tools[id === "jq"]
3. If not found, check aliases: index.aliases["jq"]
4. If not found, fuzzy search tools

If found:
  5. Check cache validity:
     - File exists at tools/{category}/{id}.tool.md
     - Version matches runtime.json
     - TTL not expired

  6. If cache valid:
     - Load spec from file
     - Apply platform adaptation
     - Return

  7. If cache invalid or missing:
     - Check runtime.json for tool status
     - If tool available:
       - Generate spec (see SpecGenerator)
       - Cache to tools/{category}/{id}.tool.md
       - Update index.json
       - Return
     - If tool unavailable:
       - Return ToolAvailability with installHint
```

### 2.3 SpecGenerator Module

**File**: `src/toolsmith/spec-generator.mjs`

**Responsibilities**:
- Generate tool specifications from various sources
- Parse man pages
- Apply templates
- Create examples

**Public Interface**:

```javascript
/**
 * SpecGenerator - Generates tool specifications
 */
export class SpecGenerator {
  /**
   * Generate spec for a cataloged tool
   * @param {CatalogedTool} tool
   * @returns {Promise<ToolSpecification>}
   */
  async generateSpec(tool) {}

  /**
   * Parse man page into structured data
   * @param {string} manPagePath
   * @returns {Promise<ParsedManPage>}
   */
  async parseManPage(manPagePath) {}

  /**
   * Generate examples for a tool
   * @param {CatalogedTool} tool
   * @returns {Promise<Example[]>}
   */
  async generateExamples(tool) {}

  /**
   * Apply platform adaptations
   * @param {ToolSpecification} spec
   * @param {Platform} platform
   * @returns {ToolSpecification}
   */
  adaptForPlatform(spec, platform) {}
}
```

**Generation Pipeline**:

```
Input: CatalogedTool {
  id: "jq",
  version: "1.6",
  path: "/usr/bin/jq",
  manPage: "/usr/share/man/man1/jq.1.gz",
  capabilities: ["json-processing"]
}

1. Load template: templates/cli-tool-template.md

2. Extract from man page (if available):
   - Synopsis
   - Description
   - Options/flags
   - Examples (if present)
   - See Also

3. Augment with known patterns:
   - Check known-tools database for jq
   - Add curated examples
   - Add common patterns

4. Generate Quick Reference:
   - Most common use cases
   - Pipe patterns
   - Error handling

5. Platform adaptation:
   - Installation instructions per OS
   - Path differences
   - Shell compatibility notes

6. Format as markdown:
   - Apply frontmatter
   - Structure sections
   - Code block formatting

Output: Complete .tool.md file
```

### 2.4 ToolIndex Module

**File**: `src/toolsmith/tool-index.mjs`

**Responsibilities**:
- Maintain searchable tool index
- Keyword and capability indexing
- Alias resolution

**Public Interface**:

```javascript
/**
 * ToolIndex - Maintains searchable tool index
 */
export class ToolIndex {
  /**
   * Load index from file
   * @returns {Promise<void>}
   */
  async load() {}

  /**
   * Search index
   * @param {string} query
   * @returns {SearchResult[]}
   */
  search(query) {}

  /**
   * Add tool to index
   * @param {IndexEntry} entry
   */
  add(entry) {}

  /**
   * Update tool in index
   * @param {string} toolId
   * @param {Partial<IndexEntry>} updates
   */
  update(toolId, updates) {}

  /**
   * Save index to file
   * @returns {Promise<void>}
   */
  async save() {}

  /**
   * Rebuild index from tool files
   * @returns {Promise<void>}
   */
  async rebuild() {}
}
```

---

## 3. Data Models

### 3.1 Runtime Catalog (runtime.json)

```typescript
interface RuntimeCatalog {
  $schema: string;
  version: "1.0";
  generated: string; // ISO 8601
  environment: {
    os: "linux" | "darwin" | "win32";
    osVersion: string;
    arch: "x64" | "arm64" | "x86";
    shell: string;
    homeDir: string;
    workingDir: string;
  };
  resources: {
    diskFreeGb: number;
    memoryTotalGb: number;
    memoryAvailableGb: number;
    cpuCores: number;
  };
  tools: CatalogedTool[];
  unavailable: UnavailableTool[];
}

interface CatalogedTool {
  id: string;                    // Unique identifier (e.g., "jq")
  name: string;                  // Display name (e.g., "jq")
  category: ToolCategory;        // core | languages | utilities | custom
  version: string;               // Detected version
  path: string;                  // Absolute path to executable
  status: "verified" | "unverified";
  lastVerified: string;          // ISO 8601
  capabilities: string[];        // e.g., ["json-processing", "filtering"]
  manPage?: string;              // Path to man page
  documentation?: string;        // URL to docs
  aliases: string[];             // Alternative names
  relatedTools: string[];        // Related tools
}

interface UnavailableTool {
  id: string;
  reason: "not-installed" | "version-mismatch" | "broken";
  installHint?: string;
}

type ToolCategory = "core" | "languages" | "utilities" | "custom";
```

### 3.2 Tool Index (index.json)

```typescript
interface ToolIndex {
  $schema: string;
  version: "1.0";
  generated: string;
  totalTools: number;
  categories: Record<ToolCategory, number>;
  tools: IndexEntry[];
  aliases: Record<string, string>;      // alias -> toolId
  capabilityIndex: Record<string, string[]>; // capability -> toolIds
}

interface IndexEntry {
  id: string;
  path: string;                  // Relative path to .tool.md
  keywords: string[];            // Search keywords
  synopsis: string;              // One-line description
  lastUpdated: string;           // ISO 8601
}
```

### 3.3 Tool Specification (*.tool.md frontmatter)

```typescript
interface ToolSpecFrontmatter {
  id: string;
  name: string;
  version: string;
  category: ToolCategory;
  platform: Platform;
  platformNotes?: string;
  status: "verified" | "unverified" | "unavailable";
  verifiedDate: string;          // YYYY-MM-DD
  capabilities: string[];
  synopsis: string;
}

type Platform = "linux" | "macos" | "windows" | "wsl";
```

### 3.4 Configuration (config.json)

```typescript
interface ToolsmithConfig {
  $schema: string;
  version: "1.0";
  discovery: {
    autoDiscoverOnInit: boolean;
    refreshIntervalHours: number;
    categories: ToolCategory[];
    excludePatterns: string[];
    includeSystemPath: boolean;
    additionalPaths: string[];
  };
  generation: {
    preferLocalManPages: boolean;
    fetchRemoteDocs: boolean;     // Should be false per NFR-SEC-001
    includeExamples: boolean;
    exampleCount: number;
    platformAdaptation: boolean;
  };
  caching: {
    enabled: boolean;
    ttlDays: number;
    maxCacheSizeMb: number;
    autoUpdateOnVersionChange: boolean;
  };
  output: {
    format: "markdown";
    includeFrontmatter: boolean;
    compactMode: boolean;
  };
}
```

---

## 4. Implementation Details

### 4.1 Known Tools Database

A built-in database of common tools with curated information:

**File**: `src/toolsmith/known-tools.json`

```json
{
  "tools": {
    "git": {
      "category": "core",
      "capabilities": ["version-control", "remote", "branching", "merging"],
      "documentation": "https://git-scm.com/docs",
      "aliases": ["g"],
      "relatedTools": ["gh", "git-lfs", "tig"],
      "versionPattern": "git version ([\\d.]+)",
      "examples": [
        {"cmd": "git status", "desc": "Show working tree status"},
        {"cmd": "git add .", "desc": "Stage all changes"},
        {"cmd": "git commit -m 'msg'", "desc": "Commit staged changes"}
      ]
    },
    "jq": {
      "category": "utilities",
      "capabilities": ["json-processing", "filtering", "transformation"],
      "documentation": "https://stedolan.github.io/jq/manual/",
      "aliases": [],
      "relatedTools": ["yq", "fx", "gron"],
      "versionPattern": "jq-([\\d.]+)",
      "examples": [
        {"cmd": "jq '.' file.json", "desc": "Pretty print JSON"},
        {"cmd": "jq '.field' file.json", "desc": "Extract field"},
        {"cmd": "jq -r '.name'", "desc": "Raw output (no quotes)"}
      ]
    },
    "curl": {
      "category": "core",
      "capabilities": ["http-client", "download", "api-testing"],
      "documentation": "https://curl.se/docs/",
      "aliases": [],
      "relatedTools": ["wget", "httpie"],
      "versionPattern": "curl ([\\d.]+)",
      "examples": [
        {"cmd": "curl -s URL", "desc": "Silent GET request"},
        {"cmd": "curl -X POST -d '{}'", "desc": "POST with data"},
        {"cmd": "curl -H 'Auth: token'", "desc": "With header"}
      ]
    }
  }
}
```

### 4.2 Man Page Parsing

The man page parser extracts structured content:

```javascript
// src/toolsmith/man-parser.mjs

export class ManPageParser {
  /**
   * Parse a man page file
   * @param {string} manPagePath - Path to .gz or plain man file
   */
  async parse(manPagePath) {
    // 1. Decompress if .gz
    // 2. Parse groff/man format
    // 3. Extract sections:
    //    - NAME -> synopsis
    //    - SYNOPSIS -> usage pattern
    //    - DESCRIPTION -> description
    //    - OPTIONS -> flags table
    //    - EXAMPLES -> examples
    //    - SEE ALSO -> related
  }
}

// Extraction patterns
const SECTION_PATTERNS = {
  name: /\.SH\s+NAME\n([\s\S]*?)(?=\.SH|$)/,
  synopsis: /\.SH\s+SYNOPSIS\n([\s\S]*?)(?=\.SH|$)/,
  description: /\.SH\s+DESCRIPTION\n([\s\S]*?)(?=\.SH|$)/,
  options: /\.SH\s+OPTIONS\n([\s\S]*?)(?=\.SH|$)/,
  examples: /\.SH\s+EXAMPLES?\n([\s\S]*?)(?=\.SH|$)/,
  seeAlso: /\.SH\s+"?SEE ALSO"?\n([\s\S]*?)(?=\.SH|$)/
};
```

### 4.3 Platform Detection

```javascript
// src/toolsmith/platform.mjs

export function detectPlatform() {
  const os = process.platform;

  // Detect WSL
  if (os === 'linux') {
    const release = fs.readFileSync('/proc/version', 'utf8');
    if (release.includes('microsoft') || release.includes('WSL')) {
      return 'wsl';
    }
  }

  return {
    linux: 'linux',
    darwin: 'macos',
    win32: 'windows'
  }[os] || 'linux';
}

export function getPlatformInstallHint(toolId, platform) {
  const hints = {
    linux: {
      jq: 'apt install jq  # or dnf install jq',
      ripgrep: 'apt install ripgrep  # or cargo install ripgrep'
    },
    macos: {
      jq: 'brew install jq',
      ripgrep: 'brew install ripgrep'
    },
    windows: {
      jq: 'choco install jq  # or scoop install jq',
      ripgrep: 'choco install ripgrep'
    }
  };

  return hints[platform]?.[toolId] || `Install ${toolId} for your system`;
}
```

### 4.4 Caching Strategy

```javascript
// src/toolsmith/cache.mjs

export class ToolCache {
  constructor(basePath) {
    this.basePath = basePath; // .aiwg/smiths/toolsmith/tools/
    this.ttlMs = 30 * 24 * 60 * 60 * 1000; // 30 days default
  }

  async isValid(toolId, currentVersion) {
    const specPath = this.getSpecPath(toolId);

    if (!await fileExists(specPath)) {
      return false;
    }

    const spec = await this.loadSpec(toolId);

    // Version mismatch invalidates cache
    if (spec.version !== currentVersion) {
      return false;
    }

    // TTL check
    const verifiedDate = new Date(spec.verifiedDate);
    const age = Date.now() - verifiedDate.getTime();

    return age < this.ttlMs;
  }

  getSpecPath(toolId) {
    // Lookup category from index
    const category = this.getCategoryForTool(toolId);
    return path.join(this.basePath, category, `${toolId}.tool.md`);
  }
}
```

---

## 5. Integration Guide

### 5.1 CLI Integration

New commands added to `src/cli/index.mjs`:

```javascript
// Runtime info commands
case 'runtime-info':
  const discovery = new RuntimeDiscovery(config);

  if (args.includes('--discover')) {
    const catalog = await discovery.discover();
    console.log(`Discovered ${catalog.tools.length} tools`);
  } else if (args.includes('--verify')) {
    const result = await discovery.verify();
    console.log(`Verified: ${result.valid}/${result.total}`);
  } else if (args.includes('--summary')) {
    const summary = await discovery.getSummary();
    console.log(formatSummary(summary));
  } else if (args.includes('--check')) {
    const toolName = args[args.indexOf('--check') + 1];
    const status = await discovery.checkTool(toolName);
    console.log(formatToolStatus(status));
  }
  break;

// Toolsmith commands
case 'toolsmith':
  const provider = new ToolsmithProvider(config);
  const subcommand = args[0];

  switch (subcommand) {
    case 'get':
      const spec = await provider.getToolSpec(args[1]);
      console.log(spec.rawContent);
      break;
    case 'search':
      const results = await provider.searchTools(args.slice(1).join(' '));
      console.log(formatSearchResults(results));
      break;
    case 'list':
      const index = await provider.getIndex();
      console.log(formatToolList(index));
      break;
  }
  break;
```

### 5.2 Agent Integration

**Toolsmith Provider Agent** (`.claude/agents/toolsmith-provider.md`):

```markdown
---
name: toolsmith-provider
description: Provides platform-aware tool specifications for agent operations
model: haiku
tools: Read, Bash, Glob, Grep
orchestration: false
category: infrastructure
subagent-optimized: true
---

# Toolsmith Provider

You are a specialized agent that provides tool specifications on-demand.

## Operating Mode

You operate as a subagent - your context will be discarded after returning.
Your response must be SELF-CONTAINED and COMPLETE.

## Request Handling

When you receive a request:

1. **Parse Request Type**:
   - Direct tool request: "I need jq"
   - Capability query: "JSON processing tool"
   - Search: "Find HTTP client tools"

2. **Consult Catalog**:
   - Read .aiwg/smiths/toolsmith/runtime.json
   - Verify tool is available

3. **Retrieve Specification**:
   - Load from .aiwg/smiths/toolsmith/tools/{category}/{tool}.tool.md
   - If not cached, generate using Bash (man pages, --help)

4. **Return Complete Spec**:
   - Include all sections (quick reference, examples, flags, tips)
   - Add platform-specific notes
   - Include installation hints if not available

## Response Format

Always return a complete, formatted tool specification:

```markdown
# Tool Specification: {tool}

[Full specification content]

---
Source: .aiwg/smiths/toolsmith/tools/{category}/{tool}.tool.md
Platform: {current_platform}
Status: {verified|unavailable}
```

## Important

- NEVER return partial specifications
- ALWAYS include examples
- Include platform-specific notes for current OS
- If tool unavailable, provide installation instructions
```

### 5.3 Orchestrator Integration

The executive orchestrator can delegate to toolsmith:

```javascript
// In orchestration flow
async function ensureToolAvailable(toolId) {
  const result = await task('toolsmith-provider',
    `Check and provide specification for: ${toolId}`
  );

  if (result.status === 'unavailable') {
    throw new Error(`Tool ${toolId} not available: ${result.installHint}`);
  }

  return result.specification;
}

// Usage in workflow
const jqSpec = await ensureToolAvailable('jq');
// jqSpec is now a complete, self-contained spec
// Toolsmith context has been discarded
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```javascript
// test/unit/toolsmith/runtime-discovery.test.mjs

describe('RuntimeDiscovery', () => {
  describe('discover()', () => {
    it('should detect installed tools', async () => {
      const discovery = new RuntimeDiscovery();
      const catalog = await discovery.discover();

      expect(catalog.tools).toBeDefined();
      expect(catalog.tools.length).toBeGreaterThan(0);
    });

    it('should detect tool versions', async () => {
      const discovery = new RuntimeDiscovery();
      const status = await discovery.checkTool('git');

      expect(status.available).toBe(true);
      expect(status.version).toMatch(/\d+\.\d+/);
    });
  });
});

// test/unit/toolsmith/spec-generator.test.mjs

describe('SpecGenerator', () => {
  describe('generateSpec()', () => {
    it('should generate valid markdown spec', async () => {
      const generator = new SpecGenerator();
      const tool = { id: 'git', version: '2.43.0', path: '/usr/bin/git' };

      const spec = await generator.generateSpec(tool);

      expect(spec.rawContent).toContain('# git');
      expect(spec.rawContent).toContain('## Quick Reference');
    });
  });
});
```

### 6.2 Integration Tests

```javascript
// test/integration/toolsmith/end-to-end.test.mjs

describe('Toolsmith End-to-End', () => {
  it('should provide complete spec after fresh discovery', async () => {
    // Setup: clean toolsmith directory
    await cleanToolsmithDir();

    // Discover
    const discovery = new RuntimeDiscovery();
    await discovery.discover();

    // Request spec
    const provider = new ToolsmithProvider();
    const spec = await provider.getToolSpec('git');

    // Verify completeness
    expect(spec.rawContent).toContain('Quick Reference');
    expect(spec.rawContent).toContain('Common Patterns');
    expect(spec.rawContent).toContain('Key Flags');
  });

  it('should handle unavailable tool gracefully', async () => {
    const provider = new ToolsmithProvider();
    const result = await provider.isToolAvailable('nonexistent-tool-xyz');

    expect(result.available).toBe(false);
    expect(result.installHint).toBeDefined();
  });
});
```

### 6.3 Performance Tests

```javascript
// test/performance/toolsmith.test.mjs

describe('Toolsmith Performance', () => {
  it('should complete discovery in <60s', async () => {
    const start = Date.now();
    const discovery = new RuntimeDiscovery();
    await discovery.discover();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(60000);
  });

  it('should return cached spec in <100ms', async () => {
    const provider = new ToolsmithProvider();

    // Warm cache
    await provider.getToolSpec('git');

    // Measure cached retrieval
    const start = Date.now();
    await provider.getToolSpec('git');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
```

---

## 7. Deployment

### 7.1 Directory Initialization

On first use (`aiwg runtime-info --discover`), create:

```bash
.aiwg/smiths/toolsmith/
├── runtime.json           # Generated
├── runtime-info.md        # Generated
├── config.json            # From template
├── index.json             # Generated
└── tools/
    ├── core/
    ├── languages/
    ├── utilities/
    └── custom/
```

### 7.2 Template Files

Deploy templates from AIWG installation:

**Source**: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/toolsmith/`

```
templates/toolsmith/
├── cli-tool-template.md
├── language-runtime-template.md
├── api-tool-template.md
└── config-template.json
```

### 7.3 Agent Deployment

Deploy toolsmith-provider agent:

```bash
aiwg -deploy-agents --include toolsmith-provider
```

This copies `toolsmith-provider.md` to `.claude/agents/`.

---

## References

- @.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md - Architecture decision
- @.aiwg/architecture/software-architecture-doc.md - System architecture
- @agentic/code/frameworks/sdlc-complete/agents/toolsmith.md - Existing toolsmith agent
- @src/cli/index.mjs - CLI implementation

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | Architecture Designer | Initial specification |
