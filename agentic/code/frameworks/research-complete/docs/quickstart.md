# Research Framework Quickstart

Run a literature search and produce AI-grounded paper summaries in about 20 minutes.

## Installation

```bash
# Install AIWG CLI if not already installed
npm install -g aiwg

# Deploy the Research Framework
aiwg use research

# Verify
aiwg list
# research-complete    installed
```

After installation, eight agents are deployed to your project and the `.aiwg/research/` directory structure is created.

## Your First Literature Review

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

This downloads PDFs, assigns REF-XXX identifiers, validates FAIR compliance, and records SHA-256 checksums. Expect a 90%+ success rate; paywalled papers are flagged rather than skipped silently.

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
4. Validates all claims against the source text
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

Typical results for 50 papers: ~45 acquired (90%), ~3-4 hours of reading replaced by 5-minute summaries per paper.

## Citation Management

Format a citation for a specific paper:

```bash
aiwg research cite REF-025 --format bibtex
aiwg research cite REF-025 --format apa
aiwg research cite REF-025 --format chicago
```

The citation agent supports 9000+ styles. For systematic reviews, it can also build citation networks showing which papers cite each other.

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
