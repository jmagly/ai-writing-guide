# Path Issues

Problems with templates, files, and directory paths.

## Template Not Found

**Symptoms**: "Template not found", errors referencing template paths.

**Cause**: AIWG installation incomplete or path resolution failed.

**Solution**:

```bash
# Verify templates exist
ls ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/

# If missing, reinstall
aiwg -reinstall
```

## {AIWG_ROOT} Not Replaced

**Symptoms**: Literal `{AIWG_ROOT}` appears in paths instead of actual path.

**Cause**: Setup command didn't complete path substitution.

**Solution**:

```text
# Re-run setup to fix path substitution
/aiwg-update-claude
```

Or manually replace `{AIWG_ROOT}` with `~/.local/share/ai-writing-guide` in CLAUDE.md.

## .aiwg/ Directory Missing

**Symptoms**: "Directory not found" for .aiwg/intake, .aiwg/requirements, etc.

**Cause**: Project not initialized with AIWG structure.

**Solution**:

```bash
# Create directory structure
mkdir -p .aiwg/{intake,requirements,architecture,planning,risks,testing,security,quality,deployment,team,working,reports,handoffs,gates,decisions}

# Or run setup
/aiwg-setup-project
```

## Relative Path Errors

**Symptoms**: Paths like `../templates/` not resolving correctly.

**Cause**: Command run from wrong directory or relative path issues.

**Solution**:

```bash
# Always run from project root
cd /path/to/your/project

# Use absolute paths in configuration
# ~/.local/share/ai-writing-guide/ instead of relative paths
```

## Home Directory (~) Not Expanding

**Symptoms**: Paths with `~` treated as literal character.

**Cause**: Some tools don't expand `~` automatically.

**Solution**:

Use `$HOME` or full path instead:

```bash
# Instead of
ls ~/. local/share/ai-writing-guide/

# Use
ls $HOME/.local/share/ai-writing-guide/
# Or
ls /home/YOUR_USER/.local/share/ai-writing-guide/
```

## Symlink Issues

**Symptoms**: "Not a directory" or broken symlink errors.

**Cause**: Symlinks pointing to moved/deleted targets.

**Solution**:

```bash
# Check for broken symlinks
find ~/.local/share/ai-writing-guide -type l -! -exec test -e {} \; -print

# Reinstall to fix
aiwg -reinstall
```

## Related

- [Setup Issues](setup-issues.md) - Installation problems
- [Deployment Issues](deployment-issues.md) - Agent deployment problems
