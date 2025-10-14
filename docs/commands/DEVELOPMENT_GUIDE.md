# Command Development Guide

## Overview

This guide covers advanced topics for developing effective Claude Code commands and agents, including testing strategies, performance optimization, and integration patterns.

## Development Lifecycle

### 1. Planning Phase

#### Requirements Analysis

```yaml
command_requirements:
  purpose: "What specific problem does this solve?"
  target_users: "Who will use this command?"
  frequency: "How often will it be used?"
  complexity: "Simple automation or complex reasoning?"
  dependencies: "What tools and context are needed?"
  success_criteria: "How will we measure effectiveness?"
```

#### Scope Definition

```yaml
in_scope:
  - Primary functionality
  - Core use cases
  - Essential error handling

out_of_scope:
  - Edge cases for MVP
  - Advanced features
  - Integration with external systems

future_considerations:
  - Potential extensions
  - Integration opportunities
  - Performance optimizations
```

### 2. Design Phase

#### Command Architecture

```markdown
## Command Structure Decision Tree

### Simple Command (< 5 steps)
- Use basic command template
- Single model (haiku/sonnet)
- Minimal tool requirements
- Direct input/output

### Complex Command (5+ steps)
- Consider agent template
- May need multiple models
- Comprehensive tool access
- Structured output format

### Workflow Command (Multiple domains)
- Use agent template with coordination
- Delegate to specialized sub-agents
- Define clear handoff protocols
- Implement quality gates
```

#### Tool Selection Matrix

```yaml
tool_selection:
  read_only_analysis:
    tools: ["read", "grep", "glob"]
    examples: ["code review", "documentation analysis"]

  file_manipulation:
    tools: ["read", "write", "edit", "multiedit"]
    examples: ["refactoring", "code generation"]

  system_interaction:
    tools: ["bash", "read", "write"]
    examples: ["deployment", "testing", "git operations"]

  comprehensive_workflow:
    tools: ["bash", "read", "write", "edit", "multiedit", "glob", "grep"]
    examples: ["full feature implementation", "project setup"]
```

### 3. Implementation Phase

#### Command Template Selection

```bash
# For simple, focused tasks
cp docs/commands/templates/basic-command-template.md .claude/commands/my-command.md

# For complex, multi-step workflows
cp docs/commands/templates/agent-command-template.md .claude/agents/my-agent.md
```

#### Configuration Best Practices

```yaml
frontmatter_guidelines:
  name:
    - Use title case
    - Keep under 25 characters
    - Action-oriented (verb + noun)

  description:
    - One clear sentence
    - Under 80 characters
    - Focuses on value delivered

  model:
    - haiku: Simple tasks, fast response
    - sonnet: Balanced capability (default)
    - opus: Complex reasoning, strategic thinking

  tools:
    - Minimal required set
    - Security implications considered
    - Match to actual needs

  color:
    - blue: General purpose
    - green: Success/creation
    - orange: Analysis/warning
    - red: Critical/security
```

### 4. Testing Strategy

#### Unit Testing for Commands

```bash
# Test command creation
touch .claude/commands/test-command.md

# Basic functionality test
/project:test-command valid-input

# Edge case testing
/project:test-command ""
/project:test-command --invalid-flag
/project:test-command non-existent-file.js

# Error handling verification
/project:test-command /etc/passwd  # Should handle permission errors
```

#### Integration Testing

```yaml
integration_scenarios:
  command_chaining:
    - "/project:review src/auth.js"
    - "/project:test src/auth.js"
    - "/project:commit 'Fix auth vulnerabilities'"

  agent_collaboration:
    - Launch multiple agents in parallel
    - Verify context isolation
    - Check output compatibility

  hook_integration:
    - Configure test hooks
    - Verify trigger conditions
    - Validate hook execution
```

#### Performance Testing

```python
# Measure command performance
import time

def test_command_performance():
    start_time = time.time()

    # Execute command
    result = execute_command("/project:my-command", "test-input")

    end_time = time.time()
    execution_time = end_time - start_time

    # Performance assertions
    assert execution_time < 30, f"Command took {execution_time}s, exceeds 30s limit"
    assert result.success, "Command failed to complete"
    assert len(result.output) > 0, "Command produced no output"
```

### 5. Documentation Phase

#### README Template for Commands

```markdown
# Command Name

## Purpose
Brief description of what this command does and why it's useful.

## Usage
```

/project:command-name [arguments]

```text

## Arguments
- `argument1`: Description and expected format
- `argument2`: Optional argument with default behavior

## Examples

### Basic Usage
```

/project:command-name src/component.js

```text
Expected output: [description]

### Advanced Usage
```

/project:command-name --option value directory/

```text
Expected output: [description]

## Error Handling
Common errors and solutions:
- **Error**: "File not found"
  **Solution**: Check file path and permissions
- **Error**: "Invalid format"
  **Solution**: Verify input format matches requirements

## Integration
Works well with:
- Other commands: [list compatible commands]
- Agents: [list relevant agents]
- Workflows: [describe integration patterns]
```

## Advanced Patterns

### 1. Command Composition

#### Sequential Command Pattern

```markdown
# In a coordination command
---
name: Full Feature Review
description: Complete feature analysis with multiple specialists
model: sonnet
tools: ["bash", "read", "write"]
---

You orchestrate a comprehensive feature review:

1. **Requirements Analysis**: Use Requirements Analyst agent
2. **Code Review**: Use Code Reviewer agent
3. **Security Audit**: Use Security Auditor agent
4. **Test Validation**: Use Test Writer agent
5. **Documentation Check**: Use Documentation agent

Synthesize all findings into an executive summary with:
- Overall readiness assessment
- Critical issues requiring immediate attention
- Recommendations for improvement
- Go/no-go decision for deployment
```

#### Parallel Execution Pattern

```markdown
# In agent coordination
---
name: Parallel Analysis
description: Run multiple analyses simultaneously for efficiency
model: sonnet
tools: ["read", "write", "bash"]
---

Launch these agents in parallel for comprehensive analysis:

```

# Parallel execution request
"Run these agents in parallel:
1. Security Auditor: Scan for vulnerabilities
2. Performance Analyzer: Identify bottlenecks
3. Code Quality Reviewer: Check maintainability
4. Documentation Auditor: Verify completeness"

```text

Collect results and provide unified report.
```

### 2. Dynamic Command Generation

#### Context-Aware Command Selection

```python
def select_appropriate_command(context):
    """Select command based on context analysis"""

    if context.file_type == 'javascript':
        return 'js-specific-reviewer'
    elif context.file_type == 'python':
        return 'python-linter'
    elif context.has_security_concerns:
        return 'security-auditor'
    else:
        return 'general-reviewer'
```

#### Adaptive Tool Selection

```yaml
adaptive_tools:
  small_files: ["read", "edit"]
  large_codebase: ["read", "grep", "glob"]
  system_changes: ["bash", "read", "write"]
  security_focus: ["read", "grep", "bash"]
```

### 3. Error Recovery Patterns

#### Graceful Degradation

```markdown
## Error Handling Strategy

### Level 1: Partial Success
If primary task fails:
1. Attempt alternative approach
2. Provide partial results
3. Explain what was accomplished
4. Suggest manual steps for completion

### Level 2: Graceful Failure
If alternative fails:
1. Document exact error conditions
2. Provide diagnostic information
3. Suggest next steps for user
4. Log for future improvement

### Level 3: Safe Termination
If all approaches fail:
1. Ensure no partial changes remain
2. Restore system to known good state
3. Provide clear error message
4. Include contact information for support
```

#### Retry Logic

```python
def execute_with_retry(command, max_retries=3):
    """Execute command with exponential backoff retry"""

    for attempt in range(max_retries):
        try:
            result = execute_command(command)
            if result.success:
                return result
        except Exception as e:
            if attempt == max_retries - 1:
                raise

            wait_time = 2 ** attempt
            time.sleep(wait_time)

    raise CommandFailedException("Max retries exceeded")
```

## Security Guidelines

### Permission Management

#### Principle of Least Privilege

```json
{
  "permissions": {
    "allow": [
      "Read(/project/src/**)",
      "Write(/project/docs/**)",
      "Bash(git:status|add|commit)"
    ],
    "deny": [
      "Bash(rm:*)",
      "Bash(sudo:*)",
      "Write(/etc/**)",
      "Write(/home/**/.ssh/**)"
    ],
    "ask": [
      "Bash(npm:install)",
      "Write(/project/package.json)",
      "Bash(docker:*)"
    ]
  }
}
```

#### Audit and Monitoring

```bash
# Enable command auditing
echo "PreToolUse hook: Log all bash commands" >> ~/.claude/audit.log

# Monitor unusual activity
grep "SECURITY" ~/.claude/audit.log | tail -10

# Review permissions monthly
cat .claude/settings.local.json | jq '.permissions'
```

### Input Validation

#### Sanitization Patterns

```python
def validate_file_path(path):
    """Validate file path for security"""

    # Prevent path traversal
    if '..' in path:
        raise SecurityError("Path traversal attempt detected")

    # Restrict to project directory
    if not path.startswith('/project/'):
        raise SecurityError("Access outside project directory denied")

    # Check file exists and is readable
    if not os.path.exists(path):
        raise FileNotFoundError(f"File not found: {path}")

    return path
```

#### Command Injection Prevention

```python
def safe_bash_execution(command, args):
    """Execute bash command safely"""

    # Whitelist allowed commands
    allowed_commands = ['git', 'npm', 'docker', 'ls', 'cat']

    cmd_parts = command.split()
    if cmd_parts[0] not in allowed_commands:
        raise SecurityError(f"Command not allowed: {cmd_parts[0]}")

    # Escape arguments
    escaped_args = [shlex.quote(arg) for arg in args]

    return subprocess.run([cmd_parts[0]] + escaped_args,
                         capture_output=True, text=True)
```

## Performance Optimization

### Model Selection Optimization

#### Task Complexity Analysis

```python
def select_optimal_model(task):
    """Select model based on task complexity"""

    complexity_indicators = {
        'simple': ['format', 'list', 'status', 'count'],
        'medium': ['analyze', 'review', 'generate', 'transform'],
        'complex': ['architect', 'strategize', 'optimize', 'debug']
    }

    for level, keywords in complexity_indicators.items():
        if any(keyword in task.lower() for keyword in keywords):
            return {
                'simple': 'haiku',
                'medium': 'sonnet',
                'complex': 'opus'
            }[level]

    return 'sonnet'  # Default
```

### Context Window Management

#### Efficient Context Usage

```python
def optimize_context(files, max_tokens=4000):
    """Optimize context for token efficiency"""

    # Prioritize by relevance
    sorted_files = sorted(files, key=lambda f: f.relevance, reverse=True)

    context = []
    token_count = 0

    for file in sorted_files:
        file_tokens = estimate_tokens(file.content)

        if token_count + file_tokens <= max_tokens:
            context.append(file)
            token_count += file_tokens
        else:
            # Include summary for remaining files
            context.append(file.summary)
            token_count += estimate_tokens(file.summary)

    return context
```

### Caching Strategies

#### Result Caching

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def cached_analysis(file_hash, analysis_type):
    """Cache expensive analysis results"""
    return perform_analysis(file_hash, analysis_type)

def get_file_hash(filepath):
    """Generate hash for file content"""
    with open(filepath, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()
```

## Monitoring and Metrics

### Performance Tracking

#### Command Metrics

```python
class CommandMetrics:
    def __init__(self):
        self.execution_times = []
        self.success_rates = {}
        self.error_patterns = {}

    def track_execution(self, command, duration, success):
        self.execution_times.append({
            'command': command,
            'duration': duration,
            'success': success,
            'timestamp': datetime.now()
        })

    def analyze_performance(self):
        avg_time = np.mean([m['duration'] for m in self.execution_times])
        success_rate = np.mean([m['success'] for m in self.execution_times])

        return {
            'average_execution_time': avg_time,
            'success_rate': success_rate,
            'total_executions': len(self.execution_times)
        }
```

### Quality Assurance

#### Automated Testing

```bash
#!/bin/bash
# test-commands.sh - Automated command testing

commands=(
    "review:src/auth.js"
    "test:src/UserService.js"
    "commit:"
    "api-docs:src/routes/"
)

for cmd in "${commands[@]}"; do
    echo "Testing command: $cmd"

    # Execute command and capture result
    result=$(claude-cli "/project:$cmd" 2>&1)

    if [[ $? -eq 0 ]]; then
        echo "✅ $cmd passed"
    else
        echo "❌ $cmd failed: $result"
    fi
done
```

#### Quality Gates

```yaml
quality_checklist:
  functionality:
    - Command performs intended task
    - Error handling covers edge cases
    - Output format is consistent

  security:
    - Minimal required permissions
    - Input validation implemented
    - No sensitive data exposure

  performance:
    - Appropriate model selection
    - Efficient context usage
    - Reasonable execution time

  usability:
    - Clear documentation
    - Helpful error messages
    - Intuitive interface
```

## Troubleshooting Guide

### Common Issues

#### Command Not Found

```bash
# Check command file exists
ls -la .claude/commands/my-command.md

# Verify file syntax
head -20 .claude/commands/my-command.md

# Test command invocation
/project:my-command --help
```

#### Permission Denied

```bash
# Check permissions configuration
cat .claude/settings.local.json | jq '.permissions'

# Review audit log
tail -50 ~/.claude/audit.log

# Test with minimal permissions
echo '{"permissions": {"allow": ["Read(/project/**)"]}}'  > .claude/settings.local.json
```

#### Poor Performance

```bash
# Profile command execution
time /project:my-command test-input

# Check model selection
grep "model:" .claude/commands/my-command.md

# Analyze context usage
grep -E "(include|exclude)" .claude/commands/my-command.md
```

### Debug Commands

#### Command Inspection

```bash
# List all available commands
/help

# Show command details
cat .claude/commands/my-command.md | head -20

# Test command parsing
/project:my-command --dry-run
```

#### Performance Analysis

```bash
# Check token usage
/cost

# Monitor agent status
/agents

# System health check
/doctor
```

This development guide provides the foundation for creating robust, secure, and efficient Claude Code commands that enhance development workflows while maintaining quality and security standards.
