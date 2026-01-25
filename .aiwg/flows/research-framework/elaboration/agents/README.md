# Research Framework Agent Specifications

This directory contains detailed specifications for all 8 agents in the Research Framework.

## Agent Overview

| Agent | ID | Primary Use Case | Lifecycle Stage |
|-------|----|--------------------|-----------------|
| [Discovery Agent](./discovery-agent-spec.md) | `research-discovery-agent` | UC-RF-001, UC-RF-009 | Stage 1: Discovery |
| [Acquisition Agent](./acquisition-agent-spec.md) | `research-acquisition-agent` | UC-RF-002 | Stage 2: Acquisition |
| [Documentation Agent](./documentation-agent-spec.md) | `research-documentation-agent` | UC-RF-003 | Stage 3: Documentation |
| [Citation Agent](./citation-agent-spec.md) | `research-citation-agent` | UC-RF-004 | Stage 4: Integration |
| [Archival Agent](./archival-agent-spec.md) | `research-archival-agent` | UC-RF-007 | Stage 5: Archival |
| [Quality Agent](./quality-agent-spec.md) | `research-quality-agent` | UC-RF-006 | Cross-cutting |
| [Provenance Agent](./provenance-agent-spec.md) | `research-provenance-agent` | UC-RF-005 | Cross-cutting |
| [Workflow Agent](./workflow-agent-spec.md) | `research-workflow-agent` | UC-RF-008 | Orchestration |

## Agent Relationships

```
                    ┌─────────────────────┐
                    │   Workflow Agent    │
                    │   (Orchestrator)    │
                    └─────────┬───────────┘
                              │ coordinates
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   Discovery   │──▶│  Acquisition  │──▶│Documentation  │
│    Agent      │   │    Agent      │   │    Agent      │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        │                     │                     │
        └──────────┬──────────┴──────────┬──────────┘
                   │                     │
                   ▼                     ▼
           ┌───────────────┐   ┌───────────────┐
           │ Quality Agent │   │Citation Agent │
           │(Cross-cutting)│   │(Integration)  │
           └───────────────┘   └───────────────┘
                   │                     │
                   └──────────┬──────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │Archival Agent │
                    │  (Stage 5)    │
                    └───────────────┘

              ┌───────────────────────────┐
              │    Provenance Agent       │
              │  (Observes all agents)    │
              └───────────────────────────┘
```

## Specification Structure

Each agent specification follows a consistent 12-section format:

1. **Agent Overview** - Name, ID, purpose, lifecycle stage, model
2. **Capabilities** - Primary and secondary capabilities with NFR references
3. **Tools** - Required tools, external APIs, MCP servers
4. **Triggers** - Automatic, manual, and event triggers
5. **Inputs/Outputs** - Data formats, schemas, locations
6. **Dependencies** - Agent, service, and data dependencies
7. **Configuration Options** - YAML config, environment variables
8. **Error Handling** - Error categories, recovery procedures
9. **Metrics/Observability** - Performance metrics, logging, telemetry
10. **Example Usage** - CLI examples with expected output
11. **Related Use Cases** - Traceability to requirements
12. **Implementation Notes** - Architecture, security, testing, limitations

## Use Case Traceability

| Use Case | Agent(s) | Relationship |
|----------|----------|--------------|
| UC-RF-001: Discover Research Papers | Discovery Agent | Primary |
| UC-RF-002: Acquire Research Source | Acquisition Agent | Primary |
| UC-RF-003: Document Research Paper | Documentation Agent | Primary |
| UC-RF-004: Integrate Citations | Citation Agent | Primary |
| UC-RF-005: Track Provenance | Provenance Agent | Primary |
| UC-RF-006: Assess Source Quality | Quality Agent | Primary |
| UC-RF-007: Archive Research Artifacts | Archival Agent | Primary |
| UC-RF-008: Execute Research Workflow | Workflow Agent | Primary |
| UC-RF-009: Perform Gap Analysis | Discovery Agent, Quality Agent | Supporting |

## Key Standards & Frameworks

| Standard | Used By | Purpose |
|----------|---------|---------|
| W3C PROV | Provenance Agent | Provenance tracking |
| OAIS (ISO 14721) | Archival Agent | Archive packaging |
| GRADE | Quality Agent, Documentation Agent | Evidence quality |
| FAIR | Quality Agent, Acquisition Agent | Data quality |
| PRISMA | Discovery Agent | Systematic review |
| Dublin Core | Archival Agent | Descriptive metadata |
| PREMIS | Archival Agent | Preservation metadata |
| CSL | Citation Agent | Citation formatting |

## External API Dependencies

| API | Used By | Purpose |
|-----|---------|---------|
| Semantic Scholar | Discovery, Acquisition, Quality | Paper search, metadata |
| arXiv | Discovery, Acquisition | Open access papers |
| CrossRef | Acquisition, Quality | DOI resolution |
| Unpaywall | Acquisition | Open access detection |
| OpenCitations | Quality | Citation network |

## Next Steps

1. Review specifications with domain experts
2. Create agent implementation skeletons
3. Define inter-agent communication protocols
4. Implement unit tests for core capabilities
5. Integration testing of workflow orchestration

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/ - All use case specifications
- @.aiwg/flows/research-framework/inception/vision-document.md - Framework vision
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - Technical risks
- @agentic/code/frameworks/sdlc-complete/agents/agent-template.md - AIWG agent pattern

---

## Document Metadata

**Version:** 1.0
**Status:** DRAFT
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Research Framework Team
