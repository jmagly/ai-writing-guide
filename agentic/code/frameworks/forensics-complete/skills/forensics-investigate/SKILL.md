---
namespace: aiwg
name: forensics-investigate
platforms: [all]
description: Full multi-agent investigation workflow
commandHint:
  argumentHint: "<target> [--scope triage|full|targeted-ssh|container|cloud] [--skip-stage stage]"
  category: forensics-investigation
---

# /forensics-investigate

Orchestrate a complete digital forensics investigation by coordinating all specialized agents through the full workflow: reconnaissance, triage, acquisition, multi-domain analysis, timeline building, IOC extraction, and report generation. Suitable for incident response and proactive threat hunting.

## Usage

`/forensics-investigate <target> [options]`

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| target | Yes | SSH connection string, cloud target, or findings directory path |
| --scope | No | Investigation scope: `triage`, `full`, `targeted-ssh`, `container`, `cloud` (default: `full`) |
| --skip-stage | No | Skip a specific stage: `recon`, `triage`, `acquire`, `analysis`, `timeline`, `ioc`, `report` |
| --resume | No | Resume a previously interrupted investigation from last checkpoint |
| --output | No | Output directory (default: `.aiwg/forensics/`) |
| --parallel | No | Run analysis agents in parallel where possible (default: true) |
| --notify | No | Webhook URL for stage completion notifications |

## Behavior

When invoked, this command:

1. **Initialize Investigation**
   - Create investigation workspace at `.aiwg/forensics/`
   - Assign investigation ID (`INV-<date>-<host>`)
   - Record start time, investigator, and scope
   - Check for existing investigation to resume

2. **Reconnaissance (recon-agent)**
   - Profile target system and establish baseline
   - Document services, users, and network configuration
   - Save to `profiles/<hostname>/`

3. **Triage (triage-agent)**
   - Capture volatile data per RFC 3227 order
   - Score initial threat level
   - Identify active indicators requiring immediate attention
   - Save to `findings/<hostname>/volatile/`

4. **Acquisition (forensic-acquisition-agent)**
   - Collect logs, configurations, and artifacts per triage findings
   - Establish chain of custody for all evidence
   - Compute and verify SHA-256 hashes
   - Save evidence manifest to `acquisition/`

5. **Analysis (parallel agent coordination)**
   - **Log Analyst**: Auth logs, syslog, journal entries
   - **Persistence Hunter**: Crons, systemd units, SSH keys, rootkits
   - **Network Analyst**: Connections, DNS, beaconing, lateral movement
   - **Container Analyst**: Docker/Kubernetes artifacts (if applicable)
   - **Memory Analyst**: Volatility 3 analysis (if memory image available)
   - **Cloud Analyst**: CloudTrail, IAM, flow logs (if cloud target)
   - Save findings to `analysis/<agent>/`

6. **Timeline Building (timeline-builder)**
   - Correlate events across all analysis findings
   - Normalize timestamps to UTC
   - Reconstruct attack chain with MITRE ATT&CK mapping
   - Save to `timeline/incident-timeline.md`

7. **IOC Extraction (ioc-analyst)**
   - Extract indicators from all findings
   - Enrich with threat intelligence
   - Map to STIX 2.1 observables
   - Save to `ioc/ioc-register.md`

8. **Report Generation (reporting-agent)**
   - Compile executive summary and technical findings
   - Include severity-classified evidence table
   - Generate remediation plan with prioritized actions
   - Save to `reports/forensic-report.md`

9. **Quality Gate**
   - Verify all stages completed or explicitly skipped
   - Confirm evidence chain of custody integrity
   - Check report completeness before marking investigation closed

## Profile-to-Plan Generation

When a target profile exists at `.aiwg/forensics/profiles/<hostname>-<date>/system-profile.md`, `forensics-investigate` reads it before generating the investigation plan. This enables the plan to contain parameterized, host-specific commands instead of generic placeholders.

### 1. Reading the Target Profile

The command resolves the profile path from the target argument:

1. Derive hostname from the connection string (e.g., `ssh://admin@web01` → `web01`)
2. Scan `.aiwg/forensics/profiles/` for directories matching `<hostname>-*`
3. Select the most recently dated match (e.g., `web01-2026-02-27/`)
4. Load `system-profile.md` (human-readable) and `system-profile.json` (machine-readable) from that directory
5. If no profile is found, log a warning and proceed with an unparameterized plan; prompt the investigator to run `/forensics-profile` first

The investigation plan's **Target Profile Reference** section is populated from the resolved path:

```yaml
target_profile_path: .aiwg/forensics/profiles/web01-2026-02-27/system-profile.md
profile_date: 2026-02-27
```

### 2. Parameterizing Commands from Profile Data

The following profile fields are extracted and substituted into investigation plan commands:

| Profile Field | Plan Variable | Example Usage |
|---------------|---------------|---------------|
| Hostname | `{{hostname}}` | `last -n 50 web01` |
| Case ID | `{{case_id}}` | `ps auxf > /tmp/INV-2026-02-27-web01_ps_snapshot.txt` |
| Users with shell access | `{{expected_users}}` | Auth log grep patterns scoped to known accounts |
| Running services list | `{{expected_service_pattern}}` | `lsof -i | grep -v '<pattern>'` |
| Listening ports | `{{expected_ports}}` | Connection count alert comparison |
| Investigation date | `{{investigation_date}}` | `journalctl --since "2026-02-27 00:00:00"` |
| Log lookback window | `{{log_lookback_days}}` | `--since` timestamps for auth and syslog queries |
| Timeline window | `{{timeline_window_days}}` | `find / -newer` reference marker |
| Large file threshold | `{{large_file_threshold_mb}}` | `find / -size +100M` |
| Connection alert threshold | `{{connection_count_alert_threshold}}` | `awk '$1 >= 20'` in network phase |
| Failed login threshold | `{{failed_login_threshold}}` | Alert threshold in auth analysis |
| Package manager | `{{package_manager_history_command}}` | Distro-appropriate package history command |
| Log file paths | `{{web_access_log}}` | Service-specific log path substitution |
| Evidence storage path | `{{evidence_storage_path}}` | Evidence collection target directory |
| Escalation contact | `{{escalation_contact}}` | Red flag notification target |

User and authentication commands in Phase 2 are scoped to the known account list from the profile's **Users with Shell Access** table. For example, if the profile documents `admin`, `deploy`, and `root`, the SSH key sweep is limited to those home directories rather than iterating all of `/home`.

### 3. Service-Specific Check Inclusion

Phase 3 (Process and Service Audit) and Phase 7 (Log Analysis) include service-specific checks only for services listed in the profile's **Services and Ports** table with `Expected: Yes`.

The command applies these rules:

| Service Present in Profile | Checks Included |
|----------------------------|-----------------|
| `nginx` or `apache2` | Web access log parsing, HTTP error pattern grep |
| `mysqld` or `postgresql` | Database error log check, unusual connection sources |
| `sshd` | SSH auth failure threshold, authorized_keys sweep |
| `docker` / `containerd` | Phase 8 (Container / Docker Audit) is included; otherwise skipped |
| No container runtime listed | Phase 8 is excluded from the generated plan with a note |
| Cloud metadata service detected | Cloud Analyst agent is added to the Phase 5 parallel pool |

The Phase 8 section header in the generated plan reflects the include/exclude decision explicitly:

```
### Phase 8: Container / Docker Audit
> INCLUDED — docker detected in target profile (3 running containers at baseline)
```

or:

```
### Phase 8: Container / Docker Audit
> SKIPPED — no container runtime in target profile
```

Services not present in the profile that are found running during triage are flagged as anomalies in the triage summary and receive targeted investigation commands appended to Phase 3.

### 4. Deriving Expected vs. Suspicious Baselines

The profile's **Services and Ports** and **Network Baseline** sections establish what is normal. The generated plan encodes these baselines directly into triage commands:

**Port baseline** — The expected listening ports from the profile (e.g., `22`, `80`, `443`, `3306`) are embedded in the Phase 6 network check. Any port reported by `ss -tlnpu` that is not in this list is flagged inline:

```bash
# Ports not in baseline (web01 profile: 22, 80, 443, 3306)
ss -tlnpu | awk 'NR>1 {print $5}' | grep -oP ':\K[0-9]+' | sort -un \
  | grep -vE '^(22|80|443|3306)$' | while read p; do echo "UNEXPECTED PORT: $p"; done
```

**Outbound connection baseline** — The expected outbound destinations from the profile's **Expected Outbound Connections** table are embedded in the network phase as an allowlist. Connections to destinations outside this list are flagged for review.

**User baseline** — The known shell-access accounts from the profile are compared against `getent passwd` output at investigation time. New accounts not in the profile are flagged in Phase 2 as potential persistence artifacts.

**Container baseline** — If the profile includes a **Running Containers (Baseline)** table, the generated plan compares current `docker ps` output against that baseline. Containers not present at profile time are flagged as anomalous in Phase 8.

**Failed login threshold** — The `failed_login_threshold` from the profile's **Investigation Scope Configuration** block (default: `10`) is substituted into the auth log grep commands. Accounts exceeding this threshold in Phase 2 are surfaced as priority findings.

## Scope Profiles

| Scope | Stages | Use Case |
|-------|--------|----------|
| `triage` | recon, triage | Initial rapid assessment |
| `targeted-ssh` | recon, triage, acquire, logs, persistence, network | SSH-compromised host |
| `container` | recon, triage, acquire, container, network | Container escape or image compromise |
| `cloud` | recon, acquire, cloud, ioc, report | Cloud account breach |
| `full` | All stages | Comprehensive incident response |

## Examples

### Example 1: Full investigation
```bash
/forensics-investigate ssh://admin@192.168.1.50 --scope full
```

### Example 2: Quick triage only
```bash
/forensics-investigate ssh://admin@192.168.1.50 --scope triage
```

### Example 3: Container sweep
```bash
/forensics-investigate ssh://root@docker-host --scope container
```

### Example 4: Cloud audit
```bash
/forensics-investigate aws://123456789012/us-east-1 --scope cloud
```

### Example 5: Resume interrupted investigation
```bash
/forensics-investigate ssh://admin@192.168.1.50 --resume
```

### Example 6: Skip memory analysis
```bash
/forensics-investigate ssh://admin@host --scope full --skip-stage memory
```

## Output

All artifacts are saved under `.aiwg/forensics/`:

```
.aiwg/forensics/
├── investigation.yaml             # Investigation metadata and state
├── profiles/
│   └── web01-2026-02-27/
│       └── system-profile.md
├── findings/
│   └── web01-2026-02-27/
│       ├── triage-summary.md
│       └── volatile/
├── acquisition/
│   ├── evidence-manifest.yaml
│   └── custody-log.yaml
├── analysis/
│   ├── logs/
│   ├── persistence/
│   ├── network/
│   └── ioc/
├── timeline/
│   └── incident-timeline.md
├── ioc/
│   └── ioc-register.md
└── reports/
    └── forensic-report.md
```

### Sample Progress Output

```
Investigation: INV-2026-02-27-web01
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[14:30:00] Stage 1/8: Reconnaissance     RUNNING
[14:31:42] Stage 1/8: Reconnaissance     COMPLETE  (102s)
[14:31:42] Stage 2/8: Triage             RUNNING
[14:34:15] Stage 2/8: Triage             COMPLETE  (153s) [CRITICAL - active compromise]
[14:34:15] Stage 3/8: Acquisition        RUNNING
[14:39:02] Stage 3/8: Acquisition        COMPLETE  (287s) [14 artifacts collected]
[14:39:02] Stage 4/8: Analysis           RUNNING   (parallel: 5 agents)
[14:39:02]   Log Analyst                 RUNNING
[14:39:02]   Persistence Hunter          RUNNING
[14:39:02]   Network Analyst             RUNNING
[14:52:18]   Log Analyst                 COMPLETE  [8 findings]
[14:53:41]   Persistence Hunter          COMPLETE  [3 findings]
[14:55:09]   Network Analyst             COMPLETE  [5 findings]
[14:55:09] Stage 4/8: Analysis           COMPLETE  (976s) [16 total findings]
[14:55:09] Stage 5/8: Timeline           RUNNING
[14:57:33] Stage 5/8: Timeline           COMPLETE  (144s)
[14:57:33] Stage 6/8: IOC Extraction     RUNNING
[14:59:01] Stage 6/8: IOC Extraction     COMPLETE  (88s)  [12 IOCs extracted]
[14:59:01] Stage 7/8: Report Generation  RUNNING
[15:01:44] Stage 7/8: Report Generation  COMPLETE  (163s)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Investigation Complete: INV-2026-02-27-web01
Duration: 31m 44s

Findings: 16 total (2 CRITICAL, 5 HIGH, 6 MEDIUM, 3 LOW)
IOCs: 12 extracted (4 enriched with threat intel)
Report: .aiwg/forensics/reports/forensic-report.md
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/forensics-orchestrator.md - Orchestrator
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/agents/manifest.json - All agent definitions
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-report.md - Report generation
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/commands/forensics-status.md - Status monitoring
