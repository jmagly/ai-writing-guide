---
name: skill-builder
description: Build Claude skills from extracted documentation. Use after doc-scraper/pdf-extractor to generate uploadable skill packages.
tools: Read, Write, Bash, Glob
---

# Skill Builder Skill

## Purpose

Single responsibility: Transform extracted documentation into properly structured Claude skill packages ready for upload. (BP-4)

## Grounding Checkpoint (Archetype 1 Mitigation)

Before executing, VERIFY:

- [ ] Input data directory exists and contains extracted content
- [ ] Content format is recognized (JSON pages, markdown, etc.)
- [ ] Output directory is writable
- [ ] Skill name follows Claude conventions (lowercase, alphanumeric, hyphens)

**DO NOT build without verifying input data quality.**

## Uncertainty Escalation (Archetype 2 Mitigation)

ASK USER instead of guessing when:

- Multiple input formats detected - which to prioritize?
- Category structure unclear from content
- Skill description ambiguous
- Target audience undefined

**NEVER generate placeholder content without user guidance.**

## Context Scope (Archetype 3 Mitigation)

| Context Type | Included | Excluded |
|--------------|----------|----------|
| RELEVANT | Input data, skill config, output path | Other skills |
| PERIPHERAL | Similar skill examples | Unrelated documentation |
| DISTRACTOR | Previous build attempts | Source scraping details |

## Workflow Steps

### Step 1: Validate Input (Grounding)

```bash
# Check input data exists
ls -la output/<skill-name>_data/

# Verify page count
find output/<skill-name>_data/pages -name "*.json" | wc -l

# Check summary
cat output/<skill-name>_data/summary.json
```

### Step 2: Generate Skill Structure

Standard Claude skill structure:

```
output/<skill-name>/
├── SKILL.md              # Main skill file (required)
├── references/           # Reference documentation
│   ├── index.md          # Category index
│   ├── getting_started.md
│   ├── api_reference.md
│   └── guides.md
├── scripts/              # Optional automation scripts
└── assets/               # Optional images, diagrams
```

### Step 3: Create SKILL.md

Template for SKILL.md:

```markdown
# <Skill Name>

## Description
<When to use this skill - clear, specific>

## Key Features
- Feature 1
- Feature 2
- Feature 3

## Quick Reference

### Common Patterns
<Most frequently used patterns with code examples>

### API Overview
<Key API methods/functions>

## Navigation

| Topic | File | Description |
|-------|------|-------------|
| Getting Started | references/getting_started.md | Installation and setup |
| API Reference | references/api_reference.md | Complete API documentation |
| Guides | references/guides.md | How-to guides and tutorials |

## Code Examples

<3-5 practical code examples from documentation>

## Common Questions

<FAQ section based on documentation>

## Version Information

- Documentation version: <version>
- Last updated: <date>
- Source: <url>
```

### Step 4: Generate Reference Files

Categorize extracted content:

```python
# Categories and their keywords
categories = {
    "getting_started": ["intro", "install", "setup", "quickstart"],
    "api_reference": ["api", "reference", "method", "function", "class"],
    "guides": ["guide", "tutorial", "how-to", "example"],
    "concepts": ["concept", "overview", "architecture"],
    "advanced": ["advanced", "internals", "extend", "customize"]
}
```

### Step 5: Validate Output

```bash
# Check required files exist
test -f output/<skill-name>/SKILL.md || echo "Missing SKILL.md"
test -d output/<skill-name>/references || echo "Missing references/"

# Verify SKILL.md structure
grep "^# " output/<skill-name>/SKILL.md
grep "^## " output/<skill-name>/SKILL.md

# Check reference files
ls -la output/<skill-name>/references/
```

## Recovery Protocol (Archetype 4 Mitigation)

On error:

1. **PAUSE** - Preserve partial build
2. **DIAGNOSE** - Check error type:
   - `Missing input data` → Re-run extraction
   - `Invalid content format` → Check parser compatibility
   - `Categorization failed` → Manual category mapping
   - `Template error` → Check SKILL.md syntax
3. **ADAPT** - Adjust build configuration
4. **RETRY** - Rebuild affected sections (max 3 attempts)
5. **ESCALATE** - Present partial build, ask for guidance

## Checkpoint Support

State saved to: `.aiwg/working/checkpoints/skill-builder/`

```
checkpoints/skill-builder/
├── build_config.json       # Build configuration
├── categorization.json     # Category assignments
├── skill_md_draft.md       # SKILL.md draft
└── progress.json           # Build progress
```

## Quality Criteria

| Criterion | Requirement | Validation |
|-----------|-------------|------------|
| SKILL.md present | Required | File exists check |
| Description clear | Required | Non-empty, specific |
| References organized | Required | At least 2 categories |
| Code examples | Recommended | 3+ examples in SKILL.md |
| Navigation table | Recommended | Links to all references |

## Output Validation

Run quality check after build:

```bash
# Use quality-checker skill
# Or manual validation:

# 1. SKILL.md structure
grep -E "^#{1,2} " output/<skill-name>/SKILL.md

# 2. Code examples present
grep -c '```' output/<skill-name>/SKILL.md

# 3. References populated
for f in output/<skill-name>/references/*.md; do
  echo "$f: $(wc -l < $f) lines"
done

# 4. No broken links
grep -oE '\[.*\]\(.*\)' output/<skill-name>/SKILL.md | head -10
```

## Configuration Options

```json
{
  "name": "myskill",
  "description": "When to use this skill",
  "input_dir": "output/myskill_data/",
  "output_dir": "output/myskill/",
  "template": "standard",
  "options": {
    "extract_examples": true,
    "max_examples": 10,
    "generate_faq": true,
    "include_navigation": true,
    "min_category_pages": 5
  }
}
```

## Templates

### Standard Template
Full-featured skill with all sections.

### Minimal Template
Just SKILL.md and one reference file.

### API Reference Template
Optimized for API documentation.

### Tutorial Template
Optimized for learning content.

## Troubleshooting

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Missing input data | Data directory not found | Run doc-scraper or pdf-extractor first |
| Empty SKILL.md | Template failed | Check input format, verify JSON structure |
| No categories | Keywords not matched | Provide custom category mapping |
| Build hangs | Large dataset | Use doc-splitter first for 10K+ pages |
| Invalid structure | Wrong template | Verify template compatibility with content |

## References

- Claude Skills Format: https://docs.anthropic.com/skills
- Skill Seekers Builder: https://github.com/jmagly/Skill_Seekers
- REF-001: Production-Grade Agentic Workflows (BP-4, BP-5)
- REF-002: LLM Failure Modes (Archetype 1-4 mitigations)
