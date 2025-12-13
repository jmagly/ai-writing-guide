---
id: <TOOL_ID>
name: <TOOL_NAME>
version: <VERSION>
category: <core|languages|utilities|custom>
platform: <linux|macos|windows|wsl>
platformNotes: "<cross-platform availability notes>"
status: <verified|unverified|unavailable>
verifiedDate: <YYYY-MM-DD>
capabilities:
  - <capability-1>
  - <capability-2>
synopsis: "<one-line description>"
---

# <TOOL_NAME> - <Brief Description>

## Quick Reference

```bash
# Essential patterns - copy and use immediately
<cmd> <basic_usage>                  # <description>
<cmd> <common_flag> <arg>            # <description>
<cmd> <pipe_pattern>                 # <description>
```

## Synopsis

<Expanded one-paragraph description of what the tool does, when to use it, and its primary strengths.>

## Common Patterns

### <Pattern Category 1: e.g., Basic Usage>

```bash
# <Descriptive comment>
<command example>

# <Descriptive comment>
<command example>
```

### <Pattern Category 2: e.g., Piped Operations>

```bash
# <Descriptive comment>
<command example>

# <Descriptive comment>
<command example>
```

### <Pattern Category 3: e.g., Advanced Usage>

```bash
# <Descriptive comment>
<command example>

# <Descriptive comment>
<command example>
```

## Key Flags

| Flag | Description | Example |
|------|-------------|---------|
| `<-f>` | <description> | `<cmd> -f <arg>` |
| `<--flag>` | <description> | `<cmd> --flag=<value>` |
| `<-v>` | <description> | `<cmd> -v` |

## Input/Output

### Input Formats
- <format 1: e.g., stdin, file, URL>
- <format 2>

### Output Formats
- <format 1: e.g., stdout, file>
- <format 2>

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | <error condition> |
| 2 | <error condition> |

## Error Handling

```bash
# Check for success
<cmd> <args> && echo "Success" || echo "Failed"

# Capture errors
<cmd> <args> 2>&1

# Handle specific error
if ! <cmd> <args>; then
  echo "Error: <description>"
  exit 1
fi
```

## Performance Tips

- <Tip 1: e.g., use flag X for large files>
- <Tip 2: e.g., avoid pattern Y for better performance>
- <Tip 3: e.g., consider alternative Z for specific use case>

## Platform-Specific Notes

### Linux
- **Installation**: `apt install <tool>` / `dnf install <tool>`
- **Path**: Usually `/usr/bin/<tool>`
- **Notes**: <any Linux-specific behavior>

### macOS
- **Installation**: `brew install <tool>`
- **Path**: Usually `/opt/homebrew/bin/<tool>` (Apple Silicon) or `/usr/local/bin/<tool>`
- **Notes**: <any macOS-specific behavior>

### Windows/WSL
- **Installation**: `choco install <tool>` / `scoop install <tool>`
- **WSL**: Same as Linux within WSL
- **Notes**: <any Windows-specific behavior or limitations>

## Integration Examples

### With Shell Scripts

```bash
#!/bin/bash
# <Description of script purpose>
<multi-line script example>
```

### With Other Tools

```bash
# Pipe to/from <other_tool>
<command> | <other_tool> <args>

# Combine with <other_tool>
<other_tool> | <command> <args>
```

## Troubleshooting

### Common Issues

**Issue**: <Problem description>
**Solution**: <How to fix>

**Issue**: <Problem description>
**Solution**: <How to fix>

### Debug Mode

```bash
# Enable verbose/debug output
<cmd> <debug_flag> <args>
```

## See Also

- **Man page**: `man <tool>`
- **Help**: `<tool> --help`
- **Documentation**: <URL>
- **Related tools**: <tool1>, <tool2>, <tool3>

## Version History

| Version | Notable Changes |
|---------|-----------------|
| <X.Y> | <feature/change> |
| <X.Z> | <feature/change> |

---

**Specification Metadata**
- Generated: <timestamp>
- Source: .aiwg/smiths/toolsmith/tools/<category>/<tool>.tool.md
- Platform: <detected_platform>
- Status: <verified|unverified>
