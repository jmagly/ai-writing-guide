# Skill Seekers Integration Plan

## Executive Summary

Integrate capabilities from [Skill_Seekers](https://github.com/jmagly/Skill_Seekers.git) into AIWG as cross-platform skills and addons. The goal is to provide documentation-to-skill conversion capabilities that work across Claude Code, Factory AI, and other platforms.

## Research Paper Compliance

All skills and extensions MUST conform to principles established in:

- **REF-001**: Production-Grade Agentic AI Workflows (Bandara et al., 2025)
- **REF-002**: LLM Failure Modes in Agentic Scenarios (Roig, 2025)

### Required Design Principles

| Principle | Source | Application |
|-----------|--------|-------------|
| **BP-1: Direct Tool Calls** | REF-001 | Skills invoke tools directly, not via MCP abstraction |
| **BP-2: Pure Functions for Deterministic Ops** | REF-001 | File commits, timestamps, API posts bypass agents |
| **BP-3: One Agent, One Tool** | REF-001 | Each agent has focused, minimal tool set |
| **BP-4: Single Responsibility** | REF-001 | Each skill/agent handles ONE clearly defined task |
| **BP-5: Externalized Prompts** | REF-001 | All definitions in version-controlled markdown |
| **BP-9: KISS** | REF-001 | Flat structure, minimal complexity |
| **Grounding Checkpoint** | REF-002 Archetype 1 | Verify data before action - inspect schemas/files |
| **Escalate Uncertainty** | REF-002 Archetype 2 | Ask user rather than guess missing data |
| **Context Filtering** | REF-002 Archetype 3 | Score context relevance, exclude distractors |
| **Structured Recovery** | REF-002 Archetype 4 | PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE protocol |

### Failure Archetype Mitigations

Each skill MUST include mitigation for the four failure archetypes:

1. **Premature Action Without Grounding**
   - Skills MUST inspect target schemas before transformation
   - Include explicit "verification step" in workflow

2. **Over-Helpfulness Under Uncertainty**
   - Skills MUST NOT substitute missing data with plausibles
   - Include explicit "ask user" escalation points

3. **Distractor-Induced Context Pollution**
   - Skills MUST scope context to relevant sections only
   - Include relevance scoring for inputs

4. **Fragile Execution Under Load**
   - Skills MUST decompose into subtasks ≤7 items
   - Include checkpoint/resume capability

## Source Analysis

### Skill Seekers Core Capabilities

| Capability | Description | AIWG Integration |
|------------|-------------|------------------|
| **Documentation Scraping** | Scrape any docs site, auto-categorize | New addon: `doc-intelligence` |
| **PDF Extraction** | Extract text, tables, images, OCR | New skill: `pdf-extractor` |
| **GitHub Analysis** | Deep code analysis, AST parsing | Extend SDLC: `code-analyzer` |
| **Unified Scraping** | Multi-source merge with conflict detection | New skill: `source-unifier` |
| **llms.txt Detection** | Auto-detect LLM-ready documentation | New skill: `llms-txt-support` |
| **Skill Enhancement** | AI-powered skill improvement | New skill: `skill-enhancer` |
| **Large Doc Handling** | Split strategies, router skills | New skill: `doc-splitter` |
| **Config Generation** | Interactive config creation | Integrate into CLI |
| **Quality Checking** | Validate skill quality | Extend: `claims-validator` |

### Platform-Specific Features (Python)

These require Python runtime and are best as **language-specific extensions**:

| Feature | Dependency | Extension Type |
|---------|------------|----------------|
| AST Parsing | Python stdlib | SDLC extension: `python-analyzer` |
| BeautifulSoup scraping | beautifulsoup4 | Runtime dependency |
| PDF parsing | pypdf, pdfplumber | Runtime dependency |
| OCR | pytesseract | Optional dependency |
| Async scraping | asyncio | Core Python |

## Proposed Architecture

### New Addons

```
agentic/code/addons/
├── doc-intelligence/           # NEW - Documentation intelligence
│   ├── addon.json
│   ├── skills/
│   │   ├── doc-scraper/SKILL.md        # Web documentation scraping
│   │   ├── pdf-extractor/SKILL.md      # PDF extraction
│   │   ├── llms-txt-support/SKILL.md   # llms.txt detection/parsing
│   │   ├── source-unifier/SKILL.md     # Multi-source merging
│   │   └── doc-splitter/SKILL.md       # Large doc splitting
│   ├── agents/
│   │   └── doc-analyst.md              # Documentation analysis agent
│   └── templates/
│       ├── scraper-config.json         # Config template
│       └── skill-template/             # Output structure
│
├── skill-factory/              # NEW - Skill generation
│   ├── addon.json
│   ├── skills/
│   │   ├── skill-builder/SKILL.md      # Build skills from sources
│   │   ├── skill-enhancer/SKILL.md     # AI enhancement
│   │   ├── skill-packager/SKILL.md     # Package for upload
│   │   └── quality-checker/SKILL.md    # Validate quality
│   └── agents/
│       └── skill-architect.md          # Skill design agent
```

### SDLC Framework Extensions

```
agentic/code/frameworks/sdlc-complete/
├── extensions/                 # NEW - Language/platform extensions
│   ├── python/
│   │   ├── extension.json
│   │   ├── skills/
│   │   │   ├── ast-analyzer/SKILL.md     # Python AST analysis
│   │   │   ├── api-extractor/SKILL.md    # Extract API signatures
│   │   │   └── conflict-detector/SKILL.md # Docs vs code conflicts
│   │   └── agents/
│   │       └── python-analyst.md
│   │
│   ├── javascript/
│   │   ├── extension.json
│   │   └── skills/
│   │       ├── ast-analyzer/SKILL.md     # JS/TS AST analysis
│   │       └── api-extractor/SKILL.md
│   │
│   └── github/
│       ├── extension.json
│       └── skills/
│           ├── repo-analyzer/SKILL.md    # Repository analysis
│           ├── issue-extractor/SKILL.md  # GitHub issues/PRs
│           └── changelog-parser/SKILL.md # Release notes
```

## Implementation Phases

### Phase 1: Core Documentation Skills (Week 1-2)

**Priority: P0 - HIGH**

1. Create `doc-intelligence` addon structure
2. Implement cross-platform skills:
   - `doc-scraper` - Basic documentation scraping guidance
   - `pdf-extractor` - PDF extraction workflow
   - `llms-txt-support` - llms.txt detection and usage
3. Create `doc-analyst` agent for orchestration

**Deliverables:**
- New addon with 3 skills
- Works on Claude Code + Factory AI
- No Python dependencies (skill provides guidance, user runs Python tools)

### Phase 2: Skill Factory Addon (Week 2-3)

**Priority: P1 - MEDIUM**

1. Create `skill-factory` addon
2. Implement skills:
   - `skill-builder` - Orchestrate skill creation workflow
   - `skill-enhancer` - AI-powered skill improvement
   - `quality-checker` - Validate skill completeness
3. Integrate with AIWG template system

**Deliverables:**
- Skills for building Claude skills
- Integration with `template-engine` skill
- Quality validation rules

### Phase 3: SDLC Extensions (Week 3-4)

**Priority: P1 - MEDIUM**

1. Create extension framework structure
2. Implement Python extension:
   - `ast-analyzer` - Code structure analysis
   - `api-extractor` - Extract function/class signatures
   - `conflict-detector` - Find docs vs code discrepancies
3. Implement GitHub extension:
   - `repo-analyzer` - Repository structure and metadata
   - `issue-extractor` - GitHub issues and PRs

**Deliverables:**
- Extension framework for language-specific capabilities
- Python and GitHub extensions
- `aiwg -deploy-extensions` command

### Phase 4: CLI and MCP Integration (Week 4-5)

**Priority: P2 - FUTURE**

1. Add Skill Seekers as optional dependency
2. Create unified CLI commands:
   - `aiwg skill scrape <url>` - Scrape documentation
   - `aiwg skill github <repo>` - Analyze GitHub repo
   - `aiwg skill build <output>` - Build skill package
3. MCP tools for skill generation

**Deliverables:**
- CLI integration with Skill Seekers
- MCP tools for skill operations
- Python venv management for dependencies

## Cross-Platform Skill Design

### Principle: Skills as Orchestration Guides

Since Skill Seekers is Python-based and AIWG skills need to work across platforms, skills should:

1. **Describe the workflow** - What steps to take
2. **Provide configuration templates** - JSON configs, selectors
3. **Guide tool usage** - When to use which Python tool
4. **Handle output** - How to process results

### Example: doc-scraper Skill

```markdown
---
name: doc-scraper
description: Scrape documentation websites into organized reference files
---

# Documentation Scraper Skill

## When to Use
- Converting documentation websites into searchable references
- Building Claude skills from documentation
- Creating offline documentation archives

## Prerequisites
- Python 3.10+ with: requests, beautifulsoup4
- OR: Skill Seekers installed (`pip install skill-seekers`)

## Workflow

### Step 1: Analyze Documentation Structure
[Guidance on identifying selectors, URL patterns]

### Step 2: Create Configuration
[Template and examples]

### Step 3: Execute Scraping
[Commands for different scenarios]

### Step 4: Process Output
[How to organize and enhance results]

## Configuration Templates
[JSON templates with comments]

## Troubleshooting
[Common issues and solutions]
```

## Integration with Existing AIWG Skills

| Existing Skill | Integration Point |
|----------------|-------------------|
| `template-engine` | Render skill templates |
| `config-validator` | Validate scraper configs |
| `project-awareness` | Detect existing skills/docs |
| `artifact-orchestration` | Coordinate multi-source scraping |
| `claims-validator` | Validate skill content quality |

## CLI Commands

```bash
# Documentation scraping
aiwg skill scrape --url https://docs.example.com --name myskill
aiwg skill scrape --config scraper-config.json

# GitHub analysis
aiwg skill github --repo owner/repo --name myskill

# PDF extraction
aiwg skill pdf --file manual.pdf --name myskill

# Unified multi-source
aiwg skill unified --config unified-config.json

# Build and package
aiwg skill build output/myskill/
aiwg skill package output/myskill/

# Quality check
aiwg skill validate output/myskill/
```

## Dependencies Strategy

### Core (No Additional Dependencies)
- Skills provide guidance and templates
- User runs Python tools separately
- Works on any platform

### Optional (With skill-seekers Package)
```bash
pip install skill-seekers  # Enables full CLI integration
aiwg skill scrape --url ...  # Runs skill-seekers internally
```

### MCP Integration
- AIWG MCP server exposes skill tools
- Skill Seekers MCP server can run alongside
- Tools coordinate via file system (output directories)

## Success Criteria

1. **Cross-Platform**: Skills work on Claude Code + Factory AI
2. **No Hard Dependencies**: Core skills don't require Python packages
3. **Progressive Enhancement**: Optional integration with skill-seekers
4. **SDLC Integration**: Extensions fit into existing framework
5. **Quality**: Skills follow AIWG voice and documentation standards
6. **REF-001 Compliance**: All nine best practices addressed
7. **REF-002 Compliance**: All four failure archetypes mitigated

## Skill Template (Research-Compliant)

All skills MUST follow this template structure:

```markdown
---
name: skill-name
description: Single-responsibility description (BP-4)
tools: [Minimal focused tool set] (BP-3)
---

# Skill Name

## Purpose
Single, clearly defined task this skill handles (BP-4)

## Grounding Checkpoint (Archetype 1 Mitigation)
Before executing, the skill MUST verify:
- [ ] Target file/schema exists
- [ ] Input format matches expected structure
- [ ] Required context is available

## Uncertainty Escalation (Archetype 2 Mitigation)
If ANY of these are unclear, ASK USER instead of guessing:
- Missing required fields
- Ambiguous input format
- Multiple valid interpretations

## Context Scope (Archetype 3 Mitigation)
| Context Type | Included | Excluded |
|--------------|----------|----------|
| RELEVANT | [specific items] | |
| PERIPHERAL | | [edge cases only] |
| DISTRACTOR | | [explicitly excluded] |

## Workflow Steps
1. **Verify** - Grounding checkpoint
2. **Scope** - Filter context
3. **Execute** - Core operation (≤7 subtasks per BP-9)
4. **Validate** - Check output

## Recovery Protocol (Archetype 4 Mitigation)
On error:
1. PAUSE - Preserve state
2. DIAGNOSE - Analyze error type
3. ADAPT - Choose recovery strategy
4. RETRY - Max 3 attempts
5. ESCALATE - Ask user for guidance

## Checkpoint Support
State saved to: `.aiwg/working/checkpoints/{skill-name}/`
Resume with: [resume instructions]
```

## Open Questions

1. **Skill Seekers as Submodule?** - Should we include it as a git submodule or just document integration?
2. **Python Runtime Management** - How to handle venv for users without Python experience?
3. **Factory AI MCP** - Does Factory support multiple MCP servers? Can we coordinate?
4. **Extension Deployment** - How to deploy language-specific extensions selectively?

## References

- Skill Seekers: https://github.com/jmagly/Skill_Seekers
- AIWG Addon Structure: `agentic/code/addons/`
- AIWG Skills: `agentic/code/addons/*/skills/`
- Factory Skills: `.factory/skills/`
