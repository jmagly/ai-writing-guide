# Google Antigravity CLI Provider

Status: experimental. Offline conformance is pinned to Antigravity CLI `1.1.26`;
authenticated model execution has not been qualified.

## Selector Names

Canonical AIWG provider id:

- `antigravity`

Accepted aliases:

- `agy`

Provider binary:

- `agy`

Use `--provider antigravity` in examples and docs. Accept `--provider agy`
because Google documents `agy` as the CLI executable. Persist only the
canonical `antigravity` id.

## Documented Google Surfaces

Official Google docs identify Antigravity CLI as the terminal-first Antigravity
surface backed by the shared Antigravity agent harness. The local binary
observed on 2026-09-04 reports version `1.1.26`.

Relevant paths:

| Surface | Path |
|---|---|
| CLI binary | `~/.local/bin/agy` on macOS/Linux installs |
| Settings | `~/.gemini/antigravity-cli/settings.json` |
| Workspace skills | `.agents/skills/` |
| Global skills | Deferred: Google sources conflict between `~/.gemini/antigravity-cli/skills/` and `~/.gemini/config/skills/` |
| Workspace MCP | `.agents/mcp_config.json` |
| Global MCP | `~/.gemini/config/mcp_config.json` |
| Plugins | `~/.gemini/antigravity-cli/plugins/<plugin_name>/` |

## Integration Notes

- Headless execution should use `agy -p` or `agy --print`.
- JSON and stream JSON output are available for automation.
- MCP config should use the standard `mcpServers` object.
- Remote MCP servers should use `serverUrl`.
- `--dangerously-skip-permissions` must stay behind an explicit AIWG dangerous
  mode.
- `--sandbox` can be passed only when requested by operator policy or provider
  launch settings.
- Initial support should deploy workspace skills only. Global skill deployment
  remains unsupported until the active 1.1.26 discovery precedence is proven.
- AIWG custom agents are projected to `.agents/agents/<name>.md`. Their generic
  tool allowlists are mapped only for the documented `view_file`,
  `write_to_file`, `replace_file_content`, `grep_search`, and `run_command`
  equivalents; unknown tool names are omitted, so agent projection is marked
  degraded rather than fully native. Commands,
  workflows, plugins, auth settings, trust settings, and permission settings are
  not installed or modified by this provider integration.
- `aiwg team` uses `aiwg-mc` emulation. Antigravity's documented subagents do
  not imply a native AIWG team runner.
- Persistent MCP injection preserves unrelated top-level keys and refuses to
  replace an existing server with the same name. Project scope writes
  `.agents/mcp_config.json`; explicit MCP user scope writes
  `~/.gemini/config/mcp_config.json`.

## Headless use

The bounded adapter invokes `agy -p` with argument arrays, a finite timeout,
and JSON or stream-JSON parsing. Standard operation does not add
`--dangerously-skip-permissions`; it is added only for an explicit dangerous
request. Protocol data is read from stdout and diagnostics from stderr.

The live smoke command is opt-in and version-only:

```sh
AIWG_ANTIGRAVITY_LIVE_SMOKE=1 npm run smoke:antigravity:live
```

It does not authenticate or make a model call. Normal CI uses only sanitized
fixtures under `test/fixtures/providers/antigravity-conformance/`.

## Evidence

- `agentic/code/providers/antigravity/provider-contract.v1.json`
- [Google install documentation](https://antigravity.google/docs/cli/install/)
- [Google headless documentation](https://antigravity.google/docs/cli/headless/)
- [Google MCP documentation](https://antigravity.google/docs/cli/mcp/)
- [Google subagent documentation](https://antigravity.google/docs/cli/subagents/)
