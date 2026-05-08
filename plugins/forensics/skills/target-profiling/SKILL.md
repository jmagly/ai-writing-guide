---
namespace: aiwg
name: target-profiling
description: "Research and build a target system profile via SSH — discovers OS, services, users, network baseline, and security stack"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# target-profiling

Connects to a target system over SSH and constructs a structured baseline profile covering operating system details, running services, user accounts, network configuration, and installed security tooling. The profile serves as the foundation for all subsequent forensic work.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "OSINT [target]" → open-source intelligence gathering
- "footprint [domain]" → attack surface mapping
- "recon [system]" → system reconnaissance

## Purpose

Before any investigation can proceed, examiners need a documented understanding of what the system looks like in its current state. This skill produces a structured `.aiwg/forensics/profiles/<hostname>.md` file that records point-in-time system state, making deviations visible during analysis.

## Behavior

When triggered, this skill:

1. **Parse connection string**:
   - Accepts `user@host`, `user@host:port`, or a named SSH config alias
   - Validates connectivity before starting collection
   - Example: `ssh -o ConnectTimeout=10 user@192.0.2.10 'echo ok'`

2. **Collect OS identity**:
   - Read `/etc/os-release` for distro and version
   - Capture kernel version with `uname -r`
   - Record architecture with `uname -m`
   - Capture system uptime and last reboot time

3. **Enumerate running services**:
   - Use `systemctl list-units --type=service --state=running` (systemd systems)
   - Fall back to `service --status-all` or `rc-status` on non-systemd systems
   - Record enabled-at-boot services separately from currently active

4. **Enumerate local user accounts**:
   - Parse `/etc/passwd` for non-system accounts (UID >= 1000)
   - Check `/etc/sudoers` and `/etc/sudoers.d/` for privilege grants
   - List accounts with active login shells
   - Record last login times from `lastlog` or `last`

5. **Capture network baseline**:
   - Active interfaces and addresses: `ip addr show`
   - Routing table: `ip route show`
   - Listening ports and owning processes: `ss -tlnp` or `netstat -tlnp`
   - Current established connections: `ss -tnp state established`

6. **Identify security tooling**:
   - Check for presence of auditd, SELinux/AppArmor, fail2ban, crowdstrike, osquery, wazuh, filebeat
   - Record firewall type (iptables, nftables, ufw, firewalld) and active ruleset summary

7. **Write profile document**:
   - Save to `.aiwg/forensics/profiles/<hostname>.md`
   - Include collection timestamp and SSH user used

## Usage Examples

### Example 1 — Basic profile
```
profile target user@webserver-01.example.com
```
Connects as the specified user and writes `.aiwg/forensics/profiles/webserver-01.md`.

### Example 2 — Non-standard port
```
profile target ops@192.0.2.55:2222
```
Connects on port 2222, derives hostname from the target's `hostname` command.

### Example 3 — Named alias
```
system reconnaissance prod-db-01
```
Resolves `prod-db-01` via `~/.ssh/config`.

## Output Locations

- Profile: `.aiwg/forensics/profiles/<hostname>.md`
- Raw collection log: `.aiwg/forensics/profiles/<hostname>-raw.txt`

## Configuration

```yaml
target_profiling:
  ssh_timeout: 10
  min_uid: 1000
  include_security_tools:
    - auditd
    - apparmor
    - selinux
    - fail2ban
    - crowdstrike
    - osquery
    - wazuh
    - filebeat
  output_format: markdown
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Validate SSH connectivity before starting collection; document what is and is not accessible
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/non-destructive.md — Profile using read-only commands only; do not alter target system state
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Record collection timestamp and SSH user with the profile for forensic traceability
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/linux-forensics/SKILL.md — Target profile feeds as baseline context for subsequent Linux forensic investigation
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/evidence-preservation/SKILL.md — Profile documents collected after target profiling feed the evidence preservation workflow
