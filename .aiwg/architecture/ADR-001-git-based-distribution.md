# ADR-001: Git-Based Distribution Model

**Status**: ACCEPTED
**Date**: 2025-10-15
**Decision Makers**: Joseph Magly (Project Owner), Architecture Designer
**Phase**: Inception

## Context

The AI Writing Guide framework requires a distribution mechanism that allows users to install, update, and customize the framework. Several distribution models were considered: npm package, package manager distribution (Homebrew, apt), manual download, or git-based distribution.

**Key Requirements**:
- Cross-platform compatibility (Linux, macOS, Windows/WSL)
- Automatic updates (users stay current)
- Fork-friendly (community can customize)
- Zero maintenance (no package publishing overhead)
- No build step (static content distribution)

**Constraints**:
- Solo developer (minimal operational overhead)
- Open source model (no monetization, maximize adoption)
- Documentation framework (static content, no runtime)

## Decision

**We will distribute the AI Writing Guide via git clone with automatic updates through git pull.**

Implementation:
- One-line installer: `curl -fsSL https://...install.sh | bash`
- Install location: `~/.local/share/ai-writing-guide`
- CLI wrapper: `aiwg` command added to shell aliases
- Auto-update: `git pull` runs on every `aiwg` command invocation
- Graceful recovery: `aiwg -reinstall` for corruption

## Alternatives Considered

### Alternative 1: npm Package

**Pros**:
- Standard for Node.js projects
- Familiar to JavaScript developers
- Version pinning built-in (`npm install -g ai-writing-guide@1.0.0`)
- Centralized distribution (npm registry)

**Cons**:
- Requires publishing to npm registry (operational overhead)
- Not fork-friendly (users can't easily customize)
- npm lock-in (forces Node.js package manager)
- Updates require explicit user action (`npm update -g`)
- Not ideal for documentation framework (content-heavy, not code-heavy)

**Decision**: REJECTED (too much overhead, not fork-friendly)

### Alternative 2: Package Manager Distribution (Homebrew, apt)

**Pros**:
- Native to each platform (brew install, apt install)
- Standard update mechanisms (brew upgrade, apt upgrade)
- Trusted distribution channels

**Cons**:
- Multi-platform maintenance (brew formula, Debian package, RPM package, etc.)
- Requires package maintainer for each platform
- Slow approval process (Homebrew review, Debian packaging)
- Solo developer can't maintain multiple package formats
- Still requires git for updates (documentation changes frequently)

**Decision**: DEFERRED (consider for v2.0 as supplementary distribution, not primary)

### Alternative 3: Manual Download (ZIP/TAR.GZ)

**Pros**:
- Simple distribution (GitHub releases)
- No dependencies (no git required)
- Offline installation possible

**Cons**:
- No automatic updates (users must manually download)
- Not fork-friendly (hard to track changes)
- Version management burden (users must manage versions manually)
- Operational overhead (create release archives for every version)

**Decision**: REJECTED (poor update experience, not fork-friendly)

### Alternative 4: Git Submodule

**Pros**:
- Integrates directly into user's project
- Git-native (no additional tools)
- Version pinning via git commit references

**Cons**:
- Requires user project to use git
- Submodule complexity (git submodule update --init, git submodule sync)
- Not suitable for CLI tool (aiwg command wouldn't work)
- Harder to customize (submodule in user's project)

**Decision**: REJECTED (too complex, not suitable for CLI distribution)

## Consequences

### Positive

1. **Zero Maintenance**:
   - No package publishing (no npm publish, no brew formula updates)
   - Updates distributed via git push (automatic propagation)
   - Solo developer can maintain easily

2. **Fork-Friendly**:
   - Users can fork repository and customize
   - Custom forks work identically to upstream
   - Community can contribute via pull requests

3. **Automatic Updates**:
   - Users always run latest version (git pull on every command)
   - No manual update action required
   - Breaking changes pushed immediately (mitigated by versioning + release process)

4. **Cross-Platform**:
   - Git available on all platforms (Linux, macOS, Windows/WSL)
   - Shell scripts work universally (Bash/Zsh)
   - No platform-specific packaging

5. **Transparent**:
   - Open source repository (users can inspect code)
   - Git history provides audit trail
   - No opaque distribution mechanism

### Negative

1. **Git Dependency**:
   - Users must have git installed (acceptable for developer tool)
   - Users must have internet connectivity for updates (acceptable for most use cases)
   - Offline usage limited (but possible after initial install)

2. **Rapid Update Distribution**:
   - Breaking changes pushed immediately (mitigated by versioning policy)
   - No user control over update timing (mitigated by version pinning in v1.1+)
   - Malicious commit affects all users quickly (mitigated by 2FA, commit signing)

3. **GitHub Dependency**:
   - Complete reliance on GitHub availability (99.9% SLA acceptable)
   - GitHub account compromise risk (mitigated by 2FA enforcement)
   - GitHub policy changes could affect distribution (unlikely for open source)

4. **No Version Pinning Initially**:
   - Users run latest commit (v1.0 adds semantic versioning)
   - No built-in version pinning (defer to v1.1: `aiwg -version-lock`)
   - Users must manually checkout specific tags if needed

5. **Installer Security**:
   - `curl | bash` pattern requires trust (mitigated by open source code)
   - No signature verification initially (defer to v1.1: GPG signatures)
   - Supply chain risk (mitigated by GitHub HTTPS, code review)

### Mitigations

**Rapid Update Distribution**:
- Add semantic versioning (v1.0.0) for release stability
- Use release candidates (v1.0.0-rc.1) before final release
- Establish deprecation policy (2 minor versions notice)
- Add version pinning in v1.1 (`aiwg -version-lock 1.0.0`)

**GitHub Dependency**:
- Enforce 2FA on GitHub account (immediate)
- Add git commit signing for releases (v1.0)
- Document backup/recovery procedure (users can clone from forks)

**Installer Security**:
- Publish checksum for install.sh (v1.1)
- Add GPG signature for releases (v1.1)
- Document security model in SECURITY.md (v1.0)

**No Version Pinning**:
- Add `aiwg -version-lock <version>` command (v1.1)
- Document manual version pinning (git checkout tags)
- Provide graceful recovery (`aiwg -reinstall`)

## Validation

**Success Criteria**:
- [ ] Installation time < 5 minutes (measured during cross-platform testing)
- [ ] Update time < 30 seconds (measured during cross-platform testing)
- [ ] Works on Ubuntu, macOS, WSL (tested in Week 3 of Elaboration)
- [ ] Graceful recovery works (`aiwg -reinstall` tested)
- [ ] Fork workflow validated (community can fork and customize)

**Validation Timeline**:
- **Week 3 of Elaboration**: Cross-platform testing (Ubuntu 20.04, 22.04, macOS, WSL)
- **Week 4 of Elaboration**: Installation smoke tests in CI/CD
- **Post-v1.0**: Community feedback on installation experience

## Related Decisions

- **ADR-002**: Node.js as Tooling Runtime (why Node.js for scripts)
- **ADR-003**: Markdown as Primary Content Format (why not HTML or other formats)
- **ADR-004**: Claude Code as Primary Target Platform (why not OpenAI-first)

## References

- Git-based distribution examples:
  - Oh My Zsh: `sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"`
  - Homebrew: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
  - Rust (rustup): `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

- Security considerations:
  - Defendable: [https://swordbeta.com/blog/curl-bash-is-sometimes-defendable/](defensible curl | bash pattern)
  - Mitigations: Open source code, HTTPS only, community review

- Alternative approaches considered:
  - npm package: Standard for Node.js, but not fork-friendly
  - Homebrew/apt: Platform-specific, high maintenance
  - Manual download: Poor update experience

**Conclusion**: Git-based distribution provides the best balance of simplicity, maintainability, and community-friendliness for a documentation framework with frequent updates.
