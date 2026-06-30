---
enforcement: medium
---

# sys-immutable-base

**Enforcement Level**: MEDIUM
## Severity

MEDIUM

## Summary

Base images are frozen; changes go to overlay directories. Copy-on-write overlay promotion to the base layer requires an explicit, documented procedure with human approval. Agents must never modify files in the base image layer directly.

## Rule

Systems using immutable base images (read-only root filesystems, container base layers, VM golden images, or image-based deployments) enforce a strict separation between the frozen base and mutable overlays.

### Requirements

1. **Base layer is read-only**: The base image, golden image, or root filesystem snapshot must not be modified in place. All runtime changes go to an overlay directory (e.g., `/etc` overlay, `/var` writable layer, OverlayFS upper directory, container writable layer).

2. **Overlay directories are the only mutable target**: Configuration changes, package additions, log writes, and state files must land in the designated overlay or writable partition. Agents must verify they are writing to the overlay, not the base.

3. **COW promotion requires explicit procedure**: Promoting an overlay change into the base image (baking a new golden image, rebuilding a container layer, creating a new immutable snapshot) is a controlled operation that requires:
   - Documentation of what changed and why
   - Diff between current base and proposed new base
   - Human approval before the new base is sealed
   - Version tag on the new base image
   - Rollback path to the previous base version

4. **No in-place base mutations**: The following are prohibited on the base layer:
   - `apt install`, `dnf install`, or any package manager write
   - Direct edits to base-layer config files
   - `dd`, `rsync`, or `cp` targeting the base image file
   - Filesystem resize on the base partition
   - Any `mount -o remount,rw` of a read-only base

5. **Overlay persistence model must be documented**: Each host or image must document:
   - Which directories are base (read-only)
   - Which directories are overlay (writable)
   - How overlays persist across reboots (tmpfs vs. persistent upper)
   - How to reset overlays to return to base state

### Detection

An agent can detect it is operating on an immutable base when:
- Root filesystem is mounted read-only (`mount | grep "on / " | grep "ro"`)
- OverlayFS or similar COW filesystem is in use (`mount | grep overlay`)
- System uses image-based updates (A/B partitions, OSTree, snap-based root)
- Container environment with read-only lower layers

## Examples

### Violation

```bash
# Directly installing a package on a read-only base — PROHIBITED
mount -o remount,rw /
apt install -y nginx
mount -o remount,ro /
```

```bash
# Editing a base-layer config file without using the overlay — PROHIBITED
vi /usr/lib/systemd/system/custom.service
```

```bash
# Baking a new image without documentation or approval — PROHIBITED
dd if=/dev/sda of=/images/new-base.img bs=4M
```

### Compliance

```bash
# Installing to the overlay layer — CORRECT
apt install -y -o Dir::Cache=/overlay/var/cache/apt nginx
# Or using the system's overlay mechanism:
systemctl edit nginx  # writes to /etc/systemd/system/ overlay
```

```bash
# Promoting overlay to new base with proper procedure — CORRECT
# 1. Document changes in changelog
# 2. Generate diff: diff -rq /base /overlay
# 3. Present to operator for approval
# 4. Build new image: packer build -var version=v2.1 base.pkr.hcl
# 5. Tag: v2.1
# 6. Verify rollback: confirm v2.0 image still available
```

```bash
# Resetting overlay to base state — CORRECT
rm -rf /overlay/upper/*
reboot  # system returns to clean base state
```
