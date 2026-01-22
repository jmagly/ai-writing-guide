# Unified Extension Schema - Quick Reference

**Version:** 1.0.0
**Status:** Draft
**Created:** 2026-01-22

## Overview

The Unified Extension Schema provides a single type system for all AIWG extensions:

- **Agents** - Specialized AI personas with defined roles and tools
- **Commands** - Slash commands for workflow automation
- **Skills** - Natural language-triggered capabilities
- **Hooks** - Lifecycle event handlers
- **Tools** - System tools and utilities
- **MCP Servers** - Model Context Protocol servers
- **Frameworks** - Complete workflow systems (SDLC, Marketing)
- **Addons** - Extension packages
- **Templates** - Reusable document templates
- **Prompts** - Importable prompt snippets

## Key Features

1. **Type-Safe**: TypeScript discriminated unions for each extension type
2. **Discoverable**: Capability-based search and semantic indexing
3. **Platform-Aware**: Multi-platform deployment metadata
4. **Dependency Management**: Express requirements, recommendations, conflicts
5. **Backward Compatible**: Migration layer for existing formats
6. **Validated**: Clear validation rules and error messages

## Core Structure

```typescript
interface Extension {
  // Identity
  id: string;                      // "api-designer"
  type: ExtensionType;             // "agent" | "command" | "skill" | ...
  name: string;                    // "API Designer"
  description: string;             // Brief description
  version: string;                 // "1.0.0" or "2026.1.5"

  // Discovery
  capabilities: string[];          // ["api-design", "rest", ...]
  keywords: string[];              // ["sdlc", "architecture", ...]
  category?: string;               // "sdlc/architecture"

  // Platforms
  platforms: PlatformCompatibility;
  deployment: DeploymentConfig;

  // Dependencies
  requires?: string[];             // Required extensions
  recommends?: string[];           // Optional enhancements
  conflicts?: string[];            // Conflicting extensions

  // Type-Specific
  metadata: ExtensionMetadata;     // Discriminated by `type`

  // Optional
  author?: string;
  license?: string;
  status?: ExtensionStatus;
  // ... more metadata
}
```

## Extension Types

### Agent

```typescript
{
  type: 'agent',
  metadata: {
    type: 'agent',
    role: string,
    model: {
      tier: 'haiku' | 'sonnet' | 'opus',
      override?: string
    },
    tools: string[],
    template?: string,
    canDelegate?: boolean,
    readOnly?: boolean,
    workflow?: string[],
    expertise?: string[],
    responsibilities?: string[]
  }
}
```

**Example:**
```typescript
const apiDesigner: Extension = {
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Defines API styles, endpoints, and data contracts.',
  version: '1.0.0',
  capabilities: ['api-design', 'interface-contracts', 'rest'],
  keywords: ['api', 'rest', 'contracts', 'sdlc'],
  platforms: { claude: 'full', factory: 'full' },
  deployment: { pathTemplate: '.{platform}/agents/{id}.md' },
  metadata: {
    type: 'agent',
    role: 'API Design and Contract Definition',
    model: { tier: 'sonnet' },
    tools: ['Read', 'Write', 'Glob', 'Grep'],
    canDelegate: true,
    responsibilities: [
      'Author interface and data contract cards',
      'Define error models, versioning, and compatibility policy'
    ]
  }
};
```

### Command

```typescript
{
  type: 'command',
  metadata: {
    type: 'command',
    template: 'utility' | 'transformation' | 'orchestration',
    arguments?: CommandArgument[],
    options?: CommandOption[],
    argumentHint?: string,
    allowedTools?: string[],
    model?: string,
    executionSteps?: string[]
  }
}
```

**Example:**
```typescript
const mentionWire: Extension = {
  id: 'mention-wire',
  type: 'command',
  name: 'Mention Wire',
  description: 'Wire traceability @-mentions throughout codebase.',
  version: '1.0.0',
  capabilities: ['traceability', '@-mention', 'validation'],
  keywords: ['traceability', 'mentions', 'links'],
  platforms: { claude: 'full', factory: 'full' },
  deployment: { pathTemplate: '.{platform}/commands/{id}.md' },
  metadata: {
    type: 'command',
    template: 'utility',
    argumentHint: '[--validate] [path]',
    allowedTools: ['Read', 'Write', 'Glob', 'Grep'],
    options: [
      {
        name: 'validate',
        description: 'Validate existing @-mentions only',
        type: 'boolean',
        long: 'validate'
      }
    ]
  }
};
```

### Skill

```typescript
{
  type: 'skill',
  metadata: {
    type: 'skill',
    triggerPhrases: string[],
    autoTrigger?: boolean,
    autoTriggerConditions?: string[],
    tools?: string[],
    references?: SkillReference[]
  }
}
```

**Example:**
```typescript
const projectAwareness: Extension = {
  id: 'project-awareness',
  type: 'skill',
  name: 'Project Awareness',
  description: 'Comprehensive project context detection and state awareness.',
  version: '1.0.0',
  capabilities: ['context-awareness', 'project-detection'],
  keywords: ['project', 'context', 'awareness'],
  platforms: { claude: 'full', factory: 'full' },
  deployment: {
    pathTemplate: '.{platform}/skills/{id}/SKILL.md',
    additionalFiles: ['references/phase-guide.md'],
    core: true,
    autoInstall: true
  },
  metadata: {
    type: 'skill',
    triggerPhrases: [
      'what project is this',
      'where are we?',
      'what\'s next?'
    ],
    autoTrigger: true,
    autoTriggerConditions: ['session-start']
  }
};
```

### Hook

```typescript
{
  type: 'hook',
  metadata: {
    type: 'hook',
    event: HookEvent,
    priority?: number,
    canModify?: boolean,
    canBlock?: boolean
  }
}
```

**Events:** `pre-session`, `post-session`, `pre-command`, `post-command`, `pre-agent`, `post-agent`, `pre-write`, `post-write`, `pre-bash`, `post-bash`

### Tool

```typescript
{
  type: 'tool',
  metadata: {
    type: 'tool',
    category: 'core' | 'languages' | 'utilities' | 'custom',
    executable: string,
    aliases?: string[],
    relatedTools?: string[],
    installHint?: string
  }
}
```

### MCP Server

```typescript
{
  type: 'mcp-server',
  metadata: {
    type: 'mcp-server',
    mcpVersion: string,
    transport: 'stdio' | 'http',
    capabilities: {
      tools: boolean,
      resources: boolean,
      prompts: boolean
    },
    sourceType: 'cli' | 'api' | 'catalog'
  }
}
```

## Platform Compatibility

```typescript
interface PlatformCompatibility {
  claude?: 'full' | 'partial' | 'experimental' | 'none';
  factory?: 'full' | 'partial' | 'experimental' | 'none';
  cursor?: 'full' | 'partial' | 'experimental' | 'none';
  copilot?: 'full' | 'partial' | 'experimental' | 'none';
  windsurf?: 'full' | 'partial' | 'experimental' | 'none';
  codex?: 'full' | 'partial' | 'experimental' | 'none';
  opencode?: 'full' | 'partial' | 'experimental' | 'none';
  generic?: 'full' | 'partial' | 'experimental' | 'none';
}
```

**Example:**
```typescript
platforms: {
  claude: 'full',        // Fully supported
  factory: 'full',       // Fully supported
  cursor: 'partial',     // Partial support
  windsurf: 'experimental' // Experimental
}
```

## Deployment Configuration

```typescript
interface DeploymentConfig {
  pathTemplate: string;                    // ".{platform}/agents/{id}.md"
  pathOverrides?: Record<string, string>;  // Platform-specific paths
  additionalFiles?: string[];              // Supporting files
  autoInstall?: boolean;                   // Auto-install on framework load
  core?: boolean;                          // Core extension (always available)
}
```

**Path Template Variables:**
- `{platform}` - Platform name (claude, factory, etc.)
- `{id}` - Extension ID
- `{type}` - Extension type

**Example:**
```typescript
deployment: {
  pathTemplate: '.{platform}/agents/{id}.md',
  pathOverrides: {
    'windsurf': 'AGENTS.md#api-designer'  // Windsurf uses aggregated file
  },
  additionalFiles: ['templates/openapi.yaml'],
  core: false,
  autoInstall: false
}
```

## Capability Search

```typescript
interface CapabilityQuery {
  requires?: string[];    // All required (AND)
  prefers?: string[];     // Any preferred (OR)
  type?: ExtensionType | ExtensionType[];
  platform?: string;
  keywords?: string[];
  category?: string;
  search?: string;        // Full-text search
  status?: ExtensionStatus[];
}
```

**Example Queries:**

```typescript
// Find all API design agents
{
  type: 'agent',
  capabilities: ['api-design']
}

// Find traceability tools for Claude
{
  requires: ['traceability'],
  platform: 'claude'
}

// Find SDLC commands
{
  type: 'command',
  category: 'sdlc'
}

// Full-text search
{
  search: 'test coverage mutation'
}
```

## Validation Rules

### Required Fields

All extensions must have:
- `id` (kebab-case, 2-64 chars)
- `type` (valid ExtensionType)
- `name` (3-128 chars)
- `description` (10-500 chars)
- `version` (semver or CalVer)
- `capabilities` (at least 1)
- `keywords` (at least 1)
- `platforms` (at least 1 non-'none')
- `deployment`
- `metadata` (matching type)

### Type-Specific Requirements

**Agent:**
- `metadata.role`
- `metadata.model`
- `metadata.tools` (at least 1)

**Command:**
- `metadata.template`

**Skill:**
- `metadata.triggerPhrases` (at least 1)

**Hook:**
- `metadata.event`

**Tool:**
- `metadata.category`
- `metadata.executable`

**MCP Server:**
- `metadata.mcpVersion`
- `metadata.transport`
- `metadata.capabilities`

### Format Constraints

**ID:** `^[a-z0-9]+(-[a-z0-9]+)*$` (kebab-case)

**Version:** `^\d+\.\d+\.\d+$` (semver) or `^\d{4}\.\d{1,2}\.\d+$` (CalVer)

### Cross-Field Rules

1. `metadata.type` must match `type`
2. `deployment.pathTemplate` must include `{id}`
3. At least one platform must be supported

## Migration Guide

### From Agent Frontmatter

**Before:**
```yaml
---
name: API Designer
description: Defines API styles and endpoints
model: sonnet
tools: Read, Write, Glob, Grep
category: sdlc
---
```

**After:**
```typescript
{
  id: 'api-designer',
  type: 'agent',
  name: 'API Designer',
  description: 'Defines API styles and endpoints',
  version: '1.0.0',
  capabilities: ['api-design'],
  keywords: ['api', 'sdlc'],
  platforms: { claude: 'full', factory: 'full' },
  deployment: { pathTemplate: '.{platform}/agents/{id}.md' },
  metadata: {
    type: 'agent',
    role: 'API Design',
    model: { tier: 'sonnet' },
    tools: ['Read', 'Write', 'Glob', 'Grep']
  }
}
```

### From Manifest.json

**Before:**
```json
{
  "id": "aiwg-utils",
  "type": "addon",
  "name": "AIWG Utilities",
  "version": "1.5.0",
  "commands": ["mention-wire", "workspace-reset"],
  "agents": ["context-regenerator"]
}
```

**After:**
```typescript
{
  id: 'aiwg-utils',
  type: 'addon',
  name: 'AIWG Utilities',
  description: 'Core meta-utilities for AIWG management',
  version: '1.5.0',
  capabilities: ['context-management', 'workspace-utilities'],
  keywords: ['aiwg', 'utilities', 'management'],
  platforms: { claude: 'full', factory: 'full' },
  deployment: {
    pathTemplate: 'addons/{id}/',
    core: true,
    autoInstall: true
  },
  metadata: {
    type: 'addon',
    entry: {
      commands: 'commands/',
      agents: 'agents/'
    },
    provides: {
      commands: ['mention-wire', 'workspace-reset'],
      agents: ['context-regenerator']
    }
  }
}
```

## Type Guards

Use TypeScript type guards for safe narrowing:

```typescript
import { Extension, isAgentExtension, isCommandExtension } from './types';

function processExtension(ext: Extension) {
  if (isAgentExtension(ext)) {
    // ext.metadata is AgentMetadata
    console.log(`Agent role: ${ext.metadata.role}`);
    console.log(`Tools: ${ext.metadata.tools.join(', ')}`);
  } else if (isCommandExtension(ext)) {
    // ext.metadata is CommandMetadata
    console.log(`Template: ${ext.metadata.template}`);
  }
}
```

## Index Structure

The capability index enables fast searches:

```typescript
interface CapabilityIndex {
  capabilities: Record<string, string[]>;  // "api-design" → ["api-designer", ...]
  keywords: Record<string, string[]>;      // "sdlc" → ["api-designer", ...]
  categories: Record<string, string[]>;    // "sdlc/architecture" → [...]
  types: Record<ExtensionType, string[]>;  // "agent" → ["api-designer", ...]
  platforms: Record<string, string[]>;     // "claude" → ["api-designer", ...]
  searchIndex: Record<string, string[]>;   // "interface" → ["api-designer", ...]
}
```

## Best Practices

### Naming

- **IDs**: kebab-case, descriptive (`api-designer`, not `ad`)
- **Names**: Title Case, user-friendly (`API Designer`)
- **Capabilities**: lowercase, hyphenated (`api-design`)
- **Keywords**: lowercase, single words or hyphenated

### Capabilities

- Be specific: `api-design` better than `design`
- Use domain terms: `rest`, `graphql`, `openapi`
- Include action verbs: `validate`, `generate`, `analyze`
- Group related: `traceability`, `@-mention`, `validation`

### Keywords

- Include domain: `sdlc`, `security`, `testing`
- Add technologies: `typescript`, `python`, `docker`
- Consider search terms: `workflow`, `automation`, `quality`

### Dependencies

- **requires**: Only hard dependencies
- **recommends**: Optional enhancements
- **conflicts**: Known incompatibilities
- **systemDependencies**: External tools (`gh`, `jq`)

### Platform Support

- Mark `full` only if all features work
- Use `partial` for limited functionality
- Mark `experimental` for untested platforms
- Document limitations in platform notes

### Documentation

- Keep descriptions brief (1-2 sentences)
- Add comprehensive docs in `documentation` field
- Link to research compliance where applicable
- Include examples in README files

## References

- @.aiwg/architecture/unified-extension-schema.md - Full specification
- @src/extensions/types.ts - TypeScript implementation
- @src/extensions/validate.ts - Validation utilities
- @src/extensions/search.ts - Search functionality
- @src/extensions/migrate.ts - Migration utilities

## Quick Start

1. **Define Extension**:
   ```typescript
   const myExtension: Extension = { ... };
   ```

2. **Validate**:
   ```typescript
   import { validate } from './validate';
   const result = validate(myExtension);
   ```

3. **Index**:
   ```typescript
   import { buildIndex } from './index';
   const index = buildIndex([myExtension]);
   ```

4. **Search**:
   ```typescript
   import { search } from './search';
   const results = search(index, { requires: ['api-design'] });
   ```

5. **Deploy**:
   ```typescript
   import { deploy } from './deploy';
   await deploy(myExtension, { platform: 'claude' });
   ```
