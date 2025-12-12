# Cross-Platform Configuration: WARP.md Symlink

## Overview

The `WARP.md` file in the repository root is a **symbolic link** to `CLAUDE.md`. This enables cross-platform configuration sharing between Warp Terminal and Claude Code.

## Why a Symlink?

Both Warp Terminal and Claude Code can use the same configuration format and instructions. Rather than maintaining duplicate documentation:

- **CLAUDE.md** contains the canonical project configuration and AIWG orchestration instructions
- **WARP.md** → symlink → **CLAUDE.md** (same content, different filename)

This approach provides:

1. **Single source of truth**: Update CLAUDE.md, and both platforms see the changes
2. **Zero duplication**: No risk of drift between Warp and Claude configs
3. **Automatic sync**: Changes propagate instantly to both platforms
4. **Reduced maintenance**: One file to maintain instead of two

## Platform-Specific Deployment

While the configuration file is shared, each platform has its own deployment structure:

| Platform | Config File | Agent/Command Location | Deployment Command |
|----------|-------------|------------------------|-------------------|
| **Claude Code** | `CLAUDE.md` | `.claude/agents/`, `.claude/commands/` | `aiwg -deploy-agents` |
| **Warp Terminal** | `WARP.md` (→ CLAUDE.md) | Inline in WARP.md | `aiwg -deploy-agents --platform warp` |
| **Factory AI** | `AGENTS.md` | `.factory/droids/`, `.factory/commands/` | `aiwg -deploy-agents --provider factory` |
| **OpenCode** | `AGENTS.md` | `.opencode/agent/`, `.opencode/command/` | `aiwg -deploy-agents --provider opencode` |
| **Codex/OpenAI** | `AGENTS.md` | `.codex/agents/`, `.codex/prompts/` | `aiwg -deploy-agents --provider openai` |
| **Cursor** | Context Rules | `.cursor/rules/`, `.cursor/agents/` | `aiwg -deploy-agents --provider cursor` |

## How It Works

### Warp Terminal

Warp Terminal reads `WARP.md` as its configuration source. The symlink ensures Warp sees the same AIWG orchestration instructions as Claude Code:

```bash
# Warp looks for WARP.md
ls -la WARP.md
# Output: WARP.md -> CLAUDE.md

# Both platforms see identical content
cat WARP.md    # → Shows CLAUDE.md content
cat CLAUDE.md  # → Same content
```

### Claude Code

Claude Code reads `CLAUDE.md` directly. Multi-file agent/command structure is deployed to `.claude/`:

```bash
# Claude Code reads CLAUDE.md
# Agents deployed to .claude/agents/*.md
# Commands deployed to .claude/commands/*.md
```

### Factory AI

Factory AI uses a different structure (`AGENTS.md` + `.factory/`), so it doesn't rely on the symlink:

```bash
# Factory reads AGENTS.md (not CLAUDE.md)
# Droids deployed to .factory/droids/*.md
# Commands deployed to .factory/commands/*.md
```

## Git and Symlinks

The symlink is **checked into version control** and works across all platforms:

- **Linux/macOS**: Native symlink support (works out of the box)
- **Windows**: Git on Windows handles symlinks correctly (Git for Windows 2.x+)

### Verifying the Symlink

```bash
# Check symlink status
ls -la WARP.md

# Expected output:
# lrwxrwxrwx 1 user user 9 Nov 24 13:36 WARP.md -> CLAUDE.md

# Read symlink target
readlink WARP.md
# Output: CLAUDE.md
```

## When to Update

**Update CLAUDE.md when:**
- Adding new AIWG orchestration instructions
- Modifying phase workflow guidance
- Updating agent assignment patterns
- Changing natural language command translations

**No action needed for WARP.md** - The symlink automatically reflects changes.

## Troubleshooting

### Symlink Broken on Windows

If `WARP.md` appears as a text file with content "CLAUDE.md" instead of a symlink:

**Solution:**
```bash
# Enable symlink support in Git
git config --global core.symlinks true

# Re-checkout the repository
git checkout HEAD -- WARP.md

# Verify
ls -la WARP.md  # Should show -> CLAUDE.md
```

### Symlink Not Working

If the symlink isn't functioning:

**Option 1: Recreate the symlink**
```bash
rm WARP.md
ln -s CLAUDE.md WARP.md
```

**Option 2: Use a copy (not recommended)**
```bash
# Last resort: copy instead of symlink
cp CLAUDE.md WARP.md
# Warning: Must manually sync changes between files
```

## Design Rationale

### Why Not Use CLAUDE.md for Both?

Warp Terminal expects a file named `WARP.md` in the project root. We could instruct Warp users to rename `CLAUDE.md`, but:

1. **Breaks multi-platform projects**: Users with both Claude Code and Warp would need both files
2. **Creates confusion**: "Which file should I edit?"
3. **Increases maintenance**: Two files to keep in sync

The symlink elegantly solves all three problems.

### Why Not Factory AI?

Factory AI has a fundamentally different configuration model:

- **Droid-first**: Individual droid files in `.factory/droids/`
- **AGENTS.md**: Project-specific documentation (not orchestration instructions)
- **No CLAUDE.md equivalent**: Factory doesn't read a central config file

So Factory gets its own `AGENTS.md` template instead of reusing CLAUDE.md.

## Related Documentation

- **Claude Code Setup**: [docs/integrations/claude-code-quickstart.md](claude-code-quickstart.md)
- **Warp Terminal Setup**: [docs/integrations/warp-terminal-quickstart.md](warp-terminal-quickstart.md)
- **Factory AI Setup**: [docs/integrations/factory-quickstart.md](factory-quickstart.md)
- **OpenCode Setup**: [docs/integrations/opencode-quickstart.md](opencode-quickstart.md)
- **Codex/OpenAI Setup**: [docs/integrations/codex-quickstart.md](codex-quickstart.md)
- **Cursor Setup**: [docs/integrations/cursor-quickstart.md](cursor-quickstart.md)
- **CLAUDE.md Contents**: [/CLAUDE.md](../../CLAUDE.md)

## Summary

The `WARP.md → CLAUDE.md` symlink is an intentional design choice that:

✅ Enables configuration sharing between Warp Terminal and Claude Code
✅ Eliminates duplicate documentation maintenance
✅ Maintains a single source of truth (CLAUDE.md)
✅ Works seamlessly across Linux, macOS, and Windows (Git 2.x+)
✅ Simplifies updates (edit one file, both platforms see changes)

For multi-platform projects, this approach ensures consistency without duplication.
