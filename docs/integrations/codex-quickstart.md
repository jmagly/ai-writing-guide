# OpenAI Codex CLI Quickstart

Integrate AIWG SDLC framework with OpenAI Codex CLI for AI-assisted development.

## Prerequisites

- [OpenAI Codex CLI](https://github.com/openai/codex) installed
- OpenAI API key configured
- AIWG installed (`npm i -g aiwg`)

## Quick Start

### 1. Deploy AIWG to Your Project

```bash
# Deploy AIWG SDLC framework for Codex
aiwg -deploy-agents --provider codex --mode sdlc --create-agents-md

# This creates:
# - AGENTS.md with AIWG integration section
# - .aiwg/ directory structure
```

### 2. Install Skills (User-Level)

Skills provide reusable capabilities that Codex loads at startup:

```bash
# Deploy AIWG skills to ~/.codex/skills/
aiwg -deploy-skills --provider codex
```

**Installed Skills:**
- `voice-apply` - Apply voice profiles to content
- `ai-pattern-detection` - Detect AI-generated patterns
- `project-awareness` - Understand project structure
- `claims-validator` - Validate factual claims

### 3. Install Prompts (User-Level)

Prompts are reusable slash commands:

```bash
# Deploy AIWG commands as Codex prompts to ~/.codex/prompts/
aiwg -deploy-commands --provider codex
```

**Available Prompts:**
- `/prompts:aiwg-pr-review` - Comprehensive PR review
- `/prompts:aiwg-security-audit` - Security assessment
- `/prompts:aiwg-generate-tests` - Test generation
- `/prompts:aiwg-project-status` - Project health check

## Using AIWG with Codex

### Natural Language Workflows

Codex understands AIWG context from AGENTS.md:

```
# In Codex CLI
"Review this PR for security issues"
"Generate tests for the auth module"
"Create an architecture decision record for caching"
"What's the project status?"
```

### Using Prompts

```
# Invoke AIWG prompts
/prompts:aiwg-pr-review PR_NUMBER=123
/prompts:aiwg-security-audit
/prompts:aiwg-generate-tests
```

### Non-Interactive Mode (`codex exec`)

Run AIWG workflows in CI/CD:

```bash
# Security review
codex exec "Perform AIWG security review" --full-auto --sandbox read-only

# Generate tests
codex exec "Generate tests for src/auth/" --full-auto

# With structured output
codex exec "Review code quality" --output-schema schema.json -o results.json
```

## Configuration

### Fallback to CLAUDE.md

If your project uses CLAUDE.md for Claude Code, configure Codex to use it as fallback:

```toml
# ~/.codex/config.toml
project_doc_fallback_filenames = ["CLAUDE.md", "WARP.md"]
```

### AIWG Profile

Add an AIWG profile to your config:

```toml
# ~/.codex/config.toml

[profiles.aiwg-sdlc]
model = "gpt-5.1-codex-max"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
```

Use with: `codex --profile aiwg-sdlc`

### MCP Server Integration (Optional)

Enable AIWG tools via MCP:

```toml
# ~/.codex/config.toml

[mcp_servers.aiwg]
command = "node"
args = ["~/.local/share/ai-writing-guide/src/mcp/server.mjs"]
startup_timeout_sec = 10.0
tool_timeout_sec = 60.0
enabled_tools = [
  "workflow-run",
  "artifact-read",
  "artifact-write",
  "template-render",
  "agent-list"
]
```

## CI/CD Integration

### GitHub Actions

Copy workflow templates from AIWG:

```bash
# Code review on PRs
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/codex/ci-cd/aiwg-codex-review.yml .github/workflows/

# Security review
cp ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/codex/ci-cd/aiwg-codex-security.yml .github/workflows/
```

Configure `OPENAI_API_KEY` secret in your repository.

### Example: Automated PR Review

```yaml
# .github/workflows/codex-review.yml
name: Codex Review

on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g @openai/codex
      - run: |
          codex exec "Review this PR using AIWG standards" \
            --full-auto \
            --sandbox read-only \
            -o review.md
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## SDK Integration

Use the Codex TypeScript SDK for programmatic workflows:

```typescript
import { Codex } from "@openai/codex-sdk";

const codex = new Codex();
const thread = codex.startThread({ workingDirectory: "." });

// Run AIWG workflow
const turn = await thread.run(`
  Execute AIWG security review workflow.
  Read .aiwg/requirements/ for context.
  Follow project conventions in AGENTS.md.
`);

console.log(turn.finalResponse);
```

See `docs/examples/codex-sdk-examples.ts` for more examples.

## Differences from Claude Code

| Feature | Claude Code | Codex |
|---------|-------------|-------|
| Context file | CLAUDE.md | AGENTS.md (supports fallback) |
| Agent deployment | .claude/agents/ | N/A (single agent) |
| Commands | .claude/commands/ | ~/.codex/prompts/ |
| Skills | .claude/skills/ | ~/.codex/skills/ |
| MCP config | settings.json | config.toml |

## Troubleshooting

### Skills not loading

Skills are loaded once at startup. Restart Codex after installing new skills.

### AGENTS.md not found

Ensure you're in the project root or a subdirectory. Codex searches from repo root to current directory.

### Prompts not appearing

Check `~/.codex/prompts/` for .md files. Prompts must have valid YAML frontmatter.

## Resources

- [Codex CLI Documentation](https://github.com/openai/codex)
- [AIWG Documentation](https://aiwg.io)
- [AIWG SDLC Framework](https://github.com/jmagly/ai-writing-guide)
