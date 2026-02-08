# ADR: Universal Provider Deployment Architecture

## Status

**ACCEPTED AND IMPLEMENTED**

## Date

2026-02-06

## Context

### Problem Statement

AIWG deploys AI workflow artifacts -- agents, commands, skills, and rules -- to 8 different AI coding platforms. Each provider currently deploys only the artifact types its platform natively supports. This creates a fragmented experience: a user deploying AIWG to Cursor gets rules but no agents; a user deploying to Factory gets agents and commands but no skills or rules. The same AIWG framework yields different capability sets depending on the provider, creating confusion and reducing value.

The new strategy is to deploy ALL 4 artifact types to ALL 8 providers universally. When a provider lacks native support for an artifact type, AIWG creates a conventional directory within the provider's work directory so that the artifacts are present for reference, context loading, and potential future platform adoption.

### Current State

The existing provider system (defined in `tools/agents/providers/*.mjs`) uses a `ProviderInterface` base with `paths` and `capabilities` objects. Each provider declares which artifact types it supports:

| Provider | Agents | Commands | Skills | Rules |
|----------|--------|----------|--------|-------|
| **Claude** | `.claude/agents/` | `.claude/commands/` | `.claude/skills/` | `.claude/rules/` |
| **Codex** | `.codex/agents/` | `~/.codex/prompts/` (home) | `~/.codex/skills/` (home) | `null` |
| **Copilot** | `.github/agents/` (YAML) | `.github/agents/` (as agents) | `null` | `null` |
| **Factory** | `.factory/droids/` | `.factory/commands/` | `null` | `null` |
| **Cursor** | `null` | `null` (becomes rules) | `null` | `.cursor/rules/` (MDC) |
| **OpenCode** | `.opencode/agent/` | `.opencode/command/` | `null` | `null` |
| **Warp** | `null` (WARP.md) | `null` (WARP.md) | `null` | `null` |
| **Windsurf** | `null` (AGENTS.md) | `.windsurf/workflows/` | `null` | `null` |

Of the 32 provider-artifact combinations (8 providers x 4 types), only 16 have defined paths. The other 16 are `null`, meaning those artifacts are silently skipped during deployment.

### Codebase References

- **Base provider interface**: `tools/agents/providers/base.mjs` (lines 708-755) -- defines `ProviderInterface` with `paths` and `capabilities`
- **Platform paths (TypeScript)**: `src/smiths/platform-paths.ts` -- parallel path definitions for the TypeScript codebase
- **Agent deployer**: `src/agents/agent-deployer.ts` -- TypeScript deployment engine
- **Deploy orchestrator**: `tools/agents/deploy-agents.mjs` -- main CLI entry point
- **Use handler**: `src/cli/handlers/use.ts` -- `aiwg use` command with `PROVIDER_PATHS` (lines 40-71)
- **Prior ADR**: `.aiwg/architecture/adr/ADR-004-multi-platform-compatibility-strategy.md` -- original "Monitor-then-Abstract" strategy (now superseded by this decision)

### Key Observations from Code Analysis

1. **Two parallel path systems exist**: `tools/agents/providers/base.mjs` (JavaScript, runtime) and `src/smiths/platform-paths.ts` (TypeScript, used by smiths and extension system). Both must stay synchronized.

2. **The `Platform` type in `src/agents/types.ts` lists only 7 values** (`claude | codex | copilot | cursor | factory | generic | windsurf`). Warp and OpenCode are missing from the TypeScript type but present in the JavaScript provider system.

3. **Aggregated providers (Warp, Windsurf)** delegate to external scripts (`tools/warp/setup-warp.mjs`, etc.) and produce single files rather than discrete per-artifact files.

4. **Codex deploys commands and skills to the home directory** (`~/.codex/prompts/`, `~/.codex/skills/`), not the project directory. This is the only provider with a split project/home deployment model.

5. **Cursor transforms all artifacts to MDC format** (`.mdc` extension) via an external script (`tools/rules/deploy-rules-cursor.mjs`).

6. **The `capabilities` object** currently tracks only 4 boolean flags: `skills`, `rules`, `aggregatedOutput`, `yamlFormat`. It does not distinguish between "native support" and "conventional directory support."

## Decision Drivers

1. **User experience parity**: Every AIWG user should get the same artifacts regardless of provider choice.
2. **Platform evolution**: Platforms regularly add new features. Having directories pre-populated means AIWG is ready when a platform adds native support.
3. **Context availability**: Even without native support, having agents/skills/rules present on disk means users can `@`-mention them for context loading.
4. **Minimal platform interference**: Conventional directories must not conflict with future platform features or existing platform conventions.
5. **Backward compatibility**: Existing deployments must continue working without breakage.
6. **Maintainability**: The provider system is already complex (9 providers, external scripts, format transformations). Changes must reduce complexity, not add to it.

## Decision

### 1. Universal Directory Mapping (All 32 Combinations)

Every provider gets a path for every artifact type. Paths follow the provider's own directory naming convention (e.g., Factory uses `.factory/`, OpenCode uses `.opencode/`).

#### Complete Directory Mapping

| Provider | Agents | Commands | Skills | Rules | Notes |
|----------|--------|----------|--------|-------|-------|
| **Claude** | `.claude/agents/` | `.claude/commands/` | `.claude/skills/` | `.claude/rules/` | Fully native. No changes. |
| **Codex** | `.codex/agents/` | `.codex/prompts/` | `.codex/skills/` | `.codex/rules/` | Commands and skills also deployed project-locally. See section 3. |
| **Copilot** | `.github/agents/` | `.github/commands/` | `.github/skills/` | `.github/copilot-rules/` | Commands get own directory instead of merging into agents/. Rules avoid `.github/rules/` conflict with GitHub's own rules feature. |
| **Factory** | `.factory/droids/` | `.factory/commands/` | `.factory/skills/` | `.factory/rules/` | Skills and rules are new conventional directories. |
| **Cursor** | `.cursor/agents/` | `.cursor/commands/` | `.cursor/skills/` | `.cursor/rules/` | Agents, commands, and skills are new. Rules remain native (MDC). |
| **OpenCode** | `.opencode/agent/` | `.opencode/command/` | `.opencode/skill/` | `.opencode/rule/` | Skills and rules are new. Follows OpenCode's singular naming convention (`agent/` not `agents/`). |
| **Warp** | `.warp/agents/` | `.warp/commands/` | `.warp/skills/` | `.warp/rules/` | All 4 are new conventional directories. WARP.md aggregation continues separately. |
| **Windsurf** | `.windsurf/agents/` | `.windsurf/workflows/` | `.windsurf/skills/` | `.windsurf/rules/` | Agents and rules are new. Workflows keeps current path. AGENTS.md aggregation continues separately. |

#### New Paths (16 additions)

| Provider | New Directories |
|----------|----------------|
| Codex | `.codex/rules/` |
| Copilot | `.github/commands/`, `.github/skills/`, `.github/copilot-rules/` |
| Factory | `.factory/skills/`, `.factory/rules/` |
| Cursor | `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/` |
| OpenCode | `.opencode/skill/`, `.opencode/rule/` |
| Warp | `.warp/agents/`, `.warp/commands/`, `.warp/skills/`, `.warp/rules/` |
| Windsurf | `.windsurf/agents/`, `.windsurf/skills/`, `.windsurf/rules/` |

### 2. ProviderInterface v2

The base provider interface is restructured to enforce universal deployment while clearly distinguishing native from conventional support.

#### New Interface Design

```javascript
/**
 * ProviderInterface v2 - Universal deployment with native/conventional distinction
 */
export const ProviderInterface = {
  name: 'base',
  aliases: [],

  // ── Path Configuration ──────────────────────────────────────────────
  // ALL four paths are REQUIRED (no nulls). Every provider deploys every type.

  paths: {
    agents: null,       // REQUIRED: string path (project-relative)
    commands: null,      // REQUIRED: string path (project-relative)
    skills: null,        // REQUIRED: string path (project-relative)
    rules: null,         // REQUIRED: string path (project-relative)
  },

  // ── Support Level per Artifact Type ─────────────────────────────────
  // Replaces boolean capabilities with granular support levels.

  support: {
    agents:   'conventional',  // 'native' | 'conventional' | 'aggregated'
    commands: 'conventional',
    skills:   'conventional',
    rules:    'conventional',
  },

  // ── Provider Capabilities ───────────────────────────────────────────

  capabilities: {
    aggregatedOutput: false,   // Provider produces single-file aggregation (WARP.md, AGENTS.md)
    yamlFormat: false,         // Provider uses YAML instead of Markdown
    mdcFormat: false,          // Provider uses MDC format (Cursor)
    homeDirectoryDeploy: false, // Provider deploys some artifacts to ~ (Codex)
    projectLocalMirror: false,  // Provider should also deploy home-dir artifacts project-locally
  },

  // ── Home Directory Paths (Codex-specific) ───────────────────────────
  // Only populated for providers that deploy to home directory.

  homePaths: {
    commands: null,  // e.g., '~/.codex/prompts/'
    skills: null,    // e.g., '~/.codex/skills/'
  },

  // ── Artifact Transformation ─────────────────────────────────────────

  transformAgent(srcPath, content, opts) { return content; },
  transformCommand(srcPath, content, opts) { return content; },
  transformSkill(srcPath, content, opts) { return content; },  // NEW
  transformRule(srcPath, content, opts) { return content; },    // NEW

  // ── Model Mapping ──────────────────────────────────────────────────

  mapModel(shorthand, modelCfg, modelsConfig) { return shorthand; },

  // ── Deployment Functions ────────────────────────────────────────────
  // All four deploy functions are REQUIRED (no more ad-hoc method names).

  deployAgents(agentFiles, targetDir, opts) {},
  deployCommands(commandFiles, targetDir, opts) {},
  deploySkills(skillDirs, targetDir, opts) {},    // NEW: mandatory
  deployRules(ruleFiles, targetDir, opts) {},     // NEW: mandatory

  // ── Aggregation (for Warp, Windsurf) ────────────────────────────────
  // Optional: Providers with aggregatedOutput implement this.

  aggregate(artifacts, targetDir, opts) {},

  // ── Post-deployment Hook ────────────────────────────────────────────

  async postDeploy(targetDir, opts) {},

  // ── File Extension ──────────────────────────────────────────────────

  getFileExtension(artifactType) { return '.md'; },

  // ── Main Entry Point ────────────────────────────────────────────────

  async deploy(opts) {},
};
```

#### Support Level Semantics

| Level | Meaning | Behavior |
|-------|---------|----------|
| `native` | Platform natively consumes this artifact type | Deploy with platform-specific transformations. Platform will discover and use these files automatically. |
| `conventional` | Directory exists by AIWG convention only | Deploy in AIWG's generic markdown format. Files are available for `@`-mention context loading and manual use. Platform does not auto-discover them. |
| `aggregated` | Content is aggregated into a single file | Deploy discrete files to conventional directory AND include in aggregated file (WARP.md, AGENTS.md). |

### 3. Codex Home Directory Strategy

Codex is unique in deploying commands (`~/.codex/prompts/`) and skills (`~/.codex/skills/`) to the user's home directory. The universal strategy adds project-local mirrors:

```
~/.codex/prompts/           <-- Home directory (native, for Codex CLI discovery)
.codex/prompts/              <-- Project directory (conventional, for context/reference)

~/.codex/skills/             <-- Home directory (native, for Codex CLI discovery)
.codex/skills/               <-- Project directory (conventional, for context/reference)
```

**Rationale**: Project-local copies ensure artifacts are version-controlled with the project, available in CI/CD, and accessible via `@`-mention. The home directory copies are still created for native Codex functionality. The `projectLocalMirror` capability flag controls this dual-write behavior.

### 4. Aggregated Provider Strategy (Warp, Windsurf)

For providers that produce single aggregated files, the universal approach is **hybrid**: deploy discrete files to conventional directories AND produce the aggregated file.

```
Warp deployment produces:
├── WARP.md                    <-- Aggregated (existing behavior, for Warp discovery)
└── .warp/
    ├── agents/                <-- Discrete files (new, for context/reference)
    │   ├── architecture-designer.md
    │   ├── test-engineer.md
    │   └── ...
    ├── commands/              <-- Discrete files (new)
    │   ├── status.md
    │   └── ...
    ├── skills/                <-- Discrete files (new)
    │   └── project-awareness/
    │       └── SKILL.md
    └── rules/                 <-- Discrete files (new)
        ├── hitl-gates.md
        └── ...

Windsurf deployment produces:
├── AGENTS.md                  <-- Aggregated agents (existing)
├── .windsurfrules             <-- Orchestration context (existing)
└── .windsurf/
    ├── agents/                <-- Discrete files (new)
    ├── workflows/             <-- Commands as workflows (existing)
    ├── skills/                <-- Discrete files (new)
    └── rules/                 <-- Discrete files (new)
```

**Benefits**:
- Aggregated files continue working for platforms that read them
- Discrete files enable individual `@`-mentions and granular context loading
- Programmatic access (tooling, CI/CD) benefits from discrete files
- No behavioral regression for existing users

### 5. Format Transformation Strategy

Each provider may require different output formats for different artifact types. The transformation pipeline is:

```
Source Artifact (AIWG canonical markdown)
        │
        ▼
┌───────────────────┐
│ support === native │──► Platform-specific transform (YAML, MDC, JSON, etc.)
└───────────────────┘
        │
        ▼ (if conventional)
┌───────────────────┐
│ Generic markdown  │──► Minimal frontmatter stripping, AIWG header addition
└───────────────────┘
```

#### Format Matrix

| Provider | Native Format | Conventional Format |
|----------|--------------|---------------------|
| Claude | MD + YAML frontmatter | N/A (fully native) |
| Codex | MD + custom frontmatter | Generic MD |
| Copilot | YAML (`.yaml`) | Generic MD |
| Factory | MD + kebab-case + Factory tools | Generic MD |
| Cursor | MDC (`.mdc`) | Generic MD |
| OpenCode | MD + category config | Generic MD |
| Warp | Aggregated MD sections | Generic MD |
| Windsurf | Plain MD (no frontmatter) | Generic MD |

#### Conventional Format Template

Files deployed to conventional (non-native) directories use a minimal, provider-agnostic format:

```markdown
---
name: architecture-designer
description: Designs scalable system architectures
type: agent
source: aiwg/sdlc-complete
version: 1.0.0
---

# Architecture Designer

[Full agent system prompt content]
```

The `type` field (`agent`, `command`, `skill`, `rule`) enables tooling to identify artifacts by type regardless of directory location.

### 6. TypeScript Type Updates

The `Platform` type in `src/agents/types.ts` must be extended to include all 8 providers:

```typescript
export type Platform =
  | 'claude'
  | 'codex'
  | 'copilot'
  | 'cursor'
  | 'factory'
  | 'opencode'   // NEW
  | 'warp'       // NEW
  | 'windsurf'
  | 'generic';

export type ArtifactType = 'agent' | 'command' | 'skill' | 'rule';

export type SupportLevel = 'native' | 'conventional' | 'aggregated';

export interface ProviderPaths {
  agents: string;
  commands: string;
  skills: string;
  rules: string;
}

export interface ProviderSupport {
  agents: SupportLevel;
  commands: SupportLevel;
  skills: SupportLevel;
  rules: SupportLevel;
}
```

## Decision Matrix

### Alternative 1: Universal Deployment with Conventional Directories (SELECTED)

Deploy all 4 artifact types to all 8 providers, using conventional directories for non-native types.

| Criterion (Weight) | Score | Reasoning |
|---------------------|-------|-----------|
| User experience parity (25%) | 5 | Every provider gets every artifact |
| Platform evolution readiness (20%) | 5 | Directories pre-exist for future native support |
| Context availability (20%) | 5 | All artifacts available for `@`-mention |
| Implementation complexity (15%) | 3 | Requires changes to all 8 providers |
| Backward compatibility (10%) | 5 | Additive only, nothing removed |
| Disk footprint (10%) | 3 | More files deployed |
| **Weighted Score** | **4.35** | |

### Alternative 2: Native-Only Deployment (Status Quo)

Continue deploying only to natively-supported paths.

| Criterion (Weight) | Score | Reasoning |
|---------------------|-------|-----------|
| User experience parity (25%) | 2 | Different artifacts per provider |
| Platform evolution readiness (20%) | 1 | No preparation for new features |
| Context availability (20%) | 2 | Missing artifacts cannot be loaded |
| Implementation complexity (15%) | 5 | No changes needed |
| Backward compatibility (10%) | 5 | No risk |
| Disk footprint (10%) | 5 | Minimal files |
| **Weighted Score** | **2.85** | |

### Alternative 3: Symlink-Based Sharing

Create a shared `.aiwg/deployed/` directory and symlink into each provider's namespace.

| Criterion (Weight) | Score | Reasoning |
|---------------------|-------|-----------|
| User experience parity (25%) | 4 | Artifacts present but symlinks can confuse tools |
| Platform evolution readiness (20%) | 3 | Symlinks may not match expected format |
| Context availability (20%) | 4 | Files reachable but path resolution varies |
| Implementation complexity (15%) | 2 | Cross-platform symlink handling is fragile |
| Backward compatibility (10%) | 3 | Symlinks may break existing workflows |
| Disk footprint (10%) | 5 | Single copy of each file |
| **Weighted Score** | **3.45** | |

**Decision**: Alternative 1 (Universal Deployment) selected. The 1.5-point lead over status quo and 0.9-point lead over symlinks reflects the significant user experience and platform readiness advantages.

## Architecture

### Deployment Flow

```
aiwg use sdlc --provider <provider>
        │
        ▼
┌──────────────────────┐
│  Load Provider Module │  tools/agents/providers/<provider>.mjs
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Collect Source Files │  agents/, commands/, skills/, rules/ from frameworks + addons
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  For each artifact type:                                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Check support[type]                                     │ │
│  │                                                         │ │
│  │  'native'       → transformAgent/Command/Skill/Rule()   │ │
│  │                   → deployToNativePath()                 │ │
│  │                                                         │ │
│  │  'conventional' → applyGenericFormat()                   │ │
│  │                   → deployToConventionalPath()           │ │
│  │                                                         │ │
│  │  'aggregated'   → applyGenericFormat()                   │ │
│  │                   → deployToConventionalPath()           │ │
│  │                   → aggregate() into single file         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  If homeDirectoryDeploy && projectLocalMirror:               │
│    → Also deploy to project-local mirror path                │
│                                                              │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│    postDeploy()      │  Framework workspace init, settings.json, etc.
└──────────────────────┘
```

### Provider Support Matrix (Post-Migration)

| Provider | Agents | Commands | Skills | Rules |
|----------|--------|----------|--------|-------|
| Claude | native | native | native | native |
| Codex | native | native (home + project) | native (home + project) | conventional |
| Copilot | native (YAML) | conventional | conventional | conventional |
| Factory | native | native | conventional | conventional |
| Cursor | conventional | conventional | conventional | native (MDC) |
| OpenCode | native | native | conventional | conventional |
| Warp | aggregated | aggregated | conventional | conventional |
| Windsurf | aggregated | aggregated | conventional | conventional |

Native support count per artifact type:
- **Agents**: 6 native, 1 conventional, 1 aggregated (was: 5 native, 3 null)
- **Commands**: 5 native, 1 conventional, 2 aggregated (was: 4 native, 4 null)
- **Skills**: 2 native, 6 conventional (was: 2 native, 6 null)
- **Rules**: 2 native, 6 conventional (was: 2 native, 6 null)

### Component Diagram

```
tools/agents/
├── deploy-agents.mjs           # Orchestrator (updated to call all 4 deploy functions)
└── providers/
    ├── base.mjs                # ProviderInterface v2 + shared utilities
    ├── claude.mjs              # All native
    ├── codex.mjs               # Native agents/commands/skills, conventional rules
    ├── copilot.mjs             # Native agents, conventional rest
    ├── factory.mjs             # Native agents/commands, conventional rest
    ├── cursor.mjs              # Native rules, conventional rest
    ├── opencode.mjs            # Native agents/commands, conventional rest
    ├── warp.mjs                # Aggregated agents/commands, conventional rest
    └── windsurf.mjs            # Aggregated agents/commands, conventional rest

src/
├── agents/types.ts             # Platform type extended with opencode, warp
├── smiths/platform-paths.ts    # Synchronized with provider paths
└── cli/handlers/use.ts         # PROVIDER_PATHS extended
```

### Synchronization Between JS and TS Path Systems

The dual path system (`tools/agents/providers/base.mjs` and `src/smiths/platform-paths.ts`) is a technical debt item. Until they are unified, both must be updated in lockstep.

**Approach**: Add a `platform-paths.json` canonical config file that both systems read from:

```json
{
  "$schema": "./platform-paths.schema.json",
  "providers": {
    "claude": {
      "workDir": ".claude",
      "paths": {
        "agents": ".claude/agents/",
        "commands": ".claude/commands/",
        "skills": ".claude/skills/",
        "rules": ".claude/rules/"
      },
      "support": {
        "agents": "native",
        "commands": "native",
        "skills": "native",
        "rules": "native"
      }
    }
  }
}
```

Both `platform-paths.ts` and `base.mjs` import from this single source of truth, eliminating the synchronization problem.

## Migration Strategy

### Phase 1: Foundation (Week 1-2)

1. **Create `platform-paths.json`** with all 32 path mappings
2. **Update `ProviderInterface`** in `base.mjs` to v2 (add `support`, `deploySkills`, `deployRules`, remove null paths)
3. **Extend `Platform` type** in `src/agents/types.ts` to include `opencode` and `warp`
4. **Update `platform-paths.ts`** to read from `platform-paths.json`
5. **Add conventional format template** for generic markdown output

### Phase 2: Provider Updates (Week 3-4)

Update each provider in order of complexity (simplest first):

1. **Claude** -- No changes needed (already fully native)
2. **Factory** -- Add `deploySkills()` and `deployRules()` with conventional format
3. **OpenCode** -- Add `deploySkills()` and `deployRules()` with conventional format
4. **Codex** -- Add `deployRules()` conventional, add project-local mirrors for commands/skills
5. **Copilot** -- Add `deployCommands()` (separate from agents), `deploySkills()`, `deployRules()`
6. **Cursor** -- Add `deployAgents()`, `deployCommands()`, `deploySkills()` with conventional format
7. **Windsurf** -- Add discrete `deployAgents()`, `deploySkills()`, `deployRules()` alongside aggregation
8. **Warp** -- Add discrete deployment for all 4 types alongside WARP.md aggregation

### Phase 3: Orchestrator Update (Week 5)

1. **Update `deploy-agents.mjs`** to always call all 4 deploy functions
2. **Update `use.ts` handler** `PROVIDER_PATHS` to include all 4 types for all providers
3. **Update extension registration** to register all artifact types
4. **Add `--deploy-rules` flag** to CLI (currently only `--deploy-commands` and `--deploy-skills` exist)

### Phase 4: Validation and Documentation (Week 6)

1. **Integration tests** for each provider's 4-type deployment
2. **Dry-run validation** across all providers
3. **Update CLAUDE.md** multi-platform support table
4. **Update CLI help text** and `docs/cli-reference.md`

### Backward Compatibility

- All existing paths remain unchanged
- New directories are additive only
- No files are moved or renamed
- Existing `.gitignore` patterns continue to work
- Aggregated files (WARP.md, AGENTS.md) continue to be produced

### Rollback Plan

If issues arise:
1. Set `support[type] = 'disabled'` (a new level) to skip deployment without removing code
2. Conventional directories can be safely deleted without affecting platform functionality
3. The `--legacy` flag could restore v1 behavior by ignoring conventional paths

## Consequences

### Positive

- **Feature parity across all providers**: Every AIWG user gets the same 4 artifact types regardless of platform
- **Future-proof**: When a platform adds native agent/skill/rule support, AIWG artifacts are already in place
- **Context loading**: Users can `@`-mention any artifact on any platform for context
- **Single source of truth**: `platform-paths.json` eliminates the JS/TS path synchronization problem
- **Cleaner interface**: `ProviderInterface v2` eliminates null paths and ad-hoc method names
- **Incremental adoption**: Providers can upgrade from `conventional` to `native` as platforms evolve, requiring only a support level change and transform function

### Negative

- **Increased disk usage**: Each deployment writes approximately 2x more files (conventional directories for previously-null paths). For a full SDLC deployment this adds roughly 200-400KB per provider -- negligible.
- **Potential user confusion**: Users may find directories they didn't expect (e.g., `.cursor/agents/`). Mitigated by adding a `README.md` in each conventional directory explaining its purpose.
- **Gitignore complexity**: Some users may want to ignore conventional directories. Mitigated by documenting recommended `.gitignore` patterns.
- **Migration effort**: All 8 providers need updates. Estimated 2-3 days per provider for the 7 that need changes (Factory through Warp).
- **Aggregation cost**: Warp and Windsurf now produce both discrete files AND aggregated files, slightly increasing deployment time.

### Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Platform claims a conventional directory name | Low | Medium | Use provider-specific prefixes; monitor platform changelogs; directories can be renamed with config change |
| Users accidentally commit large conventional directories | Medium | Low | Provide `.gitignore` template; document in deployment output |
| Performance regression from 2x file writes | Low | Low | Files are small (<50KB each); parallel writes; lazy creation |
| Codex home-dir + project-local creates confusion | Medium | Medium | Clear labeling in deployment output; document the dual-write in `--help` |
| Breaking change in provider module interface | Low | High | Version the ProviderInterface; providers can opt into v2 incrementally |

## References

- `tools/agents/providers/base.mjs` -- Current ProviderInterface definition
- `tools/agents/providers/claude.mjs` -- Reference implementation (fully native)
- `tools/agents/providers/warp.mjs` -- Aggregated provider example
- `tools/agents/providers/cursor.mjs` -- Format-transforming provider example
- `src/agents/types.ts` -- Platform type definition
- `src/smiths/platform-paths.ts` -- TypeScript path system
- `src/cli/handlers/use.ts` -- Use command provider paths
- `.aiwg/architecture/adr/ADR-004-multi-platform-compatibility-strategy.md` -- Predecessor ADR (this decision supersedes Phase 2/3 of that strategy)
