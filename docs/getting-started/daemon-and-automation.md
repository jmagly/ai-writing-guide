# External Automation

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed and `aiwg-regenerate` has connected the agent to this project.

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

## Ownership boundary

The external scheduler owns time, retries, and host-level service lifecycle.
The provider owns model execution. AIWG must only claim contract validation,
orchestration, and evidence handling when corresponding registered CLI commands
exist.

Until such commands ship, create external scheduler configuration manually and
review it as deployment code. Use absolute workspace and prompt paths, pass
prompts on stdin where supported, keep secrets out of arguments and repository
files, and add a lock plus stable idempotency key for mutation-capable tasks.

Check the current surface before following examples:

```bash
aiwg help
aiwg steward capabilities --provider codex
```

Historical daemon architecture remains under `tools/daemon/` and
`agentic/code/addons/daemon/`; those sources are not evidence that the command
is installed.
