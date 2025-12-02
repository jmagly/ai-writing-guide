# Setup Issues

Problems during AIWG installation or project setup.

## AIWG Installation Not Found

**Symptoms**: "AIWG not found", "aiwg command not found"

**Cause**: AIWG CLI not installed or not in PATH.

**Solution**:

```bash
# Install AIWG
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash

# Reload shell
source ~/.bash_aliases  # or ~/.zshrc

# Verify
aiwg -version
```

## Installation Path Issues

**Symptoms**: Commands work but templates/agents not found.

**Cause**: AIWG installed in non-standard location.

**Solution**:

```bash
# Check where AIWG is installed
ls ~/.local/share/ai-writing-guide/

# If installed elsewhere, set environment variable
export AIWG_ROOT=/path/to/ai-writing-guide

# Add to shell profile for persistence
echo 'export AIWG_ROOT=/path/to/ai-writing-guide' >> ~/.bashrc
```

## Corrupt Installation

**Symptoms**: Partial files, missing directories, strange errors.

**Cause**: Interrupted install or git issues.

**Solution**:

```bash
# Force clean reinstall
aiwg -reinstall

# Or manual cleanup
rm -rf ~/.local/share/ai-writing-guide
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

## Permission Denied

**Symptoms**: "Permission denied" during install or commands.

**Cause**: Insufficient permissions on install directory.

**Solution**:

```bash
# Fix permissions on install directory
chmod -R u+rwX ~/.local/share/ai-writing-guide/

# If installed system-wide (not recommended)
sudo chown -R $USER:$USER /usr/local/share/ai-writing-guide/
```

## Shell Alias Not Working

**Symptoms**: `aiwg` command not found after install.

**Cause**: Shell aliases not loaded.

**Solution**:

```bash
# For bash
source ~/.bash_aliases
# Or
source ~/.bashrc

# For zsh
source ~/.zshrc

# Verify alias exists
alias aiwg
```

## Related

- [Deployment Issues](deployment-issues.md) - Agent/command deployment problems
- [Path Issues](path-issues.md) - Template and file path errors
