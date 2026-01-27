---
description: Validate provenance records and chains for completeness and consistency
category: provenance
---

# Provenance Validate Command

Validate provenance records against the PROV schema and verify chain integrity.

## Instructions

When invoked, validate provenance:

1. **Load records**
   - Scan `.aiwg/research/provenance/records/` for all `.prov.yaml` files
   - If specific path provided, validate only that record

2. **Schema validation**
   - Validate each record against `@.aiwg/research/provenance/schemas/prov-record.yaml`
   - Check required fields: entity.id, activity.id, agent.id
   - Verify URN format compliance
   - Verify timestamps are valid ISO-8601

3. **Entity resolution**
   - For each entity URN, verify the referenced file exists
   - Flag orphaned records (file deleted but provenance remains)
   - Detect untracked artifacts (files in tracked directories without provenance)

4. **Chain integrity**
   - Verify wasDerivedFrom sources exist and have their own provenance
   - Check bidirectional links (forward references have matching back-references)
   - Detect broken chains (missing intermediate records)

5. **Completeness check**
   - Scan `.aiwg/` directories for artifacts without provenance records
   - Calculate coverage percentage
   - List untracked artifacts

6. **Fix mode (--fix)**
   - Remove orphaned provenance records
   - Create stub records for untracked artifacts
   - Add missing bidirectional references

7. **Report**
   - Display validation results table
   - Show pass/fail/warning counts
   - List specific issues with remediation steps

## Arguments

- `[path]` - Specific record or directory to validate (default: all records)
- `--all` - Validate all records and check completeness
- `--strict` - Treat warnings as errors
- `--fix` - Auto-fix issues where possible
- `--report [path]` - Save validation report to file

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @.aiwg/research/provenance/schemas/prov-record.yaml - PROV record schema
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
