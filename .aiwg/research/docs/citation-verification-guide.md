# Citation Verification Guide

Practical guide for verifying citations before including them in AIWG artifacts. Implements the verification workflow mandated by @.claude/rules/citation-policy.md.

## Quick Reference

### Before You Cite

```
1. Does the source exist in .aiwg/research/sources/?
   ├── YES → Proceed to step 2
   └── NO  → Do NOT cite. Use hedging or file gap in @.aiwg/research/TODO.md

2. Can you extract the exact claim with page/section?
   ├── YES → Proceed to step 3
   └── NO  → Use general reference, not specific claim

3. What is the GRADE quality level?
   ├── HIGH     → Use "demonstrates", "shows", "confirms"
   ├── MODERATE → Use "suggests", "indicates", "supports"
   ├── LOW      → Use "limited evidence indicates", "some evidence"
   └── VERY LOW → Use "anecdotal", "exploratory", "practitioner reports"

4. Is the claim language appropriate for the evidence quality?
   ├── YES → Include citation
   └── NO  → Adjust language before including
```

## Verification Workflow

### Step 1: Check Source Existence

Before citing any source, verify the file exists in the research corpus.

**For agents (automated check)**:

```bash
# Check if source file exists
SOURCE="smith-2024-best-practices.pdf"
if [ -f ".aiwg/research/sources/${SOURCE}" ]; then
  echo "Source verified: ${SOURCE}"
else
  echo "ERROR: Source not found. Do not cite."
  echo "Action: File gap in .aiwg/research/TODO.md"
fi
```

**For @-mention references**:

```bash
# Check if referenced file exists
REF_PATH=".aiwg/requirements/use-cases/UC-001-auth.md"
if [ -f "${REF_PATH}" ]; then
  echo "Reference verified: ${REF_PATH}"
else
  echo "ERROR: Broken reference @${REF_PATH}"
fi
```

### Step 2: Extract Exact Claims

When citing a source, extract the exact text rather than paraphrasing from memory.

**Correct extraction**:
```markdown
The paper states: "Test-driven development resulted in a 40.7% reduction
in defect density" (@.aiwg/research/sources/george-2003-tdd.pdf, p. 12).
```

**Incorrect (memory-based)**:
```markdown
Research shows TDD reduces defects by about 40%.
```

### Step 3: Assess GRADE Quality Level

Use the GRADE assessment framework to determine evidence quality.

| Source Type | Baseline GRADE | Upgrade/Downgrade Factors |
|-------------|---------------|---------------------------|
| Systematic review with meta-analysis | HIGH | — |
| Randomized controlled trial | HIGH | Downgrade for bias, imprecision |
| Cohort study | MODERATE | Upgrade for large effect, dose-response |
| Case-control study | MODERATE | Downgrade for confounders |
| Case series | LOW | Upgrade for large, consistent effect |
| Expert opinion | LOW | — |
| Anecdotal / blog post | VERY LOW | — |
| No evidence | N/A | Do not cite; file gap |

For detailed assessment procedures, see @.aiwg/research/docs/grade-assessment-guide.md.

### Step 4: Match Language to Evidence

Use the hedging language matrix from the citation policy:

| GRADE Level | Allowed Verbs | Forbidden Verbs |
|-------------|---------------|-----------------|
| **HIGH** | demonstrates, shows, confirms, establishes | — |
| **MODERATE** | suggests, indicates, supports, points to | proves, confirms, establishes |
| **LOW** | some evidence, limited data, preliminary | suggests, demonstrates, shows |
| **VERY LOW** | anecdotal, exploratory, practitioner reports | indicates, supports, suggests |

### Step 5: Include GRADE Annotation

Every citation SHOULD include its GRADE level:

```markdown
Research suggests correlation between TDD and code quality
(@.aiwg/research/sources/williams-2003-tdd.pdf, pp. 6-9).

GRADE: MODERATE — Single cohort study, no randomization
```

## DOI Verification Protocol

When a source includes a DOI:

1. **Verify DOI resolves**: Check that `https://doi.org/<DOI>` returns a valid page
2. **Record verification date**: Note when the DOI was last verified
3. **Update frontmatter**: Set `last_verified` field in source frontmatter

```yaml
# In source frontmatter
identifiers:
  doi: "10.1145/3377811.3380330"
  doi_verified: "2026-01-25"
  doi_url: "https://doi.org/10.1145/3377811.3380330"
```

**Verification schedule**: DOIs should be re-verified every 90 days or on access.

## Common Verification Scenarios

### Scenario 1: Citing a Paper in the Corpus

```markdown
# Source exists: .aiwg/research/sources/rafique-2015-tdd-systematic.pdf

# Step 1: File exists ✓
# Step 2: Extract exact claim with page number
# Step 3: Systematic review → GRADE: HIGH
# Step 4: Use "demonstrates" language

Systematic review by Rafique and Mišić demonstrates that test-driven
development significantly reduces defect density
(@.aiwg/research/sources/rafique-2015-tdd-systematic.pdf, p. 234).

GRADE: HIGH — Systematic review with meta-analysis
```

### Scenario 2: Making a Claim Without Source

```markdown
# No source in corpus for "microservices improve scalability"

# Step 1: Source does NOT exist ✗
# Action: Do NOT cite. Use hedging.

Industry practice suggests microservices may improve scalability,
though rigorous comparative studies are limited.

Evidence gap: See @.aiwg/research/TODO.md (GAP-001)
```

### Scenario 3: Citing a Blog Post

```markdown
# Source: .aiwg/research/sources/forum-discussions-2024.md

# Step 1: File exists ✓
# Step 2: Extract key claims
# Step 3: Blog/forum → GRADE: VERY LOW
# Step 4: Use "anecdotal" / "practitioner reports" language

Practitioner discussions on engineering forums suggest potential benefits
of event-driven architecture for real-time systems, though these reports
are anecdotal and lack formal evaluation
(@.aiwg/research/sources/forum-discussions-2024.md).

GRADE: VERY LOW — Anecdotal evidence only
Note: Formal literature review planned — see @.aiwg/research/TODO.md
```

### Scenario 4: Referencing Internal Artifacts

```markdown
# Referencing a use case document

# Step 1: Verify file exists
# ls .aiwg/requirements/use-cases/UC-001-auth.md → exists ✓

As defined in @.aiwg/requirements/use-cases/UC-001-auth.md,
the authentication flow requires MFA for all admin users.
```

## Anti-Patterns to Avoid

### 1. Invented Citations

```markdown
# WRONG — fabricated reference
According to Smith et al. (2024), best practices include...

# RIGHT — acknowledge gap
Best practices in this area typically include...
(Note: Literature review needed for authoritative citation)
```

### 2. Fabricated Metadata

```markdown
# WRONG — made-up DOI
DOI: 10.1234/example.2024.001

# RIGHT — verified DOI or none
DOI: 10.1145/3377811.3380330 (verified 2026-01-25)
# OR: DOI not available for this source
```

### 3. Overclaiming from Weak Evidence

```markdown
# WRONG — HIGH language for LOW evidence
Research proves that standups improve velocity.

# RIGHT — matched language
Limited practitioner reports suggest standups may
improve velocity, though controlled studies are lacking.
GRADE: VERY LOW
```

### 4. Missing Page Numbers

```markdown
# WRONG — no location
According to the study (@.aiwg/research/sources/paper.pdf)...

# RIGHT — with location
According to the study (@.aiwg/research/sources/paper.pdf, pp. 12-15)...
```

### 5. Citing Non-Corpus Sources

```markdown
# WRONG — source not in .aiwg/research/sources/
As Fowler (2024) describes on martinfowler.com...

# RIGHT — only cite corpus sources
As described in @.aiwg/research/sources/fowler-2024-microservices.pdf (p. 3)...

# OR if not in corpus:
Industry guidance on this topic exists but has not yet been
added to the research corpus. See @.aiwg/research/TODO.md.
```

## Verification Checklist

Use this checklist before finalizing any document with citations:

- [ ] All `@.aiwg/research/sources/` references point to existing files
- [ ] All `@.aiwg/requirements/` references point to existing files
- [ ] All `@.aiwg/architecture/` references point to existing files
- [ ] All quotes are exact with page/section numbers
- [ ] GRADE level assessed for each citation
- [ ] Claim language matches GRADE level (no overclaiming)
- [ ] LOW/VERY LOW sources explicitly marked with uncertainty
- [ ] No fabricated DOIs, URLs, ISBNs, or page numbers
- [ ] Evidence gaps filed in @.aiwg/research/TODO.md
- [ ] DOIs verified within last 90 days (if applicable)

## Troubleshooting

### "I can't find the source file"

1. Search the corpus: `find .aiwg/research/sources -name "*keyword*"`
2. Check alternate locations: `.aiwg/research/findings/`, `.aiwg/research/pdfs/`
3. If not found: Do NOT cite. File a gap in `@.aiwg/research/TODO.md`

### "The claim doesn't have a page number"

1. For PDFs: Open the document and locate the relevant section
2. For web sources: Use section headings as anchors
3. If unable to locate: Cite the document generally, note "exact location TBD"

### "I'm not sure about the GRADE level"

1. Consult @.aiwg/research/docs/grade-assessment-guide.md
2. When uncertain, default to ONE LEVEL LOWER than your estimate
3. Document your uncertainty: "GRADE: MODERATE (provisional — awaiting quality review)"

### "The source contradicts another source"

1. Cite both sources with their respective GRADE levels
2. Note the contradiction explicitly
3. Prefer the higher-GRADE source for primary claims
4. Document the disagreement for future resolution

## References

- @.claude/rules/citation-policy.md — Mandatory citation rules
- @.aiwg/research/docs/grade-assessment-guide.md — GRADE assessment methodology
- @.aiwg/research/TODO.md — Research gaps tracker
- @agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml — Hallucination detection patterns
- @agentic/code/frameworks/sdlc-complete/schemas/research/citation-audit.yaml — Citation audit schema
