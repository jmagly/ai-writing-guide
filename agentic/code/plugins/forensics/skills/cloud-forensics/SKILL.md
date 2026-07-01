---
namespace: aiwg
name: cloud-forensics
description: "AWS, Azure, and GCP forensic investigation covering audit logs, IAM review, storage access, network flows, and compute instance forensics"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# cloud-forensics

Investigates cloud environments for signs of compromise, data exfiltration, privilege escalation, and persistence. Parameterized by cloud provider. Adapts collection procedures to AWS CloudTrail, Azure Monitor/Activity Log, and GCP Cloud Audit Logs. Maps findings to MITRE ATT&CK Cloud techniques.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "CloudTrail" → AWS audit log analysis
- "Activity Log" → Azure audit log analysis
- "Cloud Audit Logs" → GCP audit log analysis
- "IAM review" → cloud identity forensics

## Purpose

Cloud forensics requires provider-specific tooling and log sources. An AWS investigation centers on CloudTrail and GuardDuty; Azure on Activity Logs and Defender for Cloud; GCP on Cloud Audit Logs and Security Command Center. This skill selects the appropriate collection path and produces a consistent findings document regardless of provider.

## Behavior

When triggered, this skill:

1. **Identify cloud provider and configure access**:
   - AWS: verify `aws sts get-caller-identity` — record account ID, ARN, and user ID
   - Azure: verify `az account show` — record subscription ID, tenant ID, and principal
   - GCP: verify `gcloud auth list` and `gcloud config get-value project`
   - Prompt for provider if not determinable from environment

2. **AWS — CloudTrail audit log collection**:
   - List trails: `aws cloudtrail describe-trails`
   - Check if logging is enabled on all trails and all regions
   - Pull recent management events: `aws cloudtrail lookup-events --max-results 1000`
   - Flag high-risk event names: `CreateUser`, `AttachUserPolicy`, `PutRolePolicy`, `AssumeRole`, `GetSecretValue`, `DeleteTrail`, `StopLogging`, `PutBucketPolicy`
   - Check for CloudTrail log integrity validation status

3. **AWS — IAM review**:
   - List all IAM users and check for access keys older than 90 days: `aws iam list-users` + `aws iam list-access-keys`
   - List users with `AdministratorAccess` managed policy
   - List roles with trust policies allowing external principals or `*` in Principal
   - Check for recently created or modified IAM entities (within investigation window)
   - Download and analyze credential report: `aws iam generate-credential-report && aws iam get-credential-report`

4. **AWS — storage and data access**:
   - List S3 buckets with public access settings: `aws s3api get-public-access-block --bucket <name>`
   - Check for buckets with server access logging disabled
   - Review recent S3 data events in CloudTrail if data event logging is enabled
   - Check Secrets Manager and SSM Parameter Store access events

5. **Azure — Activity Log collection**:
   - Pull activity log for the investigation window: `az monitor activity-log list --start-time <ISO8601> --end-time <ISO8601>`
   - Flag high-risk operations: role assignment creation, policy assignments, key vault access, storage account key rotation, VM disk snapshots
   - Check Defender for Cloud alerts: `az security alert list`

6. **Azure — IAM (RBAC) review**:
   - List Owner and Contributor role assignments at subscription scope: `az role assignment list --include-classic-administrators`
   - Flag service principals with no associated application or with expired credentials
   - Check for recently created managed identities

7. **GCP — Cloud Audit Log collection**:
   - Query Admin Activity logs: `gcloud logging read 'logName:"cloudaudit.googleapis.com/activity"' --limit=1000`
   - Query Data Access logs if enabled
   - Flag: `SetIamPolicy`, `CreateServiceAccountKey`, `ActAs`, `signBlob`, bucket ACL changes
   - Check Security Command Center findings: `gcloud scc findings list <organization_id>`

8. **GCP — IAM review**:
   - List project-level IAM bindings: `gcloud projects get-iam-policy <project>`
   - Flag roles/owner and roles/editor at project or folder scope
   - List service account keys and flag keys older than 90 days
   - Check for allUsers or allAuthenticatedUsers bindings on any resource

9. **Compute instance forensics (all providers)**:
   - List running instances with metadata (creation time, last started, associated IAM role/service account)
   - Flag instances with public IP addresses that have inbound rules permitting 0.0.0.0/0 on sensitive ports
   - Check for recently created disk snapshots (potential exfiltration staging)
   - Review instance serial console output or boot logs where available

10. **Network flow log review**:
    - AWS: pull VPC Flow Logs for unusual outbound traffic patterns from targeted instances
    - Azure: pull NSG Flow Logs
    - GCP: pull VPC Flow Logs
    - Flag large data transfers, connections to known-bad IPs, and unusual destination ports

11. **Write findings document**:
    - Save to `.aiwg/forensics/findings/cloud-<provider>-forensics.md`
    - Sections: identity findings, logging gaps, data access anomalies, network anomalies, persistence indicators

## Usage Examples

### Example 1 — AWS
```
aws investigation
```
Uses the currently configured AWS CLI profile.

### Example 2 — GCP with project
```
gcp forensics --project my-project-id
```

### Example 3 — Azure
```
azure forensics --subscription 00000000-0000-0000-0000-000000000000
```

## Output Locations

- Findings: `.aiwg/forensics/findings/cloud-<provider>-forensics.md`
- Raw IAM report: `.aiwg/forensics/evidence/cloud-<provider>-iam.json`
- Audit log export: `.aiwg/forensics/evidence/cloud-<provider>-audit.json`

## Configuration

```yaml
cloud_forensics:
  investigation_window_hours: 72
  high_risk_aws_events:
    - CreateUser
    - AttachUserPolicy
    - PutRolePolicy
    - DeleteTrail
    - StopLogging
    - GetSecretValue
  key_age_threshold_days: 90
  flag_public_instances: true
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Verify provider identity and access before collection; detect available log sources
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Export and hash cloud artifacts before analysis; record snapshot IDs in custody log
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate when CloudTrail tampering (StopLogging, DeleteTrail) or active IAM privilege escalation is found
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/evidence-preservation/SKILL.md — Cloud evidence (snapshots, log exports) must be preserved per custody procedures
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/ioc-extraction/SKILL.md — Extract IOCs (suspicious IPs, ARNs, service principal IDs) from cloud audit log findings
