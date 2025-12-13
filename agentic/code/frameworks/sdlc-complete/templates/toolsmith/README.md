# Toolsmith Templates

Templates for generating tool specifications and configuring the Toolsmith feature.

## Templates

### cli-tool-template.md

Standard template for command-line tool specifications. Use this for any CLI utility, system command, or executable tool.

**Sections included**:
- Quick Reference (copy-paste examples)
- Synopsis (one-paragraph description)
- Common Patterns (categorized usage examples)
- Key Flags (table format)
- Input/Output (formats, exit codes)
- Error Handling (patterns and examples)
- Performance Tips
- Platform-Specific Notes
- Integration Examples
- Troubleshooting
- See Also

### config-template.json

Default configuration for Toolsmith. Copy to `.aiwg/smiths/toolsmith/config.json` and customize.

**Configuration sections**:
- `discovery`: Tool discovery settings (paths, patterns, auto-discover)
- `generation`: Spec generation options (man pages, examples)
- `caching`: Cache settings (TTL, size limits)
- `output`: Output format preferences
- `knownTools`: Pre-defined tool categories

## Usage

### Initialize Toolsmith

```bash
# Discover tools and create initial catalog
aiwg runtime-info --discover

# This creates:
# .aiwg/smiths/toolsmith/
# ├── runtime.json
# ├── config.json (from template)
# ├── index.json
# └── tools/
```

### Generate Tool Specification

Tool specs are generated on-demand when requested:

```bash
# Request a tool spec
aiwg toolsmith get jq

# This generates (if not cached):
# .aiwg/smiths/toolsmith/tools/utilities/jq.tool.md
```

### Customize Configuration

Edit `.aiwg/smiths/toolsmith/config.json`:

```json
{
  "discovery": {
    "additionalPaths": [
      "/custom/tools/bin"
    ]
  },
  "caching": {
    "ttlDays": 7
  }
}
```

## Template Variables

When generating from templates, the following variables are replaced:

| Variable | Description |
|----------|-------------|
| `<TOOL_ID>` | Unique identifier (lowercase) |
| `<TOOL_NAME>` | Display name |
| `<VERSION>` | Detected version |
| `<YYYY-MM-DD>` | Current date |
| `<timestamp>` | ISO 8601 timestamp |
| `<detected_platform>` | Current platform (linux/macos/wsl) |

## Extending

### Add Custom Tool Category

1. Edit `config.json`:
```json
{
  "discovery": {
    "categories": ["core", "languages", "utilities", "custom", "my-category"]
  }
}
```

2. Add tools to the category:
```json
{
  "knownTools": {
    "my-category": ["my-tool-1", "my-tool-2"]
  }
}
```

### Create Specialized Template

For tools that don't fit the CLI template (e.g., language runtimes, APIs):

1. Create `my-tool-type-template.md` in this directory
2. Follow the frontmatter schema
3. Update SpecGenerator to use the new template

## Related

- @.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md
- @.aiwg/architecture/toolsmith-implementation-spec.md
- @agentic/code/frameworks/sdlc-complete/agents/toolsmith-provider.md
