# Unified Extension Schema Design

**Document Type:** Interface Contract
**Status:** Draft
**Version:** 1.0.0
**Created:** 2026-01-22
**Author:** API Designer

## Purpose

Define a single, unified schema that can represent all AIWG extension types (agents, commands, skills, hooks, tools, MCP servers) to enable dynamic discovery, semantic search, and a unified help system.

## References

- @src/catalog/types.ts - Catalog system patterns
- @src/agents/types.ts - Agent deployment types
- @src/smiths/agentsmith/types.ts - Agent generation types
- @src/smiths/commandsmith/types.ts - Command generation types
- @src/smiths/skillsmith/types.ts - Skill generation types
- @src/smiths/toolsmith/types.ts - Tool discovery types
- @src/smiths/mcpsmith/types.ts - MCP server types
- @agentic/code/addons/aiwg-utils/manifest.json - Manifest format example
- @agentic/code/frameworks/sdlc-complete/extensions/github/extension.json - Extension format

## Design Goals

1. **Unification**: Single schema covers all extension types
2. **Discovery**: Support capability-based and semantic search
3. **Extensibility**: Allow type-specific metadata without breaking compatibility
4. **Validation**: Clear rules for what constitutes a valid extension
5. **Backward Compatibility**: Map existing formats to new schema
6. **Platform Awareness**: Support multi-platform deployment metadata
7. **Dependency Management**: Express dependencies between extensions
8. **Help System**: Include metadata for dynamic help generation

## 1. Core Extension Schema

```typescript
/**
 * Unified Extension Schema
 *
 * Represents any AIWG extension: agent, command, skill, hook, tool, or MCP server.
 *
 * @version 1.0.0
 */
export interface Extension {
  // ============================================
  // Core Identity (Required)
  // ============================================

  /**
   * Unique identifier (kebab-case)
   *
   * @example "api-designer"
   * @example "mention-wire"
   * @example "voice-apply"
   */
  id: string;

  /**
   * Extension type discriminator
   *
   * Used for type-safe narrowing and dispatch.
   */
  type: ExtensionType;

  /**
   * Human-readable name
   *
   * @example "API Designer"
   * @example "Mention Wire Command"
   */
  name: string;

  /**
   * Brief description (1-2 sentences)
   *
   * Should be clear enough for search results and help listings.
   */
  description: string;

  /**
   * Semantic version (semver or CalVer)
   *
   * @example "1.0.0"
   * @example "2026.1.5"
   */
  version: string;

  // ============================================
  // Discovery & Classification (Required)
  // ============================================

  /**
   * Capabilities this extension provides
   *
   * Used for capability-based discovery and semantic search.
   *
   * @example ["api-design", "interface-contracts", "rest"]
   * @example ["traceability", "@-mention", "validation"]
   */
  capabilities: string[];

  /**
   * Keywords for search and categorization
   *
   * @example ["sdlc", "architecture", "design"]
   * @example ["testing", "quality", "validation"]
   */
  keywords: string[];

  /**
   * Categorical classification
   *
   * Allows hierarchical organization.
   *
   * @example "sdlc/architecture"
   * @example "writing-quality/validation"
   */
  category?: string;

  // ============================================
  // Platform & Deployment (Required)
  // ============================================

  /**
   * Platform compatibility
   *
   * Indicates which AI platforms this extension works with.
   */
  platforms: PlatformCompatibility;

  /**
   * Deployment configuration
   *
   * Where and how this extension is deployed.
   */
  deployment: DeploymentConfig;

  // ============================================
  // Dependencies & Requirements (Optional)
  // ============================================

  /**
   * Other extensions required by this extension
   *
   * @example ["sdlc-complete", "aiwg-utils"]
   */
  requires?: string[];

  /**
   * Optional extensions that enhance functionality
   *
   * @example ["voice-framework", "writing-quality"]
   */
  recommends?: string[];

  /**
   * Extensions that conflict with this one
   *
   * @example ["legacy-agent-v1"]
   */
  conflicts?: string[];

  /**
   * System dependencies (CLI tools, packages)
   *
   * @example { "gh": ">=2.0.0", "jq": "*" }
   */
  systemDependencies?: Record<string, string>;

  // ============================================
  // Metadata & Documentation (Optional)
  // ============================================

  /**
   * Extension author
   *
   * @example "AIWG Contributors"
   * @example "John Magly <john@example.com>"
   */
  author?: string;

  /**
   * License identifier
   *
   * @example "MIT"
   * @example "Apache-2.0"
   */
  license?: string;

  /**
   * Repository URL
   *
   * @example "https://github.com/jmagly/ai-writing-guide"
   */
  repository?: string;

  /**
   * Homepage/documentation URL
   *
   * @example "https://aiwg.io/extensions/api-designer"
   */
  homepage?: string;

  /**
   * Bug tracker URL
   *
   * @example "https://github.com/jmagly/ai-writing-guide/issues"
   */
  bugs?: string;

  /**
   * Documentation paths relative to extension root
   *
   * @example { "readme": "README.md", "guide": "docs/guide.md" }
   */
  documentation?: Record<string, string>;

  /**
   * Research compliance metadata
   *
   * Links to research best practices and archetypes.
   */
  researchCompliance?: Record<string, string[]>;

  // ============================================
  // Type-Specific Data (Discriminated Union)
  // ============================================

  /**
   * Type-specific metadata
   *
   * The shape of this object depends on `type` field.
   * TypeScript will narrow this based on the discriminator.
   */
  metadata: ExtensionMetadata;

  // ============================================
  // Lifecycle & Status (Optional)
  // ============================================

  /**
   * Extension status
   *
   * @default "stable"
   */
  status?: ExtensionStatus;

  /**
   * Deprecation information
   */
  deprecation?: {
    /** When this extension was deprecated (ISO 8601) */
    date: string;
    /** Replacement extension ID */
    successor?: string;
    /** Deprecation reason */
    reason: string;
  };

  /**
   * Installation state tracking
   *
   * Populated by the runtime, not in manifest files.
   */
  installation?: {
    /** Install timestamp (ISO 8601) */
    installedAt: string;
    /** Installation source */
    installedFrom: 'builtin' | 'registry' | 'local' | 'git';
    /** Installation path */
    installedPath: string;
    /** Enabled state */
    enabled: boolean;
  };

  // ============================================
  // Validation & Quality (Optional)
  // ============================================

  /**
   * Extension checksum for integrity validation
   *
   * @example "sha256:abc123..."
   */
  checksum?: string;

  /**
   * Signature for authenticity verification
   */
  signature?: {
    algorithm: 'pgp' | 'ed25519';
    value: string;
    publicKey?: string;
  };
}

/**
 * Extension type discriminator
 */
export type ExtensionType =
  | 'agent'
  | 'command'
  | 'skill'
  | 'hook'
  | 'tool'
  | 'mcp-server'
  | 'framework'
  | 'addon'
  | 'template'
  | 'prompt';

/**
 * Extension lifecycle status
 */
export type ExtensionStatus =
  | 'stable'
  | 'beta'
  | 'experimental'
  | 'deprecated'
  | 'archived';
```

## 2. Platform Compatibility

```typescript
/**
 * Platform compatibility matrix
 */
export interface PlatformCompatibility {
  /**
   * Claude Code / Desktop
   */
  claude?: PlatformSupport;

  /**
   * Factory AI
   */
  factory?: PlatformSupport;

  /**
   * Cursor
   */
  cursor?: PlatformSupport;

  /**
   * GitHub Copilot
   */
  copilot?: PlatformSupport;

  /**
   * Windsurf
   */
  windsurf?: PlatformSupport;

  /**
   * Codex / OpenAI
   */
  codex?: PlatformSupport;

  /**
   * OpenCode
   */
  opencode?: PlatformSupport;

  /**
   * Generic / Warp
   */
  generic?: PlatformSupport;
}

/**
 * Platform support level
 */
export type PlatformSupport =
  | 'full'          // Fully supported with all features
  | 'partial'       // Supported with limitations
  | 'experimental'  // Experimental support
  | 'none';         // Not supported

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  /**
   * Base deployment path template
   *
   * Variables: {platform}, {id}, {type}
   *
   * @example ".{platform}/agents/{id}.md"
   * @example ".{platform}/commands/{id}.md"
   */
  pathTemplate: string;

  /**
   * Platform-specific path overrides
   *
   * @example { "claude": ".claude/agents/api-designer.md" }
   */
  pathOverrides?: Record<string, string>;

  /**
   * Additional files that are part of this extension
   *
   * @example ["references/api-patterns.md", "templates/openapi.yaml"]
   */
  additionalFiles?: string[];

  /**
   * Whether this extension auto-installs
   *
   * @default false
   */
  autoInstall?: boolean;

  /**
   * Whether this is a core extension
   *
   * Core extensions are always available.
   *
   * @default false
   */
  core?: boolean;
}
```

## 3. Type-Specific Metadata

```typescript
/**
 * Discriminated union of type-specific metadata
 */
export type ExtensionMetadata =
  | AgentMetadata
  | CommandMetadata
  | SkillMetadata
  | HookMetadata
  | ToolMetadata
  | MCPServerMetadata
  | FrameworkMetadata
  | AddonMetadata
  | TemplateMetadata
  | PromptMetadata;

/**
 * Agent-specific metadata
 */
export interface AgentMetadata {
  type: 'agent';

  /**
   * Agent role/expertise area
   *
   * @example "API Design and Contract Definition"
   */
  role: string;

  /**
   * Model selection
   *
   * Tier-based selection or specific model override.
   */
  model: {
    /** Tier preference */
    tier: 'haiku' | 'sonnet' | 'opus';
    /** Specific model override (optional) */
    override?: string;
  };

  /**
   * Tools this agent can use
   *
   * @example ["Read", "Write", "Bash"]
   */
  tools: string[];

  /**
   * Agent complexity template
   *
   * @example "simple" | "complex" | "orchestrator"
   */
  template?: string;

  /**
   * Maximum tool count
   */
  maxTools?: number;

  /**
   * Can delegate to other agents
   */
  canDelegate?: boolean;

  /**
   * Read-only mode (no Write/Bash)
   */
  readOnly?: boolean;

  /**
   * Agent workflow steps
   */
  workflow?: string[];

  /**
   * Agent expertise areas
   */
  expertise?: string[];

  /**
   * Agent responsibilities
   */
  responsibilities?: string[];
}

/**
 * Command-specific metadata
 */
export interface CommandMetadata {
  type: 'command';

  /**
   * Command template type
   */
  template: 'utility' | 'transformation' | 'orchestration';

  /**
   * Command arguments
   */
  arguments?: CommandArgument[];

  /**
   * Command options/flags
   */
  options?: CommandOption[];

  /**
   * Argument hint for help display
   *
   * @example "<file-path>"
   * @example "[options] <input>"
   */
  argumentHint?: string;

  /**
   * Allowed tools for this command
   *
   * @example ["Read", "Write", "Grep"]
   */
  allowedTools?: string[];

  /**
   * Model preference
   *
   * @example "sonnet"
   */
  model?: string;

  /**
   * Execution steps
   */
  executionSteps?: string[];

  /**
   * Success criteria
   */
  successCriteria?: string[];
}

/**
 * Command argument definition
 */
export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  default?: string | number | boolean;
  position?: number;
}

/**
 * Command option definition
 */
export interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'boolean' | 'number' | 'array';
  default?: string | boolean | number;
  short?: string;
  long?: string;
}

/**
 * Skill-specific metadata
 */
export interface SkillMetadata {
  type: 'skill';

  /**
   * Natural language trigger phrases
   *
   * @example ["what's next?", "project status", "where are we?"]
   */
  triggerPhrases: string[];

  /**
   * Whether this skill is auto-triggered
   *
   * @default false
   */
  autoTrigger?: boolean;

  /**
   * Auto-trigger conditions
   */
  autoTriggerConditions?: string[];

  /**
   * Tools this skill uses
   */
  tools?: string[];

  /**
   * Reference materials
   */
  references?: SkillReference[];

  /**
   * Input requirements
   */
  inputRequirements?: string[];

  /**
   * Output format description
   */
  outputFormat?: string;
}

/**
 * Skill reference material
 */
export interface SkillReference {
  /** Reference filename */
  filename: string;
  /** Reference description */
  description: string;
  /** Reference content path */
  path: string;
}

/**
 * Hook-specific metadata
 */
export interface HookMetadata {
  type: 'hook';

  /**
   * Hook lifecycle event
   *
   * @example "pre-session" | "post-session" | "pre-command" | "post-command"
   */
  event: HookEvent;

  /**
   * Hook priority (lower = earlier execution)
   *
   * @default 100
   */
  priority?: number;

  /**
   * Whether this hook can modify execution
   *
   * @default false
   */
  canModify?: boolean;

  /**
   * Whether this hook can block execution
   *
   * @default false
   */
  canBlock?: boolean;

  /**
   * Hook configuration schema
   */
  configSchema?: Record<string, unknown>;
}

/**
 * Hook lifecycle events
 */
export type HookEvent =
  | 'pre-session'
  | 'post-session'
  | 'pre-command'
  | 'post-command'
  | 'pre-agent'
  | 'post-agent'
  | 'pre-write'
  | 'post-write'
  | 'pre-bash'
  | 'post-bash';

/**
 * Tool-specific metadata
 */
export interface ToolMetadata {
  type: 'tool';

  /**
   * Tool category
   */
  category: 'core' | 'languages' | 'utilities' | 'custom';

  /**
   * Executable path or command
   */
  executable: string;

  /**
   * Tool verification status
   */
  verificationStatus?: 'verified' | 'unverified';

  /**
   * Last verified date (ISO 8601)
   */
  lastVerified?: string;

  /**
   * Manual page content
   */
  manPage?: string;

  /**
   * Tool aliases
   *
   * @example ["rg", "ripgrep"]
   */
  aliases?: string[];

  /**
   * Related tools
   *
   * @example ["grep", "ag", "ack"]
   */
  relatedTools?: string[];

  /**
   * Platform-specific notes
   */
  platformNotes?: Record<string, string>;

  /**
   * Installation hint
   */
  installHint?: string;
}

/**
 * MCP Server-specific metadata
 */
export interface MCPServerMetadata {
  type: 'mcp-server';

  /**
   * MCP protocol version
   *
   * @example "1.0"
   */
  mcpVersion: string;

  /**
   * Server transport type
   */
  transport: 'stdio' | 'http';

  /**
   * Server port (for HTTP transport)
   */
  port?: number;

  /**
   * Server capabilities
   */
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    sampling: boolean;
    logging: boolean;
  };

  /**
   * Source type
   */
  sourceType: 'cli' | 'api' | 'catalog' | 'nl' | 'extension';

  /**
   * Base command (for CLI source)
   */
  sourceCommand?: string;

  /**
   * API base URL (for API source)
   */
  sourceBaseUrl?: string;

  /**
   * Working directory
   */
  workingDirectory?: string;

  /**
   * Environment variables
   */
  environment?: Record<string, string>;

  /**
   * Tool definitions
   */
  tools?: MCPToolSummary[];

  /**
   * Resource patterns
   */
  resources?: string[];

  /**
   * Available prompts
   */
  prompts?: string[];
}

/**
 * MCP tool summary
 */
export interface MCPToolSummary {
  name: string;
  description: string;
  dangerous: boolean;
}

/**
 * Framework-specific metadata
 */
export interface FrameworkMetadata {
  type: 'framework';

  /**
   * Framework domain
   *
   * @example "sdlc" | "marketing" | "security"
   */
  domain: string;

  /**
   * Included extension IDs
   */
  includes: {
    agents?: string[];
    commands?: string[];
    skills?: string[];
    hooks?: string[];
    templates?: string[];
    prompts?: string[];
  };

  /**
   * Framework configuration schema
   */
  configSchema?: Record<string, unknown>;

  /**
   * Default configuration
   */
  defaultConfig?: Record<string, unknown>;
}

/**
 * Addon-specific metadata
 */
export interface AddonMetadata {
  type: 'addon';

  /**
   * Addon entry points
   */
  entry: {
    agents?: string;
    commands?: string;
    skills?: string;
    hooks?: string;
    templates?: string;
    prompts?: string;
  };

  /**
   * Extensions this addon provides
   */
  provides: {
    agents?: string[];
    commands?: string[];
    skills?: string[];
    hooks?: string[];
    templates?: string[];
    prompts?: string[];
  };
}

/**
 * Template-specific metadata
 */
export interface TemplateMetadata {
  type: 'template';

  /**
   * Template language/format
   *
   * @example "markdown" | "yaml" | "json" | "handlebars"
   */
  format: string;

  /**
   * Template variables
   */
  variables?: TemplateVariable[];

  /**
   * Template sections
   */
  sections?: string[];

  /**
   * Target artifact type
   *
   * @example "use-case" | "architecture-doc" | "test-plan"
   */
  targetArtifact?: string;
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
}

/**
 * Prompt-specific metadata
 */
export interface PromptMetadata {
  type: 'prompt';

  /**
   * Prompt category
   *
   * @example "core" | "reliability" | "agents"
   */
  category: string;

  /**
   * Prompt purpose
   */
  purpose: string;

  /**
   * When to use this prompt
   */
  useWhen: string[];

  /**
   * Prompt variables
   */
  variables?: string[];

  /**
   * Expected context
   */
  requiredContext?: string[];
}
```

## 4. Capability Index Format

```typescript
/**
 * Capability index for semantic search
 *
 * This index enables fast capability-based discovery.
 */
export interface CapabilityIndex {
  /**
   * Index version
   */
  version: string;

  /**
   * Index generation timestamp (ISO 8601)
   */
  generated: string;

  /**
   * Capability to extensions mapping
   *
   * Key: capability name
   * Value: list of extension IDs that provide it
   */
  capabilities: Record<string, string[]>;

  /**
   * Keyword to extensions mapping
   *
   * Key: keyword
   * Value: list of extension IDs tagged with it
   */
  keywords: Record<string, string[]>;

  /**
   * Category to extensions mapping
   *
   * Key: category path
   * Value: list of extension IDs in that category
   */
  categories: Record<string, string[]>;

  /**
   * Type to extensions mapping
   *
   * Key: extension type
   * Value: list of extension IDs of that type
   */
  types: Record<ExtensionType, string[]>;

  /**
   * Platform to extensions mapping
   *
   * Key: platform name
   * Value: list of extension IDs supporting that platform
   */
  platforms: Record<string, string[]>;

  /**
   * Full-text search index (inverted index)
   *
   * Key: term (lowercased)
   * Value: list of extension IDs containing that term
   */
  searchIndex: Record<string, string[]>;
}

/**
 * Capability search query
 */
export interface CapabilityQuery {
  /**
   * Required capabilities (AND)
   */
  requires?: string[];

  /**
   * Optional capabilities (OR)
   */
  prefers?: string[];

  /**
   * Extension type filter
   */
  type?: ExtensionType | ExtensionType[];

  /**
   * Platform filter
   */
  platform?: string;

  /**
   * Keyword filter
   */
  keywords?: string[];

  /**
   * Category filter
   */
  category?: string;

  /**
   * Full-text search
   */
  search?: string;

  /**
   * Status filter
   */
  status?: ExtensionStatus[];
}

/**
 * Capability search result
 */
export interface CapabilitySearchResult {
  /**
   * Matching extensions
   */
  extensions: Extension[];

  /**
   * Result count
   */
  count: number;

  /**
   * Match scores (0-1, higher is better)
   *
   * Key: extension ID
   * Value: relevance score
   */
  scores: Record<string, number>;

  /**
   * Search metadata
   */
  metadata: {
    query: CapabilityQuery;
    executedAt: string;
    executionTimeMs: number;
  };
}
```

## 5. Migration Mapping

```typescript
/**
 * Migration mapping from existing formats to unified schema
 */
export interface MigrationMapping {
  /**
   * Source format identifier
   */
  sourceFormat: string;

  /**
   * Target schema version
   */
  targetVersion: string;

  /**
   * Field mappings
   *
   * Key: target field path (dot-notation)
   * Value: source field path or transform function name
   */
  fieldMappings: Record<string, string>;

  /**
   * Default values for new fields
   */
  defaults: Record<string, unknown>;

  /**
   * Custom transform functions
   */
  transforms?: Record<string, (value: unknown) => unknown>;
}

/**
 * Example migration mappings
 */
export const MIGRATION_MAPPINGS: Record<string, MigrationMapping> = {
  /**
   * Agent frontmatter → Extension
   */
  'agent-frontmatter': {
    sourceFormat: 'agent-frontmatter-v1',
    targetVersion: '1.0.0',
    fieldMappings: {
      'id': 'name',  // Convert name to kebab-case
      'name': 'name',
      'description': 'description',
      'version': 'version',
      'metadata.type': () => 'agent',
      'metadata.role': 'description',
      'metadata.model.tier': 'model',
      'metadata.tools': 'tools',
      'category': 'category',
      'capabilities': 'capabilities',
      'keywords': 'keywords',
    },
    defaults: {
      'platforms': {
        'claude': 'full',
        'factory': 'full',
        'generic': 'full',
      },
      'deployment.pathTemplate': '.{platform}/agents/{id}.md',
      'metadata.canDelegate': false,
      'metadata.readOnly': false,
    },
  },

  /**
   * Command frontmatter → Extension
   */
  'command-frontmatter': {
    sourceFormat: 'command-frontmatter-v1',
    targetVersion: '1.0.0',
    fieldMappings: {
      'id': 'name',
      'name': 'name',
      'description': 'description',
      'version': () => '1.0.0',  // Default version
      'metadata.type': () => 'command',
      'metadata.argumentHint': 'argument-hint',
      'metadata.allowedTools': 'allowed-tools',
      'metadata.model': 'model',
      'category': 'category',
    },
    defaults: {
      'platforms': {
        'claude': 'full',
        'factory': 'full',
      },
      'deployment.pathTemplate': '.{platform}/commands/{id}.md',
      'capabilities': [],
      'keywords': [],
    },
  },

  /**
   * Manifest.json → Extension
   */
  'manifest-v1': {
    sourceFormat: 'manifest-v1',
    targetVersion: '1.0.0',
    fieldMappings: {
      'id': 'id',
      'type': 'type',
      'name': 'name',
      'description': 'description',
      'version': 'version',
      'keywords': 'keywords',
      'author': 'author',
      'license': 'license',
      'repository': 'repository',
      'requires': 'requires',
      'capabilities': 'capabilities',
    },
    defaults: {
      'platforms': {
        'claude': 'full',
      },
      'deployment.core': false,
      'deployment.autoInstall': false,
    },
  },
};
```

## 6. Validation Rules

```typescript
/**
 * Extension validation rules
 */
export interface ValidationRules {
  /**
   * Required fields for all extensions
   */
  required: string[];

  /**
   * Field type constraints
   */
  types: Record<string, string>;

  /**
   * Field format patterns (regex)
   */
  patterns: Record<string, string>;

  /**
   * Field value constraints
   */
  constraints: Record<string, Constraint>;

  /**
   * Cross-field validation rules
   */
  crossFieldRules: CrossFieldRule[];

  /**
   * Type-specific validation rules
   */
  typeSpecificRules: Record<ExtensionType, ValidationRules>;
}

/**
 * Field constraint definition
 */
export interface Constraint {
  /** Minimum value (for numbers/lengths) */
  min?: number;
  /** Maximum value (for numbers/lengths) */
  max?: number;
  /** Allowed values (enum) */
  enum?: unknown[];
  /** Custom validation function */
  validate?: (value: unknown) => boolean;
  /** Error message */
  message: string;
}

/**
 * Cross-field validation rule
 */
export interface CrossFieldRule {
  /** Rule description */
  description: string;
  /** Fields involved */
  fields: string[];
  /** Validation function */
  validate: (extension: Extension) => boolean;
  /** Error message */
  message: string;
}

/**
 * Validation result
 */
export interface ExtensionValidationResult {
  /** Whether extension is valid */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];

  /** Validation warnings */
  warnings: ValidationWarning[];

  /** Extension being validated */
  extension: Extension;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error type */
  type: 'required' | 'type' | 'format' | 'constraint' | 'cross-field';

  /** Field path */
  field: string;

  /** Error message */
  message: string;

  /** Current value */
  value?: unknown;

  /** Expected value/format */
  expected?: unknown;

  /** Suggestion for fix */
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  type: 'deprecated' | 'missing-optional' | 'best-practice';

  /** Field path */
  field: string;

  /** Warning message */
  message: string;

  /** Recommendation */
  recommendation?: string;
}

/**
 * Standard validation rules
 */
export const VALIDATION_RULES: ValidationRules = {
  required: [
    'id',
    'type',
    'name',
    'description',
    'version',
    'capabilities',
    'keywords',
    'platforms',
    'deployment',
    'metadata',
  ],

  types: {
    'id': 'string',
    'type': 'ExtensionType',
    'name': 'string',
    'description': 'string',
    'version': 'string',
    'capabilities': 'string[]',
    'keywords': 'string[]',
    'platforms': 'PlatformCompatibility',
    'deployment': 'DeploymentConfig',
    'metadata': 'ExtensionMetadata',
  },

  patterns: {
    'id': '^[a-z0-9]+(-[a-z0-9]+)*$',  // kebab-case
    'version': '^\\d+\\.\\d+\\.\\d+$|^\\d{4}\\.\\d{1,2}\\.\\d+$',  // semver or CalVer
  },

  constraints: {
    'id': {
      min: 2,
      max: 64,
      message: 'ID must be 2-64 characters in kebab-case',
    },
    'name': {
      min: 3,
      max: 128,
      message: 'Name must be 3-128 characters',
    },
    'description': {
      min: 10,
      max: 500,
      message: 'Description must be 10-500 characters',
    },
    'capabilities': {
      min: 1,
      message: 'At least one capability required',
    },
    'keywords': {
      min: 1,
      message: 'At least one keyword required',
    },
  },

  crossFieldRules: [
    {
      description: 'Metadata type must match extension type',
      fields: ['type', 'metadata.type'],
      validate: (ext) => ext.type === ext.metadata.type,
      message: 'Extension type and metadata.type must match',
    },
    {
      description: 'Deployment path must include {id} variable',
      fields: ['deployment.pathTemplate'],
      validate: (ext) => ext.deployment.pathTemplate.includes('{id}'),
      message: 'Deployment path template must include {id} variable',
    },
    {
      description: 'At least one platform must be supported',
      fields: ['platforms'],
      validate: (ext) => Object.values(ext.platforms).some(s => s !== 'none'),
      message: 'Extension must support at least one platform',
    },
  ],

  typeSpecificRules: {
    'agent': {
      required: ['metadata.role', 'metadata.model', 'metadata.tools'],
      types: {},
      patterns: {},
      constraints: {
        'metadata.tools': {
          min: 1,
          message: 'Agents must have at least one tool',
        },
      },
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'command': {
      required: ['metadata.template'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'skill': {
      required: ['metadata.triggerPhrases'],
      types: {},
      patterns: {},
      constraints: {
        'metadata.triggerPhrases': {
          min: 1,
          message: 'Skills must have at least one trigger phrase',
        },
      },
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'hook': {
      required: ['metadata.event'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'tool': {
      required: ['metadata.category', 'metadata.executable'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'mcp-server': {
      required: ['metadata.mcpVersion', 'metadata.transport', 'metadata.capabilities'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'framework': {
      required: ['metadata.domain', 'metadata.includes'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'addon': {
      required: ['metadata.entry', 'metadata.provides'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'template': {
      required: ['metadata.format'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
    'prompt': {
      required: ['metadata.category', 'metadata.purpose'],
      types: {},
      patterns: {},
      constraints: {},
      crossFieldRules: [],
      typeSpecificRules: {},
    },
  },
};
```

## 7. Usage Examples

### Creating an Agent Extension

```typescript
const apiDesigner: Extension = {
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Defines API styles, endpoints, and data contracts that are simple, stable, and testable.',
  version: '1.0.0',

  capabilities: [
    'api-design',
    'interface-contracts',
    'rest',
    'versioning',
    'compatibility',
  ],

  keywords: [
    'api',
    'rest',
    'contracts',
    'interfaces',
    'versioning',
    'sdlc',
    'architecture',
  ],

  category: 'sdlc/architecture',

  platforms: {
    claude: 'full',
    factory: 'full',
    cursor: 'full',
    generic: 'full',
  },

  deployment: {
    pathTemplate: '.{platform}/agents/{id}.md',
    core: false,
    autoInstall: false,
  },

  requires: ['sdlc-complete'],

  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: {
      tier: 'sonnet',
    },
    tools: ['Read', 'Write', 'Glob', 'Grep'],
    template: 'complex',
    canDelegate: true,
    readOnly: false,
    workflow: [
      'Define interface contracts',
      'Specify data models',
      'Design error handling',
      'Define versioning strategy',
      'Review with stakeholders',
    ],
    expertise: [
      'REST API design',
      'OpenAPI/Swagger specifications',
      'Data contract modeling',
      'API versioning strategies',
      'Performance optimization',
    ],
    responsibilities: [
      'Author interface and data contract cards',
      'Define error models, versioning, and compatibility policy',
      'Review performance, security, and observability for interfaces',
      'Coordinate with Test Engineer on integration tests',
    ],
  },
};
```

### Creating a Command Extension

```typescript
const mentionWire: Extension = {
  id: 'mention-wire',
  type: 'command',
  name: 'Mention Wire',
  description: 'Wire traceability @-mentions throughout the codebase to create bidirectional links between artifacts.',
  version: '1.0.0',

  capabilities: [
    'traceability',
    '@-mention',
    'validation',
    'bidirectional-linking',
  ],

  keywords: [
    'traceability',
    'mentions',
    'links',
    'validation',
    'sdlc',
  ],

  category: 'sdlc/traceability',

  platforms: {
    claude: 'full',
    factory: 'full',
    cursor: 'partial',
  },

  deployment: {
    pathTemplate: '.{platform}/commands/{id}.md',
    core: false,
    autoInstall: false,
  },

  requires: ['aiwg-utils'],

  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '[--validate] [--report] [path]',
    allowedTools: ['Read', 'Write', 'Glob', 'Grep'],
    model: 'sonnet',
    arguments: [
      {
        name: 'path',
        description: 'Path to wire (defaults to current directory)',
        required: false,
        type: 'string',
        default: '.',
      },
    ],
    options: [
      {
        name: 'validate',
        description: 'Validate existing @-mentions only',
        type: 'boolean',
        default: false,
        long: 'validate',
      },
      {
        name: 'report',
        description: 'Generate traceability report',
        type: 'boolean',
        default: false,
        long: 'report',
      },
    ],
    executionSteps: [
      'Scan for source files',
      'Parse @-mentions',
      'Validate target existence',
      'Wire bidirectional links',
      'Generate report if requested',
    ],
  },
};
```

### Creating a Skill Extension

```typescript
const projectAwareness: Extension = {
  id: 'project-awareness',
  type: 'skill',
  name: 'Project Awareness',
  description: 'Comprehensive project context detection and state awareness.',
  version: '1.0.0',

  capabilities: [
    'context-awareness',
    'project-detection',
    'phase-tracking',
    'team-detection',
  ],

  keywords: [
    'project',
    'context',
    'awareness',
    'status',
    'phase',
    'sdlc',
  ],

  category: 'sdlc/management',

  platforms: {
    claude: 'full',
    factory: 'full',
    cursor: 'experimental',
  },

  deployment: {
    pathTemplate: '.{platform}/skills/{id}/SKILL.md',
    additionalFiles: ['references/phase-guide.md'],
    core: true,
    autoInstall: true,
  },

  requires: ['aiwg-utils'],

  metadata: {
    type: 'skill',
    triggerPhrases: [
      'what project is this',
      'project context',
      'what phase are we in',
      'where are we?',
      'what\'s next?',
      'project status',
    ],
    autoTrigger: true,
    autoTriggerConditions: ['session-start'],
    tools: ['Read', 'Bash', 'Glob'],
    references: [
      {
        filename: 'phase-guide.md',
        description: 'SDLC phase descriptions and gate criteria',
        path: 'references/phase-guide.md',
      },
    ],
  },
};
```

## 8. Implementation Plan

### Phase 1: Core Schema (Week 1)

1. Define TypeScript interfaces in `src/extensions/types.ts`
2. Create validation functions in `src/extensions/validate.ts`
3. Implement migration utilities in `src/extensions/migrate.ts`
4. Write unit tests for validation and migration

### Phase 2: Index System (Week 2)

1. Implement capability indexer in `src/extensions/index.ts`
2. Create search functionality in `src/extensions/search.ts`
3. Add index persistence and refresh logic
4. Test search performance with large extension sets

### Phase 3: Integration (Week 3)

1. Update all smiths to generate unified schema
2. Migrate existing manifests to new format
3. Update CLI commands to use new schema
4. Create backward compatibility layer

### Phase 4: Help System (Week 4)

1. Implement help generator in `src/extensions/help.ts`
2. Create interactive extension browser
3. Add semantic search CLI command
4. Generate comprehensive documentation

## 9. Benefits

### For Users

- **Unified Discovery**: Single search across all extension types
- **Better Help**: Rich metadata enables contextual help
- **Semantic Search**: Find extensions by capability, not just name
- **Dependency Awareness**: Clear understanding of requirements

### For Developers

- **Type Safety**: Strong TypeScript types for all extensions
- **Validation**: Catch errors before deployment
- **Migration**: Easy upgrade path from old formats
- **Consistency**: Single source of truth for all extensions

### For the System

- **Performance**: Indexed search is fast
- **Extensibility**: Easy to add new extension types
- **Backward Compatibility**: Migration layer preserves existing extensions
- **Platform Agnostic**: Works across all AI platforms

## 10. Future Enhancements

### Version 2.0

- **Dependency Resolution**: Automatic dependency installation
- **Version Constraints**: Semver-based dependency ranges
- **Extension Marketplace**: Registry and publication system
- **Usage Analytics**: Track extension popularity and effectiveness

### Version 3.0

- **Dynamic Loading**: Hot-reload extensions without restart
- **Sandboxing**: Security isolation for untrusted extensions
- **Extension Composition**: Combine extensions into workflows
- **AI-Powered Discovery**: LLM-based semantic search

## Conclusion

This unified extension schema provides a solid foundation for AIWG's extensibility system. By consolidating all extension types into a single, well-typed schema with rich metadata, we enable:

- Dynamic discovery and semantic search
- Comprehensive help and documentation generation
- Type-safe development with clear validation rules
- Backward compatibility with existing formats
- Future extensibility for new extension types

The schema balances flexibility (type-specific metadata) with consistency (common core fields), enabling both current needs and future growth.
