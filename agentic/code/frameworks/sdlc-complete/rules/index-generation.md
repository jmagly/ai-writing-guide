# Index Generation Rules

**Enforcement Level**: MEDIUM
**Scope**: Research corpus and artifact directories
**Research Basis**: REF-056 FAIR Principles (F4 - Searchable Resources)
**Issue**: #136

## Overview

These rules define how INDEX.md files are automatically generated from YAML frontmatter to enable searchable, browseable resource indexes per FAIR F4 principle.

## Required Index Structure

Every INDEX.md MUST include:

1. **Header** - Directory name and generation timestamp
2. **By Topic** - Grouped by topic/category
3. **By Year** - Grouped by publication year
4. **By License** - Grouped by license type (for research)
5. **Full Listing** - Complete table of all entries

## Index Template

```markdown
# {Directory Name} Index

Auto-generated from YAML frontmatter. Last updated: {timestamp}

## By Topic

### {Topic Name}

- [{ref}]({filename}) - {title} ({authors}, {year})

## By Year

### {year}

{ref1}, {ref2}, {ref3}

## By License

### {license_type}

{ref1}, {ref2}

## Full Listing

| Ref | Title | Authors | Year | Topics | License |
|-----|-------|---------|------|--------|---------|
| {ref} | {title} | {authors} | {year} | {topics} | {license} |
```

## Frontmatter Requirements

For documents to be indexed, they MUST have frontmatter with:

### Required Fields

```yaml
---
ref: REF-XXX          # Unique identifier
title: string         # Document title
---
```

### Optional Fields (for richer index)

```yaml
---
authors:              # List of authors
  - "Smith, J."
  - "Jones, M."
year: 2024            # Publication year
topics:               # Topic tags
  - agentic-workflows
  - human-in-the-loop
license:              # License information
  type: CC-BY-4.0
  commercial: true
---
```

## Generation Triggers

INDEX.md SHOULD be regenerated when:

| Trigger | Action |
|---------|--------|
| New document added | Auto-regenerate |
| Document modified | Auto-regenerate |
| Document deleted | Auto-regenerate |
| Manual request | `aiwg index generate` |
| Pre-commit hook | Validate, regenerate if needed |

## Directory-Specific Rules

### Research Sources (.aiwg/research/sources/)

Include:
- Topics grouping
- Year grouping
- License grouping
- Full citation table

### Findings (.aiwg/research/findings/)

Include:
- Category grouping (by research paper)
- AIWG Relevance grouping
- Quality rating summary

### Use Cases (.aiwg/requirements/use-cases/)

Include:
- Status grouping (draft, approved, implemented)
- Priority grouping
- Actor grouping

### Architecture (.aiwg/architecture/)

Include:
- Type grouping (ADR, SAD, diagram)
- Status grouping

## Validation Rules

Before committing, validate that:

1. **INDEX.md exists** in indexed directories
2. **INDEX.md is current** - matches frontmatter
3. **All entries have required fields**
4. **No orphan entries** - all indexed files exist

```yaml
validation:
  directories_to_index:
    - .aiwg/research/sources/
    - .aiwg/research/findings/
    - .aiwg/requirements/use-cases/
    - .aiwg/architecture/

  pre_commit_check:
    - index_exists
    - index_current
    - no_orphans
```

## Pre-Commit Hook

```bash
#!/bin/bash
# Validate and regenerate indexes

INDEXED_DIRS=(
  ".aiwg/research/sources"
  ".aiwg/research/findings"
)

for dir in "${INDEXED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    # Check if any markdown changed
    if git diff --cached --name-only | grep -q "^$dir/.*\.md$"; then
      # Regenerate index
      aiwg index generate "$dir"
      git add "$dir/INDEX.md"
    fi
  fi
done
```

## Custom Sections

INDEX.md can include custom sections that are preserved during regeneration:

```markdown
<!-- CUSTOM START -->
## Additional Notes

This section is preserved during index regeneration.
<!-- CUSTOM END -->
```

Agent MUST:
- Detect CUSTOM START/END markers
- Preserve content between markers
- Place custom content after generated sections

## Sorting Rules

### By Topic
- Alphabetical by topic name
- Within topic: alphabetical by ref

### By Year
- Descending (newest first)
- Within year: alphabetical by ref

### By License
- Alphabetical by license type
- Within license: alphabetical by ref

### Full Listing
- Alphabetical by ref

## Agent Protocol

### Index Generation

```yaml
generate_index:
  steps:
    - scan_directory_for_markdown
    - extract_frontmatter
    - validate_required_fields
    - group_by_topic
    - group_by_year
    - group_by_license
    - render_template
    - preserve_custom_sections
    - write_index
```

### Index Validation

```yaml
validate_index:
  steps:
    - load_current_index
    - scan_directory
    - compare_entries
    - report_differences
    - return_valid_or_invalid
```

## Template Customization

Override default template with custom template:

```yaml
# aiwg.yml
indexing:
  template: ".aiwg/templates/custom-index.md"
  sections:
    - by_topic
    - by_year
    - full_listing
  exclude_sections:
    - by_license
```

## References

- @.aiwg/research/findings/REF-056-fair-principles.md - FAIR F4
- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Frontmatter format
- @.claude/rules/research-metadata.md - Metadata rules
- #136 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
