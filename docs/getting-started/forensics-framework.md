# Forensics Framework

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

You're investigating an incident. You have a compromised host, a cloud account with suspicious activity, or a container that shouldn't be running. You need structured investigation that doesn't miss steps, evidence that's preserved correctly, and a report you can hand to someone else.

The forensics framework covers the DFIR workflow: target profiling, volatile
data capture, evidence acquisition, multi-source analysis, timeline
reconstruction, IOC extraction, and reporting. It is designed to help you keep
evidence handling explicit and reviewable.

---

## Before You Start

Complete [Install, Connect, and Verify](install-connect-verify.md) first. If
you intentionally run a targeted deployment instead of the complete system,
`aiwg use forensics` remains the manual command for this framework.

The first useful result should be a target profile, triage capture plan,
timeline, IOC register, or report with custody notes and evidence references.

---

## The investigation workflow

```
profile → triage → acquire → analyze → timeline → report
```

Each phase has a dedicated command. You can run the full pipeline or jump to any stage.

---

## Starting an investigation

### Full investigation from scratch

```bash
/forensics-investigate ssh://user@host:port --scope full
```

This orchestrates the entire workflow. The agent profiles the target first, then guides structured analysis through each phase.

### Quick triage (volatile data first)

RFC 3227 requires capturing volatile data before anything else — running processes, network connections, memory maps — because they disappear on reboot or shutdown.

```bash
/forensics-triage ssh://user@host:port
```

This captures network state, process list, memory maps, deleted-but-running binaries, and kernel modules before touching disk.

### Just profile a target

Before investigating, understand what you're dealing with:

```bash
/forensics-profile ssh://user@host:port
```

Produces a target profile: OS, services, users, filesystem layout, installed tools available for forensics. This profile parameterizes all subsequent analysis so the framework adapts to what's actually on the system.

---

## Analysis agents

Each analysis type has a specialist agent:

| Agent | What it does |
|-------|-------------|
| `triage-agent` | Volatile data capture, RFC 3227 ordering |
| `acquisition-agent` | Evidence collection, hash verification, chain of custody |
| `log-analyst` | auth.log, syslog, journal, application log parsing |
| `network-analyst` | Traffic analysis, C2 detection, lateral movement |
| `persistence-hunter` | Cron, systemd, SSH keys, PAM modules, kernel modules |
| `memory-analyst` | Volatility 3: process analysis, rootkit detection, credential extraction |
| `container-analyst` | Docker, containerd, Kubernetes forensics |
| `cloud-analyst` | AWS/Azure/GCP audit logs, IAM review, API anomalies |
| `ioc-analyst` | IOC extraction, enrichment, STIX 2.1 formatting |
| `timeline-builder` | Multi-source event correlation, chronological reconstruction |

---

## Building an event timeline

After evidence is collected, correlate events from multiple sources:

```bash
/forensics-timeline .aiwg/forensics/findings/target-2026-03-25/
```

This correlates auth logs, syslog, journal, filesystem timestamps, and application logs into a single chronological timeline with attribution. Essential for establishing what happened when and in what order.

---

## IOC extraction

Extract indicators of compromise from all collected evidence and format them for threat intel sharing:

```bash
/forensics-ioc .aiwg/forensics/findings/
```

Produces a STIX 2.1 IOC register with IPs, domains, file hashes, registry keys, and behavioral indicators. Ready to import into your SIEM or share with your team.

---

## Threat hunting

If you suspect a specific threat but haven't found it yet:

```bash
/forensics-hunt --sigma-rules apt29,cobalt-strike
```

Applies Sigma rules against collected logs to surface matching activity. The `sigma-hunting` skill runs against whatever evidence is in scope.

---

## Generating the report

When the investigation is complete:

```bash
/forensics-report .aiwg/forensics/ --format full
```

Produces a structured forensic report with executive summary, technical findings, event timeline, IOC register, and remediation recommendations. The `--format executive` flag produces a shortened version for non-technical stakeholders.

---

## Cloud investigations

For AWS, Azure, or GCP incidents:

```
Investigate suspicious IAM activity in this AWS account
```

```
Review CloudTrail logs for credential theft indicators
```

The `cloud-analyst` agent covers audit log collection, IAM review, network flow analysis, and API activity anomaly detection across all three major providers.

---

## Container investigations

For compromised containers or Kubernetes clusters:

```
Analyze this container for privilege escalation vectors
```

```
Review the Kubernetes cluster for unauthorized workloads
```

The `container-analyst` agent covers Docker and containerd configuration, image layer analysis, volume and network inspection, and Kubernetes API server audit logs.

---

## Evidence handling

All evidence collection follows chain of custody procedures:

- SHA-256 hashes verified at acquisition
- Chain of custody documented in `.aiwg/forensics/custody/`
- Evidence packaged following OAIS standards
- Integrity verification available at any point via `/verify-archive`

---

## Key references

- `/forensics-status` — Current investigation status dashboard
- `/forensics-acquire` — Evidence acquisition with chain of custody
- `/forensics-profile` — Build target system profile
- `@agentic/code/frameworks/forensics-complete/README.md` — Full framework documentation
