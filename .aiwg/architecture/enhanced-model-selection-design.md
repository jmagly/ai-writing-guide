# Enhanced Model Selection System - Architectural Design

**Version**: 1.0.0
**Status**: Proposed
**Author**: Architecture Designer Agent
**Date**: 2025-12-12

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Component Design](#3-component-design)
4. [Data Model](#4-data-model)
5. [CLI Specification](#5-cli-specification)
6. [SDK/DevKit API](#6-sdkdevkit-api)
7. [Migration Path](#7-migration-path)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

## 1. Executive Summary

The Enhanced Model Selection System introduces a tiered approach to model assignment for AIWG agents. Instead of directly specifying model names (`opus`, `sonnet`, `haiku`), users work with quality tiers (`economy`, `standard`, `premium`, `max-quality`) that abstract provider-specific model identifiers.

### Key Capabilities

- **Tier-Based Deployment**: `aiwg use sdlc --model-tier max-quality`
- **Per-Agent Overrides**: Frontmatter `model-tier` and `model-override` fields
- **Hierarchical Configuration**: Global -> User -> Project -> Agent precedence
- **Cost Metadata**: Estimated cost per tier for budget planning
- **Capability Queries**: Check model capabilities programmatically

---

## 2. Architecture Overview

```text
                                    Configuration Hierarchy
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │   AIWG       │   │   User       │   │   Project    │   │   Agent          │ │
│  │   Defaults   │ < │   Config     │ < │   Config     │ < │   Frontmatter    │ │
│  │              │   │              │   │              │   │                  │ │
│  │ ~/.local/    │   │ ~/.config/   │   │ ./models.    │   │ model-tier:      │ │
│  │ share/aiwg/  │   │ aiwg/        │   │ json         │   │ model-override:  │ │
│  │ config/      │   │ models.json  │   │              │   │                  │ │
│  │ models.json  │   │              │   │              │   │                  │ │
│  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────────┘ │
│         │                  │                  │                    │           │
│         └──────────────────┴──────────────────┴────────────────────┘           │
│                                      │                                          │
│                             ┌────────▼────────┐                                │
│                             │  Model Resolver │                                │
│                             │                 │                                │
│                             │  - Merge configs│                                │
│                             │  - Apply tiers  │                                │
│                             │  - Map to model │                                │
│                             └────────┬────────┘                                │
│                                      │                                          │
│         ┌────────────────────────────┼────────────────────────────┐            │
│         ▼                            ▼                            ▼            │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐         │
│  │   Claude    │            │   OpenAI    │            │   Factory   │         │
│  │   Provider  │            │   Provider  │            │   Provider  │         │
│  │             │            │             │            │             │         │
│  │ opus-4.5    │            │ gpt-5.2     │            │ (proxied)   │         │
│  │ sonnet-4.5  │            │ gpt-5       │            │             │         │
│  │ haiku-3.5   │            │ gpt-4o-mini │            │             │         │
│  └─────────────┘            └─────────────┘            └─────────────┘         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```text
User Request                    Processing                         Output
─────────────                   ──────────                         ──────

aiwg use sdlc              ┌─────────────────┐
  --model-tier             │ 1. Parse CLI    │
  max-quality         ────▶│    arguments    │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ 2. Load config  │
                           │    hierarchy    │
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ 3. Resolve tier │
                           │    to models    │◀─── Provider mappings
                           └────────┬────────┘
                                    │
                           ┌────────▼────────┐
                           │ 4. Process each │
                           │    agent file   │
For each agent:            └────────┬────────┘
  - Read frontmatter               │
  - Check agent override           │
  - Apply tier mapping             │
  - Transform content     ┌────────▼────────┐     .claude/agents/
  - Write to target      │ 5. Deploy agents │────▶ agent-name.md
                           └─────────────────┘     with resolved models
```

---

## 3. Component Design

### 3.1 Model Tier Definitions

| Tier | Purpose | Characteristics | Cost Profile |
|------|---------|-----------------|--------------|
| `economy` | Development, testing, simple tasks | Fastest, lowest cost, adequate quality | $ |
| `standard` | General production use | Balanced speed/quality/cost | $$ |
| `premium` | Complex reasoning, critical paths | Higher quality, slower | $$$ |
| `max-quality` | Architecture decisions, security reviews | Best available, highest cost | $$$$ |

### 3.2 Role-to-Tier Mapping

The existing role system (`reasoning`, `coding`, `efficiency`) maps to tiers:

| Tier | Reasoning Model | Coding Model | Efficiency Model |
|------|-----------------|--------------|------------------|
| `economy` | efficiency | efficiency | efficiency |
| `standard` | coding | coding | efficiency |
| `premium` | reasoning | coding | coding |
| `max-quality` | reasoning | reasoning | reasoning |

### 3.3 Model Resolver Component

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         ModelResolver                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Inputs:                                                           │
│  ├── CLI options (--model-tier, --model, --provider)              │
│  ├── Project config (./models.json)                               │
│  ├── User config (~/.config/aiwg/models.json)                     │
│  ├── AIWG defaults (built-in models.json)                         │
│  └── Agent frontmatter (model-tier, model-override)               │
│                                                                     │
│  Processing:                                                        │
│  1. Merge configurations (later overrides earlier)                 │
│  2. Determine effective tier:                                       │
│     - CLI --model-tier takes precedence                           │
│     - Then agent model-tier frontmatter                           │
│     - Then project default-tier                                   │
│     - Then user default-tier                                      │
│     - Finally AIWG default (standard)                             │
│  3. Check for agent model-override (bypasses tier)                │
│  4. Map tier + role to concrete model identifier                  │
│  5. Return resolved model for provider                            │
│                                                                     │
│  Outputs:                                                          │
│  └── Concrete model identifier (e.g., "claude-opus-4-5-20251101") │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Agent Frontmatter Extensions

Current format:
```yaml
---
name: Architecture Designer
description: Designs system architectures
model: opus
tools: Read, Write, Bash, Glob, Grep
---
```

Extended format:
```yaml
---
name: Architecture Designer
description: Designs system architectures
model: opus                      # Legacy role hint (backwards compatible)
model-tier: premium              # Explicit tier assignment
model-override: null             # Direct model override (bypasses tier)
model-requirements:              # Capability requirements (Phase 2)
  - long-context
  - reasoning
  - code-generation
tools: Read, Write, Bash, Glob, Grep
orchestration: true
category: sdlc-setup
---
```

### 3.5 Provider Abstraction Layer

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      Provider Registry                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  claude:                                                           │
│  ├── economy:     claude-haiku-3-5                                │
│  ├── standard:    claude-sonnet-4-5-20250929                      │
│  ├── premium:     claude-opus-4-1-20250805                        │
│  └── max-quality: claude-opus-4-5-20251101                        │
│                                                                     │
│  openai:                                                           │
│  ├── economy:     gpt-4o-mini                                     │
│  ├── standard:    gpt-4o                                          │
│  ├── premium:     gpt-5                                           │
│  └── max-quality: gpt-5.2                                         │
│                                                                     │
│  factory:                                                          │
│  ├── (inherits claude mappings)                                   │
│  └── Supports all Claude models via proxy                         │
│                                                                     │
│  copilot:                                                          │
│  ├── economy:     gpt-4o-mini                                     │
│  ├── standard:    gpt-4o                                          │
│  ├── premium:     o3-mini (when available)                        │
│  └── max-quality: claude-sonnet-4 (via GitHub integration)        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Model

### 4.1 Enhanced models.json Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/jmagly/ai-writing-guide/models-config-v2.json",
  "title": "AIWG Model Configuration v2",
  "description": "Enhanced model configuration with tier system",
  "version": "2.0.0",
  "lastUpdated": "2025-12-12",

  "defaults": {
    "tier": "standard",
    "provider": "claude"
  },

  "tiers": {
    "economy": {
      "description": "Fastest, lowest cost. For development, testing, simple tasks.",
      "costMultiplier": 0.1,
      "roleMapping": {
        "reasoning": "efficiency",
        "coding": "efficiency",
        "efficiency": "efficiency"
      }
    },
    "standard": {
      "description": "Balanced speed, quality, cost. General production use.",
      "costMultiplier": 1.0,
      "roleMapping": {
        "reasoning": "coding",
        "coding": "coding",
        "efficiency": "efficiency"
      }
    },
    "premium": {
      "description": "Higher quality for complex tasks. Critical production paths.",
      "costMultiplier": 3.0,
      "roleMapping": {
        "reasoning": "reasoning",
        "coding": "coding",
        "efficiency": "coding"
      }
    },
    "max-quality": {
      "description": "Best available models. Architecture, security, critical decisions.",
      "costMultiplier": 10.0,
      "roleMapping": {
        "reasoning": "reasoning",
        "coding": "reasoning",
        "efficiency": "reasoning"
      }
    }
  },

  "providers": {
    "claude": {
      "models": {
        "reasoning": {
          "default": "claude-opus-4-5-20251101",
          "aliases": ["opus", "opus-4.5", "claude-opus"],
          "capabilities": ["long-context", "reasoning", "code-generation", "vision"],
          "contextWindow": 200000,
          "costPer1kTokens": { "input": 0.015, "output": 0.075 }
        },
        "coding": {
          "default": "claude-sonnet-4-5-20250929",
          "aliases": ["sonnet", "sonnet-4.5", "claude-sonnet"],
          "capabilities": ["code-generation", "reasoning", "vision"],
          "contextWindow": 200000,
          "costPer1kTokens": { "input": 0.003, "output": 0.015 }
        },
        "efficiency": {
          "default": "claude-haiku-3-5",
          "aliases": ["haiku", "haiku-3.5", "claude-haiku"],
          "capabilities": ["code-generation", "fast-response"],
          "contextWindow": 200000,
          "costPer1kTokens": { "input": 0.00025, "output": 0.00125 }
        }
      },
      "tierOverrides": {
        "max-quality": {
          "reasoning": "claude-opus-4-5-20251101",
          "coding": "claude-opus-4-5-20251101",
          "efficiency": "claude-sonnet-4-5-20250929"
        }
      }
    },

    "openai": {
      "models": {
        "reasoning": {
          "default": "gpt-5",
          "aliases": ["gpt5", "openai-reasoning"],
          "capabilities": ["reasoning", "code-generation", "vision"],
          "contextWindow": 128000
        },
        "coding": {
          "default": "gpt-5-codex",
          "aliases": ["codex", "openai-coding"],
          "capabilities": ["code-generation", "fast-response"],
          "contextWindow": 128000
        },
        "efficiency": {
          "default": "gpt-4o-mini",
          "aliases": ["gpt4o-mini", "openai-fast"],
          "capabilities": ["fast-response"],
          "contextWindow": 128000
        }
      },
      "tierOverrides": {
        "max-quality": {
          "reasoning": "gpt-5.2",
          "coding": "gpt-5",
          "efficiency": "gpt-5-codex"
        }
      }
    },

    "factory": {
      "inherits": "claude",
      "description": "Factory AI uses Claude models via API"
    },

    "copilot": {
      "models": {
        "reasoning": {
          "default": "claude-sonnet-4",
          "aliases": ["copilot-reasoning"],
          "capabilities": ["reasoning", "code-generation"]
        },
        "coding": {
          "default": "gpt-4o",
          "aliases": ["copilot-coding"],
          "capabilities": ["code-generation"]
        },
        "efficiency": {
          "default": "gpt-4o-mini",
          "aliases": ["copilot-fast"],
          "capabilities": ["fast-response"]
        }
      }
    },

    "windsurf": {
      "_status": "EXPERIMENTAL",
      "inherits": "claude"
    }
  },

  "agentRoleAssignments": {
    "orchestration": {
      "agents": [
        "executive-orchestrator",
        "intake-coordinator",
        "project-manager",
        "deployment-manager"
      ],
      "defaultRole": "reasoning",
      "minimumTier": "premium",
      "rationale": "Orchestration agents coordinate complex multi-agent workflows"
    },
    "architecture": {
      "agents": [
        "architecture-designer",
        "security-architect",
        "cloud-architect",
        "test-architect"
      ],
      "defaultRole": "reasoning",
      "minimumTier": "premium",
      "rationale": "Architecture decisions have long-term impact"
    },
    "implementation": {
      "agents": [
        "software-implementer",
        "api-designer",
        "database-optimizer",
        "devops-engineer"
      ],
      "defaultRole": "coding",
      "minimumTier": "standard",
      "rationale": "Implementation benefits from balanced quality/speed"
    },
    "review": {
      "agents": [
        "code-reviewer",
        "security-auditor",
        "requirements-reviewer"
      ],
      "defaultRole": "coding",
      "minimumTier": "standard",
      "rationale": "Reviews need quality but benefit from speed"
    },
    "documentation": {
      "agents": [
        "technical-writer",
        "api-documenter",
        "documentation-archivist"
      ],
      "defaultRole": "coding",
      "minimumTier": "standard",
      "rationale": "Documentation is important but iterative"
    },
    "operational": {
      "agents": [
        "configuration-manager",
        "environment-engineer",
        "build-engineer"
      ],
      "defaultRole": "efficiency",
      "minimumTier": "economy",
      "rationale": "Operational tasks are often routine"
    }
  },

  "shorthand": {
    "opus": "claude-opus-4-5-20251101",
    "sonnet": "claude-sonnet-4-5-20250929",
    "haiku": "claude-haiku-3-5",
    "gpt5": "gpt-5",
    "gpt4o": "gpt-4o",
    "inherit": "inherit"
  },

  "_comments": {
    "migration": "v1 configs remain compatible; tier system extends existing role system",
    "customTiers": "Users can define custom tiers in their config files",
    "capabilities": "Phase 2 will add capability-based model selection"
  }
}
```

### 4.2 User Configuration (~/.config/aiwg/models.json)

```json
{
  "defaults": {
    "tier": "premium",
    "provider": "claude"
  },

  "agentOverrides": {
    "architecture-designer": {
      "model-tier": "max-quality"
    },
    "build-engineer": {
      "model-tier": "economy"
    }
  },

  "customTiers": {
    "budget-dev": {
      "description": "Budget-conscious development tier",
      "costMultiplier": 0.05,
      "roleMapping": {
        "reasoning": "efficiency",
        "coding": "efficiency",
        "efficiency": "efficiency"
      }
    }
  }
}
```

### 4.3 Project Configuration (./models.json)

```json
{
  "defaults": {
    "tier": "max-quality",
    "provider": "claude"
  },

  "rationale": "Production-critical financial system requires highest quality models",

  "agentOverrides": {
    "technical-writer": {
      "model-tier": "standard",
      "rationale": "Documentation can use standard tier"
    }
  }
}
```

---

## 5. CLI Specification

### 5.1 New Commands

```text
AIWG Model Management Commands

Usage: aiwg models <subcommand> [options]

Subcommands:
  list                     List available models and tiers
  info <model>             Show model capabilities and cost
  set-default <tier>       Set default tier (user-level)
  set-project <tier>       Set project default tier
  validate                 Validate model configuration
  cost-estimate [tier]     Estimate deployment cost

Options:
  --provider <name>        Filter by provider (claude, openai, factory, etc.)
  --format <type>          Output format (table, json, yaml)
  --verbose                Show detailed information

Examples:
  aiwg models list
  aiwg models list --provider claude
  aiwg models info claude-opus-4-5-20251101
  aiwg models set-default premium
  aiwg models set-project max-quality
  aiwg models cost-estimate max-quality
```

### 5.2 Enhanced Deploy Commands

```text
Enhanced Deployment Options

Usage: aiwg use <framework> [options]

New Model Options:
  --model-tier <tier>      Deploy all agents at specified tier
                           Values: economy, standard, premium, max-quality

  --model <model>          Deploy all agents with specific model
                           Overrides tier system entirely
                           Example: --model claude-opus-4-5-20251101

  --model-all <model>      Alias for --model (clearer intent)

  --respect-minimums       Honor agent minimumTier settings
                           (default: true)

  --ignore-minimums        Ignore agent minimumTier settings
                           Allows economy tier for all agents

Existing Options (unchanged):
  --reasoning-model <m>    Override reasoning role model
  --coding-model <m>       Override coding role model
  --efficiency-model <m>   Override efficiency role model

Examples:
  # Deploy with highest quality models
  aiwg use sdlc --model-tier max-quality

  # Development: economy tier but respect minimums
  aiwg use sdlc --model-tier economy --respect-minimums

  # Force single model for everything
  aiwg use sdlc --model claude-opus-4-5-20251101

  # Budget development ignoring minimums
  aiwg use sdlc --model-tier economy --ignore-minimums
```

### 5.3 CLI Output Examples

#### `aiwg models list`

```text
AIWG Model Configuration

Provider: claude (default)
Default Tier: standard

Available Tiers:
┌─────────────┬────────────────────────────────────────────┬──────────┐
│ Tier        │ Description                                │ Cost     │
├─────────────┼────────────────────────────────────────────┼──────────┤
│ economy     │ Fastest, lowest cost. Development/testing. │ $        │
│ standard    │ Balanced speed, quality, cost. Production. │ $$       │
│ premium     │ Higher quality for complex tasks.          │ $$$      │
│ max-quality │ Best available. Critical decisions.        │ $$$$     │
└─────────────┴────────────────────────────────────────────┴──────────┘

Tier → Model Mappings (claude):
┌─────────────┬─────────────────────────────┬─────────────────────────────┬─────────────────┐
│ Tier        │ Reasoning                   │ Coding                      │ Efficiency      │
├─────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────┤
│ economy     │ claude-haiku-3-5            │ claude-haiku-3-5            │ claude-haiku-3-5│
│ standard    │ claude-sonnet-4-5-20250929  │ claude-sonnet-4-5-20250929  │ claude-haiku-3-5│
│ premium     │ claude-opus-4-1-20250805    │ claude-sonnet-4-5-20250929  │ claude-sonnet...│
│ max-quality │ claude-opus-4-5-20251101    │ claude-opus-4-5-20251101    │ claude-sonnet...│
└─────────────┴─────────────────────────────┴─────────────────────────────┴─────────────────┘

Run 'aiwg models list --provider openai' to see OpenAI mappings.
```

#### `aiwg models info claude-opus-4-5-20251101`

```text
Model: claude-opus-4-5-20251101

Provider:       Anthropic (Claude)
Role:           reasoning
Aliases:        opus, opus-4.5, claude-opus

Capabilities:
  [x] Long context (200K tokens)
  [x] Advanced reasoning
  [x] Code generation
  [x] Vision/multimodal
  [x] Tool use

Context Window: 200,000 tokens

Pricing (per 1K tokens):
  Input:  $0.015
  Output: $0.075

Used in Tiers:
  - max-quality: reasoning, coding, efficiency
  - premium: reasoning only

Recommended for:
  - Architecture decisions
  - Security reviews
  - Complex multi-step reasoning
  - Critical path validation
```

#### `aiwg models cost-estimate max-quality`

```text
Cost Estimate: max-quality tier

Provider: claude
Framework: sdlc (58 agents)

Estimated costs per deployment cycle:
┌──────────────────────┬──────────┬──────────────┬───────────────┐
│ Agent Category       │ Count    │ Avg. Tokens  │ Est. Cost     │
├──────────────────────┼──────────┼──────────────┼───────────────┤
│ Orchestration        │ 4        │ 50K          │ $3.00         │
│ Architecture         │ 8        │ 40K          │ $4.80         │
│ Implementation       │ 15       │ 30K          │ $6.75         │
│ Review               │ 10       │ 25K          │ $3.75         │
│ Documentation        │ 12       │ 20K          │ $3.60         │
│ Operational          │ 9        │ 15K          │ $2.03         │
├──────────────────────┼──────────┼──────────────┼───────────────┤
│ TOTAL                │ 58       │ 29K avg      │ $23.93        │
└──────────────────────┴──────────┴──────────────┴───────────────┘

Comparison:
  economy tier:     ~$2.40  (10x cheaper)
  standard tier:    ~$8.00  (3x cheaper)
  premium tier:     ~$16.00 (1.5x cheaper)
  max-quality tier: ~$24.00 (current)

Note: Actual costs vary based on conversation length and complexity.
```

---

## 6. SDK/DevKit API

### 6.1 TypeScript API Design

```typescript
// src/models/index.ts

/**
 * Model tier enumeration
 */
export type ModelTier = 'economy' | 'standard' | 'premium' | 'max-quality';

/**
 * Model role for task categorization
 */
export type ModelRole = 'reasoning' | 'coding' | 'efficiency';

/**
 * Provider identifiers
 */
export type Provider = 'claude' | 'openai' | 'factory' | 'copilot' | 'windsurf';

/**
 * Model capability flags
 */
export interface ModelCapabilities {
  longContext: boolean;
  reasoning: boolean;
  codeGeneration: boolean;
  vision: boolean;
  toolUse: boolean;
  fastResponse: boolean;
}

/**
 * Model metadata
 */
export interface ModelInfo {
  id: string;
  provider: Provider;
  role: ModelRole;
  aliases: string[];
  capabilities: ModelCapabilities;
  contextWindow: number;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

/**
 * Resolution result
 */
export interface ResolvedModel {
  modelId: string;
  provider: Provider;
  tier: ModelTier;
  role: ModelRole;
  source: 'cli' | 'agent' | 'project' | 'user' | 'default';
}

/**
 * Model resolver configuration
 */
export interface ModelResolverConfig {
  provider?: Provider;
  tier?: ModelTier;
  respectMinimums?: boolean;
  overrides?: Record<string, string>;
}

/**
 * ModelResolver class - main API entry point
 */
export class ModelResolver {
  constructor(config?: ModelResolverConfig);

  /**
   * Resolve model for an agent
   * @param agentName - Name of the agent
   * @param agentRole - Role hint from agent frontmatter
   * @param agentTier - Tier from agent frontmatter (optional)
   * @returns Resolved model information
   */
  resolve(
    agentName: string,
    agentRole?: ModelRole,
    agentTier?: ModelTier
  ): ResolvedModel;

  /**
   * Get model info by ID or alias
   */
  getModelInfo(modelIdOrAlias: string): ModelInfo | null;

  /**
   * List all available models for provider
   */
  listModels(provider?: Provider): ModelInfo[];

  /**
   * List available tiers
   */
  listTiers(): Array<{
    tier: ModelTier;
    description: string;
    costMultiplier: number;
  }>;

  /**
   * Validate configuration
   */
  validate(): { valid: boolean; errors: string[] };

  /**
   * Estimate cost for deployment
   */
  estimateCost(
    tier: ModelTier,
    agentCount: number,
    avgTokensPerAgent?: number
  ): { totalCost: number; breakdown: Record<ModelRole, number> };
}

/**
 * Load merged configuration
 */
export function loadModelConfig(projectPath?: string): MergedModelConfig;

/**
 * Get default tier from configuration
 */
export function getDefaultTier(projectPath?: string): ModelTier;

/**
 * Runtime model switching for dynamic scenarios
 */
export class RuntimeModelSelector {
  constructor(resolver: ModelResolver);

  /**
   * Select model based on task complexity
   * @param taskDescription - Description of the task
   * @param constraints - Optional constraints (cost, speed, etc.)
   */
  selectForTask(
    taskDescription: string,
    constraints?: {
      maxCost?: number;
      preferSpeed?: boolean;
      requiredCapabilities?: (keyof ModelCapabilities)[];
    }
  ): ResolvedModel;

  /**
   * Upgrade to higher tier for complex task
   */
  escalate(currentModel: ResolvedModel): ResolvedModel;

  /**
   * Downgrade to lower tier for simple task
   */
  deescalate(currentModel: ResolvedModel): ResolvedModel;
}
```

### 6.2 Usage Examples

```typescript
import { ModelResolver, loadModelConfig } from '@aiwg/models';

// Basic usage
const resolver = new ModelResolver({
  provider: 'claude',
  tier: 'premium'
});

// Resolve model for an agent
const result = resolver.resolve('architecture-designer', 'reasoning');
console.log(result.modelId); // "claude-opus-4-5-20251101"

// With tier override from agent frontmatter
const result2 = resolver.resolve('build-engineer', 'efficiency', 'economy');
console.log(result2.modelId); // "claude-haiku-3-5"

// List available tiers
const tiers = resolver.listTiers();
// [
//   { tier: 'economy', description: '...', costMultiplier: 0.1 },
//   { tier: 'standard', description: '...', costMultiplier: 1.0 },
//   ...
// ]

// Estimate deployment cost
const estimate = resolver.estimateCost('max-quality', 58, 30000);
console.log(`Estimated cost: $${estimate.totalCost.toFixed(2)}`);

// Runtime model selection
import { RuntimeModelSelector } from '@aiwg/models';

const selector = new RuntimeModelSelector(resolver);

const model = selector.selectForTask(
  'Design distributed caching architecture for 1M requests/second',
  { requiredCapabilities: ['reasoning', 'longContext'] }
);
// Automatically selects max-quality tier for complex task
```

---

## 7. Migration Path

### 7.1 Backwards Compatibility

The enhanced system maintains full backwards compatibility:

| Current Format | Interpretation | Effective Behavior |
|----------------|----------------|-------------------|
| `model: opus` | `role: reasoning` | Uses tier system with reasoning role |
| `model: sonnet` | `role: coding` | Uses tier system with coding role |
| `model: haiku` | `role: efficiency` | Uses tier system with efficiency role |

No changes required to existing agent definitions.

### 7.2 Migration Steps

**Phase 1: Configuration Migration (Non-Breaking)**

1. Update `models.json` schema to v2 format
2. Add tier definitions alongside existing role mappings
3. Deploy script reads new format, falls back to legacy

**Phase 2: Optional Agent Updates**

1. Add `model-tier` to agent frontmatter where explicit tier is needed
2. Add `model-override` for agents requiring specific models
3. Legacy `model: opus|sonnet|haiku` continues to work

**Phase 3: CLI Enhancement**

1. Add `aiwg models` subcommand group
2. Add `--model-tier` to `aiwg use` command
3. Existing `--reasoning-model`, etc. continue to work

### 7.3 Migration Script

```bash
# Preview migration
aiwg migrate-models --dry-run

# Migrate configuration files
aiwg migrate-models --write

# Migrate agent frontmatter (optional)
aiwg migrate-agents --add-tiers --write
```

---

## 8. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] Enhanced `models.json` schema (v2)
- [ ] `ModelResolver` class implementation
- [ ] Configuration loader with hierarchy support
- [ ] Unit tests for resolution logic

### Phase 2: CLI Integration (Week 2-3)

- [ ] `aiwg models list` command
- [ ] `aiwg models info` command
- [ ] `aiwg models set-default` command
- [ ] `--model-tier` flag for `aiwg use`
- [ ] Integration tests

### Phase 3: Deploy Script Updates (Week 3-4)

- [ ] Update `deploy-agents.mjs` for tier system
- [ ] Frontmatter processing for `model-tier`, `model-override`
- [ ] Cost estimation output
- [ ] Provider-specific transformations

### Phase 4: SDK/DevKit (Week 4-5)

- [ ] TypeScript API implementation
- [ ] `RuntimeModelSelector` for dynamic scenarios
- [ ] Documentation and examples
- [ ] MCP server integration

### Phase 5: Polish and Documentation (Week 5-6)

- [ ] Migration script
- [ ] User documentation
- [ ] Cost estimation refinement
- [ ] Provider capability updates

---

## References

- @.aiwg/architecture/ADR-015-enhanced-model-selection.md - Architecture Decision Record
- @agentic/code/frameworks/sdlc-complete/config/models.json - Current configuration
- @tools/agents/deploy-agents.mjs - Deployment script
- @src/cli/index.mjs - CLI entry point
- @agentic/code/config/registry.json - Path registry

---

## 9. Model Catalog System

### 9.1 Overview

The Model Catalog is a living database of AI models across providers, maintained through a combination of:
- **Built-in catalog**: Ships with AIWG, manually curated
- **Auto-refresh**: Queries public sources to discover new models
- **User additions**: Local customizations for custom/private models

### 9.2 Catalog Storage

```
~/.local/share/aiwg/
├── catalog/
│   ├── models.json           # Merged catalog (auto-generated)
│   ├── builtin-models.json   # AIWG-shipped models (read-only)
│   ├── discovered-models.json # Auto-discovered models
│   ├── custom-models.json    # User-defined models
│   └── sources.json          # Data source configuration
└── cache/
    └── catalog/
        ├── anthropic.json    # Cached API responses
        ├── openai.json
        └── last-refresh.json
```

### 9.3 Data Sources

The catalog refresher queries free/public sources:

| Source | Provider | Data Available | Rate Limits |
|--------|----------|----------------|-------------|
| [Anthropic API](https://docs.anthropic.com/en/api/models-list) | Claude | Model IDs, descriptions | Free |
| [OpenAI Models API](https://platform.openai.com/docs/api-reference/models) | OpenAI | Model IDs, owners | Requires API key |
| [OpenRouter Models](https://openrouter.ai/api/v1/models) | Multiple | Comprehensive metadata | Free |
| [Hugging Face Hub](https://huggingface.co/api/models) | Open Source | Model cards, metadata | Free |
| [LiteLLM Model List](https://github.com/BerriAI/litellm) | Multiple | Compatibility info | GitHub API |

### 9.4 Catalog Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "aiwg-model-catalog.schema.json",
  "title": "AIWG Model Catalog",

  "models": {
    "claude-opus-4-5-20251101": {
      "provider": "anthropic",
      "displayName": "Claude Opus 4.5",
      "releaseDate": "2025-11-01",
      "status": "active",
      "deprecated": false,
      "deprecationDate": null,
      "successorModel": null,

      "capabilities": {
        "contextWindow": 200000,
        "maxOutputTokens": 8192,
        "vision": true,
        "toolUse": true,
        "streaming": true,
        "reasoning": "excellent",
        "coding": "excellent",
        "speed": "slow"
      },

      "pricing": {
        "inputPer1kTokens": 0.015,
        "outputPer1kTokens": 0.075,
        "currency": "USD",
        "lastUpdated": "2025-12-01"
      },

      "aliases": ["opus", "opus-4.5", "claude-opus"],
      "tags": ["flagship", "reasoning", "long-context"],

      "source": "builtin",
      "lastVerified": "2025-12-12"
    }
  },

  "providers": {
    "anthropic": {
      "displayName": "Anthropic",
      "apiEndpoint": "https://api.anthropic.com",
      "modelsEndpoint": "https://api.anthropic.com/v1/models",
      "docsUrl": "https://docs.anthropic.com",
      "pricingUrl": "https://www.anthropic.com/pricing"
    },
    "openai": {
      "displayName": "OpenAI",
      "apiEndpoint": "https://api.openai.com",
      "modelsEndpoint": "https://api.openai.com/v1/models",
      "docsUrl": "https://platform.openai.com/docs",
      "pricingUrl": "https://openai.com/pricing"
    }
  },

  "metadata": {
    "version": "1.0.0",
    "lastRefresh": "2025-12-12T10:30:00Z",
    "nextRefresh": "2025-12-19T10:30:00Z",
    "modelCount": 47,
    "providerCount": 5
  }
}
```

### 9.5 CLI Commands

```bash
# List all models in catalog
aiwg catalog list
aiwg catalog list --provider anthropic
aiwg catalog list --tag reasoning
aiwg catalog list --status active

# Search catalog
aiwg catalog search "opus"
aiwg catalog search --capability vision --min-context 100000

# Show model details
aiwg catalog info claude-opus-4-5-20251101

# Refresh catalog from sources
aiwg catalog refresh
aiwg catalog refresh --source openrouter
aiwg catalog refresh --force  # Ignore cache

# Add custom model
aiwg catalog add <model-id> --provider <provider> --interactive
aiwg catalog add my-custom-model --from-json ./model-spec.json

# Remove custom model
aiwg catalog remove my-custom-model

# Check for updates
aiwg catalog check
# Output: "5 new models available, 2 deprecated since last refresh"

# Export catalog
aiwg catalog export --format json > catalog.json
aiwg catalog export --format markdown > MODELS.md

# Verify catalog against live APIs
aiwg catalog verify
aiwg catalog verify --provider anthropic
```

### 9.6 CLI Output Examples

#### `aiwg catalog list --provider anthropic`

```text
AIWG Model Catalog - Anthropic

┌─────────────────────────────────┬───────────┬──────────┬─────────┬──────────┐
│ Model ID                        │ Display   │ Context  │ Vision  │ Status   │
├─────────────────────────────────┼───────────┼──────────┼─────────┼──────────┤
│ claude-opus-4-5-20251101        │ Opus 4.5  │ 200K     │ ✓       │ active   │
│ claude-opus-4-1-20250805        │ Opus 4.1  │ 200K     │ ✓       │ active   │
│ claude-sonnet-4-5-20250929      │ Sonnet 4.5│ 200K     │ ✓       │ active   │
│ claude-sonnet-4-20250514        │ Sonnet 4  │ 200K     │ ✓       │ active   │
│ claude-haiku-3-5                │ Haiku 3.5 │ 200K     │ ✓       │ active   │
│ claude-3-opus-20240229          │ Opus 3    │ 200K     │ ✓       │ deprecated│
└─────────────────────────────────┴───────────┴──────────┴─────────┴──────────┘

Last refreshed: 2025-12-12 (2 hours ago)
Run 'aiwg catalog refresh' to update
```

#### `aiwg catalog info claude-opus-4-5-20251101`

```text
Model: claude-opus-4-5-20251101

Provider:       Anthropic
Display Name:   Claude Opus 4.5
Release Date:   2025-11-01
Status:         active

Capabilities:
  Context Window:   200,000 tokens
  Max Output:       8,192 tokens
  Vision:           ✓
  Tool Use:         ✓
  Streaming:        ✓

Quality Ratings:
  Reasoning:        ★★★★★ Excellent
  Coding:           ★★★★★ Excellent
  Speed:            ★★☆☆☆ Slow

Pricing (USD per 1K tokens):
  Input:   $0.0150
  Output:  $0.0750
  (Last updated: 2025-12-01)

Aliases:        opus, opus-4.5, claude-opus
Tags:           flagship, reasoning, long-context

Used in Tiers:
  max-quality:  reasoning, coding
  premium:      reasoning

Source:         builtin
Last Verified:  2025-12-12

Documentation:  https://docs.anthropic.com/en/docs/models
```

#### `aiwg catalog refresh`

```text
Refreshing model catalog...

[OK] Anthropic API        - 6 models (0 new, 0 deprecated)
[OK] OpenAI Models        - 12 models (2 new, 1 deprecated)
[OK] OpenRouter           - 89 models (5 new, 3 deprecated)
[--] Hugging Face         - Skipped (no changes since last refresh)

Summary:
  New models discovered:      7
  Models deprecated:          4
  Catalog updated:           Yes

New models:
  + openai/gpt-5.2-turbo-preview
  + openai/o3-mini
  + anthropic/claude-3-5-sonnet-v2
  + google/gemini-2.0-ultra
  + ...

Deprecated models:
  - openai/gpt-4-turbo-preview (successor: gpt-4o)
  - ...

Run 'aiwg catalog list --new' to see new models
Run 'aiwg models sync' to update tier mappings
```

### 9.7 Auto-Refresh Mechanism

```typescript
// Refresh configuration in sources.json
{
  "refreshSchedule": {
    "automatic": true,
    "intervalDays": 7,
    "onStartup": false,
    "notifyOnNew": true
  },

  "sources": {
    "anthropic": {
      "enabled": true,
      "endpoint": "https://api.anthropic.com/v1/models",
      "requiresAuth": true,
      "authEnvVar": "ANTHROPIC_API_KEY",
      "cacheDuration": "7d"
    },
    "openrouter": {
      "enabled": true,
      "endpoint": "https://openrouter.ai/api/v1/models",
      "requiresAuth": false,
      "cacheDuration": "1d"
    },
    "github-litellm": {
      "enabled": true,
      "endpoint": "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json",
      "requiresAuth": false,
      "cacheDuration": "3d"
    }
  },

  "fallbackBehavior": {
    "onSourceFailure": "use-cache",
    "maxCacheAge": "30d",
    "alertOnStale": true
  }
}
```

### 9.8 Integration with Model Selection

The catalog feeds into the model selection system:

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Model Catalog  │────▶│  Tier Mappings   │────▶│  Model Resolver │
│                 │     │                  │     │                 │
│ - All models    │     │ - economy tier   │     │ - Agent lookup  │
│ - Capabilities  │     │ - standard tier  │     │ - Override      │
│ - Pricing       │     │ - premium tier   │     │ - Final model   │
│ - Status        │     │ - max-quality    │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

When catalog discovers new flagship models:
1. CLI notification: "New model available: claude-opus-4-5-20251101"
2. User can run `aiwg models suggest-updates` to see recommended tier changes
3. `aiwg models sync --from-catalog` applies suggested updates

### 9.9 Custom Model Registration

For private/fine-tuned models:

```bash
# Interactive registration
aiwg catalog add my-fine-tuned-model --interactive

# Questions:
# Provider endpoint? [https://api.example.com]
# Base model? [claude-sonnet-4.5]
# Context window? [200000]
# Has vision? [y/N]
# ...

# From JSON spec
aiwg catalog add my-model --from-json <<EOF
{
  "provider": "custom",
  "endpoint": "https://my-api.example.com/v1",
  "displayName": "My Fine-tuned Model",
  "basedOn": "claude-sonnet-4-5-20250929",
  "capabilities": {
    "contextWindow": 200000,
    "vision": false
  }
}
EOF
```

### 9.10 Implementation Notes

**Data Quality:**
- All auto-discovered models marked with `source: "discovered"`
- User additions marked with `source: "custom"`
- Built-in models marked with `source: "builtin"` (highest trust)
- Pricing data labeled with `lastUpdated` (advisory only)

**Caching:**
- HTTP cache respects provider headers
- Local cache in `~/.local/share/aiwg/cache/catalog/`
- Stale cache used when sources unavailable

**Rate Limiting:**
- Respect provider rate limits
- Exponential backoff on failures
- Parallel fetching with concurrency limit

---

## Appendix A: Complete Provider Model Mappings

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Provider Model Mappings                                │
├─────────────┬────────────────────────────────────────────────────────────────────────┤
│             │                              Tier                                     │
│ Provider    ├─────────────────────┬─────────────────────┬────────────────────────────┤
│             │ Role: reasoning     │ Role: coding        │ Role: efficiency           │
├─────────────┼─────────────────────┼─────────────────────┼────────────────────────────┤
│ CLAUDE      │                     │                     │                            │
│ economy     │ haiku-3.5           │ haiku-3.5           │ haiku-3.5                  │
│ standard    │ sonnet-4.5          │ sonnet-4.5          │ haiku-3.5                  │
│ premium     │ opus-4.1            │ sonnet-4.5          │ sonnet-4.5                 │
│ max-quality │ opus-4.5            │ opus-4.5            │ sonnet-4.5                 │
├─────────────┼─────────────────────┼─────────────────────┼────────────────────────────┤
│ OPENAI      │                     │                     │                            │
│ economy     │ gpt-4o-mini         │ gpt-4o-mini         │ gpt-4o-mini                │
│ standard    │ gpt-4o              │ gpt-4o              │ gpt-4o-mini                │
│ premium     │ gpt-5               │ gpt-5-codex         │ gpt-4o                     │
│ max-quality │ gpt-5.2             │ gpt-5               │ gpt-5-codex                │
├─────────────┼─────────────────────┼─────────────────────┼────────────────────────────┤
│ COPILOT     │                     │                     │                            │
│ economy     │ gpt-4o-mini         │ gpt-4o-mini         │ gpt-4o-mini                │
│ standard    │ gpt-4o              │ gpt-4o              │ gpt-4o-mini                │
│ premium     │ claude-sonnet-4     │ gpt-4o              │ gpt-4o                     │
│ max-quality │ claude-sonnet-4     │ claude-sonnet-4     │ gpt-4o                     │
└─────────────┴─────────────────────┴─────────────────────┴────────────────────────────┘
```

## Appendix B: Agent Category Assignments

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           Agent → Category → Minimum Tier                              │
├─────────────────────────────┬───────────────────┬────────────────┬─────────────────────┤
│ Agent                       │ Category          │ Default Role   │ Minimum Tier        │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ executive-orchestrator      │ orchestration     │ reasoning      │ premium             │
│ intake-coordinator          │ orchestration     │ reasoning      │ premium             │
│ project-manager             │ orchestration     │ reasoning      │ premium             │
│ deployment-manager          │ orchestration     │ reasoning      │ premium             │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ architecture-designer       │ architecture      │ reasoning      │ premium             │
│ security-architect          │ architecture      │ reasoning      │ premium             │
│ cloud-architect             │ architecture      │ reasoning      │ premium             │
│ test-architect              │ architecture      │ reasoning      │ premium             │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ software-implementer        │ implementation    │ coding         │ standard            │
│ api-designer                │ implementation    │ coding         │ standard            │
│ database-optimizer          │ implementation    │ coding         │ standard            │
│ devops-engineer             │ implementation    │ coding         │ standard            │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ code-reviewer               │ review            │ coding         │ standard            │
│ security-auditor            │ review            │ coding         │ standard            │
│ requirements-reviewer       │ review            │ coding         │ standard            │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ technical-writer            │ documentation     │ coding         │ standard            │
│ api-documenter              │ documentation     │ coding         │ standard            │
│ documentation-archivist     │ documentation     │ coding         │ standard            │
├─────────────────────────────┼───────────────────┼────────────────┼─────────────────────┤
│ configuration-manager       │ operational       │ efficiency     │ economy             │
│ environment-engineer        │ operational       │ efficiency     │ economy             │
│ build-engineer              │ operational       │ efficiency     │ economy             │
└─────────────────────────────┴───────────────────┴────────────────┴─────────────────────┘
```
