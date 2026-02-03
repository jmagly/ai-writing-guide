---
description: Search for research papers across academic databases
category: research-discovery
argument-hint: "[search query] [--source database] [--limit n]"
---

# Research Discover Command

Search for relevant research papers across academic databases (arXiv, ACM, IEEE, Semantic Scholar, CrossRef).

## Instructions

When invoked, perform systematic literature search:

1. **Parse Query**
   - Accept natural language search query
   - Extract key terms and constraints
   - Identify domain context (ML, software engineering, HCI, etc.)

2. **Select Databases**
   - Default: Search all available databases
   - If `--source` specified, use only that database
   - Prioritize databases by domain relevance

3. **Execute Search**
   - Query each database API
   - Apply filters: publication year, source type, quality indicators
   - Collect results with metadata (title, authors, DOI, abstract)

4. **Rank Results**
   - Score by relevance to query
   - Score by citation count
   - Score by source quality (journal tier, conference rank)
   - Score by recency
   - Calculate composite relevance score

5. **Present Results**
   - Display top N results (default: 10)
   - Show title, authors, year, source, DOI
   - Show relevance score and brief abstract snippet
   - Provide acquisition options for high-value papers

## Arguments

- `[query]` - Search query (required)
- `--source [arxiv|acm|ieee|semantic-scholar|crossref|all]` - Database to search (default: all)
- `--limit [n]` - Maximum results to return (default: 10)
- `--year-from [yyyy]` - Filter results from year onwards
- `--year-to [yyyy]` - Filter results to year
- `--min-citations [n]` - Minimum citation count threshold
- `--output [table|json|yaml]` - Output format (default: table)

## Examples

```bash
# Basic search across all databases
/research-discover "agentic workflows LLM"

# Search specific database with filters
/research-discover "test-driven development effectiveness" --source acm --year-from 2020 --min-citations 50

# Comprehensive search with high limit
/research-discover "cognitive load theory UI design" --limit 25 --output yaml
```

## Expected Output

```
Search Results: "agentic workflows LLM" (10 results, sorted by relevance)

┌─────┬───────────────────────────────────────────┬──────────┬───────────┬──────────┐
│ #   │ Title                                     │ Authors  │ Year      │ Score    │
├─────┼───────────────────────────────────────────┼──────────┼───────────┼──────────┤
│ 1   │ AutoGen: Enabling Next-Gen LLM Apps...   │ Wu et al.│ 2023      │ 0.95     │
│     │ DOI: 10.48550/arXiv.2308.08155            │          │ arXiv     │ 234 cit. │
├─────┼───────────────────────────────────────────┼──────────┼───────────┼──────────┤
│ 2   │ The Landscape of Emerging AI Agent...    │ Wang et  │ 2024      │ 0.89     │
│     │ DOI: 10.48550/arXiv.2404.11584            │          │ arXiv     │ 89 cit.  │
├─────┼───────────────────────────────────────────┼──────────┼───────────┼──────────┤
...

Actions:
- Use /research-acquire [DOI] to download papers
- Use /research-quality [DOI] to assess source quality
- Results saved to .aiwg/research/search-cache/results-[timestamp].yaml
```

## Workflow Integration

This command integrates with the research workflow:

1. **Discovery** ← You are here
2. Use `/research-acquire` to download selected papers
3. Use `/research-document` to create summaries
4. Use `/research-quality` to assess evidence quality
5. Use `/research-cite` to generate citations

## References

- @agentic/code/frameworks/research-complete/agents/discovery-agent.md - Discovery Agent
- @agentic/code/frameworks/research-complete/docs/database-apis.md - Supported databases
- @src/research/services/discovery-service.ts - Search implementation
- @.aiwg/research/README.md - Research corpus structure
