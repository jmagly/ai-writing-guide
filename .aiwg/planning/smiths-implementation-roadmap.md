# Smiths Feature Suite - Implementation Roadmap

## Overview

This document consolidates the implementation plans for three major features that form the "Smiths" ecosystem:

| Feature | Purpose | Priority |
|---------|---------|----------|
| **Toolsmith** | Tool specification generation for subagent scenarios | High |
| **MCPsmith** | MCP server generation from any command/API | High |
| **Enhanced Model Selection** | Flexible model tier system | Medium |
| **Model Catalog** | Living database of AI models with auto-refresh | Medium |

## Architecture Documents

| Feature | ADR | Design Doc |
|---------|-----|------------|
| Toolsmith | `ADR-014-toolsmith-feature-architecture.md` | `toolsmith-implementation-spec.md` |
| MCPsmith | `ADR-014-mcpsmith-mcp-server-generator.md` | `mcpsmith-architecture.md` |
| Model Selection | `ADR-015-enhanced-model-selection.md` | `enhanced-model-selection-design.md` |
| Model Catalog | (Section 9 in Model Selection design) | `enhanced-model-selection-design.md#9` |

## Directory Structure

```
.aiwg/smiths/
├── toolsmith/
│   ├── runtime.json           # Discovered tool catalog
│   ├── runtime-info.md        # Human-readable summary
│   ├── config.json            # Toolsmith configuration
│   ├── index.json             # Searchable tool index
│   └── tools/
│       ├── core/              # Essential tools (git, curl, bash)
│       ├── languages/         # Language runtimes (node, python)
│       ├── utilities/         # CLI utilities (jq, ripgrep)
│       └── custom/            # Project-specific tools
│
└── mcpsmith/
    ├── registry.json          # Server registry
    ├── servers/{id}/          # Generated MCP servers
    │   ├── server.mjs         # Server entry point
    │   ├── manifest.json      # Server manifest
    │   ├── config.json        # Runtime config
    │   └── tools/*.json       # Tool definitions
    ├── templates/             # Generation templates
    └── analyzers/             # Source analyzers

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
        ├── openrouter.json
        └── last-refresh.json
```

---

## Phase 1: Foundation (Weeks 1-2)

### Shared Infrastructure

- [ ] Create `.aiwg/smiths/` directory structure
- [ ] Add `smiths` to CLI help and command routing
- [ ] Create base TypeScript types for both smiths
- [ ] Establish shared utilities module

### Toolsmith Core

- [ ] Implement `aiwg runtime-info --discover` command
- [ ] Create runtime.json schema and generator
- [ ] Build basic tool detection (which, type, command -v)
- [ ] Implement version extraction patterns
- [ ] Create `toolsmith-provider.md` agent definition

### MCPsmith Core

- [ ] Create registry.json schema
- [ ] Build CLI analyzer (--help parsing)
- [ ] Implement basic server scaffolding
- [ ] Create server.mjs template

### Model Selection Core

- [ ] Design models-v2.json schema (backwards compatible)
- [ ] Implement ModelResolver class
- [ ] Add tier definitions (economy, standard, premium, max-quality)
- [ ] Create shorthand mappings

### Model Catalog Foundation

- [ ] Create `~/.local/share/aiwg/catalog/` directory structure
- [ ] Design catalog schema (models.json)
- [ ] Create builtin-models.json with core models
- [ ] Implement sources.json configuration
- [ ] Build CatalogLoader class

**Deliverables:**
- Working `aiwg runtime-info` command
- Basic `aiwg smith new` for CLI tools
- Models v2 schema with backwards compatibility
- Initial model catalog with builtin models

---

## Phase 2: Specification Generation (Weeks 3-4)

### Toolsmith

- [ ] Build tool specification generator
- [ ] Implement man page parsing
- [ ] Create `--help` output analyzer
- [ ] Build spec caching system (`.aiwg/smiths/toolsmith/tools/`)
- [ ] Implement platform-aware spec customization
- [ ] Add `aiwg toolsmith get <tool>` command
- [ ] Add `aiwg toolsmith search <query>` command

### MCPsmith

- [ ] Implement OpenAPI spec analyzer
- [ ] Add REST API to MCP tool mapping
- [ ] Build catalog analyzer (YAML/JSON input)
- [ ] Implement tool input/output schema generation
- [ ] Add Zod validation generation
- [ ] Create `aiwg smith new --from-api` command

### Model Selection

- [ ] Add `aiwg models list` command
- [ ] Add `aiwg models info <model>` command
- [ ] Implement tier resolution in deploy script
- [ ] Add `--model-tier` flag to deploy commands

### Model Catalog Refresh

- [ ] Implement Anthropic API fetcher (free endpoint)
- [ ] Implement OpenRouter API fetcher (free, comprehensive)
- [ ] Implement LiteLLM GitHub fetcher (model pricing data)
- [ ] Build CatalogRefresher with caching
- [ ] Add `aiwg catalog refresh` command
- [ ] Add `aiwg catalog list` command

**Deliverables:**
- Complete tool spec generation with caching
- MCP servers from OpenAPI specs
- CLI commands for model management
- Auto-refreshing model catalog from public sources

---

## Phase 3: Integration & Lifecycle (Weeks 5-6)

### Toolsmith

- [ ] Integrate with subagent Task tool
- [ ] Add tool capability tagging
- [ ] Implement tool index search
- [ ] Build auto-discovery schedule (optional)
- [ ] Create sample tool specs for common tools

### MCPsmith

- [ ] Implement server lifecycle (start/stop/restart)
- [ ] Add health checking
- [ ] Build platform registration (Claude Code, Factory)
- [ ] Add `aiwg smith register --claude` command
- [ ] Implement hot-reload for config changes

### Model Selection

- [ ] Add `aiwg models set-default <tier>` command
- [ ] Implement agent frontmatter `model-tier:` field
- [ ] Add minimum tier enforcement
- [ ] Update deploy-agents.mjs for tier support
- [ ] Create migration script for existing configs

### Model Catalog Integration

- [ ] Add `aiwg catalog info <model>` command
- [ ] Add `aiwg catalog search` command
- [ ] Implement custom model registration (`aiwg catalog add`)
- [ ] Add `aiwg models sync --from-catalog` command
- [ ] Integrate catalog with tier mappings (suggest updates)

**Deliverables:**
- Full subagent integration for Toolsmith
- MCP server lifecycle management
- Complete tier-based deployment
- Model catalog with search and custom models

---

## Phase 4: Polish & Documentation (Weeks 7-8)

### Toolsmith

- [ ] Create comprehensive tool catalog (50+ tools)
- [ ] Write usage documentation
- [ ] Add troubleshooting guide
- [ ] Performance optimization (lazy loading)

### MCPsmith

- [ ] Add `aiwg smith export` for standalone servers
- [ ] Implement natural language generation
- [ ] Create security audit checklist
- [ ] Write MCP server development guide

### Model Selection

- [ ] SDK/DevKit API implementation
- [ ] Runtime model switching
- [ ] Cost estimation utilities
- [ ] Documentation and examples

### Cross-Feature

- [ ] Integration testing suite
- [ ] End-to-end workflow tests
- [ ] Update AIWG documentation
- [ ] Create demo/tutorial content

**Deliverables:**
- Production-ready feature suite
- Comprehensive documentation
- Integration test coverage

---

## CLI Command Summary

### Toolsmith Commands

```bash
aiwg runtime-info                    # Show runtime info
aiwg runtime-info --discover         # Full tool discovery
aiwg runtime-info --verify           # Verify tool availability
aiwg runtime-info --summary          # Output summary

aiwg toolsmith get <tool>            # Get tool specification
aiwg toolsmith search <query>        # Search by capability
aiwg toolsmith list                  # List available tools
aiwg toolsmith refresh               # Rebuild catalog
```

### MCPsmith Commands

```bash
aiwg smith new <id> --from-cli <cmd>     # Create from CLI tool
aiwg smith new <id> --from-api <spec>    # Create from OpenAPI
aiwg smith new <id> --from-catalog <file> # Create from catalog
aiwg smith list                          # List all servers
aiwg smith info <id>                     # Show server details
aiwg smith start/stop/restart <id>       # Lifecycle management
aiwg smith register <id> --claude        # Register with platform
aiwg smith export <id>                   # Export standalone
```

### Model Selection Commands

```bash
aiwg models list                         # List available models
aiwg models list --tier premium          # Filter by tier
aiwg models info <model>                 # Show model details
aiwg models set-default <tier>           # Set default tier

aiwg use sdlc --model-tier max-quality   # Deploy with tier
aiwg use sdlc --model claude-opus-4-5    # Force specific model
```

### Model Catalog Commands

```bash
aiwg catalog list                        # List all models in catalog
aiwg catalog list --provider anthropic   # Filter by provider
aiwg catalog list --tag reasoning        # Filter by tag
aiwg catalog search "opus"               # Search catalog
aiwg catalog info <model-id>             # Show model details

aiwg catalog refresh                     # Refresh from all sources
aiwg catalog refresh --source openrouter # Refresh from specific source
aiwg catalog refresh --force             # Ignore cache

aiwg catalog add <model-id> --interactive # Add custom model
aiwg catalog add <model-id> --from-json   # Add from JSON spec
aiwg catalog remove <model-id>            # Remove custom model

aiwg catalog check                       # Check for updates
aiwg catalog verify                      # Verify against live APIs
aiwg catalog export --format json        # Export catalog
```

---

## Dependencies

### External Packages (Evaluate)

| Package | Purpose | Decision |
|---------|---------|----------|
| `@modelcontextprotocol/sdk` | MCP server implementation | Already used |
| `zod` | Schema validation | Already used |
| `commander` | CLI parsing | Already used |
| `which` | Tool detection | Consider npm package |

### Internal Dependencies

- `src/mcp/server.mjs` - Reference for MCP patterns
- `tools/agents/deploy-agents.mjs` - Deploy integration
- `agentic/code/frameworks/sdlc-complete/config/models.json` - Model config

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tool detection unreliable cross-platform | High | Medium | Extensive testing, fallback patterns |
| MCP spec changes | Medium | Low | Abstract SDK, monitor releases |
| Model pricing changes | Low | High | Advisory-only cost estimates |
| Large tool catalog size | Medium | Medium | Lazy loading, on-demand generation |
| Subagent context limitations | High | Low | Design for minimal context return |

---

## Success Metrics

### Toolsmith
- 50+ tools in default catalog
- <100ms spec retrieval from cache
- Works in subagent scenarios without context issues

### MCPsmith
- Generate working MCP server from CLI tool in <30s
- 100% of generated servers pass health checks
- Seamless platform registration

### Model Selection
- Zero breaking changes for existing configs
- <5s tier resolution overhead
- Clear cost visibility in CLI output

### Model Catalog
- 100+ models from 5+ providers in catalog
- <1s catalog search response
- Weekly auto-refresh with deprecation alerts
- Custom model registration works offline

---

## References

- `.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md`
- `.aiwg/architecture/decisions/ADR-014-mcpsmith-mcp-server-generator.md`
- `.aiwg/architecture/ADR-015-enhanced-model-selection.md`
- `.aiwg/architecture/toolsmith-implementation-spec.md`
- `.aiwg/architecture/mcpsmith-architecture.md`
- `.aiwg/architecture/enhanced-model-selection-design.md`
- `.aiwg/architecture/cli-specification.md`
- `.aiwg/architecture/migration-guide.md`
