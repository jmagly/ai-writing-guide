# External Automation

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

AIWG does not currently ship a production resident daemon or scheduler command.
The installed CLI has no `aiwg daemon`, `aiwg schedule`, or
`aiwg daemon schedule` entry point.

## What is available

- `aiwg daemon-init` scaffolds daemon configuration for development and future
  compatibility. It does not start a process.
- Provider-native scheduling tools may be used when they are present in the
  active agent tool surface.
- For Codex and other headless provider CLIs, an operator-owned system cron,
  systemd timer, or CI workflow may launch a reviewed single-shot command.
- `aiwg job validate`, `aiwg job render-cron`, and `aiwg job run --once`
  provide the reviewed external-job contract, starter scheduler configuration,
  and bounded single-shot execution. They do not create or manage a scheduler.

## Ownership boundary

The external scheduler owns time, trigger retries, and host-level service
lifecycle. The external-job runner owns its work-item claim, execution record,
and idempotency checks.
The provider owns model execution. AIWG must only claim contract validation,
orchestration, and evidence handling when corresponding registered CLI commands
exist.

For Gitea-backed Codex jobs, start with the versioned external-job contract and
render a reviewed cron, systemd, or Gitea Actions example:

```bash
aiwg job validate jobs/publish.yaml
aiwg job render-cron jobs/publish.yaml --format systemd
aiwg job run jobs/publish.yaml --once
```

Keep protected values out of arguments and repository files. See
[External-trigger jobs](../guides/external-trigger-jobs.md) for the complete
contract, approval, claim, idempotency, and evidence requirements. For other
provider CLIs, create the scheduler configuration manually and review it as
deployment code.

Check the current surface before following examples:

```bash
aiwg help
aiwg steward capabilities --provider codex
```

Historical daemon architecture remains under `tools/daemon/` and
`agentic/code/addons/daemon/`; those sources are not evidence that the command
is installed.
