# Guided Headless Deployment

Use the discoverable `cockpit-headless-deploy` skill to deploy or repair a
headless Linux Cockpit plus Agentic Sandbox installation:

```bash
aiwg discover "cockpit headless deploy"
aiwg show skill cockpit-headless-deploy
```

The workflow consumes the canonical Agentic Sandbox SetupManifest at
`https://aiwg.io/agentic-sandbox/setup.aiwg.yaml`. It validates that contract
and routes it through the provider-orchestrated installer; it does not maintain
a second package or installation action list.

Before any mutation, declare the Cockpit host, executor host, and operator host.
If the executor host is ambiguous, the workflow stops with one question asking
whether it runs on the Cockpit host or another host. This decision is separate
from operator access: an operator may use an SSH local forward to a same-host
Cockpit/executor pair, while Bridge-to-executor transport remains loopback.

The bundled planner produces a value-free preview:

```bash
aiwg run skill cockpit-headless-deploy -- plan \
  --manifest setup.aiwg.yaml \
  --cockpit-host headless-1 \
  --executor-host headless-1 \
  --operator-host laptop-1
```

`stage --root <directory>` materializes reviewable user-unit definitions and an
attempt ledger without installing packages or changing system services. Both
services bind to `127.0.0.1`; same-host Cockpit is ordered after the executor.
The `rollback --ledger <file>` operation removes only files recorded as created
by that attempt and refuses out-of-root resources.

After the authorized provider-orchestrated installation, run
`aiwg cockpit doctor` with the same topology declaration. Host and Docker
readiness are evaluated independently, and VM readiness is never claimed
without KVM.
