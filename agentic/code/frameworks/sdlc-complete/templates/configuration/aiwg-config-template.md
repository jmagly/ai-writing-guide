# AIWG Configuration

**Purpose**: Centralized configuration for AI Writing Guide (AIWG) SDLC framework paths and settings.

## Configuration Variables

### Installation Paths

**AIWG_ROOT**: Base installation path for AI Writing Guide framework
- **Default**: `~/.local/share/ai-writing-guide`
- **Detection**: Check for installer-created directory
- **Fallback**: Use current repository root if installed path not found

**Usage in Commands**:
```bash
# Detect AIWG installation path
if [ -d ~/.local/share/ai-writing-guide ]; then
  AIWG_ROOT=~/.local/share/ai-writing-guide
elif [ -d /usr/local/share/ai-writing-guide ]; then
  AIWG_ROOT=/usr/local/share/ai-writing-guide
else
  # Fallback: assume running from repo
  AIWG_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
fi

# Use in template paths
TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/{category}/{template-name}.md
```

### Template Paths

**SDLC Templates**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`

**Categories**:
- **Intake**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/`
- **Requirements**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/`
- **Architecture**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/`
- **Testing**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/test/`
- **Security**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/security/`
- **Deployment**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/deployment/`
- **Management**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/`

### Project Paths

**Artifacts Directory**: `.aiwg/` (project-local SDLC artifacts)

**Subdirectories**:
- `.aiwg/intake/` - Project intake forms
- `.aiwg/requirements/` - Requirements artifacts
- `.aiwg/architecture/` - Architecture docs (SAD, ADRs)
- `.aiwg/planning/` - Phase and iteration plans
- `.aiwg/risks/` - Risk register
- `.aiwg/testing/` - Test plans and results
- `.aiwg/security/` - Security artifacts
- `.aiwg/quality/` - Code reviews, retrospectives
- `.aiwg/deployment/` - Deployment plans
- `.aiwg/team/` - Team profile, agent assignments
- `.aiwg/working/` - Temporary scratch (safe to delete)
- `.aiwg/archive/` - Historical versions

## Path Resolution Strategy

### Priority Order (highest to lowest)

1. **Environment Variable**: `$AIWG_ROOT` (if set)
2. **Installer Location**: `~/.local/share/ai-writing-guide` (check existence)
3. **System Location**: `/usr/local/share/ai-writing-guide` (check existence)
4. **Repository Root**: Git repo root (development mode)
5. **Current Directory**: `.` (last resort fallback)

### Implementation Pattern

```bash
# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}

# Usage
AIWG_ROOT=$(resolve_aiwg_root)
TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/project-intake-template.md
```

## Agent-Accessible Paths

**Note**: The AIWG installer grants Claude Code agents read access to `~/.local/share/ai-writing-guide`.

**Verified Access** (from CLAUDE.md):
```
allowed-tools: Read(//home/user/.local/share/ai-writing-guide/**)
```

**Usage in Agents**:
- Agents can read templates directly from installation path
- No need to copy templates to project (reference by path)
- Agents use `Read` tool to access templates

## Configuration Override

**Project-Level Override**: `.aiwg/config.yaml` (optional)

```yaml
# AIWG Project Configuration
aiwg_root: /custom/path/to/ai-writing-guide  # Override installation path
templates:
  custom_paths:
    intake: /custom/templates/intake/  # Override specific template category
artifacts:
  output_path: .aiwg/  # Default, can customize
  archive_path: .aiwg/archive/  # Historical versions
```

**Environment Variables**:
```bash
export AIWG_ROOT=/custom/path/to/ai-writing-guide
export AIWG_ARTIFACTS_PATH=.aiwg/  # Project artifacts location
```

## Best Practices

1. **Always use path resolution**: Never hardcode `~/.local/share/ai-writing-guide`
2. **Check path existence**: Validate paths before use
3. **Provide helpful errors**: If path not found, guide user to install or set `$AIWG_ROOT`
4. **Use relative paths for project artifacts**: Always use `.aiwg/` (project-local)
5. **Document path assumptions**: Explain where templates are expected in command docs

## Migration Guide

**For Existing Commands**:

**Before** (hardcoded):
```bash
TEMPLATE=~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/intake/project-intake-template.md
```

**After** (configurable):
```bash
AIWG_ROOT=$(resolve_aiwg_root)
TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/project-intake-template.md

# Or with error handling
if [ ! -f "$TEMPLATE" ]; then
  echo "Error: Template not found: $TEMPLATE"
  echo "Please ensure AIWG is installed or set AIWG_ROOT environment variable"
  exit 1
fi
```

## Testing Path Resolution

```bash
# Test path resolution
AIWG_ROOT=$(resolve_aiwg_root)
echo "AIWG Root: $AIWG_ROOT"

# Validate templates directory exists
if [ -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates" ]; then
  echo "✓ Templates directory found"
else
  echo "✗ Templates directory not found at $AIWG_ROOT"
  exit 1
fi

# List available templates
ls -la "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/"
```

## Troubleshooting

**Problem**: Template not found errors

**Solutions**:
1. Verify AIWG installed: `ls ~/.local/share/ai-writing-guide`
2. Set environment variable: `export AIWG_ROOT=/path/to/ai-writing-guide`
3. Reinstall AIWG: `aiwg -reinstall`
4. Check file permissions: `ls -la ~/.local/share/ai-writing-guide`

**Problem**: Agents can't read templates

**Solutions**:
1. Verify read access in `.claude/settings.local.json`:
   ```json
   {
     "allowed-tools": ["Read(//home/user/.local/share/ai-writing-guide/**)"]
   }
   ```
2. Update CLAUDE.md with AIWG access documentation
3. Use absolute paths (not `~` - expand to full path)
