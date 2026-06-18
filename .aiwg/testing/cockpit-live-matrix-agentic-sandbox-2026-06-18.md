# Cockpit Live Matrix Evidence - agentic-sandbox

Date: 2026-06-18
Host: grissom
AIWG issue: #1621

## Scope

This run tested the Cockpit live-matrix requirement against the latest local
`agentic-sandbox` release checkout using the real controller, host runtime,
Docker provisioning path, and QEMU provisioning path. Mock executor evidence is
not counted as a pass for this gate.

Controller used:

```text
/home/roctinam/dev/agentic-sandbox/management/target/debug/agentic-mgmt
LISTEN_ADDR=127.0.0.1:8120
AGENTIC_GRPC_MTLS_LISTEN=127.0.0.1:8130
AIWG_PROVISION_VM_SCRIPT=/home/roctinam/dev/agentic-sandbox/images/qemu/provision-vm.sh
AGENTIC_HOST_RUNTIME_ENABLED=1
AGENTIC_HOST_AGENT_CLIENT=/home/roctinam/dev/agentic-sandbox/agent-rs/target/debug/agent-client
AGENTIC_HOST_RUNTIME_ROOT=/var/lib/agentic-sandbox/host-runtime
Dashboard/API: http://127.0.0.1:8122
```

Temporary mTLS material was generated under `/tmp/aiwg-cockpit-mtls` for this
local run. Certificate and token contents were not recorded.

## Result Summary

| Target family | Outcome | Evidence |
| --- | --- | --- |
| Host | Partial pass | Real host instance and real mTLS agent session succeeded, but required manual mTLS attach because the default host supervisor launched plain TCP. |
| Docker/container | Blocked | Docker provisioning fails before instance readiness because secure transport material is required. |
| VM/QEMU | Partial pass | VM provision succeeded and bootstrap enrollment was issued, but no guest agent registered during the observation window, so no session could be created. |

Strict live matrix status: **fail/open**. The gate still cannot be satisfied by
real host, container, and VM sessions.

## Host Runtime Evidence

Initial host provisioning with `start:true` succeeded as a host instance, but
the automatically launched agent attempted plain TCP registration and was
rejected:

```text
operation: d692244e-b324-45eb-85cb-26d86424351f
instance: 019edb57-2aea-7140-ba0e-d42e8a64ee83
registration error: Unauthenticated: Agent transport identity required
```

A second host instance was provisioned with `start:false`, then attached by a
manually launched mTLS agent:

```text
operation: 0ada9d9f-85dd-4c87-bfc0-46bc6aaaebad
instance: 019edb5d-df63-7263-a180-fd93d6a84d44
runtime: host
state: running
loadout: codex-only
agent id: host-019edb5d
session: 019edb65-8f5b-7eb2-9941-8dae80a66252
command: 3bdd4bdc-382b-4600-a264-00f7e763ed2b
session_backend: tmux
```

This proves the host runtime can support a real agent/session when mTLS identity
is supplied, but the default host launch path is not yet release-ready for the
strict live matrix.

## Docker/Container Evidence

Docker provisioning request:

```json
{
  "name": "cockpit-docker-live",
  "runtime": "docker",
  "image": "agentic/codex:latest",
  "start": true,
  "agentshare": true
}
```

Result:

```text
operation: 78ae4ede-90b7-4d57-bb5c-aadf451c94c6
instance: 019edb65-c0d9-71d0-bb98-c5d30c6a5eee
state: failed
error: docker provisioning requires secure transport material; legacy AGENT_SECRET bootstrap was retired in #412
```

No container instance or agent session was available to Cockpit.

## VM/QEMU Evidence

The first VM attempt failed because the controller was launched outside the
`agentic-sandbox` checkout and could not resolve the relative provision script:

```text
operation: 9d9fdcac-7c1b-4d3f-ac8c-a0cb6ba12637
instance: 019edb65-c12d-7243-a193-c2c86cfee791
error: failed to spawn provision-vm.sh: No such file or directory (os error 2)
```

After restarting the controller with `AIWG_PROVISION_VM_SCRIPT` set to the
absolute script path, VM provisioning succeeded:

```text
operation: a7c626e0-c1c0-4e9e-a1e2-70a07702500a
instance: 019edb68-1afa-7e22-ba31-6be654be046a
runtime: qemu
state: running
bootstrap_token_issued: true
bootstrap_spiffe_id: spiffe://sandbox.agentic.local/agent/019edb68-1afa-7e22-ba31-6be654be046a
guest IP: 192.168.122.212
loadout: profiles/codex-only.yaml
```

After the post-provision wait, the agent list remained empty:

```json
{"agents":[]}
```

No VM session could be created because no guest agent registered.

## Delta

- Host: agent identity is viable through manual mTLS, but the host supervisor
  still needs a first-class secure bootstrap path.
- Docker: provisioning is hard-blocked until the Docker runtime receives secure
  transport material compatible with the post-`AGENT_SECRET` model.
- VM: provisioning and bootstrap token issuance work with an absolute script
  path, but the guest registration path needs diagnosis before Cockpit can
  create a real VM session.
- Cockpit strict live matrix remains correctly open because mock evidence does
  not satisfy the release gate.
