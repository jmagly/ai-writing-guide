---
description: Update project CLAUDE.md with AIWG framework context and configuration
category: sdlc-setup
argument-hint: [project-directory]
allowed-tools: Read, Write, Edit, Glob, Bash
model: sonnet
---

# AIWG Setup Project

You are an SDLC Setup Specialist responsible for configuring projects to use the AI Writing Guide (AIWG) SDLC framework.

## Your Task

When invoked with `/project:aiwg-setup-project [project-directory]`:

1. **Read** existing project CLAUDE.md (if present)
2. **Preserve** all user-specific notes, rules, and configuration
3. **Add or update** AIWG framework section with access documentation
4. **Update** allowed-tools if needed to grant agent read access to AIWG installation
5. **Validate** AIWG installation path is accessible

## Execution Steps

### Step 1: Detect Project CLAUDE.md

```bash
PROJECT_DIR="${1:-.}"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"

if [ -f "$CLAUDE_MD" ]; then
  echo "✓ Existing CLAUDE.md found: $CLAUDE_MD"
  EXISTING_CONTENT=$(cat "$CLAUDE_MD")
else
  echo "ℹ No existing CLAUDE.md found, will create new file"
  EXISTING_CONTENT=""
fi
```

### Step 2: Resolve AIWG Installation Path

Use path resolution from `aiwg-config-template.md`:

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

AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG first:"
  echo "  curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash"
  echo ""
  echo "Or set AIWG_ROOT environment variable if installed elsewhere."
  exit 1
fi

echo "✓ AIWG installation found: $AIWG_ROOT"
```

### Step 3: Detect Existing AIWG Section

Check if CLAUDE.md already has AIWG documentation:

```bash
if echo "$EXISTING_CONTENT" | grep -q "## AIWG.*Framework"; then
  echo "ℹ Existing AIWG section found, will update in place"
  UPDATE_MODE=true
else
  echo "ℹ No AIWG section found, will append new section"
  UPDATE_MODE=false
fi
```

### Step 4: Read AIWG CLAUDE.md Template

Read the AIWG CLAUDE.md template and prepare for merging:

```bash
CLAUDE_TEMPLATE="$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/project/CLAUDE.md"

if [ ! -f "$CLAUDE_TEMPLATE" ]; then
  echo "❌ Error: CLAUDE.md template not found at $CLAUDE_TEMPLATE"
  exit 1
fi

# Read template and substitute AIWG_ROOT placeholder
AIWG_SECTION=$(cat "$CLAUDE_TEMPLATE" | sed "s|{AIWG_ROOT}|$AIWG_ROOT|g")

echo "✓ Loaded CLAUDE.md template with orchestration guidance"
```

**Key sections in template**:

1. **Core Platform Orchestrator Role** - Explains natural language interpretation and multi-agent coordination
2. **Natural Language Command Translation** - Maps user phrases to flow templates
3. **Multi-Agent Workflow Pattern** - Primary Author → Parallel Reviewers → Synthesizer → Archive
4. **Available Commands Reference** - All SDLC commands with descriptions
5. **Phase Overview** - Inception through Production with milestones
6. **Quick Start Guide** - Step-by-step initialization
7. **Common Patterns** - Example workflows for risk, architecture, security, testing

**Template placeholders**:
- `{AIWG_ROOT}` → Replace with actual resolved path

### Step 5: Update or Append AIWG Section

If existing CLAUDE.md found:

```bash
if [ "$UPDATE_MODE" = true ]; then
  # Replace existing AIWG section
  # Find section start: ## AIWG
  # Find section end: Next ## heading or EOF
  # Replace with new content

  echo "Updating existing AIWG section in $CLAUDE_MD"

  # Use Edit tool to replace AIWG section
  # Preserve all other content (user notes, project-specific rules)
else
  # Append new AIWG section to end of file
  echo "Appending AIWG section to $CLAUDE_MD"

  # Add separator before AIWG section
  cat >> "$CLAUDE_MD" <<'EOF'

---

EOF

  # Append AIWG content
  cat >> "$CLAUDE_MD" <<'EOF'
{AIWG_SECTION_CONTENT}
EOF
fi
```

If no existing CLAUDE.md:

```bash
# Copy template directly with substitutions
cat "$CLAUDE_TEMPLATE" | sed "s|{AIWG_ROOT}|$AIWG_ROOT|g" > "$CLAUDE_MD"

echo "✓ Created new CLAUDE.md from template: $CLAUDE_MD"
echo "  User should fill in 'Repository Purpose' section"
```

### Step 6: Update Allowed-Tools (if needed)

Check if `.claude/settings.local.json` exists and has AIWG read access:

```bash
SETTINGS_FILE="$PROJECT_DIR/.claude/settings.local.json"

if [ -f "$SETTINGS_FILE" ]; then
  # Check if AIWG path already in allowed-tools
  if ! grep -q "$AIWG_ROOT" "$SETTINGS_FILE"; then
    echo "ℹ Updating allowed-tools in $SETTINGS_FILE to grant AIWG access"

    # Add AIWG read access to allowed-tools
    # Parse JSON, add new entry, write back
    # Format: "Read(//{absolute-path}/ai-writing-guide/**)"

    # Convert ~ to absolute path for agent access
    AIWG_ROOT_ABSOLUTE=$(echo "$AIWG_ROOT" | sed "s|^~|$HOME|")

    # Note: Manual JSON editing required - inform user
    echo ""
    echo "⚠️  Manual Action Required:"
    echo "Add AIWG read access to .claude/settings.local.json:"
    echo ""
    echo '  "allowed-tools": ['
    echo "    \"Read(//$AIWG_ROOT_ABSOLUTE/**)\","
    echo '    ... (existing entries)'
    echo '  ]'
    echo ""
  else
    echo "✓ AIWG path already in allowed-tools"
  fi
else
  echo "ℹ No .claude/settings.local.json found"
  echo "  AIWG access will use default permissions"
fi
```

### Step 7: Validate Setup

Run validation checks:

```bash
echo ""
echo "======================================================================="
echo "AIWG Setup Validation"
echo "======================================================================="
echo ""

# Check 1: AIWG installation accessible
if [ -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "✓ AIWG installation found: $AIWG_ROOT"
else
  echo "❌ AIWG installation not accessible"
fi

# Check 2: CLAUDE.md updated
if [ -f "$CLAUDE_MD" ]; then
  if grep -q "## AIWG" "$CLAUDE_MD"; then
    echo "✓ CLAUDE.md has AIWG section"
  else
    echo "❌ CLAUDE.md missing AIWG section"
  fi
else
  echo "❌ CLAUDE.md not found"
fi

# Check 3: Template directories exist
if [ -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake" ]; then
  echo "✓ AIWG templates accessible"
else
  echo "❌ AIWG templates not found"
fi

# Check 4: .aiwg directory structure (create if needed)
if [ ! -d "$PROJECT_DIR/.aiwg" ]; then
  echo "ℹ Creating .aiwg/ artifact directory structure"
  mkdir -p "$PROJECT_DIR/.aiwg"/{intake,requirements,architecture,planning,risks,testing,security,quality,deployment,team,working,reports}
  echo "✓ .aiwg/ directory structure created"
else
  echo "✓ .aiwg/ directory exists"
fi

echo ""
echo "======================================================================="
echo "Setup Complete"
echo "======================================================================="
echo ""
echo "Next Steps:"
echo "  1. Review CLAUDE.md and add project-specific context"
echo "  2. Start intake: /project:intake-wizard \"your project description\" --interactive"
echo "  3. Check status: /project:project-status"
echo ""
```

## Output Format

Provide clear status report:

```markdown
# AIWG Setup Complete

**Project**: {project-directory}
**AIWG Installation**: {AIWG_ROOT}
**CLAUDE.md**: {CREATED | UPDATED}

## Changes Made

### CLAUDE.md
- ✓ Added AIWG framework documentation section
- ✓ Documented available commands and phase workflows
- ✓ Included quick start guide and common patterns
- {if UPDATE_MODE} ✓ Preserved existing user notes and rules

### Project Structure
- ✓ Created .aiwg/ artifact directory structure
- ✓ Verified AIWG installation accessible

### Agent Access
- {if settings.local.json updated} ✓ Updated allowed-tools for AIWG access
- {if manual action needed} ⚠️ Manual action required: Update .claude/settings.local.json

## Validation Results

{validation checklist from Step 7}

## Next Steps

1. **Review CLAUDE.md**: Open `{CLAUDE_MD}` and add project-specific context
2. **Start Intake**: Run `/project:intake-wizard "your project description" --interactive`
3. **Deploy Agents**: Run `aiwg -deploy-agents --mode sdlc`
4. **Check Status**: Run `/project:project-status` to see current phase

## Resources

- **AIWG Framework**: {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/README.md
- **Command Reference**: {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/commands/
- **Template Library**: {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/templates/
- **Agent Catalog**: {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/agents/
```

## Error Handling

**AIWG Not Installed**:
```markdown
❌ Error: AIWG installation not found

Please install AIWG first:

  curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash

Or set AIWG_ROOT environment variable:

  export AIWG_ROOT=/custom/path/to/ai-writing-guide
  /project:aiwg-setup-project
```

**CLAUDE.md Parse Error**:
```markdown
⚠️ Warning: Could not parse existing CLAUDE.md

The file exists but has unexpected format. Please review manually:
  {CLAUDE_MD}

AIWG section has been appended to end of file. You may need to reorganize.
```

**Permission Denied**:
```markdown
❌ Error: Cannot write to {CLAUDE_MD}

Please check file permissions:
  ls -la {CLAUDE_MD}
```

## Success Criteria

This command succeeds when:
- [ ] AIWG installation path resolved and validated
- [ ] CLAUDE.md created or updated with AIWG section
- [ ] All user content preserved (if existing CLAUDE.md)
- [ ] .aiwg/ directory structure created
- [ ] Agent access documented (allowed-tools guidance provided)
- [ ] Validation checks pass
- [ ] Clear next steps provided to user

## Notes

- **Idempotent**: Can be run multiple times safely (updates in place)
- **Preserves User Content**: Never deletes or overwrites user-specific notes
- **Configurable**: Respects AIWG_ROOT environment variable
- **Validates**: Ensures AIWG installation accessible before making changes
- **Guides**: Provides clear next steps for starting SDLC workflow
