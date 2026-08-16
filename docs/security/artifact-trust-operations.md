# Artifact trust operations and recovery

The trust root is a signed, versioned policy. Root keys are offline public-key
identities; release identities may be public keys or Sigstore certificate
identities. Thresholds count independent identity groups, not signature count.
Delegations may narrow—but never expand—their parent's asset type, namespace,
and channel scope.

## Routine rotation

1. Produce root version `N+1`; never skip a version.
2. Add the new identity and update the applicable role/delegation.
3. Sign the exact canonical `signed` object with both the old and new root
   thresholds.
4. Test with a copy of production public state and test-only private keys.
5. Run `aiwg verify trust update --current root-N.json --next root-N+1.json`.
6. Distribute the new root and preserve the prior root/state for audit.

## Lost root or release key

If the threshold is still available, remove the lost identity in the next root
and satisfy both old/new thresholds. If the root threshold is unavailable,
stop publishing and perform a new independent bootstrap ceremony; never lower
the old threshold or edit persisted state to bypass recovery.

## Compromise

Create a revocation containing identity, effective time, suspected compromise
interval, affected scope, and reason. Rotate in exactly the next root version.
Preserve the suspect root, artifacts, attestations, trusted time, and channel
sequences as incident evidence. Reverify affected artifacts; quarantine any
result that becomes `revoked`, `stale`, or `mismatched`.

## Clock failure

Stop verification when the system time predates persisted `trustedTime`.
Restore time from a separately authenticated source, document the correction,
and retry without deleting or decreasing trusted state. Offline operation must
have a reliable persisted clock boundary.

## Sigstore outage

Use already-portable bundles and the trusted root in offline mode. Do not set
transparency/timestamp thresholds to zero merely to restore availability. If
required bundle evidence is absent, accept `offline-evidence-missing`, preserve
the input, and wait for service recovery.

## Mirror rollback or replay

Do not overwrite state. Compare the mirror's root version, channel sequence,
artifact digest, and version with persisted values. Reject lower versions,
sequence gaps, same-sequence/different-digest objects, and artifacts held past
the freeze window. Retain the mirror response and headers for investigation.

## Policy rollback

Restore policy only by issuing a new, monotonically increasing root that is
authorized by old and new thresholds. A byte-for-byte older root is still a
rollback and must not be copied over the active root/state.

## Recovery testing

Exercise routine rotation, lost-key quorum, compromise intervals, clock
rollback, offline bundle loss, mirror rollback/fast-forward, delegation scope
expansion, and policy rollback at every release gate. Generate ephemeral or
clearly test-only keys. Production private key material must never enter tests,
fixtures, logs, issue comments, or recovery archives.
