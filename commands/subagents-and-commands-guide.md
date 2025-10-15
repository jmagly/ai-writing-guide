# Comprehensive Guide to Claude Code Subagents

## Overview

Subagents in Claude Code allow you to delegate complex, multi-step tasks to specialized AI agents that operate
autonomously. This reduces task completion time from hours to minutes by enabling parallel execution and leveraging
specialized expertise.

## Core Concepts

### What Are Subagents

Subagents are specialized Claude instances launched through the Task tool, each configured for specific domains or task
types. They operate independently with their own context windows and tool permissions.

### Key Benefits

1. **Parallel Execution**: Launch multiple agents simultaneously for independent tasks
2. **Specialized Expertise**: Each agent optimized for specific domains
3. **Context Isolation**: Agents maintain separate contexts, preventing interference
4. **Resource Efficiency**: Use appropriate models (Haiku, Sonnet, Opus) based on task complexity

## Available Agent Types

### Built-in Agents

#### general-purpose

- **Use Case**: Complex research, multi-step tasks, comprehensive searches
- **Tools**: Full access to all tools
- **When to Use**: Open-ended tasks requiring exploration and iteration

#### statusline-setup

- **Use Case**: Configuring Claude Code status line settings
- **Tools**: Read, Edit
- **When to Use**: User preference configuration

#### output-style-setup

- **Use Case**: Creating custom output styles
- **Tools**: Read, Write, Edit, Glob, Grep
- **When to Use**: Formatting and styling configuration

## Best Practices

### 1. Task Delegation Strategy

#### DO Delegate

- Complex searches across large codebases
- Multi-step research requiring iteration
- Independent parallel tasks
- Specialized domain expertise needs

#### DON'T Delegate

- Simple file reads (use Read tool directly)
- Single class/function searches (use Glob)
- Specific file edits (use Edit)
- Tasks requiring real-time interaction

### 2. Prompt Engineering for Subagents

#### Structure Your Prompts

```markdown
TASK: [Clear, specific objective]

CONTEXT:
- [Relevant background information]
- [Current state/requirements]

STEPS:
1. [Specific action]
2. [Specific action]
3. [Expected deliverable]

RETURN:
- [Exactly what information to return]
- [Format expectations]
```

#### Example: Code Review Agent

```markdown
TASK: Review the authentication module for security vulnerabilities

CONTEXT:
- Node.js/Express application
- JWT-based authentication
- Files located in src/auth/

STEPS:
1. Analyze JWT implementation for common vulnerabilities
2. Check password handling and storage
3. Review session management
4. Examine rate limiting and brute force protection

RETURN:
- List of specific vulnerabilities found with severity levels
- Code locations for each issue
- Remediation recommendations
```

### 3. Parallel Execution Patterns

#### Pattern 1: Independent Analysis

```python
# Launch multiple agents for different aspects
- Security audit agent
- Performance analysis agent
- Code quality review agent
- Documentation coverage agent
```

#### Pattern 2: Divide and Conquer

```python
# Split large refactoring across agents
- Agent 1: Refactor authentication module
- Agent 2: Refactor payment processing
- Agent 3: Update tests for both modules
```

#### Pattern 3: Research and Implementation

```python
# Parallel research and coding
- Agent 1: Research best practices for caching strategy
- Agent 2: Implement basic caching framework
- Agent 3: Write comprehensive tests
```

## Advanced Techniques

### 1. Agent Chaining

While agents can't communicate directly, you can chain their outputs:

```text
1. Research Agent → Generates implementation plan
2. You review plan → Launch implementation agents
3. Implementation Agents → Create code
4. Review Agent → Validates implementation
```

### 2. Context Optimization

Agents have isolated contexts, so:

- Include all necessary information in the prompt
- Specify exact file paths when known
- Provide search patterns and keywords
- Set clear boundaries for the task

### 3. Error Handling

Always instruct agents to:

- Report when blocked or unable to complete
- Provide partial results if full completion impossible
- Include diagnostic information for failures
- Suggest alternative approaches

## Common Patterns

### Pattern: Comprehensive Codebase Search

```markdown
TASK: Find all implementations and usages of payment processing

STEPS:
1. Search for payment-related files (payment, billing, charge, invoice)
2. Identify all payment provider integrations
3. Map data flow from user action to payment completion
4. Find all error handling related to payments

RETURN:
- File list with descriptions
- Integration points
- Data flow diagram in text
- Potential issues found
```

### Pattern: Multi-Repository Analysis

```markdown
TASK: Analyze microservice dependencies

CONTEXT:
- Services in /services/ directory
- Each service has package.json
- Looking for shared dependencies and version conflicts

STEPS:
1. List all services
2. Extract dependencies from each
3. Compare versions across services
4. Identify conflicts and outdated packages

RETURN:
- Service dependency matrix
- Version conflict list
- Upgrade recommendations
```

### Pattern: Test Generation

```markdown
TASK: Generate comprehensive tests for UserService

CONTEXT:
- Service located in src/services/UserService.js
- Using Jest framework
- Needs unit and integration tests

STEPS:
1. Analyze UserService methods and dependencies
2. Generate unit tests with mocking
3. Create integration tests for API endpoints
4. Add edge cases and error scenarios

RETURN:
- Complete test file content
- Coverage estimate
- Any assumptions made
```

## Troubleshooting

### Agent Not Finding Information

- Make prompt more specific with file paths
- Provide better search keywords
- Break into smaller, focused tasks

### Agent Taking Too Long

- Reduce scope of task
- Use more specific search patterns
- Consider using multiple focused agents

### Agent Returning Incomplete Results

- Ensure return requirements are explicit
- Provide format examples
- Set clear completion criteria

## Performance Optimization

### 1. Model Selection

- **Haiku**: Simple searches, basic file operations
- **Sonnet**: Code analysis, implementation, testing
- **Opus**: Architecture decisions, complex reasoning

### 2. Task Sizing

- Keep tasks under 10 minutes of work
- Break large tasks into parallel subtasks
- Be specific to avoid exploration overhead

### 3. Search Optimization

- Provide specific file patterns
- Include likely locations
- Give example code snippets to search for

## Integration Examples

### Example 1: Feature Implementation

```python
# Main Claude orchestrates:
1. Requirements analysis agent
2. Architecture design agent
3. Parallel implementation agents (frontend/backend)
4. Test creation agent
5. Documentation agent
```

### Example 2: Bug Investigation

```python
# Systematic debugging:
1. Error reproduction agent
2. Root cause analysis agent
3. Fix implementation agent
4. Regression test agent
```

### Example 3: Refactoring Project

```python
# Large refactor coordination:
1. Dependency analysis agent
2. Impact assessment agent
3. Multiple refactoring agents (by module)
4. Test update agents
5. Documentation update agent
```

## Metrics and Monitoring

Track agent effectiveness by monitoring:

- Task completion rates
- Average execution time
- Prompt revision frequency
- Output quality/usefulness

## Custom Commands and Automation

### Slash Commands vs Agents

Claude Code supports both custom slash commands and agents, each serving different purposes:

| Use Slash Commands For | Use Agents For |
|----------------------|---------------|
| Quick, focused tasks | Complex, multi-step workflows |
| File manipulation | Deep analysis and reasoning |
| Simple transformations | Domain expertise requirements |
| Status checks | Creative problem solving |
| Formatting operations | Strategic decision making |

### Creating Custom Commands

#### Basic Command Structure

```markdown
---
name: Command Name
description: Brief description of functionality
model: sonnet
tools: ["read", "write", "bash"]
argument-hint: "expected arguments"
color: blue
---

# Command Implementation
[Command logic and instructions]
```

#### Command Locations

- **Project Commands**: `.claude/commands/command-name.md`
- **Personal Commands**: `~/.claude/commands/command-name.md`
- **Agents**: `.claude/agents/agent-name.md`

#### Example: Code Review Command

```markdown
---
name: Code Review
description: Comprehensive security and performance review
model: sonnet
tools: ["read", "grep", "glob"]
argument-hint: "file-path or 'staged'"
---

You are a Senior Code Reviewer focusing on production-ready code.

For the specified code:
1. Check security vulnerabilities (SQL injection, XSS, auth)
2. Identify performance issues (N+1 queries, algorithms)
3. Review maintainability (complexity, duplication)

Provide specific, actionable feedback with code examples.
```

### Automation with Hooks

#### Hook System Overview

Claude Code supports hooks that trigger on specific events:

- **UserPromptSubmit**: When user submits a prompt
- **PreToolUse**: Before tool execution (can block)
- **PostToolUse**: After tool completion
- **Stop**: When Claude finishes responding
- **SubAgentStop**: When sub-agents complete
- **SessionEnd**: When session terminates

#### Hook Configuration

Configure in `~/.claude/settings.json`:

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
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo 'Session completed at $(date)' >> ~/claude-sessions.log"
          }
        ]
      }
    ]
  }
}
```

### Command Development Workflow

#### 1. Planning

```yaml
define:
  purpose: "What problem does this solve?"
  scope: "What should/shouldn't it do?"
  inputs: "What information is needed?"
  outputs: "What should it produce?"
  tools: "What capabilities are required?"
```

#### 2. Implementation

```bash
# Create command file
touch .claude/commands/my-command.md

# Test with usage
/project:my-command test-input

# Iterate based on results
```

#### 3. Security Considerations

```json
// In .claude/settings.local.json
{
  "permissions": {
    "allow": ["Bash(git:*)", "Read(/src/**)"],
    "deny": ["Bash(rm:*)", "Write(/etc/**)"],
    "ask": ["Bash(npm:install)"]
  }
}
```

### Ready-to-Use Command Examples

See `docs/commands/examples/development-commands.md` for:

- **Code Review**: Security and performance analysis
- **Test Generator**: Comprehensive test suite creation
- **Commit Helper**: Conventional commit messages
- **API Documentation**: Comprehensive endpoint docs
- **Docker Optimization**: Production-ready containers
- **Project Setup**: Best-practice project initialization

### Command Templates

- **Basic Command**: `docs/commands/templates/basic-command-template.md`
- **Advanced Agent**: `docs/commands/templates/agent-command-template.md`

### Best Practices for Commands

1. **Single Responsibility**: Each command does one thing well
2. **Clear Interface**: Obvious inputs, predictable outputs
3. **Error Handling**: Graceful failure with helpful messages
4. **Security First**: Minimal required permissions
5. **Documentation**: Include usage examples and edge cases

## Future Considerations

As the subagent system evolves, expect:

- More specialized agent types
- Inter-agent communication capabilities
- Persistent agent sessions
- Custom agent definition support
- Enhanced command automation
- Improved hook system integration

## Quick Reference

### Launch Single Agent

```text
Use Task tool with detailed prompt
```

### Launch Parallel Agents

```text
Send single message with multiple Task tool calls
```

### Agent Best For

- **general-purpose**: Unknown scope, exploration needed
- **Specific tools**: When you know exactly what's needed

### Don't Use Agents For

- Single file reads
- Simple grep/searches
- Direct file edits
- Real-time interaction needs
