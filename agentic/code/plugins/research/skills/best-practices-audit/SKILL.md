---
namespace: aiwg
name: best-practices-audit
platforms: [all]
description: Research-grounded validation of a target (file, directory, or topic) against external best practices and vendor docs. Produces a cited, evidence-grounded comparison.
commandHint:
  argumentHint: "<target> [--focus <area>] [--standard <name>] [--depth quick|standard|deep] [--cite-threshold <N>] [--dissent] [--validate] [--output <path>]"
  allowedTools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch
  model: opus
  category: research-validation
---

# Best-Practices Audit

## Task

Validate a target — a file, directory, or freeform topic — against current
external best practices, vendor documentation, and practitioner discussion.
Produce a cited, evidence-grounded comparison report.

This is the research-grounded validation pattern from #929: it institutionalizes
the practice of validating against fresh internet sources rather than the
model's training-cutoff priors. The improvement is real **only when retrieved
sources have good signal**, so the skill enforces citation guardrails and
confidence honesty rather than fabricating breadth.

## Parameters

### Positional
- **`<target>`** (required): file path, directory, freeform topic, or issue ref

### Focus / Scope
- **`--focus <area>`**: security | performance | accessibility | licensing | api-design | testing | docs | ops | compliance | … (open vocabulary)
- **`--framework <name>`**: bias toward a named stack (React, Kubernetes, FastAPI, …)
- **`--standard <name>`**: align to a named standard (OWASP, SOC2, WCAG 2.2, NIST 800-53, …)

### Research Budget
- **`--recency <window>`**: default 18 months. Tighten for fast-moving domains, widen for compliance/legal
- **`--depth quick|standard|deep`**: research effort budget (default `standard`)
- **`--sources <list>`**: restrict to: vendor-docs, standards-bodies, practitioner-blogs, conference-talks, academic, github-discussions
- **`--exclude <list>`**: e.g. exclude SEO-spam domains
- **`--cite-threshold <N>`**: minimum distinct sources before a finding is reported (default `2`)

### Reporting
- **`--dissent`**: actively surface practitioner disagreement, not just consensus
- **`--validate`**: re-validate existing claims in the target rather than generating new ones
- **`--output <path>`**: where to write the report (CLI handler computes the default)

## Pipeline

The CLI handler at `src/cli/handlers/best-practices-audit.ts` parses flags
and computes the output path; this skill receives a fully-formed prompt and
runs the research pipeline.

### Step 1: Scope

1. **Resolve the target.**
   - Path exists? Read the file/directory and enumerate distinct claims or
     decisions stated in it (architecture choices, dependency selections,
     pattern usages).
   - Path doesn't exist? Treat as freeform topic — the entire audit is
     about the topic itself.
2. **Inventory claims.** Each claim becomes a unit of evaluation downstream:
   "we use Tower middleware for retries", "Postgres handles >500K users at
   the budgeted instance size", "WCAG 2.2 AA is required". For freeform
   topics, the claim is implicitly "what does current practice say about
   this topic?".
3. **Apply guidance.** `--focus` and `--framework` filter which claims are
   in scope. `--validate` switches to claim re-verification mode (no
   generative findings).

### Step 1.5: Contributor Discovery (per ADR-023)

Before fan-out, discover any installed framework's `kind: research` contributors
that match the project. The discovery convention is described in ADR-023; the
runtime authority is `src/contributors/discover.ts` and the discovery loop
matches the algorithm there.

1. Read `.aiwg/frameworks/registry.json`. For each registered framework id,
   check for `<source-path>/research/contributor.md` under
   `agentic/code/frameworks/`, `agentic/code/addons/`, or `agentic/code/extensions/`
   (first match wins per ADR-023 §Layout).
2. Walk `.aiwg/contributors/research/*.md` for project-local research
   contributors.
3. For each candidate, parse YAML frontmatter and validate against the
   `kind: research` schema (published at
   `agentic/code/frameworks/research-complete/skills/best-practices-audit/contributor.schema.json`).
4. Run each contributor's `detect.glob` against the project root. Skip contributors
   whose detection produces fewer than `detect.minCount` matches — installed
   but unused frameworks do not pollute the audit.
5. For each in-use research contributor, fold its frontmatter into the
   research plan:

   - **`focus_areas`** — intersect with the user's `--focus` flag if present.
     If `--focus` is omitted, use the contributor's full focus list. Multiple
     contributors' areas merge with union semantics.
   - **`sources.preferred`** and **`sources.exclude`** — add to the audit's
     allow / block lists. The user's `--sources` and `--exclude` flags take
     precedence; contributor preferences fill in defaults the user did not
     specify.
   - **`recency_default_months`** — used as the per-contributor default
     when `--recency` is not set. When multiple contributors disagree, pick
     the **shorter** window (more conservative — fresher sources are a
     stronger guarantee than older sources).
6. Stamp `origin: <framework-id>` on every finding sourced through that
   contributor's expanded plan. Findings sourced from the generic path
   (no contributor) get `origin: generic`. Project-local research
   contributors stamp `origin: project-local`.
7. **No regression when no contributors are present.** If discovery returns
   zero in-use contributors, fall through to the bare generic path described
   in #943 — same behavior as before this issue's wiring landed.

When validate-metadata is available, the schema enforces correctness at
deploy time. At audit time, this step trusts validated frontmatter; a
contributor that fails parsing or validation is logged and skipped per
ADR-023 §Failure mode.

### Step 2: Research Fan-Out

Dispatch research per claim/focus area using the AIWG research-complete
agents, expanded by any contributor configurations from Step 1.5.
**Reuse existing capabilities — do not implement parallel research
machinery.**

Available capabilities (load-on-demand from research-complete):
- `find-sources` — discover candidate sources via vendor docs, standards
  bodies, practitioner channels
- `research-acquire` — fetch and process candidate documents
- `research-quality` — apply GRADE quality scoring
- `citation-guard` — block fabricated citations
- `research-query` — query the local research corpus when one is present

If `media-curator` and the marketing kit are also installed, dispatch them
for web-scraping cross-references where appropriate (e.g. practitioner
blog comparisons).

**Concurrency rule per AIWG context-budget**: the agent should issue parallel
research tasks where independent (different focus areas, different claims),
but not multiplex the same claim into N redundant subagents.

### Step 3: Source Quality Gating

For each candidate source returned by research:

1. Apply `--sources` allow-list and `--exclude` block-list.
2. Run `citation-guard` to verify the source is real and retrievable
   (URL reachable, content present at the cited location, not a 404 or
   redirect to unrelated content).
3. Apply GRADE methodology via `research-quality` — score each source as
   high / moderate / low.
4. Apply `--recency` window — sources older than the window are demoted
   one quality level.
5. Drop sources that fail any gate. Do not "rescue" weak sources by
   relaxing thresholds without explicit `--guidance` to do so.

### Step 4: Comparison

For each claim:

1. Aggregate the surviving sources.
2. If fewer than `--cite-threshold` distinct sources support the claim's
   alignment-or-divergence assessment, **downgrade the finding to "weak
   signal" rather than dropping it silently**. Users need to see when
   the corpus didn't support a strong conclusion — that is itself a
   finding.
3. Determine alignment: ALIGNED / PARTIAL / DIVERGES / CONTESTED.
4. With `--dissent`, also extract dissenting voices: who argues the other
   way, where, and on what grounds. Surface these as a labeled section,
   not a footnote.

### Step 5: Report

Write to the output path computed by the CLI handler. Structure per #929 §5:

```markdown
# Best-Practices Audit: <target>

**Generated**: YYYY-MM-DD
**Focus**: <flags or 'all'>
**Depth**: <flag>
**Cite threshold**: <N>

## Executive Summary

<2–4 sentences: what's aligned, what's misaligned, overall confidence>

## Findings

### Finding 1: <claim or decision under review>

- **Current state in project**: <quote/paraphrase with file:line if available>
- **Current industry practice**: <summary>
- **Alignment**: ALIGNED | PARTIAL | DIVERGES | CONTESTED | WEAK SIGNAL
- **Confidence**: high | moderate | low
- **Evidence**:
  - [S1] <source title> — <vendor/standards body/blog>, <date>, <url>
  - [S2] ...
- **Recommendation**: <specific change or 'keep as-is, well-justified by
  current practice'>

(repeat per claim)

## Dissenting Views / Open Debates

<where practitioners disagree and why — empty section is acceptable when
nothing surfaced; do not invent dissent>

## Sources

Full bibliography with retrieval dates. Every source cited above must
appear here with full provenance. No citation appears in Findings without
appearing in Sources.

## Methodology Notes

- Research depth: <quick|standard|deep>
- Recency window: <window>
- Sources excluded: <list, including domains blocked by --exclude>
- Sources unavailable: <list, with reason — e.g. paywalled, 404>
```

## Anti-Hallucination Guardrails (Hard Requirements)

These are **non-negotiable**. Failure to meet any of these breaks the
audit's core value proposition.

1. **No fabricated citations, DOIs, URLs, or quotes.** Every cited URL must
   be the result of a retrieval that returned content at that URL. `citation-guard`
   enforces this; if `citation-guard` is unavailable, the audit must
   surface that fact in Methodology Notes and downgrade overall confidence.
2. **Cite-threshold is enforced, not advisory.** A finding below threshold is
   downgraded to WEAK SIGNAL or dropped — never reported as if the threshold
   were met.
3. **Conflicting sources surface as labeled disagreement.** If sources A and B
   disagree, the report says so explicitly. The audit does not silently
   pick one and pretend consensus.
4. **Sparse signal is reported honestly.** When the corpus is thin or weak,
   the report says so and downgrades confidence. The audit does **not**
   fill the void with the model's training-data priors.
5. **Training-data-only claims are marked.** Any background context the
   audit relies on without a citation is labeled `(no external citation
   verified)` so the reader knows what's grounded vs what's not.
6. **`--validate` mode never generates new findings.** It only re-checks
   claims already present in the target. If a claim's supporting source
   is no longer reachable or has changed, the audit reports that the
   claim is now unverified, not that there's a new claim to make.

## Out of Scope (deferred per #929)

- Cache layer for repeated audits — see deferred tracker #946 (caching applies
  to contributor discovery; research caching is a separate concern but not
  in scope for this skill)
- Auto-ingest into the knowledge-base framework — defer until best-practices-audit
  has been used in anger and we can see whether ingestion is valuable
  (#929 open question 4)
- (Contributor-driven prompt expansion now wired in — see Step 1.5 above. The
  earlier "deferred" note from #943 is resolved by #944.)

## References

- @.aiwg/architecture/decisions/ADR-023-contributor-discovery-convention.md — the contributor convention #944 will wire into this skill
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/find-sources/SKILL.md — source discovery
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-acquire/SKILL.md — source retrieval and processing
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-quality/SKILL.md — GRADE methodology
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/citation-guard/SKILL.md — fabricated-citation detection
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-query/SKILL.md — local corpus queries
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — research-first rule the audit's pipeline implements
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — parallel subagent limits applied during research fan-out
