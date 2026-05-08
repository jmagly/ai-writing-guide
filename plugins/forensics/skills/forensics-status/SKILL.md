---
namespace: aiwg
name: forensics-status
platforms: [all]
description: Show investigation status dashboard
commandHint:
  argumentHint: "[--investigation id] [--detailed] [--all] [--format markdown|json]"
  category: forensics-monitoring
---

# /forensics-status

Display the current status of active or recent forensic investigations. Shows phase completion, finding counts by severity, artifact inventory, and pending work. Provides a quick situational awareness dashboard for ongoing incident response.

## Usage

`/forensics-status [options]`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| --investigation | No | Specific investigation ID to show (e.g., `INV-2026-02-27-web01`) |
| --detailed | No | Show detailed breakdown of each phase and artifact |
| --all | No | Show all investigations, including completed ones |
| --pending-only | No | Show only investigations with incomplete stages |
| --format | No | Output format: `markdown` (default), `json` |
| --path | No | Investigation root path (default: `.aiwg/forensics/`) |

## Behavior

When invoked, this command:

1. **Discover Investigations**
   - Scan `.aiwg/forensics/` for investigation state files
   - Load `investigation.yaml` for each discovered investigation
   - Determine active vs. completed vs. stalled investigations
   - Sort by recency (most recent first)

2. **Phase Status Assessment**
   - Check completion status for each workflow stage
   - Map output artifacts to expected stage deliverables
   - Flag stages with missing or incomplete outputs
   - Identify stages that are in-progress vs. not started

3. **Finding Counts**
   - Count findings by severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
   - Summarize IOC counts by type (IP, domain, hash, etc.)
   - Note unreviewed or newly added findings since last status check
   - Flag any findings requiring immediate action

4. **Artifact Inventory**
   - List all collected evidence artifacts
   - Note artifacts with pending hash verification
   - Identify gaps in evidence (expected artifacts not collected)
   - Show total storage used by investigation

5. **Pending Work**
   - List incomplete stages in priority order
   - Identify blocked stages (dependencies not met)
   - Surface findings that require follow-up investigation
   - List IOCs pending enrichment or validation

6. **Timeline Status**
   - Note earliest and latest events in investigation window
   - Show attacker dwell time if timeline is complete
   - Flag time gaps in log coverage

7. **Render Dashboard**
   - Display formatted status view
   - Use visual progress indicators for stage completion
   - Highlight CRITICAL findings prominently
   - Provide next-step command suggestions

## Examples

### Example 1: Current investigation status
```bash
/forensics-status
```

### Example 2: Detailed breakdown
```bash
/forensics-status --detailed
```

### Example 3: Specific investigation
```bash
/forensics-status --investigation INV-2026-02-27-web01
```

### Example 4: All investigations including completed
```bash
/forensics-status --all
```

### Example 5: JSON export for tooling
```bash
/forensics-status --format json
```

## Output

Status is displayed to console. Optional JSON export to `.aiwg/forensics/reports/status.json`.

### Sample Output (standard)

```
Investigation Status Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Investigations: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INV-2026-02-27-web01 | ACTIVE | Confirmed Breach | web01.internal
────────────────────────────────────────────────────────────────

Phases:
  Reconnaissance   [COMPLETE]  system-profile.md
  Triage           [COMPLETE]  triage-summary.md   Threat: 87/100 CRITICAL
  Acquisition      [COMPLETE]  14 artifacts (140.6 MB)
  Analysis         [COMPLETE]  16 findings
  Timeline         [COMPLETE]  incident-timeline.md
  IOC Extraction   [COMPLETE]  12 IOCs
  Report           [PENDING]   not started

Findings:
  CRITICAL:  2   HIGH: 5   MEDIUM: 6   LOW: 3   INFO: 0
  Total: 16 findings across 5 analysis domains

IOCs:
  IP addresses: 2 (1 known malicious)
  Domains:      1 (1 known C2)
  File hashes:  1
  File paths:   3
  Accounts:     2

Evidence:
  Artifacts collected: 14
  Storage: 140.6 MB
  Integrity: 14/14 verified

Investigation Window:
  Start: 2026-02-26T22:14:33Z (first attacker activity)
  End:   2026-02-27T02:15:00Z (last seen)
  Dwell: 4h 0m 27s

Pending Work:
  1. /forensics-report .aiwg/forensics/ --format full
     Generate final investigation report

  2. Validate: 3 IOCs pending enrichment
     /forensics-ioc .aiwg/forensics/ --enrich

────────────────────────────────────────────────────────────────
Last updated: 2026-02-27T15:02:10Z
```

### Sample Output (detailed)

```
Investigation Status Dashboard (Detailed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INV-2026-02-27-web01
  Target:       192.168.1.50 (web01.internal)
  Started:      2026-02-27T14:30:00Z
  Duration:     31m 44s (analysis), report pending
  Investigator: analyst
  Scope:        full

Phase Detail:
─────────────────────────────────────────────────────────────────

Reconnaissance [COMPLETE, 14:31:42Z, 102s]
  Artifacts:
    system-profile.md (web01-2026-02-27) - 8.4 KB
    system-profile.json                  - 12.1 KB

Triage [COMPLETE, 14:34:15Z, 153s]
  Threat Score: 87/100 (CRITICAL)
  Red Flags:    5 (2 CRITICAL, 2 HIGH, 1 MEDIUM)
  Artifacts:
    triage-summary.md       - 14.2 KB
    volatile/process-list   - 42.1 KB
    volatile/network-conn.  - 8.3 KB

Acquisition [COMPLETE, 14:39:02Z, 287s]
  Evidence collected: 14 artifacts
  Total size: 140.6 MB
  Integrity: 14/14 VERIFIED
  Artifacts:
    auth.log (4.2 MB)        SHA256 VERIFIED
    syslog (12.8 MB)         SHA256 VERIFIED
    journal (87.3 MB)        SHA256 VERIFIED
    [11 more artifacts...]

Analysis [COMPLETE, 14:55:09Z, 967s]
  Log Analyst:         8 findings (1 CRITICAL, 3 HIGH, 3 MEDIUM, 1 LOW)
  Persistence Hunter:  3 findings (1 CRITICAL, 2 HIGH)
  Network Analyst:     5 findings (2 HIGH, 2 MEDIUM, 1 LOW)
  Container Analyst:   skipped (no containers detected)
  Memory Analyst:      skipped (no memory image)

Timeline [COMPLETE, 14:57:33Z, 144s]
  Events: 312 significant (from 1,247 raw)
  Attack phases: Initial Access -> Execution -> Persistence -> C2
  Patient zero: account 'deploy'
  Dwell time: 4h 0m 27s

IOC Extraction [COMPLETE, 14:59:01Z, 88s]
  IOCs extracted: 12
  Enriched: 4 (3 pending)
  Actionable (block): 3 IPs, 1 domain
  For scanning: 1 file hash

Report [PENDING]
  Run: /forensics-report .aiwg/forensics/ --format full

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended Next Action:
  /forensics-report .aiwg/forensics/ --format full
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/forensics-orchestrator.md - Orchestrator
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-investigate.md - Full workflow
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-report.md - Report generation
