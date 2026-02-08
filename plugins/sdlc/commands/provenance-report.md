---
description: Generate provenance coverage dashboard and statistics
category: provenance
---

# Provenance Report Command

Generate a dashboard showing provenance tracking coverage, agent attribution, and chain health.

## Instructions

When invoked, generate provenance report:

1. **Count tracked vs untracked artifacts**
   - Scan `.aiwg/` directories for all artifacts
   - Count provenance records in `.aiwg/research/provenance/records/`
   - Calculate coverage percentage

2. **Breakdown by entity type**
   - Categorize: document, code, test, schema, template, agent, command
   - Show tracking percentage per type

3. **Breakdown by agent**
   - Group records by agent URN
   - Count artifacts per agent
   - Show activity types per agent

4. **Chain health metrics**
   - Count broken links
   - Count orphaned records
   - Count missing back-references
   - Calculate chain completeness score

5. **Activity timeline**
   - Recent provenance activities (last 7 days)
   - Most frequently modified artifacts
   - Activity distribution by type

6. **Generate report**
   - Format as markdown dashboard
   - Include tables and summary metrics
   - Optionally save to `.aiwg/reports/provenance-report.md`

## Arguments

- `--brief` - Show summary only
- `--save` - Save report to `.aiwg/reports/provenance-report.md`
- `--since [date]` - Only include activities since date
- `--format [markdown|json]` - Output format (default: markdown)

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/docs/provenance-guide.md - Provenance guide
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
