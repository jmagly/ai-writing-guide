# Provider Capability Matrix

This page distinguishes provider-native features, AIWG-implemented features,
and external integrations. The machine-readable source is
`agentic/code/providers/capability-matrix.yaml`.

## Status meanings

- **Native**: the provider owns the feature and exposes it in the active tool
  surface.
- **AIWG implemented**: the installed AIWG CLI has a registered, tested command
  that owns the feature lifecycle.
- **External**: an operating-system or CI service owns the lifecycle and
  launches a reviewed provider command. AIWG does not emulate that service.
- **Unsupported**: neither the provider nor the installed AIWG CLI offers the
  capability.

## Scheduling

| Provider | Status | Execution surface |
|---|---|---|
| Claude Code agent session | Native | `CronCreate`, `CronList`, `CronDelete` |
| Codex | External | system cron, systemd timer, or CI launches `codex exec` |
| Other providers without native cron tools | Unsupported | use an operator-owned external scheduler only when the provider has a reviewed non-interactive command |

There is no production `aiwg schedule`, `aiwg daemon`, or
`aiwg daemon schedule` command. Steward reports Codex cron as an **external
trigger**, not as AIWG emulation. The external service owns time; AIWG owns only
the reviewed workflow artifacts that it actually implements.

## Resident daemon

The repository contains daemon design and development sources, but the
production command registry exposes only `aiwg daemon-init`, which scaffolds a
configuration. It does not expose a resident daemon lifecycle command. All
built-in providers therefore report the daemon feature as unsupported.

Do not infer runtime availability from `daemon-init`, old release notes, or
bundled source files. A future daemon release must register its top-level
command, help, handlers, tests, metadata, and documentation atomically.

## Checking the installed surface

```bash
aiwg help
aiwg steward capabilities --provider codex
aiwg steward capabilities --feature cron
```

`aiwg help` is authoritative for registered top-level commands. Documentation
conformance tests verify operational guides do not advertise an unregistered
top-level AIWG command.
