# ADR-002: Markdown as Primary Content Format

**Status**: ACCEPTED
**Date**: 2025-10-15
**Decision Makers**: Joseph Magly (Project Owner), Architecture Designer
**Phase**: Inception

## Context

The AI Writing Guide framework requires a content format for documentation, agent definitions, command specifications, and templates. The format must support:

- Human readability (developers read and edit content)
- Version control friendly (git diff, merge)
- Tooling support (linting, validation, generation)
- Cross-platform compatibility (all OS, all editors)
- No build step (static content deployment)

## Decision

**We will use Markdown (CommonMark specification) as the primary content format for all documentation, agent definitions, commands, and templates.**

Implementation:
- All documentation: `*.md` files (CommonMark spec)
- Agent definitions: `.claude/agents/*.md` (Markdown with YAML frontmatter)
- Command definitions: `.claude/commands/*.md` (Markdown with YAML frontmatter)
- Templates: `templates/**/*.md` (Markdown with placeholders)
- Manifests: `manifest.json` (JSON, not Markdown - exception for machine-readable data)

## Alternatives Considered

### Alternative 1: HTML

**Pros**:
- Rich formatting (CSS, JavaScript)
- Interactive elements possible
- Standard web format

**Cons**:
- Not human-readable in source form (verbose tags)
- Poor git diff experience (hard to review changes)
- Requires build step (minification, bundling)
- Overkill for documentation framework

**Decision**: REJECTED (too complex, not version-control-friendly)

### Alternative 2: AsciiDoc

**Pros**:
- More powerful than Markdown (tables, includes, variables)
- Better for technical documentation (books, manuals)
- Extensible format

**Cons**:
- Less familiar to developers (Markdown is universal)
- Requires tooling (asciidoctor) for rendering
- Smaller ecosystem than Markdown
- Overkill for agent definitions and commands

**Decision**: REJECTED (less familiar, unnecessary complexity)

### Alternative 3: reStructuredText (RST)

**Pros**:
- Powerful format (used by Sphinx, Read the Docs)
- Great for technical documentation
- Semantic markup

**Cons**:
- Python ecosystem bias (less familiar to JavaScript developers)
- More verbose syntax than Markdown
- Smaller tool ecosystem than Markdown
- Not ideal for Claude Code (expects Markdown for agents)

**Decision**: REJECTED (less universal, Claude Code expects Markdown)

### Alternative 4: Plain Text

**Pros**:
- Simplest format (no syntax)
- Universal compatibility (all editors)
- Version control friendly

**Cons**:
- No formatting (no headings, lists, code blocks)
- No structure (hard to parse programmatically)
- No links or cross-references
- Poor readability for long documents

**Decision**: REJECTED (insufficient structure for documentation framework)

### Alternative 5: JSON/YAML

**Pros**:
- Machine-readable (easy to parse)
- Structured data (schema validation possible)
- Standard interchange formats

**Cons**:
- Not human-readable for long text (verbose, nested)
- Poor for prose content (documentation, instructions)
- Awkward for multi-paragraph text (escaping, line breaks)
- Git diff hard to read for text changes

**Decision**: PARTIAL (use JSON for manifests, Markdown for content)

## Consequences

### Positive

1. **Universal Familiarity**:
   - Markdown is standard for developer documentation (GitHub, GitLab, Stack Overflow)
   - No learning curve (developers already know Markdown)
   - Cross-platform (all editors support Markdown)

2. **Version Control Friendly**:
   - Clean git diff (line-by-line changes)
   - Easy merge conflict resolution (readable conflict markers)
   - Reviewable in pull requests (GitHub renders Markdown)

3. **Tooling Ecosystem**:
   - Linters available (markdownlint-cli2)
   - Editors with Markdown support (VS Code, Vim, Emacs, etc.)
   - Renderers available (pandoc, marked, remark)
   - GitHub/GitLab render automatically

4. **No Build Step**:
   - Markdown is human-readable in source form
   - No compilation required (static content)
   - Deploy directly via git (no build artifacts)

5. **Claude Code Compatibility**:
   - Claude Code expects Markdown for agent definitions
   - Native support for Markdown in `.claude/agents/*.md`
   - Commands use Markdown for specifications

6. **Flexible Structure**:
   - Supports headings, lists, code blocks, tables
   - YAML frontmatter for metadata (agent configuration)
   - Links and cross-references (relative paths)
   - Embeddable code examples (fenced code blocks)

### Negative

1. **Limited Formatting**:
   - No semantic markup (compared to AsciiDoc or RST)
   - Tables are basic (no colspan, rowspan)
   - No includes or variables (repetition required)
   - Flavor fragmentation (CommonMark, GitHub Flavored, etc.)

2. **Linting Required**:
   - Markdown allows multiple ways to do same thing (consistency needed)
   - Custom linters required (10+ custom fixers created)
   - CI enforcement needed (GitHub Actions workflow)
   - Maintenance overhead (lint rules evolve)

3. **No Programmatic Structure**:
   - Markdown is semi-structured (headings, lists, but freeform)
   - Hard to extract structured data (compared to JSON/YAML)
   - Parsing required for automation (frontmatter extraction, heading hierarchy)

4. **Flavor Fragmentation**:
   - CommonMark vs GitHub Flavored Markdown vs MultiMarkdown
   - Extensions vary by renderer (task lists, tables, footnotes)
   - Must choose spec and enforce consistently

### Mitigations

**Limited Formatting**:
- Use CommonMark spec (standard, well-supported)
- Accept limitations (tables, no includes) as acceptable trade-off
- Use JSON for machine-readable data (manifests)

**Linting Required**:
- Create custom markdown linters (10+ already implemented)
- Enforce in CI/CD (GitHub Actions workflow)
- Document style guide in CONTRIBUTING.md

**No Programmatic Structure**:
- Use YAML frontmatter for metadata (agent configuration)
- Parse Markdown when needed (manifest generation, validation)
- Accept semi-structured nature (human-readable prioritized over machine-readable)

**Flavor Fragmentation**:
- Choose CommonMark as canonical spec (GitHub supports CommonMark)
- Document deviations in CONTRIBUTING.md
- Use GitHub Flavored Markdown extensions sparingly (task lists, tables)

## Validation

**Success Criteria**:
- [x] All documentation in Markdown (README, guides, examples) ✓ Complete
- [x] All agents in Markdown (54 agents) ✓ Complete
- [x] All commands in Markdown (32 commands) ✓ Complete
- [x] All templates in Markdown (50+ templates) ✓ Complete
- [ ] Markdown linting enforced (GitHub Actions CI) - In Progress
- [ ] CommonMark compliance validated (markdownlint-cli2) - In Progress

**Validation Timeline**:
- **Inception (Complete)**: All content migrated to Markdown
- **Week 2 of Elaboration**: Markdown linting fully operational
- **Post-v1.0**: Community feedback on Markdown format

## Related Decisions

- **ADR-001**: Git-Based Distribution (Markdown works well with git)
- **ADR-004**: Claude Code as Primary Target (Claude Code expects Markdown agents)
- **Lint Rules**: Custom markdown linters (MD012, MD022, MD026, MD031, MD032, MD038, MD040, MD041, MD047, MD058)

## References

- CommonMark Specification: https://spec.commonmark.org/
- GitHub Flavored Markdown: https://github.github.com/gfm/
- markdownlint-cli2: https://github.com/DavidAnson/markdownlint-cli2
- Markdown Guide: https://www.markdownguide.org/

**Conclusion**: Markdown provides the best balance of human-readability, version control friendliness, and tooling support for a documentation framework targeting developer audiences.
