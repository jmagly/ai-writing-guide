---
enforcement: medium
---

# Access Audit Frequency

**Enforcement Level**: MEDIUM
**Scope**: SSH authorized keys, sudo grants, IdP client inventory, SSH certificate principals, and service account access across all fleet hosts
**Issue**: #778

## Principle

Access that is not regularly audited is access that is not controlled. Employees leave, roles change, service accounts accumulate permissions, and SSH keys proliferate. Without regular audits, the actual access state of the fleet diverges from the intended access policy until a security review or incident reveals the gap. Monthly audits with a 45-day staleness trigger provide the minimum acceptable visibility.

## Frequency Requirements

| Audit Type | Minimum Frequency | Staleness Trigger | Storage Location |
|------------|------------------|-------------------|------------------|
| SSH authorized_keys inventory | Monthly | 45 days | `.aiwg/security/access-snapshots/` |
| Sudo grants and sudoers.d | Monthly | 45 days | `.aiwg/security/access-snapshots/` |
| SSH certificate principals | Monthly | 45 days | `.aiwg/security/access-snapshots/` |
| IdP client inventory | Monthly | 45 days | `.aiwg/security/access-snapshots/` |
| Service account access review | Quarterly | 90 days | `.aiwg/security/access-reviews/` |
| Privileged access review (root, wheel, sudo) | Monthly | 45 days | `.aiwg/security/access-reviews/` |

## Staleness Detection

An access audit is considered stale when the most recent snapshot is older than the staleness trigger for its category. Stale audits are a compliance risk and must be flagged.

Detection: before any security assessment or compliance validation, check the modification timestamp of the most recent snapshot file in each category:

```bash
# Check age of most recent SSH access snapshot
find .aiwg/security/access-snapshots/ -name "*.md" -newer .aiwg/security/access-snapshots/.last-audit 2>/dev/null \
  || echo "STALE: no recent audit found"

# Check days since last audit
LAST_AUDIT=$(stat -c %Y .aiwg/security/access-snapshots/latest.md 2>/dev/null || echo 0)
NOW=$(date +%s)
DAYS_AGO=$(( (NOW - LAST_AUDIT) / 86400 ))
[ "$DAYS_AGO" -gt 45 ] && echo "STALE: last audit was ${DAYS_AGO} days ago (threshold: 45)"
```

## Mandatory Audit Contents

Each access snapshot must include the following, per host:

### SSH authorized_keys
- Listing of all users with home directories on the host
- For each user: full authorized_keys file contents (key type, key material fingerprint — not the raw key — and comment/label)
- Identification of any keys without a descriptive comment
- Identification of keys that do not correspond to a known operator identity

### Sudo Grants
- Contents of `/etc/sudoers` (parsed, not raw — redact any embedded secrets)
- Contents of all files in `/etc/sudoers.d/`
- For each grant: user or group, allowed commands, NOPASSWD flag
- Flag any `ALL=(ALL) NOPASSWD: ALL` grants for review

### SSH Certificate Principals
- List of valid principals authorized by the SSH CA
- For each principal: associated identity, validity period, allowed source IPs (if restricted)
- Flag expired certificates that are still in authorized_principals files

### IdP Client Inventory
- Realm name and description
- All clients (applications) registered in the realm
- For each client: client ID, type (public/confidential), redirect URIs, granted scopes
- Flag any client with `*` wildcard redirect URIs or overly broad scope grants

## Compliance Risk Classification

| Finding | Risk Level | Required Action |
|---------|-----------|-----------------|
| Audit older than 45 days | MEDIUM | Run `sec-access-snapshot` immediately |
| Audit older than 90 days | HIGH | Treat as compliance gap, escalate |
| No audit on record | HIGH | Treat as compliance gap, run audit |
| Key without associated identity | MEDIUM | Investigate, remove if unidentifiable |
| `NOPASSWD: ALL` sudo grant | HIGH | Review, require justification or remove |
| Wildcard redirect URI in IdP | HIGH | Review client configuration |
| Orphaned service account | MEDIUM | Verify purpose, remove if unused |
| Expired SSH cert in authorized_principals | LOW | Remove cert from authorized_principals |

## Trigger Conditions

In addition to the scheduled monthly cadence, run an access audit immediately when:

- Any operator leaves the organization or changes roles
- A security incident is declared that may involve unauthorized access
- A new host is added to the fleet (baseline snapshot for that host)
- A host is decommissioned (final audit before removal from fleet records)
- An SSH CA key is rotated (verify all principals are re-issued)
- An IdP realm configuration is significantly changed

## Output Requirements

Each audit run must produce a snapshot file following the `access-audit-report` template, saved to `.aiwg/security/access-snapshots/YYYY-MM-DD-access-snapshot.md`. The most recent snapshot must also be linked or copied to `.aiwg/security/access-snapshots/latest.md` for staleness detection.

## Rationale

Access audits are the primary control for detecting privilege creep and orphaned credentials. In a fleet environment, SSH keys and sudo grants accumulate faster than they are removed. A former employee's SSH key that persists in authorized_keys is a standing invitation for unauthorized access. Monthly audits with 45-day staleness triggers provide a detection window that is short enough to catch departures and role changes before they become incidents.
