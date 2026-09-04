# Provider Inventory

AIWG has **13 named provider integrations**. The source-of-truth registry is
`src/providers/provider-definitions.ts`; capability details are maintained in
`agentic/code/providers/capability-matrix.yaml`.

| Provider ID | Display name | Status | Deployment scope |
|---|---|---|---|
| `claude` | Claude Code | Stable | Project |
| `codex` | OpenAI Codex | Stable | Mixed project/user |
| `copilot` | GitHub Copilot | Stable | Project |
| `cursor` | Cursor IDE | Stable | Project |
| `factory` | Factory AI | Stable | Project |
| `hermes` | Hermes | Experimental | Mixed project/user |
| `opencode` | OpenCode | Stable | Project |
| `openclaw` | OpenClaw | Stable | User |
| `openhuman` | OpenHuman | Experimental | Mixed project/user |
| `pi` | Pi Coding Agent | Experimental | Project |
| `omp` | Oh My Pi | Experimental | Mixed project/user |
| `warp` | Warp Terminal | Stable | Project |
| `windsurf` | Devin Desktop | Stable compatibility adapter | Project |

`oh-my-pi` is an alias for `omp`; OMP is distinct from the original `pi` provider.
`devin` is an alias for `windsurf`, not an additional provider. The `generic`
adapter is a fourteenth registry entry used to emit portable files for custom
or unknown harnesses; it is deliberately excluded from the named-integration
count. Product interfaces, model APIs, MCP servers, and aliases are likewise
not counted as separate provider integrations.

Use `aiwg help` for accepted selectors and
`aiwg steward capabilities --provider <id>` for the supported feature surface.
