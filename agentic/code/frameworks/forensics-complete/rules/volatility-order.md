---
enforcement: high
---

# Volatility Order

**Enforcement Level**: HIGH
**Scope**: triage-agent, memory-agent, disk-agent, network-agent

## Overview

Digital evidence exists across storage media with vastly different persistence characteristics. The most valuable evidence for active intrusion investigations is often the most ephemeral. Following RFC 3227's order of volatility ensures that evidence most likely to disappear first is captured first.

Never run disk-heavy operations (imaging, filesystem scans) before capturing volatile data. A disk imaging job that saturates I/O can cause network state changes, process swaps, and cache eviction that destroy in-memory evidence.

## Rules

### Rule 1: Collection Order is Mandatory

Collection must follow this sequence. Do not skip levels. Do not reorder.

**Level 1 — CPU Registers and Cache** (seconds to persist)

Capture only if a live memory acquisition tool supports it or the system is attached to a debugger. Content includes currently executing instructions, processor state, L1/L2/L3 cache data.

Note: Most incident response scenarios do not permit register-level capture. If it is not feasible, document why and proceed to Level 2.

```bash
# If using a kernel debugger or specialized tool:
# capture-registers.sh  (tool-specific)

# Document skip reason if not captured:
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Level 1 (registers): Not captured - no kernel debugger attached" >> collection.log
```

**Level 2 — Memory Contents** (lost on power cycle)

Full physical memory dump. This captures running processes, network connections in kernel structures, encryption keys, bash history buffers, and evidence of fileless malware.

```bash
# Linux - LiME module
sudo insmod lime-$(uname -r).ko "path=/evidence/memory.lime format=lime"
sha256sum /evidence/memory.lime > /evidence/memory.lime.sha256

# Linux - AVML (no kernel module required)
sudo avml /evidence/memory.avml
sha256sum /evidence/memory.avml > /evidence/memory.avml.sha256
```

Capture memory BEFORE any network-isolation or process-termination actions.

**Level 3 — Network State** (changes continuously)

Active connections, listening ports, ARP cache, routing table, DNS cache. This data changes with every new connection and times out rapidly.

```bash
# Capture in this order (fastest-changing first)
ss -tunap > /evidence/network/ss-connections.txt
netstat -rn > /evidence/network/routing-table.txt
arp -n > /evidence/network/arp-cache.txt
ip neigh show > /evidence/network/ip-neigh.txt
cat /proc/net/tcp > /evidence/network/proc-net-tcp.txt
cat /proc/net/tcp6 > /evidence/network/proc-net-tcp6.txt

# DNS cache (systemd-resolved)
systemd-resolve --statistics > /evidence/network/dns-stats.txt 2>/dev/null

# Timestamp all files
ls -la /evidence/network/ >> collection.log
```

**Level 4 — Running Processes** (lost on reboot or process exit)

Process list, open files, loaded modules, environment variables, process memory maps.

```bash
ps auxwwef > /evidence/processes/ps-full.txt
ls -la /proc/*/exe 2>/dev/null > /evidence/processes/proc-exe.txt
ls -la /proc/*/fd 2>/dev/null > /evidence/processes/proc-fd.txt

# Detect deleted binaries (attacker indicator)
ls -la /proc/*/exe 2>/dev/null | grep '(deleted)' > /evidence/processes/deleted-executables.txt

# Loaded kernel modules
lsmod > /evidence/processes/lsmod.txt
cat /proc/modules > /evidence/processes/proc-modules.txt

# Environment variables (may contain secrets or attacker payloads)
for pid in $(ls /proc/ | grep '^[0-9]'); do
  cat /proc/$pid/environ 2>/dev/null | tr '\0' '\n' > /evidence/processes/env-$pid.txt
done
```

**Level 5 — Disk Data** (persists across reboots, changes during operation)

Filesystem metadata, log files, configuration files, user files. This data persists but changes continuously during system operation (access times, log rotation, temp files).

```bash
# Capture key files before imaging
cp /etc/passwd /evidence/disk/passwd
cp /etc/shadow /evidence/disk/shadow 2>/dev/null
cp /etc/crontab /evidence/disk/crontab
cp -r /etc/cron.d/ /evidence/disk/cron.d/
cp /var/log/auth.log /evidence/disk/auth.log 2>/dev/null
cp /var/log/secure /evidence/disk/secure 2>/dev/null
cp /var/log/syslog /evidence/disk/syslog 2>/dev/null

# Full disk image last (I/O intensive - do after volatile capture)
# dc3dd if=/dev/sda of=/evidence/disk/sda.dd hash=sha256 hlog=/evidence/disk/sda.log
```

**Level 6 — Archival Data** (stable, changes only on explicit modification)

Backup systems, archived logs, external storage. Collect last. This data is least likely to change and most likely to still be available later.

### Rule 2: Document Skip Decisions

If a collection level is skipped, the reason must be documented in the collection log.

Valid reasons to skip:
- Level 1 (registers): No debugger attached, system is remote
- Level 2 (memory): System is already powered off — collect disk instead
- Level 3 (network): System is air-gapped or already isolated before response arrived

Invalid reasons to skip:
- "It would take too long"
- "Disk imaging is more important"
- "We already know what happened"

### Rule 3: No Disk Operations Before Volatile Capture is Complete

Do not start any of the following until Levels 2-4 are complete:

- Disk imaging
- Full filesystem scanning (find, ls -laR on entire filesystem)
- antivirus scans
- Package manager operations (rpm -qa, dpkg -l cause I/O)
- Log aggregation tools that read entire log directories

Exception: If the system will be shut down immediately and memory capture is impossible, disk imaging takes priority over all other collection.

### Rule 4: Timestamp All Collection Steps

Every collection command output must include a timestamp. Either prepend timestamps to output files or record start/end times in the collection log.

```bash
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Starting Level 3 network capture" >> collection.log
ss -tunap > /evidence/network/ss-connections.txt
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) Level 3 network capture complete" >> collection.log
```

## References

- RFC 3227: Guidelines for Evidence Collection and Archiving (Section 2.1: Order of Volatility)
- NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response
- SANS FOR508: Advanced Incident Response and Threat Hunting
