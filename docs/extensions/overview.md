# Extension System Overview

AIWG's unified extension system provides a single schema for all extension types, enabling dynamic discovery, semantic search, and cross-platform deployment.

**References:**
- @src/extensions/types.ts - Core type definitions
- @.aiwg/architecture/unified-extension-schema.md - Complete schema documentation
- @src/extensions/commands/definitions.ts - Example command extensions

---

## What Are Extensions?

Extensions are the building blocks of AIWG frameworks and addons. They include:

| Type | Purpose | Examples |
|------|---------|----------|
| **agent** | Specialized AI personas | API Designer, Test Engineer |
| **command** | CLI and slash commands | `/mention-wire`, `aiwg use sdlc` |
| **skill** | Natural language workflows | Project awareness, voice application |
| **hook** | Lifecycle event handlers | Pre-session setup, post-write validation |
| **tool** | External utilities | git, jq, npm |
| **mcp-server** | MCP protocol servers | AIWG MCP server |
| **framework** | Complete workflows | SDLC Complete, Marketing Kit, Media Curator, Research Complete |
| **addon** | Feature bundles | Voice Framework, Testing Quality |
| **template** | Document templates | Use case template, ADR template |
| **prompt** | Reusable prompts | Code review, security audit |

---

## Unified Schema

All extensions share a common structure:

```typescript
interface Extension {
  // Core identity
  id: string;                       // Unique identifier (kebab-case)
  type: ExtensionType;              // Extension type
  name: string;                     // Human-readable name
  description: string;              // Brief description
  version: string;                  // Semantic version

  // Discovery & classification
  capabilities: string[];           // What it can do
  keywords: string[];               // Search terms
  category?: string;                // Hierarchical category

  // Platform & deployment
  platforms: PlatformCompatibility; // Which platforms it supports
  deployment: DeploymentConfig;     // Where and how to deploy

  // Dependencies
  requires?: string[];              // Required extensions
  recommends?: string[];            // Optional enhancements
  conflicts?: string[];             // Incompatible extensions
  systemDependencies?: Record<string, string>; // CLI tools, etc.

  // Type-specific metadata
  metadata: ExtensionMetadata;      // Agent/Command/Skill/etc. specific data
}
```

---

## Extension Types

### Agent Extensions

Specialized AI personas with defined roles, tools, and workflows.

**Metadata:**
```typescript
interface AgentMetadata {
  role: string;                     // e.g., "API Design and Contract Definition"
  model: {
    tier: 'haiku' | 'sonnet' | 'opus';
    override?: string;
  };
  tools: string[];                  // e.g., ["Read", "Write", "Bash"]
  workflow?: string[];              // Step-by-step process
  expertise?: string[];             // Areas of expertise
  responsibilities?: string[];      // What this agent does
}
```

**Example:**
```typescript
{
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Defines API styles, endpoints, and data contracts',
  capabilities: ['api-design', 'interface-contracts', 'rest'],
  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: { tier: 'sonnet' },
    tools: ['Read', 'Write', 'Glob', 'Grep']
  }
}
```

---

### Command Extensions

CLI and slash commands with argument parsing and execution logic.

**Metadata:**
```typescript
interface CommandMetadata {
  template: 'utility' | 'transformation' | 'orchestration';
  arguments?: CommandArgument[];
  options?: CommandOption[];
  argumentHint?: string;            // e.g., "<file-path>"
  allowedTools?: string[];          // Tools this command uses
  executionSteps?: string[];        // What it does
}
```

**Example:**
```typescript
{
  id: 'use',
  type: 'command',
  name: 'Use',
  description: 'Install and deploy framework',
  capabilities: ['cli', 'framework', 'deployment'],
  metadata: {
    type: 'command',
    template: 'orchestration',
    argumentHint: '<framework>',
    allowedTools: ['Read', 'Write', 'Bash', 'Glob']
  }
}
```

---

### Skill Extensions

Natural language workflows triggered by phrases or conditions.

**Metadata:**
```typescript
interface SkillMetadata {
  triggerPhrases: string[];         // e.g., ["what's next?", "project status"]
  autoTrigger?: boolean;            // Auto-activate on conditions
  autoTriggerConditions?: string[]; // e.g., ["session-start"]
  tools?: string[];
  references?: SkillReference[];
}
```

**Example:**
```typescript
{
  id: 'project-awareness',
  type: 'skill',
  name: 'Project Awareness',
  description: 'Comprehensive project context detection',
  capabilities: ['context-awareness', 'project-detection'],
  metadata: {
    type: 'skill',
    triggerPhrases: ['what project is this', 'where are we?'],
    autoTrigger: true,
    autoTriggerConditions: ['session-start']
  }
}
```

---

### Hook Extensions

Lifecycle event handlers for session, command, and tool events.

**Metadata:**
```typescript
interface HookMetadata {
  event: HookEvent;                 // When to trigger
  priority?: number;                // Execution order (lower = earlier)
  canModify?: boolean;              // Can change execution
  canBlock?: boolean;               // Can prevent execution
}

type HookEvent =
  | 'pre-session' | 'post-session'
  | 'pre-command' | 'post-command'
  | 'pre-agent' | 'post-agent'
  | 'pre-write' | 'post-write'
  | 'pre-bash' | 'post-bash';
```

---

### Tool Extensions

External CLI utilities with discovery and verification.

**Metadata:**
```typescript
interface ToolMetadata {
  category: 'core' | 'languages' | 'utilities' | 'custom';
  executable: string;               // Command name
  aliases?: string[];               // Alternative names
  verificationStatus?: 'verified' | 'unverified';
  installHint?: string;             // How to install if missing
}
```

---

### MCP Server Extensions

Model Context Protocol servers with capabilities and tools.

**Metadata:**
```typescript
interface MCPServerMetadata {
  mcpVersion: string;               // e.g., "1.0"
  transport: 'stdio' | 'http';
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
  };
  tools?: MCPToolSummary[];
}
```

---

### Framework Extensions

Complete workflows that bundle multiple extensions.

**Metadata:**
```typescript
interface FrameworkMetadata {
  domain: string;                   // e.g., "sdlc", "marketing"
  includes: {
    agents?: string[];
    commands?: string[];
    skills?: string[];
    hooks?: string[];
    templates?: string[];
  };
}
```

---

### Addon Extensions

Feature bundles that extend frameworks.

**Metadata:**
```typescript
interface AddonMetadata {
  entry: {
    agents?: string;                // Path to agent definitions
    commands?: string;
    skills?: string;
  };
  provides: {
    agents?: string[];              // IDs of provided extensions
    commands?: string[];
    skills?: string[];
  };
}
```

---

## Platform Compatibility

Extensions declare which platforms they support:

```typescript
interface PlatformCompatibility {
  claude?: PlatformSupport;
  factory?: PlatformSupport;
  cursor?: PlatformSupport;
  copilot?: PlatformSupport;
  windsurf?: PlatformSupport;
  codex?: PlatformSupport;
  opencode?: PlatformSupport;
  generic?: PlatformSupport;
}

type PlatformSupport = 'full' | 'partial' | 'experimental' | 'none';
```

**Deployment paths are platform-specific:**

```typescript
{
  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
    pathOverrides: {
      'claude': '.claude/agents/api-designer.md'
    }
  }
}
```

**Platform examples:**
- Claude Code: `.claude/agents/`, `.claude/commands/`
- GitHub Copilot: `.github/agents/`, `.github/commands/`
- Warp: `WARP.md` (symlinked to `CLAUDE.md`)
- Cursor: `.cursor/rules/`, `.cursor/agents/`

---

## Capability-Based Discovery

Extensions are indexed by capabilities for semantic search:

```typescript
interface CapabilityIndex {
  capabilities: Record<string, string[]>;  // capability → extension IDs
  keywords: Record<string, string[]>;      // keyword → extension IDs
  categories: Record<string, string[]>;    // category → extension IDs
  types: Record<ExtensionType, string[]>;  // type → extension IDs
  platforms: Record<string, string[]>;     // platform → extension IDs
  searchIndex: Record<string, string[]>;   // term → extension IDs
}
```

**Search examples:**

```typescript
// Find all API-related extensions
registry.search({ capabilities: ['api-design'] });

// Find agents that can write code
registry.search({ type: 'agent', capabilities: ['code-generation'] });

// Find commands for Cursor platform
registry.search({ type: 'command', platform: 'cursor' });

// Full-text search
registry.search({ search: 'authentication' });
```

---

## Extension Lifecycle

### Discovery

Extensions are discovered from:
- Built-in directories (`agentic/code/frameworks/`, `agentic/code/addons/`)
- Installed packages (`node_modules/@aiwg/*/`)
- Local directories (`.aiwg/frameworks/`)

### Registration

```typescript
const registry = new ExtensionRegistry();
await registry.discover([
  'agentic/code/frameworks',
  'agentic/code/addons',
]);
```

### Deployment

```bash
# Deploy to target platform
aiwg use sdlc --provider claude

# Extension system:
# 1. Resolves dependencies
# 2. Validates platform compatibility
# 3. Copies files to platform paths
# 4. Updates registry
```

### Validation

```typescript
const result = await validateExtension(extension);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

---

## Dependencies

Extensions can declare dependencies:

```typescript
{
  requires: ['sdlc-complete', 'aiwg-utils'],
  recommends: ['voice-framework'],
  conflicts: ['legacy-agent-v1'],
  systemDependencies: {
    'git': '>=2.0.0',
    'jq': '*'
  }
}
```

**Dependency resolution:**
1. Check required extensions are installed
2. Install recommended extensions if available
3. Verify no conflicts exist
4. Check system dependencies present

---

## Creating Extensions

See:
- [Creating Extensions Guide](creating-extensions.md)
- [Extension Types Reference](extension-types.md)
- @docs/development/agent-template.md
- @agentic/code/frameworks/sdlc-complete/agents/README.md

---

## Extension Registry

The central registry manages all extensions:

```typescript
class ExtensionRegistry {
  // Discovery
  async discover(paths: string[]): Promise<Extension[]>;

  // CRUD
  async register(ext: Extension): Promise<void>;
  async unregister(id: string): Promise<void>;
  async get(id: string): Promise<Extension | null>;
  async list(filter?: ExtensionFilter): Promise<Extension[]>;

  // Search
  async search(query: CapabilityQuery): Promise<CapabilitySearchResult>;

  // Index
  async rebuildIndex(): Promise<void>;
  getIndex(): CapabilityIndex;
}
```

**Registry file:** `.aiwg/frameworks/registry.json`

---

## Benefits

### Unified Schema
- Single source of truth for all extension metadata
- Type-safe TypeScript definitions
- Consistent validation rules

### Dynamic Discovery
- Extensions found automatically
- Capability-based search
- Platform-aware filtering

### Multi-Platform Support
- Deploy to any supported platform
- Platform-specific path overrides
- Compatibility declarations

### Dependency Management
- Automatic dependency resolution
- Conflict detection
- Version constraints

### Help Generation
- Dynamic help from metadata
- Always in sync with extensions
- Rich examples and descriptions

---

## Migration

Existing formats automatically migrate to unified schema:

| Source Format | Migration Function |
|---------------|-------------------|
| Agent frontmatter | `migrateAgentFrontmatter()` |
| Command frontmatter | `migrateCommandFrontmatter()` |
| Skill YAML | `migrateSkillYAML()` |
| manifest.json v1 | `migrateManifestV1()` |

**Backward compatibility maintained during transition.**

---

## See Also

- [Creating Extensions](creating-extensions.md) - How to create your own
- [Extension Types Reference](extension-types.md) - Detailed type definitions
- @src/extensions/types.ts - Source code
- @.aiwg/architecture/unified-extension-schema.md - Full specification
- @docs/cli-reference.md - CLI command reference
