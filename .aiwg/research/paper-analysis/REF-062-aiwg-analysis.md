# REF-062 AIWG Analysis: W3C PROV Data Model

**Source**: @docs/references/REF-062-w3c-prov.md

**Paper**: W3C (2013). PROV-DM: The PROV Data Model. W3C Recommendation 30 April 2013.

**AIWG Relevance**: MEDIUM - Provides W3C Recommendation standard vocabulary for provenance tracking; implements FAIR R1.2 and OAIS PDI-Provenance requirements.

---

## AIWG Concept Mapping

### W3C PROV → AIWG Implementation

| PROV Concept | AIWG Implementation | Coverage |
|--------------|---------------------|----------|
| **Entity** | REF-XXX docs, PDFs, claims | **Strong** |
| **Activity** | Acquisition, documentation | **Strong** |
| **Agent** | Research agents, human reviewers | **Strong** |
| `wasDerivedFrom` | Summary ← PDF | **Partial** |
| `wasGeneratedBy` | Document ← Activity | **Partial** |
| `wasAssociatedWith` | Activity ← Agent | **Partial** |
| `used` | Activity → Input | **Partial** |
| PROV-N notation | Human-readable logs | **Weak** |
| PROV-JSON | Machine-readable export | **Weak** |

### The Entity-Activity-Agent Triangle

```
          ┌─────────────┐
          │   Entity    │ ← What was created?
          │ (Artifacts) │   REF-XXX.md, PDFs, claims
          └──────┬──────┘
                 │ wasGeneratedBy / wasDerivedFrom
                 ▼
          ┌─────────────┐
          │  Activity   │ ← How was it created?
          │ (Operations)│   acquisition, documentation
          └──────┬──────┘
                 │ wasAssociatedWith
                 ▼
          ┌─────────────┐
          │    Agent    │ ← Who created it?
          │  (Actors)   │   agents, humans
          └─────────────┘
```

---

## PROV Relations for AIWG

### Entity Relations

| Relation | Meaning | AIWG Example |
|----------|---------|--------------|
| `wasDerivedFrom` | Entity created from another | REF-056-analysis.md ← REF-056.pdf |
| `wasGeneratedBy` | Entity produced by activity | REF-056.md ← documentation-op |
| `wasAttributedTo` | Entity attributed to agent | REF-056.md ← documentation-agent |
| `alternateOf` | Different views of same thing | PDF vs Markdown versions |
| `specializationOf` | More specific version | AIWG analysis vs generic summary |

### Activity Relations

| Relation | Meaning | AIWG Example |
|----------|---------|--------------|
| `used` | Activity used an entity | documentation used REF-056.pdf |
| `wasInformedBy` | Activity used output of another | analysis informed by documentation |
| `wasAssociatedWith` | Activity associated with agent | acquisition ← acquisition-agent |

### Agent Relations

| Relation | Meaning | AIWG Example |
|----------|---------|--------------|
| `actedOnBehalfOf` | Agent delegated by another | agent acts for user |

---

## Provenance Record Implementation

### PROV-Compliant YAML Schema

```yaml
# .aiwg/research/provenance/op-2026-01-25-001.yaml
provenance:
  # Entities - What was created/used?
  entities:
    - id: "entity:REF-056-pdf"
      type: "prov:Entity"
      aiwg_type: "pdf"
      location: "pdfs/full/REF-056-wilkinson-2016-fair.pdf"
      generated_at: "2026-01-25T10:00:00Z"

    - id: "entity:REF-056-doc"
      type: "prov:Entity"
      aiwg_type: "reference_document"
      location: "docs/references/REF-056-fair-guiding-principles.md"
      wasDerivedFrom: "entity:REF-056-pdf"
      wasGeneratedBy: "activity:documentation-001"
      wasAttributedTo: "agent:documentation-agent"

    - id: "entity:REF-056-analysis"
      type: "prov:Entity"
      aiwg_type: "aiwg_analysis"
      location: ".aiwg/research/paper-analysis/REF-056-aiwg-analysis.md"
      wasDerivedFrom: "entity:REF-056-doc"
      wasGeneratedBy: "activity:analysis-001"
      wasAttributedTo: "agent:analysis-agent"

  # Activities - How was it created?
  activities:
    - id: "activity:acquisition-001"
      type: "prov:Activity"
      aiwg_type: "paper_acquisition"
      startedAtTime: "2026-01-25T09:55:00Z"
      endedAtTime: "2026-01-25T10:00:00Z"
      used:
        - source_url: "https://doi.org/10.1038/sdata.2016.18"
      generated:
        - "entity:REF-056-pdf"
      wasAssociatedWith: "agent:acquisition-agent"

    - id: "activity:documentation-001"
      type: "prov:Activity"
      aiwg_type: "reference_documentation"
      startedAtTime: "2026-01-25T10:00:00Z"
      endedAtTime: "2026-01-25T10:15:00Z"
      used:
        - "entity:REF-056-pdf"
      generated:
        - "entity:REF-056-doc"
      wasInformedBy: "activity:acquisition-001"
      wasAssociatedWith: "agent:documentation-agent"

    - id: "activity:analysis-001"
      type: "prov:Activity"
      aiwg_type: "aiwg_analysis"
      startedAtTime: "2026-01-25T10:15:00Z"
      endedAtTime: "2026-01-25T10:45:00Z"
      used:
        - "entity:REF-056-doc"
        - "entity:REF-056-pdf"
      generated:
        - "entity:REF-056-analysis"
      wasInformedBy: "activity:documentation-001"
      wasAssociatedWith: "agent:analysis-agent"

  # Agents - Who created it?
  agents:
    - id: "agent:acquisition-agent"
      type: "prov:SoftwareAgent"
      aiwg_type: "research-acquisition"
      version: "1.0.0"
      model: "claude-3-opus"

    - id: "agent:documentation-agent"
      type: "prov:SoftwareAgent"
      aiwg_type: "documentation-agent"
      version: "1.0.0"
      model: "claude-3-opus"

    - id: "agent:analysis-agent"
      type: "prov:SoftwareAgent"
      aiwg_type: "research-analysis"
      version: "1.0.0"
      model: "claude-3-opus"
```

### Human-Readable PROV-N Log

```
# .aiwg/research/provenance/operations.log

2026-01-25T10:00:00Z entity(entity:REF-056-pdf)
2026-01-25T10:00:00Z activity(activity:acquisition-001) used(url:doi.org/10.1038/sdata.2016.18)
2026-01-25T10:00:00Z entity(entity:REF-056-pdf) wasGeneratedBy(activity:acquisition-001)
2026-01-25T10:00:00Z activity(activity:acquisition-001) wasAssociatedWith(agent:acquisition-agent)

2026-01-25T10:15:00Z activity(activity:documentation-001) used(entity:REF-056-pdf)
2026-01-25T10:15:00Z entity(entity:REF-056-doc) wasGeneratedBy(activity:documentation-001)
2026-01-25T10:15:00Z entity(entity:REF-056-doc) wasDerivedFrom(entity:REF-056-pdf)
2026-01-25T10:15:00Z activity(activity:documentation-001) wasAssociatedWith(agent:documentation-agent)

2026-01-25T10:45:00Z activity(activity:analysis-001) used(entity:REF-056-doc)
2026-01-25T10:45:00Z entity(entity:REF-056-analysis) wasGeneratedBy(activity:analysis-001)
2026-01-25T10:45:00Z entity(entity:REF-056-analysis) wasDerivedFrom(entity:REF-056-doc)
2026-01-25T10:45:00Z activity(activity:analysis-001) wasAssociatedWith(agent:analysis-agent)
```

---

## Derivation Chain Tracking

### Example: REF-056 Complete Chain

```
Original Paper (nature.com/articles/sdata201618)
  │
  │ wasDerivedFrom (via download)
  ▼
REF-056-wilkinson-2016-fair.pdf
  │
  │ wasDerivedFrom (via documentation)
  ▼
REF-056-fair-guiding-principles.md
  │
  │ wasDerivedFrom (via analysis)
  ▼
REF-056-aiwg-analysis.md
  │
  │ wasDerivedFrom (via citation)
  ▼
Citable Claim in AIWG documentation
```

### Query Examples

```bash
# Trace derivation chain for an artifact
aiwg provenance trace REF-056-aiwg-analysis.md

# Output:
# Derivation Chain for REF-056-aiwg-analysis.md
# ─────────────────────────────────────────────
#
# REF-056-aiwg-analysis.md
#   ← wasDerivedFrom: REF-056-fair-guiding-principles.md
#     ← wasDerivedFrom: REF-056-wilkinson-2016-fair.pdf
#       ← wasDerivedFrom: https://doi.org/10.1038/sdata.2016.18
#
# Chain depth: 3
# Chain verified: ✓

# Find all entities derived from a source
aiwg provenance derived-from REF-056-pdf

# Output:
# Entities derived from REF-056-wilkinson-2016-fair.pdf:
# - REF-056-fair-guiding-principles.md (direct)
# - REF-056-aiwg-analysis.md (indirect, depth 2)
# - claims-index.md#fair-principles (indirect, depth 3)
```

---

## Provenance Query Patterns

### Standard Questions PROV Answers

| Question | PROV Query | AIWG Command |
|----------|------------|--------------|
| "What was this derived from?" | Find `wasDerivedFrom` | `aiwg provenance source <entity>` |
| "Who generated this?" | Activity → Agent | `aiwg provenance agent <entity>` |
| "What did this activity produce?" | Find `wasGeneratedBy` | `aiwg provenance outputs <activity>` |
| "What activities used this?" | Find `used` | `aiwg provenance usage <entity>` |
| "Show complete history" | Full derivation chain | `aiwg provenance trace <entity>` |

### Implementation

```bash
# Query: Who generated this document?
aiwg provenance agent REF-056-aiwg-analysis.md

# Output:
# Agent Attribution for REF-056-aiwg-analysis.md
#
# Generated by: activity:analysis-001
# Agent: agent:analysis-agent
# Type: prov:SoftwareAgent
# Model: claude-3-opus
# Timestamp: 2026-01-25T10:45:00Z

# Query: What inputs were used?
aiwg provenance inputs activity:analysis-001

# Output:
# Inputs for activity:analysis-001
#
# - entity:REF-056-doc (reference document)
# - entity:REF-056-pdf (source PDF)
```

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Create Provenance Directory Structure

```
.aiwg/research/provenance/
├── records/              # Individual PROV records (YAML)
│   ├── op-2026-01-25-001.yaml
│   └── op-2026-01-25-002.yaml
├── operations.log        # Human-readable PROV-N log
├── entities.yaml         # Entity registry
├── activities.yaml       # Activity registry
└── agents.yaml           # Agent registry
```

#### 2. Auto-Generate Provenance on Operations

Every research operation creates a provenance record:

```python
# Pseudocode for provenance generation
def record_provenance(operation):
    record = {
        "id": generate_operation_id(),
        "timestamp": now(),
        "activity": {
            "type": operation.type,
            "used": operation.inputs,
            "generated": operation.outputs
        },
        "agent": {
            "type": operation.agent.type,
            "version": operation.agent.version
        }
    }
    save_to_provenance_dir(record)
    append_to_operations_log(record)
```

#### 3. Add Provenance to REF-XXX Documents

Include provenance section:

```markdown
## Provenance

| Aspect | Value |
|--------|-------|
| Derived from | [source URL/REF] |
| Generated by | [activity] |
| Agent | [agent name and version] |
| Timestamp | [ISO 8601] |

Full provenance: `.aiwg/research/provenance/op-XXXX.yaml`
```

### Short-Term (Enhancement)

#### 4. PROV-JSON Export

Export provenance for external tools:

```bash
# Export provenance as PROV-JSON
aiwg provenance export --format prov-json --entity REF-056

# Output: REF-056-provenance.json (PROV-JSON format)
{
  "entity": {
    "entity:REF-056-analysis": {
      "prov:generatedAtTime": "2026-01-25T10:45:00Z"
    }
  },
  "activity": {
    "activity:analysis-001": {
      "prov:startTime": "2026-01-25T10:15:00Z",
      "prov:endTime": "2026-01-25T10:45:00Z"
    }
  },
  "wasDerivedFrom": {
    "_:wDF1": {
      "prov:generatedEntity": "entity:REF-056-analysis",
      "prov:usedEntity": "entity:REF-056-doc"
    }
  }
}
```

#### 5. Provenance Visualization

```bash
# Generate provenance graph
aiwg provenance graph REF-056 --output provenance-graph.svg

# Output: SVG visualization of derivation chain
```

### Medium-Term (Framework Enhancement)

#### 6. Provenance Validation

Verify provenance chain integrity:

```bash
# Validate provenance completeness
aiwg provenance validate REF-056

# Output:
# Provenance Validation: REF-056
#
# ✓ Entity chain complete (3 levels)
# ✓ All activities have agents
# ✓ All derivations have timestamps
# ✓ Source URL still accessible
#
# Validation: PASSED
```

---

## Cross-References to AIWG Components

| Component | Location | PROV Relevance |
|-----------|----------|----------------|
| Provenance Directory | `.aiwg/research/provenance/` | Record storage |
| Operations Log | `operations.log` | PROV-N format |
| REF-XXX Template | Provenance section | Per-document tracking |
| FAIR Compliance | REF-056 analysis | R1.2 implementation |
| OAIS PDI | REF-061 analysis | PDI-Provenance |
| R-LAM | REF-058 analysis | Workflow provenance |

---

## Key Quotes for Documentation

### On Reproducibility:
> "Use of W3C PROV has been previously demonstrated as a means to increase reproducibility and trust of computer-generated outputs."

### On the Data Model:
> "PROV-DM is the conceptual data model that forms a basis for the W3C provenance family of specifications."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (W3C PROV) | Use In |
|-------------------|------------------------------|--------|
| Artifact | Entity | All docs |
| Operation | Activity | Technical docs |
| Researcher/Agent | Agent | Technical docs |
| "Created from" | wasDerivedFrom | Provenance docs |
| "Produced by" | wasGeneratedBy | Provenance docs |
| "Performed by" | wasAssociatedWith | Provenance docs |
| Operation log | PROV-N notation | Technical docs |

---

## PROV Serializations Supported

| Format | Purpose | AIWG Support |
|--------|---------|--------------|
| **PROV-N** | Human-readable documentation | `operations.log` |
| **PROV-JSON** | API exchange, tool integration | Export command |
| **PROV-YAML** | AIWG internal storage | Record files |
| PROV-O | Semantic web (RDF) | Not planned |
| PROV-XML | Enterprise integration | Not planned |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-062
**AIWG Priority**: MEDIUM
**Implementation Status**: Weak - needs formal provenance system
**Key Contribution**: W3C standard provenance vocabulary
**Standards Alignment**: W3C Recommendation (2013)
**Related Standards**: Implements FAIR R1.2, OAIS PDI-Provenance
