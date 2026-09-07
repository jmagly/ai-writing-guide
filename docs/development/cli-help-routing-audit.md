# CLI help routing audit

Date: 2026-09-07. Issue: #2307; related fixes: #2305 and #2306.

The root router intercepts `--help` and `-h` before execution and hooks. A
registered handler without a `help` callback receives the generic fallback.
This protects commands with side effects, but hides usage implemented only
inside their execution path. The fix must expose a side-effect-free callback;
passing all help requests through normal execution would lose that protection.

## Fixed and verified surfaces

- `catalog`: a shared renderer supplies bare-command usage and explicit help,
  including list filters and examples. Bare invocation retains exit status 1.
- `sessions`: a shared renderer supplies bare-command usage and text/JSON help.
  Bare invocation retains exit status 2; explicit help exits 0 without storage.
- `help <command>`: normalized to the same callback path as `<command> --help`.
- Both fast and regular root help include `sessions`.

## Remaining fallback inventory

After these fixes, an audit enumerated `allHandlers` from
`src/cli/handlers/index.ts`, selected handlers without `help`, and invoked
`run([handler.id, '--help'])` from `src/cli/router.ts` for each. All 107 selected
handlers returned the generic fallback. This includes namespace commands such
as `packages`, `models`, `index`, `skills`, `config`, `storage`, and `sandbox`.
The inventory below records routing behavior, not a claim that every command
already has its own usage renderer. These remaining handlers need separate
callback work and command-specific verification.

`help`, `version`, `auth`, `context-firewall`, `update`, `installation`, `regenerate`, `workspace-context`,
`use`, `list`, `remove`, `promote`, `install`, `packages`, `marketplace`, `new-bundle`,
`quickref`, `new`, `init`, `setup`, `setup-generate`, `setup-run`, `setup-validate`, `issue`,
`issue-audit`, `run`, `job`, `cost-report`, `evidence`, `status`, `wizard`, `migrate-workspace`,
`rollback-workspace`, `aiwg-mcp-server`, `models`, `versions`, `index`, `artifacts`, `corpus`, `discover`,
`show`, `features`, `skills`, `runtime-info`, `agentcard`, `uhp`, `prefill-cards`, `contribute-start`,
`validate-metadata`, `skill-lint`, `cockpit`, `install-plugin`, `uninstall-plugin`, `plugin-status`, `package-all-plugins`, `add-agent`,
`add-command`, `add-skill`, `add-behavior`, `add-template`, `scaffold-addon`, `scaffold-extension`, `scaffold-framework`, `ralph`,
`ralph-status`, `ralph-abort`, `ralph-resume`, `ralph-attach`, `agent-loop-ext`, `ralph-memory`, `ralph-config`, `mc`,
`mission`, `team`, `steward`, `sdlc-accelerate`, `best-practices-audit`, `behavior`, `daemon-init`, `config`,
`execution-mode`, `ops`, `storage`, `activity-log`, `command-log`, `skill-usage`, `kb`, `memory`,
`reflections`, `provenance`, `research-store`, `research-query`, `chunk`, `fanout`, `rlm-prep`, `rlm-search`,
`rlm-status`, `rlm-cache`, `serve`, `local-executor`, `local-executor-serve`, `sandbox`, `diagnose`, `lint`,
`feedback`, `session`, `repo-access`.

## Regression coverage

`test/integration/cli-startup.test.ts` checks the real executable's root help,
compares bare usage with both flag forms and the help-prefix form, and verifies
sessions JSON help against an unavailable database path. The help handler unit
test covers the non-fast root help surface. Existing router help interception
continues to prevent ordinary command execution.
