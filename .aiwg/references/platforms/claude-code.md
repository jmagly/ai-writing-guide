# Claude Code Reference

> **AIWG Primary Platform** - Authoritative reference for Claude Code features, configuration, and integration patterns.

**Last Updated**: 2026-02-06
**Claude Code Version**: v2.1.33
**Coverage**: v2.0.73 through v2.1.33
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
| Platform Console | https://platform.claude.com |

---

## 1. Core Architecture

### 1.1 Tool Suite

Claude Code provides built-in tools for development operations:

| Tool | Purpose | Example |
|------|---------|---------|
| **Read** | View file/PDF/image contents | `Read file.ts`, `Read doc.pdf pages: "1-5"` |
| **Write** | Create/overwrite files | `Write new content to file.ts` |
| **Edit** | Precise string replacements | `Edit old_string → new_string in file.ts` |
| **MultiEdit** | Multiple edits in one call | Batch edits across a file |
| **Bash** | Execute shell commands | `npm test`, `git status` |
| **Glob** | Find files by pattern | `**/*.ts`, `src/**/*.md` |
| **Grep** | Search file contents (ripgrep) | `function authenticate` |
| **Task** | Spawn subagents | Background/foreground agent tasks |
| **TaskOutput** | Read background task results | Check on running agents |
| **TaskStop** | Stop background tasks | Cancel long-running operations |
| **TaskCreate** | Create tracked tasks | Task management with dependencies |
| **TaskUpdate** | Update/complete/delete tasks | Status tracking |
| **TaskGet** | Read task details | Full description and dependencies |
| **TaskList** | List all tasks | Overview of pending/in-progress work |
| **WebSearch** | Internet search | Research external APIs |
| **WebFetch** | Fetch web content | Download pages/docs |
| **NotebookEdit** | Edit Jupyter notebooks | Modify .ipynb cells |
| **ToolSearch** | Discover deferred MCP tools | Find and load MCP tools on demand |
| **AskUserQuestion** | Prompt user for input | Clarify requirements |
| **EnterPlanMode** | Start planning workflow | Architecture planning |
| **ExitPlanMode** | Complete planning | Submit plan for approval |

**Read Tool Enhancements** (v2.1.30):
- `pages` parameter for PDFs: `Read doc.pdf pages: "1-5"` (max 20 pages per request)
- Large PDFs (>10 pages) return lightweight reference when @-mentioned
- Reads images (PNG, JPG) as visual content
- Reads Jupyter notebooks with all cells and outputs
- Max 100 pages, 20MB file size

**LSP Tool** (v2.0.74):
- Language Server Protocol integration for code intelligence
- Go-to-definition, find references, hover documentation
- Works with language servers that support LSP

### 1.2 Model Options

| Model | ID | Best For | Context | Notes |
|-------|-----|----------|---------|-------|
| **Opus 4.6** | `claude-opus-4-6` | Complex reasoning, architecture | 200K | Most capable (v2.1.32+) |
| **Sonnet 4.5** | `claude-sonnet-4-5-20250929` | Daily coding, implementation | 200K | Fast, cost-effective |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Quick tasks, simple queries | 200K | Fastest, cheapest |

**Model Switching**:
```bash
# At startup
claude --model opus-4-6

# During session
/model opus-4-6

# Environment variable
export ANTHROPIC_MODEL=opus-4-6

# In settings
{ "model": "opus-4-6" }
```

### 1.3 Built-in Commands

| Command | Action | Since |
|---------|--------|-------|
| `/help` | Show available commands | - |
| `/clear` | Clear conversation history | - |
| `/compact` | Summarize to free context | - |
| `/context` | Visualize context usage (grouped by source, token counts) | Enhanced v2.0.74 |
| `/model <name>` | Switch model mid-session (executes immediately) | - |
| `/config` | Open configuration panel (with search filtering) | Enhanced v2.1.6 |
| `/doctor` | Check installation health (unreachable rule detection, update channel) | Enhanced v2.1.3, v2.1.6 |
| `/debug` | Troubleshoot current session | v2.1.30 |
| `/sandbox` | Manage sandbox mode (shows dependency status) | Enhanced v2.1.20 |
| `/stats` | View usage statistics (date range filtering with `r` key) | Enhanced v2.1.6 |
| `/rename` | Rename current session | - |
| `/tag` | Tag current session | - |
| `/resume` | Resume a previous session | - |
| `/tasks` | View/manage background tasks | v2.1.16 |
| `/plugins` | Manage plugins (discover, installed) | v2.1.14 |
| `/theme` | Theme picker (Ctrl+T toggles syntax highlighting) | Enhanced v2.0.74 |
| `/terminal-setup` | Configure terminal (Kitty, Alacritty, Zed, Warp) | v2.0.74 |
| `/copy` | Copy content to clipboard | v2.1.20 |
| `/feedback` | Submit feedback (opens GitHub issue) | - |
| `/mcp` | MCP server management | - |
| `/skills` | Browse available skills (shows plugin name) | Enhanced v2.1.33 |

---

## 2. Configuration System

### 2.1 File Hierarchy (Precedence Order)

```
~/.claude/settings.json                    # User-wide (all projects)
    ↓
~/.claude/CLAUDE.md                        # User-wide instructions
    ↓
<project>/.claude/settings.json            # Project-wide (version controlled)
    ↓
<project>/.claude/settings.local.json      # Local overrides (gitignored)
    ↓
<project>/CLAUDE.md                        # Project instructions
    ↓
<project>/.mcp.json                        # MCP server configuration
```

**Additional CLAUDE.md Loading** (v2.1.20):
- CLAUDE.md files from `--add-dir` directories are loaded when `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` is set
- External imports require approval dialog showing which files are being imported

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
- Additional directories via `--add-dir` (with env var)

### 2.3 settings.json Structure

```json
{
  "model": "opus-4-6",
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
  },
  "plansDirectory": ".claude/plans",
  "spinnerVerbs": ["Thinking", "Analyzing", "Processing"],
  "showTurnDuration": true,
  "reducedMotion": false
}
```

### 2.4 Permission Syntax

| Pattern | Meaning | Example |
|---------|---------|---------|
| `Tool(pattern)` | Exact match | `Bash(npm test)` |
| `Tool(prefix:*)` | Prefix match | `Bash(git:*)` |
| `Tool(*)` or `Tool` | All variants (equivalent) | `Read(*)` = `Read` |
| `Tool(./**)` | Glob pattern | `Write(./**/*.ts)` |

**Permission Precedence** (v2.1.27):
Content-level `ask` overrides tool-level `allow`. Example: `allow: ["Bash"]` with `ask: ["Bash(rm *)"]` will now prompt for `rm` commands.

**Unreachable Rule Detection** (v2.1.3):
`/doctor` warns about permission rules that can never match, showing the source of each rule with actionable fix guidance.

### 2.5 Environment Variables

| Variable | Purpose | Since |
|----------|---------|-------|
| `ANTHROPIC_MODEL` | Override default model | - |
| `CLAUDE_CODE_TMPDIR` | Custom temp directory for internal files | v2.1.5 |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks and Ctrl+B | v2.1.4 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable experimental features | v2.1.25 |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | Load CLAUDE.md from --add-dir | v2.1.20 |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams (set to 1) | v2.1.32 |
| `CLAUDE_CODE_ENABLE_TASKS` | Toggle task system (set false to disable) | v2.1.19 |
| `FORCE_AUTOUPDATE_PLUGINS` | Force plugin auto-update even when main auto-updater disabled | v2.1.2 |

---

## 3. Agents and Subagents

### 3.1 Agent Definition

Agents are markdown files with YAML frontmatter in `.claude/agents/`:

```markdown
---
name: "Code Reviewer"
description: "Reviews code for quality and security"
model: "sonnet"
tools:
  allow:
    - Read
    - Grep
    - Task(Explore)
  deny:
    - Write
    - Bash
memory: project
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

| Field | Type | Description | Since |
|-------|------|-------------|-------|
| `name` | string | Display name | - |
| `description` | string | When to invoke | - |
| `model` | string | Model to use (opus, sonnet, haiku) | - |
| `tools.allow` | array | Permitted tools | - |
| `tools.deny` | array | Forbidden tools | - |
| `tools` | array | Alternative syntax (with `Task(agent_type)` restriction) | v2.1.33 |
| `allowed_tools` | array | Legacy syntax for tools | - |
| `skills` | array | Skills to auto-load for this agent | v2.0.43 |
| `permissionMode` | string | Permission tier for agent | v2.0.43 |
| `memory` | string | Persistent memory scope: `user`, `project`, or `local` | v2.1.33 |

**Sub-Agent Type Restriction** (v2.1.33):
Use `Task(agent_type)` syntax in tools to restrict which sub-agents can be spawned:
```yaml
tools:
  allow:
    - Read
    - Grep
    - Task(Explore)      # Can only spawn Explore subagents
    - Task(Bash)         # Can only spawn Bash subagents
```

**Agent Memory** (v2.1.33):
The `memory` frontmatter field gives agents persistent memory across sessions:
```yaml
memory: project    # Scoped to current project
memory: user       # Scoped to user (across projects)
memory: local      # Scoped to local machine
```

### 3.3 Agent Teams (Experimental, v2.1.32)

Multi-agent collaboration for complex workflows. Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

- Agents can send and receive messages via tmux sessions
- TeammateIdle and TaskCompleted hook events for coordination
- Token-intensive feature (research preview)

```bash
# Enable agent teams
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### 3.4 Invoking Agents

```bash
# Via --agent CLI flag
claude --agent code-reviewer

# Resume preserves --agent setting (v2.1.32)
claude --resume  # Re-uses previous --agent

# In Claude Code session via Task tool
# Claude automatically routes to appropriate agents
```

### 3.5 Built-in Agent Types (via Task tool)

| Agent Type | Purpose | Tools |
|------------|---------|-------|
| `Explore` | Fast codebase exploration | Read, Glob, Grep |
| `Plan` | Implementation planning | Read, Glob, Grep |
| `Bash` | Command execution | Bash |
| `general-purpose` | Flexible multi-step tasks | All tools |

---

## 4. Skills and Commands

### 4.1 Unified Skill Model (v2.1.3)

Slash commands and skills have been **merged into a single concept**. Both live in `.claude/commands/` or `.claude/skills/` with no behavioral difference.

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

### 4.2 Skill Features

| Feature | Details |
|---------|---------|
| **Arguments** | `$ARGUMENTS` for full args, `$ARGUMENTS[0]`, `$ARGUMENTS[1]` for indexed (v2.1.19) |
| **Auto-load** | Skills from `--add-dir` directories loaded automatically (v2.1.32) |
| **Nested discovery** | Skills from nested `.claude/skills/` in subdirectories auto-discovered (v2.1.6) |
| **Context budget** | Skill descriptions scale with context window (2% of context, v2.1.32) |
| **Session ID** | `${CLAUDE_SESSION_ID}` substitution available in skills (v2.1.9) |
| **Permissions** | Skills without additional permissions/hooks allowed without approval (v2.1.19) |
| **Plugin attribution** | Plugin name shown in skill descriptions and `/skills` menu (v2.1.33) |

### 4.3 Skill Configuration

```markdown
---
name: "security-review"
description: "Performs security audit on code changes"
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

## 5. Plugin System (v2.1.14+)

### 5.1 Overview

Plugins extend Claude Code with marketplace-distributed capabilities.

### 5.2 Plugin Management

```bash
# Discover plugins
/plugins                    # Opens plugin management UI

# Install from marketplace
/plugin install sdlc@aiwg   # Install specific plugin

# Pin to specific version
# Marketplace entries can pin to git commit SHAs

# List installed
/plugin list                # Unified view with scope-based grouping (v2.1.2)

# Auto-update
# Set FORCE_AUTOUPDATE_PLUGINS=1 to force updates
```

### 5.3 VSCode Plugin Support (v2.1.16)

Native plugin management in VS Code extension, including discovery and installation.

---

## 6. Task Management (v2.1.16+)

### 6.1 Overview

Built-in task tracking with dependency management for complex workflows.

### 6.2 Task Tools

| Tool | Purpose |
|------|---------|
| `TaskCreate` | Create new tasks with subject, description, activeForm |
| `TaskUpdate` | Update status, add dependencies, delete tasks (v2.1.20) |
| `TaskGet` | Retrieve full task details including dependencies |
| `TaskList` | List all tasks with status summary |
| `TaskStop` | Stop running background tasks (shows description, v2.1.30) |

### 6.3 Task Features

- **Dependency tracking**: `blocks` and `blockedBy` relationships between tasks
- **Status workflow**: `pending` → `in_progress` → `completed` (or `deleted`)
- **Background tasks**: Ctrl+B to background a running task
- **Task notifications**: Inline display of agent responses (capped at 3 lines, v2.1.20)
- **Task IDs**: No longer reused after deletion (v2.1.21)
- **Dynamic display**: Task list adjusts visible items based on terminal height (v2.1.20)

### 6.4 Token Metrics (v2.1.30)

Task tool results include token count, tool uses, and duration metrics for cost tracking.

---

## 7. Memory System

### 7.1 Automatic Memory (v2.1.32)

Claude now **automatically records and recalls memories** as it works. No manual configuration needed.

### 7.2 Memory Hierarchy

```
Session Memory       (current conversation, most specific)
    ↓
Auto Memory          (~/.claude/projects/<project>/memory/MEMORY.md)
    ↓
Project Memory       (.claude/memory.md or CLAUDE.md)
    ↓
User Memory          (~/.claude/CLAUDE.md)
    ↓
System Defaults      (least specific)
```

### 7.3 Agent Memory (v2.1.33)

Agents can have persistent memory via the `memory` frontmatter field:

| Scope | Storage | Use Case |
|-------|---------|----------|
| `user` | User-wide | Cross-project preferences |
| `project` | Project directory | Project-specific learnings |
| `local` | Local machine | Machine-specific config |

### 7.4 Memory Best Practices

- MEMORY.md is always loaded into system prompt (keep under 200 lines)
- Create separate topic files (e.g., `debugging.md`, `patterns.md`) for detailed notes
- Link to topic files from MEMORY.md
- Record insights about problem constraints, strategies that worked/failed
- Update or remove memories that become outdated

---

## 8. MCP Integration

### 8.1 Overview

Model Context Protocol (MCP) extends Claude Code with external tools and services.

**Configuration Locations**:
| File | Scope | Sharing |
|------|-------|---------|
| `.mcp.json` | Project | Team via git |
| `~/.claude/mcp.json` | User | Personal |
| `~/.claude/managed-mcp.json` | Org | Read-only |

### 8.2 Server Configuration

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

### 8.3 OAuth for MCP Servers (v2.1.30)

Pre-configured OAuth client credentials for servers that don't support Dynamic Client Registration:
```bash
claude mcp add --client-id <id> --client-secret <secret> my-server
```

### 8.4 MCP Tool Search Auto Mode (v2.1.7)

When MCP tool descriptions exceed **10% of context window**, they are automatically deferred and discovered via the `ToolSearch` tool instead of being loaded upfront.

- Enabled by default for all users
- Configurable threshold: `auto:N` syntax where N is context window percentage (0-100)
- Disable by adding `ToolSearch` to `disallowedTools`

### 8.5 MCP Management Commands

```bash
claude mcp list              # List configured servers
claude mcp get <server>      # Get server details
claude mcp add <server>      # Add server (with --client-id/--client-secret for OAuth)
claude mcp remove <server>   # Remove a server
claude mcp serve             # Start as MCP server
/mcp enable <name>           # Enable/disable servers in session
```

### 8.6 Popular MCP Servers

| Server | Purpose | Package |
|--------|---------|---------|
| GitHub | GitHub API access | `@anthropics/mcp-server-github` |
| Gitea | Gitea/Forgejo API | `@anthropics/mcp-server-gitea` |
| Filesystem | Extended file ops | `@anthropics/mcp-server-filesystem` |
| PostgreSQL | Database queries | `@anthropics/mcp-server-postgres` |
| Slack | Slack integration (OAuth) | `@anthropics/mcp-server-slack` |

---

## 9. Hooks System

### 9.1 Hook Events

| Event | Trigger | Use Case | Since |
|-------|---------|----------|-------|
| `PreToolUse` | Before tool execution | Validation, permission checks, inject context | Enhanced v2.1.9 |
| `PostToolUse` | After tool completion | Logging, cleanup, verification | - |
| `SubagentStart` | Agent spawned | Trace collection, logging | v2.0.43 |
| `SubagentStop` | Agent completed | Capture transcripts | v2.0.43 |
| `PermissionRequest` | Permission prompt | Auto-approve patterns | v2.0.54 |
| `SessionStart` | Session begins | Init, includes `agent_type` if `--agent` specified | v2.1.2 |
| `Stop` | Session termination | Final validation | - |
| `TeammateIdle` | Agent team member idle | Multi-agent coordination | v2.1.33 |
| `TaskCompleted` | Background task done | Multi-agent workflow triggers | v2.1.33 |

### 9.2 Hook Configuration

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

### 9.3 Hook Features

| Feature | Details | Since |
|---------|---------|-------|
| **additionalContext** | PreToolUse hooks can return `additionalContext` injected to model | v2.1.9 |
| **Timeout** | Hook execution timeout is 10 minutes (was 60 seconds) | v2.1.3 |
| **Background hooks** | Backgrounded hook commands return early without blocking | v2.1.19 |
| **Permission feedback** | Users can provide feedback when accepting permission prompts | v2.1.7 |
| **Background task prompts** | Background agents prompt for tool permissions before launching | v2.1.20 |

### 9.4 Hook Use Cases

1. **Pre-commit validation**: Run tests before commits
2. **Auto-formatting**: Format files after creation
3. **Security scanning**: Check for vulnerabilities
4. **Trace collection**: Log subagent lifecycle via SubagentStart/SubagentStop
5. **Auto-approve patterns**: Approve trusted operations via PermissionRequest
6. **Context injection**: Add context to model via PreToolUse additionalContext
7. **Multi-agent coordination**: React to TeammateIdle/TaskCompleted events

---

## 10. Context Management

### 10.1 Context Limits

| Model | Context Window |
|-------|---------------|
| Opus 4.6 | 200,000 tokens |
| Sonnet 4.5 | 200,000 tokens |
| Haiku 4.5 | 200,000 tokens |

### 10.2 Context Commands

| Command | Action |
|---------|--------|
| `/context` | Visualize usage (grouped skills/agents, sorted token counts) |
| `/compact` | Summarize history (properly clears warning afterward) |
| `/clear` | Reset context (also clears plan files) |
| `Summarize from here` | Partial conversation summarization (v2.1.32) |

### 10.3 Context Optimization Strategies

1. **Use subagents** - Isolate exploratory work in separate context
2. **Clear between tasks** - Fresh context for new work
3. **Leverage CLAUDE.md** - Always-relevant context without manual loading
4. **Monitor with `/context`** - Track usage proactively
5. **Use `/compact`** - Preserve essential history when running low
6. **Partial summarization** - "Summarize from here" to compress only recent history
7. **MCP tool search auto mode** - Defers MCP tool descriptions to save context
8. **Large outputs to disk** - Tool outputs that exceed limits are saved to disk instead of truncated (v2.1.2), accessible via file references

### 10.4 Auto-Compact Behavior

- Auto-compact triggers based on effective context window (reserves space for max output tokens)
- Fixed: No longer triggers too early on models with large output token limits (v2.1.21)
- Fixed: "Context left until auto-compact" warning properly hides after `/compact` (v2.1.15)

---

## 11. Session Management

### 11.1 Session Commands

| Command/Flag | Purpose | Since |
|-------------|---------|-------|
| `/rename <name>` | Name current session | - |
| `/tag <tag>` | Tag current session | - |
| `/resume` | Resume previous session | - |
| `--resume <name>` | Resume by name from CLI | - |
| `--from-pr <num\|url>` | Resume session linked to a PR | v2.1.27 |
| `--fork-session` | Fork from resumed session | v2.1.20 |
| `--session-id <id>` | Custom session ID for forks | v2.0.73 |
| `--agent <name>` | Use specific agent (preserved on resume) | v2.0.60, v2.1.32 |

### 11.2 PR Integration (v2.1.27)

- Sessions automatically linked to PRs when created via `gh pr create`
- Resume sessions by PR number: `claude --from-pr 123`
- PR review status indicator in prompt footer (approved, changes requested, pending, draft)
- Session URL attribution added to commits and PRs from web sessions (v2.1.9)

### 11.3 Session Improvements

- Resume uses 68% less memory via stat-based loading (v2.1.30)
- Session picker shows git branch and message count, searchable by branch (v2.1.33 VSCode)
- Exit hint shows how to resume: `claude --resume` (v2.1.31)
- Fork conversation hint shows how to resume original (v2.1.20)
- Fixed compaction issues that could load full history instead of compact summary (v2.1.20)

---

## 12. Sandboxing and Security

### 12.1 Sandbox Architecture

- **Linux**: bubblewrap
- **macOS**: seatbelt
- **Windows**: WSL2

### 12.2 Security Boundaries

| Boundary | Default |
|----------|---------|
| Filesystem Write | Current directory only |
| Filesystem Read | Entire system (except denied) |
| Network | Unix socket proxy only |

### 12.3 Permission Configuration

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

### 12.4 Security Fixes

- Fixed: Permission bypass via shell line continuation (v2.1.6)
- Fixed: Wildcard permission rules matching compound commands with shell operators (v2.1.7)
- Fixed: Command injection in bash command processing (v2.1.2)

---

## 13. IDE Integrations

### 13.1 VS Code

**Features**:
- Native extension interface
- Automatic context from current editor
- Interactive diff viewing
- Accept/reject workflows
- **Remote sessions**: OAuth users browse/resume sessions from claude.ai (v2.1.33)
- **Session forking and rewind** (v2.1.19)
- **Plugin management**: Native plugin discovery and installation (v2.1.16)
- **Python venv activation**: Auto-detects and uses correct interpreter (v2.1.21)
- **PR review status and git branch** in session picker (v2.1.33)
- **Tab icon badges**: Blue for pending permissions, orange for unread completions (v2.0.73)
- **Multiline input** in question dialogs via Shift+Enter (v2.1.30)
- **Clickable destination selector** for permission requests (v2.1.3)
- **/usage command** for plan usage display (v2.1.14)
- **Claude in Chrome integration** (v2.1.27)

**Installation**: VS Code Marketplace → "Claude Code"

### 13.2 JetBrains IDEs

**Supported**: IntelliJ, PyCharm, WebStorm, GoLand, PhpStorm

**Features**:
- Interactive diff viewer
- Selection context sharing
- Keyboard shortcuts
- Native tool integration

**Installation**: JetBrains Plugin Marketplace → "Claude"

---

## 14. Claude Agent SDK

### 14.1 Installation

```bash
# TypeScript/JavaScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install anthropic-agent-sdk
```

### 14.2 Basic Agent (TypeScript)

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

### 14.3 SDK Notes

- Minimum zod peer dependency: `^4.0.0` (v2.1.2)
- `SDKUserMessageReplay` events when `replayUserMessages` enabled (v2.1.19)
- `queued_command` attachment messages replayed (v2.1.19)

---

## 15. Keyboard Shortcuts

| Shortcut | Action | Since |
|----------|--------|-------|
| `Ctrl+C` | Cancel current operation | - |
| `Ctrl+D` | Exit session | - |
| `Ctrl+B` | Background current task | v2.1.4 |
| `Ctrl+G` | Open external editor | v2.0.73 |
| `Ctrl+S` | Stash/restore prompt | - |
| `Ctrl+T` | Toggle task list / syntax highlighting in /theme | - |
| `Ctrl+Y` | Yank (paste from kill ring) | - |
| `Alt+Y` | Yank-pop (cycle kill ring history) | v2.0.73 |
| `Ctrl+Z` | Suspend (fixed for Kitty protocol terminals) | Fixed v2.1.9 |
| `Shift+Tab` | Quick "auto-accept edits" in plan mode | v2.1.2 |
| `Tab` | Autocomplete (including bash history with `!`) | Enhanced v2.1.14 |
| `↑` / `↓` | Navigate history (vim normal mode support) | Enhanced v2.1.20 |
| `Esc Esc` | Browse and restore history | - |

---

## 16. Installation

### 16.1 Recommended Installation

```bash
# Direct install (recommended)
claude install

# Or via package managers
# macOS
brew install claude-code

# Windows
winget install claude-code
```

### 16.2 npm Deprecation Notice (v2.1.15)

npm installation is deprecated. Run `claude install` or visit https://docs.anthropic.com/en/docs/claude-code/getting-started for alternatives.

### 16.3 Auto-Updates

- `/config` includes release channel toggle (stable or latest) (v2.1.3)
- `/doctor` shows auto-update channel and available versions (v2.1.6)
- Config backups are timestamped and rotated (5 most recent) (v2.1.20)

---

## 17. Best Practices for AIWG Integration

### 17.1 Agent Design

```yaml
# AIWG agents should include:
---
name: "Requirements Analyst"
model: "sonnet"
memory: project                    # Persistent memory
tools:
  allow:
    - Read
    - Write
    - Grep
    - Glob
    - Task(Explore)                # Restricted subagent types
  deny:
    - Bash
skills:
  - voice-apply                    # Auto-load skills
---
```

### 17.2 Skill Integration

AIWG skills should:
- Live in `.claude/commands/` or `.claude/skills/` (merged in v2.1.3)
- Use `$ARGUMENTS` for full args, `$ARGUMENTS[0]` for indexed access
- Reference appropriate agents via `agent:` field
- Use `${CLAUDE_SESSION_ID}` for session-aware operations
- Document expected inputs/outputs

### 17.3 MCP Server Patterns

For AIWG MCP integrations:
- Store configs in `.mcp.json` (team-shared)
- Use environment variables for secrets
- Leverage MCP tool search auto mode for large tool sets
- Use OAuth credentials for servers like Slack
- Document server capabilities in `.aiwg/references/`

### 17.4 Hook Patterns

For AIWG hook integrations:
- Use PreToolUse `additionalContext` to inject AIWG context
- Use SubagentStart/SubagentStop for trace collection
- Hook timeout is 10 minutes (sufficient for test suites)
- TeammateIdle/TaskCompleted for multi-agent orchestration

---

## 18. Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Context exhausted | Use `/compact`, "Summarize from here", or start new session |
| Permission denied | Check settings; content-level ask overrides tool-level allow |
| MCP server not found | Verify `.mcp.json` config and env vars |
| MCP tools using too much context | MCP auto mode defers tools; check ToolSearch |
| Model not switching | Check model name with `/model` |
| Hooks not firing | Verify matcher syntax; check 10-min timeout |
| Unreachable permission rules | Run `/doctor` for detection and fix guidance |
| Session resume issues | Try `--from-pr` for PR-linked sessions |
| PDF too large | Use `pages` parameter: `Read doc.pdf pages: "1-5"` |
| Background tasks stuck | Use `/tasks` to view, TaskStop to cancel |

### Diagnostic Commands

```bash
# Check installation health
/doctor

# Troubleshoot current session
/debug

# View context usage
/context

# List MCP servers
/mcp

# Show configuration (with search)
/config

# View usage stats
/stats
```

---

## 19. Official Documentation Links

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
- @.claude/commands/ - Custom commands/skills
- @.aiwg/planning/claude-code-features-leverage.md - Feature leverage analysis
