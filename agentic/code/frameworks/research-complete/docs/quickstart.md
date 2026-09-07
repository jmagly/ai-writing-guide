# Research Framework Quickstart

> **First time using AIWG?** Begin with [Install, Connect, and
Verify](../../getting-started/install-connect-verify.md). This guide assumes AIWG is already installed and connected
to the target project.

Use the research framework when you want an AI assistant to keep sources,
summaries, claims, and gaps tied to reviewable research artifacts.

## Installation

```bash
# Deploy the research framework
aiwg use research

# Verify
aiwg list
# research-complete    installed
```

`aiwg use` refreshes shared project context and prints any provider reload step
needed before the assistant sees the framework. After installation, research
artifacts are written under `.aiwg/research/`.

## First Literature Review

Start with a prompt that asks for a concrete research artifact:

```text
Use AIWG's research framework to scope a literature review on LLM agent safety.
Produce a search strategy, inclusion criteria, a first result set, and the
gaps or risks I should review before acquisition.
```

Success means the agent returns or saves a search strategy with source
selection criteria, cites the result files it created, and identifies the next
review decision.

### Step 1: Discover Papers

Search using natural language:

```bash
aiwg research search "LLM agent safety alignment" --year 2022-2024 --limit 50
```

Output files:
- `.aiwg/research/discovery/search-results-{timestamp}.json` — All results with relevance scores
- `.aiwg/research/discovery/search-strategy.md` — Search strategy documentation (for PRISMA compliance)
- `.aiwg/research/discovery/gap-report-{timestamp}.md` — Under-researched topics detected
- `.aiwg/research/discovery/acquisition-queue.json` — Papers ready for download

The discovery agent ranks results by: relevance (40%), citation count (30%), venue quality (20%), recency (10%).

To include citation network traversal (papers citing your results and papers they cite):

```bash
aiwg research search "retrieval augmented generation" --citation-network
```

### Step 2: Acquire Papers

Download papers from the acquisition queue:

```bash
aiwg research acquire --from-queue
```

This downloads available PDFs, assigns REF-XXX identifiers, records metadata,
and stores SHA-256 checksums. Paywalled or unavailable papers should be flagged
for review rather than skipped silently.

For a paywalled paper you have locally:

```bash
aiwg research acquire --upload /path/to/paper.pdf --ref REF-027
```

For a single paper by its ID:

```bash
aiwg research acquire REF-025
```

If some downloads failed:

```bash
aiwg research acquire --retry-failed
```

### Step 3: Summarize Papers

```bash
aiwg research summarize --from-acquired
```

For each acquired PDF, the documentation agent:
1. Extracts text (with OCR for scanned papers if needed)
2. Produces a 1-sentence, 1-paragraph, and 1-page summary
3. Extracts structured data: claims, methods, datasets, key findings
4. Flags claims that need source review
5. Creates a Zettelkasten-style literature note

Output for each paper:
- `.aiwg/research/knowledge/summaries/REF-XXX-summary.md`
- `.aiwg/research/knowledge/extractions/REF-XXX-extraction.json`
- `.aiwg/research/knowledge/notes/REF-XXX-literature-note.md`

For a single paper:

```bash
aiwg research summarize REF-025
```

### Step 4: Review the Gap Analysis

```bash
cat .aiwg/research/discovery/gap-report-latest.md
```

The gap report identifies topic clusters with few papers — potential research opportunities or areas where your search terms need refinement.

## Complete Workflow: 4 Commands

```bash
aiwg research search "your topic" --year 2022-2024 --limit 50
aiwg research acquire --from-queue
aiwg research summarize --from-acquired
cat .aiwg/research/discovery/gap-report-latest.md
```

Use the resulting files as a review queue. Acquisition coverage and summary
quality depend on source access, paper format, and configured review gates.

## Citation Management

Format a citation for a specific paper:

```bash
aiwg research cite REF-025 --format bibtex
aiwg research cite REF-025 --format apa
aiwg research cite REF-025 --format chicago
```

The citation agent supports common citation styles. For systematic reviews, it
can also build citation networks showing which papers cite each other.

## Quality Assessment

Assess a paper's evidence quality:

```bash
aiwg research quality REF-025
```

Produces a GRADE assessment (High/Moderate/Low/Very Low) with justification. Useful for systematic reviews where you need to rate the body of evidence.

## Configuration

The framework reads agent config from `.aiwg/research/config/`. Key settings:

**Adjust search ranking** in `discovery-agent.yaml`:
```yaml
discovery_agent:
  ranking:
    relevance_weight: 0.40   # Natural language similarity
    citation_weight: 0.30    # Citation count (popularity proxy)
    venue_weight: 0.20       # Journal/conference quality
    recency_weight: 0.10     # How recent the paper is
```

**Set download concurrency** in `research-acquisition-agent.yaml`:
```yaml
acquisition_agent:
  download:
    concurrent_downloads: 5
    timeout_seconds: 60
```

**Configure summarization strictness** in `documentation-agent.yaml`:
```yaml
documentation_agent:
  hallucination:
    enabled: true
    confidence_threshold: 0.9    # Claims below this are flagged for review
    user_review_required: true   # Pause on flagged claims
```

## Troubleshooting

**Empty search results**: Check API connectivity with `aiwg research discovery --health-check`. Consider reformulating your query — semantic search works best with natural language rather than keyword combinations.

**Rate limit errors**: Set a Semantic Scholar API key for higher limits:
```bash
export SEMANTIC_SCHOLAR_API_KEY="your-api-key"
```
The framework automatically falls back to arXiv and CrossRef when the primary API is unavailable.

**Hallucination detected**: Review the flagged content in `.aiwg/research/knowledge/logs/REF-XXX-hallucination-detected.log`. Re-run with `--strict-validation` to regenerate with tighter checks.

**Scanned PDFs with poor text extraction**: Add `--ocr` flag:
```bash
aiwg research summarize REF-025 --ocr
```

## References

- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/docs/overview.md` — Framework overview
- `@$AIWG_ROOT/agentic/code/frameworks/research-complete/agents/` — Agent definitions
