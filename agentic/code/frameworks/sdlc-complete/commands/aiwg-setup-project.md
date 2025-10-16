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

### Step 4: Generate AIWG Section Content

Create the AIWG framework documentation section:

```markdown
## AIWG (AI Writing Guide) SDLC Framework

This project uses the **AI Writing Guide SDLC framework** for software development lifecycle management.

### What is AIWG?

AIWG is a comprehensive SDLC framework providing:
- **58 specialized agents** covering all lifecycle phases (Inception → Elaboration → Construction → Transition → Production)
- **42+ commands** for project management, security, testing, deployment, and traceability
- **100+ templates** for requirements, architecture, testing, security, deployment artifacts
- **Phase-based workflows** with gate criteria and milestone tracking
- **Multi-agent orchestration** patterns for collaborative artifact generation

### Installation and Access

**AIWG Installation Path**: `{AIWG_ROOT}`

**Agent Access**: Claude Code agents have read access to AIWG templates and documentation via allowed-tools configuration.

**Verify Installation**:
```bash
# Check AIWG is accessible
ls {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/

# Available resources:
# - agents/     → 58 SDLC role agents
# - commands/   → 42+ slash commands
# - templates/  → 100+ artifact templates
# - flows/      → Phase workflow documentation
```

### Project Artifacts Directory: .aiwg/

All SDLC artifacts (requirements, architecture, testing, etc.) are stored in **`.aiwg/`**:

```
.aiwg/
├── intake/              # Project intake forms
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams
├── planning/            # Phase and iteration plans
├── risks/               # Risk register and mitigation
├── testing/             # Test strategy, plans, results
├── security/            # Threat models, security artifacts
├── quality/             # Code reviews, retrospectives
├── deployment/          # Deployment plans, runbooks
├── team/                # Team profile, agent assignments
├── working/             # Temporary scratch (safe to delete)
└── reports/             # Generated reports and indices
```

### Available Commands

**Intake & Inception**:
- `/project:intake-wizard` - Generate or complete intake forms interactively
- `/project:intake-from-codebase` - Analyze existing codebase to generate intake
- `/project:intake-start` - Validate intake and kick off Inception phase
- `/project:flow-concept-to-inception` - Execute Concept → Inception workflow

**Phase Transitions**:
- `/project:flow-inception-to-elaboration` - Transition to Elaboration phase
- `/project:flow-elaboration-to-construction` - Transition to Construction phase
- `/project:flow-construction-to-transition` - Transition to Transition phase

**Continuous Workflows** (run throughout lifecycle):
- `/project:flow-risk-management-cycle` - Risk identification and mitigation
- `/project:flow-requirements-evolution` - Living requirements refinement
- `/project:flow-architecture-evolution` - Architecture change management
- `/project:flow-test-strategy-execution` - Test suite execution and validation
- `/project:flow-security-review-cycle` - Security validation and threat modeling
- `/project:flow-performance-optimization` - Performance baseline and optimization

**Quality & Gates**:
- `/project:flow-gate-check <phase-name>` - Validate phase gate criteria
- `/project:flow-handoff-checklist <from-phase> <to-phase>` - Phase handoff validation
- `/project:project-status` - Current phase, milestone progress, next steps
- `/project:project-health-check` - Overall project health metrics

**Team & Process**:
- `/project:flow-team-onboarding <member> [role]` - Onboard new team member
- `/project:flow-knowledge-transfer <from> <to> [domain]` - Knowledge transfer workflow
- `/project:flow-cross-team-sync <team-a> <team-b>` - Cross-team coordination
- `/project:flow-retrospective-cycle <type> [iteration]` - Retrospective facilitation

**Deployment & Operations**:
- `/project:flow-deploy-to-production <strategy> <version>` - Production deployment
- `/project:flow-hypercare-monitoring <duration-days>` - Post-launch monitoring
- `/project:flow-incident-response <incident-id> [severity]` - Production incident triage

**Compliance & Governance**:
- `/project:flow-compliance-validation <framework>` - Compliance validation workflow
- `/project:flow-change-control <change-type> [change-id]` - Change control workflow
- `/project:check-traceability <path-to-csv>` - Verify requirements-to-code traceability
- `/project:security-gate` - Enforce security criteria before release

### Command Parameters

All flow commands support standard parameters:
- `[project-directory]` - Path to project root (default: `.`)
- `--guidance "text"` - Strategic guidance to influence execution
- `--interactive` - Enable interactive mode with strategic questions

**Examples**:
```bash
# Provide upfront guidance
/project:flow-architecture-evolution --guidance "Focus on security first, SOC2 audit in 3 months"

# Interactive mode with questions
/project:flow-inception-to-elaboration --interactive

# Combined approach
/project:intake-wizard "Build customer portal" --interactive --guidance "Healthcare domain, HIPAA critical"
```

### Agent Deployment

Deploy SDLC agents to your project:

```bash
# Deploy all agents (general-purpose + SDLC)
aiwg -deploy-agents --mode both

# Deploy only SDLC agents
aiwg -deploy-agents --mode sdlc

# Deploy commands
aiwg -deploy-commands --mode sdlc
```

Agents are deployed to:
- `.claude/agents/` (Claude Code)
- `.codex/agents/` (OpenAI Codex, if using --provider openai)

### Phase Overview

**Inception** (4-6 weeks):
- Validate problem, vision, risks
- Architecture sketch, ADRs
- Security screening, data classification
- Business case, funding approval
- **Milestone**: Lifecycle Objective (LO)

**Elaboration** (4-8 weeks):
- Detailed requirements (use cases, NFRs)
- Architecture baseline (SAD, component design)
- Risk retirement (PoCs, spikes)
- Test strategy, CI/CD setup
- **Milestone**: Lifecycle Architecture (LA)

**Construction** (8-16 weeks):
- Feature implementation
- Automated testing (unit, integration, E2E)
- Security validation (SAST, DAST)
- Performance optimization
- **Milestone**: Initial Operational Capability (IOC)

**Transition** (2-4 weeks):
- Production deployment
- User acceptance testing
- Support handover, runbooks
- Hypercare monitoring (2-4 weeks)
- **Milestone**: Product Release (PR)

**Production** (ongoing):
- Operational monitoring
- Incident response
- Feature iteration
- Continuous improvement

### Quick Start

1. **Initialize Project**:
   ```bash
   # Generate intake forms
   /project:intake-wizard "Your project description" --interactive
   ```

2. **Start Inception**:
   ```bash
   # Validate intake and kick off Inception
   /project:intake-start .aiwg/intake/

   # Execute Concept → Inception workflow
   /project:flow-concept-to-inception .
   ```

3. **Check Status**:
   ```bash
   # View current phase and next steps
   /project:project-status
   ```

4. **Progress Through Phases**:
   ```bash
   # When Inception complete, transition to Elaboration
   /project:flow-gate-check inception  # Validate gate criteria
   /project:flow-inception-to-elaboration  # Transition phase
   ```

### Common Patterns

**Risk Management** (run weekly or when risks identified):
```bash
/project:flow-risk-management-cycle --guidance "Focus on technical risks, preparing for Elaboration"
```

**Architecture Evolution** (when architecture changes needed):
```bash
/project:flow-architecture-evolution database-migration --interactive
```

**Security Review** (before each phase gate):
```bash
/project:flow-security-review-cycle --guidance "SOC2 audit prep, focus on access controls"
```

**Test Execution** (run continuously in Construction):
```bash
/project:flow-test-strategy-execution integration --guidance "Focus on API endpoints, <5min execution time target"
```

### AIWG-Specific Rules

1. **Artifact Location**: All SDLC artifacts MUST be created in `.aiwg/` subdirectories (not project root)
2. **Template Usage**: Always use AIWG templates from `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
3. **Agent Orchestration**: Follow multi-agent patterns (Primary Author → Parallel Reviewers → Synthesizer → Archive)
4. **Phase Gates**: Validate gate criteria before transitioning phases (use `/project:flow-gate-check`)
5. **Traceability**: Maintain traceability from requirements → code → tests → deployment
6. **Guidance First**: Use `--guidance` or `--interactive` to express direction upfront (vs redirecting post-generation)

### Troubleshooting

**Template Not Found**:
```bash
# Verify AIWG installation
ls $AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/

# Set environment variable if installed elsewhere
export AIWG_ROOT=/custom/path/to/ai-writing-guide
```

**Agent Access Denied**:
- Check `.claude/settings.local.json` has read access to AIWG installation path
- Verify path uses absolute path (not `~` shorthand for user home)

**Command Not Found**:
```bash
# Deploy commands to project
aiwg -deploy-commands --mode sdlc

# Verify deployment
ls .claude/commands/flow-*.md
```

### Resources

- **AIWG Repository**: https://github.com/jmagly/ai-writing-guide
- **Framework Documentation**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md`
- **Phase Workflows**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/flows/`
- **Template Library**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/`

### Support

- **Issues**: https://github.com/jmagly/ai-writing-guide/issues
- **Discussions**: https://github.com/jmagly/ai-writing-guide/discussions
- **Documentation**: https://github.com/jmagly/ai-writing-guide/blob/main/README.md
```

**Substitutions to Make**:
- Replace `{AIWG_ROOT}` with actual resolved path (e.g., `/home/user/.local/share/ai-writing-guide`)
- Expand user home `~` to absolute path (e.g., `/home/user`) for agent access

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
# Create new CLAUDE.md with AIWG section
cat > "$CLAUDE_MD" <<'EOF'
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Repository Purpose

{User should fill this in}

{AIWG_SECTION_CONTENT}
EOF

echo "✓ Created new CLAUDE.md with AIWG documentation: $CLAUDE_MD"
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
