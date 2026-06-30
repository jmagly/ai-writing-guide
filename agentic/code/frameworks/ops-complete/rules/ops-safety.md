---
enforcement: critical
---

# Ops Safety Rules

**Enforcement Level**: CRITICAL
**Scope**: All operational commands, agent-executed procedures, and infrastructure changes

## Principle

Operational safety is non-negotiable. Agents must detect interactive commands they cannot handle, gate destructive operations behind human confirmation, assess blast radius before execution, and never cross host boundaries without explicit authorization. A single unguarded `rm -rf` or silent `fdisk` can destroy production data in seconds.

## Mandatory Rules

### Rule 1: Detect Interactive Commands

Commands that require interactive input (password prompts, confirmation dialogs, TUI interfaces) MUST be flagged for human execution. Agents cannot type passwords or respond to interactive prompts safely.

**Commands requiring human execution**:
```bash
# Password/authentication prompts
sudo <anything>          # May prompt for password
cryptsetup luksOpen      # Requires passphrase
passwd                   # Interactive password entry
ssh-keygen               # Prompts for passphrase
mysql -p                 # Password prompt

# Interactive editors/TUIs
fdisk /dev/sdX           # Interactive partitioning
cfdisk, parted           # Interactive disk tools
visudo                   # Opens editor
systemctl edit            # Opens editor
nmtui                    # TUI network config
```

**Required agent behavior**:
```markdown
INTERACTIVE COMMAND DETECTED

The following command requires human execution:
  sudo cryptsetup luksOpen /dev/sda2 vault

Reason: Requires LUKS passphrase entry
Action: Please run this command manually, then confirm completion.
```

**Non-interactive alternatives when available**:
```bash
# Instead of interactive sudo, use pre-authorized patterns:
# If already root or passwordless sudo configured:
sudo -n systemctl restart nginx  # -n = non-interactive, fails instead of prompting

# Instead of interactive fdisk, use scriptable sfdisk:
sfdisk /dev/sdX < partition-layout.dump
```

### Rule 2: Gate Destructive Operations

Destructive operations MUST NOT be executed without explicit human confirmation. Present the command, its effects, and blast radius assessment before proceeding.

**Always-gated commands**:
```bash
# Filesystem destruction
rm -rf <path>            # Recursive forced delete
shred                    # Secure file destruction
mkfs.*                   # Filesystem creation (destroys existing data)
dd if=* of=/dev/*        # Raw disk write

# Partition/disk operations
fdisk, parted, gdisk     # Partition table changes
lvremove, vgremove       # LVM destruction
mdadm --stop, --remove   # RAID destruction

# Network/firewall
iptables -F              # Flush all firewall rules
ufw reset                # Reset firewall to defaults
ip link delete           # Remove network interface
nmcli con delete         # Remove network connection

# Service/system
systemctl disable <svc>  # Disable service at boot
systemctl mask <svc>     # Prevent service from starting
systemctl stop <critical># Stop critical services (defined per host)
reboot, shutdown, poweroff
update-grub, grub-install# Bootloader changes

# Package management (destructive)
apt purge, apt autoremove
dnf remove, rpm -e

# Database
DROP DATABASE, DROP TABLE
TRUNCATE TABLE
```

**Required gate format**:
```markdown
DESTRUCTIVE OPERATION — HUMAN CONFIRMATION REQUIRED

Command:    rm -rf /var/lib/postgresql/14/
Effect:     Permanently deletes all PostgreSQL 14 data
Blast radius: CRITICAL — all databases on this host
Reversible: NO (unless backup exists)
Backup status: [Check: ls -la /backup/pg/latest/]

Proceed? (requires explicit "yes" from human)
```

### Rule 3: Assess Blast Radius

Every operation must be classified by blast radius BEFORE execution:

| Level | Scope | Examples | Gate |
|-------|-------|----------|------|
| **CRITICAL** | Multi-host, data loss, unrecoverable | `rm -rf /`, firewall flush on gateway, DNS record deletion | Human approval + dry-run + backup verification |
| **HIGH** | Single host, service outage, recoverable | Service restart, package upgrade, config change | Human approval + dry-run |
| **MEDIUM** | Single service, brief disruption | Log rotation, cache clear, temp file cleanup | Human notification |
| **LOW** | No disruption, read-only, monitoring | Status checks, log reads, disk usage | No gate |

**Classification rules**:
- Affects more than one host → minimum CRITICAL
- Destroys data without backup → CRITICAL
- Causes service outage → minimum HIGH
- Modifies boot/network/auth config → minimum HIGH
- Read-only or informational → LOW

### Rule 4: Dry-Run First for High/Critical Operations

Operations classified HIGH or CRITICAL MUST attempt a dry-run before actual execution when the tool supports it.

**Dry-run patterns**:
```bash
# rsync
rsync -avz --dry-run source/ dest/

# apt
apt install --dry-run package-name

# rm (list instead of delete)
find /path -name "*.tmp" -print   # Review before -delete

# iptables
iptables -L -n                     # List before -F

# systemctl
systemctl list-dependencies svc    # Check deps before stop

# Ansible
ansible-playbook --check playbook.yml

# Terraform
terraform plan                     # Before apply
```

### Rule 5: Never Cross Host Boundaries Without Confirmation

Configuration from one host MUST NOT be applied to another host without explicit human confirmation. Hosts have unique hardware, network configurations, disk layouts, and service assignments.

**FORBIDDEN**:
```bash
# NEVER copy one host's config to another without review
scp gateway-01:/etc/network/interfaces compute-03:/etc/network/interfaces
ansible-playbook site.yml -l "all"  # Applying broad changes silently
```

**REQUIRED**:
```markdown
CROSS-HOST OPERATION DETECTED

Source host: gateway-01
Target host: compute-03
File: /etc/network/interfaces

These hosts have different:
- Network interfaces (gateway-01: eno1,eno2; compute-03: enp0s31f6)
- IP assignments (gateway-01: 10.0.0.1; compute-03: 10.0.0.42)
- Roles (gateway vs compute)

Applying gateway-01's network config to compute-03 will likely
cause network loss on compute-03.

Proceed only with explicit human confirmation.
```

### Rule 6: Token Security in Ops Contexts

Follows the core token-security rule with ops-specific additions:

```bash
# REQUIRED: Heredoc pattern for scoped token lifetime
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues"
EOF
# Token variable does not persist after heredoc

# FORBIDDEN: Tokens in command history
export GITEA_TOKEN="abc123..."  # Persists in shell history
curl -H "Authorization: token abc123" ...  # Visible in history
```

**Ops-specific additions**:
- Never store tokens in operational documents or runbooks
- Never include tokens in issue bodies or commit messages
- SSH keys and certificates follow the same rules as API tokens
- Secrets in systemd unit files must use `LoadCredential=` or `EnvironmentFile=`

## Detection

- Agent executing a command from the interactive list without flagging
- Destructive command executed without human confirmation gate
- Missing blast radius classification in operation plan
- High/critical operations without preceding dry-run
- Cross-host config application without human confirmation
- Tokens appearing in procedure documents, issue bodies, or commit messages

## Enforcement

- **On violation**: IMMEDIATE HALT — stop execution, report the violation, await human instruction
- **Severity**: CRITICAL — violations can cause data loss, outages, or security breaches
- **Recovery**: Review what was executed, assess damage, restore from backup if needed, add missing gates to the procedure
- **Escalation**: Any CRITICAL blast radius operation that was executed without approval must be reported as an incident
