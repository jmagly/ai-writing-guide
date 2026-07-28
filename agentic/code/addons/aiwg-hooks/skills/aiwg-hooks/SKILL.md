---
namespace: aiwg
name: aiwg-hooks
platforms: [all]
description: Install, configure, and inspect AIWG lifecycle hooks for tracing, permissions, session management, context injection, and quality gates.
triggers:
  - enable AIWG hooks
  - configure workflow tracing hooks
  - install AIWG permission hooks
  - inspect AIWG hook traces
---

# AIWG Hooks

Use this driver to activate the addon through the supported deployment path:

```bash
aiwg use aiwg-hooks --provider <provider>
```

Hook support differs by provider. Explain the resolved provider behavior and
do not manually copy or enable hook scripts when the deployment command can
manage them.

The addon includes tracing, permission, session, context, and quality-gate
hooks. After deployment, use the provider-specific hook configuration and the
bundled trace viewer to confirm that the selected hooks loaded.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-hooks/README.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/hook-status/SKILL.md
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/hook-enable/SKILL.md
