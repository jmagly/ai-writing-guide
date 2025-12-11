# Factory AI Integration Update Plan

## Executive Summary

This plan updates AIWG's Factory AI integration to leverage all current Factory features (December 2025) while ensuring seamless management without conflicts with Claude Code, OpenAI, or other platforms.

**Current State**: Basic droid deployment with tool mapping and model conversion
**Target State**: Full-featured integration with Skills, MCP, Hooks, AGENTS.md, Mixed Models, and Droid Exec

## Gap Analysis

### Factory AI Current Features (December 2025)

| Feature | Factory Docs Location | AIWG Current Support | Gap |
|---------|----------------------|---------------------|-----|
| Custom Droids | `/cli/configuration/custom-droids.mdx` | ✅ Full support | None |
| Skills | `/cli/configuration/skills.mdx` | ❌ Not deployed | **HIGH** |
| AGENTS.md | `/cli/configuration/agents-md.mdx` | ⚠️ Partial (manual flag) | **MEDIUM** |
| MCP Servers | `/cli/configuration/mcp.mdx` | ❌ Not integrated | **HIGH** |
| Hooks | `/cli/configuration/hooks-guide.mdx` | ❌ Not deployed | **MEDIUM** |
| Mixed Models | `/cli/configuration/mixed-models.mdx` | ⚠️ CLI override only | **LOW** |
| Droid Exec | `/cli/droid-exec/overview.mdx` | ❌ Not supported | **MEDIUM** |
| Claude Code Import | `/droids` → Import | ✅ Documented | None |
| reasoningEffort | Settings | ❌ Not mapped | **LOW** |

### Platform Isolation Analysis

| Platform | Config Dir | Agents Dir | Commands Dir | Context File | Conflicts |
|----------|-----------|------------|--------------|--------------|-----------|
| Claude Code | `.claude/` | `.claude/agents/` | `.claude/commands/` | `CLAUDE.md` | None |
| Factory | `.factory/` | `.factory/droids/` | `.factory/commands/` | `AGENTS.md` | None* |
| OpenAI/Codex | `.codex/` | `.codex/agents/` | N/A | `AGENTS.md` | AGENTS.md shared |
| Warp Terminal | N/A | N/A | N/A | `WARP.md` | None |

*AGENTS.md is optional for Factory but standard for OpenAI. Plan: Use different content strategies.

---

## Phase 1: Skills System Integration (P0 - HIGH)

### 1.1 Add Skills Deployment to CLI

**Factory Skills Location**: `.factory/skills/<skill-name>/SKILL.md`

**Implementation**:

```bash
# New CLI command
aiwg -deploy-skills --provider factory --mode sdlc

# Or combined with agents
aiwg -deploy-agents --provider factory --mode sdlc --deploy-skills
```

**Changes Required**:

1. **New file**: `tools/agents/deploy-skills.mjs`
   - Scan `agentic/code/addons/*/skills/` and `agentic/code/frameworks/*/skills/`
   - Transform Claude Code SKILL.md format to Factory SKILL.md format
   - Create `.factory/skills/<skill-name>/SKILL.md` structure

2. **Update**: `tools/agents/deploy-agents.mjs`
   - Add `--deploy-skills` flag
   - Call deploy-skills after agent deployment

3. **Create Factory-format skills from existing AIWG skills**:
   - `voice-apply` → `.factory/skills/voice-apply/SKILL.md`
   - `voice-create` → `.factory/skills/voice-create/SKILL.md`
   - `voice-blend` → `.factory/skills/voice-blend/SKILL.md`
   - `voice-analyze` → `.factory/skills/voice-analyze/SKILL.md`
   - `ai-pattern-detection` → `.factory/skills/ai-pattern-detection/SKILL.md`
   - `claims-validator` → `.factory/skills/claims-validator/SKILL.md`
   - `config-validator` → `.factory/skills/config-validator/SKILL.md`
   - `nl-router` → `.factory/skills/nl-router/SKILL.md`
   - `parallel-dispatch` → `.factory/skills/parallel-dispatch/SKILL.md`
   - `project-awareness` → `.factory/skills/project-awareness/SKILL.md`
   - `template-engine` → `.factory/skills/template-engine/SKILL.md`

4. **Skill format transformation**:
   ```markdown
   # Claude Code Format (current)
   ---
   name: voice-apply
   description: Apply voice profile to content
   ---
   [instructions]

   # Factory Format (target)
   ---
   name: voice-apply
   description: Apply voice profile to content. Use when user asks to write in a specific voice, match a tone, apply a style, or transform content.
   ---
   # Voice Apply

   ## Instructions
   [step-by-step workflow]

   ## Success Criteria
   [what completion looks like]
   ```

### 1.2 Skills Registry

**Create**: `agentic/code/config/skills-registry.json`

```json
{
  "skills": {
    "voice-apply": {
      "source": "voice-framework",
      "platforms": ["claude", "factory"],
      "category": "writing"
    },
    "claims-validator": {
      "source": "aiwg-utils",
      "platforms": ["claude", "factory"],
      "category": "validation"
    }
  }
}
```

---

## Phase 2: MCP Server Integration (P0 - HIGH)

### 2.1 AIWG MCP Server for Factory

**Current**: AIWG MCP server exists (`src/mcp/server.mjs`) but isn't configured for Factory.

**Implementation**:

1. **Create Factory MCP config template**: `.factory/mcp.json.template`
   ```json
   {
     "mcpServers": {
       "aiwg": {
         "type": "stdio",
         "command": "node",
         "args": ["${AIWG_ROOT}/src/mcp/server.mjs"],
         "disabled": false
       }
     }
   }
   ```

2. **Add CLI command**:
   ```bash
   aiwg mcp install factory  # Add AIWG MCP to Factory config
   aiwg mcp serve factory    # Start with Factory-compatible options
   ```

3. **Update**: `bin/aiwg.mjs`
   - Add `mcp install factory` subcommand
   - Auto-configure `~/.factory/mcp.json` or `.factory/mcp.json`

4. **Document MCP tools exposed to Factory**:
   - `workflow-run` - Execute AIWG workflows
   - `artifact-read` - Read from `.aiwg/`
   - `artifact-write` - Write to `.aiwg/`
   - `template-render` - Render AIWG templates
   - `agent-list` - List available agents

### 2.2 MCP Tool Documentation for Factory Users

**Create**: `docs/integrations/factory-mcp.md`
- How to add AIWG MCP to Factory
- Available tools and their usage
- Example workflows

---

## Phase 3: Hooks Integration (P1 - MEDIUM)

### 3.1 AIWG Hooks Templates for Factory

**Current**: `aiwg-hooks` addon has Claude Code hooks but not Factory format.

**Implementation**:

1. **Create Factory hooks templates**: `agentic/code/addons/aiwg-hooks/factory/`
   ```
   agentic/code/addons/aiwg-hooks/factory/
   ├── aiwg-trace.sh              # Equivalent of aiwg-trace.js
   ├── markdown-formatter.py       # From Factory docs
   ├── code-validation.sh         # TypeScript/lint validation
   └── templates/
       └── hooks-config.json       # Template for settings.json hooks section
   ```

2. **Create hooks deployment command**:
   ```bash
   aiwg -deploy-hooks --provider factory
   ```

3. **Hook mapping**:
   | AIWG Hook | Factory Event | Purpose |
   |-----------|--------------|---------|
   | aiwg-trace | SubagentStop | Log workflow execution |
   | format-markdown | PostToolUse (Edit) | Auto-format markdown |
   | validate-code | PreToolUse (Execute) | Validate before execution |

### 3.2 Hooks Configuration Template

**Add to deployment**: Offer to configure `~/.factory/settings.json` hooks section

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "\"$FACTORY_PROJECT_DIR\"/.factory/hooks/aiwg-trace.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 4: AGENTS.md Enhancement (P1 - MEDIUM)

### 4.1 Unified AGENTS.md Strategy

**Problem**: Both Factory and OpenAI use AGENTS.md but expect different content.

**Solution**: Platform-aware AGENTS.md generation

**Implementation**:

1. **Update**: `/aiwg-regenerate-factory` command
   - Generate Factory-optimized AGENTS.md (≤150 lines per Factory best practices)
   - Include Build & Test, Architecture, Conventions sections
   - Reference `.factory/droids/` and `.factory/skills/`

2. **Create**: `agentic/code/addons/aiwg-utils/templates/AGENTS.md.factory.template`
   ```markdown
   # {{PROJECT_NAME}}

   {{PROJECT_DESCRIPTION}}

   ## Build & Test
   {{BUILD_COMMANDS}}

   ## Architecture Overview
   {{ARCHITECTURE_SUMMARY}}

   ## Conventions & Patterns
   {{CONVENTIONS}}

   ## AIWG SDLC Framework

   This project uses AIWG for SDLC orchestration.

   - **Droids**: `.factory/droids/` (53 SDLC agents)
   - **Skills**: `.factory/skills/` (voice, validation, orchestration)
   - **Commands**: `.factory/commands/` (42+ flow commands)
   - **Artifacts**: `.aiwg/` (intake, requirements, architecture, testing, deployment)

   ### Natural Language Workflows

   - "Start security review" → security-architect + security-gatekeeper
   - "Create architecture baseline" → architecture-designer + reviewers + synthesizer
   - "Deploy to production" → deployment-manager + reliability-engineer

   See `.factory/droids/` for full agent catalog.
   ```

3. **Add flag to deploy-agents**:
   ```bash
   aiwg -deploy-agents --provider factory --create-agents-md  # Already exists
   # Enhance to use Factory-optimized template
   ```

### 4.2 Conflict Resolution

**When both Claude Code and Factory are deployed**:

1. `CLAUDE.md` - Claude Code context (current)
2. `AGENTS.md` - Factory/OpenAI context
3. No conflict - different files

**Detection logic in CLI**:
```javascript
if (fs.existsSync('CLAUDE.md') && provider === 'factory') {
  console.log('Note: CLAUDE.md exists for Claude Code. Creating separate AGENTS.md for Factory.');
}
```

---

## Phase 5: Mixed Models & Reasoning Effort (P2 - LOW)

### 5.1 reasoningEffort Support

**Factory supports**: `off`, `none`, `low`, `medium`, `high`

**Implementation**:

1. **Update models.json schema**:
   ```json
   {
     "factory": {
       "reasoning": {
         "model": "claude-opus-4-5-20251101",
         "reasoningEffort": "high"
       },
       "coding": {
         "model": "claude-sonnet-4-5-20250929",
         "reasoningEffort": "medium"
       },
       "efficiency": {
         "model": "claude-haiku-3-5",
         "reasoningEffort": "off"
       }
     }
   }
   ```

2. **Update deploy-agents.mjs**:
   - Read reasoningEffort from models.json
   - Add to droid frontmatter when deploying to Factory

3. **Update droid frontmatter generation**:
   ```yaml
   ---
   name: architecture-designer
   description: Designs scalable architectures
   model: claude-opus-4-5-20251101
   reasoningEffort: high
   tools: ["Read", "LS", "Grep", "Glob", "Edit", "Create", "Task", "TodoWrite"]
   ---
   ```

### 5.2 Mixed Models Documentation

**Update**: `docs/integrations/factory-quickstart.md`
- Document reasoningEffort options
- Show how to configure per-agent reasoning levels
- Explain cost/quality tradeoffs

---

## Phase 6: Droid Exec (Headless) Support (P2 - MEDIUM)

### 6.1 GitHub Actions Integration

**Factory provides**: `Factory-AI/droid-action@v1`

**Implementation**:

1. **Create workflow templates**: `agentic/code/frameworks/sdlc-complete/templates/ci-cd/`
   ```yaml
   # .github/workflows/aiwg-droid-review.yml
   name: AIWG Droid Review

   on:
     pull_request:
       types: [opened, synchronize]

   jobs:
     review:
       runs-on: ubuntu-latest
       permissions:
         contents: write
         pull-requests: write
         issues: write
         id-token: write
       steps:
         - uses: actions/checkout@v5
         - name: Run AIWG Code Review
           uses: Factory-AI/droid-action@v1
           with:
             factory_api_key: ${{ secrets.FACTORY_API_KEY }}
             prompt: |
               Use code-reviewer droid to review this PR.
               Focus on: security, performance, testability.
               Check against AIWG conventions in AGENTS.md.
   ```

2. **Add CLI command**:
   ```bash
   aiwg -init-ci --provider factory --workflows review,security,test
   ```

3. **Create workflow templates**:
   - `aiwg-droid-review.yml` - PR code review
   - `aiwg-droid-security.yml` - Security scanning
   - `aiwg-droid-test.yml` - Test generation
   - `aiwg-droid-docs.yml` - Documentation updates

### 6.2 Droid Exec CLI Integration

**For local headless execution**:

```bash
# Direct droid exec
droid exec "Use architecture-designer to review the SAD" --droid architecture-designer

# AIWG wrapper
aiwg exec "Review SAD" --provider factory --droid architecture-designer
```

---

## Phase 7: Documentation & Testing (P1)

### 7.1 Documentation Updates

| Document | Changes Required |
|----------|-----------------|
| `docs/integrations/factory-quickstart.md` | Add Skills, MCP, Hooks sections |
| `factory-compat.md` | Update tool mappings, add Skills section |
| `README.md` | Update Factory integration description |
| `CHANGELOG.md` | Document Factory updates in next release |

### 7.2 Test Coverage

**Create**: `test/integration/factory-deployment.test.ts`
- Test Skills deployment
- Test MCP configuration
- Test Hooks deployment
- Test AGENTS.md generation
- Test model/reasoningEffort mapping

---

## Implementation Order

### Sprint 1: Skills & MCP (Week 1-2)

1. [ ] Create `deploy-skills.mjs` script
2. [ ] Transform existing skills to Factory format
3. [ ] Add `--deploy-skills` flag to deploy-agents
4. [ ] Create `aiwg mcp install factory` command
5. [ ] Test Skills deployment end-to-end

### Sprint 2: Hooks & AGENTS.md (Week 3)

1. [ ] Create Factory hooks templates
2. [ ] Add `--deploy-hooks` flag
3. [ ] Create Factory-optimized AGENTS.md template
4. [ ] Update `/aiwg-regenerate-factory` command
5. [ ] Test conflict-free multi-platform deployment

### Sprint 3: Advanced Features (Week 4)

1. [ ] Add reasoningEffort to models.json and deployment
2. [ ] Create GitHub Actions workflow templates
3. [ ] Add `aiwg -init-ci` command
4. [ ] Update all documentation
5. [ ] Complete test coverage

### Sprint 4: Release & Polish (Week 5)

1. [ ] Integration testing with real Factory CLI
2. [ ] Update CHANGELOG
3. [ ] Create release notes
4. [ ] Publish npm update

---

## Risk Mitigation

### Risk 1: Factory API Changes
- **Mitigation**: Pin to specific Factory docs version, monitor changelog
- **Detection**: CI tests against Factory CLI

### Risk 2: Tool Name Changes
- **Mitigation**: Maintain mapping table in `config/factory-tools.json`
- **Detection**: Validation during deployment

### Risk 3: Multi-Platform Conflicts
- **Mitigation**: Strict directory isolation, separate context files
- **Detection**: Pre-deployment conflict checker

### Risk 4: Skills Format Drift
- **Mitigation**: Schema validation for both Claude and Factory formats
- **Detection**: CI validation of skill files

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Skills deployment working | 100% of existing skills deploy to Factory |
| MCP integration | AIWG MCP server configurable in Factory |
| Hooks deployment | Core hooks (trace, format, validate) available |
| Documentation | Factory quickstart covers all new features |
| Test coverage | 80%+ for Factory deployment code |
| Multi-platform | Deploy to Claude + Factory without conflicts |

---

## Appendix: Factory Tool Reference

### Tool Categories (from Factory docs)

| Category | Tools | Purpose |
|----------|-------|---------|
| `read-only` | Read, LS, Grep, Glob | Safe analysis |
| `edit` | Create, Edit, ApplyPatch | Code generation |
| `execute` | Execute | Shell commands |
| `web` | WebSearch, FetchUrl | Internet research |
| `mcp` | Dynamic | MCP server tools |

### AIWG → Factory Tool Mapping (Current)

| AIWG/Claude | Factory | Notes |
|-------------|---------|-------|
| Bash | Execute | Anthropic standard |
| Write | Create, Edit | Split to two tools |
| WebFetch | FetchUrl, WebSearch | Split to two tools |
| MultiEdit | MultiEdit, ApplyPatch | Add ApplyPatch |
| Read, Grep, Glob, LS | Same | Already Anthropic |
| Task | Task | Factory native |
| TodoWrite | TodoWrite | Auto-included |

---

## References

- Factory Docs: https://docs.factory.ai/
- Factory GitHub: https://github.com/Factory-AI/factory
- AIWG MCP Server: `src/mcp/server.mjs`
- Current Factory Integration: `docs/integrations/factory-quickstart.md`
- Deploy Script: `tools/agents/deploy-agents.mjs`
