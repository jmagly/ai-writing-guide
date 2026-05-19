# First Success: Ask The Steward To Route You

Use this recipe when you want AIWG to choose where to start instead of reading the catalog yourself.

The steward is the guide. It helps translate your goal into one AIWG path. Discover is search. It helps find the shipped skill, agent, or framework that matches the steward's recommendation.

## Do This

Go to the project folder:

```bash
cd /path/to/your/project
```

Ask the agent:

```text
Act as the AIWG steward for this project. My goal is: <describe your goal>. Recommend one AIWG path, one reason, and one fallback.
```

If the agent can run commands, ask it to verify the recommendation:

```text
Use aiwg discover to check the recommended path, then inspect the best match with aiwg show before telling me what to do next.
```

If you need to run the commands yourself:

```bash
aiwg discover "aiwg steward"
aiwg discover "<recommended phrase>"
aiwg show skill <name>
```

If the result is an agent instead of a skill:

```bash
aiwg show agent <name>
```

For abstract goals, ask for two to four discovery phrases and make the agent compare the top results before recommending one:

```text
Translate my goal into two to four AIWG discover phrases. Run aiwg discover for each phrase, inspect the best result with aiwg show, then recommend one first action and one fallback.
```

## You Should See

You have one recommended AIWG path, one reason it fits your goal, and one fallback if the first path does not fit.

## If That Did Not Work

If the answer becomes a long catalog, interrupt and ask:

```text
Do not list every option. Choose one path for my current goal and explain the first action.
```

If the recommendation seems unrelated to the project, check the folder:

```bash
pwd
ls -a
```

Then ask:

```text
Re-check the current project folder and route me based only on the files and goal in this project.
```

## Next

Follow the recommended path until you get one useful output. If the path is still unclear, use [Find One Capability](first-success-find-capability.md).

## Related

- [Start Here](start-here.md)
- [Beginner Language Map](language-map.md)
- [Verify AIWG Is Working](verify-aiwg-is-working.md)
- [Provider Handoff](provider-handoff.md)
