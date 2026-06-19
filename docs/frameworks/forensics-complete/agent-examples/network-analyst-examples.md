# Network Analyst — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Identifying Active C2 Beacon (Simple)

**Scenario**: Analyze network state from a compromised web server. Triage found a process running from /tmp.

**Commands and findings**:
```bash
grep ESTAB /evidence/INC-*/triage/network-state-at-triage.txt | grep "24891"
# tcp  ESTAB  0  0  10.0.1.15:45892  91.108.4.12:443  users:(("x",pid=24891,fd=3))
```

The process `x` (PID 24891, binary deleted from /tmp) has an established HTTPS connection to 91.108.4.12.

Cross-referencing with firewall logs:
```bash
grep "91.108.4.12" /var/log/ufw.log | awk '{print $5}' | sort | uniq -c
# Shows connections every 60 seconds ± 3 seconds over the past 48 hours
```

**Finding**: Active C2 beacon to 91.108.4.12:443 with 60-second interval. Connection has been active for 48 hours. ATT&CK: T1071.001 (C2 via HTTPS), T1071 beaconing pattern. Immediate action: capture current connection state, then block 91.108.4.12 at the perimeter.

---

### Example 2: Lateral Movement and Exfiltration (Moderate)

**Scenario**: Analyze network evidence after a confirmed web server compromise to determine if the attacker pivoted to internal systems.

**Timeline reconstruction**:

1. **03:12 UTC** — `ss` output shows `www-data` (PID 24891) connecting to 185.220.101.47:443 (initial C2)
2. **03:34 UTC** — auth.log: SSH accepted from `10.0.1.15` (compromised web server) to `10.0.1.22` (internal database server) as user `backup` — internal lateral movement (T1021.004)
3. **03:41 UTC** — From database server (10.0.1.22): outbound SSH to 185.220.101.47:22 with data transfer of 847MB — exfiltration via SCP (T1048)
4. **03:47 UTC** — DNS logs: 1,200 queries to `a1b2c3d4.attacker-domain.com` with 60-character subdomain labels — DNS exfiltration attempt (T1071.004)

**Finding**: Attacker pivoted from web server to database server via SSH credential reuse. Exfiltrated an estimated 847MB via SCP and also attempted DNS exfiltration. Lateral movement path: internet → web server → database server → attacker infrastructure. The database server must be treated as compromised and analyzed separately.
