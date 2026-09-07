# Start Here

AIWG gives your AI assistant reusable project context and specialist workflows. Start by making one useful report,
then use that report to guide a later change.

## Set up AIWG

Open your project in your AI tool and follow [Install, Connect, and Verify](install-connect-verify.md). The agent
should identify the project, preserve existing instructions, and explain whether your tool needs a reload. If AIWG is
already connected, continue below.

## Review your README

Ask your agent:

```text
Use AIWG to review this project's README for unclear positioning and missing
onboarding steps. Save a report at
.aiwg/marketing/brand/audit/readme-review.md with file references and the
three highest-priority fixes. Leave the README unchanged.
```

The agent should select a suitable review workflow, inspect the README, and save a report. It should distinguish
observations from judgment and explain any missing context that limits its conclusions.

Open the report and check:

- Does each finding point to a real passage or missing step?
- Does it explain the effect on a new reader?
- Is the proposed fix specific enough to review?
- Are the top recommendations useful for your intended audience?

The [Just Try It walkthrough](just-try-it.md) includes an illustrative finding and alternative tasks if your project
has no README.

## Carry the result into the next session

Ask:

```text
Read .aiwg/marketing/brand/audit/readme-review.md. Implement the first agreed
fix, preserve unrelated work, and show how the change addresses the finding.
```

The saved report is reusable project context. Check that the agent actually reads it and that the change addresses the
finding. You can revise the report when new information changes the recommendation.

## Choose your next task

| Your situation | Next guide |
|---|---|
| You have a product idea | [New project](new-project.md) |
| You have an existing codebase | [Existing project](existing-project.md) |
| You want clearer writing | [Writing and content](writing-and-content.md) |
| You need a different workflow | [Capability guide](../overview/capabilities.md) |
| You do not know which path fits | [Ask the steward](first-success-ask-steward.md) |

## Guided recovery escape hatch

If setup or routing is unclear, ask:

```text
Check the project and AIWG connection. Explain what is ready, what is missing,
and the smallest next step needed to complete my task. Preserve my existing
work and ask only for choices you cannot determine.
```

Use [Provider Handoff](provider-handoff.md) for your AI tool's connection details, [Scope and
Recovery](scope-and-recovery.md) for a wrong-folder problem, or [Troubleshooting](../troubleshooting/index.md) for
installation issues.

## Verify AIWG is working

If the agent cannot find a workflow, ask it to report the engaged state, project root, provider context, and installed
capabilities. The [verification guide](verify-aiwg-is-working.md) explains what a readiness check should establish.
Once ready, return to the task above; the saved review is the first useful result.

For bug reports and contributions, see [Filing Issues](../contributing/filing-issues.md).
