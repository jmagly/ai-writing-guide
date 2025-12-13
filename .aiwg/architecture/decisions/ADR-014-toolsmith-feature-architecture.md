# ADR-014: Toolsmith Feature Architecture

## Title

Toolsmith: Dynamic Tool Specification Provider for Subagent Scenarios

## Status

Proposed

## Context

AI agents operate in environments with access to numerous tools (CLI utilities, language runtimes, system commands, etc.). Current challenges:

1. **Context Window Pressure**: Loading tool documentation for all available tools consumes significant context
2. **Tool Discovery**: Agents lack awareness of which tools are actually installed and functioning in the current environment
3. **Subagent Context Loss**: When toolsmith operates as a subagent, its full context is discarded - only the returned tool specification persists
4. **Platform Variability**: Tool availability and syntax varies across operating systems (Linux, macOS, Windows/WSL)
5. **Specification Staleness**: Tool behaviors change between versions; cached specs may become outdated

The Toolsmith feature addresses these by providing on-demand, platform-aware tool specifications that work effectively in subagent scenarios where context is ephemeral.

## Decision

Implement Toolsmith as a three-component system:

1. **Runtime Discovery Command** (`aiwg-runtime-info`): Discovers and catalogs available tools
2. **Toolsmith Core**: On-demand tool specification provider (agent + skill)
3. **Tool Storage**: Cached tool specifications with platform-aware customization

### Architecture Overview

```
                                    ┌─────────────────────────────────────┐
                                    │         Primary Agent               │
                                    │  (Orchestrator / User Session)      │
                                    └──────────────┬──────────────────────┘
                                                   │
                                                   │ Request: "I need to use jq"
                                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Toolsmith Subagent                                     │
│  ┌──────────────────┐    ┌──────────────────┐    ┌────────────────────────────┐ │
│  │ Runtime Catalog  │───▶│  Toolsmith Core  │───▶│     Tool Specification     │ │
│  │ (runtime.json)   │    │  (lookup+adapt)  │    │       (returned)           │ │
│  └──────────────────┘    └──────────────────┘    └────────────────────────────┘ │
│           ▲                       │                                              │
│           │                       ▼                                              │
│  ┌────────┴─────────┐    ┌──────────────────┐                                   │
│  │ aiwg-runtime-info│    │  Tool Storage    │                                   │
│  │    (discovery)   │    │ (.aiwg/smiths/   │                                   │
│  └──────────────────┘    │  toolsmith/tools)│                                   │
│                          └──────────────────┘                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   │ Context discarded,
                                                   │ only spec returns
                                                   ▼
                                    ┌─────────────────────────────────────┐
                                    │         Primary Agent               │
                                    │   Receives: Complete tool spec      │
                                    │   with usage examples, flags,       │
                                    │   platform notes                    │
                                    └─────────────────────────────────────┘
```

## Detailed Design

### 1. Directory Structure

```
.aiwg/smiths/toolsmith/
├── runtime.json                    # Discovered tools catalog (auto-generated)
├── runtime-info.md                 # Human-readable runtime summary
├── config.json                     # Toolsmith configuration
├── tools/                          # Generated/cached tool specifications
│   ├── core/                       # Core system tools (always available)
│   │   ├── bash.tool.md
│   │   ├── git.tool.md
│   │   └── curl.tool.md
│   ├── languages/                  # Language runtimes
│   │   ├── node.tool.md
│   │   ├── python.tool.md
│   │   └── go.tool.md
│   ├── utilities/                  # CLI utilities
│   │   ├── jq.tool.md
│   │   ├── ripgrep.tool.md
│   │   └── docker.tool.md
│   └── custom/                     # User-defined tools
│       └── project-cli.tool.md
├── templates/                      # Tool spec templates
│   ├── cli-tool-template.md
│   ├── language-runtime-template.md
│   └── api-tool-template.md
└── index.json                      # Tool index with search metadata
```

### 2. Runtime Catalog Schema (runtime.json)

```json
{
  "$schema": "https://aiwg.io/schemas/toolsmith/runtime-catalog-v1.json",
  "version": "1.0",
  "generated": "2025-12-12T10:00:00Z",
  "environment": {
    "os": "linux",
    "osVersion": "Ubuntu 22.04 LTS",
    "arch": "x86_64",
    "shell": "/bin/bash",
    "homeDir": "/home/user",
    "workingDir": "/path/to/project"
  },
  "resources": {
    "diskFreeGb": 120.5,
    "memoryTotalGb": 32.0,
    "memoryAvailableGb": 24.2,
    "cpuCores": 8
  },
  "tools": [
    {
      "id": "git",
      "name": "Git",
      "category": "core",
      "version": "2.43.0",
      "path": "/usr/bin/git",
      "status": "verified",
      "lastVerified": "2025-12-12T10:00:00Z",
      "capabilities": ["version-control", "remote", "branching", "merging"],
      "manPage": "/usr/share/man/man1/git.1.gz",
      "documentation": "https://git-scm.com/docs",
      "aliases": ["g"],
      "relatedTools": ["gh", "git-lfs"]
    },
    {
      "id": "jq",
      "name": "jq",
      "category": "utilities",
      "version": "1.6",
      "path": "/usr/bin/jq",
      "status": "verified",
      "lastVerified": "2025-12-12T10:00:00Z",
      "capabilities": ["json-processing", "filtering", "transformation"],
      "manPage": "/usr/share/man/man1/jq.1.gz",
      "documentation": "https://stedolan.github.io/jq/manual/",
      "aliases": [],
      "relatedTools": ["yq", "fx"]
    }
  ],
  "unavailable": [
    {
      "id": "kubectl",
      "reason": "not-installed",
      "installHint": "curl -LO 'https://dl.k8s.io/release/stable.txt' && ..."
    }
  ]
}
```

### 3. Tool Specification Schema (*.tool.md)

```markdown
---
id: jq
name: jq
version: 1.6
category: utilities
platform: linux
platformNotes: "Also available on macOS (brew install jq), Windows (choco install jq)"
status: verified
verifiedDate: 2025-12-12
capabilities:
  - json-processing
  - filtering
  - transformation
  - streaming
synopsis: "jq - commandline JSON processor"
---

# jq - JSON Processor

## Quick Reference

```bash
# Basic usage
jq '.' file.json                    # Pretty print JSON
jq '.field' file.json               # Extract field
jq '.array[]' file.json             # Iterate array
jq -r '.field' file.json            # Raw output (no quotes)

# Piped usage
cat file.json | jq '.field'
curl -s api.example.com | jq '.data'
```

## Common Patterns

### Filtering
```bash
jq '.[] | select(.status == "active")' data.json
jq 'map(select(.count > 10))' data.json
```

### Transformation
```bash
jq '{name: .title, id: .identifier}' data.json
jq '[.items[] | {name, price}]' data.json
```

### Multiple Files
```bash
jq -s '.' file1.json file2.json     # Slurp into array
jq --slurpfile ref ref.json '...'   # Reference file
```

## Key Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-r` | Raw output | `jq -r '.name'` |
| `-c` | Compact output | `jq -c '.'` |
| `-s` | Slurp (array) | `jq -s '.'` |
| `-e` | Exit non-zero if null | `jq -e '.field'` |
| `--arg` | Pass string arg | `jq --arg v "$VAR" '.x = $v'` |
| `--argjson` | Pass JSON arg | `jq --argjson n 5 '.count = $n'` |

## Error Handling

```bash
# Check if field exists
jq 'if .field then .field else "default" end' data.json

# Handle null
jq '.field // "default"' data.json

# Validate JSON
jq empty file.json && echo "Valid JSON"
```

## Platform-Specific Notes

### Linux
- Usually at `/usr/bin/jq`
- Install: `apt install jq` / `dnf install jq`

### macOS
- Install: `brew install jq`
- May need `brew link jq` if issues

### Windows (WSL)
- Same as Linux within WSL
- Native Windows: `choco install jq`

## Performance Tips

- Use `-c` for large outputs (compact)
- Stream large files: `jq --stream`
- For huge files, consider `gojq` (Go implementation)

## See Also

- Man page: `man jq`
- Online manual: https://stedolan.github.io/jq/manual/
- Related: yq (YAML), fx (interactive), gron (greppable)
```

### 4. Toolsmith Configuration Schema (config.json)

```json
{
  "$schema": "https://aiwg.io/schemas/toolsmith/config-v1.json",
  "version": "1.0",
  "discovery": {
    "autoDiscoverOnInit": true,
    "refreshIntervalHours": 24,
    "categories": ["core", "languages", "utilities", "custom"],
    "excludePatterns": ["*-dev", "*-dbg"],
    "includeSystemPath": true,
    "additionalPaths": ["/usr/local/bin", "~/.local/bin"]
  },
  "generation": {
    "preferLocalManPages": true,
    "fetchRemoteDocs": false,
    "includeExamples": true,
    "exampleCount": 5,
    "platformAdaptation": true
  },
  "caching": {
    "enabled": true,
    "ttlDays": 30,
    "maxCacheSizeMb": 50,
    "autoUpdateOnVersionChange": true
  },
  "output": {
    "format": "markdown",
    "includeFrontmatter": true,
    "compactMode": false
  }
}
```

### 5. Tool Index Schema (index.json)

```json
{
  "$schema": "https://aiwg.io/schemas/toolsmith/index-v1.json",
  "version": "1.0",
  "generated": "2025-12-12T10:00:00Z",
  "totalTools": 45,
  "categories": {
    "core": 8,
    "languages": 12,
    "utilities": 20,
    "custom": 5
  },
  "tools": [
    {
      "id": "jq",
      "path": "utilities/jq.tool.md",
      "keywords": ["json", "filter", "transform", "parse", "query"],
      "synopsis": "commandline JSON processor",
      "lastUpdated": "2025-12-12T10:00:00Z"
    },
    {
      "id": "git",
      "path": "core/git.tool.md",
      "keywords": ["version-control", "vcs", "repository", "commit", "branch"],
      "synopsis": "distributed version control system",
      "lastUpdated": "2025-12-12T10:00:00Z"
    }
  ],
  "aliases": {
    "g": "git",
    "python3": "python",
    "node": "nodejs"
  },
  "capabilityIndex": {
    "json-processing": ["jq", "python", "node"],
    "version-control": ["git", "svn", "hg"],
    "http-client": ["curl", "wget", "httpie"]
  }
}
```

## Component Specifications

### 1. Runtime Discovery Command (`aiwg-runtime-info`)

**Purpose**: Discover installed tools, verify functionality, generate runtime catalog

**Interface**:
```bash
# Full discovery (regenerate runtime.json)
aiwg-runtime-info --discover

# Quick check (verify existing catalog)
aiwg-runtime-info --verify

# Output runtime summary
aiwg-runtime-info --summary

# Check specific tool
aiwg-runtime-info --check <tool-name>

# Add custom tool to discovery
aiwg-runtime-info --add <tool-name> --path <path>

# Export for agent consumption
aiwg-runtime-info --export [json|md]
```

**Implementation Strategy**:
1. Scan PATH directories for executables
2. Execute `<tool> --version` or `<tool> -v` to verify and get version
3. Locate man pages (`man -w <tool>`)
4. Categorize based on known tool database + heuristics
5. Generate `runtime.json` and `runtime-info.md`

**Output Example (--summary)**:
```
Runtime Environment Summary
===========================
OS: Linux (Ubuntu 22.04 LTS) x86_64
Shell: /bin/bash
Memory: 24.2 GB available / 32.0 GB total
Disk: 120.5 GB free

Tool Categories:
  Core:       8 tools (git, bash, curl, ssh, ...)
  Languages: 12 tools (node, python, go, rust, ...)
  Utilities: 20 tools (jq, ripgrep, docker, ...)
  Custom:     5 tools (project-cli, deploy, ...)

Total: 45 verified tools

Last Discovery: 2025-12-12 10:00:00
Catalog: .aiwg/smiths/toolsmith/runtime.json
```

### 2. Toolsmith Core (Agent + Skill)

**Agent Definition** (`toolsmith-provider.md`):
```yaml
---
name: toolsmith-provider
description: Provides platform-aware tool specifications for agent operations
model: haiku
tools: Read, Bash, Glob, Grep
orchestration: false
category: infrastructure
subagent-optimized: true
---
```

**Operating Mode**:
The toolsmith operates in a request-response pattern optimized for subagent scenarios:

1. **Receive Request**: Tool name, capability query, or lookup phrase
2. **Consult Catalog**: Check `runtime.json` for tool availability
3. **Retrieve/Generate Spec**:
   - If cached spec exists and valid: return it
   - If tool available but no spec: generate from man page + templates
   - If tool unavailable: return installation guidance
4. **Platform Adaptation**: Adjust spec for current OS/shell
5. **Return Spec**: Complete tool specification (context-free)

**Request Types**:
```
# Direct tool request
"I need the jq tool specification"

# Capability query
"What tool can I use to process JSON?"

# Lookup/search
"Find a tool for making HTTP requests"

# Multi-tool request
"I need git and gh specifications"
```

**Response Format** (for subagent return):
```markdown
# Tool Specification: jq

[Complete tool.md content as shown in schema above]

---
Source: .aiwg/smiths/toolsmith/tools/utilities/jq.tool.md
Generated: 2025-12-12T10:00:00Z
Platform: linux (Ubuntu 22.04)
Status: verified
```

### 3. Tool Storage Strategy

**Caching Rules**:
1. **Cache on first request**: Generate spec when first requested
2. **Version-aware invalidation**: Re-generate if tool version changes
3. **TTL-based refresh**: Re-verify after configured TTL (default 30 days)
4. **Platform separation**: Specs may differ per platform

**Storage Layout**:
```
.aiwg/smiths/toolsmith/tools/
├── core/                           # Essential tools (pre-populated)
├── languages/                      # Language runtimes
├── utilities/                      # CLI utilities
├── custom/                         # Project-specific tools
└── _generated/                     # Auto-generated (can be deleted)
```

**Generation Pipeline**:
```
Request for tool spec
         │
         ▼
Check index.json ──────────────────┐
         │                          │
         ▼                          │ Not in index
    In cache? ─────────────────┐    │
         │                      │    │
         ▼ Yes                  │    │
  Version match? ──────────────│────│
         │                      │    │
         ▼ Yes                  │    │
    Return cached              │    │
                               │    │
         ┌─────────────────────┘    │
         │ No (outdated/missing)    │
         ▼                          │
  Check runtime.json ◄──────────────┘
         │
         ▼
  Tool installed? ─────────────────┐
         │                          │
         ▼ Yes                      │ No
  Generate spec from:               │
  1. Man page (man -w)              │
  2. --help output                  │
  3. Template + known patterns      │
  4. Remote docs (if configured)    │
         │                          │
         ▼                          ▼
  Cache in tools/              Return "not available"
         │                     + installation hints
         ▼
  Update index.json
         │
         ▼
  Return spec
```

## Integration Points

### 1. AIWG CLI Integration

New CLI commands:
```bash
# Runtime discovery
aiwg runtime-info                   # Alias for aiwg-runtime-info
aiwg runtime-info --discover        # Full discovery
aiwg runtime-info --verify          # Quick verify

# Toolsmith operations
aiwg toolsmith get <tool>           # Get tool spec
aiwg toolsmith search <query>       # Search by capability
aiwg toolsmith list                 # List available tools
aiwg toolsmith generate <tool>      # Force regenerate spec
aiwg toolsmith clear-cache          # Clear generated specs
```

### 2. Agent Orchestration Integration

The orchestrator can invoke toolsmith as a subagent:
```
Orchestrator Request:
Task(toolsmith-provider) -> "Provide spec for jq, ripgrep, and curl"

Toolsmith Returns:
[Combined tool specifications - standalone, no context needed]

Orchestrator:
Uses returned specs in subsequent agent tasks
```

### 3. Context Builder Integration

ContextBuilder can optionally include runtime summary:
```javascript
// In context-builder.mjs
if (config.includeRuntimeInfo) {
  const runtimeSummary = await loadRuntimeSummary();
  context.runtimeEnvironment = runtimeSummary;
}
```

### 4. Security Gate Integration

SecurityGate can use toolsmith to verify security tool availability:
```javascript
// In security-gate.mjs
const securityTools = ['detect-secrets', 'semgrep', 'trivy'];
const available = await toolsmith.checkTools(securityTools);
// Graceful degradation if some tools missing
```

## Workflow Diagrams

### Discovery Workflow

```
User runs: aiwg runtime-info --discover
                    │
                    ▼
┌───────────────────────────────────────┐
│  1. Collect Environment Info          │
│     - OS, arch, shell                 │
│     - Memory, disk, CPU               │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  2. Scan PATH Directories             │
│     - /usr/bin, /usr/local/bin        │
│     - ~/.local/bin, custom paths      │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  3. Verify Each Tool                  │
│     - Execute --version               │
│     - Check exit code                 │
│     - Record version string           │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  4. Categorize Tools                  │
│     - Match against known database    │
│     - Detect capabilities             │
│     - Find man pages                  │
└───────────────────┬───────────────────┘
                    ▼
┌───────────────────────────────────────┐
│  5. Generate Outputs                  │
│     - runtime.json (machine)          │
│     - runtime-info.md (human)         │
│     - Update index.json               │
└───────────────────┴───────────────────┘
```

### Tool Request Workflow (Subagent Scenario)

```
Primary Agent: "I need to parse JSON from an API response"
                    │
                    ▼
┌───────────────────────────────────────┐
│  Task(toolsmith-provider)             │
│  Request: "JSON parsing tool"         │
└───────────────────┬───────────────────┘
                    │
                    │ Subagent context
                    ▼
┌───────────────────────────────────────────────────────────────┐
│  Toolsmith Subagent (isolated context)                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. Read runtime.json                                     │  │
│  │ 2. Search index.json for "json" capability               │  │
│  │ 3. Found: jq, python, node                               │  │
│  │ 4. Select best match: jq (specialized)                   │  │
│  │ 5. Load/generate jq.tool.md                              │  │
│  │ 6. Adapt for current platform                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                   │
│                            ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Return: Complete jq specification                        │  │
│  │ (Self-contained, no external references)                 │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                    │
                    │ Context discarded,
                    │ only spec remains
                    ▼
┌───────────────────────────────────────┐
│  Primary Agent receives:              │
│  - Full jq tool specification         │
│  - Usage examples                     │
│  - Platform-specific notes            │
│  - Error handling patterns            │
└───────────────────────────────────────┘
                    │
                    ▼
        Primary Agent uses jq effectively
```

## API/Interface Design

### Toolsmith Provider API

```typescript
interface ToolsmithProvider {
  // Get specification for a specific tool
  getToolSpec(toolId: string): Promise<ToolSpecification>;

  // Search tools by capability or keyword
  searchTools(query: string): Promise<ToolSearchResult[]>;

  // Get multiple tool specs
  getToolSpecs(toolIds: string[]): Promise<ToolSpecification[]>;

  // Check if tool is available
  isToolAvailable(toolId: string): Promise<ToolAvailability>;

  // Get capability recommendations
  getToolForCapability(capability: string): Promise<ToolRecommendation>;

  // Force regenerate spec
  regenerateSpec(toolId: string): Promise<ToolSpecification>;
}

interface ToolSpecification {
  id: string;
  name: string;
  version: string;
  category: ToolCategory;
  platform: Platform;
  platformNotes: string;
  status: 'verified' | 'unverified' | 'unavailable';
  synopsis: string;
  quickReference: string;
  commonPatterns: Pattern[];
  keyFlags: Flag[];
  errorHandling: string;
  performanceTips: string;
  seeAlso: string[];
  rawContent: string;  // Full markdown content
}

interface ToolSearchResult {
  toolId: string;
  relevance: number;
  matchedKeywords: string[];
  synopsis: string;
}

interface ToolAvailability {
  available: boolean;
  version?: string;
  path?: string;
  installHint?: string;
}

interface ToolRecommendation {
  primary: string;
  alternatives: string[];
  reasoning: string;
}

type ToolCategory = 'core' | 'languages' | 'utilities' | 'custom';
type Platform = 'linux' | 'macos' | 'windows' | 'wsl';
```

### Runtime Info API

```typescript
interface RuntimeInfo {
  // Discover all tools
  discover(): Promise<RuntimeCatalog>;

  // Verify existing catalog
  verify(): Promise<VerificationResult>;

  // Get summary
  getSummary(): Promise<RuntimeSummary>;

  // Check specific tool
  checkTool(toolName: string): Promise<ToolStatus>;

  // Add custom tool
  addCustomTool(config: CustomToolConfig): Promise<void>;

  // Export catalog
  export(format: 'json' | 'md'): Promise<string>;
}

interface RuntimeCatalog {
  version: string;
  generated: Date;
  environment: EnvironmentInfo;
  resources: ResourceInfo;
  tools: CatalogedTool[];
  unavailable: UnavailableTool[];
}

interface EnvironmentInfo {
  os: string;
  osVersion: string;
  arch: string;
  shell: string;
  homeDir: string;
  workingDir: string;
}

interface ResourceInfo {
  diskFreeGb: number;
  memoryTotalGb: number;
  memoryAvailableGb: number;
  cpuCores: number;
}

interface CatalogedTool {
  id: string;
  name: string;
  category: ToolCategory;
  version: string;
  path: string;
  status: 'verified' | 'unverified';
  lastVerified: Date;
  capabilities: string[];
  manPage?: string;
  documentation?: string;
  aliases: string[];
  relatedTools: string[];
}
```

## Consequences

### Positive

1. **Reduced Context Pressure**: Only load tool specs when needed
2. **Platform Awareness**: Specs adapted for actual runtime environment
3. **Subagent Optimized**: Self-contained specs work after context discard
4. **Caching Efficiency**: Avoid regenerating known tool specs
5. **Discovery**: Agents know what tools are actually available
6. **Extensibility**: Easy to add custom/project-specific tools

### Negative

1. **Initial Discovery Cost**: First discovery scan takes time (~30-60s)
2. **Storage Overhead**: Cached specs consume disk (~50MB max)
3. **Maintenance**: Tool database needs periodic updates
4. **Complexity**: Additional infrastructure component to maintain

### Trade-offs

| Aspect | Without Toolsmith | With Toolsmith |
|--------|------------------|----------------|
| Context usage | High (all tool docs) | Low (on-demand) |
| Platform awareness | None | Full |
| Subagent compatibility | Poor | Excellent |
| Initial setup | None | ~1 minute |
| Storage | None | ~50MB |
| Accuracy | Generic docs | Verified, versioned |

## Alternatives Considered

### Alternative 1: Static Tool Documentation

Embed all tool documentation in agent definitions.

**Rejected because**:
- Consumes excessive context
- Not platform-aware
- No verification of tool availability
- Stale documentation

### Alternative 2: External Documentation Service

Call external API for tool documentation.

**Rejected because**:
- Violates zero-external-API principle (NFR-SEC-001)
- Network dependency
- Privacy concerns
- Latency issues

### Alternative 3: Man Page Passthrough

Simply return raw man pages.

**Rejected because**:
- Man pages often verbose and context-heavy
- Not optimized for AI consumption
- Missing practical examples
- No capability indexing

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Directory structure creation
- [ ] Runtime discovery command (`aiwg-runtime-info`)
- [ ] Basic runtime.json generation
- [ ] Tool verification logic

### Phase 2: Tool Specification (Week 3-4)
- [ ] Tool spec schema and templates
- [ ] Spec generation from man pages
- [ ] Index generation and search
- [ ] Caching layer

### Phase 3: Agent Integration (Week 5-6)
- [ ] Toolsmith provider agent definition
- [ ] Subagent request/response patterns
- [ ] Context builder integration
- [ ] CLI commands

### Phase 4: Hardening (Week 7-8)
- [ ] Platform-specific adaptations
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Documentation and examples

## References

- @.aiwg/architecture/software-architecture-doc.md - System architecture context
- @agentic/code/frameworks/sdlc-complete/agents/toolsmith.md - Existing toolsmith agent
- @.aiwg/requirements/nfr-modules/performance.md - Performance requirements
- @.aiwg/requirements/nfr-modules/security.md - Security requirements (zero external API)

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | Architecture Designer | Initial proposal |
