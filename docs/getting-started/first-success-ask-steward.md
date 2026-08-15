# First Success: Ask The Steward To Route You

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

Use this recipe when you want AIWG to choose where to start instead of reading the catalog yourself.

The steward is a guide agent that lives inside your AI session. You stay in the chat; the steward handles the AIWG-specific lookups for you. You do not need to type `aiwg` commands yourself — the agent runs them under the hood and reports back.

## How AIWG Is Meant To Be Used

AIWG's main user surface is the agent conversation, not the terminal. Most of the CLI exists so agents can call it on your behalf. The only AIWG commands a user typically runs by hand are the install/deploy/onboarding ones — `aiwg use`, `aiwg wizard`, `aiwg doctor`, `aiwg status`. Everything else (discovery, lookup, indexing, loops, orchestration) is invoked by the agent during a chat.

That is what this recipe assumes.

## Do This

Open your AI tool in the project folder.

Ask the agent:

```text
Act as the AIWG steward for this project. My goal is: <describe your goal>.
Recommend one AIWG path, one reason, and one fallback. Verify the
recommendation against AIWG's capability index before answering.
```

That is the whole interaction on your side. The agent searches AIWG's capabilities, inspects the top match, and replies with a short recommendation. You stay in the conversation.

If the agent answers without checking AIWG and you suspect it guessed:

```text
You did not verify against AIWG's capability index. Please look up the
recommendation against the installed capabilities before answering.
```

## What The Agent Does Behind The Scenes

The agent searches the installed capability index, selects and loads the
authoritative asset, then gives you one recommended path, one reason, and one
fallback. These are agent operations. If the agent surfaces internal commands
as instructions for *you* to run, ask it to complete the lookup itself.

## You Should See

A short answer with one recommended AIWG path, one reason it fits your goal, and one fallback. Not a catalog. Not a wall of commands.

## If That Did Not Work

If the answer becomes a long list, interrupt:

```text
Do not list every option. Choose one path for my current goal and explain the first action.
```

If the recommendation seems unrelated to the project, ask the agent to re-check the current folder:

```text
Re-check the current project folder and route me based only on the files and
goal in this project.
```

## Next

Follow the recommended path until you get one useful output. If the path is still unclear, use [Find One Capability](first-success-find-capability.md).

## Related

- [Start Here](start-here.md)
- [Beginner Language Map](language-map.md)
- [Verify AIWG Is Working](verify-aiwg-is-working.md)
- [Provider Handoff](provider-handoff.md)
