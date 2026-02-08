# OpenAI Codex CLI Integration Plan

## Executive Summary

This plan tracks AIWG integration with OpenAI Codex CLI, the Codex App, and the Codex API. Originally drafted December 2025, most core integration work is complete. This document now serves as a living reference for ongoing Codex feature adoption.

**Current State**: AIWG has full Codex provider support with agents, skills, prompts, AGENTS.md, and config profiles
**Next Targets**: Cloud task integration, Automations support, updated model mappings, `.agents/skills/` project-level deployment

## Gap Analysis

### Codex Features vs AIWG Support (Updated February 2026)

| Feature | Codex Status | AIWG Support | Gap |
|---------|-------------|--------------|-----|
| AGENTS.md | Stable | ✅ Deployed via `--provider codex` | None |
| Skills (`~/.codex/skills/`) | Stable | ✅ Deployed via `deploy-skills-codex.mjs` | None |
| Skills (`.agents/skills/` in repo) | Stable (new) | ⚠️ Not deployed to project-level | **MEDIUM** |
| Custom Prompts | Stable | ✅ Deployed via `deploy-prompts-codex.mjs` | None |
| MCP Servers | Stable | ✅ Config template available | None |
| `codex exec` | Stable | ✅ CI workflow templates created | None |
| Profiles | Stable | ✅ Config template with 4 profiles | None |
| GPT-5.3-Codex model | New (Feb 5, 2026) | ✅ Updated in models.json, codex.mjs | None |
| codex-mini-latest model | Stable | ✅ Updated in models.json, codex.mjs | None |
| GPT-5-Codex-Mini model | Stable | ✅ Updated in models.json, codex.mjs | None |
| `codex cloud` command | New | ❌ Not integrated | **LOW** |
| Codex App (macOS) | New (Feb 2, 2026) | ⚠️ Documented in quickstart | **LOW** |
| Automations | New | ❌ Not integrated | **LOW** |
| Mid-turn steering | Stable | N/A (runtime feature) | None |
| `/review` built-in | Stable | N/A (Codex-native) | None |
| Web search | Stable | ✅ Config template enables it | None |
| Image attachments | Stable | N/A (runtime feature) | None |
| Feature flags | Stable | N/A (runtime feature) | None |
| `/model` switching | Stable | N/A (runtime feature) | None |
| `/debug-config` | Stable | ⚠️ Documented in quickstart | None |
| Memory/thread summaries | Stable | ✅ Config template includes section | None |
| `$skill-creator` | Stable | ⚠️ Mentioned in docs | None |
| GitHub Copilot integration | New | ⚠️ Documented, separate provider | None |
| Codex SDK | Stable | ❌ Not utilized | **LOW** |

### Platform Comparison (Updated)

| Platform | Config Dir | Agents Dir | Commands/Prompts | Context File | Skills Location |
|----------|-----------|------------|------------------|--------------|-----------------|
| Claude Code | `.claude/` | `.claude/agents/` | `.claude/commands/` | `CLAUDE.md` | `.claude/skills/` |
| Factory | `.factory/` | `.factory/droids/` | `.factory/commands/` | `AGENTS.md` | N/A |
| **Codex** | `.codex/` | `.codex/agents/` | `~/.codex/prompts/` | `AGENTS.md` | `~/.codex/skills/` + `.agents/skills/` |
| Warp Terminal | N/A | N/A | N/A | `WARP.md` | N/A |
| Cursor | `.cursor/` | `.cursor/rules/` | N/A | `.cursorrules` | N/A |

### Key Codex Architecture Notes

1. **Agent definitions**: Deployed to `.codex/agents/` (project-local)
2. **Skills are dual-location**: `~/.codex/skills/` (user-level) AND `.agents/skills/` (project-level in repos)
3. **Prompts Replace Commands**: Similar to slash commands but with different syntax
4. **MCP via config.toml**: TOML-based, not JSON like other platforms
5. **SDK for Automation**: TypeScript SDK wraps CLI for programmatic use
6. **Built-in Tools**: shell, read, write, apply_patch, view_image, web_search — MCP extends capabilities
7. **Models**: GPT-5.3-Codex (most capable), codex-mini-latest (default CLI), GPT-5-Codex-Mini (cost-effective)
8. **Codex App**: Native macOS app for parallel agents, long-running tasks, and automations
9. **Cloud Tasks**: `codex cloud` for managing cloud-based task execution with 12hr container caching

---

## Phase 1: AGENTS.md Generation (P0 - HIGH)

### 1.1 Codex-Optimized AGENTS.md Template

**Codex Constraints**:
- No `project_doc_max_bytes` default: 32768 bytes (32KB)
- Discovery: root to cwd, one file per directory
- Supports `project_doc_fallback_filenames` including `CLAUDE.md`

**Implementation**:

1. **Create template**: `agentic/code/addons/aiwg-utils/templates/AGENTS.md.codex.template`

```markdown
# {{PROJECT_NAME}}

{{PROJECT_DESCRIPTION}}

## Build & Test

{{BUILD_COMMANDS}}

## Architecture

{{ARCHITECTURE_SUMMARY}}

## AIWG Framework

This project uses [AI Writing Guide](https://aiwg.io) for SDLC orchestration.

### Skills

Install AIWG skills to `~/.codex/skills/`:
- `voice-apply` - Apply voice profiles to content
- `ai-pattern-detection` - Detect AI-generated patterns
- `project-awareness` - Understand project context

### Prompts

Install AIWG prompts to `~/.codex/prompts/`:
- `/aiwg:review` - Code review with AIWG standards
- `/aiwg:security` - Security review workflow
- `/aiwg:test` - Generate tests following conventions

### Artifacts

SDLC artifacts stored in `.aiwg/`:
- `intake/` - Project intake forms
- `requirements/` - User stories, use cases
- `architecture/` - SAD, ADRs
- `testing/` - Test strategy, plans

### Workflows

Natural language workflows:
- "Review this code for security issues"
- "Generate tests for this module"
- "Create architecture decision record"
```

2. **Update deploy-agents.mjs**:
```bash
aiwg -deploy-agents --provider codex --create-agents-md
# Creates AGENTS.md with Codex-optimized content
```

3. **Add CLI flag**:
```javascript
// In deploy-agents.mjs
if (provider === 'codex' && createAgentsMd) {
  const template = await loadTemplate('AGENTS.md.codex.template');
  const content = renderTemplate(template, projectContext);
  await fs.writeFile('AGENTS.md', content);
}
```

### 1.2 CLAUDE.md Fallback Configuration

**Codex supports fallback filenames**. Document this for hybrid projects:

```toml
# ~/.codex/config.toml
project_doc_fallback_filenames = ["CLAUDE.md", "WARP.md"]
```

**Add to docs**: `docs/integrations/codex-quickstart.md`
- Section on using CLAUDE.md as fallback
- Benefits: single context file for Claude + Codex projects

---

## Phase 2: Skills Deployment (P0 - HIGH)

### 2.1 Codex Skill Format

**Location**: `~/.codex/skills/<skill-name>/SKILL.md`
**Format**:
```markdown
---
name: skill-name
description: What it does and when to use (≤500 chars)
---

# Skill Body (optional, kept on disk)
Instructions, examples, etc.
```

**Key Differences from Claude/Factory**:
- Skills are user-level, not project-level
- Only name + description injected into context
- Body stays on disk, read on demand

### 2.2 AIWG Skills → Codex Skills

**Mapping**:

| AIWG Skill | Codex Skill Name | Description (≤500 chars) |
|------------|------------------|--------------------------|
| voice-apply | voice-apply | Apply voice profile to content. Use when asked to write in a specific voice, match tone, or transform content style. |
| voice-create | voice-create | Generate new voice profile from description. Use when creating custom writing voice or persona. |
| voice-blend | voice-blend | Combine multiple voice profiles. Use when blending styles (e.g., 70% technical + 30% casual). |
| voice-analyze | voice-analyze | Analyze content's voice characteristics. Use when evaluating writing style or tone. |
| ai-pattern-detection | ai-pattern-detection | Detect AI-generated patterns and suggest authentic alternatives. Use when reviewing content for AI tells. |
| claims-validator | claims-validator | Validate factual claims in content. Use when fact-checking documentation or articles. |
| project-awareness | project-awareness | Understand project structure and conventions. Auto-applies when working in codebase. |
| nl-router | nl-router | Route natural language requests to appropriate workflows. Auto-applies for SDLC commands. |

### 2.3 Skill Deployment Command

```bash
# Deploy AIWG skills to Codex
aiwg -deploy-skills --provider codex

# Creates:
# ~/.codex/skills/voice-apply/SKILL.md
# ~/.codex/skills/voice-create/SKILL.md
# ~/.codex/skills/ai-pattern-detection/SKILL.md
# etc.
```

**Implementation**:

1. **New file**: `tools/skills/deploy-skills-codex.mjs`
```javascript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CODEX_SKILLS_DIR = path.join(os.homedir(), '.codex', 'skills');

async function deploySkillsToCodex(skills) {
  await fs.mkdir(CODEX_SKILLS_DIR, { recursive: true });

  for (const skill of skills) {
    const skillDir = path.join(CODEX_SKILLS_DIR, skill.name);
    await fs.mkdir(skillDir, { recursive: true });

    const content = formatCodexSkill(skill);
    await fs.writeFile(path.join(skillDir, 'SKILL.md'), content);
  }
}

function formatCodexSkill(skill) {
  return `---
name: ${skill.name}
description: ${skill.description.slice(0, 500)}
---

${skill.body || ''}
`;
}
```

2. **Update main CLI**: Add `--deploy-skills` flag for `--provider codex`

---

## Phase 3: Custom Prompts (P0 - HIGH)

### 3.1 Codex Prompt Format

**Location**: `~/.codex/prompts/*.md`
**Format**:
```markdown
---
description: Short description for slash popup
argument-hint: FILE=<path> [FOCUS=<area>]
---

Prompt body with $FILE and $FOCUS placeholders.
```

**Key Features**:
- Placeholders: `$1`-`$9`, `$ARGUMENTS`, `$NAMED`
- YAML frontmatter optional but recommended
- Filename (sans `.md`) becomes command name

### 3.2 AIWG Commands → Codex Prompts

**High-Priority Mappings**:

| AIWG Command | Codex Prompt | Description |
|--------------|--------------|-------------|
| `/pr-review` | `pr-review.md` | Comprehensive PR review |
| `/security-audit` | `security-audit.md` | Security assessment |
| `/generate-tests` | `generate-tests.md` | Test suite generation |
| `/create-prd` | `create-prd.md` | Product requirements doc |
| `/project-status` | `project-status.md` | Project health check |
| `/flow-gate-check` | `gate-check.md` | Phase gate validation |

**Example Conversion** (`/pr-review` → `pr-review.md`):

```markdown
---
description: Conduct comprehensive PR review from multiple perspectives
argument-hint: PR_NUMBER=<number>
---

Review PR #$PR_NUMBER from multiple perspectives:

## Code Quality
- Check for clean code principles
- Verify error handling
- Look for potential bugs

## Security
- Check for injection vulnerabilities
- Verify input validation
- Review authentication/authorization

## Performance
- Identify potential bottlenecks
- Check for N+1 queries
- Review caching opportunities

## Testing
- Verify test coverage
- Check edge cases
- Validate test quality

Provide a summary with:
- Overall assessment (approve/request changes)
- Critical issues (blockers)
- Suggestions (non-blocking improvements)
```

### 3.3 Prompt Deployment Command

```bash
# Deploy AIWG commands as Codex prompts
aiwg -deploy-commands --provider codex

# Creates:
# ~/.codex/prompts/pr-review.md
# ~/.codex/prompts/security-audit.md
# etc.
```

**Implementation**:

1. **New file**: `tools/commands/deploy-prompts-codex.mjs`
2. **Command transformer**: Convert AIWG command format to Codex prompt format
3. **Placeholder mapping**: Map AIWG `$ARGUMENTS` patterns to Codex placeholders

---

## Phase 4: MCP Server Integration (P1 - MEDIUM)

### 4.1 AIWG MCP for Codex

**Codex MCP Config** (`~/.codex/config.toml`):
```toml
[mcp_servers.aiwg]
command = "node"
args = ["/path/to/aiwg/src/mcp/server.mjs"]
startup_timeout_sec = 10.0
tool_timeout_sec = 60.0
```

### 4.2 MCP Installation Command

```bash
# Add AIWG MCP to Codex config
aiwg mcp install codex

# Outputs config.toml snippet to paste
# Or with --write flag, appends to ~/.codex/config.toml
```

**Implementation**:

1. **Update**: `src/cli/index.mjs`
```javascript
if (command === 'mcp' && subcommand === 'install' && provider === 'codex') {
  const aiwgRoot = getAiwgRoot();
  const config = `
[mcp_servers.aiwg]
command = "node"
args = ["${aiwgRoot}/src/mcp/server.mjs"]
startup_timeout_sec = 10.0
tool_timeout_sec = 60.0
enabled_tools = ["workflow-run", "artifact-read", "artifact-write", "template-render", "agent-list"]
`;
  console.log('Add to ~/.codex/config.toml:\n', config);
}
```

### 4.3 Exposed MCP Tools

Document tools available to Codex via AIWG MCP:

| Tool | Description | Use Case |
|------|-------------|----------|
| `workflow-run` | Execute AIWG workflow | "Run security review workflow" |
| `artifact-read` | Read from `.aiwg/` | "Show architecture decisions" |
| `artifact-write` | Write to `.aiwg/` | "Update risk register" |
| `template-render` | Render AIWG template | "Generate test plan from template" |
| `agent-list` | List available agents | "What agents are available?" |

---

## Phase 5: `codex exec` Integration (P1 - MEDIUM)

### 5.1 Non-Interactive Automation

**Codex exec features**:
- `codex exec "prompt"` - Run without TUI
- `--full-auto` - Auto-approve workspace writes
- `--json` - JSONL event stream
- `--output-schema` - Structured JSON output
- `resume --last` - Continue previous session

### 5.2 AIWG CI/CD with Codex

**GitHub Actions Workflow Template**:

```yaml
# .github/workflows/aiwg-codex-review.yml
name: AIWG Code Review (Codex)

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Codex
        run: npm install -g @openai/codex

      - name: Run AIWG Review
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          codex exec "Review this PR using AIWG code review standards.
          Focus on security, performance, and test coverage.
          Output JSON with: overall_status, critical_issues, suggestions." \
            --full-auto \
            --output-schema review-schema.json \
            -o review-result.json

      - name: Post Review Comment
        uses: actions/github-script@v7
        with:
          script: |
            const review = require('./review-result.json');
            // Post as PR comment
```

### 5.3 CLI Integration

```bash
# Run AIWG workflow via Codex
aiwg exec "Run security review" --via codex

# Equivalent to:
codex exec "Use AIWG security review workflow on this codebase" --full-auto
```

---

## Phase 6: Codex SDK Integration (P2 - LOW)

### 6.1 TypeScript SDK Usage

**For programmatic AIWG workflows**:

```typescript
import { Codex } from "@openai/codex-sdk";

async function runAiwgWorkflow(workflow: string, project: string) {
  const codex = new Codex();
  const thread = codex.startThread({ workingDirectory: project });

  const turn = await thread.run(`
    Execute AIWG ${workflow} workflow.
    Read .aiwg/requirements/ for context.
    Follow project conventions in AGENTS.md.
  `);

  return turn.finalResponse;
}

// Example: Security review
const result = await runAiwgWorkflow('security-review', '/path/to/project');
```

### 6.2 Structured Output for Artifacts

```typescript
const artifactSchema = {
  type: "object",
  properties: {
    artifact_type: { type: "string" },
    content: { type: "string" },
    path: { type: "string" },
    metadata: {
      type: "object",
      properties: {
        author: { type: "string" },
        version: { type: "string" },
        status: { type: "string", enum: ["draft", "review", "approved"] }
      },
      required: ["author", "version", "status"],
      additionalProperties: false
    }
  },
  required: ["artifact_type", "content", "path", "metadata"],
  additionalProperties: false
};

const turn = await thread.run("Generate architecture decision record for caching strategy", {
  outputSchema: artifactSchema
});
```

---

## Phase 7: Configuration Profiles (P2 - LOW)

### 7.1 AIWG Profile Template

**Generate Codex profile for AIWG projects**:

```toml
# ~/.codex/config.toml profiles section

[profiles.aiwg-sdlc]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.aiwg-readonly]
model = "gpt-5-codex-mini"
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "read-only"
```

### 7.2 Profile Generation Command

```bash
# Generate AIWG profile for Codex
aiwg -init-profile codex

# Outputs profile to add to config.toml
```

---

## Phase 8: Documentation & Testing (P1)

### 8.1 Documentation Updates

| Document | Changes |
|----------|---------|
| `docs/integrations/codex-quickstart.md` | NEW: Full Codex setup guide |
| `docs/integrations/codex-skills.md` | NEW: Skills installation |
| `docs/integrations/codex-prompts.md` | NEW: Prompts reference |
| `docs/integrations/codex-mcp.md` | NEW: MCP configuration |
| `docs/integrations/codex-exec.md` | NEW: CI/CD integration |
| `README.md` | Add Codex to supported platforms |
| `CHANGELOG.md` | Document Codex support |

### 8.2 Test Coverage

**Create**: `test/integration/codex-deployment.test.ts`

```typescript
describe('Codex Integration', () => {
  describe('AGENTS.md generation', () => {
    it('generates Codex-optimized AGENTS.md');
    it('respects 32KB size limit');
    it('includes AIWG skill references');
  });

  describe('Skills deployment', () => {
    it('creates skills in ~/.codex/skills/');
    it('formats skill with correct YAML frontmatter');
    it('truncates description to 500 chars');
  });

  describe('Prompts deployment', () => {
    it('creates prompts in ~/.codex/prompts/');
    it('converts AIWG command placeholders');
    it('generates correct argument-hint');
  });

  describe('MCP configuration', () => {
    it('generates valid TOML config');
    it('includes all AIWG MCP tools');
  });
});
```

---

## Implementation Order

### Sprint 1: Core Integration (COMPLETE)
1. [x] Create AGENTS.md.codex.template
2. [x] Implement `--provider codex` in deploy-agents
3. [x] Create deploy-skills-codex.mjs
4. [x] Create deploy-prompts-codex.mjs
5. [x] Test basic deployment

### Sprint 2: MCP & Documentation (COMPLETE)
1. [x] Add `aiwg mcp install codex` command
2. [x] Create codex-quickstart.md
3. [x] Create codex-skills.md
4. [x] Create codex-prompts.md
5. [x] Update README with Codex support

### Sprint 3: Automation & CI (COMPLETE)
1. [x] Create CI workflow templates (Gitea + GitHub Actions)
2. [x] Implement `codex exec` integration
3. [x] Create codex-exec.md documentation
4. [x] Add structured output schemas

### Sprint 4: Polish & Testing (COMPLETE)
1. [x] Complete test suite (codex-deployment.test.ts)
2. [x] Create AIWG profiles for Codex (config.toml template)
3. [x] SDK integration examples
4. [x] Update CHANGELOG
5. [x] Publish npm update

### Sprint 5: February 2026 Model & Feature Updates (IN PROGRESS)
1. [x] Update models.json with GPT-5.3-Codex, codex-mini-latest, GPT-5-Codex-Mini
2. [x] Update codex.mjs provider model mappings
3. [x] Update config.toml.aiwg-template with new models and features
4. [x] Rewrite codex-quickstart.md with comprehensive feature coverage
5. [x] Update this integration plan gap analysis
6. [ ] Add `.agents/skills/` project-level skill deployment option
7. [ ] Evaluate `codex cloud` integration for AIWG workflows
8. [ ] Evaluate Automations integration for scheduled AIWG tasks

---

## Risk Mitigation

### Risk 1: Codex API Changes
- **Mitigation**: Pin to specific Codex version in docs
- **Detection**: CI tests with latest Codex CLI

### Risk 2: Skills Location Change
- **Mitigation**: Make skills directory configurable
- **Detection**: Verify `~/.codex/skills/` exists before deployment

### Risk 3: Prompt Placeholder Incompatibility
- **Mitigation**: Comprehensive placeholder conversion testing
- **Detection**: Validate prompts against Codex format spec

### Risk 4: AGENTS.md Size Overflow
- **Mitigation**: Auto-truncation with warning
- **Detection**: Size check before writing

---

## Success Criteria

| Metric | Target |
|--------|--------|
| AGENTS.md deployment | Works with `--provider codex` |
| Skills installation | All 8 core skills deploy correctly |
| Prompts conversion | 10+ commands converted to prompts |
| MCP integration | AIWG MCP configurable in config.toml |
| Documentation | Codex quickstart complete |
| Test coverage | 80%+ for Codex deployment code |
| CI/CD | GitHub Actions workflow template available |

---

## Appendix: Codex Tool Reference

### Built-in Tools

| Tool | Description | Sandbox Requirements |
|------|-------------|---------------------|
| shell | Execute shell commands | Varies by sandbox mode |
| read | Read file contents | read-only sufficient |
| write | Write/create files | workspace-write required |
| apply_patch | Apply patches | workspace-write required |
| view_image | View local images | read-only sufficient |
| web_search | Search the web | Feature flag required |

### MCP Tool Categories

| Category | Tools | Purpose |
|----------|-------|---------|
| AIWG Core | workflow-run, artifact-read/write | SDLC orchestration |
| Templates | template-render, template-list | Document generation |
| Discovery | agent-list, skill-list | Available capabilities |

---

## References

- Codex CLI Docs: https://github.com/openai/codex/tree/main/docs
- Codex SDK: https://github.com/openai/codex/tree/main/sdk
- AIWG MCP Server: `src/mcp/server.mjs`
- Factory Integration Plan: `.aiwg/planning/factory-ai-integration-plan.md`
- Current Deploy Script: `tools/agents/deploy-agents.mjs`
