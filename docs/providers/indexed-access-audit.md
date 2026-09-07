# Provider indexed artifact access audit

Audited September 5, 2026; integrated and revalidated September 7 against the provider adapters and discovery/query engine.

Every provider can retrieve agents, commands, skills, and rules from the AIWG
index using `aiwg discover` followed by `aiwg show <type> <id-or-name>`. A missing
native deployment path means **Indexed**, not **None** or **unsupported**.
This contract also applies to agentic hosts without a named AIWG adapter.

## Findings

| Surface | Finding | Result |
| --- | --- | --- |
| Hermes commands | Adapter and website used `None` despite indexed access | Changed to `Indexed` |
| OpenHuman agents and commands | Adapter and website used `None`; capability YAML advertised obsolete markdown deployment | Changed to `Indexed` and documented discover/show retrieval |
| Antigravity commands | Adapter used `unsupported` despite indexed access | Changed to `indexed` |
| CLI capability output | Missing artifact paths rendered as `(none)` | Reports indexed discovery instead |
| Discovery and source retrieval | Query engine filters by requested artifact type, not active provider or platform tags | Regression tests cover all four core types for Hermes, OpenHuman, Antigravity and an unknown future provider |
| Default Fortemi discovery | Existing report: missing project cache hides valid project-local assets | [Delivered under #2155](https://git.integrolabs.net/roctinam/aiwg/issues/2155); the local-backend tests here cover source retrieval separately |
| Explicit skill copies | Historical `aiwg-guide` platform allowlist excluded OpenHuman, Pi, OMP and Antigravity | [Delivered under #2282](https://git.integrolabs.net/roctinam/aiwg/issues/2282) |

## Repeatable checks

```bash
npx vitest run --config config/vitest.config.js \
  test/unit/providers/provider-indexed-access.test.ts \
  test/unit/artifacts/query-engine.test.ts \
  test/unit/cli/handlers/runtime-info.test.ts
```

The provider audit checks every adapter's four core artifact support labels.
The retrieval tests create indexed bodies without native provider directories,
including bodies tagged for a different platform, then discover and fetch each
by its returned stable ID. They exercise the local query engine, not live
Hermes/OpenHuman processes or every remote storage backend.

Explicit deployment restrictions still need review for genuine native tool
dependencies. They must not gate indexed source access. Likewise, reading a
behavior or hook contract does not create native execution, scheduling, MCP,
or background-agent support. Capability audits must distinguish body access
from runtime execution features.
