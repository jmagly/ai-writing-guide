# Solution Profile: AIWG Package Distribution

## Solution Overview

Transform AIWG from a git-clone-based installation to a standard npm package while preserving the "bleeding edge" experience for power users.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    User Installation                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  npm install -g aiwg                                         │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────┐                                         │
│  │  npm registry   │ ◄── Tag-triggered publish               │
│  │  (npmjs.com)    │     with GPG signing                    │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────┐             │
│  │            aiwg CLI                          │             │
│  │  ┌─────────────┐  ┌─────────────────────┐   │             │
│  │  │ Channel Mgr │  │ Update Checker      │   │             │
│  │  │ stable/edge │  │ prompt on new ver   │   │             │
│  │  └─────────────┘  └─────────────────────┘   │             │
│  │                                              │             │
│  │  ┌─────────────────────────────────────┐    │             │
│  │  │     Command Router                   │    │             │
│  │  │  -deploy-agents, -status, etc.      │    │             │
│  │  └─────────────────────────────────────┘    │             │
│  └─────────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Channel Modes:
┌─────────────┐        ┌─────────────┐
│   STABLE    │        │    EDGE     │
│ (default)   │        │ (opt-in)    │
├─────────────┤        ├─────────────┤
│ npm updates │        │ git updates │
│ CalVer vers │        │ main HEAD   │
│ Signed pkgs │        │ Latest code │
└─────────────┘        └─────────────┘
       │                      │
       └──── aiwg --use-main ─┘
       └──── aiwg --use-stable┘
```

### Package Structure

```
aiwg/                          # npm package root
├── package.json               # npm metadata, bin entry
├── bin/
│   └── aiwg.mjs               # CLI entry point (shebang)
├── src/
│   ├── cli/
│   │   ├── index.mjs          # Command router
│   │   ├── deploy-agents.mjs  # Existing commands
│   │   ├── workspace-*.mjs    # Workspace commands
│   │   └── ...
│   ├── channel/
│   │   ├── manager.mjs        # Channel state management
│   │   ├── stable.mjs         # npm-based operations
│   │   └── edge.mjs           # git-based operations
│   └── update/
│       ├── checker.mjs        # Version check against registry
│       └── prompt.mjs         # User prompt for updates
├── agentic/                   # Full framework bundle
│   └── code/
│       ├── frameworks/
│       │   ├── sdlc-complete/
│       │   └── media-marketing-kit/
│       └── addons/
├── docs/                      # Core documentation
├── tools/                     # Build/dev tools (not all published)
└── .npmignore                 # Exclude dev-only files
```

### Channel Management

```javascript
// ~/.aiwg/channel.json (user config)
{
  "channel": "stable",           // or "edge"
  "edgePath": "~/.local/share/ai-writing-guide",  // git clone location
  "lastUpdateCheck": "2024-12-09T10:00:00Z",
  "updateCheckInterval": 86400000  // 24 hours
}
```

**Stable Mode (default)**:
- Uses bundled frameworks from npm package
- Updates via `npm update -g aiwg`
- Version pinnable via npm

**Edge Mode** (`aiwg --use-main`):
- Clones/updates git repo to `~/.local/share/ai-writing-guide`
- Uses git repo for frameworks (like current install.sh)
- Updates from HEAD of main on `aiwg -update`

### Update Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Invocation                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Check update interval  │
              │ (background, async)    │
              └────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      [Stable Channel]          [Edge Channel]
              │                         │
              ▼                         ▼
    Query npm registry         Check git remote
    for latest version         for new commits
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  New version available? │
              └────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                   Yes            No
                    │             │
                    ▼             ▼
         ┌─────────────────┐   [Continue]
         │ Prompt user:    │
         │ "Update to      │
         │ v2024.12.1?"    │
         └─────────────────┘
                    │
             ┌──────┴──────┐
             │             │
            Yes            No
             │             │
             ▼             ▼
    [Run npm update]   [Continue, remind later]
```

## Implementation Components

### 1. Package Configuration (package.json)

```json
{
  "name": "aiwg",
  "version": "2024.12.0",
  "description": "AI Writing Guide - Framework for improving AI-generated content quality",
  "bin": {
    "aiwg": "./bin/aiwg.mjs"
  },
  "type": "module",
  "engines": {
    "node": ">=18.0.0"
  },
  "files": [
    "bin/",
    "src/",
    "agentic/",
    "docs/",
    "CLAUDE.md",
    "USAGE_GUIDE.md"
  ],
  "keywords": [
    "ai", "writing", "claude", "sdlc", "agents", "cli"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/jmagly/ai-writing-guide.git"
  },
  "license": "MIT",
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

### 2. CLI Entry Point (bin/aiwg.mjs)

```javascript
#!/usr/bin/env node

import { run } from '../src/cli/index.mjs';
import { checkForUpdates } from '../src/update/checker.mjs';

// Non-blocking update check
checkForUpdates().catch(() => {});

// Run CLI
await run(process.argv.slice(2));
```

### 3. Channel Manager (src/channel/manager.mjs)

Core responsibilities:
- Read/write channel configuration
- Resolve framework paths based on channel
- Handle `--use-main` and `--use-stable` switches
- Manage edge mode git operations

### 4. Update Checker (src/update/checker.mjs)

Core responsibilities:
- Query npm registry for latest version (stable)
- Query git remote for new commits (edge)
- Prompt user for update confirmation
- Execute update command

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Required for provenance

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Publish with provenance
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

### Versioning Workflow

```bash
# Prepare release
npm version 2024.12.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: v2024.12.0"

# Tag and push (triggers publish)
git tag v2024.12.0
git push origin main --tags
```

## Migration Strategy

### For Existing install.sh Users

1. **No breaking changes**: install.sh continues to work
2. **Documentation**: Update README to recommend npm install
3. **Optional migration**: Document how to switch from git to npm:
   ```bash
   # Remove git installation
   rm -rf ~/.local/share/ai-writing-guide
   # Remove shell aliases
   # Edit ~/.bashrc or ~/.zshrc

   # Install via npm
   npm install -g aiwg
   ```

### Backward Compatibility

- All existing commands work identically
- `aiwg --use-main` recreates the install.sh experience
- Edge mode uses same paths as install.sh (`~/.local/share/ai-writing-guide`)

## Security

### Package Signing

1. **npm provenance**: Enabled via `--provenance` flag
2. **GitHub Actions OIDC**: No long-lived secrets needed
3. **2FA on npm account**: Required for publishing

### Supply Chain Security

- Lock file committed (`package-lock.json`)
- Dependabot enabled for vulnerability alerts
- No runtime dependencies (pure ESM)

## Testing Strategy

### Unit Tests
- Channel manager logic
- Update checker logic
- Version parsing

### Integration Tests
- CLI commands work after npm install
- Channel switching works correctly
- Update prompts appear correctly

### E2E Tests
- Full npm install → use → update cycle
- Edge mode activation and git operations

## Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| npm weekly downloads | Track growth | npm stats |
| GitHub stars | Track growth | GitHub API |
| Issues related to install | Decrease | GitHub issues |
| Time to install | < 30s | Manual testing |

---

*Generated by AIWG intake-wizard on 2024-12-09*
