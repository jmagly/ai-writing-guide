# Research Metadata Rules

**Enforcement Level**: HIGH
**Scope**: All research document creation and updates
**Research Basis**: REF-056 FAIR Principles
**Issues**: #105, #108

## Overview

These rules enforce FAIR-compliant metadata for all research documents, ensuring machine-readable frontmatter and fixity verification.

## Mandatory Rules

### Rule 1: All Research Documents MUST Have Frontmatter

**FORBIDDEN**:
```markdown
# REF-XXX: Paper Title

Some content without frontmatter...
```

**REQUIRED**:
```markdown
---
ref_id: "REF-XXX"
title: "Full Paper Title"
authors:
  - name: "Author Name"
year: 2024
source_type: peer_reviewed_conference
# ... full frontmatter
---

# REF-XXX: Paper Title
```

### Rule 2: Identifiers Are REQUIRED Based on Source Type

| Source Type | Required Identifier |
|-------------|---------------------|
| `peer_reviewed_journal` | DOI |
| `peer_reviewed_conference` | DOI |
| `preprint` | arXiv ID OR URL |
| `technical_report` | URL |
| `standard` | URL OR identifier |

### Rule 3: Key Findings MUST Include Metrics

**FORBIDDEN**:
```yaml
key_findings:
  - finding: "The system is faster"
    impact: high
```

**REQUIRED**:
```yaml
key_findings:
  - finding: "System achieves 20% latency reduction"
    metric: "-20% latency (p50)"
    impact: high
```

### Rule 4: PDF Checksums MUST Be Recorded

When adding a research paper:

1. Download PDF to `.aiwg/research/pdfs/`
2. Compute SHA-256 checksum
3. Add to `pdf_hash` field in frontmatter
4. Update `.aiwg/research/fixity-manifest.json`

```yaml
# In frontmatter
pdf_hash: "a1b2c3d4e5f6..."  # SHA-256 of REF-XXX.pdf
```

### Rule 5: Quality Assessment MUST Follow GRADE

**REQUIRED** GRADE baseline based on source type:

| Source Type | Baseline |
|-------------|----------|
| `peer_reviewed_journal` | high |
| `peer_reviewed_conference` | high |
| `preprint` | moderate |
| `technical_report` | moderate |
| `industry_whitepaper` | low |

### Rule 6: AIWG Relevance MUST Be Assessed

**REQUIRED** fields in `aiwg_relevance`:

```yaml
aiwg_relevance:
  applicability: direct       # REQUIRED
  components_affected:        # REQUIRED (at least one)
    - agents
  implementation_priority: round-2  # REQUIRED
```

### Rule 7: Verify DOI Before Citation

Before citing any paper:

1. Verify DOI resolves (CrossRef/DOI.org)
2. Check `last_verified` is within 90 days
3. If stale, re-verify and update

## Schema Reference

All frontmatter MUST conform to:
```
@agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml
```

## Fixity Verification

Checksums tracked in:
```
@.aiwg/research/fixity-manifest.json
```

Verification protocol:
1. Weekly automated verification (CI)
2. On-access verification (optional)
3. Log failures to `.aiwg/research/integrity-failures.log`

## Agent Integration

### When Creating Research Documents

Agents MUST:
1. Use template: `@agentic/code/frameworks/sdlc-complete/templates/research/ref-template-with-frontmatter.md`
2. Populate all required frontmatter fields
3. Compute PDF checksum if PDF available
4. Validate against schema before saving

### When Citing Research

Agents MUST:
1. Verify source exists in corpus
2. Check DOI/identifier validity
3. Use consistent citation format
4. Link to REF-XXX document

## Validation Checklist

Before saving a research document:

- [ ] All required frontmatter fields present
- [ ] `ref_id` follows REF-XXX pattern
- [ ] DOI present for published papers
- [ ] `key_findings` include metrics
- [ ] `aiwg_relevance` fully populated
- [ ] `quality_assessment` follows GRADE
- [ ] PDF checksum recorded (if PDF available)
- [ ] Schema validation passes

## References

- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Frontmatter schema
- @agentic/code/frameworks/sdlc-complete/schemas/research/fixity-manifest.yaml - Fixity schema
- @.aiwg/research/findings/REF-056-fair-principles.md - FAIR research
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE process
- #105 - Frontmatter issue
- #108 - Fixity checking issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
