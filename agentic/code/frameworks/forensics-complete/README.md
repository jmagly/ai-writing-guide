# Forensics Complete

Digital forensics and incident response (DFIR) framework with target profiling, evidence acquisition, multi-source analysis, timeline reconstruction, and forensic reporting.

## Overview

This framework provides AI-assisted investigation workflows that produce customizable investigation plans rather than host-specific scripts. It starts by researching the target system to build a parameterized profile, then guides structured forensic analysis through the full DFIR lifecycle.

**Standards**: NIST SP 800-86, MITRE ATT&CK, Sigma Rules, OCSF, STIX 2.1, RFC 3227

## Quick Start

```bash
# Deploy the framework
aiwg use forensics

# Profile a target system
/forensics-profile ssh://user@host:port

# Quick triage (volatile data first)
/forensics-triage ssh://user@host:port

# Full investigation
/forensics-investigate ssh://user@host:port --scope full

# Build event timeline
/forensics-timeline .aiwg/forensics/findings/target-2026-02-27/

# Generate forensic report
/forensics-report .aiwg/forensics/ --format full
```

## Workflow

```
reconnaissance --> triage --> acquisition --> analysis --> timeline --> reporting
     |               |            |              |            |            |
  profile          volatile    preserve      deep dive    correlate    document
  target           capture     evidence      per-phase     events      findings
```

| Stage | Agent | Output |
|-------|-------|--------|
| Reconnaissance | recon-agent | `target-profile.md` |
| Triage | triage-agent | `triage-findings.md` |
| Acquisition | forensic-acquisition-agent | `evidence-manifest.yaml` + collected data |
| Analysis | log/persistence/container/network/memory/cloud analysts | `phase-N-findings.md` |
| Timeline | timeline-builder | `incident-timeline.md` |
| IOC Extraction | ioc-analyst | `ioc-register.md` |
| Reporting | reporting-agent | `forensic-report.md` + `remediation-plan.md` |

## Agents (13)

| Agent | Stage | Description |
|-------|-------|-------------|
| recon-agent | Reconnaissance | Target system profiling and baseline discovery |
| triage-agent | Triage | RFC 3227 volatile data capture and red flag detection |
| forensic-acquisition-agent | Acquisition | Evidence collection with chain of custody |
| log-analyst | Analysis | Auth, system, and application log analysis |
| persistence-hunter | Analysis | Cron, systemd, SSH keys, rootkit, kernel module detection |
| container-analyst | Analysis | Docker and Kubernetes forensics |
| network-analyst | Analysis | Traffic analysis, C2 detection, lateral movement |
| memory-analyst | Analysis | Volatility 3 memory forensics |
| cloud-analyst | Analysis | AWS, Azure, GCP forensic artifact collection |
| timeline-builder | Timeline | Multi-source event correlation |
| ioc-analyst | Analysis | IOC extraction and STIX 2.1 mapping |
| reporting-agent | Reporting | Forensic report generation |
| forensics-orchestrator | Orchestration | Multi-agent workflow coordination |

## Commands (9)

| Command | Description |
|---------|-------------|
| `/forensics-profile` | Build target system profile |
| `/forensics-triage` | Quick triage investigation |
| `/forensics-investigate` | Full multi-agent investigation |
| `/forensics-acquire` | Evidence acquisition and preservation |
| `/forensics-timeline` | Build correlated event timeline |
| `/forensics-hunt` | Threat hunt with Sigma rules |
| `/forensics-ioc` | IOC extraction and enrichment |
| `/forensics-report` | Generate forensic report |
| `/forensics-status` | Investigation status dashboard |

## Skills (10)

| Skill | Description |
|-------|-------------|
| target-profiling | Research and build target system profile |
| linux-forensics | Generalized Linux investigation (Debian, RHEL, SUSE) |
| container-forensics | Docker and Kubernetes investigation |
| cloud-forensics | AWS, Azure, GCP investigation |
| memory-forensics | Volatility 3 memory analysis workflows |
| log-analysis | Multi-source log correlation |
| ioc-extraction | IOC identification and enrichment |
| sigma-hunting | Sigma rule-based threat hunting |
| evidence-preservation | Chain of custody procedures |
| supply-chain-forensics | SBOM analysis and build pipeline forensics |

## Investigation Artifacts

All artifacts are stored in `.aiwg/forensics/`:

```
.aiwg/forensics/
├── profiles/           # Target system profiles
├── plans/              # Investigation plans (generated per-target)
├── evidence/           # Evidence manifests and custody logs
├── findings/           # Per-phase findings organized by target and date
├── timelines/          # Correlated event timelines
├── iocs/               # IOC registers
├── reports/            # Final forensic reports
└── sigma/              # Custom Sigma rules generated during investigation
```

## Bundled Sigma Rules

Detection rules in standard Sigma format, portable to any SIEM backend:

| Rule | Category | Level |
|------|----------|-------|
| ssh-brute-force-success | Linux | High |
| unauthorized-suid | Linux | High |
| ld-preload-rootkit | Linux | Critical |
| deleted-binary-running | Linux | Critical |
| privileged-container | Docker | High |
| container-escape | Docker | Critical |
| aws-iam-escalation | Cloud | High |
| unusual-api-region | Cloud | Medium |

## Enforcement Rules

| Rule | Level | Description |
|------|-------|-------------|
| evidence-integrity | CRITICAL | SHA-256 hashing and chain of custody |
| volatility-order | HIGH | RFC 3227 collection ordering |
| red-flag-escalation | CRITICAL | 8 immediate escalation triggers |
| non-destructive | CRITICAL | Never modify evidence sources |

## Key Design Decisions

1. **Target Profiling First** - The framework starts by researching the target system to build a parameterized investigation plan, replacing hardcoded host profiles.

2. **Investigation Plans as Artifacts** - Generated per-target with target-specific commands, baselines, and red flags.

3. **Sigma Rules for Detection** - Portable detection logic that translates to any SIEM backend.

4. **OCSF + STIX 2.1 Alignment** - Schemas align with industry standards for interoperability.

5. **AI + Traditional Dual-Path** - Every phase documents both AI-assisted and traditional approaches.

6. **Evidence Integrity as a Rule** - Chain of custody and SHA-256 hashing are enforced, not optional.

## Documentation

| Document | Description |
|----------|-------------|
| `docs/methodology.md` | NIST 800-86 and SANS PICERL methodology |
| `docs/attack-mapping.md` | ATT&CK technique-to-artifact guide |
| `docs/tool-reference.md` | Forensics tool inventory |
| `docs/ai-assisted-forensics.md` | LLM integration patterns for DFIR |
| `docs/research-guide.md` | Pre-investigation target research |

## References

- [NIST SP 800-86: Guide to Integrating Forensic Techniques](https://csrc.nist.gov/pubs/sp/800/86/final)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [Sigma Rules Specification](https://github.com/SigmaHQ/sigma-specification)
- [OCSF Schema](https://schema.ocsf.io/)
- [STIX 2.1 Specification](https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)
- [RFC 3227: Guidelines for Evidence Collection](https://www.rfc-editor.org/rfc/rfc3227)
