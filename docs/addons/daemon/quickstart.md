# Daemon Addon Status

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This status page assumes AIWG is already installed and `aiwg-regenerate` has connected the agent to this project.

The daemon addon contains design artifacts and configuration scaffolding, but
the production AIWG CLI does not currently register a resident `daemon`
command. Consequently there is no supported start, status, stop, PTY, or
scheduler quickstart in this release.

`aiwg daemon-init` may be used to inspect or scaffold configuration for
development work:

```bash
aiwg daemon-init
```

That command does not start a daemon. Verify the installed top-level surface
with:

```bash
aiwg help
```

For recurring work, use a provider-native scheduler when available or an
operator-owned external scheduler such as system cron, a systemd timer, or CI.
Do not use `aiwg schedule`, `aiwg daemon`, or `aiwg daemon schedule`; those
commands are not registered.

A future daemon release must land command registration, lifecycle handlers,
help text, tests, and documentation together before this guide can advertise
runtime operations.
