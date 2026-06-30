---
enforcement: high
---

# Tunnel Safety

**Enforcement Level**: HIGH
**Scope**: All Cloudflare tunnel, WireGuard, and IPsec tunnel configuration changes
**Issue**: #777

## Principle

Network tunnels expose internal services to external networks. A misconfigured tunnel access policy can expose a service to the open internet. A removed credential file can take a tunnel offline and break dependent services. A tunnel restart without health verification can leave routes dark. Tunnel changes require a higher degree of care than equivalent internal network changes because their failures are often externally visible and may have security implications.

## Mandatory Rules

### Access Policies

1. **Access policy review required for all tunnel changes**: Any modification to a Cloudflare tunnel — adding a route, changing origin config, or modifying access policies — requires a review of all access policies for that tunnel before the change is applied. The agent must confirm that the intended access policy is in place and that the change does not bypass it.

2. **Never remove an access policy without confirming an alternative authentication path**: If an access policy is being removed, the agent must confirm one of the following before proceeding:
   - A replacement policy is being applied in the same change
   - The route being protected by the policy is also being removed
   - The operator has explicitly acknowledged that the route will become publicly accessible

   Removing an access policy without one of these conditions is a hard stop.

3. **Access policy changes require a full route review**: When an access policy is modified, the agent must list all routes currently protected by that policy and confirm the change applies the intended effect to all of them.

### Credential Files

4. **Tunnel credential files must be protected**: Credential files (e.g., `/etc/cloudflared/{tunnel-name}.json` or WireGuard private key files) must be mode `600` and owned by the tunnel daemon user. The agent must verify permissions before and after any operation that touches credential files:

   ```bash
   stat /etc/cloudflared/{tunnel-name}.json
   # Expected: mode 600, owner cloudflared (or root)
   ```

   If permissions are incorrect, the agent must correct them immediately and report the finding.

5. **Never log, print, or transmit credential content**: Credential files must be referenced by path, never read into output, logged to a file, or passed as command-line arguments. Use references only:

   ```yaml
   credentials:
     ref: "/etc/cloudflared/{tunnel-name}.json"
   ```

   If an agent task requires verifying a credential is valid, use the provider's authentication test command (e.g., `cloudflared tunnel info {tunnel-name}`) — not by reading the credential file content.

6. **Credential rotation requires route health verification**: When rotating tunnel credentials, verify all routes are healthy after the rotation completes before closing the change record:

   ```bash
   cloudflared tunnel info {tunnel-name}
   curl -sf https://{external-hostname}/healthz && echo OK
   ```

### Tunnel Restarts and Maintenance

7. **Tunnel restarts require pre-restart health verification**: Before restarting a tunnel daemon, the agent must verify the current state of all routes served by that tunnel. After restart, the agent must verify all routes are healthy before declaring the change complete:

   ```bash
   # Pre-restart: verify routes
   cloudflared tunnel route ip show

   # Restart
   systemctl restart cloudflared@{tunnel-name}

   # Post-restart: verify all routes healthy
   cloudflared tunnel info {tunnel-name}
   for route in {route-1} {route-2}; do
     curl -sf "https://$route/healthz" && echo "$route OK" || echo "$route FAILED"
   done
   ```

8. **Staged tunnel changes for multi-route tunnels**: If a tunnel serves more than three routes, apply configuration changes one route at a time when possible, verifying health after each before proceeding to the next.

### Documentation

9. **All tunnel configuration must be reflected in network-state.yaml**: Per the `net-state-authority` rule, tunnel configuration is part of the network state. Every tunnel, its routes, access policies, and credential file path must be declared in `network-state.yaml`. The credential file path is documented; the credential content is never documented.

10. **Deprecated tunnels must be explicitly decommissioned**: A tunnel in `status: deprecated` in `network-state.yaml` must have an associated issue tracking its decommission. Deprecated tunnels must not be left running indefinitely — they expand attack surface and create orphaned credentials.

## Validation Checklist

When making any tunnel change:

- [ ] All access policies reviewed before change is applied
- [ ] No access policy removed without confirmed replacement or explicit acknowledgment of exposure
- [ ] Credential file permissions verified (mode 600, correct owner)
- [ ] Credential content not logged, printed, or transmitted
- [ ] All routes verified healthy after restart or credential rotation
- [ ] `network-state.yaml` updated with tunnel changes and committed with change record reference
- [ ] Deprecated tunnels have a tracked decommission issue

## Rationale

Cloudflare tunnels and similar tools are frequently used to expose internal services for remote access or zero-trust auth. The simplicity of adding a route — one YAML entry — can mask the security surface being opened. Access policies are the primary control preventing unintended public exposure. Credential files are long-lived secrets that persist outside the normal secrets management lifecycle. Both of these facts demand that tunnel changes carry more careful review than their apparent simplicity suggests.
