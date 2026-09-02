# Quick Start

AIWG’s everyday interface is your conversation with an agent. Start with the
outcome, not a command:

```text
Help me use AIWG to get one useful result in this project. Check whether AIWG
is connected, recommend one path, explain what you will change, ask for any
approval you need, and verify the result with concrete evidence.
```

The agent should:

1. identify the current project and provider;
2. inspect the available AIWG capabilities;
3. recommend one path and one fallback;
4. preview material file or configuration changes;
5. ask for required approval;
6. complete the setup or workflow; and
7. report the outcome and verification evidence.

## First-time setup

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
Inspect first, explain the plan, preserve my existing work, use the complete
supported setup unless project policy says otherwise, and verify engagement
when you finish.
```

See [Install, Connect, and Verify](getting-started/install-connect-verify.md)
for provider-specific prompts, approval boundaries, success criteria, and
recovery guidance.

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

## Verify success

```text
Is AIWG active in this workspace? Report the engaged state, project root,
provider files, installed frameworks and addons, and the next action. Explain
the evidence in plain language and propose a safe recovery if anything is
partial or degraded.
```

Success means the agent reports the expected project and provider, identifies
at least one installed AIWG capability, and gives evidence for its conclusion.

If no working agent can run, use the dedicated
[CLI reference](cli/reference.md). Exact installation, deployment, status,
repair, and automation syntax is intentionally kept out of user journeys.
