# First Success: Find One Capability

Use this recipe when you can describe the work but do not know the AIWG name for it.

You stay in the chat. The agent does the AIWG lookups for you — you do not need to learn `aiwg discover` or `aiwg show` to use this. They are tools the agent invokes on your behalf.

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

You do not type these. They are the agent's job:

- `aiwg discover "<phrase>"` — search the installed capability index for skills, agents, commands, rules, flows, templates, and behaviors that match the goal.
- `aiwg show skill <name>` or `aiwg show agent <name>` — fetch the body of the top match so the agent can read its capabilities before recommending it.

If the agent prints these commands and tells *you* to run them, ask it to run them itself.

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
