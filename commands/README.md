# General-Purpose Commands

This directory contains documentation and resources for general-purpose Claude Code commands.

## Documentation

- **README.md** (this file): Overview of general-purpose commands
- **DEVELOPMENT_GUIDE.md**: Comprehensive guide for creating custom commands
- **examples/**: Sample command implementations

## What Belongs Here

General-purpose commands are those that:

- Support the AI Writing Guide's core functionality
- Apply across multiple domains (not SDLC-specific)
- Enhance Claude Code's general capabilities
- Provide utilities for content creation and validation

## What Doesn't Belong Here

SDLC-specific commands have been moved to:
`/agentic/code/frameworks/sdlc-complete/commands/`

This includes commands for:

- Project intake and orchestration
- Security gates and audits
- Test generation
- PR reviews
- Traceability checking
- Project health monitoring

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

## Integration

Commands can invoke agents and vice versa. Commands in this directory may reference:

- General-purpose agents in `/agents/`
- Writing Guide validation rules in `/validation/`
- Core writing principles in `/core/`

For SDLC workflows, see the framework documentation in `/agentic/code/frameworks/sdlc-complete/`.
