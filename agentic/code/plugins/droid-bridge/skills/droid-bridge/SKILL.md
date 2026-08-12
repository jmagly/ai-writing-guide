---
namespace: aiwg
name: droid-bridge
platforms: [all]
description: Configure and operate the Droid Bridge MCP integration that delegates authorized batch work to Factory Droid and exposes task monitoring.
triggers:
  - enable Droid Bridge
  - connect AIWG to Factory Droid
  - delegate batch work to Droid
  - monitor a Droid task
---

# Droid Bridge

Use this driver to configure the optional MCP bridge:

```bash
aiwg use droid-bridge --provider <provider>
```

The external `droid` executable must already be installed and authorized.
Deployment must use the generated provider MCP configuration; do not expose
credentials in prompts or commit machine-local configuration.

After activation, verify MCP server availability, launch only an explicitly
authorized task, and monitor it through the bridge rather than starting an
untracked background process.

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/README.md
