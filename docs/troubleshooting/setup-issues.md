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
# Compare the canonical and currently executing installations
aiwg installation show
```

If you intentionally changed Node managers, npm prefixes, Homebrew ownership,
or installation roots, make that change explicit with `aiwg installation
adopt --manager /absolute/path/to/npm`. To return to another installation, use
`aiwg installation switch --root <path> --method <npm|web|source>` and include
`--manager <absolute-path>` for npm/source. Then run `aiwg doctor`.

Do not repair drift only by reordering `PATH`: updates intentionally remain
bound to the recorded package manager until an explicit adopt or switch.

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
