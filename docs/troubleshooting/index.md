# AIWG Troubleshooting Guide

Quick solutions for common issues with the AI Writing Guide framework.

## Topics

| Issue | Guide |
|-------|-------|
| Installation problems | [Setup Issues](setup-issues.md) |
| Agent/command not found | [Deployment Issues](deployment-issues.md) |
| Template or path errors | [Path Issues](path-issues.md) |
| Platform integration | [Platform Issues](platform-issues.md) |

## Quick Help

Use the `/aiwg-kb` command or natural language to get help:

```text
/aiwg-kb "setup issues"
/aiwg-kb "agent not found"

# Or natural language
"How do I fix my AIWG install?"
"Why can't Claude find my agents?"
"Help with AIWG templates"
```

## Common Quick Fixes

### Reinstall AIWG

```bash
aiwg -reinstall
```

### Redeploy Agents

```bash
aiwg -deploy-agents --mode sdlc --force
aiwg -deploy-commands --mode sdlc
```

### Update Platform Integration

```text
# In Claude Code
/aiwg-update-claude
```

### Verify Installation

```bash
aiwg -version
ls ~/.local/share/ai-writing-guide/
```
