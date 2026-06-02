# Setup Issues

Problems during AIWG installation or project setup.

## AIWG Installation Not Found

**Symptoms**: "AIWG not found", "aiwg command not found"

**Cause**: AIWG CLI not installed or not in PATH.

**Solution**:

```bash
# Install AIWG via npm (recommended)
npm install -g aiwg

# Verify
aiwg -version
```

**Bleeding edge:** `curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash`

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
npm install -g aiwg
```

## Permission Denied

**Symptoms**: `Permission denied`, `EACCES`, or an npm error like:

```text
npm ERR! syscall mkdir
npm ERR! path /usr/local/lib/node_modules/aiwg
```

**Cause**: npm is trying to install global packages into a system-owned
directory. This is common on macOS when Node.js was installed with an installer
or an older global npm setup.

**Solution**:

Preferred macOS fix: use `nvm` and reinstall AIWG under a user-owned Node.js
install. See [macOS Install Guide](../getting-started/macos-install.md).

If Node is already installed and you want the shortest recovery path, use npm's
current user-owned global prefix:

```bash
npm config set prefix ~/.local
echo 'PATH="$HOME/.local/bin:$PATH"' >> ~/.profile
echo 'source ~/.profile' >> ~/.zprofile
source ~/.profile

npm install -g aiwg
aiwg --version
```

Do not use `sudo npm install -g aiwg` as the default fix. It can leave
root-owned npm files that break later upgrades.

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

- [Deployment Issues](#ts-deployment) - Agent/command deployment problems
- [Path Issues](#ts-paths) - Template and file path errors
