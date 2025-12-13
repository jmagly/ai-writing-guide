# Migration Guide: Enhanced Model Selection System

**Version**: 1.0.0
**Status**: Proposed
**Date**: 2025-12-12

## Overview

This guide describes how to migrate from the current model configuration system to the Enhanced Model Selection System with tier support.

## References

- @.aiwg/architecture/enhanced-model-selection-design.md - Architecture document
- @.aiwg/architecture/ADR-015-enhanced-model-selection.md - Decision record
- @agentic/code/frameworks/sdlc-complete/config/models.json - Current config

---

## 1. Compatibility Summary

| Feature | v1 (Current) | v2 (Enhanced) | Compatibility |
|---------|--------------|---------------|---------------|
| `model: opus` | Supported | Supported | Full |
| `model: sonnet` | Supported | Supported | Full |
| `model: haiku` | Supported | Supported | Full |
| `--reasoning-model` | Supported | Supported | Full |
| `--coding-model` | Supported | Supported | Full |
| `--efficiency-model` | Supported | Supported | Full |
| `model-tier:` | N/A | New | N/A |
| `model-override:` | N/A | New | N/A |
| `--model-tier` | N/A | New | N/A |

**The v2 system is fully backwards compatible.** No changes are required to existing configurations or agent definitions.

---

## 2. Configuration Migration

### 2.1 Current v1 Format

```json
{
  "$schema": "...",
  "version": "1.0.0",

  "claude": {
    "reasoning": {
      "model": "claude-opus-4-1-20250805",
      "description": "..."
    },
    "coding": {
      "model": "claude-sonnet-4-5-20250929",
      "description": "..."
    },
    "efficiency": {
      "model": "claude-haiku-3-5",
      "description": "..."
    }
  },

  "shorthand": {
    "opus": "claude-opus-4-1-20250805",
    "sonnet": "claude-sonnet-4-5-20250929",
    "haiku": "claude-haiku-3-5"
  }
}
```

### 2.2 Enhanced v2 Format

```json
{
  "$schema": "...",
  "version": "2.0.0",

  "defaults": {
    "tier": "standard",
    "provider": "claude"
  },

  "tiers": {
    "economy": { ... },
    "standard": { ... },
    "premium": { ... },
    "max-quality": { ... }
  },

  "providers": {
    "claude": {
      "models": {
        "reasoning": { "default": "claude-opus-4-5-20251101", ... },
        "coding": { "default": "claude-sonnet-4-5-20250929", ... },
        "efficiency": { "default": "claude-haiku-3-5", ... }
      },
      "tierOverrides": { ... }
    }
  },

  "agentRoleAssignments": { ... },

  "shorthand": { ... }
}
```

### 2.3 Automatic Fallback

The v2 resolver handles v1 configurations automatically:

1. If `tiers` is missing, uses built-in tier definitions
2. If `providers` is missing, extracts from v1 format
3. `shorthand` works the same in both versions

---

## 3. Agent Frontmatter Migration

### 3.1 Current Format (Works Unchanged)

```yaml
---
name: Architecture Designer
description: Designs system architectures
model: opus
tools: Read, Write, Bash
---
```

### 3.2 Enhanced Format (Optional)

```yaml
---
name: Architecture Designer
description: Designs system architectures
model: opus                # Still works (role hint)
model-tier: premium        # NEW: Explicit tier
model-override: null       # NEW: Direct override
tools: Read, Write, Bash
---
```

### 3.3 Migration Script

Run the migration script to add tier annotations:

```bash
# Preview changes
aiwg migrate-agents --dry-run

# Add model-tier based on role and category
aiwg migrate-agents --add-tiers --dry-run

# Apply changes
aiwg migrate-agents --add-tiers --write
```

The script:
1. Reads existing `model:` field
2. Looks up agent in `agentRoleAssignments`
3. Adds `model-tier:` based on category's `minimumTier`
4. Preserves original `model:` for backwards compatibility

---

## 4. CLI Migration

### 4.1 Existing Commands (Unchanged)

```bash
# These continue to work exactly as before
aiwg use sdlc
aiwg use sdlc --reasoning-model claude-opus-4-5-20251101
aiwg use sdlc --coding-model claude-sonnet-4-5-20250929
```

### 4.2 New Tier-Based Commands

```bash
# Deploy with tier
aiwg use sdlc --model-tier max-quality

# Set user default
aiwg models set-default premium

# Set project default
aiwg models set-project max-quality
```

### 4.3 Precedence When Mixed

If both tier and explicit model options are provided:

```bash
# --model takes precedence over --model-tier
aiwg use sdlc --model-tier premium --model claude-opus-4-5-20251101
# Result: All agents use claude-opus-4-5-20251101

# Role-specific overrides still work within tier
aiwg use sdlc --model-tier standard --reasoning-model claude-opus-4-5-20251101
# Result: reasoning=opus-4.5, coding=sonnet-4.5, efficiency=haiku-3.5
```

---

## 5. SDK Migration

### 5.1 Current Usage

```javascript
// No SDK exists currently - direct config loading
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('models.json', 'utf8'));
const model = config.claude.reasoning.model;
```

### 5.2 New SDK Usage

```typescript
import { ModelResolver } from '@aiwg/models';

const resolver = new ModelResolver({
  provider: 'claude',
  tier: 'premium'
});

// Resolve for an agent
const result = resolver.resolve('architecture-designer');
console.log(result.modelId); // "claude-opus-4-5-20251101"

// List available tiers
const tiers = resolver.listTiers();

// Estimate cost
const estimate = resolver.estimateCost({
  tier: 'max-quality',
  agentCount: 58
});
```

---

## 6. Migration Phases

### Phase 1: Deploy v2 Configuration (Week 1)

1. Update `models.json` to v2 format
2. Deploy new `ModelResolver` class
3. Update `deploy-agents.mjs` to use resolver
4. All existing functionality continues to work

**Risk**: Low - no breaking changes

### Phase 2: Add CLI Commands (Week 2)

1. Add `aiwg models` command group
2. Add `--model-tier` flag to `aiwg use`
3. Document new commands

**Risk**: Low - additive only

### Phase 3: Optional Agent Updates (Week 3-4)

1. Run `aiwg migrate-agents --add-tiers`
2. Review and adjust tier assignments
3. Update agent definitions as needed

**Risk**: Low - optional, can be reverted

### Phase 4: SDK Release (Week 4-5)

1. Publish SDK package
2. Update MCP server to use SDK
3. Document SDK usage

**Risk**: Low - new functionality

---

## 7. Rollback Plan

### Configuration Rollback

```bash
# Restore v1 config
cp ~/.config/aiwg/models.json.v1-backup ~/.config/aiwg/models.json
```

### Agent Rollback

```bash
# Remove tier annotations (if added)
aiwg migrate-agents --remove-tiers --write
```

### Code Rollback

```bash
# Revert to previous version
git checkout v1.x.x
npm install
```

---

## 8. Testing Checklist

### Backwards Compatibility Tests

- [ ] v1 `models.json` loads without errors
- [ ] `model: opus` resolves correctly
- [ ] `model: sonnet` resolves correctly
- [ ] `model: haiku` resolves correctly
- [ ] `--reasoning-model` works
- [ ] `--coding-model` works
- [ ] `--efficiency-model` works
- [ ] Existing agents deploy unchanged

### New Feature Tests

- [ ] `--model-tier economy` works
- [ ] `--model-tier standard` works
- [ ] `--model-tier premium` works
- [ ] `--model-tier max-quality` works
- [ ] `model-tier:` frontmatter works
- [ ] `model-override:` frontmatter works
- [ ] `aiwg models list` works
- [ ] `aiwg models info` works
- [ ] `aiwg models set-default` works
- [ ] `aiwg models set-project` works
- [ ] `aiwg models validate` works
- [ ] `aiwg models cost-estimate` works

### Integration Tests

- [ ] Deploy with tier on Claude Code
- [ ] Deploy with tier on Factory AI
- [ ] Deploy with tier on OpenAI/Codex
- [ ] Mixed tier/explicit model options
- [ ] Minimum tier enforcement
- [ ] `--ignore-minimums` flag

---

## 9. FAQ

### Q: Do I need to update my existing agents?

**A:** No. Existing agents with `model: opus|sonnet|haiku` continue to work unchanged. The tier system is opt-in.

### Q: What happens if I use both `--model-tier` and `--reasoning-model`?

**A:** The explicit model override (`--reasoning-model`) takes precedence for that role, while other roles use the tier mapping.

### Q: Can I define custom tiers?

**A:** Yes. Add custom tiers to your `~/.config/aiwg/models.json` or `./models.json`:

```json
{
  "tiers": {
    "budget-dev": {
      "description": "Budget development tier",
      "costMultiplier": 0.05,
      "roleMapping": {
        "reasoning": "efficiency",
        "coding": "efficiency",
        "efficiency": "efficiency"
      }
    }
  }
}
```

### Q: How do I see what tier an agent will use?

**A:** Use the dry-run flag:

```bash
aiwg use sdlc --model-tier premium --dry-run
```

### Q: What's the difference between `model:` and `model-tier:`?

**A:**
- `model:` - Role hint (opus=reasoning, sonnet=coding, haiku=efficiency)
- `model-tier:` - Quality tier that determines which models are used for all roles

---

## 10. Support

For issues with migration:

1. Check the [troubleshooting guide](../troubleshooting/model-selection.md)
2. Run `aiwg models validate` to check configuration
3. Open an issue on GitHub with `aiwg doctor` output
