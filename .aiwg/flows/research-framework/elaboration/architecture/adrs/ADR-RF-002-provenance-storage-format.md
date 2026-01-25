# ADR-RF-002: Provenance Storage Format

## Metadata

- **ID**: ADR-RF-002
- **Title**: Provenance Storage Format for Research Artifacts
- **Status**: Accepted
- **Created**: 2026-01-25
- **Updated**: 2026-01-25
- **Decision Makers**: Research Framework Architecture Team
- **Related ADRs**: ADR-RF-001 (Agent Orchestration), ADR-RF-004 (Artifact Storage)

## Context

The Research Framework requires comprehensive provenance tracking to ensure reproducibility (Vision Goal 3) and support external audit/verification. Every research operation (discovery, acquisition, summarization, citation) must be traceable to enable:

1. External researchers to replicate findings exactly
2. Audit trails for research integrity verification
3. Lineage graphs showing artifact derivation
4. Integrity verification via checksums
5. Time-travel queries ("Show provenance at commit X")

### Decision Drivers

1. **W3C PROV Compliance**: NFR-RF-CMP-014 requires compatibility with W3C PROV data model
2. **Reproducibility**: Vision target of >90% external replication success rate
3. **Performance**: NFR-RF-P-01 requires <100ms logging overhead per operation
4. **Storage Efficiency**: NFR-RF-P-02 requires <10MB per 10,000 operations
5. **Interoperability**: Provenance must be usable by external PROV tools
6. **Usability**: Provenance queries should support natural language (NFR-RF-P-08)

### W3C PROV Core Concepts

The W3C PROV standard defines three core types:
- **Entity**: Things with fixed aspects (artifacts, documents, data)
- **Activity**: Actions that occur over time (search, download, summarize)
- **Agent**: Actors responsible for activities (user, software agent, API)

And key relationships:
- `wasGeneratedBy`: Entity created by Activity
- `used`: Activity consumed Entity
- `wasAssociatedWith`: Activity performed by Agent
- `wasAttributedTo`: Entity attributed to Agent
- `wasDerivedFrom`: Entity derived from another Entity

## Decision

**Adopt W3C PROV-JSON as the primary provenance storage format with YAML front-matter for human readability.**

### Format Specification

**Primary Storage**: W3C PROV-JSON in `.aiwg/research/provenance/prov-{timestamp}.json`

**Secondary Index**: Human-readable YAML summary in `.aiwg/research/provenance/index.yaml`

### PROV-JSON Schema

```json
{
  "$schema": "https://www.w3.org/Submission/2013/SUBM-prov-json-20130424/",
  "prefix": {
    "prov": "http://www.w3.org/ns/prov#",
    "aiwg": "https://aiwg.io/research#",
    "xsd": "http://www.w3.org/2001/XMLSchema#"
  },
  "entity": {
    "aiwg:REF-025-summary": {
      "prov:type": "aiwg:Summary",
      "aiwg:sourceId": "REF-025",
      "aiwg:filePath": ".aiwg/research/sources/REF-025-summary.md",
      "aiwg:checksum": "sha256:e3b0c442...",
      "prov:generatedAtTime": "2026-01-25T14:30:00Z"
    }
  },
  "activity": {
    "aiwg:summarize-REF-025": {
      "prov:type": "aiwg:Summarization",
      "aiwg:command": "aiwg research summarize REF-025",
      "aiwg:model": "claude-opus-4-5",
      "aiwg:promptVersion": "1.0.0",
      "prov:startTime": "2026-01-25T14:29:45Z",
      "prov:endTime": "2026-01-25T14:30:00Z"
    }
  },
  "agent": {
    "aiwg:user-jmagly": {
      "prov:type": "prov:Person",
      "aiwg:username": "jmagly"
    },
    "aiwg:documentation-agent": {
      "prov:type": "prov:SoftwareAgent",
      "aiwg:agentType": "DocumentationAgent",
      "aiwg:version": "1.0.0"
    }
  },
  "wasGeneratedBy": {
    "_:wgb1": {
      "prov:entity": "aiwg:REF-025-summary",
      "prov:activity": "aiwg:summarize-REF-025"
    }
  },
  "used": {
    "_:u1": {
      "prov:activity": "aiwg:summarize-REF-025",
      "prov:entity": "aiwg:REF-025-pdf"
    }
  },
  "wasAssociatedWith": {
    "_:waw1": {
      "prov:activity": "aiwg:summarize-REF-025",
      "prov:agent": "aiwg:documentation-agent"
    }
  }
}
```

### YAML Index Schema

```yaml
# .aiwg/research/provenance/index.yaml
# Human-readable provenance summary (auto-generated)

last_updated: "2026-01-25T16:00:00Z"
log_files:
  - file: "prov-2026-01-25.json"
    records: 45
    date_range: ["2026-01-25T10:00:00Z", "2026-01-25T16:00:00Z"]

recent_activities:
  - id: "aiwg:summarize-REF-025"
    type: "Summarization"
    time: "2026-01-25T14:30:00Z"
    agent: "documentation-agent"
    inputs: ["REF-025-pdf"]
    outputs: ["REF-025-summary"]

entity_count:
  pdfs: 25
  summaries: 20
  metadata: 25
  quality_reports: 18

checksum_status:
  verified: 68
  pending: 0
  failed: 0
```

## Consequences

### Positive

1. **W3C PROV Compliance**: Full compatibility with PROV-JSON specification enables interoperability
2. **Tool Interoperability**: Logs can be imported into PROV tools (ProvStore, PROV-O validators, visualization tools)
3. **Human Readable Index**: YAML summary provides quick access without parsing JSON
4. **Schema Validation**: JSON schema enables automated validation of provenance records
5. **Extensibility**: AIWG namespace allows custom attributes while maintaining PROV compatibility
6. **Performance**: Append-only JSON with log rotation meets performance requirements

### Negative

1. **Verbosity**: PROV-JSON is more verbose than custom formats (~20% larger)
2. **Learning Curve**: W3C PROV has specific terminology (Entity, Activity, Agent) that users must learn
3. **Dual Maintenance**: Both JSON and YAML index must stay synchronized
4. **Query Complexity**: Natural language queries require parsing PROV relationships

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| PROV-JSON parsing errors | Low | Medium | Schema validation on write, graceful degradation on read |
| Index desync with logs | Medium | Low | Regenerate index from logs on startup or command |
| Storage growth | Medium | Low | Log rotation (new file every 30 days or 10K records) |
| Query performance | Medium | Medium | Pre-built indexes for common queries (lineage, checksums) |

## Alternatives Considered

### Option A: PROV-N (Textual Notation)

**Description**: W3C PROV-N provides human-readable textual notation for provenance.

**Example**:
```
entity(aiwg:REF-025-summary, [prov:type="aiwg:Summary"])
activity(aiwg:summarize-REF-025, 2026-01-25T14:29:45Z, 2026-01-25T14:30:00Z)
wasGeneratedBy(aiwg:REF-025-summary, aiwg:summarize-REF-025, -)
```

**Pros**:
- More human-readable than JSON
- Compact notation
- W3C standard

**Cons**:
- Less tool support than PROV-JSON
- Harder to parse programmatically
- No native schema validation
- Requires custom parser

**Decision**: Rejected. PROV-JSON has broader tool support and easier programmatic manipulation.

### Option B: Custom YAML Format

**Description**: Define a custom YAML schema for provenance, not following W3C PROV.

**Example**:
```yaml
operations:
  - id: summarize-REF-025
    type: summarization
    timestamp: "2026-01-25T14:30:00Z"
    inputs: [REF-025-pdf]
    outputs: [REF-025-summary]
    agent: documentation-agent
    checksum: "sha256:e3b0c442..."
```

**Pros**:
- Maximum human readability
- Simpler schema
- Easier to edit manually
- Smaller file size

**Cons**:
- No interoperability with PROV tools
- Not compliant with NFR-RF-CMP-014 (W3C PROV)
- Must define and maintain custom schema
- Limited credibility in academic contexts

**Decision**: Rejected. W3C PROV compliance is a strategic requirement for academic credibility and tool interoperability.

### Option C: Embedded Provenance in Artifacts

**Description**: Store provenance metadata within each artifact file (front-matter).

**Example**:
```markdown
---
provenance:
  generated_by: summarize-REF-025
  generated_at: "2026-01-25T14:30:00Z"
  derived_from: REF-025-pdf
  agent: documentation-agent
  checksum: "sha256:e3b0c442..."
---

# Summary of REF-025
...
```

**Pros**:
- Provenance travels with artifact
- No separate log file to maintain
- Natural for Markdown workflows

**Cons**:
- Cannot track operations that don't produce artifacts
- Difficult to query across all artifacts
- Front-matter bloat for complex lineage
- Doesn't capture relationships between artifacts well
- Hard to reconstruct full workflow from scattered metadata

**Decision**: Rejected as primary format. However, artifacts SHOULD include basic provenance in front-matter for discoverability, with full provenance in centralized logs.

### Option D: PROV-O (RDF/OWL Ontology)

**Description**: Use W3C PROV-O with RDF/Turtle serialization.

**Example**:
```turtle
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix aiwg: <https://aiwg.io/research#> .

aiwg:REF-025-summary a prov:Entity ;
    prov:wasGeneratedBy aiwg:summarize-REF-025 ;
    prov:generatedAtTime "2026-01-25T14:30:00Z"^^xsd:dateTime .
```

**Pros**:
- Full semantic web compatibility
- Rich querying via SPARQL
- Most expressive PROV serialization

**Cons**:
- Requires RDF infrastructure (triple store)
- Steeper learning curve
- Heavier tooling requirements
- Overkill for file-based workflow

**Decision**: Rejected for primary storage. PROV-O export will be supported as optional feature for advanced users who need SPARQL queries.

## Implementation Notes

### Log Rotation Policy

Per BR-RF-P-003:
- New log file every 30 days or 10,000 records (whichever first)
- Archived logs compressed (gzip)
- Retention: 5 years (academic standard)

### Checksum Strategy

- Algorithm: SHA-256 (balances security and performance)
- Scope: All generated artifacts (summaries, metadata, exports)
- Verification: On-demand via `aiwg research provenance verify`

### Natural Language Query Support

To support NFR-RF-P-08 (natural language queries), implement query patterns:

```bash
# Example queries mapped to PROV
"Where did REF-025 come from?"
  -> Trace wasDerivedFrom relationships backward

"What operations used REF-025?"
  -> Find all activities where REF-025 appears in 'used'

"Who created the literature review?"
  -> Find wasAssociatedWith agents for relevant activities
```

### Integration with Git

- Provenance logs committed to Git with research artifacts
- Git commit hashes recorded in provenance for time-travel
- Enable queries: "Show provenance at commit abc123"

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-005-track-provenance.md - Provenance tracking use case
- @.aiwg/flows/research-framework/elaboration/nfr/NFR-RF-specifications.md - NFR-RF-CMP-011, NFR-RF-CMP-014
- [W3C PROV-JSON](https://www.w3.org/Submission/prov-json/) - PROV-JSON specification
- [W3C PROV-O](https://www.w3.org/TR/prov-o/) - PROV ontology
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/) - PROV family of specifications

---

**Document Status**: Accepted
**Review Date**: 2026-01-25
**Next Review**: End of Construction Phase
