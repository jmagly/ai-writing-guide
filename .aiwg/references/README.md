# AIWG Reference Documentation

> Authoritative reference documents for APIs, platforms, and protocols that AIWG integrates with.

**Purpose**: Provide quick reference and pointers to full documentation for future agents building AIWG capabilities.

---

## Directory Structure

```
.aiwg/references/
├── README.md                    # This file
├── platforms/                   # AI coding platforms
│   ├── claude-code.md          # ✓ Complete - Primary platform
│   ├── github-copilot.md       # Planned
│   ├── cursor.md               # Planned
│   ├── windsurf.md             # Planned
│   └── opencode.md             # Planned
├── apis/                        # External APIs
│   ├── gitea-api.md            # Planned
│   ├── github-api.md           # Planned
│   └── anthropic-api.md        # Planned
└── protocols/                   # Standards and protocols
    ├── mcp.md                  # Planned - Model Context Protocol
    └── lsp.md                  # Planned - Language Server Protocol
```

---

## Platform References

| Platform | Status | Priority | Description |
|----------|--------|----------|-------------|
| **Claude Code** | ✅ Complete | Primary | Anthropic's CLI tool - AIWG primary platform |
| GitHub Copilot | 📋 Planned | High | GitHub's AI assistant |
| Cursor | 📋 Planned | Medium | AI-first code editor |
| Windsurf | 📋 Planned | Medium | Codeium's AI editor |
| OpenCode | 📋 Planned | Low | Open-source alternative |

---

## API References

| API | Status | Priority | Description |
|-----|--------|----------|-------------|
| Gitea API | 📋 Planned | High | Self-hosted git forge |
| GitHub API | 📋 Planned | High | GitHub REST/GraphQL |
| Anthropic API | 📋 Planned | High | Claude API direct access |

---

## Protocol References

| Protocol | Status | Priority | Description |
|----------|--------|----------|-------------|
| MCP | 📋 Planned | High | Model Context Protocol for tool integration |
| LSP | 📋 Planned | Low | Language Server Protocol |

---

## Usage Guidelines

### For Agents

When building new AIWG capabilities:

1. **Check references first** - Load relevant platform/API docs before implementation
2. **Cite official sources** - Link to official documentation for details
3. **Update references** - Add new learnings back to reference docs
4. **Follow patterns** - Use established integration patterns

### Reference Format

Each reference document should include:

1. **Quick Reference** - Links to official docs
2. **Core Concepts** - Key features and architecture
3. **Configuration** - How to set up and configure
4. **Integration Patterns** - How AIWG integrates
5. **Code Examples** - Working examples
6. **Troubleshooting** - Common issues and solutions
7. **Official Links** - Comprehensive link collection

### Loading References

Use @-mentions to load references into context:

```
@.aiwg/references/platforms/claude-code.md
@.aiwg/references/apis/gitea-api.md
@.aiwg/references/protocols/mcp.md
```

---

## Contributing

To add a new reference:

1. Create markdown file in appropriate subdirectory
2. Follow the standard format (see claude-code.md as template)
3. Update this README with status
4. Link from relevant AIWG documentation

---

## References

- @CLAUDE.md - Project configuration
- @.aiwg/references/platforms/claude-code.md - Primary platform reference
