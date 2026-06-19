# Triage Agent — Detection Playbook

Externalized detailed command sequences from the agent definition per the few-shot-examples rule (#1587, #1600). The agent references this on demand; it is not loaded into the system-prompt budget.

The agent definition keeps the Linux RFC 3227 volatility-order capture, the eight red-flag escalation gates (with their detection commands), and the deliverable template inline. This file carries the per-platform multi-platform triage command sequences.

The volatility order and escalation triggers remain identical across platforms — only the tools change.

---

## Windows Triage (WMI/PowerShell)

Capture volatile state via PowerShell. Run these in order, saving output to a timestamped directory.

```powershell
# Process list with full command lines and parent PIDs
Get-Process | Select-Object Id, ProcessName, Path, CPU, WorkingSet, StartTime | Sort-Object CPU -Descending

# Network state — equivalent to ss -tunap
Get-NetTCPConnection | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess |
  Where-Object { $_.State -eq 'Established' }

# Processes with no disk-resident binary (equivalent to /proc/*/exe deleted check)
Get-Process | Where-Object { $_.Path -eq $null } | Select-Object Id, ProcessName, CPU

# Security event log — last 200 authentication events
Get-WinEvent -LogName Security -MaxEvents 200 |
  Where-Object { $_.Id -in 4624, 4625, 4648, 4672, 4698, 4720 } |
  Select-Object TimeCreated, Id, Message

# Explicit auth failures and successes for privileged accounts
Get-EventLog -LogName Security -InstanceId 4625 -Newest 50
Get-EventLog -LogName Security -InstanceId 4624 -Newest 20

# Registry persistence — Run keys (execute at logon)
Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce"

# Services — look for unsigned or recently installed
Get-Service | Where-Object { $_.Status -eq 'Running' } |
  Select-Object Name, DisplayName, Status, StartType

# PowerShell command history (all users if running as admin)
Get-Content "$env:APPDATA\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt" -ErrorAction SilentlyContinue

# PowerShell transcription logs (if transcription enabled via GPO)
Get-ChildItem "$env:SystemDrive\PSTranscripts" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, LastWriteTime
```

**Windows-specific red flags**: Services running from `%TEMP%` or `%APPDATA%`; scheduled tasks added within the investigation window (`Get-ScheduledTask | Where-Object { $_.Date -gt (Get-Date).AddDays(-2) }`); unsigned drivers loaded via `driverquery /v`.

---

## macOS Triage (SSH)

macOS exposes volatile state through a mix of `launchctl`, the unified logging system, and BSD-inherited tools. Capture in this order.

```bash
# System time anchor
date -u +"%Y-%m-%dT%H:%M:%SZ"

# Running processes with command lines
ps auxwwef

# LaunchAgents and LaunchDaemons — persistence mechanisms
launchctl list
# Enumerate all plist sources
ls -la ~/Library/LaunchAgents/ /Library/LaunchAgents/ /Library/LaunchDaemons/ /System/Library/LaunchDaemons/ 2>/dev/null

# Network state
netstat -anp tcp
netstat -anp udp
arp -an

# Unified logging — last 30 minutes of security-relevant events
log show --last 30m --predicate 'subsystem == "com.apple.security" OR subsystem == "com.apple.authorization"' --info

# SSH and sudo events from unified log
log show --last 24h --predicate 'process == "sshd" OR process == "sudo"' --info | tail -100

# Filesystem activity — requires elevated privileges, generates high volume; limit duration
# fs_usage -t 10 2>/dev/null | grep -v dtrace | head -200

# Kernel extensions — look for unsigned or unexpected kexts
kextstat | grep -v "com.apple"

# Login items (user-level persistence)
osascript -e 'tell application "System Events" to get the name of every login item'
```

**macOS-specific red flags**: Kexts without an Apple Team ID in `kextstat` output; LaunchDaemon or LaunchAgent plists with `RunAtLoad = true` pointing to paths in `/tmp` or user home directories; `fs_usage` showing high-frequency writes to unusual locations.

---

## Cloud Triage (API-Based)

Cloud instances do not always allow SSH access. Use the cloud provider's control-plane APIs to capture volatile state. API calls are read-only and do not modify the instance.

### AWS

```bash
# Instance metadata — identify target
INSTANCE_ID="i-0abc123def456"
REGION="us-east-1"

# Running processes via SSM Run Command (no SSH required)
aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters commands='["ps auxwwef; ss -tunap; lsmod; ls -la /proc/*/exe 2>/dev/null | grep deleted"]' \
  --region "$REGION"

# Instance state and recent changes
aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region "$REGION" \
  --query 'Reservations[].Instances[].{State:State.Name,LaunchTime:LaunchTime,SecurityGroups:SecurityGroups}'

# Performance metrics — CPU spike may indicate crypto mining or exfiltration
aws cloudwatch get-metric-data \
  --metric-data-queries '[{"Id":"cpu","MetricStat":{"Metric":{"Namespace":"AWS/EC2","MetricName":"CPUUtilization","Dimensions":[{"Name":"InstanceId","Value":"'$INSTANCE_ID'"}]},"Period":300,"Stat":"Average"}}]' \
  --start-time "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --region "$REGION"

# CloudTrail — API calls made by or against this instance in last 2 hours
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue="$INSTANCE_ID" \
  --start-time "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --region "$REGION" | jq '.Events[] | {EventTime, EventName, Username: .Username, SourceIP: .CloudTrailEvent | fromjson | .sourceIPAddress}'

# Security group changes — detect unauthorized firewall modifications
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --start-time "$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --region "$REGION"
```

### Azure

```bash
RESOURCE_GROUP="my-rg"
VM_NAME="my-vm"
SUBSCRIPTION="00000000-0000-0000-0000-000000000000"

# Run volatile capture on VM (no SSH required via Run Command)
az vm run-command invoke \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --command-id RunShellScript \
  --scripts "ps auxwwef; ss -tunap; lsmod; ls -la /proc/*/exe 2>/dev/null | grep deleted"

# Activity log — control-plane events last 2 hours
az monitor activity-log list \
  --resource-group "$RESOURCE_GROUP" \
  --start-time "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --query '[].{caller:caller,operation:operationName.localizedValue,status:status.localizedValue,time:eventTimestamp}' \
  --output table

# VM instance view — running extensions and power state
az vm get-instance-view \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --query '{statuses:instanceView.statuses, extensions:instanceView.extensions}'
```

### GCP

```bash
PROJECT="my-project"
ZONE="us-central1-a"
INSTANCE="my-vm"

# Run volatile capture (no SSH via OS Login or IAP)
gcloud compute ssh "$INSTANCE" --zone="$ZONE" --project="$PROJECT" \
  --command="ps auxwwef; ss -tunap; lsmod; ls -la /proc/*/exe 2>/dev/null | grep deleted"

# Instance description — metadata, service accounts, network
gcloud compute instances describe "$INSTANCE" \
  --zone="$ZONE" \
  --project="$PROJECT" \
  --format="json" | jq '{status, networkInterfaces, serviceAccounts, metadata, lastStartTimestamp}'

# Audit logs — admin and data access events last 2 hours
gcloud logging read \
  "resource.type=gce_instance AND resource.labels.instance_id=$(gcloud compute instances describe $INSTANCE --zone=$ZONE --format='value(id)') AND timestamp>\"$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)\"" \
  --project="$PROJECT" \
  --format="json" | jq '.[] | {timestamp, severity, protoPayload: .protoPayload.methodName}'
```

**Cloud-specific red flags**: IAM role assumption events immediately before the incident window; security group or firewall rule modifications opening inbound access; service account key creation during the incident window; VPC flow logs showing unexpected outbound traffic volume.
