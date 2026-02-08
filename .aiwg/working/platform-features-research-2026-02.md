# AI Coding Platform Features Research Report

**Date**: February 6, 2026
**Researcher**: Technical Research Agent
**Purpose**: Document latest features and capabilities of all 8 AI coding platforms for AIWG deployment optimization

---

## Executive Summary

This report documents the current state of platform support across 8 AI coding platforms, based on AIWG codebase analysis and existing documentation as of February 2026. AIWG already has comprehensive deployment support for all platforms with recent improvements in v2026.1.4-v2026.1.7.

### Key Findings

1. **Claude Code** has the most extensive feature set with 29+ new features since v2.0.43 (documented through v2.1.33)
2. **All 8 platforms** have working deployment providers with dynamic addon discovery (Issue #22, v2026.1.7)
3. **Platform-specific optimizations** include home directory deployments for Codex and proper directory structures for all providers
4. **Recent fixes** (v2026.1.4) corrected file location issues across all providers

### Research Limitations

**This report is based entirely on AIWG internal documentation** as direct web access was not available. External platform documentation (GitHub Copilot docs, Cursor docs, etc.) was not directly consulted. Findings should be verified against current external documentation.

---

## Platform-by-Platform Analysis

### 1. Claude Code (Anthropic)

**Deployment Path**: `.claude/agents/`, `.claude/commands/`, `.claude/skills/`
**Status**: ✅ Fully supported, primary development platform
**Last Updated**: v2.1.33 (documented internally)

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Agents | `.claude/agents/*.md` | Markdown with YAML frontmatter | Full support |
| Commands | `.claude/commands/*.md` | Markdown with YAML frontmatter | Slash commands |
| Skills | `.claude/skills/*.md` | Markdown with YAML frontmatter | Natural language workflows |
| Rules | `.claude/rules/*.md` | Markdown | Path-scoped enforcement |
| Hooks | `.claude/hooks/*.js` | JavaScript | Lifecycle hooks |
| MCP Servers | `.claude/mcp.json` | JSON config | Server definitions |

#### Critical New Features (v2.0.43 → v2.1.33)

**Top Priority Features** (P0):

1. **Opus 4.6 Model** (v2.1.32)
   - Most capable model now available
   - AIWG Action: Update orchestration agents to use `opus`
   - Status: Available

2. **Automatic Memory** (v2.1.32)
   - Auto-records and recalls memories across sessions
   - Storage: `~/.claude/projects/<project>/memory/`
   - AIWG Action: Seed MEMORY.md with AIWG patterns
   - Status: Available

3. **Agent Memory Frontmatter** (v2.1.33)
   - `memory: user|project|local` field in agent frontmatter
   - Enables domain knowledge accumulation
   - AIWG Action: Add to all SDLC agents
   - Status: Available

4. **Task(agent_type) Restriction** (v2.1.33)
   - Restrict subagent spawning via `Task(agent_type)` in tools
   - Security-scoped agent hierarchies
   - AIWG Action: Add restrictions to all agents
   - Status: Available

5. **Plugin System** (v2.1.14+)
   - Full plugin marketplace with discovery, installation, SHA pinning
   - AIWG's primary distribution mechanism
   - AIWG Action: Ensure marketplace registration
   - Status: Available

**High Priority Features** (P1):

6. **Agent Teams** (v2.1.32) - **EXPERIMENTAL**
   - Multi-agent collaboration via tmux sessions
   - TeammateIdle and TaskCompleted hooks
   - AIWG Action: Evaluate for SDLC workflows when stable
   - Status: Experimental (requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`)

7. **Async/Background Agents** (v2.0.64, v2.0.60)
   - Agents run in background with wake-up messages
   - `run_in_background: true` parameter
   - AIWG Action: Update parallel-hints documentation
   - Status: Available

8. **Task Management System** (v2.1.16)
   - Built-in task tracking with dependencies
   - TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop
   - AIWG Action: Integrate with Ralph loop tracking
   - Status: Available

9. **PreToolUse additionalContext** (v2.1.9)
   - Hooks can inject context dynamically
   - Lighter-weight than loading everything in CLAUDE.md
   - AIWG Action: Create context injection hooks
   - Status: Available

10. **MCP Tool Search Auto Mode** (v2.1.7)
    - Auto-defer tool descriptions when >10% of context
    - AIWG Action: Optimize MCP server tool descriptions
    - Status: Available

**Medium Priority Features** (P2):

11. **Named Sessions** (v2.0.64)
    - `/rename` to name sessions, `/resume <name>` to resume
    - Enables workflow state persistence
    - AIWG Action: Auto-name sessions on flow start
    - Status: Available

12. **Skills Frontmatter for Subagents** (v2.0.43)
    - `skills:` field to auto-load skills for subagents
    - AIWG Action: Add to relevant agents
    - Status: Available

13. **permissionMode for Custom Agents** (v2.0.43)
    - Fine-grained permission control per agent
    - AIWG Action: Define permission tiers
    - Status: Available

14. **PermissionRequest Hooks** (v2.0.54, v2.0.45)
    - Auto-approve/deny tool permission requests
    - AIWG Action: Auto-approve `.aiwg/` writes
    - Status: Available

15. **SubagentStart/SubagentStop Hooks** (v2.0.43, v2.0.42)
    - Lifecycle hooks with `agent_id` and `agent_transcript_path`
    - Enables native trace collection
    - AIWG Action: Create trace collection hooks
    - Status: Available

16. **@-Mention Fixes** (v2.0.43)
    - Fixed nested CLAUDE.md files loading
    - Reliable cross-file references
    - AIWG Action: Extensive @-mention wiring system (implemented)
    - Status: Available

17. **TaskOutputTool** (v2.0.64)
    - Unified tool replacing AgentOutputTool and BashOutputTool
    - AIWG Action: Update documentation
    - Status: Available

18. **--agent CLI Flag** (v2.0.60, v2.0.59)
    - Override agent setting for current session
    - AIWG Action: Create persona shortcuts
    - Status: Available

19. **Background Tasks with `&`** (v2.0.45)
    - Web users can trigger background workflows with `&` prefix
    - AIWG Action: Document pattern
    - Status: Available

20. **Hook Timeout 10min** (v2.1.3)
    - Increased from 60 seconds to 10 minutes
    - AIWG Action: Enable pre-commit test suites
    - Status: Available

21. **PDF Page Ranges** (v2.1.30)
    - Read tool supports `pages` parameter for PDFs
    - AIWG Action: Optimize research corpus reading
    - Status: Available

22. **Session-PR Linking** (v2.1.27)
    - Auto-link sessions to PRs, `--from-pr` for resuming
    - AIWG Action: Document PR-linked workflows
    - Status: Available

23. **Large Tool Outputs to Disk** (v2.1.2)
    - Large outputs saved to disk, not truncated
    - AIWG Action: Update Ralph loop patterns
    - Status: Available

24. **Partial Summarization** (v2.1.32)
    - "Summarize from here" for partial conversation summarization
    - AIWG Action: Document as context management strategy
    - Status: Available

25. **Skills from Additional Directories** (v2.1.32)
    - Auto-load from `--add-dir` directories
    - Nested `.claude/skills/` auto-discovered
    - AIWG Action: Verify monorepo support
    - Status: Available

26. **Security Fixes** (v2.1.2, v2.1.6, v2.1.7)
    - Fixed permission bypass, wildcard matching, command injection
    - AIWG Action: Audit permission patterns
    - Status: Complete

27. **Indexed Arguments** (v2.1.19)
    - `$ARGUMENTS[0]`, `$ARGUMENTS[1]` for structured arguments
    - AIWG Action: Update skills with structured args
    - Status: Available

28. **Merged Skills and Commands** (v2.1.3)
    - Unified concept, both directories work identically
    - AIWG Action: Consolidate documentation
    - Status: Available

#### Recommended Optimizations

1. **Update all agent definitions** with:
   - `memory: project` or `memory: user`
   - `Task(agent_type)` restrictions
   - Skills frontmatter where applicable

2. **Leverage plugin marketplace** as primary distribution

3. **Create PreToolUse hooks** for dynamic context injection

4. **Adopt auto-memory** with pre-seeded AIWG patterns

5. **Evaluate agent teams** when stable (currently experimental)

#### External Research Needed

- [ ] Verify current Claude Code version (latest beyond v2.1.33?)
- [ ] Check for any new features since v2.1.33
- [ ] Confirm agent teams stability status
- [ ] Verify plugin marketplace URL and registration process

---

### 2. OpenAI Codex CLI

**Deployment Path**: `.codex/agents/` (project), `~/.codex/prompts/` (home), `~/.codex/skills/` (home)
**Status**: ✅ Fully supported
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Agents | `.codex/agents/*.md` | Project-local, Markdown with YAML frontmatter | ✅ |
| Commands/Prompts | `~/.codex/prompts/*.md` | **Home directory** (NOT project) | ✅ |
| Skills | `~/.codex/skills/*.md` | **Home directory** (NOT project) | ✅ |
| Rules | Not supported | - | ❌ |

#### Key Capabilities

- **Model Mapping**: Auto-converts Claude model names to GPT equivalents
  - `opus` → `gpt-5.3-codex`
  - `sonnet` → `codex-mini-latest`
  - `haiku` → `gpt-5-codex-mini`

- **AGENTS.md Aggregation**: `--as-agents-md` option for single-file deployment

- **Home Directory Deployment**: Commands and skills deploy to `~/.codex/` (user-level, not project-level)

#### Recent Fixes (v2026.1.4)

- Fixed command/skill deployment paths (Issue #21)
- Prompts now correctly deploy to `~/.codex/prompts/` (home)
- Skills now correctly deploy to `~/.codex/skills/` (home)
- Previously incorrectly deployed to project directory

#### External Research Needed

- [ ] Verify latest Codex CLI version (February 2026)
- [ ] Check for `.agents/skills/` project-level skill support (mentioned in task)
- [ ] Investigate `codex cloud` tasks feature
- [ ] Research automation/scheduled tasks support
- [ ] Verify memory/context features
- [ ] Check multi-agent support capabilities
- [ ] Confirm SKILL.md format requirements

#### Recommendations

1. **Verify external documentation** for Codex CLI (not available in codebase)
2. **Test `.agents/skills/` support** if mentioned in external docs
3. **Investigate automation features** for Ralph loop integration
4. **Document memory features** if available

---

### 3. GitHub Copilot

**Deployment Path**: `.github/agents/`
**Status**: ✅ Supported
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Agents | `.github/agents/*.md` | Markdown with YAML frontmatter | ✅ |
| Commands | Via deployment script | Markdown | ✅ |
| Skills | Via deployment script | Markdown | ✅ |
| Rules | Not supported | - | ❌ |

#### Key Capabilities

- **Model Mapping**: Auto-converts Claude model names
- **copilot-instructions.md**: Context file integration
- **Dynamic Addon Discovery**: All addons auto-deploy (v2026.1.7)

#### Deployment Commands

```bash
# Deploy to Copilot
aiwg use sdlc --provider copilot

# Regenerate context
/aiwg-regenerate-copilot
```

#### External Research Needed

- [ ] Latest Copilot agent support (custom instructions vs agents)
- [ ] Check for new extensibility features (Feb 2026)
- [ ] Verify skills/rules support
- [ ] Investigate multi-agent capabilities
- [ ] Check for context window improvements

#### Recommendations

1. **Verify GitHub Copilot documentation** for latest agent features
2. **Test custom instructions** vs agent deployment
3. **Check for new API/extensibility** features

---

### 4. Factory AI

**Deployment Path**: `.factory/droids/`, `AGENTS.md`
**Status**: ✅ Fully supported
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Droids | `.factory/droids/*.md` | Markdown with YAML frontmatter | ✅ |
| Commands | Via aggregation | Markdown | ✅ |
| Skills | Via aggregation | Markdown | ✅ |
| AGENTS.md | Project root | Aggregated agents | ✅ |

#### Key Capabilities

- **Droid System**: Custom droids deployed to `.factory/droids/`
- **Manual Import Required**: Factory requires manual import for security
- **AGENTS.md**: Aggregated agent directory
- **Model Mapping**: Auto-converts model names

#### Deployment Process

```bash
# Deploy
aiwg use sdlc --provider factory --create-agents-md

# In Factory UI
droid .
/droids
# Press 'I' → 'A' → Enter to import
```

#### Known Issues & Solutions

From troubleshooting docs:

1. **Custom Droids not enabled**: Enable in `/settings` → Experimental
2. **Droids not appearing**: Manual import required (security feature)
3. **AGENTS.md not loading**: Redeploy with `--create-agents-md`

#### External Research Needed

- [ ] Latest Factory AI version and features
- [ ] Check for command support improvements
- [ ] Verify skill format requirements
- [ ] Investigate automation capabilities
- [ ] Check for new droid features

#### Recommendations

1. **Verify Factory AI documentation** for latest features
2. **Test automation support** for scheduled tasks
3. **Document manual import workflow** more prominently

---

### 5. Cursor IDE

**Deployment Path**: `.cursor/rules/`, `AGENTS.md`
**Status**: ✅ Fully supported
**Last Provider Update**: v2026.1.4

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Rules | `.cursor/rules/*.mdc` | MDC format (Markdown with metadata) | ✅ |
| AGENTS.md | Project root | Aggregated agents | ✅ |
| MCP | `.cursor/mcp.json` | JSON config | ✅ Optional |

#### Key Capabilities

- **Rules System**: `.cursorrules` and `.cursor/rules/*.mdc`
- **MDC Format**: Markdown with enhanced metadata
- **Intelligent Regeneration**: `/aiwg-regenerate-cursorrules` for natural language mapping
- **@-mention Support**: Invoke agents via @-mention

#### Recent Fixes (v2026.1.4)

- Fixed rules deployment path (Issue #21)
- Rules now deploy to `<project>/.cursor/rules/`
- Previously deployed `.mdc` files to project root

#### Deployment Process

```bash
# Deploy
aiwg use sdlc --provider cursor

# Regenerate for intelligent integration
/aiwg-regenerate-cursorrules

# Use agents
@security-architect Review authentication
@test-engineer Generate tests
```

#### External Research Needed

- [ ] Latest Cursor version and features
- [ ] Check for new agent support capabilities
- [ ] Verify rules system enhancements
- [ ] Investigate command support
- [ ] Check for skill system support

#### Recommendations

1. **Verify Cursor documentation** for latest `.cursor/rules/` features
2. **Test MDC format** enhancements
3. **Document @-mention patterns** more clearly

---

### 6. OpenCode

**Deployment Path**: `.opencode/agent/`, `AGENTS.md`
**Status**: ✅ Supported
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| Agents | `.opencode/agent/*.md` | Markdown with YAML frontmatter | ✅ |
| AGENTS.md | Project root | Aggregated agents | ✅ |
| Commands | Via aggregation | Markdown | ✅ |
| Skills | Via aggregation | Markdown | ✅ |

#### Key Capabilities

- **Agent System**: Agents deployed to `.opencode/agent/`
- **AGENTS.md**: Aggregated agent directory
- **Model Mapping**: Auto-converts model names
- **Dynamic Addon Discovery**: All addons auto-deploy (v2026.1.7)

#### Deployment Commands

```bash
# Deploy to OpenCode
aiwg use sdlc --provider opencode --create-agents-md
```

#### External Research Needed

- [ ] Latest OpenCode version and features (Feb 2026)
- [ ] Check for agent and command system enhancements
- [ ] Verify extensibility features
- [ ] Investigate skill support
- [ ] Check for new platform capabilities

#### Recommendations

1. **Verify OpenCode documentation** (platform less documented in codebase)
2. **Test agent deployment** and validation
3. **Document any new features** discovered

---

### 7. Warp Terminal

**Deployment Path**: `WARP.md` (symlinked to CLAUDE.md)
**Status**: ✅ Supported
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| WARP.md | Project root | Markdown (aggregated) | ✅ Symlinked |
| Commands | Embedded in WARP.md | Markdown | ✅ |
| Skills | Embedded in WARP.md | Markdown | ✅ |

#### Key Capabilities

- **WARP.md**: Single file containing all context
- **Symlink to CLAUDE.md**: Shares configuration with Claude Code
- **Terminal Workflows**: Optimized for terminal-based AI
- **Simple Command Support**: Basic command invocation

#### Known Limitations

- **File Size**: Can truncate if WARP.md too large
- **Context Caching**: May need `/init` to reindex
- **Limited Orchestration**: Not ideal for complex multi-agent workflows

#### Best Practices

From troubleshooting docs:

| Task | Best Platform |
|------|---------------|
| Multi-agent orchestration | Claude Code (not Warp) |
| Terminal workflows | Warp ✅ |
| Simple commands | Warp ✅ |
| Full artifact generation | Claude Code (not Warp) |

#### External Research Needed

- [ ] Latest Warp Terminal version
- [ ] Check for AI features beyond WARP.md
- [ ] Verify discrete file support for agents/commands
- [ ] Investigate context window limits
- [ ] Check for new terminal AI capabilities

#### Recommendations

1. **Document file size limits** more precisely
2. **Test discrete file support** if available
3. **Optimize WARP.md generation** for smaller size

---

### 8. Windsurf (Codeium)

**Deployment Path**: `.windsurf/workflows/`, `AGENTS.md`, `.windsurfrules`
**Status**: ⚠️ Experimental (untested)
**Last Provider Update**: v2026.1.7

#### Artifact Types Supported

| Type | Location | Format | Notes |
|------|----------|--------|-------|
| AGENTS.md | Project root | Plain markdown, no YAML | ✅ Aggregated |
| Workflows | `.windsurf/workflows/*.md` | Plain markdown | ✅ Commands as workflows |
| .windsurfrules | Project root | Orchestration context | ✅ |

#### Key Capabilities

- **Aggregated Output**: All agents in single AGENTS.md
- **Plain Markdown**: No YAML frontmatter
- **Capabilities Tags**: `<capabilities>` for tools
- **Workflow Format**: Commands as workflows
- **Orchestration File**: `.windsurfrules` with key agents and patterns

#### Experimental Status

**Warning displayed on deploy**:
```
[EXPERIMENTAL] Windsurf provider support is experimental and untested.
Please report issues: https://github.com/jmagly/ai-writing-guide/issues
```

#### Provider Features

From `windsurf.mjs`:

1. **Agent Transformation**: YAML frontmatter → plain markdown with capabilities tags
2. **Workflow 12000 char limit**: Warning if exceeded
3. **Table of Contents**: Auto-generated in AGENTS.md
4. **Natural Language Patterns**: Embedded in `.windsurfrules`

#### External Research Needed

- [ ] **CRITICAL**: Verify Windsurf/Codeium current features (Feb 2026)
- [ ] Check agent system support
- [ ] Verify workflow system capabilities
- [ ] Test AGENTS.md format compatibility
- [ ] Investigate native extensibility features
- [ ] Check for command/skill support

#### Recommendations

1. **Test Windsurf deployment** and validate experimental status
2. **Gather user feedback** on Windsurf support
3. **Update experimental status** based on testing
4. **Document known limitations** if found

---

## Cross-Platform Comparison Matrix

### Artifact Type Support

| Platform | Agents | Commands | Skills | Rules | Hooks | MCP |
|----------|--------|----------|--------|-------|-------|-----|
| Claude Code | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Codex | ✅ Project | ✅ Home | ✅ Home | ❌ | ❌ | ❓ |
| Copilot | ✅ | ✅ | ✅ | ❌ | ❌ | ❓ |
| Factory | ✅ Droids | ✅ Aggregated | ✅ Aggregated | ❌ | ❌ | ❓ |
| Cursor | ✅ AGENTS.md | ✅ Rules | ✅ Rules | ✅ MDC | ❌ | ✅ Optional |
| OpenCode | ✅ | ✅ Aggregated | ✅ Aggregated | ❌ | ❌ | ❓ |
| Warp | ✅ Embedded | ✅ Embedded | ✅ Embedded | ❌ | ❌ | ❌ |
| Windsurf | ✅ AGENTS.md | ✅ Workflows | ❓ | ✅ .windsurfrules | ❌ | ❓ |

### Deployment Location Patterns

| Platform | Agents | Commands | Skills | Context File |
|----------|--------|----------|--------|--------------|
| Claude | `.claude/agents/` | `.claude/commands/` | `.claude/skills/` | `CLAUDE.md` |
| Codex | `.codex/agents/` | `~/.codex/prompts/` | `~/.codex/skills/` | `AGENTS.md` |
| Copilot | `.github/agents/` | Script-deployed | Script-deployed | `copilot-instructions.md` |
| Factory | `.factory/droids/` | Aggregated | Aggregated | `AGENTS.md` |
| Cursor | `AGENTS.md` | `.cursor/rules/*.mdc` | `.cursor/rules/*.mdc` | `.cursorrules` |
| OpenCode | `.opencode/agent/` | Aggregated | Aggregated | `AGENTS.md` |
| Warp | Embedded | Embedded | Embedded | `WARP.md` |
| Windsurf | `AGENTS.md` | `.windsurf/workflows/` | ❓ | `.windsurfrules` |

### Format Support

| Platform | YAML Frontmatter | Plain Markdown | JSON | Special Format |
|----------|------------------|----------------|------|----------------|
| Claude | ✅ Required | ❌ | ❌ | - |
| Codex | ✅ Required | ❌ | ❌ | - |
| Copilot | ✅ Required | ❌ | ❌ | - |
| Factory | ✅ Required | ❌ | ❌ | - |
| Cursor | ❌ | ✅ | ❌ | MDC (metadata + markdown) |
| OpenCode | ✅ Required | ❌ | ❌ | - |
| Warp | ❌ | ✅ | ❌ | - |
| Windsurf | ❌ | ✅ Plain | ❌ | `<capabilities>` tags |

---

## Recent AIWG Platform Improvements

### v2026.1.7 - "Deploy All Commands" (January 14, 2026)

**Impact**: All commands now deploy to all providers

- Removed priority filtering from command deployment
- ALL commands from core addons now deploy (not just curated subset)
- `aiwg-utils` commands now work on Codex/Cursor
- 30 commands including: regenerate*, devkit-*, mention-*, workspace-*

### v2026.1.4 - "Provider File Locations Fix" (January 14, 2026)

**Impact**: Fixed deployment paths for all providers

- Codex prompts/skills now correctly deploy to `~/.codex/` (home directory)
- Cursor rules now deploy to `.cursor/rules/` (not project root)
- CLI `--provider` flag now propagates to addon deployments
- Removed 115 lines of dead Windsurf code
- New comprehensive test suite: `provider-file-locations.test.ts`

### Dynamic Addon Discovery (Issue #22)

**Impact**: New addons work across all 8 providers without code changes

- All providers use `getAddonAgentFiles()`, `getAddonCommandFiles()`, `getAddonSkillDirs()`
- No more hardcoded addon paths
- Ralph addon support now works everywhere
- Updated: claude.mjs, codex.mjs, copilot.mjs, and all other providers

---

## Recommendations for Universal Deployment Strategy

### Immediate Actions

1. **Verify external platform documentation** for all 8 platforms (not available in this research)
   - Check for features mentioned in task (Codex `.agents/skills/`, `codex cloud`, etc.)
   - Verify current platform versions
   - Document any new features since late 2025

2. **Test Windsurf experimental support**
   - Gather user feedback
   - Update experimental status
   - Document limitations if found

3. **Optimize Claude Code adoption**
   - Update agent definitions with new frontmatter (memory, Task restrictions)
   - Leverage plugin marketplace
   - Create PreToolUse hooks for context injection
   - Seed auto-memory with AIWG patterns

### Platform-Specific Optimizations

**Claude Code** (Primary Platform):
- ✅ Full feature support - leverage all 29+ new features
- ✅ Update agents with memory and Task restrictions
- ✅ Create hooks for trace collection, permissions, sessions

**Codex**:
- ✅ Home directory deployment working (v2026.1.4)
- ⚠️ Verify `.agents/skills/` project-level support (external research needed)
- ⚠️ Investigate `codex cloud` tasks feature (external research needed)

**Copilot**:
- ⚠️ Verify latest agent support capabilities (external research needed)
- ⚠️ Check for new extensibility features (external research needed)

**Factory**:
- ✅ Droid system working
- ✅ Document manual import requirement more prominently

**Cursor**:
- ✅ Rules system working (v2026.1.4)
- ⚠️ Verify latest MDC format enhancements (external research needed)

**OpenCode**:
- ⚠️ Platform less documented - needs external research

**Warp**:
- ✅ Working for terminal workflows
- ⚠️ Document file size limits more precisely

**Windsurf**:
- ⚠️ Experimental status - needs testing and user feedback
- ⚠️ Critical: Verify current Codeium/Windsurf features (external research needed)

### Documentation Priorities

1. **Create platform comparison guide** with use case recommendations
2. **Document feature parity matrix** across platforms
3. **Update quickstart guides** with latest platform features
4. **Create troubleshooting matrix** for platform-specific issues
5. **Document migration paths** between platforms

---

## External Research Required

This report documents internal AIWG knowledge only. The following external research is required:

### Critical (P0)

- [ ] **Claude Code**: Latest version beyond v2.1.33, new features since Feb 2026
- [ ] **Windsurf/Codeium**: Current agent/workflow support, validate experimental status
- [ ] **Codex CLI**: Latest version, verify `.agents/skills/`, `codex cloud` features

### High Priority (P1)

- [ ] **GitHub Copilot**: Latest agent support, new extensibility features
- [ ] **Cursor**: Latest version, MDC format enhancements, agent support
- [ ] **Factory AI**: Latest droid system features, automation capabilities

### Medium Priority (P2)

- [ ] **OpenCode**: Current feature set, agent/command system enhancements
- [ ] **Warp Terminal**: AI features, context window limits, discrete file support

### Research Sources

Suggested external documentation to consult:

1. **Claude Code**: Anthropic Claude Code changelog and documentation
2. **Codex**: OpenAI Codex CLI documentation (February 2026)
3. **GitHub Copilot**: GitHub Copilot changelog and docs
4. **Cursor**: Cursor IDE documentation and release notes
5. **Factory AI**: Factory AI droid documentation
6. **OpenCode**: OpenCode platform documentation
7. **Warp Terminal**: Warp AI features documentation
8. **Windsurf**: Codeium Windsurf documentation and features

---

## Conclusion

AIWG has **comprehensive multi-platform support** with working deployment providers for all 8 platforms as of v2026.1.7. Recent improvements include:

- ✅ Dynamic addon discovery across all platforms
- ✅ Fixed deployment paths for all providers
- ✅ All commands deploying to all platforms
- ✅ Comprehensive test coverage for deployments

**Claude Code remains the primary platform** with the most extensive feature set (29+ documented features v2.0.43→v2.1.33). Other platforms have varying levels of support with known working deployment paths.

**External research is critical** to verify:
- Current platform versions and features (Feb 2026)
- Features mentioned in task requirements (Codex skills, cloud tasks, etc.)
- New capabilities since late 2025
- Windsurf experimental status validation

**Next steps**:
1. Conduct external platform documentation review
2. Test Windsurf deployment with users
3. Update AIWG to leverage Claude Code new features
4. Document platform comparison and migration paths

---

## Appendix: Provider Implementation Files

For reference, provider implementations located in:

```
tools/agents/providers/
├── base.mjs            # Shared utilities
├── claude.mjs          # Claude Code provider
├── codex.mjs           # OpenAI Codex provider
├── copilot.mjs         # GitHub Copilot provider
├── cursor.mjs          # Cursor IDE provider
├── factory.mjs         # Factory AI provider
├── opencode.mjs        # OpenCode provider
├── warp.mjs            # Warp Terminal provider
└── windsurf.mjs        # Windsurf provider (experimental)
```

Test coverage:
```
test/integration/
├── provider-file-locations.test.ts  # All 8 providers
├── claude-code-deployment.test.ts
└── cursor-deployment.test.ts
```

---

**Report Status**: ✅ Complete (based on internal documentation)
**External Verification Required**: Yes
**Last Updated**: February 6, 2026
