---
name: forensics-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Forensics framework quick reference — incident response, log analysis, evidence preservation, IOC extraction, and the multi-agent investigate flow
---

# Forensics Framework — Quick Reference

You are operating in a project that has the AIWG **forensics-complete** framework installed. This skill is your always-loaded directory for digital forensics and incident response. The full skill catalog is reachable through the AIWG artifact index — query it on demand.

## What this framework is for

Digital forensics & incident response. RFC 3227-aligned triage, multi-source timeline reconstruction, IOC extraction, chain-of-custody preservation, and Sigma-rule-based threat hunting. Multi-platform (Linux / cloud / containers / memory).

## When to reach for which skill

| Need | Skill | How to invoke |
|---|---|---|
| Quick triage of a possibly-compromised host | `forensics-triage` | "triage this host" / "RFC 3227 quick capture" |
| Full investigation, multi-agent | `forensics-investigate` | "investigate the breach" |
| Acquire evidence with chain of custody | `forensics-acquire` | "acquire evidence from X" |
| Build target system profile | `forensics-profile` | "profile target host" |
| Extract IOCs from artifacts | `forensics-ioc` | "extract IOCs" |
| Threat hunt with Sigma rules | `forensics-hunt` | "hunt for [pattern]" |
| Reconstruct event timeline | `forensics-timeline` | "build the timeline" |
| Analyze a Linux system | `linux-forensics` | "linux forensic analysis" |
| Analyze a memory dump | `memory-forensics` | "analyze memory dump" |
| Cloud (AWS/Azure/GCP) forensics | `cloud-forensics` | "cloud audit log review" |
| Container/Docker/K8s forensics | `container-forensics` | "container forensic analysis" |
| Supply-chain compromise check | `supply-chain-forensics` | "audit supply chain" |
| Multi-source log correlation | `log-analysis` | "correlate auth logs" |
| Evidence preservation checklist | `evidence-preservation` | "chain of custody for X" |
| Apply Sigma rules to logs | `sigma-hunting` | "convert sigma rule to elastic" |
| Generate the investigation report | `forensics-report` | "generate forensic report" |
| Status of in-flight investigation | `forensics-status` | "investigation status" |

This framework ships **19 skills**. The above are the high-traffic ones; others (e.g., `target-profiling`, `integrity-verification`) are reachable via `aiwg discover`.

## Investigation phase model

```
Triage (RFC 3227) → Acquisition → Analysis → IOC extraction → Reporting
   forensics-triage   forensics-acquire   linux-forensics    forensics-ioc   forensics-report
                                          memory-forensics
                                          cloud-forensics
                                          container-forensics
```

Cross-cutting: `forensics-hunt` (Sigma) and `log-analysis` (correlation) feed both Analysis and IOC extraction.

## Artifact directory layout

Forensic artifacts go under `.aiwg/forensics/` when the project uses the framework:

```
.aiwg/forensics/
├── triage/              # RFC 3227 quick captures
├── evidence/            # Chain-of-custody-preserved evidence
├── timelines/           # Reconstructed event timelines
├── iocs/                # Extracted indicators of compromise
├── reports/             # Investigation reports
└── chain-of-custody.md  # Master CoC log
```

## Finding the right skill when this quickref doesn't list it

```bash
aiwg discover "<what you're trying to do>"
```

For broad or unusual asks ("find lateral movement", "audit kerberoasting", "extract a rootkit signature") — the index ranks by capability and trigger phrases across the entire installed surface. Don't say "AIWG can't do that" without checking.

## Common multi-skill flows

- **Compromise reported, full workflow**: `forensics-triage` → `forensics-acquire` → `forensics-profile` → `linux-forensics` (or `memory-forensics`) → `forensics-ioc` → `forensics-timeline` → `forensics-report`
- **Quick audit log sweep**: `cloud-forensics` → `log-analysis` → `forensics-ioc`
- **Sigma-rule deployment**: `sigma-hunting` → `forensics-hunt`
- **Container escape triage**: `container-forensics` → `forensics-acquire` → `forensics-investigate`

## Don't list from this skill — query the index

If a user asks "what forensics skills are available?", **do not enumerate from memory**. Run `aiwg discover --type skill --graph framework "forensics"` (or just read this quickref). This skill exists to orient, not to replace the index.
