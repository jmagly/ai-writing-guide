---
namespace: aiwg
name: forensics-ioc
platforms: [all]
description: Extract and enrich indicators of compromise
commandHint:
  argumentHint: "<findings-path> [--enrich] [--stix] [--output path] [--format markdown|json|stix]"
  category: forensics-ioc
---

# /forensics-ioc

Extract indicators of compromise (IOCs) from forensic findings, enrich them with threat intelligence lookups, and map them to STIX 2.1 observables. Produces a structured IOC register suitable for detection rule generation, MISP import, or threat intelligence sharing.

## Usage

`/forensics-ioc <findings-path> [options]`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| findings-path | Yes | Path to findings directory or specific finding file |
| --enrich | No | Perform threat intelligence enrichment lookups |
| --stix | No | Generate STIX 2.1 bundle alongside IOC register |
| --output | No | Output path (default: `.aiwg/forensics/ioc/ioc-register.md`) |
| --format | No | Output format: `markdown` (default), `json`, `stix`, `misp` |
| --types | No | IOC types to extract: `ip`, `domain`, `hash`, `url`, `email`, `all` (default: `all`) |
| --confidence | No | Minimum confidence threshold for inclusion: `low`, `medium`, `high` (default: `low`) |
| --no-private | No | Exclude RFC-1918 and loopback addresses |

## Behavior

When invoked, this command:

1. **Scan Findings for Observables**
   - Read all finding documents in the specified path
   - Parse timeline artifacts, triage summaries, and analysis outputs
   - Extract raw observable strings matching IOC patterns

2. **IOC Extraction by Type**

   | Type | Sources | Pattern |
   |------|---------|---------|
   | IPv4/IPv6 | Network analysis, auth logs, connections | Address notation |
   | Domain/FQDN | DNS queries, connection targets, configs | Domain pattern |
   | File hash (MD5/SHA1/SHA256) | Acquisition checksums, malware artifacts | Hex string |
   | URL | Web logs, process command lines, configs | HTTP/HTTPS URL |
   | Email address | Auth logs, user accounts | Email pattern |
   | File path | Persistence findings, process analysis | Suspicious paths |
   | Process name | Triage process list, persistence | Masquerading names |
   | User agent | Web logs | Browser/tool strings |

3. **Deduplication and Normalization**
   - Remove duplicate IOCs of the same type and value
   - Normalize IP addresses (strip ports, consolidate subnets)
   - Lowercase domain names
   - Uppercase file hashes
   - Apply `--no-private` filtering if specified

4. **Confidence Scoring**
   - Score each IOC based on context and repetition
   - HIGH: IOC observed in multiple independent sources or directly linked to attack
   - MEDIUM: IOC appears in findings with indirect correlation
   - LOW: IOC extracted from context; may require validation
   - Mark false-positive candidates (CDN IPs, common system paths)

5. **Threat Intelligence Enrichment** (when `--enrich` specified)
   - Query VirusTotal, AbuseIPDB, or configured TI feeds for IP/domain/hash IOCs
   - Record reputation score, malware family, and associated threat actor
   - Note prior sightings and first/last seen dates
   - Attach TI source attribution

6. **STIX 2.1 Mapping** (when `--stix` specified)
   - Map each IOC to appropriate STIX Observable object type
   - Create STIX Indicator objects with detection patterns
   - Bundle into STIX 2.1 JSON bundle
   - Link observables to Threat Actor and Malware objects where applicable

7. **Detection Rule Suggestions**
   - Generate Sigma rule stubs for network IOCs
   - Generate firewall rule suggestions for IP/CIDR blocks
   - Generate YARA rule stubs for file hashes
   - Note which IOCs are suitable for automated blocking vs. monitoring

8. **IOC Register Output**
   - Write structured IOC register with all extracted indicators
   - Include context, confidence, enrichment data, and MITRE mapping
   - Export STIX bundle if requested
   - Update investigation state with IOC count

## Examples

### Example 1: Extract IOCs from findings directory
```bash
/forensics-ioc .aiwg/forensics/findings/
```

### Example 2: Extract and enrich with threat intel
```bash
/forensics-ioc .aiwg/forensics/findings/ --enrich
```

### Example 3: STIX 2.1 output
```bash
/forensics-ioc .aiwg/forensics/ --stix --format stix
```

### Example 4: High confidence only, exclude private IPs
```bash
/forensics-ioc .aiwg/forensics/ --confidence high --no-private
```

### Example 5: MISP import format
```bash
/forensics-ioc .aiwg/forensics/ --enrich --format misp
```

## Output

Artifacts are saved to `.aiwg/forensics/ioc/`:

```
.aiwg/forensics/ioc/
├── ioc-register.md           # Human-readable IOC register
├── ioc-register.json         # Machine-readable IOC list
├── stix-bundle.json          # STIX 2.1 bundle (if --stix)
├── detection-rules/
│   ├── network-ioc.sigma     # Sigma rule stubs
│   └── file-ioc.yara         # YARA rule stubs
└── enrichment-cache.json     # TI lookup results cache
```

### Sample IOC Register

```
IOC Register: INV-2026-02-27-web01
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extraction complete: 12 IOCs (4 enriched)

--- Network IOCs ---

| Type    | Value                | Confidence | Context                        | TI Result              |
|---------|----------------------|------------|--------------------------------|------------------------|
| IPv4    | 185.220.101.42       | HIGH       | SSH brute force source; C2     | Known Tor exit node    |
| Domain  | update-check.net     | HIGH       | DNS query from /tmp/.update    | Malware C2 (VirusTotal)|
| IPv4    | 10.0.0.15            | MEDIUM     | Lateral movement destination   | Internal host          |

--- File IOCs ---

| Type     | Value                   | Confidence | Context                       |
|----------|-------------------------|------------|-------------------------------|
| SHA256   | a1b2c3d4e5f6...         | HIGH       | /tmp/.update - C2 implant     |
| Path     | /tmp/.update            | HIGH       | Malicious cron-executed binary|
| Path     | /dev/shm/.x             | MEDIUM     | Hidden file in tmpfs          |

--- Account IOCs ---

| Type | Value   | Confidence | Context                                  |
|------|---------|------------|------------------------------------------|
| User | deploy  | HIGH       | Compromised account (brute forced)       |

Total: 7 network, 3 file, 2 account IOCs
STIX bundle: .aiwg/forensics/ioc/stix-bundle.json
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/ioc-analyst.md - IOC Analyst
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/templates/ioc-register.md - Register template
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-report.md - Include IOCs in report
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-timeline.md - Timeline correlation
