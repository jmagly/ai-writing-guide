# AIWG Troubleshooting Guide

Quick solutions for common issues with the AIWG framework.

## Topics

| Issue | Guide |
|-------|-------|
| Installation problems | [Setup Issues](#ts-setup) |
| Agent/command not found | [Deployment Issues](#ts-deployment) |
| Template or path errors | [Path Issues](#ts-paths) |
| Platform integration | [Platform Issues](#ts-platforms) |

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
