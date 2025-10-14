# Claude Code Commands Guide

## Overview

Claude Code supports custom slash commands and hooks that extend functionality beyond the built-in commands. This guide covers how to create, configure, and deploy custom commands for both personal and project use.

## Command Types

### 1. Built-in Commands

Standard commands available in all Claude Code sessions:

- `/help` - Show available commands and usage
- `/clear` - Clear conversation history
- `/model` - Change AI model (sonnet, opus, haiku)
- `/add-dir` - Add working directories to context
- `/config` - Open configuration panel
- `/cost` - Show session token usage and costs
- `/doctor` - Run health check diagnostics
- `/init` - Initialize CLAUDE.md for project
- `/memory` - Edit memory files
- `/mcp` - Show MCP server status
- `/agents` - Show available agents


### 2. Custom Slash Commands

User-defined commands stored as Markdown files with YAML frontmatter.

**Invocation Patterns:**

```bash
/project:command-name     # Project-specific command
/personal:command-name    # Personal/global command
/mcp__server__command     # MCP server command
```

**File Locations:**

```text
# Project-specific commands
.claude/commands/command-name.md

# Personal/global commands
~/.claude/commands/command-name.md

# Project agents (advanced commands)
.claude/agents/agent-name.md
```

### 3. Hooks

Automated responses to Claude Code events:

- **UserPromptSubmit** - When user submits a prompt
- **PreToolUse** - Before tool execution (can block)
- **PostToolUse** - After tool completion
- **Stop** - When Claude finishes responding
- **SubAgentStop** - When sub-agents finish
- **SessionEnd** - When session ends


## Command Structure

### Basic Command Template

```markdown
---
name: Command Name
description: Brief description of what this command does
model: sonnet|opus|haiku
tools: ["bash", "read", "write", "edit", "multiedit", "glob", "grep"]
argument-hint: "Arguments this command expects"
color: orange|blue|green|red
---

# Command Purpose
You are an expert [role] specializing in [domain].

## Your Task
When the user invokes this command:
1. [Step one]
2. [Step two]
3. [Step three]

## Expected Input
- [Input format or requirements]

## Expected Output
- [Output format and expectations]

## Examples
[Provide usage examples]
```

### Advanced Agent Template

```markdown
---
name: Agent Name
description: Specialized agent for specific domain tasks
model: sonnet
tools: ["bash", "read", "write", "edit", "multiedit", "glob", "grep"]
---

You are a [Role] with [X] years of experience in [Domain]. You specialize in [Specific Area].

## Your Expertise
- [Core skill 1]
- [Core skill 2]
- [Domain knowledge]

## Your Process
1. [Analysis phase]
2. [Planning phase]
3. [Execution phase]
4. [Validation phase]

## Working Principles
- [Quality standard]
- [Efficiency principle]
- [Best practice]

## Integration Points
**Receives from:** [Input sources]
**Provides to:** [Output destinations]
**Collaborates with:** [Other agents/systems]

## Success Metrics
- [Measurable outcome 1]
- [Measurable outcome 2]
```

## Configuration Options

### Frontmatter Properties

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `name` | string | Display name for the command | "Code Reviewer" |
| `description` | string | Brief description of purpose | "Reviews code for security and quality" |
| `model` | string | AI model to use | `sonnet`, `opus`, `haiku` |
| `tools` | array | Tools the command can access | `["bash", "read", "write"]` |
| `allowed-tools` | array | Specific tool restrictions | `["bash(git:*)", "read(/src/**)"]` |
| `argument-hint` | string | Help text for arguments | "file-path or directory" |
| `color` | string | UI color theme | `orange`, `blue`, `green`, `red` |

### Model Selection Guidelines

```yaml
haiku:
  use_for: "Simple, fast commands"
  examples: ["file listing", "quick formatting", "simple searches"]
  cost: "Lowest"
  speed: "Fastest"

sonnet:
  use_for: "Balanced tasks requiring reasoning"
  examples: ["code review", "documentation", "moderate complexity"]
  cost: "Medium"
  speed: "Medium"

opus:
  use_for: "Complex reasoning and analysis"
  examples: ["architecture design", "complex debugging", "research"]
  cost: "Highest"
  speed: "Slower but thorough"
```

### Tool Access Control

```yaml
# Full tool access
tools: ["bash", "read", "write", "edit", "multiedit", "glob", "grep"]

# Restricted tool access
tools: ["read", "grep"]  # Read-only commands

# No tools (conversation only)
tools: []

# Specific restrictions via allowed-tools
allowed-tools: [
  "bash(git:*)",           # Only git commands
  "read(/src/**)",         # Only read from src directory
  "write(/docs/**)"        # Only write to docs directory
]
```

## Command Development Workflow

### 1. Planning Phase

```yaml
define:
  - purpose: "What problem does this command solve?"
  - scope: "What should and shouldn't it do?"
  - inputs: "What information does it need?"
  - outputs: "What should it produce?"
  - tools: "What capabilities are required?"
```

### 2. Implementation Phase

```bash
# Create command file
touch .claude/commands/my-command.md

# Add frontmatter and content
# Test with: /project:my-command

# Iterate and refine based on results
```

### 3. Testing Phase

```yaml
test_scenarios:
  - happy_path: "Normal usage with expected inputs"
  - edge_cases: "Empty inputs, invalid arguments"
  - error_handling: "Network failures, file not found"
  - integration: "Works with other commands/agents"
```

### 4. Documentation Phase

```markdown
# Usage Examples
/project:my-command input-file.js
/project:my-command --option value directory/

# Expected Behavior
- Validates input files exist
- Processes according to specified options
- Outputs results in structured format
- Handles errors gracefully
```

## Security Considerations

### Permission System

Control command access via `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Read(/project/src/**)",
      "Write(/project/docs/**)"
    ],
    "deny": [
      "Bash(rm:*)",
      "Bash(sudo:*)",
      "Write(/etc/**)"
    ],
    "ask": [
      "Bash(npm:install)",
      "Write(/package.json)"
    ]
  }
}
```

### Best Practices

- **Principle of Least Privilege**: Only grant necessary tool access
- **Input Validation**: Validate all user inputs within commands
- **Safe Defaults**: Design commands to fail safely
- **Audit Trail**: Log command execution when appropriate
- **Code Review**: Review custom commands like any other code


## Hook Configuration

### Basic Hook Setup

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Executing bash command: $TOOL_INPUT'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Claude session ended at $(date)' >> ~/claude-log.txt"
          }
        ]
      }
    ]
  }
}
```

### Advanced Hook Patterns

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": ".*commit.*",
        "hooks": [
          {
            "type": "command",
            "command": "git status --porcelain | wc -l > /tmp/changed_files"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write.*\\.md$",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Documentation being updated' | tee -a ~/doc-changes.log"
          }
        ]
      }
    ]
  }
}
```

## Common Command Patterns

### Development Workflow Commands

#### Code Review Command

```markdown
---
name: Code Review
description: Comprehensive code review focusing on security, performance, and maintainability
model: sonnet
tools: ["read", "grep", "glob", "bash"]
argument-hint: "file-path or pull-request-url"
---

You are a Senior Code Reviewer who focuses on production-ready code quality.

Review the specified code for:
1. Security vulnerabilities (SQL injection, XSS, auth issues)
2. Performance problems (N+1 queries, inefficient algorithms)
3. Maintainability issues (complexity, duplication)
4. Best practices compliance

Provide specific, actionable feedback with code examples.
```

#### Test Generation Command

```markdown
---
name: Generate Tests
description: Create comprehensive test suites with edge cases
model: sonnet
tools: ["read", "write", "glob", "grep"]
argument-hint: "source-file-path"
---

You are a Test Engineer who writes tests that catch real bugs.

For the specified source file:
1. Analyze all functions and methods
2. Generate unit tests covering happy path and edge cases
3. Include integration tests for external dependencies
4. Add performance tests for critical paths

Focus on testing behavior, not implementation.
```

### Documentation Commands

#### API Documentation

```markdown
---
name: Document API
description: Generate comprehensive API documentation
model: sonnet
tools: ["read", "write", "grep", "glob"]
argument-hint: "api-endpoint-file or directory"
---

You are a Technical Writer specializing in API documentation.

Create documentation including:
1. Endpoint descriptions with HTTP methods
2. Request/response schemas with examples
3. Authentication requirements
4. Error codes and handling
5. Rate limiting information

Use OpenAPI 3.0 format when applicable.
```

### Infrastructure Commands

#### Deployment Validator

```markdown
---
name: Validate Deployment
description: Check deployment configuration for common issues
model: sonnet
tools: ["read", "bash", "grep", "glob"]
argument-hint: "deployment-config-path"
---

You are a DevOps Engineer validating deployment configurations.

Check for:
1. Resource limits and requests
2. Health check configurations
3. Security settings and secrets management
4. Networking and service mesh setup
5. Monitoring and logging configuration

Provide specific recommendations for issues found.
```

## Integration with Agents

### Command vs Agent Decision Matrix

| Use Command When | Use Agent When |
|------------------|----------------|
| Simple, single-purpose task | Complex, multi-step workflow |
| Quick data transformation | Deep domain expertise needed |
| File manipulation | Reasoning and analysis required |
| Status checking | Creative or strategic thinking |
| Formatting operations | Integration with multiple systems |

### Command-Agent Collaboration

```markdown
# In a command that delegates to agents
---
name: Full Feature Review
description: Complete feature review using specialized agents
model: sonnet
tools: ["read", "write", "bash"]
---

You coordinate a comprehensive feature review:

1. Use Requirements Analyst agent to validate requirements
2. Use Code Reviewer agent for technical assessment
3. Use Security Auditor agent for vulnerability analysis
4. Use Test Writer agent to validate test coverage
5. Synthesize findings into actionable report

Delegate each aspect to the appropriate specialist agent.
```

## Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Command not found | File location or naming | Check `.claude/commands/` path and filename |
| Permission denied | Tool restrictions | Review `allowed-tools` and permissions |
| Command fails silently | Model limitations | Add error handling and validation |
| Slow performance | Wrong model choice | Use haiku for simple tasks, opus for complex |
| Inconsistent results | Insufficient context | Improve command instructions and examples |

### Debug Commands

```bash
# List available commands
/help

# Check agent status
/agents

# Verify tool permissions
/doctor

# Review session costs
/cost
```

## Best Practices Summary

### Command Design

1. **Single Responsibility**: Each command should do one thing well
2. **Clear Interface**: Obvious inputs, predictable outputs
3. **Error Handling**: Graceful failure with helpful messages
4. **Documentation**: Include usage examples and edge cases
5. **Security**: Follow principle of least privilege


### Development Process

1. **Start Simple**: Basic functionality first, then enhance
2. **Test Thoroughly**: Cover normal and edge cases
3. **Document Everything**: Commands are part of your codebase
4. **Version Control**: Track command changes like any other code
5. **Share Knowledge**: Document patterns for team use


### Performance Optimization

1. **Choose Right Model**: Match complexity to capability
2. **Minimize Context**: Only include necessary information
3. **Cache Results**: Avoid redundant processing
4. **Parallel Execution**: Use agents for independent tasks
5. **Monitor Usage**: Track costs and performance


This comprehensive guide provides the foundation for creating powerful, secure, and maintainable Claude Code commands that enhance development workflows.
