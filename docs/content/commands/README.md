# Command Development Documentation

This directory contains documentation and resources for creating custom Claude Code commands.

## Documentation

- **README.md** (this file): Overview of command development
- **DEVELOPMENT_GUIDE.md**: Comprehensive guide for creating custom commands
- **subagents-and-commands-guide.md**: Guide to subagent patterns and command integration
- **subagents-README.md**: Quick reference for subagent usage
- **examples/**: Sample command implementations

## Command Locations

Commands are organized by framework/addon:

| Location | Contents |
|----------|----------|
| `agentic/code/frameworks/sdlc-complete/commands/` | SDLC lifecycle commands (intake, gates, flows) |
| `agentic/code/frameworks/media-marketing-kit/commands/` | Marketing campaign commands |
| `agentic/code/addons/aiwg-utils/commands/` | General utilities (commit, voice, workspace) |
| `agentic/code/addons/voice-framework/commands/` | Voice profile commands |

## Creating Commands

See `DEVELOPMENT_GUIDE.md` for detailed instructions on:

- Command structure and templates
- Frontmatter configuration
- Model selection guidelines
- Tool access control
- Security considerations
- Testing and deployment

## Command vs Agent

**Use a Command when:**

- Task is simple and single-purpose
- Quick data transformation needed
- File manipulation required
- Status checking or validation

**Use an Agent when:**

- Complex, multi-step workflow
- Deep domain expertise required
- Reasoning and analysis needed
- Integration with multiple systems

## Deployment

Commands are deployed via the `aiwg` CLI:

```bash
# Deploy framework with commands
aiwg use sdlc              # Deploys SDLC commands
aiwg use marketing         # Deploys marketing commands

# Deploy addon commands
# (aiwg-utils auto-deployed with any framework)
```

Commands are copied to `.claude/commands/` in the target project.

## Integration

Commands can invoke agents and vice versa. Commands may reference:

- Framework agents via Task tool
- Writing validation in `agentic/code/addons/writing-quality/`
- Voice profiles in `agentic/code/addons/voice-framework/`
- SDLC workflows in `agentic/code/frameworks/sdlc-complete/`
