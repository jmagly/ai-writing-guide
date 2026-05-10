---
namespace: aiwg
name: verify-citations
platforms: [all]
description: Verify all citations in a document against the research corpus
commandHint:
  category: research-quality
---

# Verify Citations Command

Validate that all citations, references, and factual claims are backed by actual sources in the research corpus.

## Instructions

When invoked, perform systematic citation verification:

1. **Parse Target File**
   - Load the specified file (or all markdown files if no path given)
   - Extract all citation patterns:
     - `@.aiwg/research/sources/*` references
     - `@.aiwg/research/findings/*` references
     - `REF-XXX` inline references
     - DOI patterns (`10.XXXX/...`)
     - Author-year patterns (`Author et al., YYYY`)
     - **RLM citation patterns** (#1225): `[<artifact_id>@<content_hash>, L<n>-<n>]` and path-only fallback `[<artifact_id>, L<n>-<n>]`

2. **Verify Each Citation**
   - Check file existence for @-mention references
   - Validate REF-XXX against frontmatter in corpus
   - Verify DOI format validity
   - Check page number ranges
   - Validate quoted text against source
   - **For RLM citations**: verify cited file exists; if `content_hash` present, recompute current hash and compare (see [RLM Citation Verification](#rlm-citation-verification) below)

3. **Detect Hallucinations**
   - Flag citations to non-existent files
   - Flag fabricated DOIs
   - Flag statistics without sources
   - Flag author names not in corpus

4. **Check GRADE Compliance**
   - Load quality assessment for each cited source
   - Compare hedging language to evidence quality
   - Flag overclaiming (HIGH-confidence language for LOW evidence)

5. **Generate Report**
   - Display summary table (total, valid, issues)
   - List each issue with severity and fix suggestion
   - Include RLM Citations section when present (Fresh / Stale / Un-versioned counts)
   - Provide overall PASS/FAIL verdict

6. **Auto-Fix Mode (--fix)**
   - Downgrade hedging language for GRADE violations
   - Remove citations to non-existent sources (with comment)
   - Add TODO markers for sources needing verification
   - For STALE RLM citations: leave them in place but annotate with `[STALE: hash mismatch]`; do not auto-rewrite (the agent that emitted them must decide whether the new content still supports the claim)

## RLM Citation Verification

When the target file contains RLM-format citations (#1205, #1223), `verify-citations` validates them against the current state of the cited artifacts.

### Citation patterns

The skill recognizes two inline forms (matching the schema at `agentic/code/addons/rlm/schemas/citation-tuple.json`):

- **Versioned**: `[<artifact_id>@<content_hash>, <lines>]` — full provenance with content hash
  - Example: `[src/auth/login.ts@a8f9c2d4e5f60718, L42-58]`
- **Path-only fallback**: `[<artifact_id>, <lines>]` — citation without content hash (artifact wasn't in the index when emitted)
  - Example: `[src/legacy/auth.py, L88]`

The `lines` field is optional in both forms.

### Verdict logic

For **versioned** RLM citations:

1. Resolve `<artifact_id>` to a project-relative file path
2. If file does not exist → verdict: **MISSING** (error)
3. If file exists, compute its current content hash using the same routine as the artifact index: sha256, truncated to first 16 hex chars (matches `src/artifacts/index-builder.ts:243`)
4. Compare to the citation's `content_hash`:
   - **Match** → verdict: **FRESH** (pass)
   - **Mismatch** → verdict: **STALE** (warning by default; error in `--strict`)

For **path-only fallback** RLM citations:

1. Resolve `<artifact_id>` to a project-relative file path
2. If file does not exist → verdict: **MISSING** (error)
3. If file exists → verdict: **UN-VERSIONED** (warning by default; error in `--strict`)

Stale verdict means the file content has changed since the citation was emitted — the claim may no longer be supported by the cited region. The simple hash-mismatch heuristic doesn't distinguish whitespace edits from semantic changes; richer semantic-drift detection is the responsibility of `aiwg index doctor --rlm-audit` (#1208).

### Hash computation

The hash routine MUST match the index implementation exactly so citations emitted by `rlm-batch` round-trip cleanly:

```
sha256(file_contents).hexdigest()[0:16]
```

See `src/artifacts/index-builder.ts:243` for the canonical implementation. Any verification logic that diverges from this convention will produce false stale verdicts.

### Report format

When RLM citations are present, the report adds a new section:

```
RLM Citations: 12 total
  ✓ Fresh: 9
  ⚠ Stale: 2
  ⚠ Un-versioned: 1
  ✗ Missing: 0

STALE citations:
  - [src/auth/login.ts@a8f9c2d4e5f60718, L42-58]
    Current hash: f3b2c1d4e5a60718
    File modified since citation emitted

UN-VERSIONED citations:
  - [src/legacy/auth.py, L88]
    File exists but no content hash; consider running through aiwg index
```

### Mode flags

- **Default mode**: auto-detects both research-corpus citations (existing behavior) and RLM citations (new). No flag required.
- **`--rlm`**: opt-in to RLM-only mode — skip @-mention research-corpus checks. Useful when verifying RLM-aggregated outputs in CI without research-corpus context.
- **`--strict`**: existing flag — STALE and UN-VERSIONED RLM citations escalate from warnings to errors and produce non-zero exit.

## Arguments

- `[file-path]` - File to verify (default: all `.md` files in current directory)
- `--strict` - Treat warnings as errors (including STALE and UN-VERSIONED RLM citations)
- `--fix` - Automatically fix GRADE violations and remove hallucinated citations (does not rewrite RLM citations — see #6 above)
- `--report` - Save report to `.aiwg/reports/citation-verification.md`
- `--corpus-only` - Only check @-mention references, skip author-year patterns
- `--rlm` (#1225) - Verify RLM citations only; skip research-corpus checks

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/citation-policy.md - Citation enforcement rules
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier agent
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/research/citation-audit.yaml - Audit schema
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml - Detection patterns
- @$AIWG_ROOT/agentic/code/addons/rlm/schemas/citation-tuple.json - RLM citation tuple schema (#1223)
- @$AIWG_ROOT/agentic/code/addons/rlm/skills/rlm-batch/SKILL.md - RLM citation emission contract
