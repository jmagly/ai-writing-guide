---
namespace: aiwg
name: container-forensics
description: "Forensic investigation of Docker, containerd/CRI-O, and Kubernetes — inventory, escape detection, eBPF runtime monitoring, RBAC and etcd audit. Use when investigating container compromise."
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# container-forensics

Investigates containerized environments for signs of compromise, misconfiguration, or container escape. Covers standalone Docker hosts and Kubernetes clusters. Produces a structured findings document with severity tagging.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "Falco" / "Tetragon" / "Tracee" → eBPF runtime monitoring tools
- "dive" → Docker image layer analysis
- "crictl" → containerd/CRI-O environment forensics
- "escape" → container escape investigation

## Purpose

Container environments introduce unique attack surfaces: privileged containers, host namespace access, writable image layers, and overpermissioned service accounts. Standard host forensics misses these vectors. This skill applies container-aware investigation procedures and maps findings to MITRE ATT&CK for Containers.

## Behavior

When triggered, this skill:

1. **Detect environment type**:
   - Check for Docker: `docker info 2>/dev/null`
   - Check for Kubernetes: `kubectl cluster-info 2>/dev/null` or presence of `/var/run/secrets/kubernetes.io/`
   - Check for containerd-only (no Docker): `ctr version 2>/dev/null`
   - Check for CRI-O or containerd via CRI: `crictl version 2>/dev/null`
   - Determine if running inside a container: check for `/.dockerenv`, inspect cgroup paths

2. **Container inventory and privilege audit**:
   - List all containers (running and stopped): `docker ps -a --format '{{json .}}'`
   - For containerd/CRI-O environments: `crictl pods` and `crictl ps -a`
   - Inspect individual containers: `crictl inspect <id>` (equivalent of `docker inspect`)
   - List images on CRI nodes: `crictl images` and `crictl inspecti <image-id>`
   - Pull container logs via CRI: `crictl logs <container-id>`
   - Flag containers with dangerous flags:
     - `--privileged`: `docker inspect <id> | jq '.[].HostConfig.Privileged'`
     - Host network mode: `NetworkMode == "host"`
     - Host PID namespace: `PidMode == "host"`
     - Dangerous capability additions: `CapAdd` containing `SYS_ADMIN`, `NET_ADMIN`, `SYS_PTRACE`
   - Enumerate bind mounts of sensitive host paths (`/`, `/etc`, `/var/run/docker.sock`, `/proc`, `/sys`)

3. **Docker — image verification**:
   - List all local images with digests: `docker images --digests`
   - Check image provenance: compare `RepoDigests` against expected registry
   - Flag images tagged `latest` without a pinned digest
   - Inspect image build history for suspicious `RUN` layers: `docker history --no-trunc <image>`
   - Check for images not associated with any running or stopped container (orphaned images)

4. **Image layer analysis with dive**:
   - Run `dive <image> --ci` for non-interactive efficiency and layer summary
   - Identify layers that delete files immediately after downloading them (evidence wiping pattern)
   - Flag layers installing unexpected tooling (`curl`, `nc`, `nmap`, `socat`, `python`)
   - Identify unusually large layers inconsistent with the image's declared purpose
   - Check for world-writable permissions set in later layers after a trusted base image

5. **Docker — volume and filesystem inspection**:
   - List named volumes: `docker volume ls`
   - Inspect volumes mounted into containers for sensitive data paths
   - Examine container overlay filesystem changes: `docker diff <container_id>`
   - Flag containers with writable root filesystems where `ReadonlyRootfs` is false

6. **Docker — socket and API exposure**:
   - Check if Docker socket is bind-mounted into any container — this grants effective root on the host
   - Check for TCP Docker API exposure: `ss -tlnp | grep ':2375\|:2376'`
   - Review Docker daemon configuration: `/etc/docker/daemon.json`

7. **Container escape indicators**:
   - Processes running in container namespaces that share host PID/network: compare namespace inodes in `/proc/1/ns/` vs `/proc/<container-pid>/ns/`
   - Unexpected cgroup escape patterns in `/proc/<pid>/cgroup`
   - Files written to host paths from within container overlay mounts
   - `runc` or `containerd-shim` process anomalies in host process tree

8. **eBPF runtime monitoring**:
   - Check for Falco service and alert logs: `journalctl -u falco` and `/var/log/falco.log`
   - Review active Falco rules for coverage gaps (shell-in-container, outbound connections, writes below root)
   - Collect Tetragon execution traces via `kubectl logs -n kube-system -l app.kubernetes.io/name=tetragon` or `tetra getevents`
   - Review active Tetragon `TracingPolicy` resources: `kubectl get tracingpolicies -A`
   - Collect Tracee event logs from container or systemd deployment
   - If no eBPF tooling was active during the incident, document this gap in the findings

9. **Kubernetes — cluster-level audit**:
   - List all pods across all namespaces: `kubectl get pods -A -o json`
   - Flag pods running as root: `.spec.containers[].securityContext.runAsUser == 0` or unset
   - Flag pods with `hostPID`, `hostNetwork`, or `hostIPC` set to true
   - Flag pods mounting the Docker socket or host paths
   - List privileged containers across the cluster

10. **Kubernetes — RBAC audit**:
    - List ClusterRoleBindings granting `cluster-admin`: `kubectl get clusterrolebindings -o json | jq '...'`
    - Identify service accounts with wildcard permissions or `*` verbs on sensitive resources
    - Check for default service account token automounting: `automountServiceAccountToken: true`
    - List RoleBindings in high-value namespaces (kube-system, kube-public)

11. **Kubernetes — pod security and network policy**:
    - Check for absent NetworkPolicies (pods with unrestricted egress/ingress)
    - Review PodSecurityAdmission or OPA/Gatekeeper policy coverage
    - List nodes and check for unauthorized node additions: `kubectl get nodes -o wide`

12. **etcd security audit** (Kubernetes control-plane only):
    - Verify etcd is not listening on a non-loopback address: `ps aux | grep etcd | grep listen-client-urls`
    - Confirm `--client-cert-auth=true` is set in the etcd process flags
    - Check for encryption-at-rest configuration in the API server manifest (`--encryption-provider-config`)
    - List etcd client certificates in `/etc/kubernetes/pki/etcd/` and flag any unexpected certs
    - Take a read-only snapshot with `etcdctl snapshot save` for offline analysis
    - Enumerate etcd key paths for secrets and serviceaccount tokens using `etcdctl get / --prefix --keys-only`

13. **K8s API server audit log analysis** (if audit logging is enabled):
    - Locate audit log path from `kube-apiserver.yaml` (`--audit-log-path`)
    - Summarize request activity by user and verb to identify outliers
    - Detect anonymous (`system:anonymous`) API calls to non-public endpoints
    - Flag ServiceAccount tokens used outside their home namespace
    - Identify bulk `list`/`get` on `secrets` resources (credential harvesting pattern)
    - Flag `exec` subresource calls from non-operator users during the incident window
    - Detect rapid `create`/`delete` sequences on the same resource (attacker covering tracks)

14. **Write findings document**:
    - Save to `.aiwg/forensics/findings/container-forensics.md`
    - Group by: Docker/containerd findings, eBPF runtime events, Kubernetes findings, etcd/API server findings, escape indicators
    - Tag each finding: INFO, SUSPICIOUS, MALICIOUS

## Usage Examples

### Example 1 — Docker host
```
docker investigation
```
Audits the local Docker daemon.

### Example 2 — Kubernetes cluster
```
kubernetes forensics
```
Requires `kubectl` configured with appropriate credentials.

### Example 3 — Inside a container
```
container forensics
```
Detects the container context and adjusts collection accordingly.

## Output Locations

- Findings: `.aiwg/forensics/findings/container-forensics.md`
- Raw Docker inspection: `.aiwg/forensics/evidence/docker-inspect.json`
- crictl inspection output: `.aiwg/forensics/evidence/crictl-inspect.json`
- K8s pod manifest dump: `.aiwg/forensics/evidence/k8s-pods.json`
- Falco alert log: `.aiwg/forensics/evidence/falco-alerts.log`
- Tetragon events: `.aiwg/forensics/evidence/tetragon-events.json`
- Tracee events: `.aiwg/forensics/evidence/tracee-events.json`
- etcd snapshot: `.aiwg/forensics/evidence/etcd-snapshot-<timestamp>.db`
- K8s API server audit log (copy): `.aiwg/forensics/evidence/k8s-audit.log`

## Configuration

```yaml
container_forensics:
  dangerous_capabilities:
    - SYS_ADMIN
    - NET_ADMIN
    - SYS_PTRACE
    - SYS_MODULE
  sensitive_host_paths:
    - /
    - /etc
    - /var/run/docker.sock
    - /proc
    - /sys
    - /root
  high_value_namespaces:
    - kube-system
    - kube-public
    - default
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Detect environment type (Docker, containerd, Kubernetes) before applying collection procedures
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/non-destructive.md — Do not stop or remove containers until all artifacts are collected and hashed
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate immediately when container escape, Docker socket exposure, or privileged escape is confirmed
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Hash container logs and filesystem exports immediately after collection
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/linux-forensics/SKILL.md — Investigate the underlying host after container forensics; container escapes leave traces on the host
