---
name: it-asset-sync
description: Pull live state from hosts and reconcile against CMDB asset records — detect drift, missing entries, and stale records
trigger: when the operator requests asset reconciliation, CMDB sync, inventory audit, or asset drift check
---

# Asset Sync and CMDB Reconciliation

## Purpose

Compare the documented asset inventory (CMDB records) against the actual live state of infrastructure hosts. Identify discrepancies: assets in the CMDB that are unreachable, hosts on the network not in the CMDB, and records whose fields have drifted from reality.

## Workflow

### 1. Load CMDB Records

Parse all asset records from the fleet inventory:
- Asset record YAML files (OpsTarget kind)
- Application profile documents
- Service records

Build a documented-state index keyed by hostname and IP:

```yaml
cmdb_state:
  assets:
    - hostname: "{hostname}"
      ip: "{ip}"
      status: "{active|maintenance|retired}"
      owner: "{owner}"
      sla_tier: "{tier}"
      serial_number: "{serial}"
```

### 2. Discover Live State

For each network segment or host group, collect actual state:

```bash
# Discover reachable hosts
nmap -sn {subnet} -oG -

# For each reachable host, collect identity
ssh {host} "hostname; cat /etc/machine-id; ip -j addr show; dmidecode -s system-serial-number 2>/dev/null"
```

Build a live-state index:

```yaml
live_state:
  hosts:
    - hostname: "{discovered_hostname}"
      ip: "{discovered_ip}"
      serial_number: "{discovered_serial}"
      interfaces: ["{iface}: {ip}"]
      uptime: "{uptime}"
```

### 3. Reconcile

Compare documented vs. live state and classify each entry:

| Hostname | CMDB Status | Live Status | Category |
|----------|------------|-------------|----------|
| {host} | active | reachable | MATCH |
| {host} | active | unreachable | DRIFT — host down or decommissioned |
| {host} | retired | reachable | DRIFT — zombie asset still running |
| {host} | (missing) | reachable | MISSING — unregistered asset |
| {host} | active | field mismatch | DRIFT — IP, serial, or owner changed |

### 4. Field-Level Drift Check

For matched assets, compare individual fields:

| Hostname | Field | CMDB Value | Live Value | Status |
|----------|-------|-----------|------------|--------|
| {host} | primary_ip | {cmdb_ip} | {live_ip} | MATCH / DRIFT |
| {host} | hostname | {cmdb_name} | {live_name} | MATCH / DRIFT |
| {host} | serial_number | {cmdb_serial} | {live_serial} | MATCH / DRIFT |

### 5. Generate Report and Remediation

Produce a reconciliation report with:

- Total assets in CMDB vs. total discovered
- Count by category: MATCH, DRIFT, MISSING, UNREACHABLE
- Recommended actions for each discrepancy

> Do not auto-remediate. Present findings and await operator decision before modifying CMDB records.

## Output

- CMDB reconciliation report
- Drift summary (matched, drifted, missing, unreachable counts)
- Per-asset remediation recommendations
- List of unregistered hosts requiring CMDB enrollment

## Governance Boundary

Classify live and reconciled asset data as `restricted-infrastructure`. Keep raw discovery output in the short-lived raw tier only when an explicit reason is recorded; the durable reconciliation report defaults to counts, field names, status, bounded redacted excerpts, and record fingerprints. Before writing the CMDB report or posting a discrepancy to an issue, invoke `aiwg ops evidence prepare`. Public/immutable trackers receive only a sanitized summary, never hostnames, addresses, serials, owners, or backup paths.
