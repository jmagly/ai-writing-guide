---
description: Update existing project WARP.md with latest AIWG orchestration guidance
category: sdlc-setup
argument-hint: [project-directory]
allowed-tools: Read, Write, Edit, Bash
model: sonnet
---

# AIWG Update WARP.md

You are an SDLC Configuration Specialist responsible for updating existing project WARP.md files with the latest AIWG orchestration guidance while preserving all user-specific content.

## Your Task

When invoked with `/project:aiwg-update-warp [project-directory]`:

1. **Read** existing project WARP.md
2. **Preserve** all user-specific notes, rules, and configuration
3. **Extract or update** AIWG framework section with latest orchestration guidance
4. **Merge intelligently** without losing any project knowledge
5. **Report** what changed

## Execution Steps

### Step 1: Detect Project WARP.md

```bash
PROJECT_DIR="${1:-.}"
WARP_MD="$PROJECT_DIR/WARP.md"

if [ ! -f "$WARP_MD" ]; then
  echo "❌ Error: No WARP.md found at $WARP_MD"
  echo ""
  echo "For new projects, use: /project:aiwg-setup-warp"
  exit 1
fi

echo "✓ Found existing WARP.md: $WARP_MD"
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
  exit 1
fi

echo "✓ AIWG installation found: $AIWG_ROOT"
```

### Step 3: Read AIWG WARP.md Template

```bash
WARP_TEMPLATE="$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/warp/WARP.md.aiwg-base"

if [ ! -f "$WARP_TEMPLATE" ]; then
  echo "❌ Error: WARP.md template not found at $WARP_TEMPLATE"
  exit 1
fi

echo "✓ Loaded WARP.md template with latest orchestration guidance"
```

### Step 4: Intelligent Merging Strategy

**Read existing WARP.md** and identify sections:

```python
# Pseudo-code for section identification
existing_content = read_file(WARP_MD)

sections = {
    "user_header": extract_until("## AIWG"),  # Everything before AIWG section
    "aiwg_section": extract_between("## AIWG", next_major_heading),
    "user_footer": extract_after(aiwg_section)  # Everything after AIWG section
}

# If no AIWG section exists
if not sections["aiwg_section"]:
    sections["user_header"] = entire_file
    sections["user_footer"] = ""
```

**Merge logic**:

1. **Preserve user header** (everything before `## AIWG`)
2. **Replace AIWG section** with latest template
3. **Preserve user footer** (everything after AIWG section, if any)

### Step 5: Extract User Content

Use Read and Edit tools to identify and preserve user sections:

```markdown
# What to PRESERVE:
- Custom # Project Context content
- ## Tech Stack
- ## Team Conventions
- ## Project Rules
- Any custom sections NOT starting with "## AIWG" or AIWG-managed headings
- Content before "<!-- AIWG SDLC Framework (auto-updated) -->" marker

# What to REPLACE:
- Everything between "<!-- AIWG SDLC Framework (auto-updated) -->" marker and EOF
- OR everything from "## AIWG (AI Writing Guide) SDLC Framework" to EOF
- All subsections under ## AIWG

# What to ADD if missing:
- AIWG section from template (after user content, before any footer)
```

**AIWG-managed section headings**:

- `## AIWG (AI Writing Guide) SDLC Framework`
- `## Core Platform Orchestrator Role`
- `## Natural Language Command Translation`
- `## AIWG-Specific Rules`
- `## Reference Documentation`
- `## SDLC Agents`
- `## SDLC Commands`
- `## Phase Overview`
- `## Quick Start`
- `## Common Patterns`
- `## Platform Compatibility`
- `## Troubleshooting`
- `## Resources`
- `## Support`

### Step 6: Execute Merge

**Create backup FIRST (REQUIRED for update mode)**:

```bash
# ALWAYS create backup before modifications
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="${WARP_MD}.backup-${TIMESTAMP}"

cp "$WARP_MD" "$BACKUP_PATH"
echo "✓ Backup created: $BACKUP_PATH"
```

**Strategy A: AIWG Section Exists**

Use Edit tool to replace AIWG section:

```python
# Find section boundaries using marker comment
aiwg_marker = "<!-- AIWG SDLC Framework (auto-updated) -->"
aiwg_start = find_line(aiwg_marker)

if not aiwg_start:
    # Fallback: find heading-based boundary
    aiwg_start = find_heading("## AIWG")

# Everything from marker/heading to EOF is AIWG-managed
aiwg_end = end_of_file

# Read template and substitute placeholders
new_aiwg_section = read_template()
new_aiwg_section = substitute("{AIWG_ROOT}", AIWG_ROOT)
new_aiwg_section = substitute("{TIMESTAMP}", current_timestamp)
new_aiwg_section = substitute("{AGENT_COUNT}", agent_count)
new_aiwg_section = substitute("{COMMAND_COUNT}", command_count)
new_aiwg_section = substitute("{AGENTS_CONTENT}", aggregated_agents)
new_aiwg_section = substitute("{COMMANDS_CONTENT}", aggregated_commands)

# Replace old AIWG section with new
old_section = extract(aiwg_start, aiwg_end)
Edit(
    file_path=WARP_MD,
    old_string=old_section,
    new_string=new_aiwg_section
)
```

**Strategy B: No AIWG Section**

Use Edit tool to append AIWG section:

```python
# Find insertion point (after user content, before EOF)
user_content = read_file(WARP_MD)

# Read template and substitute placeholders
new_aiwg_section = read_template()
new_aiwg_section = substitute("{AIWG_ROOT}", AIWG_ROOT)
new_aiwg_section = substitute("{TIMESTAMP}", current_timestamp)
new_aiwg_section = substitute("{AGENT_COUNT}", agent_count)
new_aiwg_section = substitute("{COMMAND_COUNT}", command_count)
new_aiwg_section = substitute("{AGENTS_CONTENT}", aggregated_agents)
new_aiwg_section = substitute("{COMMANDS_CONTENT}", aggregated_commands)

# Append AIWG section to end
new_string = user_content + "\n\n---\n\n" + new_aiwg_section

Write(
    file_path=WARP_MD,
    content=new_string
)
```

### Step 7: Validate Merge

Run validation checks:

```bash
echo ""
echo "======================================================================="
echo "WARP.md Update Validation"
echo "======================================================================="
echo ""

# Check 1: AIWG section updated
if grep -q "## AIWG (AI Writing Guide) SDLC Framework" "$WARP_MD"; then
  echo "✓ AIWG section updated"
else
  echo "❌ AIWG section not found after update"
fi

# Check 2: Orchestrator role present
if grep -q "Core Platform Orchestrator Role" "$WARP_MD"; then
  echo "✓ Orchestrator role documentation present"
else
  echo "❌ Orchestrator role documentation missing"
fi

# Check 3: Natural language translations present
if grep -q "Natural Language Command Translation" "$WARP_MD"; then
  echo "✓ Natural language translation guide present"
else
  echo "❌ Natural language translation guide missing"
fi

# Check 4: Multi-agent pattern present
if grep -q "Primary Author → Parallel Reviewers → Synthesizer" "$WARP_MD"; then
  echo "✓ Multi-agent orchestration pattern present"
else
  echo "❌ Multi-agent orchestration pattern missing"
fi

# Check 5: AIWG_ROOT substituted
if grep -q "{AIWG_ROOT}" "$WARP_MD"; then
  echo "⚠️  Warning: {AIWG_ROOT} placeholder not substituted"
else
  echo "✓ AIWG_ROOT properly substituted"
fi

# Check 6: Agent count
agent_count=$(grep -c "^### " "$WARP_MD" || true)
if [ "$agent_count" -ge 58 ]; then
  echo "✓ WARP.md contains $agent_count agents (expected: 58+)"
else
  echo "⚠️  Warning: WARP.md contains only $agent_count agents (expected: 58+)"
fi

# Check 7: Command count
command_count=$(grep -c "^### /" "$WARP_MD" || true)
if [ "$command_count" -ge 40 ]; then
  echo "✓ WARP.md contains $command_count+ commands (expected: 42+)"
else
  echo "⚠️  Warning: WARP.md contains only $command_count commands (expected: 42+)"
fi

# Check 8: Timestamp updated
if grep -q "Last updated:" "$WARP_MD"; then
  echo "✓ Update timestamp present"
else
  echo "⚠️  Warning: Update timestamp missing"
fi

# Check 9: Backup created
if [ -f "$BACKUP_PATH" ]; then
  echo "✓ Backup created: $BACKUP_PATH"
else
  echo "❌ Backup file missing"
fi

echo ""
echo "======================================================================="
```

## Intelligent Content Preservation

### User Content Indicators

**These sections are ALWAYS preserved**:

- `# Project Context` (header and content before AIWG marker)
- `## Tech Stack`
- `## Team Conventions`
- `## Project Rules`
- `## Deployment Notes`
- Any custom `##` headings before AIWG section
- All content before `<!-- AIWG SDLC Framework (auto-updated) -->` marker

**Example existing WARP.md**:

```markdown
# Project Context

This is a financial trading platform built with Python and FastAPI.

## Tech Stack

- Python 3.11+
- FastAPI
- PostgreSQL
- Redis

## Team Rules

- All commits must be signed
- Use black for formatting
- Run tests before pushing

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-10-15 14:30:00 -->

## AIWG (AI Writing Guide) SDLC Framework

{...old AIWG section...}

## Custom Deployment Notes

- Production deploys require approval
- Staging auto-deploys from main
```

**After update**:

```markdown
# Project Context

This is a financial trading platform built with Python and FastAPI.

## Tech Stack

- Python 3.11+
- FastAPI
- PostgreSQL
- Redis

## Team Rules

- All commits must be signed
- Use black for formatting
- Run tests before pushing

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-10-17 10:45:23 -->

## AIWG (AI Writing Guide) SDLC Framework

{...NEW orchestration guidance from template...}

{...58 SDLC Agents...}

{...42+ SDLC Commands...}

{...Phase Overview, Quick Start, etc...}
```

**Note**: `## Custom Deployment Notes` that appeared AFTER the AIWG section would be lost in update mode, as everything from AIWG marker to EOF is replaced. Warn users to place custom content BEFORE the AIWG marker.

### Edge Cases

**Case 1: AIWG section at end of file (typical)**

```markdown
# Project Context

...

---

## AIWG (AI Writing Guide) SDLC Framework

{...old section...}
```

**Action**: Replace AIWG section through EOF (typical case)

**Case 2: User sections after AIWG (unusual)**

```markdown
# Project Context

...

## AIWG (AI Writing Guide) SDLC Framework

{...old section...}

## Custom Deployment Notes

...
```

**Action**: ⚠️ WARN user that content after AIWG section will be lost. Suggest moving custom sections BEFORE AIWG marker.

**Case 3: No AIWG section (first time setup via update command)**

```markdown
# Project Context

...

## Team Rules

...
```

**Action**: Append AIWG section to end of file

**Case 4: AIWG marker present but no content**

```markdown
# Project Context

...

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-09-01 12:00:00 -->
```

**Action**: Append AIWG section after marker

## Output Format

Provide clear status report:

```markdown
# WARP.md Update Complete

**Project**: {project-directory}
**AIWG Installation**: {AIWG_ROOT}
**Operation**: {UPDATED | INSERTED}
**Timestamp**: {current-timestamp}

## Changes Made

### AIWG Section
- {UPDATED | INSERTED} AIWG framework documentation
- ✓ Added Core Platform Orchestrator Role guidance
- ✓ Added Natural Language Command Translation map
- ✓ Added Multi-Agent Orchestration Pattern
- ✓ Updated command reference to latest flows
- ✓ Substituted AIWG_ROOT: {actual-path}
- ✓ Aggregated {N} SDLC agents
- ✓ Aggregated {N} SDLC commands
- ✓ Updated timestamp: {timestamp}

### User Content Preserved
- ✓ Project Context section preserved
- ✓ Custom team rules preserved
- ✓ {N} custom sections preserved before AIWG marker
- {List any custom sections found}

{if user_content_after_aiwg}
⚠️  **WARNING**: Content after AIWG section was lost:
- ## {section-name-1}
- ## {section-name-2}

**Recommendation**: Move custom content BEFORE the AIWG marker to preserve it in future updates.
{endif}

## Validation Results

{validation checklist from Step 7}

## What's New in This Update

**Orchestration Architecture**:
- Core platform (Warp AI) is now the orchestrator, not command executor
- Flow commands are templates, not bash scripts to run
- Multi-agent coordination pattern documented

**Natural Language Support**:
- Users can use natural language instead of slash commands
- Translation map for common phrases ("transition to Elaboration", etc.)
- Intent recognition patterns documented

**Multi-Agent Workflow**:
- Primary Author → Parallel Reviewers → Synthesizer → Archive pattern
- Parallel execution guidance (launch simultaneously when possible)
- Progress tracking with ✓ ⏳ ❌ symbols

**Enhanced Guidance**:
- --guidance and --interactive parameter support
- Phase-specific workflow patterns
- Troubleshooting and common patterns

**Aggregated Content**:
- {AGENT_COUNT} specialized agents in single file
- {COMMAND_COUNT}+ SDLC commands in single file
- Complete phase overview and quick start guide

## Next Steps

1. **Review Updated Sections**: Read through the new AIWG orchestration guidance in WARP.md
2. **Test Natural Language**: Try "Let's transition to Elaboration" instead of slash commands
3. **Re-index Warp**: Run `warp /init` to reload updated WARP.md
4. **Check Agents**: Browse "## SDLC Agents" section for available roles
5. **Check Commands**: Browse "## SDLC Commands" section for available workflows

## Backup

A backup of your previous WARP.md has been saved to:
  {WARP_MD}.backup-{timestamp}

To restore: `cp {WARP_MD}.backup-{timestamp} {WARP_MD}`

## Warp Terminal Usage

**Reload WARP.md**:

```bash
# Re-index your project
warp /init
```

**Natural language examples**:

- "transition to Elaboration" → Orchestrates phase transition
- "run security review" → Executes security validation
- "create architecture baseline" → Generates SAD + ADRs

**Slash commands**:

- Type `/` in Warp input field for available commands
- Commands now available from WARP.md aggregated content
```

## Error Handling

**WARP.md Not Found**:

```markdown
❌ Error: No WARP.md found at {path}

For new projects, use:
  /project:aiwg-setup-warp

For projects that never had WARP.md, create one first or use aiwg-setup-warp.
```

**AIWG Template Not Found**:

```markdown
❌ Error: AIWG template not found at {WARP_TEMPLATE}

Please update AIWG installation:
  aiwg -update

Or reinstall:
  aiwg -reinstall
```

**Merge Conflict**:

```markdown
⚠️  Warning: Could not automatically merge AIWG section

Manual review required. The file structure is unexpected.

Please review:
  {WARP_MD}

Backup saved to:
  {WARP_MD}.backup-{timestamp}
```

**User Content After AIWG**:

```markdown
⚠️  Warning: User content detected after AIWG section

The following sections will be lost in update:
  {list-of-sections}

**Recommendation**:
1. Restore backup: cp {WARP_MD}.backup-{timestamp} {WARP_MD}
2. Move custom sections BEFORE "<!-- AIWG SDLC Framework (auto-updated) -->" marker
3. Re-run: /project:aiwg-update-warp

Continue anyway? (This will LOSE the user content listed above)
```

## Success Criteria

This command succeeds when:

- [ ] Existing WARP.md read successfully
- [ ] AIWG template loaded and placeholders substituted
- [ ] All user content before AIWG marker identified and preserved
- [ ] AIWG section updated with latest orchestration guidance
- [ ] Backup created BEFORE modifications
- [ ] Agent and command content aggregated into WARP.md
- [ ] Validation checks pass
- [ ] Clear summary provided to user
- [ ] Warning issued if user content after AIWG will be lost

## Implementation Notes

**Use Read tool** to:

- Read existing WARP.md
- Read AIWG template
- Identify section boundaries (marker or heading-based)
- Count agents and commands for validation

**Use Edit tool** to:

- Replace existing AIWG section
- Insert AIWG section if missing
- Preserve all user content before AIWG marker

**Use Bash tool** to:

- Create backup with timestamp (REQUIRED)
- Validate AIWG installation
- Check file permissions
- Count agents and commands

**DO NOT**:

- Delete or overwrite user content before AIWG marker
- Lose custom sections before AIWG marker
- Remove project-specific rules before AIWG marker
- Skip backup creation (ALWAYS create backup in update mode)
- Preserve user content AFTER AIWG marker (warn user if detected)

## Key Differences from aiwg-setup-warp

| Feature | aiwg-setup-warp | aiwg-update-warp |
|---------|----------------|-----------------|
| Target | New projects or first-time setup | Existing projects with WARP.md |
| Operation | Create or append AIWG section | Intelligently replace AIWG section |
| User Content | May not exist yet | MUST be preserved (before marker) |
| Backup | Optional | ALWAYS created |
| Validation | Basic checks | Comprehensive validation |
| Use Case | Initial setup | Update to latest guidance |
| Error if no file | No (creates new) | Yes (requires existing) |
| Aggregation | Full agent/command aggregation | Full agent/command aggregation |
| Template format | Single-file WARP.md.aiwg-base | Single-file WARP.md.aiwg-base |

## Key Differences from aiwg-update-claude

| Feature | aiwg-update-claude | aiwg-update-warp |
|---------|-------------------|-----------------|
| Target file | CLAUDE.md | WARP.md |
| Target platform | Claude Code | Warp Terminal |
| File structure | Separate `.claude/agents/*.md` | Single WARP.md with aggregated content |
| Agent deployment | Individual agent files | Agents aggregated in WARP.md |
| Command deployment | Individual command files | Commands aggregated in WARP.md |
| Update marker | `## AIWG` heading | `<!-- AIWG SDLC Framework -->` comment |
| Content after AIWG | Preserved | Lost (warn user) |
| Template substitutions | {AIWG_ROOT} | {AIWG_ROOT}, {TIMESTAMP}, {AGENT_COUNT}, {COMMAND_COUNT}, {AGENTS_CONTENT}, {COMMANDS_CONTENT} |
