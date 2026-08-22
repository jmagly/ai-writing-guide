---
namespace: aiwg
name: cockpit-headless-deploy
description: Guide or repair a headless Linux AIWG Cockpit plus Agentic Sandbox deployment when host topology, SSH access, service persistence, or runtime readiness must be planned safely.
platforms: [all]
script:
  entrypoint: scripts/headless-plan.mjs
  runtime: node
  cwd: project-root
  argsHint: "plan|stage|rollback --manifest <setup.aiwg.yaml> --cockpit-host <host> [--executor-host <host>]"
---

# Cockpit Headless Deployment

Own the guided deployment or repair of Cockpit and Agentic Sandbox on a
headless Linux host. The canonical installation contract is
`https://aiwg.io/agentic-sandbox/setup.aiwg.yaml`; fetch or locate it, verify
its release provenance when acquired remotely, and validate it with
`aiwg setup-validate` before proposing mutation. Do not reproduce its package
or installation action contract in this skill, and do not pass this
provider-orchestrated manifest to deterministic `aiwg setup-run`.

## Topology gate

Establish three facts separately:

- the host running Cockpit and its Bridge;
- the host running Agentic Sandbox;
- the operator host and its access path to the Bridge.

If the executor host is neither proven equal to nor explicitly different from
the Cockpit host, stop before mutation and ask exactly one question:

> Will Agentic Sandbox run on the Cockpit host `<host>`, or a different host?

After the answer, record `same-host` or `cross-host`. Model operator-to-Bridge
access separately from Bridge-to-executor transport. A cross-host deployment
requires an explicit trusted transport plan; never infer a forward from an
ambiguous hostname.

## Preview and authorization

Run the bundled planner after manifest validation:

```bash
aiwg run skill cockpit-headless-deploy -- plan \
  --manifest setup.aiwg.yaml \
  --cockpit-host <host> \
  --executor-host <host> \
  --operator-host <host>
```

Review its value-free preview of packages (owned by the manifest), services,
ports, runtime tiers, mounts, egress, persistence, and cleanup. All application
listeners default to `127.0.0.1`. Require explicit operator authorization
immediately before packages, services, tunnels, mounts, or host policy change.
Preserve dirty source checkouts; prefer verified release packages or a clean
clone. Do not replace or clean an existing checkout to make deployment easier.

## Deployment

Apply the validated SetupManifest through the provider-orchestrated installer
handoff. Use `stage` only to materialize the value-free user-service plan and
attempt ledger inside an explicitly chosen staging root; review those files
before installing them as user units. Host and Docker readiness are independent
requirements. Claim VM readiness only when KVM evidence exists.

Keep Cockpit/Bridge and executor listeners on loopback. For cross-host
topologies, bind both applications locally and add only the reviewed transport
between the declared endpoints. Order the Cockpit user unit after the executor
unit when they share a host, enable only the created units, and record every
created or changed resource in the attempt ledger.

## Verification and rollback

Run `aiwg cockpit doctor` with the declared topology and hosts. Do not report
success until its package, Bridge, real-executor, host, Docker, listener, and
persistence rows meet the selected runtime plan. A VM row may remain a warning
when VM isolation was not selected.

On failure, restore only resources marked as created or changed by this
attempt. The bundled `rollback` command removes only ledger-owned staged files;
it refuses paths outside the recorded staging root. Never perform generic
container, image, VM, worktree, package-cache, or data-directory cleanup.
