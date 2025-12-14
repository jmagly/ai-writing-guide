# Cross-Platform Configuration

## WARP.md Symlink

The `WARP.md` file is a **symbolic link** to `CLAUDE.md`. This enables configuration sharing between Warp Terminal and Claude Code.

---

## Why a Symlink?

- **Single source of truth**: Update CLAUDE.md, both platforms see changes
- **Zero duplication**: No drift between configs
- **Automatic sync**: Changes propagate instantly

---

## Platform-Specific Structure

| Platform | Config File | Agents Location |
|----------|-------------|-----------------|
| Claude Code | CLAUDE.md | .claude/agents/ |
| Warp Terminal | WARP.md → CLAUDE.md | Inline in WARP.md |
| Factory AI | AGENTS.md | .factory/droids/ |
| OpenCode | AGENTS.md | .opencode/agent/ |
| Codex | AGENTS.md | .codex/agents/ |
| Copilot | copilot-instructions.md | .github/agents/ |
| Cursor | Context Rules | .cursor/rules/ |

---

## Verifying the Symlink

```bash
ls -la WARP.md
# Output: WARP.md -> CLAUDE.md
```

---

## Troubleshooting

**Symlink broken on Windows:**

```bash
git config --global core.symlinks true
git checkout HEAD -- WARP.md
```

**Recreate symlink:**

```bash
rm WARP.md
ln -s CLAUDE.md WARP.md
```
