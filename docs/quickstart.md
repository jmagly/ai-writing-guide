# Quick Start

AIWG gives your AI assistant reusable project context and specialist workflows. This quickstart takes you from a
connected project to a saved README review you can use in a later session.

## 1. Connect your project

Open the intended project in your AI tool and follow [Install, Connect, and
Verify](getting-started/install-connect-verify.md). The agent should preserve existing work, verify the connection,
and report whether your tool needs a reload.

Already connected? Continue to the task below.

## 2. Get a useful result

Paste into the agent conversation:

```text
Use AIWG to review this project's README for unclear positioning and missing
onboarding steps. Save a report at
.aiwg/marketing/brand/audit/readme-review.md with file references and the
three highest-priority fixes. Leave the README unchanged.
```

The agent should inspect the README and save a review. Open the report: each finding should point to a concrete
passage or missing step, explain why it matters, and propose a specific fix. The [full
walkthrough](getting-started/just-try-it.md) includes an illustrative output and alternative tasks.

## 3. Carry the work forward

In a later session, ask the agent to read the saved report and implement the first agreed fix. Check that it consulted
the report and addressed the finding. This is how a workflow output becomes context for the next task.

## Choose another starting point

- [New Project](getting-started/new-project.md) to turn an idea into a plan.
- [Existing Project](getting-started/existing-project.md) to orient the agent to your codebase.
- [Software Development](quickstart-sdlc.md) for a bounded development task.
- [Marketing](quickstart-mmk.md) for a campaign brief or content review.
- [Capability Guide](overview/capabilities.md) for other workflows.

If the connection is incomplete, use [Verify AIWG Is Working](getting-started/verify-aiwg-is-working.md) or [Provider
Handoff](getting-started/provider-handoff.md). For manual operation, use the [CLI reference](cli/reference.md).
