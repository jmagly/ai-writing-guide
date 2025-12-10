# Project Intake Form: AIWG Package Distribution

## Project Overview

| Field | Value |
|-------|-------|
| Project Name | AIWG Package Distribution System |
| Project ID | AIWG-PKG-001 |
| Intake Date | 2024-12-09 |
| Requestor | Project Maintainer |
| Priority | High |

## Problem Statement

### Current State
The AI Writing Guide (AIWG) currently requires installation via a custom bash script (`install.sh`) that:
1. Clones the repository to `~/.local/share/ai-writing-guide`
2. Creates shell aliases for the `aiwg` command
3. Auto-updates from the head of `main` branch on every command invocation

### Problems with Current Approach
1. **Non-standard installation**: Requiring users to run a bash script that doesn't call a trusted package manager is unusual and creates friction
2. **Auto-update concerns**: Automatically pulling from head of main on every invocation is unconventional and may concern users about stability
3. **Discoverability**: Not listed in package registries, reducing organic discovery
4. **Version pinning impossible**: Users cannot pin to a specific version for reproducibility
5. **Enterprise adoption barrier**: Organizations often require packages from approved registries

### Desired State
- Standard `npm install -g aiwg` installation
- CalVer versioned releases (YYYY.MM.PATCH)
- Optional "bleeding edge" mode for power users who want latest from main
- Full framework bundle included in package
- Update notifications with user confirmation

## Success Criteria

| Metric | Target |
|--------|--------|
| Installation method | `npm install -g aiwg` works out of the box |
| Version stability | Users can pin to specific CalVer versions |
| Ecosystem presence | Published to npmjs.com, discoverable via npm search |
| Power user support | `aiwg --use-main` enables bleeding edge mode |
| Update experience | CLI prompts for updates, user confirms |

## Scope

### In Scope
- npm package configuration (package.json)
- CLI entry point for global installation
- CalVer versioning scheme (YYYY.MM.PATCH)
- Tag-triggered CI/CD for npm publishing
- GPG-signed releases with provenance attestation
- Post-install `--use-main` flag for bleeding edge mode
- Update check and prompt mechanism
- Full bundle (all frameworks, agents, templates)
- Backward compatibility with existing install.sh users

### Out of Scope (Future)
- Homebrew formula
- apt/deb packages
- Alternative Node registries (GitHub Packages, Verdaccio)
- Automatic migration from install.sh to npm

## Target Users

| User Type | Needs |
|-----------|-------|
| Individual Developers | Easy install, stable versions, optional bleeding edge |
| Development Teams | Reproducible installs, version pinning |
| Enterprise/Corporate | Approved registry packages, signed releases |

## Technical Requirements

### Functional Requirements
1. **FR-001**: Package installable via `npm install -g aiwg`
2. **FR-002**: CLI command `aiwg` available globally after install
3. **FR-003**: All existing `aiwg` subcommands work identically
4. **FR-004**: `aiwg --use-main` switches to git-based updates from main
5. **FR-005**: `aiwg --use-stable` switches back to npm-based updates
6. **FR-006**: CLI checks for updates and prompts user to confirm
7. **FR-007**: `aiwg -version` shows CalVer version and channel (stable/edge)

### Non-Functional Requirements
1. **NFR-001**: Package size < 15MB (full bundle)
2. **NFR-002**: Cold start time < 500ms
3. **NFR-003**: Update check < 2s (non-blocking background check)
4. **NFR-004**: GPG-signed releases for supply chain security
5. **NFR-005**: Provenance attestation via npm

## Architecture Preferences

### Package Structure
```
aiwg/
├── package.json          # npm configuration
├── bin/
│   └── aiwg.mjs          # CLI entry point
├── src/
│   ├── cli/              # Command implementations
│   ├── update/           # Update checking and switching
│   └── channel/          # Channel management (stable/edge)
├── agentic/              # Full framework bundle
│   └── code/
│       ├── frameworks/
│       └── addons/
├── docs/                 # Core documentation
└── tools/                # Existing tooling
```

### Versioning
- **Format**: CalVer `YYYY.MM.PATCH` (e.g., `2024.12.0`, `2024.12.1`)
- **Release triggers**: Git tags matching `v*` pattern
- **Pre-releases**: Not planned for v1.0

### CI/CD Pipeline
```
git tag v2024.12.0 → GitHub Actions → npm publish (signed)
                                   → Generate provenance
                                   → Create GitHub release
```

## Constraints

1. **Node.js requirement**: Users must have Node.js installed (already a requirement)
2. **Backward compatibility**: Existing install.sh users should continue to work
3. **No breaking changes**: All existing commands must work identically

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| npm name `aiwg` taken | Low | High | Check availability, have alternates ready |
| Package size too large | Medium | Medium | Audit included files, use .npmignore |
| Update prompt annoyance | Low | Low | Configurable check frequency |
| Signing key management | Medium | Medium | Use GitHub Actions OIDC for provenance |

## Dependencies

- Node.js 18+ (already required)
- npm account with 2FA enabled
- GitHub Actions for CI/CD
- npm provenance support (npm 9.5+)

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Inception (planning) | 1-2 days |
| Elaboration (design) | 2-3 days |
| Construction | 3-5 days |
| Transition (testing, publish) | 1-2 days |

## Approval

- [ ] Technical review complete
- [ ] Security review complete
- [ ] Ready for Inception phase

---

*Generated by AIWG intake-wizard on 2024-12-09*
