# CLI/Installer Requirements for Multi-Framework Support

**Purpose**: Define requirements for discrete installation of SDLC and MMK frameworks
**Date**: 2025-01-28

---

## Current State Analysis

### Existing CLI Structure

**deploy-agents.mjs** supports:
- `--mode general|sdlc|both` - Deployment mode selection
- `--provider claude|openai|factory` - Platform targeting
- `--deploy-commands` - Include commands
- Framework paths are hardcoded to SDLC locations

**new-project.mjs** supports:
- `--provider claude|openai` - Platform selection
- `--no-agents` - Skip agent deployment
- SDLC templates only (hardcoded paths)

### Gap Analysis

| Feature | Current | Required |
|---------|---------|----------|
| Framework selection | SDLC only | SDLC, MMK, or both |
| Intake templates | SDLC templates | Framework-specific templates |
| CLAUDE.md template | SDLC orchestration | Framework-specific orchestration |
| Commands | SDLC commands | Framework-specific commands |
| Output directory | `.aiwg/intake/` | `.aiwg/intake/` (shared) + framework subdirs |

---

## Proposed CLI Updates

### 1. Extended Mode Selection

**Current**: `--mode general|sdlc|both`

**Proposed**: `--mode general|sdlc|marketing|all`

| Mode | Description |
|------|-------------|
| `general` | Writing agents only (no SDLC or marketing) |
| `sdlc` | SDLC Complete framework only |
| `marketing` | Media/Marketing Kit framework only |
| `all` | All frameworks (SDLC + Marketing + General) |

**Backward compatibility**:
- `both` maps to `all` (deprecated alias)
- Default remains `all` for existing behavior

### 2. New Project Scaffolder Updates

**new-project.mjs** changes:

```bash
# Current usage
aiwg -new [--no-agents] [--provider claude|openai]

# Proposed usage
aiwg -new [--framework sdlc|marketing|all] [--no-agents] [--provider claude|openai]
```

**Framework-specific scaffolding**:

| Framework | Intake Templates | CLAUDE.md Section | Commands Deployed |
|-----------|-----------------|-------------------|-------------------|
| `sdlc` | project-intake, solution-profile, option-matrix | SDLC orchestration | flow-*, intake-*, gate-* |
| `marketing` | campaign-intake, brand-brief, audience-profile | MMK orchestration | campaign-*, generate-*, flow-strategy-* |
| `all` | Both sets | Combined orchestration | All commands |

### 3. Deploy Agents Updates

**deploy-agents.mjs** changes:

```javascript
// Add marketing framework paths
const frameworkPaths = {
  sdlc: path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete'),
  marketing: path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit')
};

// Mode to framework mapping
const modeFrameworks = {
  'general': [],
  'sdlc': ['sdlc'],
  'marketing': ['marketing'],
  'all': ['sdlc', 'marketing'],
  'both': ['sdlc', 'marketing']  // Deprecated alias
};
```

### 4. Install Script Updates

**install.sh** changes:
- Add `--framework` flag to installation
- Support framework-specific updates

```bash
# Current
aiwg -update

# Proposed
aiwg -update [--framework sdlc|marketing|all]
```

---

## Framework Directory Structure

### Source Paths (AIWG Repository)

```
agentic/code/frameworks/
├── sdlc-complete/           # Existing SDLC framework
│   ├── agents/
│   ├── commands/
│   ├── templates/
│   └── ...
└── media-marketing-kit/     # New MMK framework
    ├── agents/
    ├── commands/
    ├── templates/
    └── ...
```

### Target Paths (User Project)

All frameworks share the unified `.aiwg/` directory:

```
.aiwg/
├── intake/                  # Shared: All intake forms
│   ├── project-intake.md    # SDLC
│   ├── solution-profile.md  # SDLC
│   ├── campaign-intake.md   # MMK
│   └── brand-brief.md       # MMK
├── marketing/               # MMK-specific outputs
│   ├── strategy/
│   ├── content/
│   └── ...
├── requirements/            # SDLC-specific outputs
├── architecture/            # SDLC-specific outputs
└── ...                      # Shared directories (working, reports, etc.)
```

---

## Implementation Tasks

### Phase 1: Core CLI Updates

1. **Update deploy-agents.mjs**
   - Add `marketing` mode
   - Add framework path resolution
   - Handle `all` mode (deploy from multiple framework dirs)
   - Add deprecation warning for `both`

2. **Update new-project.mjs**
   - Add `--framework` argument
   - Implement framework-specific template copying
   - Update CLAUDE.md generation per framework

3. **Update install.sh**
   - Add framework-aware update mechanism
   - Support selective framework installation

### Phase 2: CLAUDE.md Templates

1. **Create MMK CLAUDE.md template**
   - Marketing orchestration section
   - Natural language translations for MMK
   - Phase model and gate criteria

2. **Create combined CLAUDE.md template**
   - Both SDLC and MMK orchestration
   - Unified command references

### Phase 3: Documentation

1. **Update CLAUDE.md** (repository root)
   - Add MMK framework documentation
   - Update CLI usage examples

2. **Update README.md**
   - Add MMK framework overview
   - Update installation instructions

---

## CLI Usage Examples

### Scenario 1: SDLC-Only Project

```bash
# Scaffold SDLC project
aiwg -new --framework sdlc

# Deploy only SDLC agents/commands to existing project
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc
```

### Scenario 2: Marketing-Only Project

```bash
# Scaffold marketing project
aiwg -new --framework marketing

# Deploy only marketing agents/commands
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing
```

### Scenario 3: Combined Project (Product Launch)

```bash
# Scaffold project with both frameworks
aiwg -new --framework all

# Or add marketing to existing SDLC project
aiwg -deploy-agents --mode marketing
aiwg -deploy-commands --mode marketing
```

### Scenario 4: Selective Updates

```bash
# Update only SDLC framework
aiwg -update --framework sdlc

# Update only marketing framework
aiwg -update --framework marketing

# Update everything
aiwg -update --framework all
```

---

## Backward Compatibility

| Old Usage | New Behavior | Notes |
|-----------|--------------|-------|
| `aiwg -new` | Defaults to `--framework sdlc` | Existing behavior preserved |
| `--mode both` | Maps to `--mode all` | Deprecated with warning |
| `aiwg -deploy-agents` (no mode) | Defaults to `--mode all` | May change—TBD |
| `aiwg -update` (no framework) | Updates all installed frameworks | Existing behavior |

---

## Configuration File Updates

### models.json

Add marketing-specific model recommendations:

```json
{
  "claude": {
    "reasoning": { "model": "claude-opus-4-1-20250805" },
    "coding": { "model": "claude-sonnet-4-5-20250929" },
    "efficiency": { "model": "claude-haiku-3-5" }
  },
  "marketing": {
    "strategy": { "model": "opus", "description": "Strategic planning, positioning" },
    "content": { "model": "sonnet", "description": "Content creation, copywriting" },
    "review": { "model": "haiku", "description": "Quick compliance checks" }
  }
}
```

### settings.json

Add marketing framework read permissions:

```json
{
  "permissions": {
    "allow": [
      "Read(~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/**)",
      "Read(~/.local/share/ai-writing-guide/agentic/code/frameworks/media-marketing-kit/**)"
    ]
  }
}
```

---

## Testing Requirements

1. **Unit tests**
   - Mode parsing (general, sdlc, marketing, all)
   - Framework path resolution
   - Template selection per framework

2. **Integration tests**
   - New project scaffold per framework
   - Agent deployment per mode
   - Combined framework deployment

3. **E2E tests**
   - Full SDLC workflow
   - Full MMK workflow
   - Combined product launch workflow

---

## Timeline Estimate

| Task | Duration |
|------|----------|
| CLI updates (deploy-agents, new-project) | 1 week |
| CLAUDE.md templates | 3 days |
| Documentation updates | 2 days |
| Testing | 1 week |
| **Total** | ~2.5 weeks |

---

## Open Questions

1. **Default mode**: Should `aiwg -deploy-agents` (no mode) default to `all` or `sdlc`?
2. **Framework detection**: Should CLI auto-detect which frameworks are relevant based on project structure?
3. **Upgrade path**: How to handle projects created before MMK framework existed?
4. **Conflict resolution**: What happens if SDLC and MMK have agents/commands with same name?

---

*Document prepared for MMK Framework planning*
