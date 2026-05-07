---
namespace: aiwg
platforms: [all]
name: induct-research
description: Induct research sources (issue, file, directory, or URI) into a research corpus — reads, annotates, and files structured induction tasks. Like address-issues but for research.
commandHint:
  argumentHint: "<target> [--repo <dest>] [--dry-run] [--priority high|medium|low] [--tag <topic>] [--recursive]"
  allowedTools: Read, Write, Glob, Grep, Bash, Agent, WebFetch, WebSearch, mcp__gitea__issue_write, mcp__gitea__issue_read, mcp__gitea__list_issues, mcp__hound__authenticate
  model: sonnet
  category: research
---

# Induct Research

Process one or more research sources — an issue, a file, a directory of papers, or a URI — and file structured induction tasks into a research repository so nothing gets lost. The analogue of `address-issues` for research corpora.

## Kernel Delegation

> As of ADR-021, `induct-research` delegates core ingest mechanics to the semantic memory kernel.

**Delegation pattern**:
1. `induct-research` retains its public name and interactive research-induction UX
2. Internal ingest mechanics delegate to `memory-ingest --consumer research-complete`
3. Research-specific layers remain in this wrapper:
   - GRADE quality assessment (via `ingestRequires: ["grade-quality"]`)
   - Citation validation (via `ingestRequires: ["provenance"]`)
   - Research-specific page templates
4. Cross-references written as `@-mentions` per consumer schema

**What changed**: The ingest pipeline (source reading, page creation, index update, log append) is now handled by `memory-ingest`. This skill adds the research-specific quality and citation layers on top.

**Backward compatibility**: No UX changes. Existing invocations work identically.

@agentic/code/addons/semantic-memory/skills/memory-ingest/SKILL.md

## Triggers

- "induct this paper" → single file induction
- "induct the research queue" → batch directory induction
- "add these references to the research repo" → URI or file-path induction
- "process the research from issue-planner" → induct `.aiwg/research/queue/`
- "induct research into gitea" → named MCP service target
- `/induct-research <target>` → direct invocation

## Parameters

### `<target>` (required)
What to induct. Three formats accepted:

| Format | Example | Behavior |
|--------|---------|----------|
| **File path** | `.aiwg/research/queue/` | Read all `.md` files in the directory |
| **Single file** | `.aiwg/research/queue/ref-dapper.md` | Induct one source |
| **URI** | `https://arxiv.org/abs/2307.09288` | Fetch and induct the paper at that URL |
| **Directory glob** | `papers/**/*.pdf` | Induct all matched files recursively |
| **Issue reference** | `gitea:roctinam/research#42` | Read the issue body as a research stub |

### `--repo <dest>` (optional)
Where to file induction tasks. Accepts the same three formats as `--induct-research` in issue-planner:

| Format | Example | Behavior |
|--------|---------|----------|
| File path | `--repo .aiwg/research/inducted/` | Write task `.md` files locally |
| URI | `--repo https://git.integrolabs.net/roctinam/research` | File issues to that Gitea/GitHub/Jira instance |
| Named MCP | `--repo gitea` | Use `mcp__gitea__issue_write` directly |
| Named MCP | `--repo codehound` | Register in Hound search index |

Falls back to `AIWG_RESEARCH_REPO` env var if `--repo` is omitted.

### `--dry-run` (optional)
List what would be inducted and where, without writing or filing anything.

### `--priority high|medium|low` (optional)
Override the suggested priority for all inducted items. Default: assessed per source.

### `--tag <topic>` (optional)
Apply a topic tag to all inducted items. Repeatable: `--tag llm --tag evaluation`.

### `--recursive` (optional)
When target is a directory, recurse into subdirectories. Default: top-level only.

---

## Execution Flow

### Phase 1: Source Discovery

1. **Parse `<target>`** — determine input type (file, directory, URI, issue ref)
2. **Collect sources**:
   - **File/directory**: glob for `.md`, `.pdf`, `.txt`, `.yaml` files
   - **URI**: fetch the resource; detect type (paper, doc page, repo, issue)
   - **Issue reference**: fetch issue body and all comments via MCP or CLI
3. **Deduplicate** — skip sources already present in the destination repo (if queryable)
4. **Report discovery**:

```
Found 9 sources to induct:
  3 Markdown stubs (.aiwg/research/queue/)
  4 PDF papers (papers/2024/)
  2 URI references
  Skipping 1 (already inducted: REF-042)
```

---

### Phase 2: Source Acquisition (acquire before analyze)

**CRITICAL**: Never write analysis docs from metadata or abstracts alone. The pipeline is:
**acquire full content → read full content → write analysis doc.**

This was learned from a session where 88 of 120 papers were inducted as shallow stubs
written from arXiv abstract pages — not the actual papers. See #817.

For each source, ensure full content is available before analysis:

**For PDFs / full papers**:
1. **Acquire the PDF** — call `/research-acquire <url> --extract-text` to download the PDF
   to `sources/pdfs/full/` and extract full text to `sources/text/`
2. **Verify acquisition** — confirm the PDF exists at the expected path and is non-empty
3. **If PDF unavailable** (paywall, dead link): mark as `acquisition-failed` in frontmatter,
   file a stub with `status: pending-acquisition`, and skip to next source.
   Do NOT write a full analysis doc from the abstract alone.

**For URIs (web sources)**:
1. **Fetch the full page** (WebFetch) — save to `sources/web/<slug>.html`
2. **Classify**: paper, blog post, official docs, repo README, specification, news
3. **If paper**: call `/research-acquire` to get the actual PDF — do not analyze from
   the landing page HTML
4. **If non-paper web source**: the fetched HTML/text is the full content — proceed to analysis

**For Markdown stubs** (from issue-planner queue files):
- Read the stub content and relevance summary
- If the stub references a paper URL: acquire the PDF first (same as above)
- If the stub is a research brief with no external source: proceed as-is

**For issue references**:
- Read full issue body and comments
- Extract referenced URLs, files, or topics
- If URLs point to papers: acquire PDFs before analysis
- If no external sources: treat as a research brief stub

### Phase 2.5: Per-Source Analysis (on full content)

Only after full content is acquired, run analysis:

**For PDFs / full papers** (with full text available):
- Read the **full extracted text**, not just the abstract
- Extract title, authors, year, abstract, methodology, key findings, limitations
- Identify key claims with specific evidence (quotes, figures, tables)
- Assess relevance to existing corpus (check `.aiwg/research/` for related REF-XXX files)
- Assign GRADE quality level (A–D) based on source type and peer-review status
- Target: analysis docs should be 150-300 lines with substantive content from the paper

**For web sources** (with full content saved):
- Read the full saved page content
- Extract key points, methodology if applicable, credibility indicators
- Assess relevance and quality

**Quality gate**: If the resulting analysis doc is under 80 lines, flag it as a potential
stub. Either the source content wasn't fully read or the analysis was superficial.
Consider re-running with explicit instructions to read the full text.

---

### Phase 3: Induction Task Filing

For each analyzed source, file one induction task using the standard template.

**Induction task body:**

```markdown
## Reference Induction

**Source**: <URL, file path, or issue reference>
**Type**: <paper | blog | docs | repo | spec | stub | issue>
**GRADE**: <A | B | C | D | unassessed>
**Priority**: <high | medium | low>
**Tags**: <topic1>, <topic2>

## Summary
<2–3 sentences: what this source covers and why it's relevant>

## Key Claims / Findings
- <Specific claim or finding>
- <Specific claim or finding>
- <Specific claim or finding>

## Relevance to Corpus
<How this relates to existing research — cross-references to REF-XXX if applicable>

## Induction Checklist
- [ ] Read full source
- [ ] Extract key insights as Zettelkasten notes
- [ ] Cross-reference with existing corpus
- [ ] Assign REF-XXX identifier
- [ ] Tag with topic taxonomy
- [ ] Assess with /research-quality
- [ ] Archive with /research-archive (if paper/PDF)
- [ ] Add to citation graph with /research-cite

## Origin
- Surfaced by: <issue-planner | manual | other>
- Surfaced for: <objective or context>
- Induction date: <YYYY-MM-DD>
```

**Filing based on `--repo` target:**

- **File path**: write `induct-<slug>.md` to destination directory
- **Gitea URI/MCP**: `mcp__gitea__issue_write` with label `research-induction`
- **GitHub URI**: `gh issue create --label research-induction`
- **Jira URI**: REST `POST /rest/api/2/issue` with issue type Task
- **Codehound MCP**: register URI in search index, create stub document

---

### Phase 3.5: Cross-Reference Fan-Out

After creating each new literature note, update the broader corpus with bidirectional cross-references. This is what makes a corpus **compound** rather than just accumulate.

For each newly inducted source:

1. **Search existing findings** for topically related REF-XXX notes:
   - Match by shared tags
   - Match by overlapping key claims or methodologies
   - Match by citation overlap (both cite the same sources)

2. **Add "Related Sources" cross-references**:
   - In the **new note**: add a `## Related Sources` section listing existing REF-XXX notes and how they relate (confirms, contradicts, extends, prerequisite)
   - In **existing notes**: append the new REF-XXX to their `## Related Sources` section with relationship type

3. **Flag contradictions or confirmations**:
   - If the new source contradicts an existing finding, add a `contradiction` marker to both notes
   - If it confirms an existing finding, add a `confirms` marker

4. **Update synthesis documents** in `.aiwg/research/synthesis/`:
   - If a relevant synthesis document exists, append a note that new evidence is available

**Example cross-reference entry:**

```markdown
## Related Sources

- **REF-034** — Confirms: both identify prompt injection as the primary attack vector for LLM agents
- **REF-042** — Extends: this source adds quantitative benchmarks missing from REF-042's qualitative analysis
- **REF-067** — Contradicts: claims agent sandboxing overhead is <5%, while REF-067 measured 15-20%
```

**Batch optimization**: When inducting multiple sources in a batch, defer cross-referencing until all new notes are created, then run a single fan-out pass across all new + existing notes. This avoids redundant searches.

**Skip conditions**: Skip cross-referencing when:
- `--dry-run` is set
- Source is filed as a stub (not yet fully documented)
- Fewer than 3 existing REF-XXX notes in the corpus (too early for meaningful cross-refs)

---

### Phase 4: Summary Report

```
## Induction Summary

| # | Source | Type | Priority | Filed At |
|---|--------|------|----------|----------|
| 1 | RFC 9110 HTTP Semantics | spec | high | gitea#301 |
| 2 | "Dapper" Google Tracing Paper | paper | high | gitea#302 |
| 3 | opentelemetry.io/docs | docs | medium | gitea#303 |
| 4 | github.com/jaegertracing/jaeger | repo | medium | gitea#304 |
| 5 | arxiv.org/abs/2012.15161 | paper | low | gitea#305 |
...

Inducted: 9
Skipped: 1 (already present)
Destination: gitea:roctinam/research

Next steps:
- /research-acquire <URL> for any paper that needs PDF download
- /research-document to annotate inducted sources
- /research-quality to score GRADE for each inducted item
```

---

## Target Resolution Logic

```
resolve_target(target):
  if target starts with "http://" or "https://":
    host = extract_host(target)
    if host matches known_gitea_instances: use mcp__gitea__issue_write
    if host == "github.com": use gh CLI
    if host matches jira pattern: use Jira REST API
    else: fetch as web resource, induct as URI reference

  elif target matches "gitea:<owner>/<repo>#<n>":
    fetch issue via mcp__gitea__issue_read

  elif target is a named MCP service ("gitea", "codehound", "github"):
    use that service's write/register tool directly

  elif target is a file path:
    if path is directory: glob for .md/.pdf/.txt files
    if path is a file: induct single source
```

---

## Batch Mode — Directory of Papers

When target is a directory, process all supported files:

```
/induct-research papers/2024/ --repo gitea --tag llm --recursive
```

```
⏳ Scanning papers/2024/ (recursive)...
  Found 23 PDF files
  Found 7 Markdown stubs
  Found 2 YAML records
  Deduplicating against gitea:roctinam/research...
    Skipping 4 (already inducted)

⏳ Analyzing 28 sources (parallel agents)...
  ✓ Batch A (7 sources): complete
  ✓ Batch B (7 sources): complete
  ✓ Batch C (7 sources): complete
  ✓ Batch D (7 sources): complete

⏳ Filing 28 induction tasks to gitea:roctinam/research...
✓ Inducted: 28 | Skipped: 4 | Total: 32
```

---

## Integration with issue-planner

`issue-planner --induct-research <target>` calls this skill's Phase 3 (filing) logic directly after Phase 2 research synthesis. The references are the URLs and sources discovered during the parallel research pass.

`/induct-research` can also be invoked standalone to process:
- Pre-existing queues: `/induct-research .aiwg/research/queue/`
- Ad-hoc papers: `/induct-research https://arxiv.org/abs/2307.09288`
- Full directories: `/induct-research ~/Downloads/papers/ --repo gitea`

---

## Composition

```
induct-research <target>
    │
    ├── Phase 1: Source discovery
    │   ├── File/directory: glob + read
    │   ├── URI: WebFetch + classify
    │   └── Issue ref: mcp__gitea__issue_read or gh CLI
    ├── Phase 2: Source acquisition (acquire before analyze)
    │   ├── PDF/paper → /research-acquire --extract-text
    │   ├── URI → WebFetch full page → /research-acquire if paper
    │   ├── Stub with URL → acquire referenced source
    │   └── Skip analysis if acquisition fails (mark pending-acquisition)
    ├── Phase 2.5: Per-source analysis (on full content only)
    │   ├── PDF agent → read full text, extract claims + GRADE
    │   ├── Web agent → read full saved page, assess credibility
    │   ├── Stub agent → parse relevance summary
    │   └── Quality gate: flag docs under 80 lines as potential stubs
    ├── Phase 3: Induction task filing
    │   ├── File path → write .md task files
    │   ├── Gitea URI/MCP → mcp__gitea__issue_write
    │   ├── GitHub URI → gh issue create
    │   └── Codehound MCP → register in search index
    ├── Phase 3.5: Cross-reference fan-out
    │   ├── Search existing findings by tags + claims
    │   ├── Add bidirectional Related Sources sections
    │   ├── Flag contradictions / confirmations
    │   └── Update synthesis documents
    └── Phase 4: Summary report
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/issue-planner/SKILL.md — Calls induct-research during Phase 2b
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-acquire/SKILL.md — Full PDF acquisition (called for paper URIs)
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-document/SKILL.md — Annotate inducted sources
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-quality/SKILL.md — GRADE scoring for inducted items
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md — Analogous pattern for code issues
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Parallel batch analysis constraints

## Storage Routing (#934, #968)

This skill's persistence flows through `resolveStorage('research')`. On the default `fs` backend the research corpus lives at `.aiwg/research/`. **Heavy artifacts (papers, archived sources) can move to a secondary drive** by setting `roots.research` in `.aiwg/storage.config` (one of the headline #934 use cases).

```bash
aiwg research-store path                            # resolved root
aiwg research-store list --prefix sources/
aiwg research-store get sources/paper-123.md
```
