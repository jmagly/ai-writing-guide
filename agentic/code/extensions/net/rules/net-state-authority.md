---
enforcement: high
---

# Network State Authority

**Enforcement Level**: HIGH
**Scope**: All network documentation, configuration proposals, drift detection, and remediation
**Issue**: #777

## Principle

`network-state.yaml` is the single source of truth for the declared network configuration. It represents the intended, reviewed, and approved network state. Agents must treat this file as authoritative when reading existing configuration, proposing changes, and reconciling drift. No network change is complete until the state file reflects the change.

## Mandatory Rules

1. **Always read network-state.yaml before proposing changes**: Before proposing any VLAN, DNS, firewall, routing, or tunnel change, the agent must read the current `network-state.yaml` and diff the proposed change against the declared state. Proposing a change that contradicts or duplicates the declared state without acknowledging the conflict is a violation.

2. **Agents must not make undocumented network changes**: A change that is applied to live infrastructure without a corresponding update to `network-state.yaml` creates state drift. Agents must never leave the live configuration and the state file out of sync. The state file update and the live change are a single atomic unit — both must happen, or neither happens.

3. **Manual changes detected via audit must be reconciled**: If a network audit (`net-vlan-audit`, `net-dns-check`, or equivalent) detects that live state differs from `network-state.yaml`, the agent must present the discrepancy to the operator and request a decision:
   - **Bring live state in line with documented state**: Execute remediation commands to match the state file.
   - **Update the state file to reflect the actual configuration**: Treat the live state as intentional, document it, and commit the update.
   - **Open a change record for further review**: When the correct answer is unclear, file an issue rather than guessing.

   The agent must not silently accept either the live state or the documented state as correct without an explicit operator decision.

4. **Commit state file changes with change record reference**: Every commit to `network-state.yaml` must reference the corresponding change record or issue in the commit message:

   ```bash
   git commit -m "net: update firewall rule for {service} — CHG-{id}"
   ```

   Commits without a change record reference are non-compliant.

5. **The state file is the audit baseline**: When generating audit reports, the agent compares live infrastructure against `network-state.yaml` — not against a previous audit or a human's memory of what the configuration should be. The state file's contents are the ground truth for "what was intended."

6. **No ad-hoc changes outside the state file workflow**: If an operator requests a network change via conversation without a corresponding update to the state file, the agent must complete the state file update before or immediately after the live change. Ad-hoc changes that bypass the state file workflow must be flagged and reconciled within the same session.

## State File Workflow

Every network change follows this sequence:

```
1. Read network-state.yaml (current declared state)
2. Diff proposed change against declared state
3. Create or reference change record
4. Execute change on live infrastructure
5. Update network-state.yaml to reflect the new state
6. Commit with change record reference
7. Run verification (net-dns-check, net-vlan-audit, or manual check)
```

Skipping step 5 or 6 is a violation of this rule.

## Validation Checklist

When working with network configuration:

- [ ] `network-state.yaml` has been read and the proposed change diffed against it
- [ ] Any conflicts with the existing declared state have been acknowledged and resolved
- [ ] The change record is referenced in the state file commit message
- [ ] The state file is updated within the same change window as the live change
- [ ] Audit findings are presented to the operator with an explicit decision request — not silently resolved

## Rationale

Drift between documented and live network state is how outages become mysteries. When the firewall state file says "allow TCP 443 from VLAN 10 to VLAN 20" but the live ruleset has been modified manually to drop that traffic, the next operator following the documented state will be confused. When the VLAN table documents subnets that no longer exist, capacity planning and change impact analysis become unreliable. The state file is only useful as a source of truth if it stays synchronized with reality — and that synchronization is a responsibility enforced at every change, not cleaned up periodically.
