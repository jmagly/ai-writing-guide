# Claude Code Skills Research Report

**Research Date**: 2025-12-06
**Researcher**: Technical Research Agent
**Status**: LOCAL ANALYSIS ONLY (Web access unavailable)

## Executive Summary

This report documents findings about Claude Code's "skills" feature based on local filesystem analysis and provides a structured manual research guide. Web-based research could not be completed due to tool restrictions (WebFetch explicitly denied in project settings).

**Key Finding**: No direct evidence of a "skills" feature was found in the local Claude Code installation or AIWG repository. The Claude Code ecosystem appears to use **agents** and **commands** as its primary extensibility mechanisms.

---

## Local Analysis Findings

### 1. Claude Code Directory Structure

**Global Claude Directory**: `/home/manitcor/.claude/`

```
.claude/
├── CLAUDE.md               # User global instructions
├── agents/                 # Global agent definitions
├── plugins/                # Plugin system (repos subdirectory)
│   ├── config.json
│   └── repos/
├── projects/               # Project-specific data
├── session-env/            # Session state
├── plans/                  # Saved plans
├── todos/                  # Todo tracking
├── history.jsonl           # Command history
└── settings.json           # Global settings
```

**Project-Local Claude Directory**: `.claude/` in each project

```
.claude/
├── README.md
├── settings.json           # Project-specific settings
├── settings.local.json     # Local permissions and tool access
├── agents/                 # Project-specific agents
├── commands/               # Slash commands
└── manifest.json           # Directory metadata
```

### 2. Extensibility Mechanisms Found

Claude Code uses these confirmed extensibility patterns:

#### A. Agents (`.claude/agents/*.md`)

**Location**:
- Global: `/home/manitcor/.claude/agents/`
- Project: `.claude/agents/`

**Format**: Markdown files with frontmatter

**Example Found**: `/home/manitcor/.claude/agents/unamusing-limerick-generator.md`

**Purpose**: Specialized subagents that can be invoked via Task tool or natural language

**Characteristics**:
- Markdown format with structured frontmatter
- Isolated context and instructions
- Can be deployed per-project or globally
- Invoked via Task tool in multi-agent workflows

#### B. Commands (`.claude/commands/*.md`)

**Location**: `.claude/commands/`

**Format**: Markdown files defining slash commands

**Examples Found**:
- `flow-team-onboarding.md`
- `flow-knowledge-transfer.md`
- `project-timeline-simulator.md`
- `flow-risk-management-cycle.md`
- `intake-wizard.md`

**Purpose**: Predefined workflows invocable via `/command-name` syntax

**Characteristics**:
- Slash command interface
- Orchestration templates for multi-step workflows
- Can accept parameters
- Markdown-based definition

#### C. Plugins (`/home/manitcor/.claude/plugins/`)

**Location**: `/home/manitcor/.claude/plugins/repos/`

**Format**: Directory-based with `config.json`

**Status**: Directory exists but appears unused in current installation

**Speculation**: May be for external repository integrations

### 3. No Evidence of "Skills" Feature

**Search Results**:
- No `.claude/skills/` directory found (global or project-local)
- No `skill.json` or `skill.md` files found
- No references to "skills" in Claude Code configuration files
- grep search for "skill" in `.claude/` returned only contextual usage (team skills, skill gaps, etc.)

**Hypothesis**: "Skills" may be:
1. A planned but unimplemented feature
2. An alternative name for "agents" or "commands"
3. A feature in beta/experimental status not yet deployed
4. A misunderstanding or confusion with other AI platforms

---

## Manual Web Research Guide

### Research Objectives

**Primary Questions**:
1. Does Claude Code have a "skills" feature distinct from agents/commands?
2. If yes, what is the file format and structure?
3. How do skills differ from agents and commands?
4. Are skills user-definable or Anthropic-provided only?
5. What is the skill manifest format?

### Recommended Search Queries

Execute these searches on Google, DuckDuckGo, or search engines of choice:

#### Core Feature Searches
```
"Claude Code skills"
"Claude Code skills feature"
"Claude Code skills documentation"
"Anthropic Claude Code skills"
"Claude Code extensibility skills"
```

#### Technical Documentation Searches
```
"Claude Code skill manifest"
"Claude Code skill.json"
"Claude Code .skill file"
"Claude Code skills directory"
site:docs.anthropic.com "Claude Code skills"
```

#### GitHub/Repository Searches
```
site:github.com "Claude Code skills"
site:github.com/anthropics "skills"
"claude-code skills" filetype:md
"claude-code skills" filetype:json
```

#### Community and Discussion Searches
```
site:reddit.com "Claude Code skills"
site:news.ycombinator.com "Claude Code skills"
site:twitter.com "Claude Code skills"
"Claude Code" discord skills
```

### High-Priority Sources to Check

#### Official Anthropic Documentation
- [ ] https://docs.anthropic.com/claude-code
- [ ] https://docs.anthropic.com/claude-code/reference
- [ ] https://docs.anthropic.com/claude-code/getting-started
- [ ] https://docs.anthropic.com/claude-code/extensibility
- [ ] https://www.anthropic.com/blog (search for Claude Code announcements)

#### GitHub Repositories
- [ ] https://github.com/anthropics (check all repositories)
- [ ] https://github.com/anthropics/claude-code (if exists)
- [ ] https://github.com/anthropics/claude-code-examples (if exists)
- [ ] Search GitHub for public repos with `.claude/skills/` directories

#### Community Resources
- [ ] Claude Code Discord server (if exists)
- [ ] Anthropic community forums
- [ ] Reddit r/anthropic or r/ClaudeAI
- [ ] Hacker News discussions about Claude Code
- [ ] Dev.to or Medium articles about Claude Code extensibility

### Data Collection Template

For each source found, record:

```markdown
## Source: [Title]

**URL**: [Full URL]
**Date**: [Publication/last updated date]
**Type**: [Official docs | Blog post | Community discussion | Code example]
**Relevance**: [High | Medium | Low]

### Key Findings

[Bullet points of relevant information]

### Direct Quotes

> [Exact quotes with context]

### Code Examples

```[language]
[Code snippets showing skills usage]
```

### Questions Raised

[New questions based on this source]

### Confidence Level

[How reliable is this source: Official | Verified | Community | Speculation]
```

---

## Comparative Analysis: Agents vs Commands vs (Skills?)

Based on local analysis, here's what we know:

### Agents (`.claude/agents/*.md`)

**Confirmed Characteristics**:
- Markdown format with frontmatter
- Specialized role-based context
- Invoked via Task tool or natural language
- Isolated execution context
- Can be deployed globally or per-project
- Used for multi-agent orchestration patterns

**Example Structure** (inferred from AIWG agents):
```markdown
---
name: agent-name
description: Brief description
model: claude-sonnet-4-5-20250929
---

# Agent Role

[Instructions and context]

## Your Process

[Detailed workflow]
```

### Commands (`.claude/commands/*.md`)

**Confirmed Characteristics**:
- Markdown format
- Slash command interface (`/command-name`)
- Orchestration templates for workflows
- Can accept parameters
- Project-specific (not global)
- Used for predefined workflows

**Example Structure** (from actual commands):
```markdown
# Command Name

Description of what this command does.

## Usage

/command-name [param1] [param2] --flag

## Parameters

- param1: Description
- param2: Description

## Workflow

[Step-by-step orchestration instructions]
```

### Skills (Hypothetical)

**Unknown - Requires Web Research**:
- File format: Unknown
- Storage location: Unknown
- Invocation method: Unknown
- Scope (global vs project): Unknown
- Relationship to agents/commands: Unknown

**Possible Differentiators** (speculation):
- More granular than agents (specific capabilities vs full roles)
- Composable building blocks for agents
- Anthropic-provided vs user-defined
- Different execution model (inline vs isolated)
- Registry or marketplace integration

---

## Next Steps for Complete Research

### Phase 1: Web Documentation Review (Manual)

**Time Estimate**: 2-4 hours

1. Search official Anthropic documentation for "skills"
2. Review Claude Code release notes and changelogs
3. Check Anthropic blog for feature announcements
4. Document all findings using collection template

### Phase 2: Community Investigation (Manual)

**Time Estimate**: 1-2 hours

1. Search GitHub for public `.claude/skills/` examples
2. Check community forums and discussions
3. Review third-party tutorials and guides
4. Identify early adopters or beta testers

### Phase 3: Experimental Validation (If Feature Exists)

**Time Estimate**: 2-3 hours

1. Create test skill definition based on findings
2. Test invocation methods
3. Compare behavior to agents and commands
4. Document differences and use cases

### Phase 4: Integration Recommendations

**Time Estimate**: 1-2 hours

1. Determine if AIWG should adopt skills
2. Identify migration path from agents/commands if beneficial
3. Propose skill definitions for AIWG framework
4. Update deployment tooling if needed

---

## Hypotheses to Test

### Hypothesis 1: Skills = Agents (Naming Variation)

**Likelihood**: Medium

**Evidence For**:
- No distinct skills directory found
- Agents fulfill similar conceptual role

**Evidence Against**:
- Distinct naming suggests distinct purpose
- Anthropic typically uses precise terminology

**Test**: Search for any Anthropic documentation using "skills" and "agents" interchangeably

### Hypothesis 2: Skills = Fine-Grained Capabilities

**Likelihood**: Medium-High

**Concept**: Skills are smaller, composable units that agents can leverage

**Example**:
- Agent: "code-reviewer" (uses skills: "linting", "security-scanning", "style-checking")
- Agent: "deployment-engineer" (uses skills: "docker-build", "k8s-deploy", "health-check")

**Test**: Look for skill registry or capability composition patterns in documentation

### Hypothesis 3: Skills = Beta/Unreleased Feature

**Likelihood**: Medium

**Evidence For**:
- No local evidence despite comprehensive search
- Plugins directory exists but appears unused

**Evidence Against**:
- User asked about it (suggests awareness from somewhere)

**Test**: Search for beta program announcements or experimental feature flags

### Hypothesis 4: Skills = Third-Party Ecosystem

**Likelihood**: Low-Medium

**Concept**: Skills are community-contributed capabilities, possibly via plugin system

**Test**: Search for Claude Code marketplace, skill registry, or community skill repositories

---

## Comparison to Other AI Platforms

For context, here's how other platforms handle similar concepts:

### GitHub Copilot

**Skills**: No explicit "skills" feature
**Extensibility**: Extensions, custom instructions
**Format**: JSON configuration + code

### Cursor

**Skills**: No explicit "skills" feature
**Extensibility**: Rules, custom commands, AI modes
**Format**: Markdown rules in `.cursorrules`

### Cody (Sourcegraph)

**Skills**: No explicit "skills" feature
**Extensibility**: Custom commands, prompts
**Format**: JSON configuration

### Aider

**Skills**: No explicit "skills" feature
**Extensibility**: Custom prompts, architect mode
**Format**: Command-line flags

### Supermaven

**Skills**: No explicit "skills" feature
**Extensibility**: Project context, custom rules
**Format**: Configuration files

**Observation**: "Skills" is not a common term in AI coding assistant platforms. If Claude Code has this feature, it would be relatively unique.

---

## Technical Specifications to Investigate

If skills exist, document these details:

### File Format
- [ ] Extension: `.skill`, `.skill.md`, `.skill.json`, other?
- [ ] Syntax: YAML, JSON, Markdown, custom?
- [ ] Frontmatter: Required fields?
- [ ] Versioning: Schema version tracking?

### Storage and Scope
- [ ] Global location: `/home/user/.claude/skills/`?
- [ ] Project location: `.claude/skills/`?
- [ ] Plugin integration: Loaded via plugins system?
- [ ] Remote registry: Can skills be fetched from Anthropic servers?

### Invocation
- [ ] Direct invocation: `/skill-name` syntax?
- [ ] Implicit invocation: Auto-applied based on context?
- [ ] Agent composition: Do agents reference skills?
- [ ] Parameter passing: How are arguments provided?

### Manifest Structure
```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "description": "What this skill does",
  "author": "author-name",
  "tags": ["category", "type"],
  "requirements": {
    "tools": ["Bash", "Read"],
    "permissions": ["Write(./**)"]
  },
  "parameters": [
    {
      "name": "param1",
      "type": "string",
      "required": true,
      "description": "Parameter description"
    }
  ],
  "entry": "skill-logic.md"
}
```

### Execution Model
- [ ] Isolated context: Like agents?
- [ ] Inline execution: Like commands?
- [ ] Async/parallel: Can multiple skills run concurrently?
- [ ] State management: Do skills maintain state?
- [ ] Return values: How do skills communicate results?

---

## Documentation Checklist

Once web research is complete, ensure these are documented:

### Feature Overview
- [ ] What are Claude Code skills?
- [ ] When was the feature introduced?
- [ ] Is it GA, beta, or experimental?
- [ ] What problem does it solve?

### Technical Details
- [ ] File format and syntax
- [ ] Storage locations (global/project)
- [ ] Invocation methods
- [ ] Manifest structure
- [ ] Permission model

### Comparison
- [ ] How do skills differ from agents?
- [ ] How do skills differ from commands?
- [ ] When to use each mechanism?
- [ ] Can they be combined?

### Examples
- [ ] Official example skills from Anthropic
- [ ] Community-created skills
- [ ] Best practices and patterns
- [ ] Anti-patterns to avoid

### Integration
- [ ] How to install skills
- [ ] How to create custom skills
- [ ] How to distribute skills
- [ ] How to version skills

### Limitations
- [ ] What can't skills do?
- [ ] Performance considerations
- [ ] Security restrictions
- [ ] Compatibility requirements

---

## Sources to Cite (Post Web Research)

Document all sources in this format:

```markdown
1. [Source Title](URL)
   - Type: Official Documentation | Blog | Community
   - Date: YYYY-MM-DD
   - Key Finding: [One sentence summary]
   - Relevance: High | Medium | Low

2. [Source Title](URL)
   - Type: ...
   - Date: ...
   - Key Finding: ...
   - Relevance: ...
```

---

## Preliminary Conclusions (Based on Local Analysis Only)

### Confirmed Facts

1. **Claude Code uses agents and commands**: These are well-established extensibility mechanisms in the current installation
2. **No local evidence of skills**: Comprehensive filesystem search found no skills-related directories or files
3. **Plugin system exists**: There is a plugin infrastructure but it appears unused
4. **Markdown-based configuration**: Both agents and commands use markdown format

### Open Questions

1. **Does "skills" exist as a distinct feature?**
   - No local evidence, requires web research to confirm

2. **Is "skills" terminology used in official documentation?**
   - Cannot determine without web access

3. **If skills exist, what is their relationship to agents/commands?**
   - Unknown, requires documentation review

4. **Are there any public examples of skills in use?**
   - Cannot determine without GitHub/community search

### Recommendations for AIWG Project

**Current State**: AIWG uses agents and commands extensively
- 58 SDLC agents deployed
- 42+ workflow commands
- Well-established deployment tooling

**If Skills Exist**:
1. Evaluate whether skills provide value beyond current agent/command architecture
2. Consider migration path if skills offer superior capabilities
3. Update deployment tooling to support skills
4. Document skills in framework alongside agents/commands

**If Skills Don't Exist**:
1. Continue with current agent/command architecture
2. Consider proposing "skills" concept to Anthropic as feature request
3. Document our own "skill" concept as AIWG extension

---

## Research Metadata

**Local Analysis Completed**: 2025-12-06
**Web Research Status**: NOT STARTED (requires manual execution)
**Confidence Level**: Low (local analysis only, no authoritative sources)
**Researcher Notes**:
- WebFetch tool explicitly denied in project settings
- Cannot access external documentation or repositories
- Report based entirely on filesystem analysis
- Manual web research required for authoritative answers

**Next Action Required**: User must manually execute web searches using queries and templates provided above.

---

## Appendix A: Local File References

### Agents Found
- `/home/manitcor/.claude/agents/unamusing-limerick-generator.md`
- `/home/manitcor/dev/ai-writing-guide/.claude/agents/` (58 SDLC agents)

### Commands Found
- `/home/manitcor/dev/ai-writing-guide/.claude/commands/flow-*.md` (42+ commands)
- Examples: `intake-wizard.md`, `flow-team-onboarding.md`, `project-timeline-simulator.md`

### Configuration Files
- `/home/manitcor/.claude/settings.json` (global settings)
- `/home/manitcor/.claude/CLAUDE.md` (global user instructions)
- `/home/manitcor/dev/ai-writing-guide/.claude/settings.json` (project settings)
- `/home/manitcor/dev/ai-writing-guide/.claude/settings.local.json` (project permissions)

### Directories Examined
- `/home/manitcor/.claude/` (global Claude directory)
- `/home/manitcor/.claude/plugins/` (plugin system)
- `/home/manitcor/dev/ai-writing-guide/.claude/` (project Claude directory)
- `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/` (AIWG framework)

---

## Appendix B: Search Commands for Future Reference

```bash
# Search for skill references in entire AIWG project
grep -r "skill" /home/manitcor/dev/ai-writing-guide --exclude-dir=node_modules --exclude-dir=.git

# Find all .claude directories
find /home/manitcor -name ".claude" -type d 2>/dev/null

# List all agent files
find /home/manitcor -path "*/.claude/agents/*.md" 2>/dev/null

# List all command files
find /home/manitcor -path "*/.claude/commands/*.md" 2>/dev/null

# Check for skills directory
find /home/manitcor -path "*/.claude/skills" -type d 2>/dev/null
```

---

## Appendix C: Contact for Web Research Assistance

If you have access to web browsing and can complete this research:

**Needed**:
1. Execute search queries listed in "Recommended Search Queries" section
2. Visit sources listed in "High-Priority Sources to Check" section
3. Document findings using "Data Collection Template"
4. Update hypotheses with evidence found
5. Fill in "Technical Specifications to Investigate" checklist
6. Provide source citations in "Sources to Cite" section

**Deliverable**: Updated version of this document with web research findings integrated

---

**Report Status**: INCOMPLETE - Requires manual web research to validate findings
**Last Updated**: 2025-12-06
**Next Review**: After web research completion
