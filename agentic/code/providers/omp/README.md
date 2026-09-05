# OMP native resources

The experimental `omp` provider targets Oh My Pi 18.1.10, reviewed at commit
`5964a0f7649275bcde818f20073193fd032451f2`. It remains separate from `pi`.

Project agents, Markdown prompts, rules and extensions use `.omp/agents`,
`.omp/prompts`, `.omp/rules` and `.omp/extensions`. Kernel skills use
`.agents/skills/<name>/SKILL.md`; `--copy-all` places standard skills in that
same one-level native directory. Default standard skills remain in the AIWG
source corpus for `aiwg discover` and `aiwg show`. Duplicate basenames fail
with a collision diagnostic before overwriting a different resource.

The `.omp/AGENTS.md` managed block uses native relative imports of root
WORKSPACE.md and AIWG.md. Other Markdown links remain ordinary links.
OMP's standalone root AGENTS discovery and foreign provider discovery are
independent: disable/enable those through OMP itself. AIWG does not rewrite
`disabledProviders`, foreign-user opt-in, extension settings or credentials.
Nearest native context and root-to-cwd standalone context can coexist. A
nested `.omp/AGENTS.md` shadows ancestor native context and rules: include
`@../../WORKSPACE.md` and `@../../AIWG.md` explicitly when the nested native
configuration is one directory below the repository root, or import the
ancestor bootstrap. OMP expands imports and deduplicates overlapping prompt blocks. Operator
content outside the bootstrap markers survives regeneration.

Agent descriptions and system prompt bodies retain their source text.
Explicit model IDs and priority lists pass through; configured model roles
use `modelsConfig.omp[role]`. Unmapped roles inherit the session model with a
degraded diagnostic. Unknown tool names are omitted with diagnostics. OMP
interprets an empty spawn list as absent, then infers wildcard spawns from
`task`; the adapter therefore removes `task` unless explicit spawn targets
or an explicit wildcard are supplied. Tool definitions are capability
selection, not a security sandbox.

The bridge registers native session start/shutdown, before-agent-start,
agent-end, tool-call and tool-result handlers. `/aiwg-bridge-status` reports
registration counts. No default policy handler is installed. Consumers use
`registerAiwgHandler` to attach an explicitly selected policy; tool-call
blocks are returned to the native harness and handler failure blocks that
call. Permission-request and pre-compaction enforcement are unsupported.
Native hook installation is distinct from this extension. Markdown prompts
are never executable custom commands.

`registerAiwgTool` accepts OMP's native tool definition together with input
and output validators. It propagates cancellation and execution errors,
and rejects invalid input/output. Runtime modules must be reviewed just
like any other executable OMP extension.

Deployment records SHA-256 ownership and transformation receipts beside
each resource. Refresh preserves operator creations and modifications,
even with force. The provider uninstall routine removes only unchanged
OMP-owned receipt entries and its own bootstrap markers. Disabling native
extension discovery remains an OMP setting; explicit extension paths may
still load despite `--no-extensions`.

Remove a complete OMP deployment with `aiwg remove omp --provider omp`.
Use `--dry-run` to preview or `--scope user` for the resolved OMP profile.
This is distinct from removing a single AIWG framework. Modified files and
unowned files remain, including other extensions and provider resources.
