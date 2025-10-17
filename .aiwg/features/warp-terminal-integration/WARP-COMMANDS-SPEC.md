# Warp Commands Specification

## Overview

Based on the existing `/project:aiwg-setup-project` and `/project:aiwg-update-claude` commands, we need equivalent commands for Warp Terminal:

1. **`/project:aiwg-setup-warp`** - Initial Warp setup (mirrors `aiwg-setup-project`)
2. **`/project:aiwg-update-warp`** - Update existing Warp setup (mirrors `aiwg-update-claude`)

**Key Insight**: Follow the proven intelligent merge pattern from Claude commands, adapted for Warp's single-file (WARP.md) structure.

---

## Command 1: `/project:aiwg-setup-warp`

### Purpose

Configure new or existing projects to use AIWG with Warp Terminal by creating/updating WARP.md with intelligent content preservation.

### Frontmatter

```yaml
---
description: Setup Warp Terminal with AIWG framework context (preserves existing content)
category: sdlc-setup
argument-hint: [project-directory]
allowed-tools: Read, Write, Edit, Glob, Bash
model: sonnet
---
```

### Execution Steps

#### Step 1: Resolve AIWG Installation Path

**Same as Claude command** - use standard resolution:

```bash
# Priority order:
# 1. $AIWG_ROOT environment variable
# 2. ~/.local/share/ai-writing-guide
# 3. /usr/local/share/ai-writing-guide
# 4. Git repo root (development)
```

#### Step 2: Check Existing WARP.md

```bash
PROJECT_DIR="${1:-.}"
WARP_MD="$PROJECT_DIR/WARP.md"
```

**Three scenarios**:

1. **No WARP.md** → Create from template
2. **WARP.md exists, no AIWG section** → Intelligently merge
3. **WARP.md exists with AIWG section** → Update AIWG section in place

**Key Difference from Claude**: Warp uses single `WARP.md` file, not `.warp/agents/*.md` subdirectories.

#### Step 3: Load AIWG Template

```bash
WARP_TEMPLATE="$AIWG_PATH/agentic/code/frameworks/sdlc-complete/templates/warp/WARP.md.aiwg-base"
```

**Template structure**:

```markdown
# Project Context

<!-- User content preserved above this line -->

---

## AIWG (AI Writing Guide) SDLC Framework

{AIWG orchestration overview}

---

## SDLC Agents (58 Specialized Roles)

### Intake Coordinator

**Tools**: Bash, Read, Write, MultiEdit, WebFetch

**Purpose**: Transform intake forms into validated inception plans...

{agent content aggregated from all .md files}

---

## SDLC Commands (42+ Workflows)

### /intake-wizard

**Purpose**: Generate or complete intake forms interactively

{command content aggregated from all .md files}

---
```

**Template generation** (done by `setup-warp.mjs` script):
1. Read base AIWG orchestration context
2. Aggregate all agent files → "SDLC Agents" section
3. Aggregate all command files → "SDLC Commands" section
4. Combine into single WARP.md template

#### Step 4: Intelligent Merge Strategy

**Same pattern as Claude command**:

```python
# Parse existing WARP.md sections
sections = parse_markdown_sections(existing_warp_md)

# Identify user sections (NOT AIWG-managed)
user_sections = [s for s in sections if not is_aiwg_section(s.heading)]

# Identify AIWG sections (to be replaced)
aiwg_sections = [s for s in sections if is_aiwg_section(s.heading)]

# Merge: user first, then AIWG
merged_content = format_sections(user_sections) + "\n\n---\n\n" + aiwg_template
```

**AIWG-managed section headings**:
- `## AIWG (AI Writing Guide) SDLC Framework`
- `## SDLC Agents`
- `## SDLC Commands`
- `## Platform Compatibility`
- `## Core Orchestrator`
- `## Natural Language`
- `## Phase Overview`

**User-managed sections** (preserved):
- `# Project Context` (header)
- `## Tech Stack`
- `## Team Conventions`
- `## Project Rules`
- Any custom `##` headings not matching AIWG patterns

#### Step 5: Execute Merge

**Scenario 1: No existing WARP.md**

```python
template_content = read(WARP_TEMPLATE)
final_content = template_content.replace("{AIWG_ROOT}", AIWG_PATH)
write(WARP_MD, final_content)
print("✓ Created WARP.md from AIWG template")
```

**Scenario 2: WARP.md exists, no AIWG section**

```python
existing_content = read(WARP_MD)
template_content = read(WARP_TEMPLATE)

# Preserve user content, append AIWG
final_content = (
    existing_content +
    "\n\n<!-- AIWG SDLC Framework (auto-updated) -->\n" +
    "<!-- Last updated: {timestamp} -->\n\n" +
    template_content.replace("{AIWG_ROOT}", AIWG_PATH)
)

write(WARP_MD, final_content)
print("✓ Merged AIWG content into existing WARP.md")
print("✓ All existing content preserved")
```

**Scenario 3: WARP.md exists with AIWG section**

```python
existing_content = read(WARP_MD)
template_content = read(WARP_TEMPLATE)

# Find AIWG section boundaries
aiwg_start = find_line(existing_content, r"^## AIWG")
aiwg_end = find_next_major_section_or_eof(existing_content, aiwg_start)

# Extract user content before and after AIWG
user_header = existing_content[:aiwg_start]
user_footer = existing_content[aiwg_end:]

# Replace AIWG section with new template
new_aiwg_section = template_content.replace("{AIWG_ROOT}", AIWG_PATH)
final_content = user_header + new_aiwg_section + user_footer

write(WARP_MD, final_content)
print("✓ Updated AIWG section in existing WARP.md")
print("✓ All user content preserved")
```

#### Step 6: Validate Setup

```bash
echo ""
echo "======================================================================="
echo "Warp Setup Validation"
echo "======================================================================="
echo ""

# Check 1: AIWG installation accessible
if [ -d "$AIWG_PATH/agentic/code/frameworks/sdlc-complete" ]; then
  echo "✓ AIWG installation: $AIWG_PATH"
else
  echo "❌ AIWG installation not accessible"
fi

# Check 2: WARP.md updated
if [ -f "$WARP_MD" ]; then
  if grep -q "## AIWG" "$WARP_MD"; then
    echo "✓ WARP.md has AIWG section"
  else
    echo "❌ WARP.md missing AIWG section"
  fi
else
  echo "❌ WARP.md not found"
fi

# Check 3: Agent count
agent_count=$(grep -c "^### " "$WARP_MD" || true)
if [ "$agent_count" -ge 58 ]; then
  echo "✓ WARP.md contains $agent_count agents (expected: 58+)"
else
  echo "⚠️  Warning: WARP.md contains only $agent_count agents (expected: 58+)"
fi

# Check 4: Command count
command_count=$(grep -c "/intake\|/flow\|/project" "$WARP_MD" || true)
if [ "$command_count" -ge 40 ]; then
  echo "✓ WARP.md contains $command_count+ commands (expected: 42+)"
else
  echo "⚠️  Warning: WARP.md contains only $command_count commands (expected: 42+)"
fi

# Check 5: Warp compatibility note
if grep -q "Warp Terminal" "$WARP_MD"; then
  echo "✓ Warp Terminal compatibility documented"
else
  echo "⚠️  Warning: Warp Terminal compatibility not documented"
fi

echo ""
echo "======================================================================="
```

#### Step 7: Provide Next Steps

```markdown
# Warp Setup Complete ✓

**Project**: {project-directory}
**AIWG Installation**: {AIWG_PATH}
**WARP.md**: {CREATED | UPDATED | MERGED}

## Changes Made

### WARP.md
- ✓ Added/Updated AIWG framework documentation
- ✓ Aggregated 58 SDLC agents into single file
- ✓ Aggregated 42+ SDLC commands into single file
- ✓ Included Core Platform Orchestrator guidance
- ✓ Added natural language command translations
- {if existing WARP.md} ✓ Preserved all user content

### User Content Preserved
- ✓ Project-specific rules
- ✓ Tech stack preferences
- ✓ Team conventions
- ✓ {N} custom sections preserved

## Next Steps

1. **Initialize Warp**:
   ```bash
   # Open project in Warp Terminal
   cd {project-directory}

   # Warp will automatically load WARP.md
   # Or manually trigger: warp /init
   ```

2. **Test Natural Language**:
   - "Let's transition to Elaboration"
   - "Run security review"
   - "Where are we?"

3. **Use Slash Commands**:
   - Type `/` in Warp input field
   - Browse available commands
   - Execute SDLC workflows

4. **Check WARP.md**:
   - Review aggregated agents and commands
   - Verify user content preserved
   - Add project-specific notes if needed

## Warp Terminal Usage

**Warp automatically loads WARP.md** when you:
- Open terminal in project directory
- Run `warp /init` manually
- Edit files in the project

**Natural language examples**:
- "transition to Elaboration" → Orchestrates phase transition
- "run security review" → Executes security validation
- "create architecture baseline" → Generates SAD + ADRs

## Resources

- **AIWG Framework**: {AIWG_PATH}/agentic/code/frameworks/sdlc-complete/README.md
- **Warp Documentation**: https://docs.warp.dev/knowledge-and-collaboration/rules
- **Natural Language Guide**: {AIWG_PATH}/docs/simple-language-translations.md
```

---

## Command 2: `/project:aiwg-update-warp`

### Purpose

Update existing project WARP.md with latest AIWG SDLC content while preserving all user-specific rules and notes.

### Frontmatter

```yaml
---
description: Update existing project WARP.md with latest AIWG orchestration guidance
category: sdlc-setup
argument-hint: [project-directory]
allowed-tools: Read, Write, Edit, Bash
model: sonnet
---
```

### Execution Steps

**Same structure as `/project:aiwg-update-claude`**:

1. **Detect WARP.md** (fail if not found - use `aiwg-setup-warp` for first-time)
2. **Resolve AIWG path** (same logic as setup command)
3. **Load AIWG template** (same aggregated template)
4. **Intelligent merge** (preserve user sections, replace AIWG sections)
5. **Create backup** (`.backup-{timestamp}`)
6. **Validate update** (check agent/command counts, AIWG sections)
7. **Report changes** (what was preserved, what was updated)

### Key Differences from aiwg-setup-warp

| Feature | aiwg-setup-warp | aiwg-update-warp |
|---------|----------------|-----------------|
| Target | New or first-time setup | Existing WARP.md only |
| Creates WARP.md | Yes (if missing) | No (fails if missing) |
| Backup | Optional | ALWAYS created |
| Use Case | Initial setup | Update to latest AIWG version |
| Error if no file | No (creates new) | Yes (requires existing) |

---

## Implementation: `tools/warp/setup-warp.mjs`

### Script Structure

```javascript
#!/usr/bin/env node
/**
 * Setup Warp - Intelligent WARP.md Merge Tool
 *
 * Mirrors the proven pattern from aiwg-setup-project and aiwg-update-claude.
 *
 * Usage:
 *   node tools/warp/setup-warp.mjs [options]
 *
 * Options:
 *   --target <path>    Target directory (default: cwd)
 *   --mode <type>      Mode: general, sdlc, or both (default: both)
 *   --update           Update mode (fail if no WARP.md exists)
 *   --dry-run          Preview changes without writing
 *   --force            Overwrite WARP.md (discard user content)
 */

import fs from 'fs';
import path from 'path';

// 1. Resolve AIWG installation path (same as Claude commands)
function resolveAIWGRoot() { ... }

// 2. Parse markdown sections (detect user vs AIWG content)
function parseMarkdownSections(md) { ... }

// 3. Check if section is AIWG-managed (to be replaced)
function isAIWGManagedSection(heading) { ... }

// 4. Transform agent file to WARP.md section
function transformAgentToSection(agentMd) { ... }

// 5. Transform command file to WARP.md section
function transformCommandToSection(commandMd) { ... }

// 6. Aggregate all agents and commands into AIWG template
function generateAIWGContent(aiwgRoot, mode) { ... }

// 7. Intelligent merge (preserve user, replace AIWG)
function mergeWarpMd(existingWarpMd, aiwgContent, force) { ... }

// 8. Create backup before modifications
function createBackup(warpMdPath) { ... }

// 9. Validate WARP.md structure
function validateWarpMd(warpMdPath) { ... }

// Main execution
(function main() {
  // Parse args
  // Resolve AIWG root
  // Load existing WARP.md (if present)
  // Generate AIWG content (aggregate agents + commands)
  // Merge intelligently
  // Write result
  // Validate
  // Report
})();
```

### Mirrored Logic from Claude Commands

**From `aiwg-setup-project.md`**:
- AIWG path resolution logic
- Template loading and substitution
- Merge scenarios (no file, no AIWG section, has AIWG section)
- Validation checklist
- Next steps guidance

**From `aiwg-update-claude.md`**:
- Section identification (user vs AIWG)
- Intelligent preservation of user content
- Backup creation before modifications
- Comprehensive validation
- Status reporting

**Key Adaptation for Warp**:
- Single file (`WARP.md`) instead of separate `.claude/agents/*.md`
- Aggregate all agents/commands into WARP.md sections
- Use same merge markers: `<!-- AIWG SDLC Framework (auto-updated) -->`

---

## CLI Integration

### Update `install.sh`

```bash
# install.sh additions
aiwg() {
  aiwg_update
  local sub="$1"
  shift || true
  case "$sub" in
    -setup-warp|--setup-warp)
      node "$PREFIX/tools/warp/setup-warp.mjs" "$@"
      ;;
    -update-warp|--update-warp)
      node "$PREFIX/tools/warp/setup-warp.mjs" --update "$@"
      ;;
    # ... existing commands ...
  esac
}
```

### Usage Examples

```bash
# Initial setup (creates WARP.md or merges with existing)
aiwg -setup-warp

# Update existing WARP.md (fails if no WARP.md)
aiwg -update-warp

# Dry-run (preview changes)
aiwg -setup-warp --dry-run

# Force overwrite (discard user content)
aiwg -setup-warp --force

# Target specific directory
aiwg -setup-warp --target /path/to/project

# Deploy specific mode
aiwg -setup-warp --mode sdlc
```

---

## Testing Strategy

### Test Cases

1. **New project (no WARP.md)**
   - Expected: Create WARP.md from template
   - Validate: 58+ agents, 42+ commands, AIWG sections present

2. **Existing WARP.md (no AIWG content)**
   - Expected: Preserve user content, append AIWG sections
   - Validate: User sections first, AIWG sections after separator

3. **Existing WARP.md (with AIWG content)**
   - Expected: Replace AIWG sections, preserve user content
   - Validate: User sections unchanged, AIWG sections updated

4. **Update mode (no WARP.md)**
   - Expected: Fail with error message
   - Validate: Clear error, suggests using setup mode

5. **Dry-run mode**
   - Expected: Preview without writing
   - Validate: No file changes, preview output shown

6. **Force mode**
   - Expected: Overwrite completely
   - Validate: User content discarded, pure AIWG template

### Validation Checklist

- [ ] AIWG installation path resolved
- [ ] WARP.md created or updated
- [ ] User content preserved (if exists)
- [ ] AIWG sections up to date
- [ ] Agent count ≥ 58
- [ ] Command count ≥ 42
- [ ] Backup created (update mode)
- [ ] `{AIWG_ROOT}` substituted
- [ ] Merge markers present
- [ ] Validation passes

---

## Timeline Estimate

| Task | Effort | Status |
|------|--------|--------|
| Create `setup-warp.mjs` script | 6-8 hours | ⏳ Pending |
| Create WARP.md.aiwg-base template | 2 hours | ⏳ Pending |
| Update `install.sh` CLI | 1 hour | ⏳ Pending |
| Test with new projects | 2 hours | ⏳ Pending |
| Test with existing projects | 2 hours | ⏳ Pending |
| Test update mode | 1 hour | ⏳ Pending |
| Documentation | 2 hours | ⏳ Pending |
| **TOTAL** | **16-18 hours** | **⏳ Not Started** |

**Previous estimate**: 14-16 hours (initial design)
**Revised estimate**: 16-18 hours (mirrors proven Claude pattern)

---

## Success Criteria

### Functional

- [ ] `aiwg -setup-warp` creates new WARP.md (no existing file)
- [ ] `aiwg -setup-warp` merges into existing WARP.md (preserves user content)
- [ ] `aiwg -setup-warp --force` overwrites existing WARP.md
- [ ] `aiwg -setup-warp --dry-run` previews changes without writing
- [ ] `aiwg -update-warp` updates existing WARP.md only
- [ ] `aiwg -update-warp` fails gracefully if no WARP.md
- [ ] User sections detected and preserved correctly
- [ ] AIWG sections replaced on updates
- [ ] Merge markers added for transparency
- [ ] Works with Warp terminal `/init` command

### Non-Functional

- [ ] Follows proven Claude command pattern
- [ ] Code reuse from existing commands (80%+)
- [ ] Clear error messages
- [ ] Comprehensive validation
- [ ] Backward compatible
- [ ] Well-documented

---

## Document Status

**Status**: ✅ READY FOR IMPLEMENTATION
**Pattern**: Mirrors proven `aiwg-setup-project` + `aiwg-update-claude` commands
**Next Action**: Create `tools/warp/setup-warp.mjs` script
**Estimated Effort**: 16-18 hours (2 days)
