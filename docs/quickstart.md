# Quick Start

AIWG’s everyday interface is your conversation with an agent. Start with the
outcome, not a command:

```text
Help me use AIWG to get one useful result in this project. Recommend one path,
explain what you will change, ask for any approval you need, then verify the
result.
```

The agent should:

1. identify the current project and provider;
2. recommend one AIWG path and one fallback;
3. preview material file or configuration changes;
4. ask for required approval;
5. run the setup or workflow;
6. report the outcome and concrete verification evidence.

First-time setup uses one canonical path: install AIWG, run `aiwg use all
--provider <provider>` from the project root, reopen the provider, invoke
`/aiwg-regenerate` on slash-command platforms or `$aiwg-regenerate` in Codex,
and ask the agent to verify engagement. See
[Install, Connect, and Verify](getting-started/install-connect-verify.md).

Codex setup writes generated provider artifacts beneath `.codex/` and
`.agents/` and adds both directories to the project `.gitignore` unless they
are already covered. Existing tracked files remain tracked, and `--dry-run`
does not change `.gitignore`. Reopen Codex at the target project root so it can
discover `.codex/agents/` and the native kernel skills in `.agents/skills/`.
Standard AIWG skills remain available through discovery and natural-language
routing unless deployment is explicitly run with `--copy-all`.

## Choose a starting point

- [Start Here](getting-started/start-here.md) for the complete beginner path.
- [New Project](getting-started/new-project.md) to turn an idea into a planned
  project.
- [Existing Project](getting-started/existing-project.md) to orient AIWG to a
  codebase.
- [Provider Handoff](getting-started/provider-handoff.md) when setup is complete
  but the AI tool needs a restart or workspace handoff.
- [Verify AIWG Is Working](getting-started/verify-aiwg-is-working.md) for an
  evidence-based engagement check.

## Installation escape hatch

If your provider does not bundle AIWG and the agent cannot install it for you,
the one required bootstrap command is:

```bash
npm install -g aiwg
```

Then reopen the agent in the project folder and use the starter prompt above.
The agent may ask you to approve a framework deployment or provider-specific
restart.

For a broken-agent or terminal-only recovery, see
[Scope and Recovery](getting-started/scope-and-recovery.md). Advanced agents and
operators can use the
[agent reference corpus](https://github.com/jmagly/aiwg/tree/main/docs/agents/).

## Verify success

Ask:

```text
Is AIWG active in this workspace? Report the engaged state, project root,
provider files, installed frameworks, and the next action. Do not make me
interpret raw command output.
```

Success means the agent reports the expected project and provider, identifies
at least one installed AIWG capability, and gives evidence for its conclusion.
