# First Success: Find One Capability

Use this recipe when you can describe the work but do not know the AIWG name for it.

## Do This

Ask the agent:

```text
I do not know what AIWG has. Help me find one thing to try first for this goal: <describe your goal>.
```

Ask it to translate the goal:

```text
Give me two or three AIWG discovery phrases, then recommend one path.
```

Run the discovery commands from the project folder:

```bash
aiwg discover "<phrase>"
aiwg discover "<fallback phrase>"
```

Inspect the best result before using it:

```bash
aiwg show skill <name>
```

If the result is an agent instead of a skill:

```bash
aiwg show agent <name>
```

## You Should See

You can say:

```text
I am starting with <capability> because <reason>. If that does not fit, I will try <fallback>.
```

## If That Did Not Work

If discovery returns too many choices, ask the agent to narrow the answer:

```text
Recommend one path, one reason, and one fallback.
```

If discovery returns nothing useful, try broader ordinary-language phrases:

```bash
aiwg discover "project intake"
aiwg discover "security review"
aiwg discover "project status"
```

## Next

Use the capability only after you have inspected it with `aiwg show`. If it is an intake path, continue with [Start A Project Intake](first-success-start-intake.md).

## Related

- [Start Here](start-here.md)
- [Beginner Language Map](language-map.md)
