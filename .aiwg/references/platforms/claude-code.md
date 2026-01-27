# Claude Code Reference

> **AIWG Primary Platform** - Authoritative reference for Claude Code features, configuration, and integration patterns.

**Last Updated**: 2026-01-26
**Claude Code Version**: Latest (2026)
**Maintainer**: AIWG Team

---

## Quick Reference

| Resource | Link |
|----------|------|
| Official Docs | https://docs.anthropic.com/en/docs/claude-code |
| GitHub | https://github.com/anthropics/claude-code |
| CLI Reference | https://docs.anthropic.com/en/docs/claude-code/cli-reference |
| Agent SDK | https://docs.anthropic.com/en/docs/agents/agent-sdk |
| MCP Spec | https://modelcontextprotocol.io |

---

## 1. Core Architecture

### 1.1 Tool Suite

Claude Code provides built-in tools for development operations:

| Tool | Purpose | Example |
|------|---------|---------|
| **Read** | View file contents | `Read file.ts` |
| **Write** | Create/overwrite files | `Write new content to file.ts` |
| **Edit** | Precise code modifications | `Edit lines 10-20 in file.ts` |
| **Bash** | Execute shell commands | `npm test`, `git status` |
| **Glob** | Find files by pattern | `**/*.ts`, `src/**/*.md` |
| **Grep** | Search file contents | `function authenticate` |
| **Task** | Spawn subagents | `@code-reviewer Review this PR` |
| **WebSearch** | Internet search | Research external APIs |

### 1.2 Model Options

| Model | Best For | Context | Notes |
|-------|----------|---------|-------|
| **opus-4-5** | Complex reasoning, architecture | 200K | Most capable, slower |
| **sonnet-4-5** | Daily coding, implementation | 200K | Fast, cost-effective |
| **haiku** | Quick tasks, simple queries | 200K | Fastest, cheapest |

**Model Switching**:
```bash
# At startup
claude --model sonnet-4-5

# During session
/model opus-4-5

# Environment variable
export ANTHROPIC_MODEL=sonnet-4-5

# In settings
{ "model": "sonnet-4-5" }
```

### 1.3 Built-in Commands

| Command | Action |
|---------|--------|
| `/help` | Show available commands |
| `/clear` | Clear conversation history |
| `/compact` | Summarize to free context |
| `/context` | Visualize context usage |
| `/model <name>` | Switch model mid-session |
| `/config` | Open configuration panel |
| `/doctor` | Check installation health |

---

## 2. Configuration System

### 2.1 File Hierarchy (Precedence Order)

```
~/.claude/settings.json           # User-wide (all projects)
    ↓
~/.claude/CLAUDE.md               # User-wide instructions
    ↓
<project>/.claude/settings.json   # Project-wide (version controlled)
    ↓
<project>/.claude/settings.local.json  # Local overrides (gitignored)
    ↓
<project>/CLAUDE.md               # Project instructions
    ↓
<project>/.mcp.json               # MCP server configuration
```

### 2.2 CLAUDE.md Purpose

The `CLAUDE.md` file provides project context loaded into every conversation:

```markdown
# Project Name

## Architecture
- Backend: Node.js/Express
- Frontend: React/TypeScript
- Database: PostgreSQL

## Development Commands
- `npm test` - Run test suite
- `npm run build` - Production build
- `npm run lint` - Code linting

## Conventions
- Use TypeScript strict mode
- Prefer functional components
- Follow conventional commits
```

**Placement Options**:
- Repository root (team-shared via git)
- Parent directories (monorepo setups)
- `~/.claude/CLAUDE.md` (personal, all projects)

### 2.3 settings.json Structure

```json
{
  "model": "sonnet-4-5",
  "permissions": {
    "allow": [
      "Read(./**)",
      "Write(./**)",
      "Bash(git:*)",
      "Bash(npm:*)"
    ],
    "deny": [
      "Read(.env)",
      "Read(./**/secrets/**)",
      "Bash(rm -rf:*)"
    ]
  },
  "environment": {
    "NODE_ENV": "development"
  }
}
```

### 2.4 Permission Syntax

| Pattern | Meaning | Example |
|---------|---------|---------|
| `Tool(pattern)` | Exact match | `Bash(npm test)` |
| `Tool(prefix:*)` | Prefix match | `Bash(git:*)` |
| `Tool(*)` | All variants | `Read(*)` |
| `Tool(./**)` | Glob pattern | `Write(./**/*.ts)` |

---

## 3. Agents and Subagents

### 3.1 Agent Definition

Agents are markdown files with YAML frontmatter in `.claude/agents/`:

```markdown
---
name: "Code Reviewer"
description: "Reviews code for quality and security"
model: "sonnet-4-5"
tools:
  allow:
    - Read
    - Grep
  deny:
    - Write
    - Bash
---

# Code Reviewer

You are an expert code reviewer. Examine code for:
- Security vulnerabilities (OWASP Top 10)
- Performance issues
- Code quality and maintainability
- Best practice violations

Provide specific, actionable feedback with line references.
```

### 3.2 Agent Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `description` | string | When to invoke |
| `model` | string | Model to use (opus-4-5, sonnet-4-5, haiku) |
| `tools.allow` | array | Permitted tools |
| `tools.deny` | array | Forbidden tools |
| `allowed_tools` | array | Alternative syntax for tools |

### 3.3 Invoking Agents

```bash
# In Claude Code session
@agent-name <task description>

# Examples
@code-reviewer Review src/auth.ts for security issues
@test-engineer Write unit tests for the payment module
@architect Design the API contract for user service
```

### 3.4 Built-in Agent Types (via Task tool)

| Agent Type | Purpose | Tools |
|------------|---------|-------|
| `Explore` | Codebase exploration | Read, Glob, Grep |
| `Plan` | Implementation planning | Read, Glob, Grep |
| `Bash` | Command execution | Bash |
| `general-purpose` | Flexible tasks | All tools |

---

## 4. Slash Commands and Skills

### 4.1 Custom Commands

Commands are markdown files in `.claude/commands/`:

```markdown
---
name: "run-tests"
description: "Run test suite with coverage"
---

Run the complete test suite:

```bash
npm test -- --coverage
```

Generate coverage report and display summary.

Arguments: $ARGUMENTS
```

### 4.2 Skills vs Commands

| Feature | Commands | Skills | CLAUDE.md |
|---------|----------|--------|-----------|
| Invocation | Explicit `/command` | Auto-invoked by Claude | Always loaded |
| Scope | Single action | Complex workflows | Project context |
| Storage | `.claude/commands/` | `.claude/skills/` | Project root |

### 4.3 Skill Configuration

```markdown
---
name: "security-review"
description: "Performs security audit on code changes"
auto_invoke: ["on_commit", "on_pr"]
agent: "security-auditor"
---

# Security Review Skill

Analyze code for:
1. Input validation issues
2. Authentication/authorization flaws
3. Injection vulnerabilities
4. Sensitive data exposure
```

---

## 5. MCP Integration

### 5.1 Overview

Model Context Protocol (MCP) extends Claude Code with external tools and services.

**Configuration Locations**:
| File | Scope | Sharing |
|------|-------|---------|
| `.mcp.json` | Project | Team via git |
| `~/.claude/mcp.json` | User | Personal |
| `~/.claude/managed-mcp.json` | Org | Read-only |

### 5.2 Server Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["./mcp-servers/github.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "database": {
      "command": "python3",
      "args": ["-m", "mcp_servers.database"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "gitea": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-server-gitea"],
      "env": {
        "GITEA_TOKEN": "${GITEA_TOKEN}",
        "GITEA_URL": "https://git.example.com"
      }
    }
  }
}
```

### 5.3 MCP Management Commands

```bash
claude mcp list              # List configured servers
claude mcp get <server>      # Get server details
claude mcp remove <server>   # Remove a server
claude mcp serve             # Start as MCP server
```

### 5.4 Popular MCP Servers

| Server | Purpose | Package |
|--------|---------|---------|
| GitHub | GitHub API access | `@anthropics/mcp-server-github` |
| Gitea | Gitea/Forgejo API | `@anthropics/mcp-server-gitea` |
| Filesystem | Extended file ops | `@anthropics/mcp-server-filesystem` |
| PostgreSQL | Database queries | `@anthropics/mcp-server-postgres` |
| Slack | Slack integration | `@anthropics/mcp-server-slack` |

---

## 6. Hooks System

### 6.1 Hook Types

| Event | Trigger | Use Case |
|-------|---------|----------|
| `PreToolUse` | Before tool execution | Validation, permission checks |
| `PostToolUse` | After tool completion | Logging, cleanup, verification |
| `Stop` | Session termination | Final validation |

### 6.2 Hook Configuration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit*)",
        "hooks": [
          {
            "type": "command",
            "command": "npm test"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write(*.ts)",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $CLAUDE_FILE_PATH"
          }
        ]
      }
    ]
  }
}
```

### 6.3 Hook Use Cases

1. **Pre-commit validation**: Run tests before commits
2. **Auto-formatting**: Format files after creation
3. **Security scanning**: Check for vulnerabilities
4. **Logging**: Track tool usage for audit
5. **Linting**: Enforce code style

---

## 7. Context Management

### 7.1 Context Limits

| Model | Context Window |
|-------|---------------|
| Opus 4.5 | 200,000 tokens |
| Sonnet 4.5 | 200,000 tokens |
| Haiku | 200,000 tokens |

### 7.2 Context Commands

| Command | Action |
|---------|--------|
| `/context` | Visualize usage (fuel gauge) |
| `/compact` | Summarize history |
| `/clear` | Reset context |

### 7.3 Context Optimization Strategies

1. **Use subagents** - Isolate exploratory work
2. **Clear between tasks** - Fresh context for new work
3. **Leverage CLAUDE.md** - Always-relevant context
4. **Monitor with `/context`** - Track usage proactively
5. **Use `/compact`** - Preserve essential history

### 7.4 Memory Hierarchy

```
Session Memory     (most specific, current conversation)
    ↓
Project Memory     (.claude/memory.md)
    ↓
User Memory        (~/.claude/memory.md)
    ↓
System Defaults    (least specific)
```

---

## 8. Sandboxing and Security

### 8.1 Sandbox Architecture

- **Linux**: bubblewrap
- **macOS**: seatbelt
- **Windows**: WSL2

### 8.2 Security Boundaries

| Boundary | Default |
|----------|---------|
| Filesystem Write | Current directory only |
| Filesystem Read | Entire system (except denied) |
| Network | Unix socket proxy only |

### 8.3 Permission Configuration

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "writeable": ["."],
      "denied": [".env", ".ssh", ".config/secrets"]
    }
  },
  "permissions": {
    "allow": ["Read(./**)", "Write(./**)", "Bash(npm:*)"],
    "deny": ["Read(.env)", "Bash(rm -rf:*)"]
  }
}
```

---

## 9. IDE Integrations

### 9.1 VS Code

**Features**:
- Native extension interface
- Automatic context from current editor
- Interactive diff viewing
- Accept/reject workflows

**Installation**: VS Code Marketplace → "Claude Code"

### 9.2 JetBrains IDEs

**Supported**: IntelliJ, PyCharm, WebStorm, GoLand, PhpStorm

**Features**:
- Interactive diff viewer
- Selection context sharing
- Keyboard shortcuts
- Native tool integration

**Installation**: JetBrains Plugin Marketplace → "Claude"

---

## 10. Claude Agent SDK

### 10.1 Installation

```bash
# TypeScript/JavaScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install anthropic-agent-sdk
```

### 10.2 Basic Agent (TypeScript)

```typescript
import { Agent } from "@anthropic-ai/claude-agent-sdk";

const agent = new Agent({
  name: "code_analyzer",
  model: "claude-sonnet-4-5-20250929",
  instructions: `You are a code analysis expert.
    Analyze code for quality, security, and performance.`,
  tools: ["Read", "Grep", "Glob"],
});

const result = await agent.run("Analyze src/ for security issues");
console.log(result);
```

### 10.3 Custom Tools

```typescript
const tools = [
  {
    name: "run_tests",
    description: "Execute test suite",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Test file pattern" }
      }
    }
  }
];

const agent = new Agent({
  name: "test_runner",
  model: "claude-sonnet-4-5-20250929",
  tools,
  tool_handler: async (name, input) => {
    if (name === "run_tests") {
      const { execSync } = require("child_process");
      return execSync(`npm test -- ${input.pattern}`).toString();
    }
  }
});
```

### 10.4 MCP in SDK

```typescript
const agent = new Agent({
  mcp_servers: [
    {
      name: "database",
      command: "python3",
      args: ["-m", "mcp_servers.database"]
    }
  ]
});
```

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation |
| `Ctrl+D` | Exit session |
| `Ctrl+R` | Re-execute last failed operation |
| `Ctrl+T` | Toggle task list |
| `Tab` | Autocomplete |
| `↑` / `↓` | Navigate history |
| `Esc Esc` | Browse and restore history |

---

## 12. Best Practices for AIWG Integration

### 12.1 Agent Design

```markdown
# AIWG agents should include:

1. **Clear role definition** in frontmatter
2. **Tool restrictions** appropriate to task
3. **Output format specifications**
4. **Reference to AIWG conventions**

Example:
---
name: "Requirements Analyst"
model: "sonnet-4-5"
tools:
  allow: [Read, Write, Grep, Glob]
  deny: [Bash]
---
```

### 12.2 Skill Integration

AIWG skills should:
- Follow `.claude/commands/` or `.claude/skills/` conventions
- Include `$ARGUMENTS` for parameterization
- Reference appropriate agents via `agent:` field
- Document expected inputs/outputs

### 12.3 MCP Server Patterns

For AIWG MCP integrations:
- Store configs in `.mcp.json` (team-shared)
- Use environment variables for secrets
- Document server capabilities in `.aiwg/references/`

---

## 13. Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Context exhausted | Use `/compact` or start new session |
| Permission denied | Check `.claude/settings.json` permissions |
| MCP server not found | Verify `.mcp.json` config and env vars |
| Model not switching | Check model name with `/model --list` |
| Hooks not firing | Verify matcher syntax in settings |

### Diagnostic Commands

```bash
# Check installation
claude /doctor

# View context usage
/context

# List MCP servers
claude mcp list

# Show configuration
/config
```

---

## 14. Official Documentation Links

### Core Documentation
- **Main Docs**: https://docs.anthropic.com/en/docs/claude-code
- **CLI Reference**: https://docs.anthropic.com/en/docs/claude-code/cli-reference
- **GitHub**: https://github.com/anthropics/claude-code

### Feature Documentation
- **MCP Integration**: https://docs.anthropic.com/en/docs/claude-code/mcp
- **Subagents**: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- **Slash Commands**: https://docs.anthropic.com/en/docs/claude-code/slash-commands
- **Memory**: https://docs.anthropic.com/en/docs/claude-code/memory
- **Settings**: https://docs.anthropic.com/en/docs/claude-code/settings
- **Sandboxing**: https://docs.anthropic.com/en/docs/claude-code/sandboxing

### Agent SDK
- **Overview**: https://docs.anthropic.com/en/docs/agents/agent-sdk
- **Quickstart**: https://docs.anthropic.com/en/docs/agents/agent-sdk/quickstart

### Engineering Blog
- **Sandboxing Deep Dive**: https://www.anthropic.com/engineering/claude-code-sandboxing
- **Best Practices**: https://www.anthropic.com/engineering/claude-code-best-practices

---

## References

- @CLAUDE.md - Project-level Claude Code configuration
- @.claude/settings.json - Settings reference
- @.mcp.json - MCP configuration
- @.claude/agents/ - Agent definitions
- @.claude/commands/ - Custom commands
