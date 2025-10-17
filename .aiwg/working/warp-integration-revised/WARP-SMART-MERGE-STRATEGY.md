# Warp Smart Merge Strategy

## Problem Statement

**Warp Behavior** (from `/init` command):
```
When user runs: /init
→ Warp reads existing CLAUDE.md
→ Warp COPIES content to WARP.md
→ WARP.md becomes primary file
→ Future edits happen in WARP.md
```

**AIWG Challenge**:
- AIWG uses intelligent line-based merging in CLAUDE.md
- Existing projects may have custom CLAUDE.md content
- Need to preserve user content while adding AIWG SDLC context
- Need dedicated `aiwg-warp` command (like `aiwg-claude`)

---

## Solution: Smart Merge Command

### New CLI Command

```bash
aiwg -setup-warp [--target <path>] [--mode sdlc|general|both]
```

**Behavior**:
1. Read existing WARP.md (if present)
2. Parse user content vs AIWG content
3. Intelligently merge AIWG SDLC sections
4. Preserve user-specific rules
5. Write updated WARP.md

### Merge Strategy

#### Section Detection

**AIWG-Managed Sections** (replace on update):
- `## AIWG SDLC Framework Overview`
- `## SDLC Agents (58 Specialized Roles)`
- `## SDLC Commands (42+ Workflows)`
- `## Platform Compatibility`

**User-Managed Sections** (preserve):
- Custom project rules
- Project-specific context
- Team conventions
- Technology stack preferences

#### Merge Algorithm

```javascript
function mergeWarpMd(existingWarpMd, aiwgContent) {
  // 1. Parse existing WARP.md into sections
  const existingSections = parseMarkdownSections(existingWarpMd);

  // 2. Parse AIWG content into sections
  const aiwgSections = parseMarkdownSections(aiwgContent);

  // 3. Identify user sections (not AIWG-managed)
  const userSections = existingSections.filter(s =>
    !isAIWGManagedSection(s.heading)
  );

  // 4. Merge: user sections first, then AIWG sections
  const mergedSections = [
    ...userSections,
    ...aiwgSections
  ];

  // 5. Add merge markers
  const output = [
    '# Project Context\n',
    '<!-- User-specific content (preserved) -->\n',
    ...userSections.map(s => s.content),
    '\n<!-- AIWG SDLC Framework (auto-updated) -->\n',
    '<!-- Last updated: ' + new Date().toISOString() + ' -->\n',
    ...aiwgSections.map(s => s.content)
  ].join('\n');

  return output;
}

function isAIWGManagedSection(heading) {
  const aiwgSections = [
    'AIWG SDLC Framework Overview',
    'SDLC Agents',
    'SDLC Commands',
    'Platform Compatibility',
    'Core Orchestrator Role',
    'Natural Language Command Translation',
    'Multi-Agent Orchestration'
  ];

  return aiwgSections.some(section =>
    heading.toLowerCase().includes(section.toLowerCase())
  );
}

function parseMarkdownSections(md) {
  const sections = [];
  const lines = md.split('\n');

  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      // New section
      if (currentSection) {
        sections.push({
          heading: currentSection,
          content: currentContent.join('\n')
        });
      }
      currentSection = line.replace(/^##\s+/, '');
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentSection) {
    sections.push({
      heading: currentSection,
      content: currentContent.join('\n')
    });
  }

  return sections;
}
```

---

## CLI Implementation

### New Command: `aiwg -setup-warp`

**Purpose**: Intelligently merge AIWG SDLC content into existing WARP.md

**Usage**:
```bash
# Initial setup (no existing WARP.md)
aiwg -setup-warp

# Update existing WARP.md with AIWG content
aiwg -setup-warp

# Dry-run (preview changes)
aiwg -setup-warp --dry-run

# Force overwrite (discard user content)
aiwg -setup-warp --force

# Target specific directory
aiwg -setup-warp --target /path/to/project

# Deploy specific mode
aiwg -setup-warp --mode sdlc
```

### Workflow

**Scenario 1: No existing WARP.md**
```bash
user@machine:~/project$ aiwg -setup-warp

Checking for existing WARP.md... not found
Generating new WARP.md with AIWG SDLC content...
✓ Created WARP.md (58 agents, 42 commands)

Run `warp /init` to index your codebase.
```

**Scenario 2: Existing WARP.md (no AIWG content)**
```bash
user@machine:~/project$ aiwg -setup-warp

Checking for existing WARP.md... found
Analyzing existing content...
  - User sections: 3 (preserved)
  - AIWG sections: 0 (adding)

Merging AIWG SDLC content...
✓ Updated WARP.md
  - Preserved: Project-specific rules, Tech stack, Team conventions
  - Added: AIWG SDLC Framework, 58 agents, 42 commands

Your existing content has been preserved at the top of WARP.md.
```

**Scenario 3: Existing WARP.md (with outdated AIWG content)**
```bash
user@machine:~/project$ aiwg -setup-warp

Checking for existing WARP.md... found
Analyzing existing content...
  - User sections: 3 (preserved)
  - AIWG sections: 3 (updating)

Updating AIWG SDLC content...
✓ Updated WARP.md
  - Preserved: Project-specific rules, Tech stack, Team conventions
  - Updated: AIWG SDLC Framework (v1.4.0 → v1.5.0)

AIWG content has been refreshed with latest agents and commands.
```

---

## File Structure Example

### Before (User's WARP.md)

```markdown
# Project Context

## Tech Stack

- Node.js 20+
- TypeScript 5.3+
- PostgreSQL 15

## Team Conventions

- Use Prettier for formatting
- Write tests for all new features
- No console.log in production code

## Project Rules

- Follow REST API best practices
- Use semantic versioning
- Document all public APIs
```

### After (Merged WARP.md)

```markdown
# Project Context

<!-- User-specific content (preserved) -->

## Tech Stack

- Node.js 20+
- TypeScript 5.3+
- PostgreSQL 15

## Team Conventions

- Use Prettier for formatting
- Write tests for all new features
- No console.log in production code

## Project Rules

- Follow REST API best practices
- Use semantic versioning
- Document all public APIs

---

<!-- AIWG SDLC Framework (auto-updated) -->
<!-- Last updated: 2025-10-17T16:30:00.000Z -->

## AIWG SDLC Framework Overview

This project uses the **AI Writing Guide (AIWG) SDLC framework** for software development lifecycle management.

### Core Platform Orchestrator Role

Claude Code acts as the Core Orchestrator for SDLC workflows...

---

## SDLC Agents (58 Specialized Roles)

### Intake Coordinator

**Expertise Level**: Advanced
**Domain**: Project Intake, Requirements Gathering
**Tools**: Bash, Read, Write, MultiEdit, WebFetch

...

---

## SDLC Commands (42+ Workflows)

### /intake-wizard

**Purpose**: Generate or complete intake forms interactively

...
```

---

## Comparison with `aiwg-claude` Command

### Existing: `aiwg -deploy-agents --provider claude`

**Behavior**:
- Deploys agents to `.claude/agents/*.md` (58 files)
- Deploys commands to `.claude/commands/*.md` (42 files)
- Optionally creates/updates `CLAUDE.md` (orchestration context only)
- Does NOT aggregate agents/commands into CLAUDE.md

**Use Case**: Claude Code projects (multi-file agent system)

### New: `aiwg -setup-warp`

**Behavior**:
- Intelligently merges into existing `WARP.md` (single file)
- Aggregates all 58 agents + 42 commands into WARP.md
- Preserves user-specific content
- Adds merge markers for future updates

**Use Case**: Warp Terminal projects (single-file rules system)

---

## Implementation Details

### Phase 1: Create `tools/warp/setup-warp.mjs`

**File**: `tools/warp/setup-warp.mjs`

```javascript
#!/usr/bin/env node
/**
 * Setup Warp - Intelligent WARP.md Merge Tool
 *
 * Merges AIWG SDLC content into existing WARP.md while preserving user content.
 *
 * Usage:
 *   node tools/warp/setup-warp.mjs [options]
 *
 * Options:
 *   --target <path>    Target directory (default: cwd)
 *   --mode <type>      Mode: general, sdlc, or both (default: both)
 *   --dry-run          Preview changes without writing
 *   --force            Overwrite existing WARP.md (discard user content)
 */

import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const cfg = {
    target: process.cwd(),
    mode: 'both',
    dryRun: false,
    force: false
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) cfg.target = path.resolve(args[++i]);
    else if (a === '--mode' && args[i + 1]) cfg.mode = String(args[++i]).toLowerCase();
    else if (a === '--dry-run') cfg.dryRun = true;
    else if (a === '--force') cfg.force = true;
  }
  return cfg;
}

function loadExistingWarpMd(targetDir) {
  const warpMdPath = path.join(targetDir, 'WARP.md');
  if (!fs.existsSync(warpMdPath)) return null;
  return fs.readFileSync(warpMdPath, 'utf8');
}

function generateAIWGContent(mode) {
  // Read AIWG SDLC base template
  const baseTemplate = fs.readFileSync(
    path.join(__dirname, '../../templates/warp/WARP.md.aiwg-base'),
    'utf8'
  );

  // Aggregate agents
  const agentFiles = getAgentFiles(mode);
  let agentContent = '\n\n## SDLC Agents (' + agentFiles.length + ' Specialized Roles)\n\n';
  for (const agentFile of agentFiles) {
    const agentMd = fs.readFileSync(agentFile, 'utf8');
    agentContent += transformAgentToSection(agentMd);
    agentContent += '\n---\n\n';
  }

  // Aggregate commands
  const commandFiles = getCommandFiles(mode);
  let commandContent = '## SDLC Commands (' + commandFiles.length + '+ Workflows)\n\n';
  for (const commandFile of commandFiles) {
    const commandMd = fs.readFileSync(commandFile, 'utf8');
    commandContent += transformCommandToSection(commandMd);
    commandContent += '\n---\n\n';
  }

  return baseTemplate + agentContent + commandContent;
}

function mergeWarpMd(existingWarpMd, aiwgContent, force) {
  if (!existingWarpMd || force) {
    // No existing content or force mode - just return AIWG content
    return aiwgContent;
  }

  // Parse sections
  const existingSections = parseMarkdownSections(existingWarpMd);
  const aiwgSections = parseMarkdownSections(aiwgContent);

  // Filter user sections (not AIWG-managed)
  const userSections = existingSections.filter(s =>
    !isAIWGManagedSection(s.heading)
  );

  // Build merged output
  const output = [];

  // Add header
  output.push('# Project Context\n');

  // User sections first (if any)
  if (userSections.length > 0) {
    output.push('<!-- User-specific content (preserved) -->\n');
    for (const section of userSections) {
      output.push(section.content);
      output.push('\n');
    }
    output.push('\n---\n\n');
  }

  // AIWG sections
  output.push('<!-- AIWG SDLC Framework (auto-updated) -->');
  output.push('<!-- Last updated: ' + new Date().toISOString() + ' -->\n');
  for (const section of aiwgSections) {
    output.push(section.content);
    output.push('\n');
  }

  return output.join('\n');
}

function isAIWGManagedSection(heading) {
  const aiwgSections = [
    'AIWG SDLC Framework',
    'SDLC Agents',
    'SDLC Commands',
    'Platform Compatibility',
    'Core Orchestrator',
    'Natural Language',
    'Multi-Agent',
    'Phase Overview',
    'Intake',
    'Elaboration',
    'Construction',
    'Transition'
  ];

  return aiwgSections.some(section =>
    heading.toLowerCase().includes(section.toLowerCase())
  );
}

function parseMarkdownSections(md) {
  const sections = [];
  const lines = md.split('\n');

  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.match(/^##\s+/)) {
      // New section (## heading)
      if (currentSection) {
        sections.push({
          heading: currentSection,
          content: currentContent.join('\n')
        });
      }
      currentSection = line.replace(/^##\s+/, '');
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentSection) {
    sections.push({
      heading: currentSection,
      content: currentContent.join('\n')
    });
  }

  return sections;
}

function transformAgentToSection(agentMd) {
  // Parse YAML frontmatter
  const fmMatch = agentMd.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return agentMd;

  const frontmatter = fmMatch[1];
  const body = fmMatch[2];

  // Extract name and tools
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1] || 'Unknown Agent';
  const tools = frontmatter.match(/^tools:\s*(.+)$/m)?.[1] || 'Not specified';

  // Format for WARP.md
  return `### ${titleCase(name)}\n\n**Tools**: ${tools}\n\n${body}`;
}

function transformCommandToSection(commandMd) {
  // Extract command name from first heading
  const nameMatch = commandMd.match(/^#\s+(.+)$/m);
  const name = nameMatch ? nameMatch[1] : 'Unknown Command';

  return `### ${name}\n\n${commandMd}`;
}

function getAgentFiles(mode) {
  const repoRoot = path.resolve(__dirname, '../..');
  const files = [];
  if (mode === 'general' || mode === 'both') {
    files.push(...listMdFiles(path.join(repoRoot, 'agents')));
  }
  if (mode === 'sdlc' || mode === 'both') {
    files.push(...listMdFiles(path.join(repoRoot, 'agentic/code/frameworks/sdlc-complete/agents')));
  }
  return files;
}

function getCommandFiles(mode) {
  const repoRoot = path.resolve(__dirname, '../..');
  const files = [];
  if (mode === 'general' || mode === 'both') {
    files.push(...listMdFilesRecursive(path.join(repoRoot, 'commands')));
  }
  if (mode === 'sdlc' || mode === 'both') {
    files.push(...listMdFilesRecursive(path.join(repoRoot, 'agentic/code/frameworks/sdlc-complete/commands')));
  }
  return files;
}

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .filter(e => !['README.md', 'manifest.md'].includes(e.name))
    .map(e => path.join(dir, e.name));
}

function listMdFilesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  function scan(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        if (!['README.md', 'manifest.md'].includes(entry.name)) {
          results.push(fullPath);
        }
      }
    }
  }
  scan(dir);
  return results;
}

function titleCase(str) {
  return str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Main
(function main() {
  const cfg = parseArgs();
  const { target, mode, dryRun, force } = cfg;

  console.log('Warp Setup - Intelligent WARP.md Merge');
  console.log('======================================\n');

  // Check for existing WARP.md
  const existingWarpMd = loadExistingWarpMd(target);
  if (existingWarpMd) {
    console.log('✓ Found existing WARP.md');
    console.log(`  Size: ${existingWarpMd.length} bytes`);
  } else {
    console.log('ℹ No existing WARP.md found (will create new)');
  }

  // Generate AIWG content
  console.log('\nGenerating AIWG SDLC content...');
  const aiwgContent = generateAIWGContent(mode);
  console.log(`✓ Generated AIWG content (${aiwgContent.length} bytes)`);

  // Merge
  console.log('\nMerging content...');
  const mergedContent = mergeWarpMd(existingWarpMd, aiwgContent, force);

  // Write or preview
  const warpMdPath = path.join(target, 'WARP.md');
  if (dryRun) {
    console.log('\n[DRY-RUN] Would write to:', warpMdPath);
    console.log('Preview (first 500 chars):\n');
    console.log(mergedContent.substring(0, 500) + '...\n');
  } else {
    fs.writeFileSync(warpMdPath, mergedContent, 'utf8');
    console.log(`✓ Written to: ${warpMdPath}`);
    console.log(`  Size: ${mergedContent.length} bytes`);
  }

  // Summary
  console.log('\nSummary:');
  if (existingWarpMd && !force) {
    console.log('  - Preserved user-specific content');
    console.log('  - Updated/added AIWG SDLC sections');
  } else {
    console.log('  - Created new WARP.md with AIWG content');
  }

  console.log('\nNext steps:');
  console.log('  1. Review WARP.md in your editor');
  console.log('  2. Run `warp /init` to index your codebase');
  console.log('  3. Use natural language or slash commands in Warp\n');
})();
```

**Effort**: 6-8 hours

### Phase 2: Update install.sh

Add `aiwg -setup-warp` command to CLI:

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
    # ... existing commands ...
  esac
}
```

**Effort**: 1 hour

---

## Usage Examples

### Example 1: New Project (No WARP.md)

```bash
cd ~/my-new-project
aiwg -setup-warp

# Output:
# Warp Setup - Intelligent WARP.md Merge
# ======================================
#
# ℹ No existing WARP.md found (will create new)
#
# Generating AIWG SDLC content...
# ✓ Generated AIWG content (125432 bytes)
#
# Merging content...
# ✓ Written to: /home/user/my-new-project/WARP.md
#   Size: 125432 bytes
#
# Summary:
#   - Created new WARP.md with AIWG content
#
# Next steps:
#   1. Review WARP.md in your editor
#   2. Run `warp /init` to index your codebase
#   3. Use natural language or slash commands in Warp
```

### Example 2: Existing Project (Has WARP.md)

```bash
cd ~/existing-project
aiwg -setup-warp

# Output:
# Warp Setup - Intelligent WARP.md Merge
# ======================================
#
# ✓ Found existing WARP.md
#   Size: 3456 bytes
#
# Generating AIWG SDLC content...
# ✓ Generated AIWG content (125432 bytes)
#
# Merging content...
# ✓ Written to: /home/user/existing-project/WARP.md
#   Size: 128888 bytes
#
# Summary:
#   - Preserved user-specific content
#   - Updated/added AIWG SDLC sections
#
# Next steps:
#   1. Review WARP.md in your editor
#   2. Run `warp /init` to index your codebase
#   3. Use natural language or slash commands in Warp
```

### Example 3: Update Existing AIWG Content

```bash
cd ~/project-with-old-aiwg
aiwg -setup-warp

# Output:
# Warp Setup - Intelligent WARP.md Merge
# ======================================
#
# ✓ Found existing WARP.md
#   Size: 120000 bytes
#
# Generating AIWG SDLC content...
# ✓ Generated AIWG content (125432 bytes)
#
# Merging content...
# ✓ Written to: /home/user/project-with-old-aiwg/WARP.md
#   Size: 125432 bytes
#
# Summary:
#   - Preserved user-specific content
#   - Updated/added AIWG SDLC sections (v1.4.0 → v1.5.0)
#
# AIWG content has been refreshed with latest agents and commands.
```

---

## Revised Timeline

| Task | Effort | Status |
|------|--------|--------|
| Create `setup-warp.mjs` script | 6-8 hours | ⏳ Pending |
| Update `install.sh` CLI | 1 hour | ⏳ Pending |
| Create WARP.md base template | 1 hour | ⏳ Pending |
| Test with new projects | 2 hours | ⏳ Pending |
| Test with existing projects | 2 hours | ⏳ Pending |
| Documentation | 2 hours | ⏳ Pending |
| **TOTAL** | **14-16 hours** | **⏳ Not Started** |

**Previous estimate**: 15-20 hours (aggregation)
**Revised estimate**: 14-16 hours (smart merge)

---

## Benefits of Smart Merge

1. **Preserves User Content**: User rules and project-specific context retained
2. **Idempotent Updates**: Can run `aiwg -setup-warp` multiple times safely
3. **Version Control Friendly**: Clear merge markers show what changed
4. **No Manual Editing**: Automatic detection of AIWG vs user sections
5. **Backward Compatible**: Works with existing WARP.md files

---

## Success Criteria

- [ ] `aiwg -setup-warp` creates new WARP.md (no existing file)
- [ ] `aiwg -setup-warp` merges into existing WARP.md (preserves user content)
- [ ] `aiwg -setup-warp --force` overwrites existing WARP.md
- [ ] `aiwg -setup-warp --dry-run` previews changes without writing
- [ ] User sections detected and preserved correctly
- [ ] AIWG sections replaced on updates
- [ ] Merge markers added for transparency
- [ ] Works with WARP terminal `/init` command

---

## Document Status

**Status**: ✅ READY FOR IMPLEMENTATION
**Next Action**: Create `tools/warp/setup-warp.mjs`
**Estimated Effort**: 14-16 hours (1.5-2 days)
