---
enforcement: critical
---

# Red Flag Escalation

**Enforcement Level**: CRITICAL
**Scope**: All forensics agents

## Overview

Certain findings indicate active compromise, sophisticated attackers, or conditions that require human judgment before analysis continues. When any of these eight conditions is detected, automated analysis must pause immediately and a human operator must be alerted.

These are not findings to log and continue past. They represent inflection points where the wrong next action can destroy evidence, tip off an attacker, or expose the investigator to legal liability.

**When a red flag is triggered:**
1. Stop automated analysis
2. Write the finding to the escalation log with full context
3. Alert the human operator immediately
4. Do not take any remediation action
5. Wait for explicit operator instruction before resuming

## Rules

### Red Flag 1: /etc/ld.so.preload Exists

**What it means**: LD_PRELOAD rootkit. An attacker has configured the dynamic linker to inject a malicious shared library into every process on the system. This is a classic method to hide files, processes, and network connections from standard tools. Every command you run on this system is potentially compromised.

**How to detect**:
```bash
ls -la /etc/ld.so.preload 2>/dev/null && echo "RED FLAG: ld.so.preload exists"
cat /etc/ld.so.preload 2>/dev/null
```

**Why to escalate**: The system's standard binaries (ls, ps, netstat, find) may all be lying. Analysis results from this system cannot be trusted without using statically-linked tools brought from a clean system. The operator must decide whether to:
- Continue with statically-linked binaries from known-good media
- Shut down and analyze the disk offline
- Monitor the attacker's activity before containment

---

### Red Flag 2: Deleted Binary Still Running

**What it means**: A process is executing from a binary that no longer exists on disk. This is a strong indicator of an active attacker. Common technique: upload malware, execute it, delete the file to hinder analysis. The process continues running from the kernel's page cache.

**How to detect**:
```bash
ls -la /proc/*/exe 2>/dev/null | grep '(deleted)'
# Example output: lrwxrwxrwx 1 root root 0 Nov 14 03:12 /proc/4821/exe -> /tmp/.x (deleted)
```

**Why to escalate**: The attacker may be actively connected. Killing the process destroys the only remaining copy of the malware binary — but the process may be maintaining an attacker's shell session or C2 channel. Operator must decide whether to:
- Dump the process memory to recover the deleted binary before killing
- Monitor the process to identify C2 infrastructure
- Isolate the system while preserving the process

---

### Red Flag 3: Non-Package SUID Binary

**What it means**: A SUID binary exists on the system that was not installed by the package manager. SUID binaries run with the file owner's privileges (often root). An attacker who planted a SUID shell or SUID wrapper has created a persistent privilege escalation backdoor that survives password changes and account audits.

**How to detect**:
```bash
# Find all SUID/SGID binaries
find / -perm /6000 -type f 2>/dev/null > /tmp/all-suid.txt

# Cross-reference with package manager
# Debian/Ubuntu:
while read f; do
  dpkg -S "$f" 2>&1 | grep -q "not found" && echo "UNPACKAGED SUID: $f"
done < /tmp/all-suid.txt

# RHEL/CentOS:
while read f; do
  rpm -qf "$f" 2>&1 | grep -q "not owned" && echo "UNPACKAGED SUID: $f"
done < /tmp/all-suid.txt
```

**Why to escalate**: This backdoor will survive standard incident response actions like password resets and account disabling. The operator must understand the scope before containment begins. Removing it immediately also destroys forensic evidence about when it was planted and by what technique.

---

### Red Flag 4: Binary Content in authorized_keys

**What it means**: An SSH authorized_keys file contains what appears to be binary data or a non-standard key format. This is a known indicator of Redis RCE exploitation — attackers who compromise a Redis server with write access to the filesystem often write their SSH key directly to authorized_keys. Truncated writes, encoding issues, or multiple writes can produce binary garbage alongside a valid key.

**How to detect**:
```bash
# Check all authorized_keys files for binary content
find /root /home -name "authorized_keys" 2>/dev/null | while read f; do
  if file "$f" | grep -q "binary"; then
    echo "RED FLAG: Binary content in $f"
  fi
  # Also check for entries that don't match key format
  grep -vP '^(ssh-|ecdsa-|sk-|#|$)' "$f" && echo "RED FLAG: Non-standard entry in $f"
done
```

**Why to escalate**: The Redis instance (or another writable service) is likely still compromised and accessible to the attacker. The attacker's key may still provide access. Removing the key without understanding the initial access vector allows the attacker to re-enter via the same path.

---

### Red Flag 5: Non-Package PAM Module

**What it means**: A PAM (Pluggable Authentication Module) shared library is loaded in PAM configuration but was not installed by the package manager. PAM modules intercept authentication. A malicious PAM module can accept any password for any account, log credentials, or create backdoor access that bypasses all standard authentication.

**How to detect**:
```bash
# Find all PAM modules referenced in config
grep -rh "^\s*\(auth\|account\|password\|session\)\s" /etc/pam.d/ \
  | grep -oP '[^\s]+\.so[^\s]*' \
  | sort -u > /tmp/pam-modules.txt

# Check each against package manager
while read module; do
  path=$(find /lib/security /lib64/security /usr/lib/security -name "$module" 2>/dev/null | head -1)
  if [ -n "$path" ]; then
    dpkg -S "$path" 2>&1 | grep -q "not found" && echo "RED FLAG: Unpackaged PAM module: $path"
    rpm -qf "$path" 2>&1 | grep -q "not owned" && echo "RED FLAG: Unpackaged PAM module: $path"
  fi
done < /tmp/pam-modules.txt
```

**Why to escalate**: Every login on this system since the module was installed may be compromised. The operator must determine scope (which accounts, which services) and coordinate credential resets across dependent systems before containment.

---

### Red Flag 6: IP in Both btmp and Accepted Logins

**What it means**: An IP address appears in `/var/log/btmp` (failed login log) AND in successful authentication records. This is the signature of a successful brute force attack — the attacker tried multiple passwords and eventually found the correct one.

**How to detect**:
```bash
# Extract IPs from failed logins
lastb -F 2>/dev/null | awk '{print $3}' | grep -oP '\d+\.\d+\.\d+\.\d+' | sort -u > /tmp/failed-ips.txt

# Extract IPs from successful logins
last -F 2>/dev/null | awk '{print $3}' | grep -oP '\d+\.\d+\.\d+\.\d+' | sort -u > /tmp/success-ips.txt

# Find overlap
comm -12 <(sort /tmp/failed-ips.txt) <(sort /tmp/success-ips.txt) > /tmp/brute-force-success.txt
if [ -s /tmp/brute-force-success.txt ]; then
  echo "RED FLAG: Brute force success from:"
  cat /tmp/brute-force-success.txt
fi
```

**Why to escalate**: The affected account is compromised. The operator must determine what actions were taken under the compromised account before locking it. Immediate lockout may tip off the attacker.

---

### Red Flag 7: Anonymous RWX Memory Mappings

**What it means**: A process has anonymous (file-backed by nothing) memory regions that are readable, writable, AND executable simultaneously. This is the primary indicator of fileless malware — shellcode or a full payload loaded directly into memory from a network source, never touching disk.

**How to detect**:
```bash
# Check all processes for anonymous RWX mappings
for pid in $(ls /proc | grep '^[0-9]'); do
  maps="/proc/$pid/maps"
  if [ -r "$maps" ]; then
    # Anonymous RWX: no file path, permissions include rwx
    grep -P '^[0-9a-f]+-[0-9a-f]+\s+rwx[ps]\s+[0-9a-f]+\s+00:00\s+0\s*$' "$maps" \
      && echo "RED FLAG: Anonymous RWX mapping in PID $pid ($(cat /proc/$pid/comm 2>/dev/null))"
  fi
done
```

**Why to escalate**: The payload only exists in memory. Any action that terminates or disturbs the process destroys all evidence of the malware. Operator must coordinate a memory dump of the affected process immediately and determine whether the attacker is actively connected.

---

### Red Flag 8: Unexpected Kernel Module

**What it means**: A kernel module is loaded that is not part of the installed operating system packages. Kernel rootkits operate at ring 0, with full system privileges. They can intercept and modify any system call, hide any file, process, or network connection, and persist across all userspace security controls.

**How to detect**:
```bash
# Get currently loaded modules
lsmod | tail -n +2 | awk '{print $1}' > /tmp/loaded-modules.txt

# Get modules from packages (Debian/Ubuntu)
dpkg -l | grep -i linux-modules | awk '{print $2}' | while read pkg; do
  dpkg -L "$pkg" 2>/dev/null | grep '\.ko$'
done | xargs -I{} basename {} .ko | sort -u > /tmp/packaged-modules.txt

# RHEL/CentOS
rpm -qa | grep kernel | while read pkg; do
  rpm -ql "$pkg" 2>/dev/null | grep '\.ko$'
done | xargs -I{} basename {} .ko | sort -u >> /tmp/packaged-modules.txt

# Find modules loaded but not in packages
comm -23 <(sort /tmp/loaded-modules.txt) <(sort /tmp/packaged-modules.txt) > /tmp/unexpected-modules.txt
if [ -s /tmp/unexpected-modules.txt ]; then
  echo "RED FLAG: Unexpected kernel modules loaded:"
  cat /tmp/unexpected-modules.txt
fi
```

**Why to escalate**: A kernel rootkit invalidates the integrity of all evidence gathered from userspace tools on this system. The operator must assess whether analysis can continue safely (using a second system or offline disk analysis) or whether the scope requires law enforcement involvement.

## References

- MITRE ATT&CK: T1574.006 (LD_PRELOAD), T1014 (Rootkit), T1548.001 (SUID), T1110 (Brute Force), T1620 (Reflective Code Loading)
- SANS FOR508: Advanced Incident Response and Threat Hunting
- The Rootkit Arsenal, Bill Blunden
