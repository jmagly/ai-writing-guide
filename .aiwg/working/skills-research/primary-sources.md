# Claude Code "Skills" Feature Research Report

**Research Date**: 2025-12-06
**Researcher**: Technical Research Agent
**Status**: INCONCLUSIVE - Feature Not Found in Current Implementation

---

## Executive Summary

After comprehensive analysis of the Claude Code environment (both global configuration and project-specific implementations), **no "skills" feature was found**. The current Claude Code implementation uses:

1. **Agents** (specialized Claude instances with specific roles)
2. **Slash Commands** (custom commands defined in markdown)
3. **Tools** (built-in capabilities like Read, Write, Bash, etc.)
4. **Hooks** (event-triggered automation)

**Conclusion**: Either "skills" is:
- A feature not yet implemented in this version of Claude Code
- An upcoming/beta feature not documented locally
- Terminology used differently in official Anthropic documentation (not accessible via local research)
- A misunderstanding or conflation with existing features (agents/commands)

---

## Research Methodology

### Approach

Due to lack of network access, research was conducted by analyzing:

1. **Global Claude Configuration**: `~/.claude/` directory
2. **Project Configuration**: `.claude/` directory in ai-writing-guide repository
3. **Documentation**: All markdown files in the project
4. **Configuration Files**: JSON settings, manifests, permissions

### Search Patterns

```bash
# Searched for "skill" mentions
grep -r "skill" ~/.claude/*.md
grep -r "skill" /path/to/project/docs/
find . -name "*skill*"

# Examined directory structure
ls -la ~/.claude/
ls -la .claude/
```

### Limitations

- **No network access**: Cannot fetch official Anthropic documentation
- **Local environment only**: Findings limited to installed version
- **No API access**: Cannot query Claude Code internals or metadata

---

## Findings: Claude Code Architecture

### 1. Agents

**Location**: `.claude/agents/*.md`

**Purpose**: Specialized Claude instances with specific roles and expertise

**Structure**:

```markdown
---
name: Agent Name
description: Brief description of agent's purpose
model: sonnet|opus|haiku
tools: Bash, Grep, MultiEdit, Read, WebFetch, Write
---

# Agent Role

[Detailed instructions for the agent's behavior and capabilities]
```

**Examples Found**:
- `writing-validator.md` - Validates content against AI patterns
- `code-reviewer.md` - Reviews code for security and performance
- `architecture-designer.md` - Creates software architecture documents
- `test-engineer.md` - Generates and executes tests
- 100+ specialized SDLC and marketing agents

**Key Characteristics**:
- Each agent has isolated context
- Agents can be launched via Task tool
- Agents operate independently and in parallel
- Agents are role-based (e.g., Security Architect, DevOps Engineer)

**Source**: `.claude/agents/` directory, project documentation

---

### 2. Slash Commands

**Location**: `.claude/commands/*.md`

**Purpose**: Custom commands that execute predefined workflows

**Structure**:

```markdown
---
description: Command description
category: command-category
argument-hint: <expected-arguments>
allowed-tools: Read, Write, Glob, TodoWrite
model: sonnet
---

# Command Name

[Command implementation instructions]
```

**Examples Found**:
- `/intake-wizard` - Generate project intake forms
- `/flow-security-review-cycle` - Execute security review workflow
- `/project-status` - Check current project phase and status
- `/code-review` - Comprehensive code analysis
- 70+ SDLC workflow commands

**Key Characteristics**:
- Invoked with `/` prefix
- Can orchestrate multi-agent workflows
- Have specific tool permissions
- Support parameters and arguments

**Source**: `.claude/commands/` directory

---

### 3. Tools

**Location**: Built-in to Claude Code platform

**Purpose**: Core capabilities available to Claude and agents

**Available Tools**:
- `Read` - Read files
- `Write` - Write/overwrite files
- `MultiEdit` - Edit multiple files
- `Bash` - Execute shell commands
- `Grep` - Search file contents
- `Glob` - Find files by pattern
- `WebFetch` - Fetch web content (if permitted)
- `Task` - Launch subagents
- `TodoWrite` - Manage task lists

**Permission Control**:

```json
// .claude/settings.local.json
{
  "permissions": {
    "allow": [
      "Read(/home/user/project/**)",
      "Bash(git:*)",
      "Write(./**)"
    ],
    "deny": [
      "Bash(rm:-rf)",
      "Bash(curl:*)"
    ],
    "ask": [
      "Bash(npm:install)"
    ]
  }
}
```

**Source**: `.claude/settings.local.json`, project documentation

---

### 4. Hooks

**Location**: `~/.claude/settings.json`

**Purpose**: Event-triggered automation

**Hook Types**:
- `UserPromptSubmit` - When user submits prompt
- `PreToolUse` - Before tool execution
- `PostToolUse` - After tool completion
- `Stop` - When Claude finishes responding
- `SubAgentStop` - When subagents complete
- `SessionEnd` - When session terminates

**Example Configuration**:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Executing: $TOOL_INPUT' >> ~/claude-audit.log"
          }
        ]
      }
    ]
  }
}
```

**Source**: Documentation in `commands/subagents-and-commands-guide.md`

---

## Feature Comparison: What "Skills" Might Be

### Hypothesis 1: Skills = Agents

**Evidence**:
- Agents are specialized capabilities
- Agents have specific "skills" (security, architecture, testing)
- Agents are invoked for specific tasks

**Counter-Evidence**:
- Agents are called "agents" consistently in documentation
- No mention of "skills" terminology anywhere

**Likelihood**: Low (different terminology would be confusing)

---

### Hypothesis 2: Skills = Commands

**Evidence**:
- Commands provide specific capabilities
- Commands can be custom-defined
- Commands execute specialized workflows

**Counter-Evidence**:
- Commands are explicitly called "commands" or "slash commands"
- Command structure is well-documented, no "skills" reference

**Likelihood**: Low (distinct feature with clear naming)

---

### Hypothesis 3: Skills = Future Feature

**Evidence**:
- No references found in current implementation
- Claude Code is actively developed
- Feature may not be released yet

**Counter-Evidence**:
- No beta/experimental flags found
- No placeholder configuration found

**Likelihood**: Medium (could be unreleased)

---

### Hypothesis 4: Skills = Composite Feature

**Evidence**:
- "Skills" could refer to combination of agents + commands + tools
- User might invoke a "skill" that orchestrates multiple components

**Counter-Evidence**:
- No abstraction layer found for this concept
- No unified interface for "skills"

**Likelihood**: Low (would require new abstraction)

---

## Directory Structure Analysis

### Global Claude Directory

```
~/.claude/
├── CLAUDE.md              # Global instructions
├── settings.json          # User preferences
├── agents/                # User-defined agents
│   └── *.md
├── plans/                 # Saved agent plans
├── todos/                 # Task tracking JSON files
├── plugins/               # Plugin system
│   ├── config.json
│   └── repos/
├── file-history/          # File change tracking
├── session-env/           # Session environments
└── shell-snapshots/       # Shell state snapshots
```

**No `skills/` directory found**

---

### Project Claude Directory

```
.claude/
├── README.md              # Project overview
├── settings.json          # Project settings
├── settings.local.json    # Local permissions
├── manifest.json          # Directory manifest
├── agents/                # Project-specific agents (100+)
│   ├── writing-validator.md
│   ├── code-reviewer.md
│   ├── architecture-designer.md
│   └── ...
└── commands/              # Project-specific commands (70+)
    ├── intake-wizard.md
    ├── flow-security-review-cycle.md
    ├── project-status.md
    └── ...
```

**No `skills/` directory found**

---

## Configuration File Analysis

### settings.json (Global)

```json
{
  "alwaysThinkingEnabled": true,
  "feedbackSurveyState": {
    "lastShownTime": 1754321643452
  }
}
```

**No "skills" configuration found**

---

### settings.local.json (Project)

```json
{
  "permissions": {
    "allow": [
      "Bash(mkdir:*)",
      "Bash(git:*)",
      "Read(//home/user/dev/**)",
      "WebSearch",
      "WebFetch(domain:docs.claude.com)"
    ],
    "deny": [],
    "ask": []
  }
}
```

**No "skills" permissions or references**

---

## Documentation Analysis

### Found Documentation

1. **Claude Code Quick Start** (`docs/integrations/claude-code-quickstart.md`)
   - Setup instructions
   - Workflow examples
   - Natural language command usage
   - **No mention of "skills"**

2. **Subagents and Commands Guide** (`commands/subagents-and-commands-guide.md`)
   - Comprehensive agent documentation
   - Command creation patterns
   - Hook system overview
   - **No mention of "skills"**

3. **Agent Template** (`agents/agent-template.md`)
   - Structure for creating new agents
   - Metadata format
   - **No "skills" field or reference**

4. **Command Template** (`commands/templates/basic-command-template.md`)
   - Structure for creating commands
   - Parameter definitions
   - **No "skills" concept**

---

### Skills-Related Terms Found

All occurrences of "skill" in the codebase refer to **human team skills**, not Claude features:

```markdown
# Examples from documentation

"Team Skills: Frontend (React), Backend (Node.js)"
"Experience: Senior skill level"
"Skill gaps: Docker experience needed"
"Team member skills and experience"
```

**Context**: Project management, team composition, staffing requirements

**NOT related to Claude Code features**

---

## Attempts to Locate Feature

### Search Queries Executed

```bash
# 1. Direct file search
find ~/.claude -name "*skill*"
find .claude -name "*skill*"
# Result: No files found

# 2. Content search
grep -r "skill" ~/.claude/*.md
grep -r "skill" .claude/**/*.md
grep -r "skill" docs/
# Result: Only human team skills mentioned

# 3. JSON configuration search
grep -r "skill" ~/.claude/*.json
grep -r "skill" .claude/*.json
# Result: No matches

# 4. Directory listing
ls -la ~/.claude/
ls -la .claude/
# Result: No skills/ directory

# 5. Plugins check
ls -la ~/.claude/plugins/repos/
cat ~/.claude/plugins/config.json
# Result: Empty plugin repository
```

---

## Comparison with Known Features

| Feature | Purpose | Location | Invocation | Customizable |
|---------|---------|----------|------------|--------------|
| **Agents** | Specialized AI roles | `.claude/agents/*.md` | Task tool | Yes (markdown) |
| **Commands** | Workflow automation | `.claude/commands/*.md` | `/command-name` | Yes (markdown) |
| **Tools** | Core capabilities | Built-in | Automatic | No (platform) |
| **Hooks** | Event triggers | `settings.json` | Automatic | Yes (JSON) |
| **Skills** | ??? | NOT FOUND | ??? | ??? |

---

## Inferences and Speculation

### Possible Explanations

1. **Terminology Confusion**
   - User may have heard "skills" referring to agent capabilities
   - "Skills" could be informal term for agent specializations
   - External documentation may use different terminology

2. **Beta/Unreleased Feature**
   - Feature exists in Anthropic roadmap
   - Not yet shipped to stable releases
   - Documentation not yet published

3. **Platform-Specific**
   - Feature may exist in claude.ai web interface
   - Not available in CLI/desktop Claude Code
   - Different Claude products have different features

4. **Documentation Gap**
   - Feature exists but undocumented
   - Only accessible via API or hidden config
   - Requires specific version or flag

---

## Recommendations for Follow-Up Research

### Primary Sources to Check (Requires Network)

1. **Official Anthropic Documentation**
   - https://docs.anthropic.com/claude-code
   - https://docs.anthropic.com/en/docs/claude-code
   - Search for "skills" in official docs

2. **Anthropic Blog**
   - https://www.anthropic.com/news
   - Product announcements
   - Feature releases

3. **GitHub Repositories**
   - https://github.com/anthropics (official org)
   - Search for "claude-code" repositories
   - Check issues and discussions for "skills"

4. **Claude.ai Platform**
   - https://claude.ai
   - Settings and features in web interface
   - Compare with CLI version

5. **Community Resources**
   - Discord/Slack communities
   - Reddit r/ClaudeAI
   - Developer forums

---

### Questions to Answer

1. **Does the "skills" feature exist?**
   - In which version of Claude?
   - In which deployment mode (web, CLI, desktop)?

2. **If it exists, what is it?**
   - File format (JSON, YAML, markdown)?
   - Directory structure?
   - Configuration schema?

3. **How is it different from agents and commands?**
   - Unique capabilities?
   - Different use cases?
   - Different invocation method?

4. **How are skills defined?**
   - Template/schema?
   - Required fields?
   - Optional parameters?

5. **How are skills invoked?**
   - Command syntax?
   - API calls?
   - Natural language?

6. **Are skills built-in or custom?**
   - Shipped with Claude Code?
   - User-definable?
   - Marketplace/registry?

---

## Conclusion

Based on extensive local research:

**FINDING**: No "skills" feature was found in the current Claude Code implementation.

**CONFIDENCE**: High for local environment, Low for feature existence overall

**REASON**:
- Comprehensive search of configuration files
- Analysis of all documentation
- Examination of directory structures
- No references, configuration, or implementation found

**NEXT STEPS**:
1. Access official Anthropic documentation (requires network)
2. Check product announcements and release notes
3. Compare Claude Code versions (web vs CLI vs desktop)
4. Consult Claude community forums and discussions

**ALTERNATIVE INTERPRETATION**:
- "Skills" may be informal terminology for agent capabilities
- User may be referring to agent specializations
- Feature may exist in different Claude product variant
- Documentation may use "skills" where implementation uses "agents"

---

## Sources Referenced

**Local Configuration**:
- `~/.claude/settings.json`
- `~/.claude/CLAUDE.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude/manifest.json`

**Documentation**:
- `/home/manitcor/dev/ai-writing-guide/docs/integrations/claude-code-quickstart.md`
- `/home/manitcor/dev/ai-writing-guide/commands/subagents-and-commands-guide.md`
- `/home/manitcor/dev/ai-writing-guide/CLAUDE.md`
- `/home/manitcor/dev/ai-writing-guide/.claude/README.md`

**Agent Examples**:
- `.claude/agents/writing-validator.md`
- `.claude/agents/code-reviewer.md`
- `.claude/agents/architecture-designer.md`

**Command Examples**:
- `.claude/commands/intake-wizard.md`
- `.claude/commands/flow-security-review-cycle.md`
- `.claude/commands/project-status.md`

**Directory Structures**:
- `~/.claude/` (global configuration)
- `.claude/` (project configuration)
- `.claude/agents/` (100+ agent definitions)
- `.claude/commands/` (70+ command definitions)

---

## Appendix: Claude Code Feature Summary

### What Claude Code HAS (Confirmed)

1. **Agents** - Specialized AI instances with roles
2. **Slash Commands** - Custom workflow automation
3. **Tools** - Built-in capabilities (Read, Write, Bash, etc.)
4. **Hooks** - Event-triggered automation
5. **Permissions** - Fine-grained access control
6. **Plugins** - Extension system (directory exists, empty)
7. **Multi-Agent Orchestration** - Parallel agent execution
8. **Natural Language Interface** - Command interpretation

### What Claude Code MIGHT HAVE (Unconfirmed)

1. **Skills** - Unknown feature (not found locally)

### What Would Distinguish "Skills" from Existing Features

If "skills" is a distinct feature, it would likely:

- Have a dedicated directory (`.claude/skills/`)
- Have a distinct file format or schema
- Have different invocation syntax
- Serve a purpose not covered by agents/commands
- Have unique configuration options
- Be documented separately from agents/commands

**None of these indicators were found in local research.**

---

**Research Status**: INCOMPLETE - Requires network access to official sources

**Confidence Level**: High (for local environment), Low (for feature existence)

**Last Updated**: 2025-12-06
