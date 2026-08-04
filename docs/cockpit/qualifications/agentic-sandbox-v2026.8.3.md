# Agentic Sandbox v2026.8.3 qualification

Date: 2026-08-04  
Status: host management/fleet/activity PASS; runtime matrix PARTIAL

## Immutable inputs

| Component | Identity |
|---|---|
| Agentic Sandbox | tag `v2026.8.3`, commit `201221e5a26f7f0cc719ab584520ce3164065825` |
| AIWG qualification harness | commit `a5b7d6eb8` (`test(cockpit): pin Sandbox v2026.8.3 qualification`) |
| Host | Linux 7.0.0-28-generic x86_64 |

The Sandbox binary was built from a detached worktree at the exact tag. The
repeatable gate rejects either tag or commit drift before it starts the server:

```bash
npm run qualify:agentic-sandbox-2026.8.3 -- \
  --sandbox-root /path/to/exact/agentic-sandbox-v2026.8.3
```

The gate creates its own temporary mode-`0600` operator token fixture. It does
not discover, read, copy, or print an existing credential.

## Results

| Contract | Result | Evidence |
|---|---|---|
| Operator auth failure | PASS | unauthenticated fleet inventory returned HTTP 401 |
| Malformed fleet admission | PASS | invalid contract returned HTTP 400 |
| Fleet admission and inventory | PASS | three durable children admitted with distinct task identities |
| Management restart and re-adoption | PASS | all task identities survived restart; inventory contained one task per target |
| Fleet reconciliation | PASS | all three children classified `re-adopted` at inventory revision 9 |
| Activity coverage | PASS | exactly scoped coverage returned HTTP 200 |
| Activity timeline | PASS | exactly scoped empty timeline returned HTTP 200 |
| Signed export without configured signer | PASS | export failed closed with HTTP 503 |
| Managed-container identity contract | PASS (release-focused) | exact-tag source/release checks require UDS, unique control UID `>=200000`, workload UID `10001`, capability clearing, and no bootstrap token in Docker args |
| Full managed-container Cockpit workload | INSUFFICIENT EVIDENCE | no existing credential was consumed; a provider-backed managed workload was not claimed |
| Full VM Cockpit workload | INSUFFICIENT EVIDENCE | KVM/libvirt were present, but no credential-free exact-tag guest/provider workload was provisioned |
| Apple Endpoint Security | UNSUPPORTED ON TARGET | qualification host was Linux; Apple signing/notarization and Endpoint Security were not exercised |
| Seven-day soak | NOT RUN | this point-in-time compatibility gate does not constitute a seven-day reliability qualification |

The JSON/JUnit outputs are generated under `test-results/` and intentionally
remain untracked because they contain run-local task identifiers and temporary
paths. The durable evidence is the immutable identities, assertions in
`test/uat/fleet-sandbox-live.uat.ts`, and this result summary.

## Container recreation boundary

Agentic Sandbox v2026.8.3 applies credential-free UDS control and split
control/workload identities when management creates a container. A container
created by an older release is not silently upgraded in place. Cockpit must
report the executor's `recreate_required`/legacy posture and direct the operator
to recreate it; only a newly provisioned container may be described as using
the v2026.8.3 secure default.

## Interpretation

The minimum versions documented for older session, reconnect, and transport
features remain valid compatibility floors. They are not the latest observed
qualification. The latest immutable fleet/activity evidence is v2026.8.3 as
recorded here, with runtime-tier limitations stated explicitly above.
