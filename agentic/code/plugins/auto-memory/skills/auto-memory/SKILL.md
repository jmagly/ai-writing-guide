---
namespace: aiwg
name: auto-memory
platforms: [all]
description: Configure AIWG automatic-memory seed templates for project overview, testing, debugging, and architecture knowledge, with provider compatibility guidance.
triggers:
  - enable automatic project memory
  - install auto memory templates
  - seed Claude project memory
  - configure project memory files
---

# Auto Memory

Use this driver when an operator wants the `auto-memory` seed bundle.

For new projects, prefer the canonical scaffolding path:

```bash
aiwg new
```

For an existing project, deploy the addon through AIWG:

```bash
aiwg use auto-memory --provider <provider>
```

Claude supports the native automatic-memory layout. Cursor and OpenCode
require provider-specific adaptation; other providers should use workspace
context or semantic-memory capabilities instead of pretending native automatic
memory exists.

The seeds cover project overview, testing, debugging, and architecture. Never
put secrets, credentials, tokens, or sensitive personal data in memory files.

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/docs/overview.md
- @$AIWG_ROOT/agentic/code/addons/semantic-memory/skills/memory-ingest/SKILL.md
