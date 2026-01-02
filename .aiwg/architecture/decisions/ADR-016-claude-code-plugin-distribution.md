# ADR-016: Claude Code Plugin Distribution

## Status

**ACCEPTED**

## Date

2025-12-26

## Context

AIWG currently distributes via npm package (`npm install -g aiwg`) with CLI-based deployment (`aiwg use sdlc`). Claude Code introduced native plugin support in October 2025, enabling direct installation via `/plugin install` command with automatic discovery, updates, and better integration.

### Current Distribution Model

- **npm package**: `aiwg` (global install)
- **Curl install**: `tools/install/install.sh`
- **CLI deployment**: `aiwg -deploy-agents --mode sdlc`
- **Multi-provider**: Claude Code, Factory AI, Copilot, Cursor, OpenCode, Codex

### Claude Code Plugin Benefits

1. **Native integration**: Plugins load automatically without CLI
2. **Discovery**: Marketplace browsing and search
3. **Updates**: Automatic version management
4. **Dependencies**: Plugin-level dependency resolution
5. **Skills**: Auto-triggering based on context
6. **MCP integration**: Direct `.mcp.json` configuration

### Distribution Model Characteristics

Claude Code uses a **decentralized distribution model**:

- **No central registry**: No account signup or approval process required
- **Git-based**: Marketplaces are simply git repositories with `marketplace.json`
- **Self-hosted**: Publishers host their own marketplace on GitHub/GitLab/etc.
- **Direct access**: Users add marketplaces via repository URL
- **No authentication**: Public repositories require no credentials to install from

This differs from npm-style centralized registries. There's no "publishing" step - you commit your marketplace.json and it's immediately available to anyone who adds your repository.

### Constraints

- Must maintain backward compatibility with npm users
- Should support modular installation (not all-or-nothing)
- Need architecture for future premium plugins
- Must work alongside existing multi-provider deployment

## Decision

Implement **dual distribution** model:

1. **npm distribution** (unchanged): `npm install -g aiwg`
   - Full CLI functionality
   - Multi-provider deployment via `aiwg use <framework>`
   - Required for non-Claude Code platforms

2. **Claude Code plugin distribution** (new): `/plugin install sdlc@aiwg`
   - Native Claude Code integration
   - Modular plugins (6 separate plugins)
   - Marketplace at `jmagly/ai-writing-guide`

### Plugin Architecture

Package AIWG components as 6 modular plugins (naming: `<plugin>@aiwg`):

| Plugin | Source | Type |
|--------|--------|------|
| `sdlc` | `frameworks/sdlc-complete/` | Framework |
| `marketing` | `frameworks/media-marketing-kit/` | Framework |
| `voice` | `addons/voice-framework/` | Addon |
| `writing` | `addons/writing-quality/` | Addon |
| `utils` | `addons/aiwg-utils/` | Core |
| `hooks` | `addons/aiwg-hooks/` | Addon |

### Directory Structure

```
plugins/
├── .claude-plugin/
│   └── marketplace.json
├── sdlc/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── agents/
│   ├── commands/
│   ├── skills/
│   └── README.md
└── ...
```

### Build Process

New packaging script (`tools/plugin/package-plugins.mjs`) will:
1. Read AIWG manifests from `agentic/code/frameworks/` and `agentic/code/addons/`
2. Transform to Claude Code `plugin.json` format
3. Copy agents, commands, skills to plugin directories
4. Generate `marketplace.json`

### Premium Plugin Architecture

Support future paid plugins via:
- Separate private repository (`jmagly/aiwg-premium`)
- License validation hooks
- GitHub access control

## Alternatives Considered

### Alternative 1: Plugin Only (Deprecate npm)

Migrate entirely to Claude Code plugins, deprecate npm.

**Rejected because:**
- Breaks backward compatibility
- Excludes non-Claude Code users (Factory AI, Copilot, etc.)
- Loses CLI functionality

### Alternative 2: Single Mega-Plugin

Package all 97 agents, 97 commands, 31 skills into one plugin.

**Rejected because:**
- Users forced to install everything
- Large download size
- No clear upgrade path to premium

### Alternative 3: Separate Marketplace Repository

Create `jmagly/aiwg-marketplace` separate from main repo.

**Deferred because:**
- Extra maintenance burden
- Version sync complexity
- Can be done later if needed

Using `.claude-plugin/` at repo root is the standard approach.

## Consequences

### Positive

- **Better UX for Claude Code users**: Native `/plugin install` experience
- **Discoverability**: Marketplace search and browse
- **Modular adoption**: Install only what you need
- **Backward compatible**: npm continues to work
- **Premium ready**: Architecture supports paid plugins

### Negative

- **Maintenance overhead**: Two distribution channels
- **Build complexity**: New packaging script required
- **Documentation burden**: Must document both methods
- **Version sync**: Must keep npm and plugins aligned

### Neutral

- **CI/CD changes**: New GitHub Action for plugin builds
- **Directory structure**: New `plugins/` directory in repo

## Implementation

### Phase 1: Plugin Manifests (Day 1)

- Create `plugins/` directory structure
- Create `plugin.json` for each of 9 plugins
- Create `marketplace.json`

### Phase 2: Build System (Days 2-3)

- Create `tools/plugin/package-plugins.mjs`
- Create `tools/plugin/manifest-transformer.mjs`
- Add CLI commands: `--package-plugin`, `--package-all-plugins`

### Phase 3: Distribution (Day 4)

- Create `.github/workflows/build-plugins.yml`
- Test marketplace registration
- Validate plugin installation

### Phase 4: Documentation (Days 5-6)

- Update README.md with plugin installation
- Update USAGE_GUIDE.md
- Update CLAUDE.md
- Create plugin-specific READMEs

### Phase 5: Premium Architecture (Day 7)

- Document premium plugin structure
- Create license validation hooks template
- Plan separate premium marketplace

## References

- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Plugin marketplaces - Claude Code Docs](https://code.claude.com/docs/en/plugin-marketplaces)
- [Customize Claude Code with plugins - Claude Blog](https://claude.com/blog/claude-code-plugins)
- Implementation plan: `/home/roctinam/.claude/plans/majestic-herding-shannon.md`

## Related ADRs

- ADR-008: Plugin Type Taxonomy (established addon/framework/extension categories)
- ADR-007: Framework-Scoped Workspace Architecture (directory structure patterns)

---

**Decision made by**: Architecture Designer
**Approved by**: Project Manager
**Implementation assigned to**: Software Implementer
