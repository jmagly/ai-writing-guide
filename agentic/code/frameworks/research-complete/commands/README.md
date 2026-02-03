# Research-Complete Framework Commands

This directory contains slash commands for the Research-Complete framework, providing comprehensive research corpus management capabilities.

## Commands Overview

| Command | Category | Agent | Description |
|---------|----------|-------|-------------|
| `/research-discover` | Discovery | discovery-agent | Search academic databases for papers |
| `/research-acquire` | Acquisition | acquisition-agent | Download papers and extract metadata |
| `/research-document` | Documentation | documentation-agent | Generate summaries and literature notes |
| `/research-cite` | Citation | citation-agent | Format citations with GRADE-appropriate hedging |
| `/research-quality` | Quality | quality-agent | Perform GRADE evidence quality assessment |
| `/research-archive` | Archival | archival-agent | Package artifacts for long-term preservation |
| `/research-provenance` | Provenance | provenance-agent | Query provenance chains and relationships |
| `/research-workflow` | Workflows | workflow-agent | Execute multi-stage research workflows |
| `/research-status` | Monitoring | workflow-agent | Show corpus health and statistics |
| `/research-gap` | Analysis | workflow-agent | Analyze coverage gaps and suggest research |

## Quick Start

### Discovery to Corpus Workflow

Complete pipeline from search to documented findings:

```bash
# 1. Search for papers
/research-discover "agentic workflows LLM" --limit 10

# 2. Acquire selected papers
/research-acquire 10.48550/arXiv.2308.08155

# 3. Generate documentation
/research-document REF-022 --depth standard

# 4. Assess quality
/research-quality REF-022 --update-frontmatter

# 5. Archive
/research-archive REF-022 --verify
```

### Or Use Automated Workflow

```bash
# Execute entire pipeline with one command
/research-workflow discovery-to-corpus --input '{"query": "agentic workflows"}'
```

## Command Categories

### Discovery (`/research-discover`)

Search across multiple academic databases:
- arXiv
- ACM Digital Library
- IEEE Xplore
- Semantic Scholar
- CrossRef

**Example**:
```bash
/research-discover "agent security vulnerabilities" --source acm --year-from 2020
```

### Acquisition (`/research-acquire`)

Download papers and prepare for corpus:
- Fetch PDF from source
- Extract metadata
- Assign REF-XXX identifier
- Generate finding document template
- Update fixity manifest

**Example**:
```bash
/research-acquire arXiv:2308.08155 --extract-text
```

### Documentation (`/research-document`)

Create comprehensive documentation:
- Parse PDF sections
- Extract key findings with metrics
- Assess AIWG relevance
- Generate literature notes
- Connect to related research

**Depth Levels**:
- `brief` - Executive summary only (~500 words)
- `standard` - Full finding document (~1500 words)
- `comprehensive` - Full document + literature notes (~3000 words)

**Example**:
```bash
/research-document REF-022 --depth comprehensive --include-citations
```

### Citation (`/research-cite`)

Generate policy-compliant citations:
- Format @-mention citations
- Apply GRADE-appropriate hedging language
- Output multiple formats (inline, BibTeX, APA, Chicago)
- Include quality annotations

**Example**:
```bash
/research-cite REF-022 --page 4 --quote "deliberate decision making"
```

### Quality Assessment (`/research-quality`)

Apply GRADE methodology:
- Determine baseline quality from source type
- Apply downgrade/upgrade factors
- Calculate final GRADE level
- Generate hedging recommendations
- Validate existing citations

**Example**:
```bash
/research-quality REF-022 --check-citations --update-frontmatter
```

### Archival (`/research-archive`)

Long-term preservation:
- Create BagIt packages (Library of Congress standard)
- Validate integrity
- Generate archival metadata
- Register in archival index

**Example**:
```bash
/research-archive REF-022 --format bagit --verify
```

### Provenance (`/research-provenance`)

Trace artifact lineage:
- Query derivation chains
- Find citations
- Analyze impact
- Validate provenance completeness
- Export as GraphViz DOT

**Example**:
```bash
/research-provenance REF-022 --query what-derives --export-dot
```

### Workflows (`/research-workflow`)

Execute multi-stage pipelines:

**Built-in Workflows**:
- `discovery-to-corpus` - Full pipeline (5 stages)
- `paper-acquisition` - Download and setup (3 stages)
- `quality-assessment` - GRADE with citation validation (4 stages)
- `corpus-maintenance` - Health checks and updates (6 stages)
- `synthesis-report` - Generate topic synthesis (4 stages)
- `citation-audit` - Validate all citations (3 stages)

**Example**:
```bash
/research-workflow quality-assessment --input '{"ref_id": "REF-022"}'
```

### Status (`/research-status`)

Corpus health monitoring:
- Statistics and metrics
- Completeness checks
- Quality distribution
- Coverage analysis
- Issue detection

**Example**:
```bash
/research-status --detailed --export markdown
```

### Gap Analysis (`/research-gap`)

Identify research needs:
- Topic coverage gaps
- Temporal gaps
- Source type imbalances
- Quality gaps
- Generate search queries

**Example**:
```bash
/research-gap "agent security" --suggest-queries
```

## Workflow Integration

### Human Gates

Commands integrate with HITL (Human-in-the-Loop) gates:

| Workflow | Gates | Purpose |
|----------|-------|---------|
| discovery-to-corpus | Paper selection, Quality approval | Human oversight at key decisions |
| quality-assessment | Assessment review | Validate GRADE levels |

**Gate Options**:
- `[a]` Approve - Continue workflow
- `[r]` Reject - Provide feedback and retry
- `[v]` View - Show detailed artifact summaries
- `[e]` Edit - Open artifact in editor
- `[q]` Quit - Abort workflow

### Provenance Tracking

All commands create W3C PROV-compliant provenance records:

- **Entity** - Artifact created/modified
- **Activity** - Operation performed
- **Agent** - Who/what performed it
- **Relationships** - wasDerivedFrom, wasGeneratedBy, wasAssociatedWith

### Policy Compliance

Commands enforce:
- Citation policy (@.claude/rules/citation-policy.md)
- GRADE hedging requirements
- Metadata completeness (frontmatter-schema.yaml)
- Fixity verification (SHA-256 checksums)

## Command Design Patterns

All commands follow consistent patterns:

### Argument Structure

```bash
/command [primary-arg] [--option value] [--flag]

Examples:
/research-discover "query string" --limit 10 --source arxiv
/research-quality REF-022 --update-frontmatter --check-citations
/research-workflow discovery-to-corpus --input params.yaml
```

### Output Format

All commands provide:
1. **Progress indicators** - Visual feedback during execution
2. **Status updates** - Step-by-step completion
3. **Summary** - Concise results overview
4. **Next steps** - Suggested follow-up actions
5. **File locations** - Absolute paths to created artifacts

### Error Handling

Commands handle errors gracefully:
- Clear error messages
- Remediation suggestions
- Partial completion tracking
- State preservation for resume

## Integration with Agents

Each command invokes one or more agents:

| Agent | Commands Using It | Responsibility |
|-------|-------------------|----------------|
| discovery-agent | research-discover | Database search and ranking |
| acquisition-agent | research-acquire | PDF download and metadata |
| documentation-agent | research-document | Parsing and summarization |
| citation-agent | research-cite | Citation formatting |
| quality-agent | research-quality | GRADE assessment |
| archival-agent | research-archive | BagIt packaging |
| provenance-agent | research-provenance | Provenance queries |
| workflow-agent | research-workflow, research-status, research-gap | Orchestration |

## Testing Commands

Commands can be tested individually or as workflows:

```bash
# Test discovery
/research-discover "test query" --limit 3

# Test acquisition (dry run)
/research-acquire 10.48550/arXiv.2308.08155 --no-metadata

# Test workflow (preview)
/research-workflow discovery-to-corpus --dry-run
```

## Extending Commands

To add new commands:

1. Create `.md` file in this directory
2. Follow existing format (frontmatter + instructions)
3. Reference appropriate agent
4. Add to `manifest.json`
5. Test with sample inputs

## References

- @agentic/code/frameworks/research-complete/agents/ - Agent definitions
- @src/research/services/ - Service implementations
- @.aiwg/research/ - Corpus structure
- @.claude/rules/citation-policy.md - Citation requirements
- @agentic/code/frameworks/sdlc-complete/schemas/research/ - Schemas

## Support

For questions or issues:
- Check command help: `/research-[command] --help`
- Review agent documentation
- See workflow definitions
- Consult research corpus README
