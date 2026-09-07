# Just Try It

Get a concrete result without learning the workflow catalog: a review of your README with three prioritized fixes.

## Before you begin

Open a project with a README in your AI tool. If AIWG is not connected, follow [Install, Connect, and
Verify](install-connect-verify.md). This task assumes the connection is ready; it does not require a new project or a
full development lifecycle.

## Ask for a review

```text
Use AIWG to review this project's README for unclear positioning and missing
onboarding steps. Save a report at
.aiwg/marketing/brand/audit/readme-review.md with file references and the
three highest-priority fixes. Leave the README unchanged.
```

The agent should inspect the relevant workflow and the README, then save its findings. If the selected workflow is
unavailable, ask it to identify a suitable documentation or brand-review capability and keep the same report
structure. You can open the report directly and use it in another session.

## What success looks like

Each finding should identify a passage or missing step, explain its effect on a reader, and recommend a concrete
change. The report should separate what the files show from the reviewer's judgment.

This is an illustrative finding, not an observed result from your project:

> **Priority: High — Missing prerequisite.** The installation section asks readers to run a command without naming the
required runtime. Add the prerequisite before that command and link to its setup guide.

Check the source references yourself. If a finding misunderstands your audience or setup, tell the agent to revise the
report. A saved report is useful context, not proof that every recommendation is correct.

## Use the result

In the next session, ask:

```text
Read .aiwg/marketing/brand/audit/readme-review.md and implement the first
agreed fix. Preserve unrelated work and explain how the change resolves it.
```

Confirm that the agent consulted the report and that the proposed change follows the recommendation you selected.

## Other small tasks

If a README review does not fit your project, choose one of these:

- Explain the codebase's main entry points and save a short report with source references.
- Identify important missing tests and save a list ranked by risk, with the code paths each test would protect.
- Review a campaign draft for unclear audience and messaging, then save the three most useful revisions.

Specify which files to inspect and where to save the output. Keep the first task small enough that you can judge
whether the result is useful.

Continue with [Existing Project](existing-project.md), [Writing and Content](writing-and-content.md), or [another workflow](../overview/capabilities.md).
