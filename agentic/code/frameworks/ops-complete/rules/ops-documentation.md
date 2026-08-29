---
enforcement: high
---

# Ops Documentation Rules

**Enforcement Level**: HIGH
**Scope**: All operational documents, runbooks, procedures, and host-specific guides

## Principle

Every operational document must be executable, idempotent, verified, classified, and destination-safe. Exact topology belongs only in a sink authorized for the document's classification; less-trusted destinations receive a sanitized summary.

## Mandatory Rules

### Rule 1: Follow the Standard Document Structure

Every operational document MUST include these sections in order:

1. **Purpose** — One paragraph. State what this procedure does, what it affects, and any upfront warnings (e.g., "requires downtime", "destructive to existing data", "must run as root").
2. **System Topology** — Device names, hostnames, IP addresses, filesystem paths, OS versions, package versions. Enough context to know whether the procedure applies to the current host.
3. **Procedure** — Numbered step-by-step instructions with copy-paste commands.
4. **Verification** — Commands to confirm success, with expected output shown.
5. **Troubleshooting** — Symptom-driven. "If you see X, do Y."
6. **House Rules for Agents** — Explicit do/don't list for AI agents executing this procedure.
7. **What NOT to Fix** — Intentional quirks, known-but-accepted deviations, things that look broken but aren't.
8. **Audit Trail** — Date, author, last-verified date, applicable hosts.

**Example structure**:
```markdown
## Purpose
Rotate TLS certificates on the reverse proxy. Requires 30-second downtime.
Agent warning: Do NOT restart nginx until verification passes.

## System Topology
- Host: gateway-01 (192.168.1.1)
- OS: Debian 12.8
- nginx: 1.24.0
- Cert path: /etc/nginx/ssl/

## Procedure
1. Back up current certs:
   ```bash
   cp -a /etc/nginx/ssl/ /etc/nginx/ssl.bak.$(date +%Y%m%d)
   ```
2. Generate new certificate:
   ```bash
   certbot renew --deploy-hook "systemctl reload nginx"
   ```

## Verification
```bash
openssl x509 -in /etc/nginx/ssl/cert.pem -noout -dates
```
Expected output:
```
notBefore=Mar 24 00:00:00 2026 GMT
notAfter=Jun 22 00:00:00 2026 GMT
```

## Troubleshooting
- **Symptom**: `nginx: [emerg] cannot load certificate` → Check file permissions: `ls -la /etc/nginx/ssl/`
- **Symptom**: Certificate shows old dates → certbot may have cached. Run `certbot certificates` to check.
```

### Rule 2: Commands Must Be Copy-Paste Ready

Every command in a procedure MUST be runnable as-is. No placeholders without explicit substitution instructions.

**FORBIDDEN**:
```bash
# Vague placeholder
ssh <your-host> "systemctl restart nginx"
```

**REQUIRED**:
```bash
# Explicit host or substitution instruction
ssh gateway-01 "systemctl restart nginx"

# If variable, show the substitution:
HOST="gateway-01"  # Change to target hostname
ssh "${HOST}" "systemctl restart nginx"
```

### Rule 3: Include Expected Output

Every verification command and every non-trivial command MUST show its expected output. Agents and operators need to compare actual vs expected to detect problems.

**FORBIDDEN**:
```bash
# No expected output shown
systemctl status nginx
```

**REQUIRED**:
```bash
systemctl status nginx
# Expected: active (running) since ...
```

Or for structured output:
```bash
systemctl is-active nginx
```
Expected output:
```
active
```

### Rule 4: End With Verification

Every procedure MUST end with one or more verification steps that confirm the operation succeeded. Verification commands must be independent of the procedure itself — they test the result, not the process.

**FORBIDDEN**:
```markdown
## Procedure
1. Run the migration script
2. Done!
```

**REQUIRED**:
```markdown
## Verification
1. Confirm service is running:
   ```bash
   systemctl is-active myservice
   ```
   Expected: `active`

2. Confirm endpoint responds:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health
   ```
   Expected: `200`
```

### Rule 5: Idempotent When Possible

Procedures SHOULD be idempotent — running them twice produces the same result as running once. When idempotency is not possible, the document MUST explicitly state so and explain what happens on re-run.

**Idempotent pattern**:
```bash
# Create directory only if missing
mkdir -p /opt/myapp/data

# Add line only if not present
grep -qF 'net.ipv4.ip_forward=1' /etc/sysctl.conf || \
  echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
```

**Non-idempotent — must be declared**:
```markdown
> **WARNING: Not idempotent.** Running this procedure twice will create
> duplicate database entries. Check step 3 verification before re-running.
```

### Rule 6: Agent House Rules Are Explicit

When a document will be consumed by AI agents, include a "House Rules for Agents" section with explicit constraints:

```markdown
## House Rules for Agents
- DO: Execute commands exactly as written
- DO: Compare actual output against expected output before proceeding
- DO: Stop and report if any verification step fails
- DON'T: Substitute hostnames or paths unless instructed
- DON'T: Skip verification steps to save time
- DON'T: Attempt to fix failures autonomously — report to human
```

### Rule 7: Document Intentional Quirks

Include a "What NOT to Fix" section for anything that looks wrong but is intentional. This prevents agents and new operators from "fixing" things that will break the system.

```markdown
## What NOT to Fix
- **Port 8443 on gateway-01**: Looks like a misconfiguration but is intentional
  for legacy client compatibility. Do not change to 443.
- **Stale PID file in /var/run/myapp.pid**: Left from pre-systemd era. Harmless.
  Do not delete — legacy monitoring checks for it.
```

### Rule 8: Classify and Gate the Document

Every generated ops artifact MUST resolve governance metadata and lifecycle metadata before persistence. Sensitive host, network, identity, recovery, and raw audit artifacts default to non-public classifications. Repository visibility, issue/PR/comment visibility, cross-repo copies, and exports are distinct named sinks; do not infer authorization from repository ownership or local write access.

Run `aiwg ops evidence prepare` or call `prepareEvidenceForSink`/`publishEvidence` before writing. A denied artifact is not publishable. If the boundary returns a sanitized summary, publish only that prepared summary and retain its payload-free decision record.

## Detection

- Procedure missing any of the 8 required sections
- Commands containing unresolved placeholders (`<...>`, `{...}`, `YOUR_*`)
- Missing expected output after verification commands
- Procedure ending without a verification section
- No idempotency declaration for destructive or stateful operations
- Missing agent house rules in documents tagged for agent consumption
- Missing classification/lifecycle metadata or a successful publication-gate decision

## Enforcement

- **On violation**: Flag during review with specific missing section
- **Severity**: HIGH — incomplete procedures cause operational incidents
- **Recovery**: Add missing sections before merging; for urgent fixes, add a `TODO(ops-doc)` marker and create a follow-up issue
