# Compliance Checker — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Process Sample Blocks

These are the verbatim illustrative sample blocks for the agent's process steps. The agent definition retains a compact one-line-per-step capability summary; the full samples live here.

### Step 1: Data Classification and PII Discovery

```bash
# Scan codebase for potential PII handling patterns
grep -rn \
  -e "email" -e "phone" -e "ssn" -e "social_security" \
  -e "credit_card" -e "card_number" -e "dob" -e "date_of_birth" \
  -e "passport" -e "driver_license" -e "ip_address" \
  --include="*.ts" --include="*.js" --include="*.py" \
  src/ | grep -v "\.test\." | grep -v "node_modules" \
  > pii-scan-results.txt

wc -l pii-scan-results.txt
head -50 pii-scan-results.txt
```

```python
# Data classification script — identify and tag sensitive fields in database schema
import psycopg2
import json

PII_PATTERNS = {
    'email': ['email', 'email_address', 'user_email'],
    'phone': ['phone', 'phone_number', 'mobile', 'cell'],
    'name': ['first_name', 'last_name', 'full_name', 'display_name'],
    'address': ['address', 'street', 'city', 'zip', 'postal_code'],
    'financial': ['card_number', 'account_number', 'routing_number', 'ssn'],
    'health': ['diagnosis', 'medication', 'icd_code', 'patient_id'],
    'identity': ['dob', 'date_of_birth', 'passport_number', 'license_number'],
}

def classify_columns(conn):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, column_name
    """)
    
    classified = {}
    for table, column, dtype in cursor.fetchall():
        for classification, patterns in PII_PATTERNS.items():
            if any(p in column.lower() for p in patterns):
                if table not in classified:
                    classified[table] = []
                classified[table].append({
                    'column': column,
                    'type': dtype,
                    'classification': classification,
                    'requires_encryption': classification in ['financial', 'health', 'identity'],
                    'requires_pseudonymization': classification in ['name', 'email', 'phone'],
                })
    
    return classified

# Output data map for GDPR Article 30 Records of Processing Activities
conn = psycopg2.connect(dsn=DATABASE_URL)
data_map = classify_columns(conn)
print(json.dumps(data_map, indent=2))
```

### Step 2: Access Audit Queries

```sql
-- SOC2: User access review — who has access to what
SELECT
    u.email,
    u.role,
    u.last_login,
    u.created_at,
    CASE
        WHEN u.last_login < NOW() - INTERVAL '90 days' THEN 'INACTIVE - review required'
        WHEN u.last_login IS NULL THEN 'NEVER LOGGED IN - review required'
        ELSE 'Active'
    END AS access_status,
    COUNT(al.id) AS actions_last_30d
FROM users u
LEFT JOIN audit_logs al ON al.user_id = u.id
    AND al.created_at > NOW() - INTERVAL '30 days'
WHERE u.is_active = true
GROUP BY u.id, u.email, u.role, u.last_login, u.created_at
ORDER BY u.last_login ASC NULLS FIRST;

-- HIPAA: Access to patient records audit trail
SELECT
    al.created_at,
    u.email AS accessed_by,
    u.role,
    al.resource_type,
    al.resource_id,
    al.action,
    al.ip_address,
    al.reason,  -- HIPAA requires documented purpose
    CASE
        WHEN al.reason IS NULL THEN 'MISSING PURPOSE - HIPAA violation'
        ELSE 'Compliant'
    END AS hipaa_status
FROM audit_logs al
JOIN users u ON u.id = al.user_id
WHERE al.resource_type = 'patient_record'
  AND al.created_at > NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC;

-- PCI-DSS: Failed authentication attempts (Requirement 8.3)
SELECT
    ip_address,
    email,
    COUNT(*) AS failed_attempts,
    MIN(created_at) AS first_attempt,
    MAX(created_at) AS last_attempt
FROM auth_events
WHERE event_type = 'login_failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address, email
HAVING COUNT(*) >= 6  -- PCI-DSS threshold: lockout after 6 attempts
ORDER BY failed_attempts DESC;
```

### Step 3: Encryption Validation

```bash
# Verify TLS configuration on all endpoints
check_tls() {
    local host=$1
    echo "=== TLS Check: $host ==="
    
    # Protocol version check
    echo | openssl s_client -connect "$host:443" -tls1 2>&1 | grep -q "Cipher" \
        && echo "FAIL: TLS 1.0 supported (PCI-DSS non-compliant)" \
        || echo "PASS: TLS 1.0 rejected"
    
    echo | openssl s_client -connect "$host:443" -tls1_1 2>&1 | grep -q "Cipher" \
        && echo "FAIL: TLS 1.1 supported (PCI-DSS non-compliant)" \
        || echo "PASS: TLS 1.1 rejected"
    
    echo | openssl s_client -connect "$host:443" -tls1_2 2>&1 | grep -q "Cipher" \
        && echo "PASS: TLS 1.2 supported" \
        || echo "WARN: TLS 1.2 not supported"
    
    echo | openssl s_client -connect "$host:443" -tls1_3 2>&1 | grep -q "Cipher" \
        && echo "PASS: TLS 1.3 supported" \
        || echo "INFO: TLS 1.3 not supported"
    
    # Certificate expiry
    expiry=$(echo | openssl s_client -connect "$host:443" 2>/dev/null | \
        openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "Certificate expiry: $expiry"
}

check_tls api.example.com
check_tls auth.example.com
```

```python
# Validate encryption at rest — check for unencrypted sensitive fields
import boto3
import json

def check_rds_encryption(region='us-east-1'):
    rds = boto3.client('rds', region_name=region)
    instances = rds.describe_db_instances()['DBInstances']
    
    issues = []
    for db in instances:
        if not db.get('StorageEncrypted'):
            issues.append({
                'resource': db['DBInstanceIdentifier'],
                'type': 'RDS',
                'issue': 'Storage not encrypted at rest',
                'severity': 'CRITICAL',
                'compliance': ['SOC2 CC6.7', 'PCI-DSS 3.4', 'HIPAA 164.312(a)(2)(iv)'],
            })
    return issues

def check_s3_encryption(region='us-east-1'):
    s3 = boto3.client('s3', region_name=region)
    buckets = s3.list_buckets()['Buckets']
    
    issues = []
    for bucket in buckets:
        name = bucket['Name']
        try:
            enc = s3.get_bucket_encryption(Bucket=name)
            rules = enc['ServerSideEncryptionConfiguration']['Rules']
            algo = rules[0]['ApplyServerSideEncryptionByDefault']['SSEAlgorithm']
            if algo == 'AES256':
                # SSE-S3 — acceptable but SSE-KMS preferred for compliance
                issues.append({
                    'resource': name,
                    'type': 'S3',
                    'issue': 'Using SSE-S3, recommend SSE-KMS for key rotation compliance',
                    'severity': 'MEDIUM',
                    'compliance': ['SOC2 CC6.7'],
                })
        except s3.exceptions.ClientError:
            issues.append({
                'resource': name,
                'type': 'S3',
                'issue': 'No default encryption configured',
                'severity': 'CRITICAL',
                'compliance': ['SOC2 CC6.7', 'PCI-DSS 3.4'],
            })
    return issues

all_issues = check_rds_encryption() + check_s3_encryption()
print(json.dumps(all_issues, indent=2))
```

### Step 4: Policy-as-Code with OPA/Rego

```rego
# policies/access-control.rego
# Enforce role-based access control for patient data (HIPAA)

package healthcare.access

import future.keywords.if
import future.keywords.in

# Default: deny all
default allow := false

# Allow if user has appropriate role and stated purpose
allow if {
    input.user.role in {"physician", "nurse", "pharmacist"}
    input.resource.type == "patient_record"
    input.action in {"read", "update"}
    input.context.purpose != ""  # HIPAA requires stated purpose
    input.user.patient_panel[_] == input.resource.patient_id  # Treatment relationship
}

# Allow administrative access with elevated audit logging
allow if {
    input.user.role == "admin"
    input.context.admin_justification != ""
    input.context.supervisor_id != ""  # Break-glass requires supervisor
}

# Deny after business hours without emergency designation
deny_after_hours if {
    hour := time.clock(time.now_ns())[0]
    hour < 7
    hour > 22  # 7am-10pm window
    input.context.emergency != true
}
```

```bash
# Test OPA policies in CI
# Install OPA: https://www.openpolicyagent.org/docs/latest/#1-download-opa

# Run policy tests
opa test policies/ -v

# Evaluate a policy against sample input
cat > test-input.json << 'EOF'
{
  "user": {
    "role": "physician",
    "patient_panel": ["patient-123", "patient-456"]
  },
  "resource": {
    "type": "patient_record",
    "patient_id": "patient-123"
  },
  "action": "read",
  "context": {
    "purpose": "routine checkup"
  }
}
EOF

opa eval \
  --data policies/access-control.rego \
  --input test-input.json \
  "data.healthcare.access.allow"
```

```bash
# conftest — apply OPA policies to Kubernetes manifests
npm install -g conftest
# or: brew install conftest

# Policy: all deployments must have resource limits (SOC2 availability)
cat > policies/k8s-resources.rego << 'REGO'
package k8s.resources

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%s' missing memory limit", [container.name])
}

deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container '%s' missing CPU limit", [container.name])
}
REGO

# Test all Kubernetes manifests in k8s/ directory
conftest test k8s/ --policy policies/k8s-resources.rego
```

### Step 5: GDPR Data Subject Rights Implementation

```typescript
// GDPR Article 17: Right to Erasure
async function eraseDataSubject(userId: string, requestId: string): Promise<ErasureReport> {
  const report: ErasureReport = {
    requestId,
    userId,
    startedAt: new Date().toISOString(),
    tables: [],
  };

  // 1. Pseudonymize non-erasable records (audit logs must be retained)
  await db.query(`
    UPDATE audit_logs
    SET user_id = 'erased-${requestId}',
        ip_address = 'erased',
        user_agent = 'erased'
    WHERE user_id = $1
  `, [userId]);
  report.tables.push({ table: 'audit_logs', action: 'pseudonymized', rows: /* count */ });

  // 2. Delete PII from application tables
  const tables = ['user_profiles', 'addresses', 'payment_methods', 'sessions'];
  for (const table of tables) {
    const result = await db.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    report.tables.push({ table, action: 'deleted', rows: result.rowCount });
  }

  // 3. Anonymize orders (retain for accounting, remove PII)
  await db.query(`
    UPDATE orders
    SET shipping_name = 'Erased User',
        shipping_address = NULL,
        billing_name = 'Erased User',
        billing_address = NULL
    WHERE user_id = $1
  `, [userId]);

  // 4. Remove from email marketing lists
  await emailProvider.unsubscribeAndDelete(userId);

  // 5. Log the erasure for GDPR compliance record
  await complianceLog.record({
    event: 'data_erasure',
    requestId,
    userId,
    completedAt: new Date().toISOString(),
    tablesAffected: report.tables,
  });

  report.completedAt = new Date().toISOString();
  return report;
}
```

### Step 6: Compliance Gap Analysis Template

```markdown
# Compliance Gap Analysis
**Framework**: [GDPR / SOC2 / HIPAA / PCI-DSS]
**Date**: YYYY-MM-DD
**Scope**: [System name and boundary]

## Control Inventory

| Control ID | Requirement | Current State | Gap | Severity | Remediation | Owner | Due |
|------------|-------------|---------------|-----|----------|-------------|-------|-----|
| SOC2-CC6.1 | Logical access controls | Role-based access implemented | No MFA on admin accounts | HIGH | Enable MFA in auth provider | Eng Lead | 2026-03-15 |
| GDPR-Art.30 | Records of processing | Not documented | No data map exists | CRITICAL | Complete data classification exercise | DPO | 2026-03-01 |
| PCI-DSS-3.4 | Encrypt cardholder data | Encrypted at rest (AES-256) | None | PASS | — | — | — |

## Risk Summary

| Severity | Count | Must Resolve Before Audit |
|----------|-------|--------------------------|
| CRITICAL | N | Yes |
| HIGH | N | Yes |
| MEDIUM | N | Preferred |
| LOW | N | Best effort |
| PASS | N | N/A |

## Remediation Roadmap

Sprint 1 (Critical):
- [ ] [Control]: [Specific action] — Owner, N hours

Sprint 2 (High):
- [ ] [Control]: [Specific action] — Owner, N hours
```

## Few-Shot Examples

### Example 1: GDPR Article 30 Data Map (Simple)

**Input:**
We need to produce our GDPR Article 30 Records of Processing Activities for our SaaS product. We have a PostgreSQL database. Generate the data map.

**Output:**
```markdown
# Records of Processing Activities (GDPR Article 30)
**Controller**: [Company Name]
**DPO Contact**: [email]
**Last Updated**: 2026-02-27

## Processing Activity 1: User Account Management

| Field | Value |
|-------|-------|
| Purpose | Account creation and authentication |
| Legal Basis | Contract (GDPR Art. 6(1)(b)) |
| Data Categories | Name, email address, hashed password, last login timestamp |
| Data Subjects | Registered users |
| Recipients | None (no third-party sharing) |
| Third Country Transfers | None |
| Retention | Account lifetime + 30 days after deletion request |
| Security Measures | Encryption at rest (AES-256), TLS in transit, bcrypt password hashing |

**Database Location:**
| Table | Column | Classification | Encrypted | Retention |
|-------|--------|----------------|-----------|-----------|
| users | email | PII - Contact | No* | Account lifetime |
| users | first_name | PII - Identity | No* | Account lifetime |
| users | password_hash | Pseudonymous | N/A | Account lifetime |
| sessions | ip_address | PII - Technical | No | 30 days |

*Action required: Add column-level encryption for email and name fields (Gap: GDPR Art. 32)

## Processing Activity 2: Order Fulfillment

| Field | Value |
|-------|-------|
| Purpose | Process and fulfill customer orders |
| Legal Basis | Contract (GDPR Art. 6(1)(b)) |
| Data Categories | Name, shipping address, billing address, payment token (not card data) |
| Data Subjects | Purchasing users |
| Recipients | Stripe (payment processing), FedEx/UPS (shipping) |
| Third Country Transfers | Stripe US (SCCs in place, reference DPA-2024-001) |
| Retention | 7 years (accounting legal obligation) |
| Security Measures | Payment tokenization via Stripe (PCI-DSS scope shifted to Stripe) |

## Gap Summary

| Gap | Article | Severity | Action |
|-----|---------|----------|--------|
| No column encryption on email/name | Art. 32 | HIGH | Add application-layer encryption |
| No documented data retention automation | Art. 5(1)(e) | HIGH | Implement scheduled deletion job |
| Stripe DPA not signed | Art. 28 | CRITICAL | Execute DPA with Stripe immediately |
```

---

### Example 2: SOC2 Access Control Gap Analysis (Moderate)

**Input:**
We have a SOC2 Type II audit in 60 days. Run an access control gap analysis focused on CC6.1-CC6.3.

**Output:**
```markdown
# SOC2 CC6.1-CC6.3 Gap Analysis
**Audit Date**: 2026-04-28 (60 days)
**Scope**: Production environment, administrative access

## CC6.1 — Logical Access Security

| Control | Requirement | Evidence Found | Gap | Severity |
|---------|-------------|---------------|-----|----------|
| CC6.1.1 | Access provisioning process documented | No formal policy document | Policy missing | HIGH |
| CC6.1.2 | Unique IDs for all users | Verified: no shared accounts | PASS | — |
| CC6.1.3 | MFA for remote access | MFA enabled for SSO, NOT for AWS console direct login | MFA gap on AWS | CRITICAL |
| CC6.1.4 | Access termination within 24h of offboarding | Manual process, average 3.2 days | Automate offboarding | HIGH |

## CC6.2 — Prior to Issuing Credentials

| Control | Requirement | Evidence Found | Gap | Severity |
|---------|-------------|---------------|-----|----------|
| CC6.2.1 | Approval required for access requests | Informal Slack approvals, no ticket trail | No audit trail | HIGH |
| CC6.2.2 | Access reviews conducted quarterly | Last review: 14 months ago | Overdue by 11 months | CRITICAL |

## CC6.3 — Role-Based Access

| Control | Requirement | Evidence Found | Gap | Severity |
|---------|-------------|---------------|-----|----------|
| CC6.3.1 | Least privilege enforced | 8 users have admin permissions, 3 are no longer active | Privilege creep | HIGH |
| CC6.3.2 | Privileged access logged | CloudTrail enabled, logs retained 90 days | SOC2 requires 1 year | MEDIUM |

## 60-Day Remediation Plan

**Week 1-2 (CRITICAL):**
- Enable MFA on all AWS IAM users (2 hours engineering, immediate)
- Conduct emergency access review — revoke 3 stale admin accounts (4 hours)

**Week 3-4 (HIGH):**
- Document access provisioning policy in company handbook (8 hours)
- Implement Jira workflow for access requests — captures approval audit trail (12 hours)
- Automate offboarding via HR system webhook to IAM (16 hours)

**Week 5-6 (HIGH → Evidence):**
- Extend CloudTrail log retention to 1 year (S3 lifecycle policy, 2 hours)
- Conduct formal quarterly access review and document sign-off (4 hours)
- Generate evidence package: screenshots, query results, policy documents

**Buffer Week 7-8:**
- Internal audit walkthrough — simulate auditor evidence requests
- Address any findings from internal walkthrough

## Evidence Package Checklist

- [ ] MFA enforcement screenshot (AWS Console: IAM → Account Settings)
- [ ] Access review spreadsheet with manager sign-off dates
- [ ] CloudTrail log retention configuration export
- [ ] Access provisioning tickets (sample: last 10 new hires)
- [ ] Offboarding tickets with timestamp of access revocation (last 10 departures)
- [ ] Role assignment query results showing principle of least privilege
```

---

### Example 3: PCI-DSS Scope Reduction Plan (Complex)

**Input:**
We currently process card numbers directly in our backend. Our QSA says we're in SAQ D (full PCI-DSS scope). Help us reduce scope to SAQ A-EP using Stripe.js.

**Output:**
```markdown
# PCI-DSS Scope Reduction Plan: SAQ D → SAQ A-EP
**Current Assessment Level**: SAQ D (251 controls)
**Target Assessment Level**: SAQ A-EP (~60 controls)
**Business Outcome**: Eliminate direct cardholder data handling from our systems

## Why This Is Possible

SAQ A-EP applies when:
- Payment page is served from your servers (not fully redirected)
- Card data capture is handled entirely by Stripe.js (never touches your servers)
- Your servers never receive, store, process, or transmit cardholder data

## Current State: In-Scope Systems

| System | Why In Scope | Current Risk |
|--------|-------------|--------------|
| API server | Receives card numbers via POST /api/payments | CRITICAL |
| Database | Stores last 4 digits (acceptable) + tokens | Review needed |
| Application servers | Serve payment form | In scope (remains in scope for SAQ A-EP) |

## Target State: Scope Reduction via Tokenization

### Step 1: Implement Stripe.js on Frontend (Week 1-2)

Replace direct card form with Stripe Elements:

```typescript
// BEFORE: Card data sent to your server (in PCI scope)
const response = await fetch('/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    cardNumber: formData.cardNumber,  // NEVER do this
    expiry: formData.expiry,
    cvv: formData.cvv,
  })
});

// AFTER: Stripe.js handles card data — never touches your server
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe } from '@stripe/react-stripe-js';

const stripe = await loadStripe(process.env.STRIPE_PUBLIC_KEY);

// In your payment component:
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: elements.getElement(CardElement),  // Data goes directly to Stripe
});

// Only the token reaches your server
await fetch('/api/payments', {
  method: 'POST',
  body: JSON.stringify({
    paymentMethodId: paymentMethod.id,  // Stripe token, not card data
    amount: 2999,
  })
});
```

### Step 2: Remove Server-Side Card Handling (Week 3)

```typescript
// BEFORE: Direct card processing
app.post('/api/payments', async (req, res) => {
  const { cardNumber, expiry, cvv, amount } = req.body;  // DELETE ALL THIS
  // ...
});

// AFTER: Token-based processing only
app.post('/api/payments', async (req, res) => {
  const { paymentMethodId, amount } = req.body;  // Only tokens and amounts

  // Validate no card data accidentally present
  if (req.body.cardNumber || req.body.card_number || req.body.cvv) {
    throw new Error('Unexpected card data in request — reject and alert');
  }

  const charge = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
  });

  res.json({ success: true, chargeId: charge.id });
});
```

### Step 3: Verify Scope Reduction (Week 4)

```bash
# Scan codebase — confirm zero card data patterns remain
grep -rn \
  -e "card_number\|cardNumber\|card-number" \
  -e "cvv\|cvc\|security_code" \
  -e "expiry\|expiration\|exp_month" \
  src/ --include="*.ts" --include="*.js" \
  | grep -v "node_modules" \
  | grep -v "Stripe\|stripe" \
  | grep -v ".test."

# Zero results = scope reduced
```

### Remaining SAQ A-EP Scope (60 Controls)

After migration, remaining controls focus on:
- Serving the payment page securely (HTTPS, CSP headers)
- Protecting Stripe.js from tampering (Subresource Integrity)
- Monitoring for unauthorized modifications to payment page
- Access controls to production systems that serve the payment page

## Evidence for QSA

| Evidence Item | How to Generate |
|---------------|----------------|
| No cardholder data in transit | Network capture showing only tokens in POST /api/payments |
| No cardholder data at rest | Database query: SELECT * FROM payments LIMIT 10 (no card data visible) |
| Stripe.js integrity | HTML source showing script with integrity hash attribute |
| HTTPS on payment page | SSL Labs scan: A+ rating |
| Log review showing no card data | CloudWatch log search: grep for card patterns — zero results |

## Timeline and Cost

| Item | Effort | Cost |
|------|--------|------|
| Stripe.js integration | 16 hours | $2,400 engineering |
| Server-side cleanup | 8 hours | $1,200 engineering |
| QSA SAQ re-assessment | — | ~$8,000 → ~$2,000 (SAQ A-EP is simpler) |
| Annual savings on compliance | — | ~$20,000/year (fewer controls, faster assessment) |
| **Net first-year ROI** | | **$16,400** |
```
