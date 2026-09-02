# Start Here

Use this page when AIWG is new to you and you want one useful result before
learning the whole system.

AIWG’s everyday user surface is the conversation with your AI tool. Describe
the outcome; the agent performs capability lookup, setup, orchestration, and
verification on your behalf.

## The primary pattern

1. Tell the agent what you are trying to accomplish.
2. Ask how AIWG can help.
3. Review the one recommended path and one fallback.
4. Approve material deployment or project changes.
5. Let the agent complete the work.
6. Verify the reported outcome and evidence.

Start with one of these prompts:

```text
How can AIWG help with this project? Recommend one path, explain why it fits,
name one fallback, and tell me what evidence will prove success.
```

```text
I do not know AIWG terminology. Translate my goal into one existing AIWG
capability, inspect that capability before using it, and explain the result in
ordinary language.
```

```text
Create a workflow from existing AIWG systems that fits my situation. Reuse
shipped agents, skills, and flows before proposing anything new. Preview
material changes and ask for approval where needed.
```

If the answer becomes a catalog, narrow it:

```text
Recommend one path, one reason, one success check, and one fallback.
```

## Set up AIWG

With the intended project open in your provider, paste:

```text
Install or repair AIWG for this project by following
https://aiwg.io/setup.aiwg.yaml
Inspect first, explain the plan, preserve my existing work, ask before material
changes, and verify that AIWG is active when you finish.
```

The agent should identify the project and provider, inspect the current state,
preview changes, connect the complete supported AIWG surface, and report a
single readiness result. Follow [Install, Connect, and Verify](install-connect-verify.md)
for the complete prompt, provider handoff, success criteria, and recovery asks.

If no working agent can perform setup, use the dedicated
[CLI reference](../cli/reference.md). Public user journeys do not duplicate
terminal recipes or flag tables.

## Ask the steward to route you

The steward is AIWG’s routing guide. You do not need to know its lookup syntax.
Describe the goal and ask it to verify the recommendation against installed
capabilities:

```text
Ask the AIWG steward to choose the best existing path for my goal. Verify the
match against the installed capability index, inspect the selected asset, and
give me one recommendation plus one fallback.
```

## Keep the project scope clear

Project-scoped setup belongs to one repository or workspace. User-scoped setup
contains capabilities intended to follow you across projects. If the agent
seems confused, ask:

```text
I may be in the wrong folder or scope. Check the current project from repository
evidence, distinguish project-scoped from user-scoped AIWG state, and tell me
where this work belongs. Do not move or rewrite anything yet.
```

For the longer recovery path, see [Scope and Recovery](scope-and-recovery.md).

## Verify AIWG is working

```text
Is AIWG active in this workspace? Report the engaged state, project root,
provider files, installed frameworks and addons, and one next action. Explain
the evidence rather than returning raw machine output.
```

If the workspace is partial or degraded, the agent should explain the smallest
safe repair and ask before applying it.

## First-success recipes

- [Find one AIWG capability](first-success-find-capability.md)
- [Ask the steward to route you](first-success-ask-steward.md)
- [Start a project intake](first-success-start-intake.md)
- [Verify your setup](verify-aiwg-is-working.md)
- [Provider handoff](provider-handoff.md)
- [Scope and recovery](scope-and-recovery.md)
- [Agentic install runbook](../agentic-install-runbook.md)

## Help and contributions

For setup or usage problems, start with [Troubleshooting](../troubleshooting/index.md).
To report a bug or request a change, use [Filing Issues](../contributing/filing-issues.md).
