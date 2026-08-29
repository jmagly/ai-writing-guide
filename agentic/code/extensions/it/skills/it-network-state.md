---
name: it-network-state
description: Declarative network state management — detect drift from documented network configuration
trigger: when the operator requests network audit, network drift check, or network state validation
---

# Declarative Network State Management

## Purpose

Compare the documented (desired) network state against the actual network state across fleet hosts. Detect drift, report discrepancies, and optionally generate remediation commands.

## Workflow

### 1. Load Desired State

Parse network configuration from fleet documentation:
- System-spec documents (network section)
- Application profiles (deployment topology)
- Firewall rule documentation

Build a desired-state model:

```yaml
desired_state:
  hosts:
    - hostname: "{hostname}"
      interfaces:
        - name: "{iface}"
          ip: "{ip}/{prefix}"
          gateway: "{gateway}"
          vlan: "{vlan}"
          state: "up"
      dns:
        nameservers: ["{ns1}", "{ns2}"]
        search: ["{domain}"]
      firewall:
        - chain: "{chain}"
          port: "{port}"
          proto: "{proto}"
          source: "{source}"
          action: "{action}"
      routes:
        - destination: "{dest}"
          gateway: "{gw}"
          interface: "{iface}"
```

### 2. Collect Actual State

For each reachable host:

```bash
# Interfaces
ip -j addr show
ip -j link show

# Routes
ip -j route show

# DNS
cat /etc/resolv.conf

# Firewall (nftables or iptables)
nft list ruleset 2>/dev/null || iptables-save
```

### 3. Compare and Report

For each host, compare desired vs. actual:

| Host | Category | Item | Desired | Actual | Status |
|------|----------|------|---------|--------|--------|
| {host} | Interface | {iface} IP | {desired} | {actual} | MATCH / DRIFT |
| {host} | DNS | nameserver | {desired} | {actual} | MATCH / DRIFT |
| {host} | Firewall | {rule} | {desired} | {actual} | MATCH / DRIFT / MISSING |

### 4. Generate Remediation (Optional)

If requested, produce commands to bring actual state in line with desired state:

```bash
# Fix interface IP on {hostname}
ip addr add {desired_ip}/{prefix} dev {iface}

# Fix missing firewall rule
nft add rule inet filter input tcp dport {port} accept
```

> Remediation commands are suggestions only. Apply via the operator, not automatically.

## Output

- Network state comparison report
- Drift summary (count of matches, drifts, missing items)
- Optional remediation commands

## Governance Boundary

Network collection and comparison artifacts default to `restricted-infrastructure` with the `network-inventory` retention category. Raw firewall, routing, DNS, and interface output is short-lived and requires an explicit capture reason. Durable reports use minimum sufficient drift counts and redacted bounded excerpts. Invoke `aiwg ops evidence prepare` before a report/artifact write, agent response containing collected state, repository commit, export, or issue/PR/comment. Less-trusted destinations receive only the prepared payload-free summary.
