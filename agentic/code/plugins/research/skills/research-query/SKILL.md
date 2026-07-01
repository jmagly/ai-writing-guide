---
namespace: aiwg
platforms: [all]
name: research-query
description: Search the local research corpus, read matching findings, and synthesize an answer with inline citations to REF-XXX sources. The "query" operation for the research pipeline.
commandHint:
  argumentHint: "<question> [--depth quick|thorough] [--save] [--sources-only] [--max-sources N]"
  allowedTools: Read, Write, Glob, Grep, Bash
  model: sonnet
  category: research-retrieval
---

# Research Query

Ask a question against the local research corpus and get a synthesized answer with inline citations.

## Triggers

- "what does the research say about X?"
- "query the corpus for X"
- "search research for X"
- "what evidence do we have for X?"
- "research query X"
- `/research-query "question"`

## Parameters

### `<question>` (required)
A natural language question to answer from the corpus.

### `--depth` (optional)
Search depth: `quick` (tag + title matching only) or `thorough` (full-text content search). Default: `thorough`.

### `--save` (optional)
Save the synthesized answer as a new artifact in `.aiwg/research/synthesis/`.

### `--sources-only` (optional)
List matching sources without synthesizing an answer.

### `--max-sources` (optional)
Maximum number of sources to read and synthesize from. Default: 10.

## Execution Flow

### Phase 1: Corpus Search

Search the local research corpus for relevant sources:

1. **Tag-based search**: Grep frontmatter `tags:` fields in `.aiwg/research/findings/REF-*.md` for topic matches
2. **Title search**: Match question keywords against `title:` frontmatter fields
3. **Full-text search** (if `--depth thorough`): Search body content of all REF-XXX notes for question terms
4. **Synthesis search**: Also check `.aiwg/research/synthesis/` for existing synthesis on the topic
5. **Knowledge search**: Check `.aiwg/research/knowledge/` for related concept notes

**Search locations (priority order):**

```
.aiwg/research/findings/REF-*.md     # Primary: literature notes
.aiwg/research/synthesis/*.md        # Secondary: existing synthesis
.aiwg/research/knowledge/*.md        # Tertiary: knowledge base entries
```

### Phase 2: Source Reading

For each matching source (up to `--max-sources`):

1. Read the full content of the REF-XXX note
2. Extract:
   - Key claims and findings
   - GRADE quality assessment
   - Methodology and evidence type
   - Related source references
3. Rank by relevance to the question

### Phase 3: Answer Synthesis

Synthesize a comprehensive answer from the matched sources:

1. **Lead with the answer** — state the synthesized finding clearly
2. **Cite inline** — reference specific REF-XXX identifiers with the finding they support
3. **Note evidence quality** — use GRADE-appropriate hedging:
   - HIGH: "Evidence strongly supports..."
   - MODERATE: "Evidence suggests..."
   - LOW: "Limited evidence indicates..."
   - VERY LOW: "Preliminary findings hint at..."
4. **Flag contradictions** — if sources disagree, state both positions with citations
5. **Identify gaps** — if the question touches areas with sparse coverage, note what's missing

**Answer format:**

```markdown
## Answer

[Synthesized answer with inline citations]

Evidence strongly supports that agent orchestration patterns improve
task completion rates by 30-45% compared to single-agent approaches
(REF-012, REF-034). However, this comes with increased latency —
REF-067 measured a 2-3x slowdown for multi-agent coordination on
tasks under 5 minutes. Limited evidence indicates that the breakeven
point is approximately 15 minutes of task complexity (REF-042, GRADE: Low).

### Sources Consulted

| REF | Title | GRADE | Relevance |
|-----|-------|-------|-----------|
| REF-012 | Multi-Agent Orchestration Patterns | High | Direct |
| REF-034 | Agent Coordination Benchmarks | Moderate | Direct |
| REF-067 | Latency Analysis of LLM Pipelines | Moderate | Supporting |
| REF-042 | Cost-Benefit of Agent Architectures | Low | Tangential |

### Evidence Quality
- 1 HIGH, 2 MODERATE, 1 LOW sources
- Overall confidence: MODERATE

### Gaps
- No sources address orchestration in resource-constrained environments
- Missing: longitudinal studies on orchestration pattern stability

### Related Queries
- "What are the latency costs of multi-agent systems?"
- "How does orchestration affect token consumption?"
```

### Phase 4: Save (if --save)

If `--save` is specified, write the answer as a synthesis artifact:

```
.aiwg/research/synthesis/query-<slug>-<date>.md
```

With frontmatter:

```yaml
---
type: query-synthesis
question: "<original question>"
date: YYYY-MM-DD
sources: [REF-012, REF-034, REF-067, REF-042]
confidence: moderate
---
```

## Distinction from Other Skills

| Skill | Purpose | Searches |
|-------|---------|----------|
| `research-query` | Answer questions from corpus | Local corpus only |
| `research-discover` | Find new papers in external databases | External (arXiv, Semantic Scholar) |
| `research-gap` | Identify missing coverage areas | Local corpus (intellectual gaps) |
| `corpus-health` | Check structural integrity | Local corpus (structural health) |
| `research-cite` | Format a citation | Single REF-XXX note |
| `aiwg index query` | Generic artifact search | All `.aiwg/` artifacts |

## Examples

```bash
# Ask a question
/research-query "What are the security risks of LLM agents?"

# Quick search (tags and titles only)
/research-query "prompt injection defenses" --depth quick

# Just list matching sources
/research-query "multi-agent orchestration" --sources-only

# Save the answer as a synthesis artifact
/research-query "What evidence supports HITL gates?" --save

# Limit sources consulted
/research-query "cost optimization strategies" --max-sources 5
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-discover/SKILL.md — External search
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-gap/SKILL.md — Gap analysis
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-cite/SKILL.md — Citation formatting
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/research-status/SKILL.md — Corpus health
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/elaboration/templates/REF-XXX-template.md — REF note format
