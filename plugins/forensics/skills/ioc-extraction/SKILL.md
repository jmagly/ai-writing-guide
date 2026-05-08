---
namespace: aiwg
name: ioc-extraction
description: "Extract, classify, deduplicate, and enrich IOCs from investigation artifacts; map to STIX 2.1 observables"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# ioc-extraction

Scans investigation artifacts — log files, memory analysis output, findings documents, and raw captures — to extract indicators of compromise. Classifies each indicator by type, deduplicates, and produces a STIX 2.1 observable bundle alongside a flat IOC list for import into SIEMs and threat intelligence platforms.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "IOCs" / "indicators" → Indicator of Compromise extraction
- "STIX" / "STIX 2.1" → structured threat intelligence output
- "pull indicators" → IOC extraction shorthand

## Purpose

IOCs extracted during investigation have value beyond the current case: they feed detection rules, threat intelligence platforms, and network blocklists. Raw extraction without classification and deduplication produces noise. This skill applies consistent extraction patterns and maps output to STIX 2.1 so findings integrate with standard threat intelligence tooling.

## Behavior

When triggered, this skill:

1. **Identify input sources**:
   - Accept a directory path, file path, or glob pattern
   - Default to scanning all files under `.aiwg/forensics/` if no path is specified
   - Supported source types: plain text, Markdown, JSON, JSONL, CSV, raw log files

2. **Extract IP addresses**:
   - IPv4: match `\b(?:\d{1,3}\.){3}\d{1,3}\b`, validate octets are 0-255
   - IPv6: match full and compressed forms
   - Exclude RFC1918 private ranges, loopback (127.0.0.0/8), link-local (169.254.0.0/16), and multicast (224.0.0.0/4) by default (configurable)
   - Exclude IP addresses that appear only in trusted infrastructure context (DNS servers, NTP servers from baseline profile)

3. **Extract domain names and hostnames**:
   - Match FQDNs: `\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b`
   - Exclude known-good domains from an allowlist (configurable)
   - Flag domains with high entropy names (DGA indicators): calculate Shannon entropy per label
   - Flag recently registered TLDs and uncommon ccTLDs

4. **Extract file hashes**:
   - MD5: 32 hex characters
   - SHA-1: 40 hex characters
   - SHA-256: 64 hex characters
   - Tag with hash type; flag any MD5 or SHA-1 hashes as weak-algorithm IOCs

5. **Extract URLs**:
   - Match full URLs including scheme, host, path, and query string
   - Defang for safe storage: replace `http` with `hxxp`, `.` with `[.]` in output
   - Classify by scheme: http, https, ftp, smb, ldap

6. **Extract email addresses**:
   - Standard RFC 5321 pattern
   - Flag addresses in suspicious domains or with high-entropy local parts

7. **Extract file paths and registry keys**:
   - Unix absolute paths: `/[a-zA-Z0-9._/-]+`
   - Windows paths: `[A-Za-z]:\\[^\s"]+`
   - Windows registry keys: `HK(LM|CU|CR|U|CC)\\[^\s"]+`

8. **Classify and deduplicate**:
   - Assign STIX 2.1 observable type to each indicator:
     - IP: `ipv4-addr` or `ipv6-addr`
     - Domain: `domain-name`
     - URL: `url`
     - Hash: `file` with `hashes` property
     - Email: `email-addr`
     - File path: `file`
     - Registry key: `windows-registry-key`
   - Deduplicate by value within each type
   - Record source file and line number for each unique indicator

9. **Produce STIX 2.1 bundle**:
   - Generate `observable-objects` entries per STIX 2.1 specification
   - Assign deterministic UUIDs based on type and value (version 5 UUID from SHA-1 namespace)
   - Include `created` and `modified` timestamps
   - Link observables to a STIX `report` object referencing the investigation ID

10. **Write outputs**:
    - Flat IOC list: `.aiwg/forensics/iocs/<investigation>-iocs.txt` (one indicator per line, typed prefix)
    - STIX bundle: `.aiwg/forensics/iocs/<investigation>-stix.json`
    - Summary report: `.aiwg/forensics/iocs/<investigation>-ioc-summary.md`

## Usage Examples

### Example 1 — Scan all forensics artifacts
```
extract iocs
```

### Example 2 — Scan specific file
```
extract indicators from .aiwg/forensics/findings/webserver-01-linux.md
```

### Example 3 — With custom allowlist
```
ioc analysis --allowlist /etc/forensics/trusted-domains.txt
```

## Output Locations

- Flat IOC list: `.aiwg/forensics/iocs/<investigation>-iocs.txt`
- STIX 2.1 bundle: `.aiwg/forensics/iocs/<investigation>-stix.json`
- Summary: `.aiwg/forensics/iocs/<investigation>-ioc-summary.md`

## Configuration

```yaml
ioc_extraction:
  exclude_private_ips: true
  exclude_loopback: true
  exclude_multicast: true
  dga_entropy_threshold: 3.5
  weak_hash_algorithms:
    - md5
    - sha1
  defang_urls: true
  stix_version: "2.1"
  domain_allowlist: []
  ip_allowlist: []
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Scan investigation artifacts completely before extracting; check baseline and allowlists before flagging
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Produce IOC lists for analyst review; do not autonomously push indicators to blocking systems
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — IOC extraction must not modify source artifacts; read-only access to evidence
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/evidence-preservation/SKILL.md — Evidence must be preserved and hashed before IOC extraction begins
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/sigma-hunting/SKILL.md — Sigma hunting cross-references extracted IOCs against log sources for confirmation
