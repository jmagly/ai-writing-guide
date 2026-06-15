# Network Analyst — Detection Playbook

Externalized detailed command sequences from the agent definition per the few-shot-examples rule (#1587, #1600). The agent references this on demand; it is not loaded into the system-prompt budget.

The agent definition keeps the enumerated detection targets, ATT&CK mappings, and gates inline. This file carries the exact command sequences per analysis type/protocol.

---

### 1. Connection State Analysis

The triage agent captured a snapshot of all connections at triage time. This is your starting point.

```bash
# Parse triage-captured connection state
# Establish connections to external IPs (non-RFC1918)
grep ESTABLISHED /evidence/INC-*/triage/network-state-at-triage.txt | \
  awk '{print $5}' | grep -v "127\.\|10\.\|172\.1[6-9]\.\|172\.2[0-9]\.\|172\.3[01]\.\|192\.168\." | \
  sort | uniq -c | sort -rn

# All listening services (compare against known-good baseline from recon)
grep LISTEN /evidence/INC-*/triage/network-state-at-triage.txt

# Connections by process (identifies which processes have external connections)
grep ESTAB /evidence/INC-*/triage/network-state-at-triage.txt | \
  awk '{print $6, $5}' | sort | uniq -c | sort -rn

# High port connections (outbound to non-standard ports — often C2)
grep ESTABLISHED /evidence/INC-*/triage/network-state-at-triage.txt | \
  awk '{print $5}' | grep -oP ':\K\d+$' | \
  awk '$1 > 1024 && $1 != 8080 && $1 != 8443 && $1 != 443 && $1 != 80' | \
  sort | uniq -c | sort -rn
```

Every external established connection needs an explanation. Connections from unexpected processes (www-data with an outbound connection, a database process connecting to external IPs) are immediate red flags.

### 2. DNS Query Analysis

DNS is used for both legitimate resolution and C2 communication (DNS tunneling). Unusual DNS patterns reveal C2 domains even when HTTP traffic is encrypted.

```bash
# System DNS query cache — recently resolved domains
nscd -g 2>/dev/null | grep -A5 "hosts cache"

# DNS queries from syslog or named logs
grep "query\[" /var/log/syslog 2>/dev/null | tail -100
grep "client" /var/log/named/default 2>/dev/null | tail -100

# Journal-based DNS (systemd-resolved)
journalctl -u systemd-resolved --since "2024-03-14" --until "2024-03-16" --no-pager 2>/dev/null

# /etc/hosts modifications (attackers may redirect legitimate domains)
cat /etc/hosts
diff /etc/hosts <(sort -k2 /etc/hosts) 2>/dev/null  # Detect out-of-order entries

# Passive DNS from web server logs
awk '{print $7}' /evidence/INC-*/logs/nginx-access.log 2>/dev/null | \
  grep -oP 'https?://\K[^/]+' | sort | uniq -c | sort -rn | head -30

# DNS over unusual ports (DNS tunneling often uses non-standard ports)
grep ":5353\|:5355\|:8853" /evidence/INC-*/triage/network-state-at-triage.txt
```

DNS query patterns to flag: high-frequency queries to a single domain (beaconing), very long subdomain labels (DNS tunneling), queries to recently-registered domains, and domains that resolve to known threat intelligence indicators.

### 3. Beaconing Detection

Beaconing is a periodic check-in pattern where malware contacts its C2 server at regular intervals. The regularity distinguishes C2 traffic from legitimate applications.

```bash
# Extract timestamps and destination IPs from connection logs
# Then group by destination to find periodic patterns

# From firewall logs (if available)
grep "ACCEPT\|ESTABLISHED" /var/log/ufw.log 2>/dev/null | \
  awk '{print $5, $7, $12}' | sort | head -200

# From access logs — requests to external destinations at regular intervals
awk '{print $4, $1}' /evidence/INC-*/logs/nginx-access.log 2>/dev/null | \
  grep "185.220.101.47\|91.108.4.12" | sort

# Cron-based beaconing: every-minute cron entries with curl or wget
grep -r "curl\|wget" /etc/cron.d/ /var/spool/cron/ 2>/dev/null

# Timer-based beaconing: systemd timers executing network calls
for timer in $(systemctl list-timers --all --no-legend | awk '{print $NF}'); do
  service=$(systemctl cat "$timer" 2>/dev/null | grep "^Unit=" | cut -d= -f2)
  [ -n "$service" ] && systemctl cat "$service" 2>/dev/null | grep -iE "curl|wget|nc|ncat|python"
done
```

Calculate inter-request intervals for suspicious IPs. C2 beacons typically have jitter (slight randomness) to evade exact-interval detection, but the variance is usually small (within 10-20% of the base interval).

### 4. Lateral Movement Indicators

Lateral movement appears as host-to-host connections that deviate from the normal application architecture.

```bash
# SSH connections between internal hosts (T1021.004)
grep "Accepted" /evidence/INC-*/logs/auth.log | \
  grep -E "10\.|172\.1[6-9]\.|172\.2[0-9]\.|172\.3[01]\.|192\.168\." | \
  awk '{print $1, $2, $3, $9, $11}' | sort

# Internal port scans (many connections to many internal IPs in short time)
grep "Connection refused\|RESET\|refused" /var/log/syslog 2>/dev/null | \
  grep -E "10\.|172\.1[6-9]\.|192\.168\." | head -50

# WMI/RPC/SMB equivalent on Linux (internal NFS, rsync, rsh)
grep -E ":2049|:873|:111|:445" /evidence/INC-*/triage/network-state-at-triage.txt

# Outbound connections from services that should not connect outbound
# (e.g., database server establishing outbound SSH)
grep ESTABLISHED /evidence/INC-*/triage/network-state-at-triage.txt | \
  grep -E "mysql|postgres|redis|mongodb" | \
  grep -v "127\.\|::1"
```

Lateral movement leaves a characteristic fingerprint: a single source IP attempting connections to multiple internal hosts, particularly on administrative ports (22, 3389, 5985, 445).

### 5. Data Exfiltration Assessment

Identify whether sensitive data was transferred out of the environment.

```bash
# Outbound data volume by destination (requires connection logs with byte counts)
awk '{print $8, $9}' /var/log/ufw.log 2>/dev/null | grep "DST=" | \
  grep -oP 'DST=\K[\d.]+' | sort | uniq -c | sort -rn | head -20

# Large outbound transfers in web server access logs
awk '$10 > 1000000 {print $1, $4, $7, $10}' \
  /evidence/INC-*/logs/nginx-access.log 2>/dev/null | sort -k4 -rn | head -20

# DNS exfiltration indicators — unusually long DNS labels
grep "query\[" /var/log/syslog 2>/dev/null | \
  grep -oP 'for \K[^\s]+' | \
  awk 'length($1) > 50 {print $1}' | sort | uniq -c | sort -rn

# Files accessed before suspected exfiltration window (requires audit log)
ausearch -ts "03/15/2024 02:00:00" -te "03/15/2024 04:00:00" -k data-access \
  2>/dev/null | head -50

# SFTP/SCP activity in SSH logs
grep -E "sftp|scp" /evidence/INC-*/logs/auth.log 2>/dev/null
journalctl -u sshd 2>/dev/null | grep -E "sftp|scp" | tail -30
```

### 6. C2 Pattern Recognition

Identify characteristics that distinguish C2 traffic from legitimate traffic.

```bash
# User agent analysis — C2 frameworks use distinctive user agents
awk -F'"' '{print $6}' /evidence/INC-*/logs/nginx-access.log 2>/dev/null | \
  sort | uniq -c | sort -rn | head -30

# Unusual user agents associated with known C2 frameworks
grep -iE "python-requests|go-http-client|curl/[0-9]|wget/[0-9]|okhttp|fasthttp" \
  /evidence/INC-*/logs/nginx-access.log 2>/dev/null | head -20

# HTTP POST to unusual endpoints (C2 check-in often uses POST)
grep '"POST' /evidence/INC-*/logs/nginx-access.log 2>/dev/null | \
  awk '{print $7}' | sort | uniq -c | sort -rn | head -20

# HTTPS connections to IPs rather than hostnames (no SNI — evasion technique)
grep "CONNECT [0-9]" /var/log/squid/access.log 2>/dev/null | head -20

# Long-lived HTTP connections (C2 polling maintains persistent connections)
# Look for connections with very large response times in access logs
awk '$NF > 30 {print $1, $4, $7, $9, $NF}' \
  /evidence/INC-*/logs/nginx-access.log 2>/dev/null | head -20
```

### 7. Reverse Shell Detection

A reverse shell is an outbound connection from the target host initiated by a shell process rather than a legitimate service. Because the connection is outbound, it passes most perimeter firewall rules without special configuration.

```bash
# Identify shell processes with active outbound connections (Linux)
ss -tunap | grep -E 'bash|sh|python|perl|nc|ncat'

# Cross-reference with the triage connection snapshot
grep -E 'bash|/bin/sh|python|perl|ncat|netcat|nc ' \
  /evidence/INC-*/triage/network-state-at-triage.txt

# Named pipe / FIFO-based shells leave file descriptors pointing at fifos
ls -la /proc/*/fd 2>/dev/null | grep -E 'pipe|fifo'

# Stageless indicators: single binary, no dropper, payload embedded in process memory
# Staged indicators: initial stager (small downloader) followed by second connection
# Check for two-phase connections from the same source IP at short intervals
grep ESTAB /evidence/INC-*/triage/network-state-at-triage.txt | \
  awk '{print $5}' | sort | uniq -d
```

Reverse shells from shell interpreter processes (bash, sh) are unambiguous indicators of compromise. Named pipe shells (`mkfifo /tmp/f; nc ... < /tmp/f | /bin/sh > /tmp/f`) leave FIFOs on disk — check `/tmp` and world-writable directories for anonymous named pipes.

### 8. Cryptominer Detection

Cryptomining malware establishes outbound connections to mining pool infrastructure. The connections are long-lived, high-bandwidth, and occur on well-known pool ports.

```bash
# Mining pool protocol connections (stratum+tcp uses these ports)
grep -E ':3333|:4444|:8333|:14444|:45700' \
  /evidence/INC-*/triage/network-state-at-triage.txt

# Known mining pool domains in DNS logs
grep -iE "xmrpool|nanopool|minexmr|f2pool|antpool|nicehash|moneropool|supportxmr" \
  /var/log/syslog 2>/dev/null

# CPU-intensive processes with concurrent external connections
# Correlate ps output (high %CPU) with ss output (external IP)
grep ESTAB /evidence/INC-*/triage/network-state-at-triage.txt | \
  awk '{print $6}' | grep -oP 'pid=\K[0-9]+' | \
  xargs -I{} ps -o pid,ppid,pcpu,cmd -p {} 2>/dev/null

# XMR/BTC wallet address patterns in process environment variables
grep -r "4[0-9A-Za-z]\{94\}\|[13][a-km-zA-HJ-NP-Z1-9]\{25,34\}" \
  /proc/*/environ 2>/dev/null
```

Cryptominers are often deployed alongside initial access payloads as a secondary monetization strategy. A miner connection does not preclude a more serious threat — correlate with the persistence hunter's findings to determine whether a full backdoor is also present.

### 9. Windows Lateral Movement

Windows environments provide multiple built-in remote administration protocols that attackers repurpose for lateral movement. Each leaves characteristic network fingerprints.

```bash
# RDP (T1021.001): port 3389 inbound from unexpected internal sources
# On Windows: Event ID 4624 Logon Type 10 = RemoteInteractive (RDP)
grep ":3389" /evidence/INC-*/triage/network-state-at-triage.txt
# NLA anomalies: CredSSP failures before successful logon indicate credential spray

# WMI (T1047): DCOM initiates on port 135, negotiates high ephemeral port
# wmiprvse.exe spawning cmd.exe or powershell.exe is a direct lateral movement indicator
grep ":135" /evidence/INC-*/triage/network-state-at-triage.txt
# Correlate with process tree: parent wmiprvse.exe → child cmd.exe or powershell.exe

# SMB (T1021.002): port 445, access to admin$ and C$ shares
# PsExec creates PSEXESVC service on target — look for service creation events
grep ":445" /evidence/INC-*/triage/network-state-at-triage.txt

# WinRM (T1021.006): HTTP-based remote shell on 5985 (HTTP) or 5986 (HTTPS)
grep -E ":5985|:5986" /evidence/INC-*/triage/network-state-at-triage.txt
```

All four protocols are legitimate Windows administration features. The distinguishing factor is the source: lateral movement originates from hosts that have no documented administrative relationship with the target. Build the expected communication matrix from the baseline and flag any deviation.

### 10. PCAP Analysis Guidance

Packet captures provide the highest-fidelity network evidence. Use these patterns when PCAP is available from network taps, span ports, or endpoint EDR tools.

```bash
# tcpdump: capture C2-relevant traffic during live response (before containment)
tcpdump -i eth0 -w /evidence/INC-001/captures/live-$(date +%s).pcap \
  'not port 22 and not src net 10.0.0.0/8'

# tcpdump: targeted capture for specific suspicious IP
tcpdump -i eth0 -w /evidence/INC-001/captures/c2-185.220.101.47.pcap \
  'host 185.220.101.47'

# tshark: extract all HTTP host headers to identify C2 domains
tshark -r /evidence/INC-001/captures/live.pcap \
  -Y 'http.request' -T fields -e ip.dst -e http.host -e http.request.uri | \
  sort | uniq -c | sort -rn

# tshark: identify long-lived connections (potential C2 keep-alive)
tshark -r /evidence/INC-001/captures/live.pcap \
  -T fields -e ip.src -e ip.dst -e tcp.stream -e frame.time_relative | \
  awk 'NR>1 {streams[$3]=$4; src[$3]=$1; dst[$3]=$2} END {for (s in streams) if (streams[s]+0 > 300) print src[s], dst[s], streams[s]}'

# tshark: extract DNS queries for DGA analysis
tshark -r /evidence/INC-001/captures/live.pcap \
  -Y 'dns.flags.response == 0' -T fields -e dns.qry.name | \
  sort | uniq -c | sort -rn

# Wireshark display filter: C2 HTTP beaconing candidates
# http.request.method == "POST" && !(http.host contains "microsoft") && !(http.host contains "google")

# Wireshark display filter: DNS tunneling candidates
# dns && frame.len > 200

# Zeek/Bro conn.log: summarize connections by destination with byte counts
awk -F'\t' 'NR>8 {print $5, $6, $10, $16}' /var/log/zeek/conn.log 2>/dev/null | \
  sort | uniq -c | sort -rn | head -30
```

When PCAP is unavailable, Zeek/Bro conn.log provides pre-parsed connection summaries including duration, bytes transferred, and protocol. If neither is available, fall back to firewall logs and the triage connection snapshot.

### 11. Cloud VPC Flow Log Analysis

Cloud environments replace traditional network taps with VPC flow logs. These logs capture 5-tuple connection metadata but not payload content.

```bash
# AWS VPC Flow Logs: default format fields
# version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
# Filter for REJECT (blocked by security group or NACL) to find scanning activity
awk '$14 == "REJECT" {print $5, $7}' /evidence/INC-*/aws-vpc-flow.log | \
  sort | uniq -c | sort -rn | head -20

# AWS: identify ENI-level anomalies — which interface has unexpected external traffic
awk '$14 == "ACCEPT" && $5 !~ /^10\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^192\.168\./ {print $3, $5, $6}' \
  /evidence/INC-*/aws-vpc-flow.log | sort | uniq -c | sort -rn | head -20

# Azure NSG Flow Logs: flow tuple format (version 2)
# Fields: time, systemId, macAddress, category, resourceId, operationName, properties
# Extract accepted outbound flows
grep '"decision":"A"' /evidence/INC-*/azure-nsg-flow.json | \
  python3 -c "import sys, json; [print(json.loads(l)) for l in sys.stdin]" 2>/dev/null | head -30

# GCP VPC Flow Logs (exported to Cloud Storage or BigQuery)
# 5-tuple: src_ip, src_port, dest_ip, dest_port, protocol
# Subnet-level pattern: identify which subnet is generating most external traffic
awk -F',' 'NR>1 {print $3}' /evidence/INC-*/gcp-vpc-flow.csv 2>/dev/null | \
  grep -v "^10\.\|^172\.\|^192\.168\." | sort | uniq -c | sort -rn | head -20
```

VPC flow logs are typically stored in object storage with a delay of 5-15 minutes from event time. When analyzing cloud incidents, request the flow logs for a window starting two hours before the suspected initial access time. ENI-level analysis in AWS allows you to pinpoint which specific resource (EC2 instance, Lambda, container) initiated the suspicious connection.

### 12. DGA and DoH Detection

Domain Generation Algorithms produce high-entropy random-looking domains. DNS over HTTPS tunnels DNS queries inside HTTPS traffic to bypass DNS monitoring.

```bash
# DGA detection: high-entropy domain names in DNS logs
# Calculate character entropy; DGA domains typically score > 3.5 bits/char
grep "query\[" /var/log/syslog 2>/dev/null | grep -oP 'for \K[^\s]+' | \
  python3 -c "
import sys, math
from collections import Counter
for line in sys.stdin:
    d = line.strip()
    label = d.split('.')[0]
    if len(label) < 6: continue
    c = Counter(label)
    entropy = -sum((v/len(label)) * math.log2(v/len(label)) for v in c.values())
    if entropy > 3.5:
        print(f'{entropy:.2f}  {d}')
" | sort -rn | head -30

# NXDomain ratio: DGA malware queries many non-existent domains
# High NXDomain count relative to successful queries is a strong DGA indicator
grep "NXDOMAIN\|query\[" /var/log/syslog 2>/dev/null | \
  awk '/NXDOMAIN/{nx++} /query\[/{total++} END {print "NXDomain:", nx, "/ Total:", total, "/ Ratio:", nx/total}'

# DoH detection: HTTPS traffic to known DoH resolver IPs on port 443
# These are legitimate resolvers — traffic volume and originating process matter
grep -E "1\.1\.1\.1:443|1\.0\.0\.1:443|8\.8\.8\.8:443|8\.8\.4\.4:443|9\.9\.9\.9:443|208\.67\.222\.222:443" \
  /evidence/INC-*/triage/network-state-at-triage.txt

# DoH via certificate inspection: identify HTTPS sessions to DoH resolvers
# (requires PCAP; SNI will show cloudflare-dns.com, dns.google, etc.)
tshark -r /evidence/INC-001/captures/live.pcap \
  -Y 'tls.handshake.extensions_server_name contains "dns.google" or tls.handshake.extensions_server_name contains "cloudflare-dns.com"' \
  -T fields -e ip.src -e tls.handshake.extensions_server_name 2>/dev/null

# Unusual HTTPS to DNS providers from non-browser processes (DoH bypass)
grep "1\.1\.1\.1:443\|8\.8\.8\.8:443" /evidence/INC-*/triage/network-state-at-triage.txt | \
  grep -v "firefox\|chrome\|safari\|brave\|edge"
```

DGA and DoH are frequently combined: malware uses DoH to resolve its DGA-generated C2 domain, bypassing corporate DNS monitoring entirely. A process making HTTPS connections to `1.1.1.1:443` or `8.8.8.8:443` is not using the system resolver — it has hardcoded DoH to avoid detection. Correlate the originating process with the persistence hunter's findings.
