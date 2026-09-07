# First Success: Find One Capability

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

Use this recipe when you can describe the work but do not know the AIWG name for it.

You stay in the chat. The agent searches and loads AIWG capabilities for you;
you do not need to learn the underlying CLI protocol.

## How AIWG Is Meant To Be Used

The everyday AIWG user surface is the conversation with your AI tool. AIWG's CLI exists mostly so agents can call it; only a small set of commands (`aiwg use`, `aiwg wizard`, `aiwg doctor`, `aiwg status`, `aiwg refresh`) are meant for users to type directly. Discovery and lookup belong inside the agent's workflow.

## Do This

Open your AI tool in the project folder, then ask the agent in plain words:

```text
I do not know what AIWG has. Help me find one thing to try first for this goal:
<describe your goal>.

Use AIWG's discovery tools to check the recommendation before answering. Give me
one path, one reason, and one fallback — not a catalog.
```

That is the request on your side. The agent searches AIWG's capability index, inspects the top match, and replies with a short recommendation.

If you want the agent to consider a couple of angles:

```text
Translate my goal into two or three AIWG search phrases, compare the top
candidates, then recommend one first action and one fallback.
```

## What The Agent Does Behind The Scenes

The agent searches the installed capability index, selects a stable asset ID,
loads the authoritative asset body, and checks its instructions before making
a recommendation. Those are agent operations. If the agent prints internal
commands and asks *you* to run them, ask it to complete the lookup itself.

## You Should See

A short answer that names the capability, why it fits your goal, and what to do next:

```text
I am starting with <capability> because <reason>. If that does not fit, I will try <fallback>.
```

## If That Did Not Work

If the agent returns too many choices:

```text
Recommend one path, one reason, and one fallback.
```

If discovery returns nothing useful, broaden the language:

```text
My phrasing did not match. Try broader ordinary-language queries like
"project intake", "security review", "project status" and see if any of those
get closer.
```

The agent runs those queries itself and reports back.

## Next

Use the capability only after the agent has inspected it. If it is an intake path, continue with [Start A Project Intake](first-success-start-intake.md).

## Related

- [Start Here](start-here.md)
- [Beginner Language Map](language-map.md)
