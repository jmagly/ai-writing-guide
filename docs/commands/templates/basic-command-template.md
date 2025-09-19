# Basic Command Template

Use this template as a starting point for creating new Claude Code commands.

## File: `.claude/commands/command-name.md`

```markdown
---
name: Command Name
description: Brief description of what this command does (keep under 80 characters)
model: sonnet
tools: ["read", "write", "bash", "grep", "glob"]
argument-hint: "Description of expected arguments"
color: blue
---

# [Command Name]

You are a [Role/Expert Type] specializing in [Domain/Skill Area].

## Your Task

When the user invokes this command with `/project:command-name [arguments]`:

1. **Analyze** the provided [input type]
2. **Process** according to [specific criteria]
3. **Generate** [expected output format]
4. **Validate** results for [quality measures]

## Input Requirements

- **Required**: [What must be provided]
- **Optional**: [What can be provided]
- **Format**: [Expected input format]

## Processing Steps

### Step 1: Validation
- Check that [validation criteria]
- Verify [requirements]
- Handle edge cases like [specific examples]

### Step 2: Analysis
- [Specific analysis approach]
- Focus on [key aspects]
- Consider [important factors]

### Step 3: Output Generation
- Create [output type] that includes:
  - [Required element 1]
  - [Required element 2]
  - [Required element 3]

## Output Format

```[format-type]
[Specific structure example]
```

## Examples

### Example 1: [Scenario Name]
```bash
/project:command-name input-example
```

**Expected Output:**
```
[Sample output showing expected format]
```

### Example 2: [Edge Case]
```bash
/project:command-name --option value
```

**Expected Output:**
```
[Sample output for edge case]
```

## Error Handling

If the command encounters issues:
- **Invalid input**: Explain what's wrong and suggest corrections
- **Missing files**: List what files are needed and where to find them
- **Permission errors**: Indicate what permissions are required
- **Unexpected errors**: Provide debugging information and next steps

## Success Criteria

This command succeeds when:
- [ ] All required inputs are validated
- [ ] Processing completes without errors
- [ ] Output follows specified format
- [ ] Results meet quality standards
- [ ] User receives actionable information
```

## Customization Guide

### 1. Replace Placeholders

| Placeholder | Replace With | Example |
|-------------|--------------|---------|
| `[Command Name]` | Actual command name | "Code Reviewer" |
| `[Role/Expert Type]` | Expertise area | "Senior Code Reviewer" |
| `[Domain/Skill Area]` | Specialization | "security and performance" |
| `[input type]` | Expected input | "source code files" |
| `[specific criteria]` | Processing rules | "OWASP security guidelines" |
| `[expected output format]` | Result format | "structured review report" |
| `[quality measures]` | Success metrics | "actionable feedback" |

### 2. Configure Frontmatter

```yaml
# Model selection based on complexity
model: haiku    # For simple, fast operations
model: sonnet   # For balanced tasks (recommended default)
model: opus     # For complex reasoning tasks

# Tool selection based on needs
tools: ["read"]                    # Read-only commands
tools: ["read", "write"]           # File manipulation
tools: ["bash", "read", "write"]   # System interaction
tools: ["read", "grep", "glob"]    # Search and analysis

# Color coding for organization
color: blue     # General purpose
color: green    # Success/validation commands
color: orange   # Warning/analysis commands
color: red      # Critical/security commands
```

### 3. Add Domain-Specific Logic

```markdown
## Domain-Specific Considerations

### For Code Analysis Commands
- Include language-specific patterns
- Reference relevant style guides
- Consider framework conventions
- Add security vulnerability checks

### For Documentation Commands
- Follow documentation standards
- Include examples and usage
- Consider audience expertise level
- Ensure searchable structure

### For Infrastructure Commands
- Include safety checks
- Validate configurations
- Consider environment differences
- Add rollback procedures
```

## Validation Checklist

Before deploying your command:

- [ ] **Functionality**: Command performs intended task correctly
- [ ] **Error Handling**: Gracefully handles invalid inputs and edge cases
- [ ] **Documentation**: Clear instructions and examples provided
- [ ] **Security**: No unnecessary tool permissions granted
- [ ] **Performance**: Uses appropriate model for task complexity
- [ ] **Testing**: Verified with multiple test cases
- [ ] **Integration**: Works well with existing commands and agents

## Testing Your Command

### 1. Basic Functionality Test
```bash
# Test with typical input
/project:your-command normal-input

# Test with edge cases
/project:your-command ""
/project:your-command --help
```

### 2. Error Condition Tests
```bash
# Test with missing arguments
/project:your-command

# Test with invalid input
/project:your-command invalid-input
```

### 3. Integration Tests
```bash
# Test with other commands
/project:your-command | /project:another-command

# Test in workflow context
```

## Common Patterns

### File Processing Command
```markdown
## Your Task
1. **Read** the specified file using the Read tool
2. **Analyze** content for [specific criteria]
3. **Transform** according to [rules]
4. **Write** results to [output location]
```

### Analysis Command
```markdown
## Your Task
1. **Search** for relevant files using Glob tool
2. **Extract** information using Grep tool
3. **Analyze** patterns and relationships
4. **Report** findings with specific recommendations
```

### Validation Command
```markdown
## Your Task
1. **Check** all specified criteria
2. **Identify** any violations or issues
3. **Categorize** findings by severity
4. **Suggest** specific remediation steps
```

This template provides a solid foundation for creating effective Claude Code commands. Customize it based on your specific needs and domain requirements.