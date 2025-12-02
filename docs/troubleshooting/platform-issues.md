# Platform Issues

Problems specific to AI platforms (Claude Code, Factory AI, Warp Terminal).

## Claude Code

### CLAUDE.md Not Recognized

**Symptoms**: Claude doesn't understand AIWG commands or context.

**Cause**: CLAUDE.md missing AIWG section or not properly formatted.

**Solution**:

```text
# Update CLAUDE.md with AIWG integration
/aiwg-update-claude
```

### Natural Language Not Working

**Symptoms**: Claude doesn't understand "transition to Elaboration" etc.

**Cause**: CLAUDE.md missing orchestrator context.

**Solution**:

```text
# Re-run intelligent merge
/aiwg-update-claude

# Verify AIWG section exists in CLAUDE.md
# Should contain "Core Platform Orchestrator Role" section
```

### Multi-Agent Not Launching

**Symptoms**: Task tool not creating subagents, single-agent responses only.

**Cause**: Agents not deployed or permissions missing.

**Solution**:

```bash
# Deploy agents
aiwg -deploy-agents --mode sdlc

# Check permissions in .claude/settings.local.json
# Should allow Task tool and Read for AIWG path
```

## Factory AI

### Custom Droids Not Enabled

**Symptoms**: `/droids` shows no custom droids, import option missing.

**Cause**: Custom Droids experimental feature not enabled.

**Solution**:

```bash
# Deployment should auto-enable, but if not:
droid
/settings
# Toggle "Custom Droids" under Experimental
```

### Droids Not Appearing After Deploy

**Symptoms**: Files in `.factory/droids/` but not in Factory UI.

**Cause**: Factory requires manual import (security feature).

**Solution**:

```bash
droid .
/droids
# Press 'I' → 'A' → Enter
```

### AGENTS.md Not Loading

**Symptoms**: Factory doesn't see project agents.

**Cause**: AGENTS.md not created or not updated.

**Solution**:

```bash
# Create/update AGENTS.md
aiwg -deploy-agents --provider factory --mode sdlc --create-agents-md
```

## Warp Terminal

### WARP.md Not Loading

**Symptoms**: Warp AI doesn't recognize AIWG context.

**Cause**: WARP.md missing or Warp not reindexed.

**Solution**:

```bash
# Deploy WARP.md
aiwg -deploy-agents --platform warp --mode sdlc

# In Warp, reindex project
/init
```

### File Too Large

**Symptoms**: Warp truncating or not loading full WARP.md.

**Cause**: WARP.md exceeds size limits with all agents embedded.

**Solution**:

```bash
# Deploy only what you need
aiwg -deploy-agents --platform warp --mode sdlc  # Skip general agents

# Or use Claude Code for full orchestration
```

### Context Not Updating

**Symptoms**: Old AIWG context showing after updates.

**Cause**: Warp caching old WARP.md.

**Solution**:

```bash
# Force reindex
/init

# Or restart Warp Terminal
```

## Cross-Platform

### Different Behavior Across Platforms

**Symptoms**: Same command works in Claude Code but not Factory/Warp.

**Cause**: Platforms have different orchestration capabilities.

**Solution**:

Use the right platform for your task:

| Task | Best Platform |
|------|---------------|
| Multi-agent orchestration | Claude Code |
| Simple commands | Any |
| Full artifact generation | Claude Code |
| Terminal workflows | Warp |

### Sync Issues Between Platforms

**Symptoms**: Agents/config out of sync between platforms.

**Cause**: Manual updates to one platform's files.

**Solution**:

```bash
# Redeploy to all platforms
aiwg -deploy-agents --mode sdlc                           # Claude Code
aiwg -deploy-agents --platform warp --mode sdlc           # Warp
aiwg -deploy-agents --provider factory --mode sdlc        # Factory
```

## Related

- [Setup Issues](setup-issues.md) - Installation problems
- [Deployment Issues](deployment-issues.md) - Agent deployment problems
